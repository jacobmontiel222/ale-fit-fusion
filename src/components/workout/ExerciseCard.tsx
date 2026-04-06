import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, BarChart2, MoreHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { WorkoutExercise, WorkoutSet } from '@/types/workout'
import { MUSCLE_COLORS, MUSCLE_LABELS } from '@/types/workout'

interface ExerciseCardProps {
  workoutExercise: WorkoutExercise
  onSetComplete: (setId: string, weightKg: number, reps: number) => void
  onAddSet: (workoutExerciseId: string) => void
  isPR?: (exerciseId: string, volume: number) => boolean
}

const SET_TYPE_LABELS: Record<string, string> = {
  warmup: 'Calent.',
  normal: '',
  drop: 'Drop',
  failure: 'Fallo',
  superset: 'Super',
}

const getTopMuscles = (snapshot: Record<string, number> | null, count = 3) => {
  if (!snapshot) return []
  return Object.entries(snapshot)
    .sort(([, a], [, b]) => b - a)
    .slice(0, count)
    .map(([key]) => key)
}

export const ExerciseCard = ({
  workoutExercise,
  onSetComplete,
  onAddSet,
  isPR,
}: ExerciseCardProps) => {
  const { t } = useTranslation()
  const sets = workoutExercise.workout_sets ?? []
  const exerciseName =
    workoutExercise.display_name ?? workoutExercise.exercise?.name ?? ''
  const topMuscles = getTopMuscles(workoutExercise.muscle_weights_snapshot)

  // Local state for pending set inputs (before completing)
  const [inputs, setInputs] = useState<Record<string, { weight: string; reps: string }>>(() =>
    Object.fromEntries(
      sets.map(s => [s.id, { weight: String(s.weight_kg ?? s.ghost_weight_kg ?? ''), reps: String(s.reps ?? s.ghost_reps ?? '') }])
    )
  )

  const handleInputChange = (setId: string, field: 'weight' | 'reps', value: string) => {
    setInputs(prev => ({ ...prev, [setId]: { ...prev[setId], [field]: value } }))
  }

  const handleComplete = (set: WorkoutSet) => {
    const inp = inputs[set.id] ?? { weight: '', reps: '' }
    const w = parseFloat(inp.weight)
    const r = parseInt(inp.reps)
    if (isNaN(w) || isNaN(r)) return
    onSetComplete(set.id, w, r)
  }

  const completedSets = sets.filter(s => s.is_completed)
  const volumeForPR = completedSets.reduce((max, s) => {
    const v = (s.weight_kg ?? 0) * (s.reps ?? 0)
    return Math.max(max, v)
  }, 0)
  const showPR = isPR && workoutExercise.exercise_id
    ? isPR(workoutExercise.exercise_id, volumeForPR)
    : false

  return (
    <div className="bg-card rounded-2xl p-4 mb-3">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-foreground truncate">{exerciseName}</h3>
            {showPR && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-carbs/20 text-carbs border border-carbs/30">
                PR
              </span>
            )}
          </div>
          <div className="flex gap-1 mt-1 flex-wrap">
            {topMuscles.map(muscle => (
              <span
                key={muscle}
                className="text-xs px-1.5 py-0.5 rounded font-medium"
                style={{
                  backgroundColor: `${MUSCLE_COLORS[muscle] ?? 'hsl(var(--muted))'}22`,
                  color: MUSCLE_COLORS[muscle] ?? 'hsl(var(--muted-foreground))',
                  border: `1px solid ${MUSCLE_COLORS[muscle] ?? 'hsl(var(--border))'}44`,
                }}
              >
                {MUSCLE_LABELS[muscle as keyof typeof MUSCLE_LABELS] ?? muscle.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-1 shrink-0 ml-2">
          <Button variant="ghost" size="icon" className="w-7 h-7">
            <BarChart2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-7 h-7">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Sets table */}
      <div className="space-y-2">
        {/* Column headers */}
        <div className="grid grid-cols-[28px_60px_1fr_1fr_32px] gap-1 text-xs text-muted-foreground px-1">
          <span>#</span>
          <span>{t('gym.previous')}</span>
          <span>kg</span>
          <span>{t('gym.reps')}</span>
          <span />
        </div>

        {sets.map((set, idx) => {
          const inp = inputs[set.id] ?? { weight: '', reps: '' }
          const isActive = !set.is_completed
          const ghostWeight = set.ghost_weight_kg
          const ghostReps = set.ghost_reps
          const ghostLabel = ghostWeight != null && ghostReps != null
            ? `${ghostWeight}×${ghostReps}`
            : '—'

          return (
            <div
              key={set.id}
              className={cn(
                'grid grid-cols-[28px_60px_1fr_1fr_32px] gap-1 items-center',
                set.is_completed && 'opacity-70'
              )}
            >
              {/* Set number + type */}
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold text-muted-foreground">
                  {idx + 1}
                </span>
                {set.set_type !== 'normal' && (
                  <span className="text-[10px] text-muted-foreground leading-none">
                    {SET_TYPE_LABELS[set.set_type]}
                  </span>
                )}
              </div>

              {/* Ghost (anterior) */}
              <span className="text-xs text-muted-foreground tabular-nums">{ghostLabel}</span>

              {/* Weight input */}
              <Input
                type="number"
                inputMode="decimal"
                value={inp.weight}
                onChange={e => handleInputChange(set.id, 'weight', e.target.value)}
                disabled={set.is_completed}
                className={cn(
                  'h-8 text-sm text-center px-1',
                  !isActive && 'bg-muted/30 text-muted-foreground'
                )}
                placeholder={ghostWeight != null ? String(ghostWeight) : '0'}
              />

              {/* Reps input */}
              <Input
                type="number"
                inputMode="numeric"
                value={inp.reps}
                onChange={e => handleInputChange(set.id, 'reps', e.target.value)}
                disabled={set.is_completed}
                className={cn(
                  'h-8 text-sm text-center px-1',
                  !isActive && 'bg-muted/30 text-muted-foreground'
                )}
                placeholder={ghostReps != null ? String(ghostReps) : '0'}
              />

              {/* Complete toggle */}
              <button
                onClick={() => !set.is_completed && handleComplete(set)}
                className={cn(
                  'w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors',
                  set.is_completed
                    ? 'bg-accent border-accent text-accent-foreground'
                    : 'border-muted-foreground/50 hover:border-accent'
                )}
              >
                {set.is_completed && (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Add set */}
      <button
        onClick={() => onAddSet(workoutExercise.id)}
        className="mt-3 w-full flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground py-2 rounded-lg hover:bg-secondary transition-colors"
      >
        <Plus className="w-4 h-4" />
        {t('gym.addSet')}
      </button>
    </div>
  )
}
