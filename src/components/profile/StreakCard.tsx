import { Flame } from 'lucide-react';
import { StatsCard } from '@/components/StatsCard';

interface StreakCardProps {
  streak: number;
}

export function StreakCard({ streak }: StreakCardProps) {
  return (
    <StatsCard className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 mb-1">
        <Flame className="w-4 h-4 text-orange-400" />
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Streak
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-4xl font-bold text-foreground leading-none tabular-nums">
          {streak}
        </span>
        <span className="text-sm text-muted-foreground">days</span>
      </div>
    </StatsCard>
  );
}
