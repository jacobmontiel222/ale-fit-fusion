-- ============================================================
-- MIGRATION: daily_fitness_score
-- Date: 2026-04-03
-- Depends on: 20260331000001_badge_system.sql
--
-- Description:
--   Implements the hybrid daily + weekly Fitness Score system.
--
--   1. daily_fitness_scores table
--        One row per user per day with full subscore breakdown.
--
--   2. recalculate_daily_fitness_score(p_user_id, p_date)
--        New formula (matches the product spec exactly):
--          Calories    → deviation-based, ±10% = 100, ±40% = 0  (30 pts)
--          Protein     → progress toward goal, clamped to 100    (20 pts)
--          Training    → any workout logged = 100                 (25 pts)
--          Steps       → steps / goal * 100                       (15 pts)
--          Consistency → 5 checks / 5 * 100                      (10 pts)
--        Upserts result into daily_fitness_scores.
--
--   3. trg_recalculate_daily_score()
--        Trigger function: fires AFTER INSERT/UPDATE/DELETE on
--        any of the 5 activity tables and auto-recalculates the
--        daily score for that date.
--
--   4. Triggers on all 5 activity tables
--        meal_entries, workout_sessions, daily_weight,
--        daily_water_intake, daily_steps
--
--   5. Updated recalculate_weekly_fitness_score()
--        Now simply averages the daily_fitness_scores rows for
--        the 7-day window instead of re-computing from raw data.
-- ============================================================


-- ─── 1. TABLE ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_fitness_scores (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                 DATE         NOT NULL,

  -- Component subscores (0–100 each)
  calorie_subscore     NUMERIC(5,2) NOT NULL DEFAULT 0,
  protein_subscore     NUMERIC(5,2) NOT NULL DEFAULT 0,
  nutrition_subscore   NUMERIC(5,2) NOT NULL DEFAULT 0,  -- 0.6*cal + 0.4*prot
  training_subscore    NUMERIC(5,2) NOT NULL DEFAULT 0,
  steps_subscore       NUMERIC(5,2) NOT NULL DEFAULT 0,
  consistency_subscore NUMERIC(5,2) NOT NULL DEFAULT 0,

  -- Weighted final (0–100)
  final_score          NUMERIC(5,2) NOT NULL DEFAULT 0,

  -- Consistency check flags
  has_food_log         BOOLEAN      NOT NULL DEFAULT false,
  has_workout_log      BOOLEAN      NOT NULL DEFAULT false,
  has_weight_log       BOOLEAN      NOT NULL DEFAULT false,
  has_water_log        BOOLEAN      NOT NULL DEFAULT false,
  has_steps_log        BOOLEAN      NOT NULL DEFAULT false,

  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),

  UNIQUE (user_id, date)
);

ALTER TABLE daily_fitness_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own daily scores"
  ON daily_fitness_scores FOR SELECT
  USING (auth.uid() = user_id);

-- Enable real-time CDC for this table
ALTER TABLE daily_fitness_scores REPLICA IDENTITY FULL;


-- ─── 2. recalculate_daily_fitness_score() ────────────────────────────────────

CREATE OR REPLACE FUNCTION recalculate_daily_fitness_score(
  p_user_id UUID,
  p_date    DATE
)
RETURNS TABLE (
  out_final_score          NUMERIC,
  out_calorie_subscore     NUMERIC,
  out_protein_subscore     NUMERIC,
  out_nutrition_subscore   NUMERIC,
  out_training_subscore    NUMERIC,
  out_steps_subscore       NUMERIC,
  out_consistency_subscore NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Goals
  v_cal_goal    NUMERIC;
  v_prot_goal   NUMERIC;
  v_steps_goal  NUMERIC;
  v_water_goal  NUMERIC;

  -- Raw day totals
  v_day_cal     NUMERIC;
  v_day_prot    NUMERIC;
  v_day_steps   NUMERIC;
  v_day_water   NUMERIC;

  -- Deviation helper
  v_deviation   NUMERIC;

  -- Component subscores (0–100 each)
  v_cal_score   NUMERIC;
  v_prot_score  NUMERIC;
  v_nutr_score  NUMERIC;
  v_train_score NUMERIC;
  v_steps_score NUMERIC;
  v_cons_score  NUMERIC;

  -- Consistency check flags
  v_has_food    BOOLEAN;
  v_has_workout BOOLEAN;
  v_has_weight  BOOLEAN;
  v_has_water   BOOLEAN;
  v_has_steps   BOOLEAN;
  v_checks_done INT;

  v_final       NUMERIC;
BEGIN
  -- ── Auth guard ────────────────────────────────────────────────────────────
  -- When called from a trigger, auth.uid() is NULL → guard bypassed (correct).
  -- When called by an authenticated user, they can only calc their own score.
  IF auth.uid() IS NOT NULL AND p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: you can only calculate your own score';
  END IF;

  -- ── Goals ─────────────────────────────────────────────────────────────────
  SELECT COALESCE(ng.calories_goal, 2000),
         COALESCE(ng.protein_goal,  150)
  INTO   v_cal_goal, v_prot_goal
  FROM   nutrition_goals ng
  WHERE  ng.user_id = p_user_id;
  IF NOT FOUND THEN v_cal_goal := 2000; v_prot_goal := 150; END IF;

  SELECT COALESCE(p.steps_goal,    10000),
         COALESCE(p.water_goal_ml,  2000)
  INTO   v_steps_goal, v_water_goal
  FROM   profiles p
  WHERE  p.id = p_user_id;
  IF NOT FOUND THEN v_steps_goal := 10000; v_water_goal := 2000; END IF;

  -- ── Daily nutrition totals ─────────────────────────────────────────────────
  SELECT COALESCE(SUM(calories), 0),
         COALESCE(SUM(protein),  0)
  INTO   v_day_cal, v_day_prot
  FROM   meal_entries
  WHERE  user_id = p_user_id
    AND  date    = p_date;

  -- ── Calorie subscore ──────────────────────────────────────────────────────
  -- deviation = |consumed - target| / target
  -- ≤ 10 % → 100  |  ≥ 40 % → 0  |  between → linear interpolation
  IF v_cal_goal <= 0 OR v_day_cal = 0 THEN
    v_cal_score := 0;
  ELSE
    v_deviation := ABS(v_day_cal - v_cal_goal) / v_cal_goal;
    IF    v_deviation <= 0.10 THEN
      v_cal_score := 100;
    ELSIF v_deviation >= 0.40 THEN
      v_cal_score := 0;
    ELSE
      v_cal_score := ROUND(100.0 * (0.40 - v_deviation) / 0.30);
    END IF;
  END IF;

  -- ── Protein subscore ──────────────────────────────────────────────────────
  -- Simple progress toward goal, clamped to 100
  IF v_prot_goal <= 0 THEN
    v_prot_score := 0;
  ELSE
    v_prot_score := LEAST(100, ROUND(v_day_prot / v_prot_goal * 100));
  END IF;

  -- ── Nutrition subscore (0–100, combined) ──────────────────────────────────
  v_nutr_score := ROUND(v_cal_score * 0.60 + v_prot_score * 0.40);

  -- ── Training subscore ─────────────────────────────────────────────────────
  -- Any workout_sessions row for this date = 100, otherwise 0.
  SELECT EXISTS (
    SELECT 1 FROM workout_sessions
    WHERE  user_id = p_user_id
      AND  date    = p_date
  ) INTO v_has_workout;

  v_train_score := CASE WHEN v_has_workout THEN 100 ELSE 0 END;

  -- ── Steps / Activity subscore ─────────────────────────────────────────────
  v_day_steps := COALESCE(
    (SELECT steps FROM daily_steps
     WHERE  user_id = p_user_id AND date = p_date),
    0
  );

  IF v_steps_goal <= 0 THEN
    v_steps_score := 0;
  ELSE
    v_steps_score := LEAST(100, ROUND(v_day_steps / v_steps_goal * 100));
  END IF;

  -- ── Consistency (5 checks) ────────────────────────────────────────────────
  -- 1. food logged (any meal_entries row)
  SELECT EXISTS (
    SELECT 1 FROM meal_entries
    WHERE  user_id = p_user_id AND date = p_date
  ) INTO v_has_food;

  -- 2. workout logged → already set above

  -- 3. weight logged
  SELECT EXISTS (
    SELECT 1 FROM daily_weight
    WHERE  user_id = p_user_id AND date = p_date
  ) INTO v_has_weight;

  -- 4. water logged (ml_consumed > 0)
  v_day_water := COALESCE(
    (SELECT ml_consumed FROM daily_water_intake
     WHERE  user_id = p_user_id AND date = p_date),
    0
  );
  v_has_water := v_day_water > 0;

  -- 5. steps logged (steps > 0)
  v_has_steps := v_day_steps > 0;

  v_checks_done :=
    (CASE WHEN v_has_food    THEN 1 ELSE 0 END) +
    (CASE WHEN v_has_workout THEN 1 ELSE 0 END) +
    (CASE WHEN v_has_weight  THEN 1 ELSE 0 END) +
    (CASE WHEN v_has_water   THEN 1 ELSE 0 END) +
    (CASE WHEN v_has_steps   THEN 1 ELSE 0 END);

  v_cons_score := ROUND(v_checks_done::NUMERIC / 5.0 * 100);

  -- ── Final composite score ─────────────────────────────────────────────────
  -- calories * 0.30 + protein * 0.20 + training * 0.25 + steps * 0.15 + consistency * 0.10
  v_final := ROUND(
    v_cal_score   * 0.30 +
    v_prot_score  * 0.20 +
    v_train_score * 0.25 +
    v_steps_score * 0.15 +
    v_cons_score  * 0.10
  );
  v_final := LEAST(100, GREATEST(0, v_final));

  -- ── Upsert into daily_fitness_scores ─────────────────────────────────────
  INSERT INTO daily_fitness_scores (
    user_id, date,
    calorie_subscore, protein_subscore, nutrition_subscore,
    training_subscore, steps_subscore, consistency_subscore,
    final_score,
    has_food_log, has_workout_log, has_weight_log, has_water_log, has_steps_log,
    updated_at
  ) VALUES (
    p_user_id, p_date,
    v_cal_score, v_prot_score, v_nutr_score,
    v_train_score, v_steps_score, v_cons_score,
    v_final,
    v_has_food, v_has_workout, v_has_weight, v_has_water, v_has_steps,
    now()
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    calorie_subscore     = EXCLUDED.calorie_subscore,
    protein_subscore     = EXCLUDED.protein_subscore,
    nutrition_subscore   = EXCLUDED.nutrition_subscore,
    training_subscore    = EXCLUDED.training_subscore,
    steps_subscore       = EXCLUDED.steps_subscore,
    consistency_subscore = EXCLUDED.consistency_subscore,
    final_score          = EXCLUDED.final_score,
    has_food_log         = EXCLUDED.has_food_log,
    has_workout_log      = EXCLUDED.has_workout_log,
    has_weight_log       = EXCLUDED.has_weight_log,
    has_water_log        = EXCLUDED.has_water_log,
    has_steps_log        = EXCLUDED.has_steps_log,
    updated_at           = now();

  RETURN QUERY SELECT
    v_final,
    v_cal_score, v_prot_score, v_nutr_score,
    v_train_score, v_steps_score, v_cons_score;
END;
$$;

GRANT EXECUTE ON FUNCTION recalculate_daily_fitness_score(UUID, DATE) TO authenticated;


-- ─── 3. TRIGGER FUNCTION ─────────────────────────────────────────────────────

-- Fires AFTER INSERT / UPDATE / DELETE on any of the 5 activity tables.
-- Recalculates the daily fitness score for the date of the changed row.
-- auth.uid() is NULL in trigger context → auth guard is bypassed (intended).

CREATE OR REPLACE FUNCTION trg_recalculate_daily_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_date    DATE;
BEGIN
  -- For DELETE use OLD, otherwise use NEW
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
    v_date    := OLD.date;
  ELSE
    v_user_id := NEW.user_id;
    v_date    := NEW.date;
  END IF;

  -- Only recalculate for today or past dates; ignore future-dated entries
  IF v_date <= CURRENT_DATE THEN
    PERFORM recalculate_daily_fitness_score(v_user_id, v_date);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


-- ─── 4. TRIGGERS ON ACTIVITY TABLES ──────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_daily_score_meal    ON meal_entries;
DROP TRIGGER IF EXISTS trg_daily_score_workout ON workout_sessions;
DROP TRIGGER IF EXISTS trg_daily_score_weight  ON daily_weight;
DROP TRIGGER IF EXISTS trg_daily_score_water   ON daily_water_intake;
DROP TRIGGER IF EXISTS trg_daily_score_steps   ON daily_steps;

CREATE TRIGGER trg_daily_score_meal
  AFTER INSERT OR UPDATE OR DELETE ON meal_entries
  FOR EACH ROW EXECUTE FUNCTION trg_recalculate_daily_score();

CREATE TRIGGER trg_daily_score_workout
  AFTER INSERT OR UPDATE OR DELETE ON workout_sessions
  FOR EACH ROW EXECUTE FUNCTION trg_recalculate_daily_score();

CREATE TRIGGER trg_daily_score_weight
  AFTER INSERT OR UPDATE OR DELETE ON daily_weight
  FOR EACH ROW EXECUTE FUNCTION trg_recalculate_daily_score();

CREATE TRIGGER trg_daily_score_water
  AFTER INSERT OR UPDATE OR DELETE ON daily_water_intake
  FOR EACH ROW EXECUTE FUNCTION trg_recalculate_daily_score();

CREATE TRIGGER trg_daily_score_steps
  AFTER INSERT OR UPDATE OR DELETE ON daily_steps
  FOR EACH ROW EXECUTE FUNCTION trg_recalculate_daily_score();


-- ─── 5. UPDATED recalculate_weekly_fitness_score() ───────────────────────────
--
-- Replaces the old raw-data formula with a simple average of the daily
-- scores for the 7-day window.  Only days that have a row in
-- daily_fitness_scores (i.e. the user had some activity) are averaged;
-- days with zero activity contribute no row and are excluded automatically.
--
-- The badge trigger on weekly_fitness_scores is unchanged and still fires.

CREATE OR REPLACE FUNCTION recalculate_weekly_fitness_score(
  p_user_id    UUID,
  p_week_start DATE
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
  v_week_end    DATE;
  v_total       NUMERIC;
  v_nutrition   NUMERIC;
  v_training    NUMERIC;
  v_activity    NUMERIC;
  v_consistency NUMERIC;
BEGIN
  -- ── Auth guard ────────────────────────────────────────────────────────────
  IF auth.uid() IS NOT NULL AND p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: you can only calculate your own weekly score';
  END IF;

  v_week_end := p_week_start + 6;

  -- ── Average the daily scores for the week ─────────────────────────────────
  SELECT
    COALESCE(ROUND(AVG(final_score)),          0),
    COALESCE(ROUND(AVG(nutrition_subscore)),   0),
    COALESCE(ROUND(AVG(training_subscore)),    0),
    COALESCE(ROUND(AVG(steps_subscore)),       0),
    COALESCE(ROUND(AVG(consistency_subscore)), 0)
  INTO v_total, v_nutrition, v_training, v_activity, v_consistency
  FROM daily_fitness_scores
  WHERE user_id = p_user_id
    AND date BETWEEN p_week_start AND v_week_end;

  -- ── Upsert into weekly_fitness_scores ─────────────────────────────────────
  INSERT INTO weekly_fitness_scores (
    user_id, week_start, week_end,
    total_score, nutrition_score, training_score, activity_score, consistency_score
  ) VALUES (
    p_user_id, p_week_start, v_week_end,
    v_total, v_nutrition, v_training, v_activity, v_consistency
  )
  ON CONFLICT (user_id, week_start) DO UPDATE SET
    week_end          = EXCLUDED.week_end,
    total_score       = EXCLUDED.total_score,
    nutrition_score   = EXCLUDED.nutrition_score,
    training_score    = EXCLUDED.training_score,
    activity_score    = EXCLUDED.activity_score,
    consistency_score = EXCLUDED.consistency_score;

  RETURN QUERY SELECT v_total, v_nutrition, v_training, v_activity, v_consistency;
END;
$$;

GRANT EXECUTE ON FUNCTION recalculate_weekly_fitness_score(UUID, DATE) TO authenticated;
