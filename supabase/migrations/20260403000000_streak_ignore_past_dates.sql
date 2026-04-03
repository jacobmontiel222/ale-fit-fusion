-- ============================================================
-- MIGRATION: streak_ignore_past_dates
-- Date: 2026-04-03
-- Description:
--   Fix streak reset bug: registering weight, water, steps or
--   any activity with a past date was causing the streak to
--   reset because the gap between last_active_date and the
--   past date exceeded the allowed threshold.
--
--   Rule: the streak is only updated when the activity date
--   is TODAY. Past-dated entries are silently ignored for
--   streak purposes (they are still saved to the table).
-- ============================================================

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
  v_row             user_gamification%ROWTYPE;
  v_new_streak      INT;
  v_new_longest     INT;
  v_new_last_active DATE;
  v_new_freeze      BOOLEAN;
  v_new_milestone   INT;
  v_freeze_consumed BOOLEAN := FALSE;
  v_next_milestone  INT;
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

  -- ── Branch on gap between last active day and today ─────────────────────

  IF v_row.last_active_date IS NULL THEN
    -- ① First ever qualifying activity
    v_new_streak      := 1;
    v_new_last_active := p_activity_date;
    v_new_freeze      := FALSE;
    v_new_milestone   := 0;

  ELSIF v_row.last_active_date = p_activity_date - INTERVAL '1 day' THEN
    -- ② Consecutive day → increment
    v_new_streak      := v_row.current_streak + 1;
    v_new_last_active := p_activity_date;
    v_new_freeze      := v_row.freeze_available;   -- carry through unchanged
    v_new_milestone   := v_row.streak_protect_milestone;

  ELSIF v_row.last_active_date = p_activity_date - INTERVAL '2 days'
        AND v_row.freeze_available = TRUE THEN
    -- ③ Missed exactly 1 day + freeze available → consume freeze
    --    Both the frozen day and today count, hence +2.
    --    Example: streak 7, miss day 8, log day 9 → streak 9 (not 8).
    v_new_streak      := v_row.current_streak + 2;
    v_new_last_active := p_activity_date;
    v_new_freeze      := FALSE;              -- freeze consumed
    v_new_milestone   := v_row.streak_protect_milestone;
    v_freeze_consumed := TRUE;               -- suppress same-step re-earn

  ELSE
    -- ④ Missed 2+ days, or missed 1 day with no freeze → full reset
    v_new_streak      := 1;
    v_new_last_active := p_activity_date;
    v_new_freeze      := FALSE;
    v_new_milestone   := 0;   -- milestone resets; user must rebuild to 7

  END IF;

  -- ── longest_streak: only update when surpassed ──────────────────────────
  v_new_longest := GREATEST(v_row.longest_streak, v_new_streak);

  -- ── Freeze re-earn ───────────────────────────────────────────────────────
  -- Grant a new freeze each time streak crosses a new multiple of 7.
  -- Guarded by v_freeze_consumed to prevent immediate re-grant in the same
  -- call that consumed the previous one (e.g. streak goes 12→14 via freeze
  -- with old milestone=7 – without the guard we'd re-grant at milestone 14).
  IF NOT v_freeze_consumed AND NOT v_new_freeze THEN
    v_next_milestone := (FLOOR(v_new_streak::NUMERIC / 7) * 7)::INT;
    IF v_next_milestone >= 7 AND v_next_milestone > v_new_milestone THEN
      v_new_freeze    := TRUE;
      v_new_milestone := v_next_milestone;
    END IF;
  END IF;

  -- ── Persist ─────────────────────────────────────────────────────────────
  UPDATE user_gamification
  SET
    current_streak           = v_new_streak,
    longest_streak           = v_new_longest,
    last_active_date         = v_new_last_active,
    freeze_available         = v_new_freeze,
    streak_protect_milestone = v_new_milestone,
    updated_at               = now()
  WHERE user_id = p_user_id;

END;
$$;
