import type { BadgeRarity } from '@/types/gamification';

/** XP granted when a badge is earned, by rarity tier. */
export const XP_BY_RARITY: Record<BadgeRarity, number> = {
  common:    100,
  rare:      250,
  epic:      600,
  legendary: 1500,
};

export interface ScoreXpBand {
  minScore: number;
  maxScore: number;
  xp: number;
}

/** XP granted at the end of a week based on the weekly fitness score. */
export const WEEKLY_SCORE_XP_BANDS: ScoreXpBand[] = [
  { minScore: 0,  maxScore: 49,  xp: 0   },
  { minScore: 50, maxScore: 59,  xp: 40  },
  { minScore: 60, maxScore: 69,  xp: 70  },
  { minScore: 70, maxScore: 79,  xp: 110 },
  { minScore: 80, maxScore: 89,  xp: 160 },
  { minScore: 90, maxScore: 100, xp: 220 },
];

export function getXpForWeeklyScore(score: number): number {
  const band = WEEKLY_SCORE_XP_BANDS.find(b => score >= b.minScore && score <= b.maxScore);
  return band?.xp ?? 0;
}
