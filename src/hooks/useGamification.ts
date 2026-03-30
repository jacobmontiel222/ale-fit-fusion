import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getLevelProgress } from '@/lib/levelHelpers';
import { BADGE_CATALOG } from '@/config/badgeCatalog';
import type { GamificationState, UserBadge, WeeklyFitnessScore } from '@/types/gamification';

// ─────────────────────────────────────────────────────────────────────────────
// Mock data layer – replace each section with a Supabase useQuery call once
// the backend tables are ready (see README / backend notes).
// ─────────────────────────────────────────────────────────────────────────────

interface RawGamificationData {
  totalXp: number;
  currentStreak: number;
  unlockedBadges: UserBadge[];
  weeklyFitnessScore: WeeklyFitnessScore;
  /** Explicitly set by the user, or null to fall back to auto-resolve. */
  activeProfileTitle: string | null;
}

function getMockData(): RawGamificationData {
  // TODO: replace with supabase query on user_gamification, user_badges,
  //       and weekly_fitness_scores tables.
  return {
    totalXp: 1420,
    currentStreak: 9,
    unlockedBadges: [
      { badgeId: 'first_spark',    unlockedAt: '2024-01-15' },
      { badgeId: 'meal_logger_i',  unlockedAt: '2024-01-22' },
      { badgeId: 'training_logged',unlockedAt: '2024-01-16' },
    ],
    weeklyFitnessScore: {
      total: 84,
      breakdown: { nutrition: 80, training: 81, activity: 86, consistency: 87 },
      weekStart: '2024-03-25',
      weekEnd:   '2024-03-31',
    },
    activeProfileTitle: null, // null → auto-resolve from unlocked badges
  };
}

/** Returns the most recently earned profile title from the user's unlocked badges. */
function resolveActiveTitle(unlockedBadges: UserBadge[]): string | null {
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

  return useMemo<GamificationState>(() => {
    if (!user?.id) return EMPTY_STATE;

    const raw = getMockData();
    const levelProgress = getLevelProgress(raw.totalXp);
    const activeProfileTitle =
      raw.activeProfileTitle ?? resolveActiveTitle(raw.unlockedBadges);

    return {
      totalXp: raw.totalXp,
      levelProgress,
      currentStreak: raw.currentStreak,
      weeklyFitnessScore: raw.weeklyFitnessScore,
      unlockedBadges: raw.unlockedBadges,
      activeProfileTitle,
      isLoading: false,
    };
  }, [user?.id]);
}
