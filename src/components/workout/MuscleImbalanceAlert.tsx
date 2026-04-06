import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const PUSH_MUSCLES = new Set([
  'Chest_Upper', 'Chest_Mid', 'Chest_Lower',
  'Front_Delt', 'Lateral_Delt',
  'Triceps',
])
const PULL_MUSCLES = new Set([
  'Lats', 'MidBack', 'Teres_Major',
  'Biceps',
  'Rear_Delt',
])

interface MuscleImbalanceAlertProps {
  muscleVolume: Record<string, number>
}

export const MuscleImbalanceAlert = ({ muscleVolume }: MuscleImbalanceAlertProps) => {
  const { t } = useTranslation()

  const pushVolume = Object.entries(muscleVolume)
    .filter(([m]) => PUSH_MUSCLES.has(m))
    .reduce((sum, [, v]) => sum + v, 0)

  const pullVolume = Object.entries(muscleVolume)
    .filter(([m]) => PULL_MUSCLES.has(m))
    .reduce((sum, [, v]) => sum + v, 0)

  const ratio = pullVolume > 0 ? pushVolume / pullVolume : 0

  if (ratio <= 1.5 || pushVolume === 0) return null

  return (
    <div className="flex items-start gap-3 bg-carbs/10 border border-carbs/30 rounded-xl p-3 mb-4">
      <AlertTriangle className="w-4 h-4 text-carbs shrink-0 mt-0.5" style={{ color: 'hsl(var(--carbs))' }} />
      <div>
        <p className="text-sm font-semibold" style={{ color: 'hsl(var(--carbs))' }}>
          {t('gym.imbalanceTitle')}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t('gym.imbalanceDesc', { ratio: ratio.toFixed(1) })}
        </p>
      </div>
    </div>
  )
}
