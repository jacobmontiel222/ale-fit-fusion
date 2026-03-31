-- ============================================================
-- MIGRATION: badge_system
-- Date: 2026-03-31
-- Depends on: 20260331000000_streak_system.sql
--
-- Description:
--   Full badge-unlock system for ale-fit-fusion.
--
--   1. award_badge()            – idempotent badge grant + XP update
--   2. Helper math functions    – consecutive_days_ending, max_consecutive_days,
--                                 adherence_to_score
--   3. Per-category check fns   – check_first_spark_badge, check_meal_badges,
--                                 check_water_badges, check_training_badges,
--                                 check_steps_badges, check_consistency_badges,
--                                 check_streak_badges
--   4. update_streak_on_activity – re-declared (CREATE OR REPLACE) with
--                                  streak badge evaluation appended at the end
--   5. trg_badges_from_activity  – single trigger fn dispatching to all
--                                  category checks; attached to the 5 activity
--                                  tables (meal_entries, daily_water_intake,
--                                  workout_sessions, daily_weight, daily_steps)
--   6. recalculate_weekly_fitness_score() – RPC callable by authenticated users;
--                                  computes + upserts the weekly score and
--                                  evaluates the "on_track" badge
--   7. trg_on_track_badge_from_score – trigger on weekly_fitness_scores that
--                                  re-evaluates on_track whenever a score row
--                                  is inserted or updated
-- ============================================================


-- ─── PART 1: CORE AWARD FUNCTION ─────────────────────────────────────────────
--
-- award_badge(p_user_id, p_badge_id, p_xp_reward [, p_awarded_at])
--
-- • Inserts a row into user_badges (UNIQUE constraint prevents duplicates).
-- • If the row was actually inserted (not a conflict), adds XP to
--   user_gamification and ensures a row exists there first.
-- • Returns TRUE when the badge is freshly awarded, FALSE if already held.
-- • All callers are SECURITY DEFINER functions; do NOT grant this to
--   authenticated/anon roles directly.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION award_badge(
  p_user_id    UUID,
  p_badge_id   TEXT,
  p_xp_reward  INT,
  p_awarded_at TIMESTAMPTZ DEFAULT now()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows INT;
BEGIN
  INSERT INTO user_badges (user_id, badge_id, unlocked_at)
  VALUES (p_user_id, p_badge_id, p_awarded_at)
  ON CONFLICT (user_id, badge_id) DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN FALSE;   -- badge already held, no XP granted
  END IF;

  -- Ensure gamification row exists, then add XP
  INSERT INTO user_gamification (user_id, total_xp)
  VALUES (p_user_id, p_xp_reward)
  ON CONFLICT (user_id) DO UPDATE
    SET total_xp   = user_gamification.total_xp + EXCLUDED.total_xp,
        updated_at = now();

  RETURN TRUE;
END;
$$;


-- ─── PART 2: HELPER MATH FUNCTIONS ───────────────────────────────────────────

-- consecutive_days_ending(p_dates)
-- Given a SORTED-ASCENDING array of distinct dates, returns the length of the
-- trailing consecutive run (i.e. the run that ends at the last element).
-- Used in real-time triggers to check if "today" broke the streak.
CREATE OR REPLACE FUNCTION consecutive_days_ending(p_dates DATE[])
RETURNS INT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_run  INT  := 0;
  v_prev DATE;
  d      DATE;
BEGIN
  IF p_dates IS NULL OR array_length(p_dates, 1) IS NULL THEN
    RETURN 0;
  END IF;

  FOREACH d IN ARRAY p_dates
  LOOP
    IF v_prev IS NULL OR d = v_prev + 1 THEN
      v_run := v_run + 1;
    ELSE
      v_run := 1;
    END IF;
    v_prev := d;
  END LOOP;

  RETURN v_run;
END;
$$;


-- max_consecutive_days(p_dates)
-- Given a SORTED-ASCENDING array of distinct dates, returns the MAXIMUM
-- consecutive run anywhere in the array.
-- Used in the backfill script to find the best historical run.
CREATE OR REPLACE FUNCTION max_consecutive_days(p_dates DATE[])
RETURNS INT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_max  INT  := 0;
  v_run  INT  := 0;
  v_prev DATE;
  d      DATE;
BEGIN
  IF p_dates IS NULL OR array_length(p_dates, 1) IS NULL THEN
    RETURN 0;
  END IF;

  FOREACH d IN ARRAY p_dates
  LOOP
    IF v_prev IS NULL OR d = v_prev + 1 THEN
      v_run := v_run + 1;
    ELSE
      v_run := 1;
    END IF;
    IF v_run > v_max THEN v_max := v_run; END IF;
    v_prev := d;
  END LOOP;

  RETURN v_max;
END;
$$;


-- adherence_to_score(p_ratio)
-- Mirrors the TypeScript adherenceToScore() in src/lib/fitnessScore.ts.
-- 0.90–1.15  → 100 (sweet spot)
-- < 0.90     → linear falloff to 0
-- > 1.15     → steep penalty (over-eating)
CREATE OR REPLACE FUNCTION adherence_to_score(p_ratio NUMERIC)
RETURNS INT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_ratio <= 0     THEN RETURN 0;   END IF;
  IF p_ratio >= 0.9 AND p_ratio <= 1.15 THEN RETURN 100; END IF;
  IF p_ratio < 0.9    THEN RETURN GREATEST(0, ROUND(p_ratio / 0.9 * 100)::INT); END IF;
  RETURN GREATEST(0, ROUND(100 - (p_ratio - 1.15) * 200)::INT);
END;
$$;


-- ─── PART 3: PER-CATEGORY BADGE CHECK FUNCTIONS ──────────────────────────────

-- ── 3a. First Spark ──────────────────────────────────────────────────────────
-- Badge ID : first_spark   Rarity: common   XP: 100
-- Condition: user has logged their very first activity of any type.
-- Called   : on every activity insert (the award_badge ON CONFLICT handles
--            idempotency, so calling this repeatedly is safe and cheap).
CREATE OR REPLACE FUNCTION check_first_spark_badge(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM award_badge(p_user_id, 'first_spark', 100);
END;
$$;


-- ── 3b. Meal badges ──────────────────────────────────────────────────────────
-- meal_logger_i  : 7  consecutive days with any meal logged  (common,  100 XP)
-- meal_logger_ii : 30 consecutive days with any meal logged  (rare,    250 XP)
-- macro_aware    : 3  consecutive days hitting macro goals   (common,  100 XP)
-- macro_locked   : 14 consecutive days hitting macro goals   (rare,    250 XP)
--
-- "Hitting macro goals" = daily calories within 85–115 % of goal
--                       AND daily protein >= 90 % of goal.
-- Called   : AFTER INSERT on meal_entries.
CREATE OR REPLACE FUNCTION check_meal_badges(p_user_id UUID, p_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cal_goal            INT;
  v_prot_goal           INT;
  v_consecutive_meal    INT;
  v_consecutive_macro   INT;
BEGIN
  -- Nutritional goals (fall back to sensible defaults if not set)
  SELECT COALESCE(calories_goal, 2000), COALESCE(protein_goal, 150)
  INTO   v_cal_goal, v_prot_goal
  FROM   nutrition_goals
  WHERE  user_id = p_user_id;

  IF NOT FOUND THEN
    v_cal_goal  := 2000;
    v_prot_goal := 150;
  END IF;

  -- ── Consecutive meal-log days ending at p_date ────────────────────────────
  SELECT consecutive_days_ending(
    ARRAY(
      SELECT DISTINCT date
      FROM   meal_entries
      WHERE  user_id = p_user_id
        AND  date <= p_date
      ORDER BY date ASC
    )
  ) INTO v_consecutive_meal;

  IF v_consecutive_meal >= 7  THEN PERFORM award_badge(p_user_id, 'meal_logger_i',  100); END IF;
  IF v_consecutive_meal >= 30 THEN PERFORM award_badge(p_user_id, 'meal_logger_ii', 250); END IF;

  -- ── Consecutive macro-goal days ending at p_date ──────────────────────────
  SELECT consecutive_days_ending(
    ARRAY(
      SELECT dt.date
      FROM (
        SELECT date,
               SUM(calories) AS day_cal,
               SUM(protein)  AS day_prot
        FROM   meal_entries
        WHERE  user_id = p_user_id
          AND  date <= p_date
        GROUP BY date
      ) dt
      WHERE dt.day_cal  >= v_cal_goal  * 0.85
        AND dt.day_cal  <= v_cal_goal  * 1.15
        AND dt.day_prot >= v_prot_goal * 0.90
      ORDER BY dt.date ASC
    )
  ) INTO v_consecutive_macro;

  IF v_consecutive_macro >= 3  THEN PERFORM award_badge(p_user_id, 'macro_aware',  100); END IF;
  IF v_consecutive_macro >= 14 THEN PERFORM award_badge(p_user_id, 'macro_locked', 250); END IF;
END;
$$;


-- ── 3c. Water badges ─────────────────────────────────────────────────────────
-- hydrated : 7 consecutive days with ml_consumed >= water_goal_ml  (common, 100 XP)
-- Called   : AFTER INSERT OR UPDATE on daily_water_intake.
CREATE OR REPLACE FUNCTION check_water_badges(p_user_id UUID, p_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_water_goal           INT;
  v_consecutive_water    INT;
BEGIN
  SELECT COALESCE(water_goal_ml, 2000)
  INTO   v_water_goal
  FROM   profiles
  WHERE  id = p_user_id;

  IF NOT FOUND THEN v_water_goal := 2000; END IF;

  SELECT consecutive_days_ending(
    ARRAY(
      SELECT date
      FROM   daily_water_intake
      WHERE  user_id    = p_user_id
        AND  date       <= p_date
        AND  ml_consumed >= v_water_goal
      ORDER BY date ASC
    )
  ) INTO v_consecutive_water;

  IF v_consecutive_water >= 7 THEN
    PERFORM award_badge(p_user_id, 'hydrated', 100);
  END IF;
END;
$$;


-- ── 3d. Training badges ───────────────────────────────────────────────────────
-- training_logged : first completed workout session          (common, 100 XP)
-- iron_routine    : 12 completed sessions in 1 calendar month (rare, 250 XP)
-- Called          : AFTER INSERT on workout_sessions.
CREATE OR REPLACE FUNCTION check_training_badges(p_user_id UUID, p_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_completed INT;
  v_month_completed INT;
BEGIN
  -- training_logged: first completed workout ever
  SELECT COUNT(*) INTO v_total_completed
  FROM   workout_sessions
  WHERE  user_id   = p_user_id
    AND  completed = true;

  IF v_total_completed >= 1 THEN
    PERFORM award_badge(p_user_id, 'training_logged', 100);
  END IF;

  -- iron_routine: 12 completed sessions in the same calendar month as p_date
  SELECT COUNT(*) INTO v_month_completed
  FROM   workout_sessions
  WHERE  user_id   = p_user_id
    AND  completed = true
    AND  date_trunc('month', date::timestamp) = date_trunc('month', p_date::timestamp);

  IF v_month_completed >= 12 THEN
    PERFORM award_badge(p_user_id, 'iron_routine', 250);
  END IF;
END;
$$;


-- ── 3e. Steps badges ──────────────────────────────────────────────────────────
-- step_builder : steps >= steps_goal on 5 days in the Mon–Sun week
--                containing p_date                           (common, 100 XP)
-- Called       : AFTER INSERT OR UPDATE on daily_steps.
CREATE OR REPLACE FUNCTION check_steps_badges(p_user_id UUID, p_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_steps_goal      INT;
  v_week_start      DATE;
  v_week_end        DATE;
  v_qualifying_days INT;
BEGIN
  SELECT COALESCE(steps_goal, 10000)
  INTO   v_steps_goal
  FROM   profiles
  WHERE  id = p_user_id;

  IF NOT FOUND THEN v_steps_goal := 10000; END IF;

  -- ISO week: Monday–Sunday
  v_week_start := date_trunc('week', p_date::timestamp)::date;
  v_week_end   := v_week_start + 6;

  SELECT COUNT(*) INTO v_qualifying_days
  FROM   daily_steps
  WHERE  user_id = p_user_id
    AND  date    BETWEEN v_week_start AND v_week_end
    AND  steps   >= v_steps_goal;

  IF v_qualifying_days >= 5 THEN
    PERFORM award_badge(p_user_id, 'step_builder', 100);
  END IF;
END;
$$;


-- ── 3f. Consistency badges ────────────────────────────────────────────────────
-- consistency_core_i  : food + completed workout + weight all logged
--                       on the SAME day, 14 consecutive days       (rare,  250 XP)
-- consistency_core_ii : same condition, 60 consecutive days        (epic,  600 XP)
-- Called              : on every activity insert (all tables relevant).
CREATE OR REPLACE FUNCTION check_consistency_badges(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consecutive_full INT;
BEGIN
  -- A "full day" requires all three: food log, completed workout, weight log
  SELECT consecutive_days_ending(
    ARRAY(
      SELECT f.date
      FROM (SELECT DISTINCT date FROM meal_entries     WHERE user_id = p_user_id) f
      JOIN  (SELECT DISTINCT date FROM workout_sessions WHERE user_id = p_user_id AND completed = true) w
            ON w.date = f.date
      JOIN  (SELECT DISTINCT date FROM daily_weight    WHERE user_id = p_user_id) wg
            ON wg.date = f.date
      ORDER BY f.date ASC
    )
  ) INTO v_consecutive_full;

  IF v_consecutive_full >= 14 THEN PERFORM award_badge(p_user_id, 'consistency_core_i',  250); END IF;
  IF v_consecutive_full >= 60 THEN PERFORM award_badge(p_user_id, 'consistency_core_ii', 600); END IF;
END;
$$;


-- ── 3g. Streak badges ────────────────────────────────────────────────────────
-- locked_in    : current_streak >= 7   (rare,       250 XP)  unlocks title
-- unbreakable  : current_streak >= 30  (epic,       600 XP)
-- quarter_beast: current_streak >= 90  (legendary, 1500 XP)  unlocks title
-- Called       : from inside update_streak_on_activity (see Part 4), which
--               runs AFTER the streak row has been committed.
CREATE OR REPLACE FUNCTION check_streak_badges(p_user_id UUID, p_streak INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_streak >= 7  THEN PERFORM award_badge(p_user_id, 'locked_in',     250);  END IF;
  IF p_streak >= 30 THEN PERFORM award_badge(p_user_id, 'unbreakable',   600);  END IF;
  IF p_streak >= 90 THEN PERFORM award_badge(p_user_id, 'quarter_beast', 1500); END IF;
END;
$$;


-- ─── PART 4: EXTEND update_streak_on_activity WITH STREAK BADGE CHECKS ───────
--
-- This is a full CREATE OR REPLACE of the function originally installed in
-- 20260331000000_streak_system.sql.  The only addition is the single
-- PERFORM check_streak_badges(...) call at the very end, before the final END.
-- All streak logic is preserved identically.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_streak_on_activity(
  p_user_id       UUID,
  p_activity_date DATE
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
  IF p_activity_date > CURRENT_DATE THEN
    p_activity_date := CURRENT_DATE;
  END IF;

  INSERT INTO user_gamification (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_row
  FROM   user_gamification
  WHERE  user_id = p_user_id
  FOR UPDATE;

  IF v_row.last_active_date = p_activity_date THEN
    RETURN;
  END IF;

  IF v_row.last_active_date IS NULL THEN
    v_new_streak      := 1;
    v_new_last_active := p_activity_date;
    v_new_freeze      := FALSE;
    v_new_milestone   := 0;

  ELSIF v_row.last_active_date = p_activity_date - INTERVAL '1 day' THEN
    v_new_streak      := v_row.current_streak + 1;
    v_new_last_active := p_activity_date;
    v_new_freeze      := v_row.freeze_available;
    v_new_milestone   := v_row.streak_protect_milestone;

  ELSIF v_row.last_active_date = p_activity_date - INTERVAL '2 days'
        AND v_row.freeze_available = TRUE THEN
    v_new_streak      := v_row.current_streak + 2;
    v_new_last_active := p_activity_date;
    v_new_freeze      := FALSE;
    v_new_milestone   := v_row.streak_protect_milestone;
    v_freeze_consumed := TRUE;

  ELSE
    v_new_streak      := 1;
    v_new_last_active := p_activity_date;
    v_new_freeze      := FALSE;
    v_new_milestone   := 0;
  END IF;

  v_new_longest := GREATEST(v_row.longest_streak, v_new_streak);

  IF NOT v_freeze_consumed AND NOT v_new_freeze THEN
    v_next_milestone := (FLOOR(v_new_streak::NUMERIC / 7) * 7)::INT;
    IF v_next_milestone >= 7 AND v_next_milestone > v_new_milestone THEN
      v_new_freeze    := TRUE;
      v_new_milestone := v_next_milestone;
    END IF;
  END IF;

  UPDATE user_gamification
  SET
    current_streak           = v_new_streak,
    longest_streak           = v_new_longest,
    last_active_date         = v_new_last_active,
    freeze_available         = v_new_freeze,
    streak_protect_milestone = v_new_milestone,
    updated_at               = now()
  WHERE user_id = p_user_id;

  -- ── NEW: evaluate streak-based badges ─────────────────────────────────────
  PERFORM check_streak_badges(p_user_id, v_new_streak);

END;
$$;


-- ─── PART 5: BADGE TRIGGER DISPATCHER ────────────────────────────────────────
--
-- trg_badges_from_activity()
-- Fires AFTER INSERT (or AFTER INSERT OR UPDATE for upserted tables) on each
-- activity table.  Uses TG_TABLE_NAME to route to the right category checks.
--
-- NOTE ON TRIGGER ORDER
--   For tables that have BOTH a streak trigger (streak_*) AND this badge
--   trigger (badges_*), PostgreSQL fires triggers alphabetically by name.
--   "badges_*" fires BEFORE "streak_*" for the same event.
--   That is intentional: the category-badge checks (meal, water, training,
--   steps, consistency) read from the source tables and do not depend on the
--   streak counter.  Streak badges are checked INSIDE update_streak_on_activity
--   (Part 4), which runs inside the streak trigger that fires afterward.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_badges_from_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First Spark: any insert in any activity table qualifies
  PERFORM check_first_spark_badge(NEW.user_id);

  -- Route table-specific badge checks
  IF TG_TABLE_NAME = 'meal_entries' THEN
    PERFORM check_meal_badges(NEW.user_id, NEW.date);

  ELSIF TG_TABLE_NAME = 'daily_water_intake' THEN
    PERFORM check_water_badges(NEW.user_id, NEW.date);

  ELSIF TG_TABLE_NAME = 'workout_sessions' THEN
    PERFORM check_training_badges(NEW.user_id, NEW.date);

  ELSIF TG_TABLE_NAME = 'daily_steps' THEN
    PERFORM check_steps_badges(NEW.user_id, NEW.date);

  -- daily_weight: no standalone badge, but participates in consistency
  END IF;

  -- Consistency badges span all activity types; check on every insert
  PERFORM check_consistency_badges(NEW.user_id);

  RETURN NEW;
END;
$$;


-- Attach to all 5 activity tables
DROP TRIGGER IF EXISTS badges_meal_entries ON meal_entries;
CREATE TRIGGER badges_meal_entries
  AFTER INSERT ON meal_entries
  FOR EACH ROW EXECUTE FUNCTION trg_badges_from_activity();

DROP TRIGGER IF EXISTS badges_daily_water_intake ON daily_water_intake;
CREATE TRIGGER badges_daily_water_intake
  AFTER INSERT OR UPDATE ON daily_water_intake
  FOR EACH ROW EXECUTE FUNCTION trg_badges_from_activity();

DROP TRIGGER IF EXISTS badges_workout_sessions ON workout_sessions;
CREATE TRIGGER badges_workout_sessions
  AFTER INSERT ON workout_sessions
  FOR EACH ROW EXECUTE FUNCTION trg_badges_from_activity();

DROP TRIGGER IF EXISTS badges_daily_weight ON daily_weight;
CREATE TRIGGER badges_daily_weight
  AFTER INSERT OR UPDATE ON daily_weight
  FOR EACH ROW EXECUTE FUNCTION trg_badges_from_activity();

DROP TRIGGER IF EXISTS badges_daily_steps ON daily_steps;
CREATE TRIGGER badges_daily_steps
  AFTER INSERT OR UPDATE ON daily_steps
  FOR EACH ROW EXECUTE FUNCTION trg_badges_from_activity();


-- ─── PART 6: WEEKLY FITNESS SCORE RPC ────────────────────────────────────────
--
-- recalculate_weekly_fitness_score(p_user_id, p_week_start)
--
-- p_week_start must be a Monday (ISO week start).
-- Mirrors the TypeScript formula in src/lib/fitnessScore.ts exactly:
--   Nutrition   50 % | Training 25 % | Activity 15 % | Consistency 10 %
--
-- Security:
--   • SECURITY DEFINER so it can write to weekly_fitness_scores despite RLS.
--   • Auth guard: if called by an authenticated user (auth.uid() != NULL),
--     p_user_id must equal auth.uid().  Service-role / DO-block callers
--     (auth.uid() = NULL) bypass this check, enabling the backfill script.
--
-- Calling from the frontend:
--   supabase.rpc('recalculate_weekly_fitness_score', {
--     p_user_id: user.id,
--     p_week_start: '2026-03-30',   // Monday of the desired week
--   })
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION recalculate_weekly_fitness_score(
  p_user_id    UUID,
  p_week_start DATE   -- must be a Monday
)
RETURNS TABLE (
  total_score       NUMERIC,
  nutrition_score   NUMERIC,
  training_score    NUMERIC,
  activity_score    NUMERIC,
  consistency_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_end          DATE;
  v_cal_goal          NUMERIC;
  v_prot_goal         NUMERIC;
  v_steps_goal        NUMERIC;

  v_avg_cal_adh       NUMERIC;
  v_avg_prot_adh      NUMERIC;
  v_nutrition_score   NUMERIC;

  v_has_plan          BOOLEAN;
  v_completed_sess    INT;
  v_training_score    NUMERIC;

  v_avg_steps         NUMERIC;
  v_activity_score    NUMERIC;

  v_days_food         INT;
  v_days_workout      INT;
  v_days_weight       INT;
  v_consistency_score NUMERIC;

  v_total_score       NUMERIC;
BEGIN
  -- ── Auth guard ────────────────────────────────────────────────────────────
  IF auth.uid() IS NOT NULL AND p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: you can only calculate your own weekly score';
  END IF;

  v_week_end := p_week_start + 6;

  -- ── Goals ─────────────────────────────────────────────────────────────────
  SELECT COALESCE(ng.calories_goal, 2000),
         COALESCE(ng.protein_goal,  150)
  INTO   v_cal_goal, v_prot_goal
  FROM   nutrition_goals ng
  WHERE  ng.user_id = p_user_id;
  IF NOT FOUND THEN v_cal_goal := 2000; v_prot_goal := 150; END IF;

  SELECT COALESCE(p.steps_goal, 10000)
  INTO   v_steps_goal
  FROM   profiles p
  WHERE  p.id = p_user_id;
  IF NOT FOUND THEN v_steps_goal := 10000; END IF;

  -- ── Nutrition (mirrors calculateNutritionScore) ───────────────────────────
  SELECT COALESCE(AVG(day_cal)  / NULLIF(v_cal_goal,  0), 0),
         COALESCE(AVG(day_prot) / NULLIF(v_prot_goal, 0), 0)
  INTO   v_avg_cal_adh, v_avg_prot_adh
  FROM (
    SELECT date,
           SUM(calories) AS day_cal,
           SUM(protein)  AS day_prot
    FROM   meal_entries
    WHERE  user_id = p_user_id
      AND  date BETWEEN p_week_start AND v_week_end
    GROUP  BY date
  ) daily;

  -- 60 % calorie adherence + 40 % protein adherence
  v_nutrition_score := ROUND(
    adherence_to_score(v_avg_cal_adh)  * 0.6 +
    adherence_to_score(v_avg_prot_adh) * 0.4
  );

  -- ── Training (mirrors calculateTrainingScore) ─────────────────────────────
  -- Neutral (50) if user has no workout templates (no plan configured).
  -- Otherwise assume 4 sessions/week as the planned target.
  SELECT EXISTS(SELECT 1 FROM workout_templates WHERE user_id = p_user_id)
  INTO   v_has_plan;

  SELECT COUNT(*) INTO v_completed_sess
  FROM   workout_sessions
  WHERE  user_id   = p_user_id
    AND  completed = true
    AND  date BETWEEN p_week_start AND v_week_end;

  IF NOT v_has_plan THEN
    v_training_score := 50;
  ELSE
    v_training_score := LEAST(100, ROUND(v_completed_sess::NUMERIC / 4.0 * 100));
  END IF;

  -- ── Activity (mirrors calculateActivityScore) ─────────────────────────────
  SELECT COALESCE(AVG(steps), 0) INTO v_avg_steps
  FROM   daily_steps
  WHERE  user_id = p_user_id
    AND  date BETWEEN p_week_start AND v_week_end;

  IF v_steps_goal <= 0 THEN
    v_activity_score := 50;
  ELSE
    v_activity_score := LEAST(100, ROUND(v_avg_steps / v_steps_goal * 100));
  END IF;

  -- ── Consistency (mirrors calculateConsistencyScore) ───────────────────────
  SELECT COUNT(DISTINCT date) INTO v_days_food
  FROM   meal_entries
  WHERE  user_id = p_user_id
    AND  date BETWEEN p_week_start AND v_week_end;

  SELECT COUNT(DISTINCT date) INTO v_days_workout
  FROM   workout_sessions
  WHERE  user_id   = p_user_id
    AND  completed = true
    AND  date BETWEEN p_week_start AND v_week_end;

  SELECT COUNT(DISTINCT date) INTO v_days_weight
  FROM   daily_weight
  WHERE  user_id = p_user_id
    AND  date BETWEEN p_week_start AND v_week_end;

  -- 50 % food + 35 % workout + 15 % weight
  v_consistency_score := ROUND(
    (v_days_food    ::NUMERIC / 7 * 100) * 0.50 +
    (v_days_workout ::NUMERIC / 7 * 100) * 0.35 +
    (v_days_weight  ::NUMERIC / 7 * 100) * 0.15
  );

  -- ── Composite total ───────────────────────────────────────────────────────
  v_total_score := ROUND(
    v_nutrition_score   * 0.50 +
    v_training_score    * 0.25 +
    v_activity_score    * 0.15 +
    v_consistency_score * 0.10
  );

  -- ── Persist (upsert) ─────────────────────────────────────────────────────
  INSERT INTO weekly_fitness_scores (
    user_id, week_start, week_end,
    total_score, nutrition_score, training_score, activity_score, consistency_score
  ) VALUES (
    p_user_id, p_week_start, v_week_end,
    v_total_score, v_nutrition_score, v_training_score, v_activity_score, v_consistency_score
  )
  ON CONFLICT (user_id, week_start) DO UPDATE
    SET total_score       = EXCLUDED.total_score,
        nutrition_score   = EXCLUDED.nutrition_score,
        training_score    = EXCLUDED.training_score,
        activity_score    = EXCLUDED.activity_score,
        consistency_score = EXCLUDED.consistency_score;

  RETURN QUERY SELECT v_total_score, v_nutrition_score, v_training_score, v_activity_score, v_consistency_score;
END;
$$;

GRANT EXECUTE ON FUNCTION recalculate_weekly_fitness_score(UUID, DATE) TO authenticated;


-- ─── PART 7: on_track BADGE TRIGGER ─────────────────────────────────────────
--
-- Fires whenever a row is inserted or updated in weekly_fitness_scores.
-- If the score meets the threshold (>= 60), the on_track badge is awarded.
-- This means:
--   • Real-time: badge fires after the frontend calls the RPC.
--   • Backfill:  badge fires as the backfill script upserts historical scores.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_on_track_badge_from_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.total_score >= 60 THEN
    PERFORM award_badge(NEW.user_id, 'on_track', 100);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_track_badge_score ON weekly_fitness_scores;
CREATE TRIGGER on_track_badge_score
  AFTER INSERT OR UPDATE ON weekly_fitness_scores
  FOR EACH ROW EXECUTE FUNCTION trg_on_track_badge_from_score();
