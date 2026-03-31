import { useState } from 'react';
import { StatsCard } from '@/components/StatsCard';
import { BADGE_CATALOG } from '@/config/badgeCatalog';
import { BadgeIcon } from './BadgeIcon';
import { BadgeDetailModal } from './BadgeDetailModal';
import type { UserBadge, BadgeCatalogEntry } from '@/types/gamification';

interface BadgesSectionProps {
  unlockedBadges: UserBadge[];
}

export function BadgesSection({ unlockedBadges }: BadgesSectionProps) {
  const [selected, setSelected] = useState<{
    badge: BadgeCatalogEntry;
    unlockedAt: string | null;
  } | null>(null);

  const unlockedMap = new Map(unlockedBadges.map(b => [b.badgeId, b.unlockedAt]));

  function handleBadgePress(badge: BadgeCatalogEntry) {
    const unlockedAt = unlockedMap.get(badge.id) ?? null;
    setSelected({ badge, unlockedAt });
  }

  return (
    <>
      <StatsCard>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-4">
          Badges
        </span>

        <div className="grid grid-cols-4 gap-3">
          {BADGE_CATALOG.map(badge => {
            const unlocked = unlockedMap.has(badge.id);

            return (
              <button
                key={badge.id}
                className="flex flex-col items-center gap-1.5 focus:outline-none active:scale-95 transition-transform"
                onClick={() => handleBadgePress(badge)}
                aria-label={badge.name}
              >
                <BadgeIcon
                  iconName={badge.iconName}
                  rarity={badge.rarity}
                  unlocked={unlocked}
                  size={48}
                  iconClass="w-5 h-5"
                />
                <span
                  className="text-[9px] font-medium text-center leading-tight line-clamp-2"
                  style={{
                    color: unlocked
                      ? 'hsl(var(--foreground))'
                      : 'hsl(var(--muted-foreground) / 0.4)',
                  }}
                >
                  {badge.name}
                </span>
              </button>
            );
          })}
        </div>
      </StatsCard>

      <BadgeDetailModal
        badge={selected?.badge ?? null}
        unlockedAt={selected?.unlockedAt ?? null}
        open={selected !== null}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
