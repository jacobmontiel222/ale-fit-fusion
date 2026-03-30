import { StatsCard } from '@/components/StatsCard';
import type { LevelProgress } from '@/types/gamification';

interface LevelCardProps {
  levelProgress: LevelProgress;
}

export function LevelCard({ levelProgress }: LevelCardProps) {
  const {
    currentLevel,
    totalXp,
    xpInCurrentLevel,
    xpToNextLevel,
    progressPercent,
    isMaxLevel,
  } = levelProgress;

  const nextLevelXp = xpInCurrentLevel + xpToNextLevel;

  return (
    <StatsCard className="border border-accent/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">
            Level
          </span>
          <span className="text-2xl font-bold text-foreground leading-none">
            {currentLevel}
          </span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {isMaxLevel ? 'MAX' : `${totalXp.toLocaleString()} XP`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-700 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex justify-between mt-2">
        <span className="text-xs text-muted-foreground tabular-nums">
          {xpInCurrentLevel.toLocaleString()} XP
        </span>
        {!isMaxLevel && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {nextLevelXp.toLocaleString()} XP
          </span>
        )}
      </div>
    </StatsCard>
  );
}
