-- ============================================================
-- BACKFILL: Badge System + Historical Weekly Fitness Scores
-- Date: 2026-03-31
-- Depends on: 20260331000001_badge_system.sql
--
-- PURPOSE
--   Award badges to users who already met conditions before the badge
--   system was deployed.  Every award is idempotent (ON CONFLICT DO NOTHING
--   inside award_badge), so this script is safe to run multiple times.
--
-- HOW TO RUN
--   Paste into the Supabase SQL Editor and click "Run".
--   Estimated run time: <5 s for small datasets; proportional to history size.
--
-- WHAT THIS SCRIPT DOES (in order)
--   1. first_spark      – any historical activity record
--   2. training_logged  – any completed workout session ever
--   3. meal_logger_i/ii – best consecutive meal-log run in history
--   4. macro_aware/locked – best consecutive macro-goal run in history
--   5. hydrated           – best consecutive water-goal run in history
--   6. iron_routine       – any month with >= 12 completed workouts
--   7. step_builder       – any Mon–Sun week with >= 5 qualifying step days
--   8. consistency_core_i/ii – best consecutive "full days" run in history
--   9. locked_in / unbreakable / quarter_beast – based on longest_streak
--  10. on_track (via weekly scores) – compute historical weekly fitness scores
--      for every week with activity; the on_track trigger fires automatically
--      when total_score >= 60 is upserted.
-- ============================================================

DO $$
DECLARE
  v_user_id          UUID;
  v_longest_streak   INT;
  v_cal_goal         INT;
  v_prot_goal        INT;
  v_water_goal       INT;
  v_steps_goal       INT;

  -- Consecutive-run tracking
  v_best_meal_run    INT;
  v_best_macro_run   INT;
  v_best_water_run   INT;
  v_best_full_run    INT;

  -- Iron Routine
  v_month_count      INT;

  -- Step Builder
  v_week_start       DATE;
  v_week_end         DATE;
  v_step_days        INT;

  -- Weekly score backfill
  v_score_week_start DATE;

BEGIN

  -- ──────────────────────────────────────────────────────────────────────────
  -- Iterate over every user that has a gamification row (created automatically
  -- on first activity by update_streak_on_activity).  Users who never logged
  -- anything will have no row and no badges to backfill.
  -- ──────────────────────────────────────────────────────────────────────────
  FOR v_user_id IN (
    SELECT DISTINCT user_id FROM user_gamification
  )
  LOOP

    -- ── 1. First Spark ──────────────────────────────────────────────────────
    IF EXISTS (
      SELECT 1 FROM meal_entries       WHERE user_id = v_user_id LIMIT 1
      UNION ALL
      SELECT 1 FROM daily_water_intake WHERE user_id = v_user_id LIMIT 1
      UNION ALL
      SELECT 1 FROM workout_sessions   WHERE user_id = v_user_id LIMIT 1
      UNION ALL
      SELECT 1 FROM daily_weight       WHERE user_id = v_user_id LIMIT 1
    ) THEN
      PERFORM award_badge(v_user_id, 'first_spark', 100);
    END IF;

    -- ── 2. Training Logged ──────────────────────────────────────────────────
    IF EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE  user_id = v_user_id AND completed = true LIMIT 1
    ) THEN
      PERFORM award_badge(v_user_id, 'training_logged', 100);
    END IF;

    -- ── 3. Meal Logger I / II ───────────────────────────────────────────────
    SELECT max_consecutive_days(
      ARRAY(
        SELECT DISTINCT date FROM meal_entries
        WHERE  user_id = v_user_id
        ORDER  BY date ASC
      )
    ) INTO v_best_meal_run;

    IF v_best_meal_run >= 7  THEN PERFORM award_badge(v_user_id, 'meal_logger_i',  100); END IF;
    IF v_best_meal_run >= 30 THEN PERFORM award_badge(v_user_id, 'meal_logger_ii', 250); END IF;

    -- ── 4. Macro Aware / Locked ─────────────────────────────────────────────
    SELECT COALESCE(calories_goal, 2000), COALESCE(protein_goal, 150)
    INTO   v_cal_goal, v_prot_goal
    FROM   nutrition_goals
    WHERE  user_id = v_user_id;

    IF NOT FOUND THEN v_cal_goal := 2000; v_prot_goal := 150; END IF;

    SELECT max_consecutive_days(
      ARRAY(
        SELECT dt.date
        FROM (
          SELECT date,
                 SUM(calories) AS day_cal,
                 SUM(protein)  AS day_prot
          FROM   meal_entries
          WHERE  user_id = v_user_id
          GROUP  BY date
        ) dt
        WHERE dt.day_cal  >= v_cal_goal  * 0.85
          AND dt.day_cal  <= v_cal_goal  * 1.15
          AND dt.day_prot >= v_prot_goal * 0.90
        ORDER  BY dt.date ASC
      )
    ) INTO v_best_macro_run;

    IF v_best_macro_run >= 3  THEN PERFORM award_badge(v_user_id, 'macro_aware',  100); END IF;
    IF v_best_macro_run >= 14 THEN PERFORM award_badge(v_user_id, 'macro_locked', 250); END IF;

    -- ── 5. Hydrated ─────────────────────────────────────────────────────────
    SELECT COALESCE(water_goal_ml, 2000)
    INTO   v_water_goal
    FROM   profiles
    WHERE  id = v_user_id;

    IF NOT FOUND THEN v_water_goal := 2000; END IF;

    SELECT max_consecutive_days(
      ARRAY(
        SELECT date FROM daily_water_intake
        WHERE  user_id    = v_user_id
          AND  ml_consumed >= v_water_goal
        ORDER  BY date ASC
      )
    ) INTO v_best_water_run;

    IF v_best_water_run >= 7 THEN
      PERFORM award_badge(v_user_id, 'hydrated', 100);
    END IF;

    -- ── 6. Iron Routine ─────────────────────────────────────────────────────
    -- Award if any calendar month ever had >= 12 completed sessions.
    IF EXISTS (
      SELECT 1
      FROM (
        SELECT date_trunc('month', date::timestamp) AS month
        FROM   workout_sessions
        WHERE  user_id = v_user_id AND completed = true
        GROUP  BY 1
        HAVING COUNT(*) >= 12
      ) months
    ) THEN
      PERFORM award_badge(v_user_id, 'iron_routine', 250);
    END IF;

    -- ── 7. Step Builder ─────────────────────────────────────────────────────
    -- Award if any Mon–Sun week ever had >= 5 qualifying step days.
    SELECT COALESCE(steps_goal, 10000) INTO v_steps_goal
    FROM   profiles WHERE id = v_user_id;
    IF NOT FOUND THEN v_steps_goal := 10000; END IF;

    IF EXISTS (
      SELECT 1
      FROM (
        SELECT date_trunc('week', date::timestamp)::date AS wk,
               COUNT(*) AS qualifying
        FROM   daily_steps
        WHERE  user_id = v_user_id
          AND  steps   >= v_steps_goal
        GROUP  BY 1
        HAVING COUNT(*) >= 5
      ) weeks
    ) THEN
      PERFORM award_badge(v_user_id, 'step_builder', 100);
    END IF;

    -- ── 8. Consistency Core I / II ──────────────────────────────────────────
    -- "Full day" = food log + completed workout + weight log on the same date.
    SELECT max_consecutive_days(
      ARRAY(
        SELECT f.date
        FROM (SELECT DISTINCT date FROM meal_entries     WHERE user_id = v_user_id) f
        JOIN  (SELECT DISTINCT date FROM workout_sessions WHERE user_id = v_user_id AND completed = true) w
              ON w.date = f.date
        JOIN  (SELECT DISTINCT date FROM daily_weight    WHERE user_id = v_user_id) wg
              ON wg.date = f.date
        ORDER  BY f.date ASC
      )
    ) INTO v_best_full_run;

    IF v_best_full_run >= 14 THEN PERFORM award_badge(v_user_id, 'consistency_core_i',  250); END IF;
    IF v_best_full_run >= 60 THEN PERFORM award_badge(v_user_id, 'consistency_core_ii', 600); END IF;

    -- ── 9. Streak Badges (based on longest_streak ever recorded) ───────────
    -- We use longest_streak rather than current_streak because the user might
    -- have broken the streak since reaching the milestone.
    SELECT longest_streak INTO v_longest_streak
    FROM   user_gamification WHERE user_id = v_user_id;

    PERFORM check_streak_badges(v_user_id, COALESCE(v_longest_streak, 0));

    -- ── 10. On Track (via historical weekly fitness scores) ─────────────────
    -- Compute a score for every past week that had any activity.
    -- The on_track_badge trigger fires automatically when total_score >= 60
    -- is upserted into weekly_fitness_scores.
    FOR v_score_week_start IN (
      SELECT DISTINCT date_trunc('week', date::timestamp)::date AS wk
      FROM (
        SELECT date FROM meal_entries       WHERE user_id = v_user_id
        UNION
        SELECT date FROM workout_sessions   WHERE user_id = v_user_id
        UNION
        SELECT date FROM daily_steps        WHERE user_id = v_user_id
        UNION
        SELECT date FROM daily_weight       WHERE user_id = v_user_id
        UNION
        SELECT date FROM daily_water_intake WHERE user_id = v_user_id
      ) all_activity
      -- Only past (completed) weeks; exclude the current week so the live
      -- weekly-score RPC stays the authoritative source for the current week.
      WHERE date_trunc('week', date::timestamp)::date
              < date_trunc('week', CURRENT_DATE::timestamp)::date
      ORDER BY wk ASC
    )
    LOOP
      -- auth.uid() is NULL in this DO-block context (service-role), so the
      -- auth guard inside recalculate_weekly_fitness_score is skipped.
      PERFORM recalculate_weekly_fitness_score(v_user_id, v_score_week_start);
    END LOOP;

  END LOOP; -- end user loop

END;
$$;
