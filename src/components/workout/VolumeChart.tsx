import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface VolumeChartProps {
  sessions: Array<{ label: string; volume: number; isCurrent?: boolean }>
}

export const VolumeChart = ({ sessions }: VolumeChartProps) => {
  const { t } = useTranslation()

  if (sessions.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-4 mb-4">
        <p className="text-sm font-semibold text-foreground mb-3">{t('gym.volumeHistory')}</p>
        <p className="text-center text-muted-foreground text-sm py-6">{t('gym.noHistory')}</p>
      </div>
    )
  }

  const maxVol = Math.max(...sessions.map(s => s.volume), 1)
  const last = sessions[sessions.length - 1]
  const prev = sessions.length >= 2 ? sessions[sessions.length - 2] : null
  const diff = prev && prev.volume > 0
    ? Math.round(((last.volume - prev.volume) / prev.volume) * 100)
    : null

  return (
    <div className="bg-card rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-foreground">{t('gym.volumeHistory')}</p>
        {diff !== null && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              color: diff >= 0 ? 'hsl(var(--accent))' : 'hsl(var(--destructive))',
              backgroundColor: diff >= 0 ? 'hsl(var(--accent) / 0.15)' : 'hsl(var(--destructive) / 0.15)',
            }}
          >
            {diff >= 0 ? '+' : ''}{diff}%
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={sessions} barCategoryGap="20%">
          <XAxis
            dataKey="label"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide domain={[0, maxVol * 1.15]} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
              color: 'hsl(var(--foreground))',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value.toFixed(0)} kg`, t('gym.volume')]}
            cursor={{ fill: 'hsl(var(--secondary))' }}
          />
          <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
            {sessions.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.isCurrent ? 'hsl(var(--accent))' : 'hsl(var(--muted))'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
