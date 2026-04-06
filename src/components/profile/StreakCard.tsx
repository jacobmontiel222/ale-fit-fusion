import { Flame, Snowflake } from 'lucide-react';
import { StatsCard } from '@/components/StatsCard';

interface StreakCardProps {
  streak: number;
  /** Freezes stored but not in use (0–3). Shown as snowflake badges. */
  freezeCount: number;
  /** True when a freeze was consumed yesterday — streak actively protected. */
  isStreakFrozen: boolean;
}

export function StreakCard({ streak, freezeCount, isStreakFrozen }: StreakCardProps) {
  const hasStored = !isStreakFrozen && freezeCount > 0;

  return (
    <StatsCard
      className={`flex flex-col gap-1 transition-all duration-300 ${
        isStreakFrozen
          ? 'ring-2 ring-blue-400/60 shadow-[0_0_12px_2px_rgba(96,165,250,0.25)]'
          : hasStored
          ? 'ring-1 ring-blue-300/30'
          : ''
      }`}
    >
      {/* ── Header row ── */}
      <div className="flex items-center gap-1.5 mb-1">
        {isStreakFrozen ? (
          <Snowflake className="w-4 h-4 text-blue-400 animate-pulse" />
        ) : (
          <Flame className="w-4 h-4 text-orange-400" />
        )}

        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Streak
        </span>

        {/* Active frozen label */}
        {isStreakFrozen && (
          <span className="ml-auto text-[10px] font-semibold text-blue-400 uppercase tracking-wide">
            Frozen
          </span>
        )}

        {/* Stored freeze badges (1–3 snowflake icons) */}
        {hasStored && (
          <div className="ml-auto flex items-center gap-0.5">
            {Array.from({ length: freezeCount }).map((_, i) => (
              <Snowflake key={i} className="w-3 h-3 text-blue-300/80" />
            ))}
          </div>
        )}
      </div>

      {/* ── Streak number ── */}
      <div className="flex items-baseline gap-1.5">
        <span
          className={`text-4xl font-bold leading-none tabular-nums transition-colors duration-300 ${
            isStreakFrozen ? 'text-blue-300' : 'text-foreground'
          }`}
        >
          {streak}
        </span>
        <span className="text-sm text-muted-foreground">days</span>
      </div>

      {/* ── Stored freeze hint ── */}
      {hasStored && (
        <p className="text-[10px] text-blue-300/70 mt-0.5 leading-tight">
          {freezeCount === 1 ? '1 freeze saved' : `${freezeCount} freezes saved`}
        </p>
      )}
    </StatsCard>
  );
}
