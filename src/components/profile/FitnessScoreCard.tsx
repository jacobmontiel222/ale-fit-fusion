import { UtensilsCrossed, Dumbbell, Footprints, RotateCcw } from 'lucide-react';
import { StatsCard } from '@/components/StatsCard';
import { ProgressRing } from '@/components/ProgressRing';
import type { WeeklyFitnessScore } from '@/types/gamification';

interface FitnessScoreCardProps {
  score: WeeklyFitnessScore;
}

function scoreColor(value: number): string {
  if (value >= 85) return 'hsl(var(--accent))';
  if (value >= 70) return '#84cc16';
  if (value >= 50) return '#f59e0b';
  return '#ef4444';
}

const BREAKDOWN_ROWS = [
  { key: 'nutrition'   as const, label: 'Nutrition',       Icon: UtensilsCrossed },
  { key: 'training'    as const, label: 'Training',        Icon: Dumbbell        },
  { key: 'activity'    as const, label: 'Daily Activity',  Icon: Footprints      },
  { key: 'consistency' as const, label: 'Consistency',     Icon: RotateCcw       },
];

export function FitnessScoreCard({ score }: FitnessScoreCardProps) {
  const mainColor = scoreColor(score.total);

  return (
    <StatsCard>
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-4">
        Weekly Fitness Score
      </span>

      <div className="flex items-center gap-5">
        {/* Circular score ring */}
        <div className="shrink-0">
          <ProgressRing
            value={score.total}
            max={100}
            size={88}
            strokeWidth={7}
            strokeColor={mainColor}
            label={
              <span className="text-xl font-bold" style={{ color: mainColor }}>
                {score.total}
              </span>
            }
          />
        </div>

        {/* Breakdown rows */}
        <div className="flex-1 space-y-2.5 min-w-0">
          {BREAKDOWN_ROWS.map(({ key, label, Icon }) => {
            const val = score.breakdown[key];
            const color = scoreColor(val);
            return (
              <div key={key} className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground w-20 shrink-0 truncate">
                  {label}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${val}%`, backgroundColor: color }}
                  />
                </div>
                <span
                  className="text-xs font-semibold tabular-nums w-6 text-right shrink-0"
                  style={{ color }}
                >
                  {val}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </StatsCard>
  );
}
