import { Flame, Snowflake } from 'lucide-react';
import { StatsCard } from '@/components/StatsCard';

interface StreakCardProps {
  streak: number;
  frozen?: boolean;
}

export function StreakCard({ streak, frozen = false }: StreakCardProps) {
  return (
    <StatsCard
      className={`flex flex-col gap-1 transition-all duration-300 ${
        frozen ? 'ring-2 ring-blue-400/60 shadow-[0_0_12px_2px_rgba(96,165,250,0.25)]' : ''
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {frozen ? (
          <Snowflake className="w-4 h-4 text-blue-400 animate-pulse" />
        ) : (
          <Flame className="w-4 h-4 text-orange-400" />
        )}
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Streak
        </span>
        {frozen && (
          <span className="ml-auto text-[10px] font-semibold text-blue-400 uppercase tracking-wide">
            Frozen
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={`text-4xl font-bold leading-none tabular-nums transition-colors duration-300 ${
            frozen ? 'text-blue-300' : 'text-foreground'
          }`}
        >
          {streak}
        </span>
        <span className="text-sm text-muted-foreground">days</span>
      </div>
    </StatsCard>
  );
}
