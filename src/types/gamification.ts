export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type BadgeCategory = 'streak' | 'nutrition' | 'training' | 'activity' | 'consistency' | 'milestone';

export interface BadgeCatalogEntry {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  xpReward: number;
  /** Profile title unlocked when this badge is earned */
  unlocksTitle?: string;
  /** Lucide icon name */
  iconName: string;
}

export interface UserBadge {
  badgeId: string;
  unlockedAt: string; // ISO date string
}

export interface LevelEntry {
  level: number;
  totalXpRequired: number;
}

export interface LevelProgress {
  currentLevel: number;
  totalXp: number;
  xpInCurrentLevel: number;
  xpToNextLevel: number;
  progressPercent: number;
  isMaxLevel: boolean;
}

// ─── Daily Fitness Score ──────────────────────────────────────────────────────

export interface DailyFitnessScore {
  date: string;              // ISO date yyyy-mm-dd
  finalScore: number;        // 0–100
  calorieSubscore: number;   // 0–100
  proteinSubscore: number;   // 0–100
  nutritionSubscore: number; // 0–100  (combined)
  trainingSubscore: number;  // 0–100
  stepsSubscore: number;     // 0–100
  consistencySubscore: number; // 0–100
  hasFoodLog: boolean;
  hasWorkoutLog: boolean;
  hasWeightLog: boolean;
  hasWaterLog: boolean;
  hasStepsLog: boolean;
}

// ─── Weekly Fitness Score ─────────────────────────────────────────────────────

export interface FitnessScoreBreakdown {
  nutrition: number;   // 0–100 subscore
  training: number;    // 0–100 subscore
  activity: number;    // 0–100 subscore (steps)
  consistency: number; // 0–100 subscore
}

export interface WeeklyFitnessScore {
  total: number; // 0–100 average of daily final_scores
  breakdown: FitnessScoreBreakdown;
  weekStart: string; // ISO date
  weekEnd: string;   // ISO date
}

// ─── Gamification State ───────────────────────────────────────────────────────

export interface GamificationState {
  totalXp: number;
  levelProgress: LevelProgress;
  currentStreak: number;
  /** Number of stored freezes (0–3). Earned at every new multiple-of-7 streak. */
  freezeCount: number;
  /** True when a freeze was consumed yesterday — the streak is actively protected. */
  isStreakFrozen: boolean;
  dailyFitnessScore: DailyFitnessScore | null;
  weeklyFitnessScore: WeeklyFitnessScore | null;
  unlockedBadges: UserBadge[];
  activeProfileTitle: string | null;
  isLoading: boolean;
}
