import {
  Zap, TrendingUp, Lock, Shield, Crown,
  UtensilsCrossed, BookOpen, Target, CheckCircle2,
  Droplets, Dumbbell, Repeat, Footprints,
  ClipboardCheck, Star, LucideIcon,
} from 'lucide-react';
import { StatsCard } from '@/components/StatsCard';
import { BADGE_CATALOG } from '@/config/badgeCatalog';
import type { UserBadge, BadgeRarity } from '@/types/gamification';

// Icon registry – maps iconName strings to Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  Zap, TrendingUp, Lock, Shield, Crown,
  UtensilsCrossed, BookOpen, Target, CheckCircle2,
  Droplets, Dumbbell, Repeat, Footprints,
  ClipboardCheck, Star,
};

const RARITY_COLORS: Record<BadgeRarity, string> = {
  common:    'hsl(var(--muted-foreground))',
  rare:      '#3b82f6',
  epic:      '#a855f7',
  legendary: '#f59e0b',
};

const RARITY_BG: Record<BadgeRarity, string> = {
  common:    'hsl(var(--muted)/0.6)',
  rare:      'rgba(59,130,246,0.15)',
  epic:      'rgba(168,85,247,0.15)',
  legendary: 'rgba(245,158,11,0.15)',
};

interface BadgesSectionProps {
  unlockedBadges: UserBadge[];
}

export function BadgesSection({ unlockedBadges }: BadgesSectionProps) {
  const unlockedIds = new Set(unlockedBadges.map(b => b.badgeId));

  return (
    <StatsCard>
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-4">
        Badges
      </span>

      <div className="grid grid-cols-4 gap-3">
        {BADGE_CATALOG.map(badge => {
          const Icon = ICON_MAP[badge.iconName] ?? Zap;
          const unlocked = unlockedIds.has(badge.id);
          const iconColor = unlocked ? RARITY_COLORS[badge.rarity] : 'hsl(var(--muted-foreground)/0.3)';
          const bgColor   = unlocked ? RARITY_BG[badge.rarity]    : 'hsl(var(--muted)/0.3)';

          return (
            <div key={badge.id} className="flex flex-col items-center gap-1.5">
              {/* Badge circle */}
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center relative transition-opacity"
                style={{ backgroundColor: bgColor, opacity: unlocked ? 1 : 0.45 }}
              >
                <Icon className="w-5 h-5" style={{ color: iconColor }} strokeWidth={1.8} />
                {/* Rarity dot */}
                {unlocked && (
                  <span
                    className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-card"
                    style={{ backgroundColor: RARITY_COLORS[badge.rarity] }}
                  />
                )}
              </div>
              {/* Badge name */}
              <span
                className="text-[9px] font-medium text-center leading-tight line-clamp-2"
                style={{ color: unlocked ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground)/0.4)' }}
              >
                {badge.name}
              </span>
            </div>
          );
        })}
      </div>
    </StatsCard>
  );
}
