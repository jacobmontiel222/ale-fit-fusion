import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

/**
 * Returns the ISO-week Monday (yyyy-mm-dd) for the week that contains `date`.
 * ISO weeks start on Monday.
 */
export function getISOWeekMonday(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, …, 6 = Sat
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

/** Returns today's date as yyyy-mm-dd (UTC). */
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Calls `recalculate_daily_fitness_score` for the given user and date.
 * Upserts the result into `daily_fitness_scores`.
 * DB triggers handle automatic recalculation on activity changes; this
 * call is used on page mount to ensure the score is fresh.
 */
export async function recalculateDailyScore(
  userId: string,
  date: string,
): Promise<void> {
  const { error } = await db.rpc('recalculate_daily_fitness_score', {
    p_user_id: userId,
    p_date:    date,
  });
  if (error) throw error;
}

/**
 * Calls `recalculate_weekly_fitness_score` for the given user and week.
 * Now averages the daily_fitness_scores rows for the week, upserts into
 * `weekly_fitness_scores`, and fires the `on_track` badge trigger.
 *
 * Call AFTER recalculateDailyScore so the weekly average includes today.
 */
export async function recalculateWeeklyScore(
  userId: string,
  weekStart: string,
): Promise<void> {
  const { error } = await db.rpc('recalculate_weekly_fitness_score', {
    p_user_id:    userId,
    p_week_start: weekStart,
  });
  if (error) throw error;
}
