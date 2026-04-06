import { useEffect, useState } from 'react'

interface TopBarProps {
  startedAt: string
  onFinish: () => void
}

export const TopBar = ({ startedAt, onFinish }: TopBarProps) => {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = new Date(startedAt).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  const hh = Math.floor(elapsed / 3600)
  const mm = Math.floor((elapsed % 3600) / 60)
  const ss = elapsed % 60
  const timeStr = hh > 0
    ? `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    : `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`

  return (
    <div className="sticky top-0 z-10 bg-background border-b border-border">
      <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <span className="text-xl font-black tracking-tight text-white">FY</span>

        {/* Cronómetro centrado */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
          </span>
          <span className="text-base font-semibold tabular-nums text-foreground">{timeStr}</span>
        </div>

        {/* Botón Finish */}
        <button
          onClick={onFinish}
          className="bg-destructive text-white text-sm font-semibold px-4 py-1.5 rounded-lg active:opacity-80 transition-opacity"
        >
          Finish
        </button>
      </div>
    </div>
  )
}
