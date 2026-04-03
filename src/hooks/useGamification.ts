import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getLevelProgress } from '@/lib/levelHelpers';
import { BADGE_CATALOG } from '@/config/badgeCatalog';
import { getTodayISO } from '@/lib/weeklyScore';
import type {
  GamificationState,
  UserBadge,
  WeeklyFitnessScore,
  DailyFitnessScore,
} from '@/types/gamification';

// NOTE: user_gamification, user_badges, weekly_fitness_scores,
// daily_fitness_scores are newer tables not yet in the generated types.
// Cast supabase as `any` until types are regenerated:
//   supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
const db = supabase as any;

// ─────────────────────────────────────────────────────────────────────────────

function resolveActiveTitle(unlockedBadges: UserBadge[], explicit: string | null): string | null {
  if (explicit) return explicit;
  return unlockedBadges
    .map(ub => ({ ...ub, entry: BADGE_CATALOG.find(b => b.id === ub.badgeId) }))
    .filter(ub => ub.entry?.unlocksTitle)
    .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
    [0]?.entry?.unlocksTitle ?? null;
}

const EMPTY_STATE: GamificationState = {
  totalXp: 0,
  levelProgress: getLevelProgress(0),
  currentStreak: 0,
  freezeAvailable: false,
  dailyFitnessScore: null,
  weeklyFitnessScore: null,
  unlockedBadges: [],
  activeProfileTitle: null,
  isLoading: false,
};

export function useGamification(): GamificationState {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── Real-time subscriptions ───────────────────────────────────────────────
  // daily_fitness_scores: DB triggers update this on every activity change.
  // weekly_fitness_scores: updated after recalculate_weekly_fitness_score runs.
  // Both invalidate the same query so the UI always reflects latest data.
  useEffect(() => {
    if (!user?.id) return;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['gamification', user.id] });
    };

    const channel = supabase
      .channel(`fitness-score-${user.id}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'daily_fitness_scores',  filter: `user_id=eq.${user.id}` },
        invalidate,
      )
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'weekly_fitness_scores', filter: `user_id=eq.${user.id}` },
        invalidate,
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  // ── Data query ─────────────────────────────────────────────────────────────
  const query = useQuery({
    queryKey: ['gamification', user?.id],
    queryFn: async () => {
      const userId = user!.id;
      const today  = getTodayISO();

      const [gamResult, badgesResult, weeklyResult, dailyResult] = await Promise.all([
        db
          .from('user_gamification')
          .select('total_xp, current_streak, longest_streak, active_profile_title, freeze_available')
          .eq('user_id', userId)
          .single(),

        db
          .from('user_badges')
          .select('badge_id, unlocked_at')
          .eq('user_id', userId)
          .order('unlocked_at', { ascending: false }),

        db
          .from('weekly_fitness_scores')
          .select('total_score, nutrition_score, training_score, activity_score, consistency_score, week_start, week_end')
          .eq('user_id', userId)
          .order('week_start', { ascending: false })
          .limit(1)
          .maybeSingle(),

        db
          .from('daily_fitness_scores')
          .select(
            'date, final_score, calorie_subscore, protein_subscore, nutrition_subscore, ' +
            'training_subscore, steps_subscore, consistency_subscore, ' +
            'has_food_log, has_workout_log, has_weight_log, has_water_log, has_steps_log',
          )
          .eq('user_id', userId)
          .eq('date', today)
          .maybeSingle(),
      ]);

      return {
        gam: gamResult.data as {
          total_xp: number;
          current_streak: number;
          freeze_available: boolean;
          active_profile_title: string | null;
        } | null,

        badges: (badgesResult.data ?? []) as { badge_id: string; unlocked_at: string }[],

        weeklyScore: weeklyResult.data as {
          total_score: number;
          nutrition_score: number;
          training_score: number;
          activity_score: number;
          consistency_score: number;
          week_start: string;
          week_end: string;
        } | null,

        dailyScore: dailyResult.data as {
          date: string;
          final_score: number;
          calorie_subscore: number;
          protein_subscore: number;
          nutrition_subscore: number;
          training_subscore: number;
          steps_subscore: number;
          consistency_subscore: number;
          has_food_log: boolean;
          has_workout_log: boolean;
          has_weight_log: boolean;
          has_water_log: boolean;
          has_steps_log: boolean;
        } | null,
      };
    },
    enabled: !!user?.id,
  });

  if (!user?.id)       return EMPTY_STATE;
  if (query.isLoading) return { ...EMPTY_STATE, isLoading: true };
  if (!query.data)     return EMPTY_STATE;

  const { gam, badges, weeklyScore, dailyScore } = query.data;

  const totalXp = gam?.total_xp ?? 0;

  const unlockedBadges: UserBadge[] = badges.map(b => ({
    badgeId: b.badge_id,
    unlockedAt: b.unlocked_at,
  }));

  const weeklyFitnessScore: WeeklyFitnessScore | null = weeklyScore
    ? {
        total: weeklyScore.total_score,
        breakdown: {
          nutrition:   weeklyScore.nutrition_score,
          training:    weeklyScore.training_score,
          activity:    weeklyScore.activity_score,
          consistency: weeklyScore.consistency_score,
        },
        weekStart: weeklyScore.week_start,
        weekEnd:   weeklyScore.week_end,
      }
    : null;

  const dailyFitnessScore: DailyFitnessScore | null = dailyScore
    ? {
        date:                dailyScore.date,
        finalScore:          dailyScore.final_score,
        calorieSubscore:     dailyScore.calorie_subscore,
        proteinSubscore:     dailyScore.protein_subscore,
        nutritionSubscore:   dailyScore.nutrition_subscore,
        trainingSubscore:    dailyScore.training_subscore,
        stepsSubscore:       dailyScore.steps_subscore,
        consistencySubscore: dailyScore.consistency_subscore,
        hasFoodLog:          dailyScore.has_food_log,
        hasWorkoutLog:       dailyScore.has_workout_log,
        hasWeightLog:        dailyScore.has_weight_log,
        hasWaterLog:         dailyScore.has_water_log,
        hasStepsLog:         dailyScore.has_steps_log,
      }
    : null;

  return {
    totalXp,
    levelProgress: getLevelProgress(totalXp),
    currentStreak: gam?.current_streak ?? 0,
    freezeAvailable: gam?.freeze_available ?? false,
    dailyFitnessScore,
    weeklyFitnessScore,
    unlockedBadges,
    activeProfileTitle: resolveActiveTitle(unlockedBadges, gam?.active_profile_title ?? null),
    isLoading: false,
  };
}
