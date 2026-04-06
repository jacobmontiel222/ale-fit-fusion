-- ============================================================
-- MIGRATION: freeze_count_system
-- Date: 2026-04-06
-- Description:
--   Replaces the boolean freeze_available with freeze_count (0–3)
--   and adds streak_frozen_date to record when a freeze was last
--   consumed (used to drive the "active frozen" UI state).
--
--   Changes:
--   1. Adds freeze_count INT (0–3) and streak_frozen_date DATE columns.
--   2. Migrates existing freeze_available data (TRUE → count=1).
--   3. Replaces update_streak_on_activity to:
--        • accumulate up to 3 freezes (one per new multiple of 7).
--        • record streak_frozen_date when a freeze is consumed.
--        • keep freeze_available in sync (= freeze_count > 0) for
--          backward-compat with any queries that still read it.
--   4. Updates backfill_streak_for_user to reset new columns.
-- ============================================================


-- ─── PART 1: SCHEMA ──────────────────────────────────────────────────────────

ALTER TABLE user_gamification
  ADD COLUMN IF NOT EXISTS freeze_count       INT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_frozen_date DATE;

-- Migrate existing boolean → count (max was effectively 1)
UPDATE user_gamification
SET freeze_count = CASE WHEN freeze_available = TRUE THEN 1 ELSE 0 END
WHERE freeze_count = 0;  -- only migrate rows not already set


-- ─── PART 2: UPDATED STREAK FUNCTION ─────────────────────────────────────────
--
-- Key changes vs the previous version:
--   • freeze_count  : INT  replaces the boolean freeze_available as the
--                     primary field. Capped at 3. Earned at every new
--                     multiple-of-7 streak milestone (7, 14, 21, 28 …).
--   • streak_frozen_date : set to the MISSED day when a freeze is consumed
--                     (= p_activity_date - 1). The frontend reads this to
--                     distinguish "freeze in use today" from "freeze stored".
--   • freeze_available is kept in sync (= freeze_count > 0) so any code
--     that still queries it continues to work without changes.
--
-- Freeze earn rules (unchanged logic, new cap):
--   Grant +1 freeze each time streak crosses a new multiple of 7 that is
--   > streak_protect_milestone AND freeze_count < 3.
--
-- Freeze consume rules (unchanged logic):
--   gap = exactly 2 days + freeze_count > 0
--   → streak +2, freeze_count -1, streak_frozen_date = missed day
--   → v_freeze_consumed = TRUE (suppress immediate re-earn in same call)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_streak_on_activity(
  p_user_id       UUID,
  p_activity_date DATE   -- calendar date from NEW.date on the source table
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row              user_gamification%ROWTYPE;
  v_new_streak       INT;
  v_new_longest      INT;
  v_new_last_active  DATE;
  v_new_freeze_count INT;
  v_new_frozen_date  DATE;
  v_new_milestone    INT;
  v_freeze_consumed  BOOLEAN := FALSE;
  v_next_milestone   INT;
BEGIN
  -- Safety: reject future-dated activity (prevents client-side streak gaming)
  IF p_activity_date > CURRENT_DATE THEN
    p_activity_date := CURRENT_DATE;
  END IF;

  -- Fix: ignore past-dated activity so backfilling old data never resets
  -- or interferes with the current streak.
  IF p_activity_date < CURRENT_DATE THEN
    RETURN;
  END IF;

  -- Ensure a row exists before we try to lock it
  INSERT INTO user_gamification (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Acquire row-level lock → serialises concurrent activity for same user
  SELECT * INTO v_row
  FROM   user_gamification
  WHERE  user_id = p_user_id
  FOR UPDATE;

  -- ── Idempotency: this calendar day was already counted ───────────────────
  IF v_row.last_active_date = p_activity_date THEN
    RETURN;
  END IF;

  -- Carry frozen date forward by default (only change on consume or reset)
  v_new_frozen_date := v_row.streak_frozen_date;

  -- ── Branch on gap between last active day and today ─────────────────────

  IF v_row.last_active_date IS NULL THEN
    -- ① First ever qualifying activity
    v_new_streak       := 1;
    v_new_last_active  := p_activity_date;
    v_new_freeze_count := v_row.freeze_count;
    v_new_milestone    := v_row.streak_protect_milestone;

  ELSIF v_row.last_active_date = p_activity_date - INTERVAL '1 day' THEN
    -- ② Consecutive day → increment, carry freeze count unchanged
    v_new_streak       := v_row.current_streak + 1;
    v_new_last_active  := p_activity_date;
    v_new_freeze_count := v_row.freeze_count;
    v_new_milestone    := v_row.streak_protect_milestone;

  ELSIF v_row.last_active_date = p_activity_date - INTERVAL '2 days'
        AND v_row.freeze_count > 0 THEN
    -- ③ Missed exactly 1 day + freeze available → consume one freeze
    --    Both the frozen day and today count, hence +2.
    --    Example: streak 7, miss day 8, log day 9 → streak 9 (not 8).
    v_new_streak       := v_row.current_streak + 2;
    v_new_last_active  := p_activity_date;
    v_new_freeze_count := v_row.freeze_count - 1;
    v_new_frozen_date  := p_activity_date - INTERVAL '1 day';  -- the missed day
    v_new_milestone    := v_row.streak_protect_milestone;
    v_freeze_consumed  := TRUE;  -- suppress same-step re-earn

  ELSE
    -- ④ Missed 2+ days, or missed 1 day with no freeze → full reset
    v_new_streak       := 1;
    v_new_last_active  := p_activity_date;
    v_new_freeze_count := 0;
    v_new_frozen_date  := NULL;
    v_new_milestone    := 0;   -- milestone resets; user must rebuild to 7

  END IF;

  -- ── longest_streak: only update when surpassed ──────────────────────────
  v_new_longest := GREATEST(v_row.longest_streak, v_new_streak);

  -- ── Freeze earn ──────────────────────────────────────────────────────────
  -- Grant +1 freeze each time streak crosses a new multiple of 7, up to
  -- a maximum of 3 accumulated freezes. Guarded by v_freeze_consumed to
  -- prevent immediate re-grant in the same call that consumed one.
  IF NOT v_freeze_consumed AND v_new_freeze_count < 3 THEN
    v_next_milestone := (FLOOR(v_new_streak::NUMERIC / 7) * 7)::INT;
    IF v_next_milestone >= 7 AND v_next_milestone > v_new_milestone THEN
      v_new_freeze_count := v_new_freeze_count + 1;
      v_new_milestone    := v_next_milestone;
    END IF;
  END IF;

  -- ── Persist ─────────────────────────────────────────────────────────────
  UPDATE user_gamification
  SET
    current_streak           = v_new_streak,
    longest_streak           = v_new_longest,
    last_active_date         = v_new_last_active,
    freeze_count             = v_new_freeze_count,
    freeze_available         = (v_new_freeze_count > 0),  -- keep in sync
    streak_frozen_date       = v_new_frozen_date,
    streak_protect_milestone = v_new_milestone,
    updated_at               = now()
  WHERE user_id = p_user_id;

END;
$$;


-- ─── PART 3: UPDATE BACKFILL HELPER ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION backfill_streak_for_user(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE;
BEGIN
  -- Reset streak state (including new columns) to a clean baseline
  UPDATE user_gamification
  SET
    current_streak           = 0,
    longest_streak           = 0,
    last_active_date         = NULL,
    freeze_available         = FALSE,
    freeze_count             = 0,
    streak_frozen_date       = NULL,
    streak_protect_milestone = 0,
    updated_at               = now()
  WHERE user_id = p_user_id;

  -- Replay every distinct active day in chronological order
  FOR v_date IN (
    SELECT DISTINCT activity_date
    FROM (
      SELECT date AS activity_date FROM meal_entries        WHERE user_id = p_user_id
      UNION
      SELECT date AS activity_date FROM daily_water_intake  WHERE user_id = p_user_id
      UNION
      SELECT date AS activity_date FROM workout_sessions    WHERE user_id = p_user_id
      UNION
      SELECT date AS activity_date FROM daily_weight        WHERE user_id = p_user_id
    ) combined
    ORDER BY activity_date ASC
  )
  LOOP
    PERFORM update_streak_on_activity(p_user_id, v_date);
  END LOOP;
END;
$$;
