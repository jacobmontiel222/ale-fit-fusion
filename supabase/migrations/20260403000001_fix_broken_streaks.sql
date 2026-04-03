-- ============================================================
-- MIGRATION: fix_broken_streaks
-- Date: 2026-04-03
-- Description:
--   Corrects streaks that were wrongly reset to 1 by the
--   past-date bug. Recalculates each user's real consecutive
--   streak by looking at all activity tables and counting
--   consecutive days backwards from their most recent entry.
--
--   Run AFTER deploying 20260403000000_streak_ignore_past_dates.sql
--
--   To correct all users at once:
--     SELECT user_id, fix_streak_for_user(user_id)
--     FROM user_gamification;
-- ============================================================

CREATE OR REPLACE FUNCTION fix_streak_for_user(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dates      DATE[];
  v_streak     INT := 0;
  v_check_date DATE;
  v_i          INT;
BEGIN
  -- Collect all distinct days the user was active, sorted newest first
  SELECT ARRAY_AGG(activity_date ORDER BY activity_date DESC)
  INTO v_dates
  FROM (
    SELECT DISTINCT date AS activity_date FROM (
      SELECT date FROM meal_entries       WHERE user_id = p_user_id AND date <= CURRENT_DATE
      UNION
      SELECT date FROM daily_water_intake WHERE user_id = p_user_id AND date <= CURRENT_DATE
      UNION
      SELECT date FROM workout_sessions   WHERE user_id = p_user_id AND date <= CURRENT_DATE
      UNION
      SELECT date FROM daily_weight       WHERE user_id = p_user_id AND date <= CURRENT_DATE
    ) combined
  ) distinct_dates;

  -- No activity at all → nothing to fix
  IF v_dates IS NULL OR ARRAY_LENGTH(v_dates, 1) = 0 THEN
    RETURN 0;
  END IF;

  -- Count consecutive days ending at the most recent activity date
  v_check_date := v_dates[1];
  FOR v_i IN 1..ARRAY_LENGTH(v_dates, 1) LOOP
    IF v_dates[v_i] = v_check_date THEN
      v_streak     := v_streak + 1;
      v_check_date := v_check_date - INTERVAL '1 day';
    ELSE
      EXIT; -- gap found, stop
    END IF;
  END LOOP;

  -- Persist corrected streak (keep longest_streak if higher)
  UPDATE user_gamification
  SET
    current_streak   = v_streak,
    longest_streak   = GREATEST(longest_streak, v_streak),
    last_active_date = v_dates[1],
    updated_at       = now()
  WHERE user_id = p_user_id;

  RETURN v_streak;
END;
$$;

-- Run immediately for all existing users
SELECT user_id, fix_streak_for_user(user_id) AS corrected_streak
FROM user_gamification;
