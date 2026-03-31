import {
  Zap, TrendingUp, Lock, Shield, Crown,
  UtensilsCrossed, BookOpen, Target, CheckCircle2,
  Droplets, Dumbbell, Repeat, Footprints,
  ClipboardCheck, Star, LucideIcon,
} from 'lucide-react';
import { getRarityStyle } from '@/config/rarityConfig';
import type { BadgeRarity } from '@/types/gamification';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, LucideIcon> = {
  Zap, TrendingUp, Lock, Shield, Crown,
  UtensilsCrossed, BookOpen, Target, CheckCircle2,
  Droplets, Dumbbell, Repeat, Footprints,
  ClipboardCheck, Star,
};

interface BadgeIconProps {
  iconName: string;
  rarity: BadgeRarity;
  unlocked: boolean;
  /** Size of the outer circle in px — defaults to 48 */
  size?: number;
  /** Icon size class — defaults to w-5 h-5 */
  iconClass?: string;
  /** Extra className on the outer div */
  className?: string;
  /** Show animated glow ring (used in modals) */
  glow?: boolean;
}

export function BadgeIcon({
  iconName,
  rarity,
  unlocked,
  size = 48,
  iconClass = 'w-5 h-5',
  className,
  glow = false,
}: BadgeIconProps) {
  const Icon  = ICON_MAP[iconName] ?? Zap;
  const style = getRarityStyle(rarity);

  const bg          = unlocked ? style.bg          : 'rgba(148,163,184,0.08)';
  const iconColor   = unlocked ? style.color        : 'hsl(215 14% 35%)';
  const borderColor = unlocked ? style.border       : 'transparent';
  const boxShadow   = unlocked && glow ? style.glow : 'none';

  return (
    <div
      className={cn('relative flex items-center justify-center rounded-full flex-shrink-0', className)}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        border: `1.5px solid ${borderColor}`,
        boxShadow,
        opacity: unlocked ? 1 : 0.4,
        transition: 'box-shadow 0.3s ease',
      }}
    >
      <Icon className={iconClass} style={{ color: iconColor }} strokeWidth={1.8} />

      {/* Rarity dot — shown only when unlocked and not in glow mode */}
      {unlocked && !glow && (
        <span
          className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-card"
          style={{ backgroundColor: style.color }}
        />
      )}
    </div>
  );
}
