import { useTranslation } from 'react-i18next'

interface SummaryStripProps {
  completedSets: number
  totalVolumeKg: number
  exerciseCount: number
}

export const SummaryStrip = ({ completedSets, totalVolumeKg, exerciseCount }: SummaryStripProps) => {
  const { t } = useTranslation()

  return (
    <div className="flex gap-2 mb-4">
      <div className="flex-1 bg-card rounded-xl p-3 text-center">
        <p className="text-lg font-bold text-foreground">{completedSets}</p>
        <p className="text-xs text-muted-foreground">{t('gym.series')}</p>
      </div>
      <div className="flex-1 bg-card rounded-xl p-3 text-center">
        <p className="text-lg font-bold text-foreground">
          {totalVolumeKg >= 1000
            ? `${(totalVolumeKg / 1000).toFixed(1)}t`
            : `${totalVolumeKg.toFixed(1)} kg`}
        </p>
        <p className="text-xs text-muted-foreground">{t('gym.volume')}</p>
      </div>
      <div className="flex-1 bg-card rounded-xl p-3 text-center">
        <p className="text-lg font-bold text-foreground">{exerciseCount}</p>
        <p className="text-xs text-muted-foreground">{t('gym.exercises')}</p>
      </div>
    </div>
  )
}
