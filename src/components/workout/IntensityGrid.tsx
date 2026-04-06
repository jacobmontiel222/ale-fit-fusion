import { useTranslation } from 'react-i18next'
import type { WorkoutExercise } from '@/types/workout'

interface IntensityGridProps {
  workoutExercises: WorkoutExercise[]
}

// Epley formula: 1RM ≈ weight * (1 + reps / 30)
const epley1RM = (weight: number, reps: number) => weight * (1 + reps / 30)

export const IntensityGrid = ({ workoutExercises }: IntensityGridProps) => {
  const { t } = useTranslation()

  let maxEstimated1RM = 0
  let totalSets = 0
  let totalRPE = 0
  let rpeCount = 0

  workoutExercises.forEach(ex => {
    const sets = (ex.workout_sets ?? []).filter(s => s.is_completed && s.set_type !== 'warmup')
    sets.forEach(s => {
      totalSets++
      if (s.weight_kg != null && s.reps != null) {
        const est = epley1RM(s.weight_kg, s.reps)
        if (est > maxEstimated1RM) maxEstimated1RM = est
      }
      if (s.rpe != null) {
        totalRPE += s.rpe
        rpeCount++
      }
    })
  })

  const avgRPE = rpeCount > 0 ? (totalRPE / rpeCount).toFixed(1) : '—'

  // Avg intensity: mean of (weight / estimated_1RM) for completed sets
  let intensitySum = 0
  let intensityCount = 0
  workoutExercises.forEach(ex => {
    const sets = (ex.workout_sets ?? []).filter(s => s.is_completed && s.weight_kg != null && s.reps != null)
    sets.forEach(s => {
      const est1rm = epley1RM(s.weight_kg!, s.reps!)
      if (est1rm > 0) {
        intensitySum += (s.weight_kg! / est1rm) * 100
        intensityCount++
      }
    })
  })
  const avgIntensity = intensityCount > 0 ? `${Math.round(intensitySum / intensityCount)}%` : '—'

  const chips = [
    { label: '1RM est.', value: maxEstimated1RM > 0 ? `${maxEstimated1RM.toFixed(1)} kg` : '—' },
    { label: t('gym.intensity'), value: avgIntensity },
    { label: t('gym.series'), value: String(totalSets) },
    { label: 'RPE', value: avgRPE },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      {chips.map(chip => (
        <div key={chip.label} className="bg-card rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-foreground">{chip.value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{chip.label}</p>
        </div>
      ))}
    </div>
  )
}
