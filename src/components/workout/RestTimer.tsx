import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface RestTimerProps {
  isActive: boolean
  defaultSeconds?: number
  onExpire?: () => void
}

export const RestTimer = ({ isActive, defaultSeconds = 120, onExpire }: RestTimerProps) => {
  const { t } = useTranslation()
  const [remaining, setRemaining] = useState(defaultSeconds)
  const [active, setActive] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start or reset timer when isActive changes
  useEffect(() => {
    if (isActive) {
      setRemaining(defaultSeconds)
      setActive(true)
    }
  }, [isActive, defaultSeconds])

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          setActive(false)
          if (navigator.vibrate) navigator.vibrate([200, 100, 200])
          onExpire?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [active, onExpire])

  const mm = Math.floor(remaining / 60)
  const ss = remaining % 60
  const expired = remaining === 0

  if (!active && !expired) return null

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-xl px-4 py-3 mb-4 transition-colors',
        expired ? 'bg-accent/20 border border-accent' : 'bg-card'
      )}
    >
      <span className="text-sm text-muted-foreground">{t('gym.rest')}</span>
      <span
        className={cn(
          'text-xl font-bold tabular-nums',
          expired ? 'text-accent' : 'text-foreground'
        )}
      >
        {expired ? t('gym.go') : `${mm}:${String(ss).padStart(2, '0')}`}
      </span>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs px-2"
          onClick={() => setRemaining(r => Math.max(0, r - 15))}
        >
          −15s
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs px-2"
          onClick={() => setRemaining(r => r + 30)}
        >
          +30s
        </Button>
      </div>
    </div>
  )
}
