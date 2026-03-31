import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Lock } from 'lucide-react';
import { BadgeIcon } from './BadgeIcon';
import { RarityChip } from './RarityChip';
import { getRarityStyle } from '@/config/rarityConfig';
import type { BadgeCatalogEntry } from '@/types/gamification';

interface BadgeDetailModalProps {
  badge: BadgeCatalogEntry | null;
  unlockedAt: string | null; // ISO string if unlocked, null if locked
  open: boolean;
  onClose: () => void;
}

export function BadgeDetailModal({ badge, unlockedAt, open, onClose }: BadgeDetailModalProps) {
  if (!badge) return null;

  const unlocked = unlockedAt !== null;
  const style    = getRarityStyle(badge.rarity);

  const formattedDate = unlockedAt
    ? new Date(unlockedAt).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent
        className="max-w-xs w-[92vw] rounded-2xl border p-0 overflow-hidden"
        style={{ borderColor: unlocked ? style.border : 'hsl(var(--border))' }}
      >
        {/* Top accent strip */}
        <div
          className="h-1 w-full"
          style={{
            background: unlocked
              ? `linear-gradient(90deg, transparent, ${style.color}, transparent)`
              : 'hsl(var(--muted))',
          }}
        />

        <div className="px-6 pt-5 pb-6 flex flex-col items-center gap-4 text-center">
          {/* Badge icon with glow */}
          <div className="relative flex items-center justify-center mt-1">
            {/* Outer glow ring — only when unlocked */}
            {unlocked && (
              <div
                className="absolute inset-0 rounded-full animate-pulse"
                style={{
                  boxShadow: style.glow,
                  borderRadius: '50%',
                }}
              />
            )}
            <BadgeIcon
              iconName={badge.iconName}
              rarity={badge.rarity}
              unlocked={unlocked}
              size={80}
              iconClass="w-9 h-9"
              glow={unlocked}
            />
          </div>

          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-bold leading-tight">
              {badge.name}
            </DialogTitle>
          </DialogHeader>

          <RarityChip rarity={badge.rarity} />

          {/* Status badge */}
          <div
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full"
            style={{
              backgroundColor: unlocked ? `${style.color}18` : 'hsl(var(--muted))',
              color: unlocked ? style.color : 'hsl(var(--muted-foreground))',
            }}
          >
            {unlocked
              ? <><CheckCircle2 className="w-3.5 h-3.5" /> Unlocked</>
              : <><Lock className="w-3.5 h-3.5" /> Locked</>
            }
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {badge.description}
          </p>

          {/* Unlock date */}
          {unlocked && formattedDate && (
            <p className="text-[11px] text-muted-foreground/60">
              Earned on {formattedDate}
            </p>
          )}

          {/* Title unlock note */}
          {unlocked && badge.unlocksTitle && (
            <div
              className="w-full rounded-xl px-3 py-2 text-[11px] text-center"
              style={{
                backgroundColor: `${style.color}10`,
                color: style.color,
                border: `1px solid ${style.border}`,
              }}
            >
              Unlocks profile title: <span className="font-semibold">"{badge.unlocksTitle}"</span>
            </div>
          )}

          <Button
            className="w-full mt-1 rounded-xl font-semibold"
            variant={unlocked ? 'default' : 'outline'}
            onClick={onClose}
          >
            {unlocked ? 'Got it' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
