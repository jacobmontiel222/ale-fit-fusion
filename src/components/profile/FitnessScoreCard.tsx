import { UtensilsCrossed, Dumbbell, Footprints, RotateCcw } from 'lucide-react';
import { StatsCard } from '@/components/StatsCard';
import { ProgressRing } from '@/components/ProgressRing';
import type { DailyFitnessScore, WeeklyFitnessScore } from '@/types/gamification';

interface FitnessScoreCardProps {
  dailyScore: DailyFitnessScore | null;
  weeklyScore: WeeklyFitnessScore | null;
}

function scoreColor(value: number): string {
  if (value >= 85) return 'hsl(var(--accent))';
  if (value >= 70) return '#84cc16';
  if (value >= 50) return '#f59e0b';
  return '#ef4444';
}

// Each row shows pts earned out of max.
// pts = subscore (0–100) * weight → nutrition 0–100 * 0.50 = 0–50 pts
const BREAKDOWN_ROWS = [
  {
    key: 'nutritionSubscore' as const,
    label: 'Nutrición',
    Icon: UtensilsCrossed,
    maxPts: 50,
    weight: 0.50,
  },
  {
    key: 'trainingSubscore' as const,
    label: 'Entrenamiento',
    Icon: Dumbbell,
    maxPts: 25,
    weight: 0.25,
  },
  {
    key: 'stepsSubscore' as const,
    label: 'Actividad',
    Icon: Footprints,
    maxPts: 15,
    weight: 0.15,
  },
  {
    key: 'consistencySubscore' as const,
    label: 'Consistencia',
    Icon: RotateCcw,
    maxPts: 10,
    weight: 0.10,
  },
];

export function FitnessScoreCard({ dailyScore, weeklyScore }: FitnessScoreCardProps) {
  const displayScore = dailyScore?.finalScore ?? 0;
  const mainColor = scoreColor(displayScore);

  return (
    <StatsCard>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Score de hoy
        </span>
        {weeklyScore != null && (
          <span className="text-xs text-muted-foreground">
            Semana:{' '}
            <span
              className="font-semibold"
              style={{ color: scoreColor(weeklyScore.total) }}
            >
              {weeklyScore.total}
            </span>
            /100
          </span>
        )}
      </div>

      {dailyScore ? (
        <div className="flex items-center gap-5">
          {/* Circular score ring */}
          <div className="shrink-0">
            <ProgressRing
              value={displayScore}
              max={100}
              size={88}
              strokeWidth={7}
              strokeColor={mainColor}
              label={
                <span className="text-xl font-bold" style={{ color: mainColor }}>
                  {displayScore}
                </span>
              }
            />
          </div>

          {/* Breakdown rows — show pts/max */}
          <div className="flex-1 space-y-2.5 min-w-0">
            {BREAKDOWN_ROWS.map(({ key, label, Icon, maxPts, weight }) => {
              const subscore = dailyScore[key];
              const pts = Math.round(subscore * weight);
              const color = scoreColor(subscore);
              return (
                <div key={key} className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground w-24 shrink-0 truncate">
                    {label}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${subscore}%`, backgroundColor: color }}
                    />
                  </div>
                  <span
                    className="text-xs font-semibold tabular-nums shrink-0 text-right"
                    style={{ color, minWidth: '2.75rem' }}
                  >
                    {pts}/{maxPts}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Registra actividad hoy para ver tu score.
        </p>
      )}
    </StatsCard>
  );
}
