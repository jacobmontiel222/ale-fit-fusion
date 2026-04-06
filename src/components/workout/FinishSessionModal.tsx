import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'

interface FinishSessionModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
  stats: {
    durationSeconds: number
    totalVolumeKg: number
    completedSets: number
    exerciseCount: number
  }
}

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export const FinishSessionModal = ({
  open,
  onClose,
  onConfirm,
  isLoading,
  stats,
}: FinishSessionModalProps) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('gym.finishSession')}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-4">
          <div className="bg-card rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-foreground">{formatDuration(stats.durationSeconds)}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('gym.duration')}</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-foreground">
              {stats.totalVolumeKg >= 1000
                ? `${(stats.totalVolumeKg / 1000).toFixed(1)}t`
                : `${stats.totalVolumeKg.toFixed(1)} kg`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t('gym.volume')}</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-foreground">{stats.completedSets}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('gym.series')}</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-foreground">{stats.exerciseCount}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('gym.exercises')}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? t('common.loading') : t('gym.confirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
