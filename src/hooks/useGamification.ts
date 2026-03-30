import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getLevelProgress } from '@/lib/levelHelpers';
import { BADGE_CATALOG } from '@/config/badgeCatalog';
import type { GamificationState, UserBadge, WeeklyFitnessScore } from '@/types/gamification';

// NOTE: user_gamification, user_badges, weekly_fitness_scores are new tables
// not yet in the generated types. Cast supabase as `any` here until you run:
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
  weeklyFitnessScore: null,
  unlockedBadges: [],
  activeProfileTitle: null,
  isLoading: false,
};

export function useGamification(): GamificationState {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['gamification', user?.id],
    queryFn: async () => {
      const userId = user!.id;

      const [gamResult, badgesResult, scoreResult] = await Promise.all([
        db
          .from('user_gamification')
          .select('total_xp, current_streak, longest_streak, active_profile_title')
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
      ]);

      return {
        gam: gamResult.data as {
          total_xp: number;
          current_streak: number;
          active_profile_title: string | null;
        } | null,
        badges: (badgesResult.data ?? []) as { badge_id: string; unlocked_at: string }[],
        weeklyScore: scoreResult.data as {
          total_score: number;
          nutrition_score: number;
          training_score: number;
          activity_score: number;
          consistency_score: number;
          week_start: string;
          week_end: string;
        } | null,
      };
    },
    enabled: !!user?.id,
  });

  if (!user?.id) return EMPTY_STATE;
  if (query.isLoading) return { ...EMPTY_STATE, isLoading: true };
  if (!query.data) return EMPTY_STATE;

  const { gam, badges, weeklyScore } = query.data;

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

  return {
    totalXp,
    levelProgress: getLevelProgress(totalXp),
    currentStreak: gam?.current_streak ?? 0,
    weeklyFitnessScore,
    unlockedBadges,
    activeProfileTitle: resolveActiveTitle(unlockedBadges, gam?.active_profile_title ?? null),
    isLoading: false,
  };
}
