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

export interface FitnessScoreBreakdown {
  nutrition: number;   // 0–100
  training: number;    // 0–100
  activity: number;    // 0–100
  consistency: number; // 0–100
}

export interface WeeklyFitnessScore {
  total: number; // 0–100 weighted composite
  breakdown: FitnessScoreBreakdown;
  weekStart: string; // ISO date
  weekEnd: string;   // ISO date
}

export interface GamificationState {
  totalXp: number;
  levelProgress: LevelProgress;
  currentStreak: number;
  weeklyFitnessScore: WeeklyFitnessScore | null;
  unlockedBadges: UserBadge[];
  activeProfileTitle: string | null;
  isLoading: boolean;
}
