import { LEVEL_TABLE, MAX_LEVEL } from '@/config/levelConfig';
import type { LevelEntry, LevelProgress } from '@/types/gamification';

/** Returns the highest level the user has reached for their total XP. */
export function getCurrentLevel(totalXp: number): LevelEntry {
  let current = LEVEL_TABLE[0];
  for (const entry of LEVEL_TABLE) {
    if (totalXp >= entry.totalXpRequired) {
      current = entry;
    } else {
      break;
    }
  }
  return current;
}

/** Returns the next level entry, or null if the user is at max level. */
export function getNextLevel(totalXp: number): LevelEntry | null {
  const current = getCurrentLevel(totalXp);
  if (current.level >= MAX_LEVEL) return null;
  return LEVEL_TABLE.find(e => e.level === current.level + 1) ?? null;
}

/** Returns a full progress object including progress percent to the next level. */
export function getLevelProgress(totalXp: number): LevelProgress {
  const current = getCurrentLevel(totalXp);
  const next = getNextLevel(totalXp);

  if (!next) {
    return {
      currentLevel: current.level,
      totalXp,
      xpInCurrentLevel: totalXp - current.totalXpRequired,
      xpToNextLevel: 0,
      progressPercent: 100,
      isMaxLevel: true,
    };
  }

  const xpInCurrentLevel = totalXp - current.totalXpRequired;
  const xpSpanToNext = next.totalXpRequired - current.totalXpRequired;
  const progressPercent = Math.min(100, Math.round((xpInCurrentLevel / xpSpanToNext) * 100));

  return {
    currentLevel: current.level,
    totalXp,
    xpInCurrentLevel,
    xpToNextLevel: next.totalXpRequired - totalXp,
    progressPercent,
    isMaxLevel: false,
  };
}
