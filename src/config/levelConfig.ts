import type { LevelEntry } from '@/types/gamification';

/**
 * Level XP thresholds.
 * Formula: Math.round(150 * level^1.5)
 *
 * Verified against spec:
 *   L1  = 150   L2  = 424   L3  = 779   L4  = 1200
 *   L5  = 1677  L10 = 4743
 */
function generateLevelTable(maxLevel: number): LevelEntry[] {
  return Array.from({ length: maxLevel }, (_, i) => {
    const level = i + 1;
    return { level, totalXpRequired: Math.round(150 * Math.pow(level, 1.5)) };
  });
}

export const MAX_LEVEL = 50;
export const LEVEL_TABLE: LevelEntry[] = generateLevelTable(MAX_LEVEL);
