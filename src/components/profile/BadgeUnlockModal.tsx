import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BadgeIcon } from './BadgeIcon';
import { RarityChip } from './RarityChip';
import { getRarityStyle } from '@/config/rarityConfig';
import type { BadgeCatalogEntry } from '@/types/gamification';
import { cn } from '@/lib/utils';

interface BadgeUnlockModalProps {
  badge: BadgeCatalogEntry | null;
  open: boolean;
  onClose: () => void;
}

export function BadgeUnlockModal({ badge, open, onClose }: BadgeUnlockModalProps) {
  const [animState, setAnimState] = useState<'hidden' | 'entering' | 'visible' | 'leaving'>('hidden');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drive the animation state machine
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (open && badge) {
      setAnimState('entering');
      timerRef.current = setTimeout(() => setAnimState('visible'), 30);
    } else {
      setAnimState('leaving');
      timerRef.current = setTimeout(() => setAnimState('hidden'), 350);
    }

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [open, badge]);

  if (animState === 'hidden' || !badge) return null;

  const style   = getRarityStyle(badge.rarity);
  const visible = animState === 'visible';

  return (
    /* ── Backdrop ─────────────────────────────────────────────────────────── */
    <div
      className={cn(
        'fixed inset-0 z-[200] flex items-center justify-center px-5',
        'transition-all duration-300 ease-out',
      )}
      style={{
        backgroundColor: visible ? 'rgba(0,0,0,0.78)' : 'rgba(0,0,0,0)',
        backdropFilter:  visible ? 'blur(6px)' : 'blur(0px)',
      }}
      onClick={onClose}
    >
      {/* ── Card ─────────────────────────────────────────────────────────── */}
      <div
        className="relative w-full max-w-xs rounded-2xl overflow-hidden flex flex-col items-center text-center"
        style={{
          background:   'hsl(var(--card))',
          border:       `1px solid ${style.border}`,
          boxShadow:    `0 24px 60px rgba(0,0,0,0.45), ${style.glow}`,
          transform:    visible ? 'scale(1) translateY(0)' : 'scale(0.88) translateY(24px)',
          opacity:      visible ? 1 : 0,
          transition:   'transform 0.45s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top gradient strip */}
        <div
          className="h-1 w-full flex-shrink-0"
          style={{
            background: `linear-gradient(90deg, transparent, ${style.color}, transparent)`,
          }}
        />

        <div className="px-6 pt-6 pb-7 flex flex-col items-center gap-4 w-full">

          {/* "Badge Unlocked" label */}
          <span
            className="text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ color: style.color }}
          >
            Badge Unlocked
          </span>

          {/* Badge icon with spinning ring + glow */}
          <div className="relative flex items-center justify-center my-2">
            {/* Spinning gradient ring */}
            <div
              className="absolute rounded-full"
              style={{
                width:      104,
                height:     104,
                background: style.gradient,
                animation:  'spin 4s linear infinite',
                opacity:    visible ? 0.8 : 0,
                transition: 'opacity 0.4s ease 0.2s',
              }}
            />
            {/* Static glow ring */}
            <div
              className="absolute rounded-full"
              style={{
                width:     96,
                height:    96,
                boxShadow: style.glow,
                borderRadius: '50%',
              }}
            />
            {/* Solid inner mask to hide the spin behind the icon */}
            <div
              className="absolute rounded-full"
              style={{
                width:           88,
                height:          88,
                backgroundColor: 'hsl(var(--card))',
              }}
            />
            <BadgeIcon
              iconName={badge.iconName}
              rarity={badge.rarity}
              unlocked
              size={76}
              iconClass="w-8 h-8"
              glow
            />
          </div>

          {/* Badge name */}
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">{badge.name}</h2>
            <RarityChip rarity={badge.rarity} />
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed max-w-[230px]">
            {badge.description}
          </p>

          {/* Title unlock note */}
          {badge.unlocksTitle && (
            <div
              className="w-full rounded-xl px-3 py-2 text-[11px]"
              style={{
                backgroundColor: `${style.color}10`,
                color:           style.color,
                border:          `1px solid ${style.border}`,
              }}
            >
              Profile title unlocked: <span className="font-semibold">"{badge.unlocksTitle}"</span>
            </div>
          )}

          <Button
            className="w-full rounded-xl font-semibold text-sm mt-1"
            style={{
              background:   `linear-gradient(135deg, ${style.color}cc, ${style.color})`,
              color:        '#fff',
              border:       'none',
              boxShadow:    `0 4px 16px ${style.color}44`,
            }}
            onClick={onClose}
          >
            Awesome
          </Button>
        </div>
      </div>

      {/* Spin keyframe injected inline so it doesn't need a Tailwind plugin */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
