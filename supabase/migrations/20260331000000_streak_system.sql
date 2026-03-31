-- ============================================================
-- MIGRATION: streak_system
-- Date: 2026-03-31
-- Description:
--   Full streak system for ale-fit-fusion.
--
--   1. Creates / extends user_gamification with streak columns.
--   2. Creates user_badges and weekly_fitness_scores (if absent).
--   3. Installs core streak function (update_streak_on_activity).
--   4. Installs triggers on meal_entries, daily_water_intake,
--      and workout_sessions.
--   5. Provides a backfill helper for historical data.
-- ============================================================


-- ─── PART 1: SCHEMA ──────────────────────────────────────────────────────────

-- user_gamification
-- The app already reads from this table. We create it if it doesn't exist,
-- then unconditionally ADD COLUMN IF NOT EXISTS for the new streak fields.
CREATE TABLE IF NOT EXISTS user_gamification (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp                 INT         NOT NULL DEFAULT 0,
  current_streak           INT         NOT NULL DEFAULT 0,
  longest_streak           INT         NOT NULL DEFAULT 0,
  active_profile_title     TEXT,
  last_active_date         DATE,
  freeze_available         BOOLEAN     NOT NULL DEFAULT FALSE,
  streak_protect_milestone INT         NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_gamification_user UNIQUE (user_id)
);

-- Safe column additions for tables that already existed without them
ALTER TABLE user_gamification
  ADD COLUMN IF NOT EXISTS last_active_date         DATE,
  ADD COLUMN IF NOT EXISTS freeze_available         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS streak_protect_milestone INT     NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_user_gamification_user_id
  ON user_gamification (user_id);

-- user_badges
CREATE TABLE IF NOT EXISTS user_badges (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id    TEXT        NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_badge UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id
  ON user_badges (user_id);

-- weekly_fitness_scores
CREATE TABLE IF NOT EXISTS weekly_fitness_scores (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_score       NUMERIC(5,2) NOT NULL DEFAULT 0,
  nutrition_score   NUMERIC(5,2) NOT NULL DEFAULT 0,
  training_score    NUMERIC(5,2) NOT NULL DEFAULT 0,
  activity_score    NUMERIC(5,2) NOT NULL DEFAULT 0,
  consistency_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  week_start        DATE         NOT NULL,
  week_end          DATE         NOT NULL,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uq_weekly_score UNIQUE (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_fitness_scores_user_week
  ON weekly_fitness_scores (user_id, week_start DESC);


-- ─── PART 2: ROW-LEVEL SECURITY ──────────────────────────────────────────────

ALTER TABLE user_gamification     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges           ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_fitness_scores ENABLE ROW LEVEL SECURITY;

-- user_gamification
DROP POLICY IF EXISTS "gamification_select_own" ON user_gamification;
CREATE POLICY "gamification_select_own"
  ON user_gamification FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "gamification_update_own" ON user_gamification;
CREATE POLICY "gamification_update_own"
  ON user_gamification FOR UPDATE
  USING (auth.uid() = user_id);

-- user_badges
DROP POLICY IF EXISTS "badges_select_own" ON user_badges;
CREATE POLICY "badges_select_own"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id);

-- weekly_fitness_scores
DROP POLICY IF EXISTS "weekly_scores_select_own" ON weekly_fitness_scores;
CREATE POLICY "weekly_scores_select_own"
  ON weekly_fitness_scores FOR SELECT
  USING (auth.uid() = user_id);


-- ─── PART 3: CORE STREAK FUNCTION ────────────────────────────────────────────
--
-- update_streak_on_activity(p_user_id, p_activity_date)
--
-- WHAT IT DOES
--   Atomically recalculates current_streak and longest_streak inside
--   user_gamification every time a qualifying activity (food, water,
--   workout) is inserted or updated in its source table.
--
-- STREAK RULES
--   • Calendar-day granularity: 00:00–23:59:59 local time.
--   • Only ONE count per user per calendar day regardless of how many
--     logs are created that day (idempotency guard on last_active_date).
--   • Consecutive day  → streak + 1.
--   • Missed 1 day + freeze available → streak + 2 (frozen day counts).
--   • Missed 2+ days, or 1 missed day with no freeze → reset to 1.
--
-- FREEZE MECHANICS
--   A freeze protects ONE missed calendar day.
--   freeze_available  – whether the user currently holds an unused freeze.
--   streak_protect_milestone – the highest multiple-of-7 streak level at
--     which a freeze was last GRANTED. Used to prevent granting a new
--     freeze in the same call that consumed the previous one, and to
--     ensure at least 7 new consecutive days before re-earning.
--
--   Earning:  freeze_available = TRUE when streak crosses a new multiple
--             of 7 (7, 14, 21, …) that is > streak_protect_milestone.
--   Consuming: gap = 2 days + freeze_available = TRUE.
--   Re-earning: only after streak crosses the NEXT multiple of 7
--               beyond the milestone set when the freeze was earned.
--
-- TIMEZONE SAFETY
--   p_activity_date comes from NEW.date on the source table, which the
--   frontend sets to the user's local calendar date (YYYY-MM-DD string).
--   We never call now()::date to avoid UTC midnight boundary bugs.
--   Future improvement: store user timezone in profiles.profiles and
--   convert server-side.
--
-- RACE-CONDITION SAFETY
--   SELECT … FOR UPDATE serialises concurrent inserts for the same user
--   (e.g. food + water logged at the exact same millisecond).
--
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

-- Allow calling from edge functions / service-role if ever needed
GRANT EXECUTE ON FUNCTION update_streak_on_activity(UUID, DATE) TO authenticated;


-- ─── PART 4: TRIGGER DISPATCHER ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_streak_from_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- NEW.date  = calendar date set by the frontend (user's local date)
  -- NEW.user_id = owning user
  PERFORM update_streak_on_activity(NEW.user_id, NEW.date);
  RETURN NEW;
END;
$$;


-- ─── PART 5: TRIGGERS ────────────────────────────────────────────────────────

-- meal_entries: every food log is a distinct new row → INSERT only
DROP TRIGGER IF EXISTS streak_meal_entries ON meal_entries;
CREATE TRIGGER streak_meal_entries
  AFTER INSERT ON meal_entries
  FOR EACH ROW
  EXECUTE FUNCTION trg_streak_from_activity();

-- daily_water_intake: the frontend uses upsert (INSERT … ON CONFLICT DO UPDATE).
--   • First entry for the day  → fires AFTER INSERT  → streak updates.
--   • Adding more water later  → fires AFTER UPDATE  → idempotent (same date).
DROP TRIGGER IF EXISTS streak_daily_water_intake ON daily_water_intake;
CREATE TRIGGER streak_daily_water_intake
  AFTER INSERT OR UPDATE ON daily_water_intake
  FOR EACH ROW
  EXECUTE FUNCTION trg_streak_from_activity();

-- workout_sessions: each session is a new row → INSERT only
DROP TRIGGER IF EXISTS streak_workout_sessions ON workout_sessions;
CREATE TRIGGER streak_workout_sessions
  AFTER INSERT ON workout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trg_streak_from_activity();

-- daily_weight: upsert pattern (INSERT … ON CONFLICT DO UPDATE), same as water
DROP TRIGGER IF EXISTS streak_daily_weight ON daily_weight;
CREATE TRIGGER streak_daily_weight
  AFTER INSERT OR UPDATE ON daily_weight
  FOR EACH ROW
  EXECUTE FUNCTION trg_streak_from_activity();


-- ─── PART 6: BACKFILL HELPER ─────────────────────────────────────────────────
--
-- Run once after deploying to seed streaks from existing historical data.
-- Replays every distinct day a user was active, in chronological order,
-- so the streak state is as if the triggers had always been in place.
--
-- Run for ALL users:
--   SELECT backfill_streak_for_user(user_id) FROM user_gamification;
--
-- Run for a single user:
--   SELECT backfill_streak_for_user('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
--
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION backfill_streak_for_user(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE;
BEGIN
  -- Reset streak state for this user to a clean baseline
  UPDATE user_gamification
  SET
    current_streak           = 0,
    longest_streak           = 0,
    last_active_date         = NULL,
    freeze_available         = FALSE,
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
