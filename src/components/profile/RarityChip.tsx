import { cn } from '@/lib/utils';
import { getRarityStyle } from '@/config/rarityConfig';
import type { BadgeRarity } from '@/types/gamification';

interface RarityChipProps {
  rarity: BadgeRarity;
  className?: string;
}

export function RarityChip({ rarity, className }: RarityChipProps) {
  const style = getRarityStyle(rarity);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
        style.chipBgClass,
        style.textClass,
        className,
      )}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: style.color }}
      />
      {style.label}
    </span>
  );
}
