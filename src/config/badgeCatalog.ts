import type { BadgeCatalogEntry } from '@/types/gamification';
import { XP_BY_RARITY } from './xpRules';

export const BADGE_CATALOG: BadgeCatalogEntry[] = [
  // ── Milestones ──────────────────────────────────────────────────────────
  {
    id: 'first_spark',
    name: 'First Spark',
    description: 'Log your first entry in the app.',
    category: 'milestone',
    rarity: 'common',
    xpReward: XP_BY_RARITY.common,
    iconName: 'Zap',
  },

  // ── Streaks ─────────────────────────────────────────────────────────────
  {
    id: 'on_track',
    name: 'On Track',
    description: 'Achieve a weekly fitness score of 60 or above.',
    category: 'streak',
    rarity: 'common',
    xpReward: XP_BY_RARITY.common,
    iconName: 'TrendingUp',
  },
  {
    id: 'locked_in',
    name: 'Locked In',
    description: 'Maintain a 7-day streak.',
    category: 'streak',
    rarity: 'rare',
    xpReward: XP_BY_RARITY.rare,
    unlocksTitle: 'Locked-In',
    iconName: 'Lock',
  },
  {
    id: 'unbreakable',
    name: 'Unbreakable',
    description: 'Maintain a 30-day streak.',
    category: 'streak',
    rarity: 'epic',
    xpReward: XP_BY_RARITY.epic,
    iconName: 'Shield',
  },
  {
    id: 'quarter_beast',
    name: 'Quarter Beast',
    description: 'Maintain a 90-day streak.',
    category: 'streak',
    rarity: 'legendary',
    xpReward: XP_BY_RARITY.legendary,
    unlocksTitle: 'The Unstoppable',
    iconName: 'Crown',
  },

  // ── Nutrition ────────────────────────────────────────────────────────────
  {
    id: 'meal_logger_i',
    name: 'Meal Logger I',
    description: 'Log meals for 7 consecutive days.',
    category: 'nutrition',
    rarity: 'common',
    xpReward: XP_BY_RARITY.common,
    iconName: 'UtensilsCrossed',
  },
  {
    id: 'meal_logger_ii',
    name: 'Meal Logger II',
    description: 'Log meals for 30 consecutive days.',
    category: 'nutrition',
    rarity: 'rare',
    xpReward: XP_BY_RARITY.rare,
    unlocksTitle: 'Food Tracker',
    iconName: 'BookOpen',
  },
  {
    id: 'macro_aware',
    name: 'Macro Aware',
    description: 'Hit your macro goals for 3 consecutive days.',
    category: 'nutrition',
    rarity: 'common',
    xpReward: XP_BY_RARITY.common,
    iconName: 'Target',
  },
  {
    id: 'macro_locked',
    name: 'Macro Locked',
    description: 'Hit your macro goals for 14 consecutive days.',
    category: 'nutrition',
    rarity: 'rare',
    xpReward: XP_BY_RARITY.rare,
    unlocksTitle: 'Macro Master',
    iconName: 'CheckCircle2',
  },
  {
    id: 'hydrated',
    name: 'Hydrated',
    description: 'Hit your water goal for 7 consecutive days.',
    category: 'nutrition',
    rarity: 'common',
    xpReward: XP_BY_RARITY.common,
    iconName: 'Droplets',
  },

  // ── Training ─────────────────────────────────────────────────────────────
  {
    id: 'training_logged',
    name: 'Training Logged',
    description: 'Complete your first workout session.',
    category: 'training',
    rarity: 'common',
    xpReward: XP_BY_RARITY.common,
    iconName: 'Dumbbell',
  },
  {
    id: 'iron_routine',
    name: 'Iron Routine',
    description: 'Complete 12 workout sessions in a single month.',
    category: 'training',
    rarity: 'rare',
    xpReward: XP_BY_RARITY.rare,
    unlocksTitle: 'Iron Routine',
    iconName: 'Repeat',
  },

  // ── Activity ─────────────────────────────────────────────────────────────
  {
    id: 'step_builder',
    name: 'Step Builder',
    description: 'Hit your daily step goal 5 days in a week.',
    category: 'activity',
    rarity: 'common',
    xpReward: XP_BY_RARITY.common,
    iconName: 'Footprints',
  },

  // ── Consistency ──────────────────────────────────────────────────────────
  {
    id: 'consistency_core_i',
    name: 'Consistency Core I',
    description: 'Log food, workouts, and weight for 2 consecutive weeks.',
    category: 'consistency',
    rarity: 'rare',
    xpReward: XP_BY_RARITY.rare,
    unlocksTitle: 'System Builder',
    iconName: 'ClipboardCheck',
  },
  {
    id: 'consistency_core_ii',
    name: 'Consistency Core II',
    description: 'Log food, workouts, and weight for 2 consecutive months.',
    category: 'consistency',
    rarity: 'epic',
    xpReward: XP_BY_RARITY.epic,
    unlocksTitle: 'Allrounder',
    iconName: 'Star',
  },
];

export function getBadgeById(id: string): BadgeCatalogEntry | undefined {
  return BADGE_CATALOG.find(b => b.id === id);
}
