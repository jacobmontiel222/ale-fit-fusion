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

/**
 * Calls the `recalculate_weekly_fitness_score` Supabase RPC for the given
 * user and week.  The function computes the score from raw activity data,
 * upserts the result into `weekly_fitness_scores`, and automatically fires
 * the `on_track` badge trigger if total_score >= 60.
 *
 * Throws on network / RPC errors so the caller can decide whether to surface
 * them.  In most cases callers should swallow the error (non-critical path).
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
