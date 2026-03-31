import type { BadgeRarity } from '@/types/gamification';

export interface RarityStyle {
  /** Display label */
  label: string;
  /** Main accent color (icon, dot, chip text) */
  color: string;
  /** Subtle background for badge circles */
  bg: string;
  /** Border color for modals / cards */
  border: string;
  /** Box-shadow glow string */
  glow: string;
  /** CSS gradient for the unlock modal ring */
  gradient: string;
  /** Tailwind text-color class used in RarityChip */
  textClass: string;
  /** Tailwind bg class used in RarityChip */
  chipBgClass: string;
}

export const RARITY_CONFIG: Record<BadgeRarity, RarityStyle> = {
  common: {
    label:       'Common',
    color:       'hsl(215 14% 60%)',           // cool slate
    bg:          'rgba(148,163,184,0.12)',
    border:      'rgba(148,163,184,0.35)',
    glow:        '0 0 24px 6px rgba(148,163,184,0.18)',
    gradient:    'conic-gradient(from 0deg, rgba(148,163,184,0.5), rgba(148,163,184,0.08), rgba(148,163,184,0.5))',
    textClass:   'text-slate-400',
    chipBgClass: 'bg-slate-400/10',
  },
  rare: {
    label:       'Rare',
    color:       '#60a5fa',                    // blue-400
    bg:          'rgba(96,165,250,0.12)',
    border:      'rgba(96,165,250,0.40)',
    glow:        '0 0 28px 8px rgba(96,165,250,0.25)',
    gradient:    'conic-gradient(from 0deg, rgba(96,165,250,0.7), rgba(96,165,250,0.08), rgba(96,165,250,0.7))',
    textClass:   'text-blue-400',
    chipBgClass: 'bg-blue-400/10',
  },
  epic: {
    label:       'Epic',
    color:       '#c084fc',                    // purple-400
    bg:          'rgba(192,132,252,0.12)',
    border:      'rgba(192,132,252,0.45)',
    glow:        '0 0 32px 10px rgba(192,132,252,0.28)',
    gradient:    'conic-gradient(from 0deg, rgba(192,132,252,0.8), rgba(192,132,252,0.08), rgba(192,132,252,0.8))',
    textClass:   'text-purple-400',
    chipBgClass: 'bg-purple-400/10',
  },
  legendary: {
    label:       'Legendary',
    color:       '#fbbf24',                    // amber-400
    bg:          'rgba(251,191,36,0.12)',
    border:      'rgba(251,191,36,0.50)',
    glow:        '0 0 36px 12px rgba(251,191,36,0.30)',
    gradient:    'conic-gradient(from 0deg, rgba(251,191,36,0.9), rgba(251,191,36,0.08), rgba(251,191,36,0.9))',
    textClass:   'text-amber-400',
    chipBgClass: 'bg-amber-400/10',
  },
};

export function getRarityStyle(rarity: BadgeRarity): RarityStyle {
  return RARITY_CONFIG[rarity];
}
