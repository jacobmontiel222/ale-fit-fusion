import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import { MUSCLE_COLORS, MUSCLE_LABELS } from '@/types/workout'

interface MuscleHeatmapProps {
  muscleVolume: Record<string, number>
}

// Returns opacity (0–1) based on volume relative to max
const getOpacity = (volume: number, maxVolume: number) => {
  if (maxVolume === 0 || volume === 0) return 0
  return Math.max(0.15, volume / maxVolume)
}

export const MuscleHeatmap = ({ muscleVolume }: MuscleHeatmapProps) => {
  const { t } = useTranslation()
  const [view, setView] = useState<'front' | 'back'>('front')

  const maxVolume = Math.max(...Object.values(muscleVolume), 1)

  const muscleStyle = (key: string) => {
    const vol = muscleVolume[key] ?? 0
    const opacity = getOpacity(vol, maxVolume)
    const base = MUSCLE_COLORS[key] ?? 'hsl(var(--muted))'
    if (opacity === 0) return { fill: 'hsl(var(--secondary))', opacity: 1 }
    return { fill: base, opacity }
  }

  // Sort muscles by volume for the legend
  const sortedMuscles = Object.entries(muscleVolume)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)

  return (
    <div className="bg-card rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-foreground">{t('gym.muscleMap')}</p>
        <div className="flex gap-1">
          <Button
            variant={view === 'front' ? 'secondary' : 'ghost'}
            size="sm"
            className="text-xs"
            onClick={() => setView('front')}
          >
            {t('gym.front')}
          </Button>
          <Button
            variant={view === 'back' ? 'secondary' : 'ghost'}
            size="sm"
            className="text-xs"
            onClick={() => setView('back')}
          >
            {t('gym.back')}
          </Button>
        </div>
      </div>

      {/* SVG silueta simplificada */}
      <div className="flex justify-center mb-4">
        <svg
          viewBox="0 0 120 280"
          className="h-48"
          style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.3))' }}
        >
          {view === 'front' ? (
            <>
              {/* Head */}
              <ellipse cx="60" cy="18" rx="14" ry="16" fill="hsl(var(--secondary))" />
              {/* Neck */}
              <rect x="55" y="32" width="10" height="8" rx="3" fill="hsl(var(--secondary))" />
              {/* Chest upper */}
              <path d="M35 42 Q60 38 85 42 L88 62 Q60 66 32 62 Z" style={muscleStyle('Chest_Upper')} />
              {/* Chest mid */}
              <path d="M32 62 Q60 66 88 62 L86 76 Q60 80 34 76 Z" style={muscleStyle('Chest_Mid')} />
              {/* Chest lower */}
              <path d="M34 76 Q60 80 86 76 L84 88 Q60 90 36 88 Z" style={muscleStyle('Chest_Lower')} />
              {/* Left shoulder (front delt) */}
              <ellipse cx="25" cy="52" rx="11" ry="13" style={muscleStyle('Front_Delt')} />
              {/* Right shoulder (front delt) */}
              <ellipse cx="95" cy="52" rx="11" ry="13" style={muscleStyle('Front_Delt')} />
              {/* Left lateral delt */}
              <ellipse cx="16" cy="52" rx="7" ry="10" style={muscleStyle('Lateral_Delt')} />
              {/* Right lateral delt */}
              <ellipse cx="104" cy="52" rx="7" ry="10" style={muscleStyle('Lateral_Delt')} />
              {/* Abs rectus */}
              <rect x="44" y="88" width="32" height="44" rx="4" style={muscleStyle('Abs_Rectus')} />
              {/* Obliques left */}
              <path d="M36 90 L44 90 L44 132 L36 128 Z" rx="2" style={muscleStyle('Obliques')} />
              {/* Obliques right */}
              <path d="M76 90 L84 90 L84 128 L76 132 Z" rx="2" style={muscleStyle('Obliques')} />
              {/* Left bicep */}
              <ellipse cx="15" cy="78" rx="7" ry="18" style={muscleStyle('Biceps')} />
              {/* Right bicep */}
              <ellipse cx="105" cy="78" rx="7" ry="18" style={muscleStyle('Biceps')} />
              {/* Left forearm */}
              <ellipse cx="12" cy="112" rx="5" ry="16" style={muscleStyle('Forearm_Flexors')} />
              {/* Right forearm */}
              <ellipse cx="108" cy="112" rx="5" ry="16" style={muscleStyle('Forearm_Flexors')} />
              {/* Quads left */}
              <path d="M36 136 Q36 136 46 136 L50 190 Q40 190 34 186 Z" style={muscleStyle('Quads')} />
              {/* Quads right */}
              <path d="M84 136 Q74 136 74 136 L70 190 Q80 190 86 186 Z" style={muscleStyle('Quads')} />
              {/* Left adductor */}
              <path d="M46 136 L60 136 L58 190 L50 190 Z" style={muscleStyle('Adductors')} />
              {/* Right adductor */}
              <path d="M74 136 L60 136 L62 190 L70 190 Z" style={muscleStyle('Adductors')} />
              {/* Left calves */}
              <ellipse cx="42" cy="228" rx="8" ry="18" style={muscleStyle('Calves_Gastroc')} />
              {/* Right calves */}
              <ellipse cx="78" cy="228" rx="8" ry="18" style={muscleStyle('Calves_Gastroc')} />
            </>
          ) : (
            <>
              {/* Head */}
              <ellipse cx="60" cy="18" rx="14" ry="16" fill="hsl(var(--secondary))" />
              {/* Neck */}
              <rect x="55" y="32" width="10" height="8" rx="3" fill="hsl(var(--secondary))" />
              {/* Upper traps */}
              <path d="M35 40 Q60 36 85 40 L82 54 Q60 50 38 54 Z" style={muscleStyle('Upper_Traps')} />
              {/* Lower traps */}
              <path d="M38 54 Q60 50 82 54 L80 70 Q60 68 40 70 Z" style={muscleStyle('Lower_Traps')} />
              {/* Rear delts left */}
              <ellipse cx="26" cy="50" rx="11" ry="12" style={muscleStyle('Rear_Delt')} />
              {/* Rear delts right */}
              <ellipse cx="94" cy="50" rx="11" ry="12" style={muscleStyle('Rear_Delt')} />
              {/* Lats left */}
              <path d="M22 58 L38 70 L36 104 Q28 96 20 84 Z" style={muscleStyle('Lats')} />
              {/* Lats right */}
              <path d="M98 58 L82 70 L84 104 Q92 96 100 84 Z" style={muscleStyle('Lats')} />
              {/* Mid back */}
              <rect x="38" y="70" width="44" height="36" rx="4" style={muscleStyle('MidBack')} />
              {/* Erectors */}
              <rect x="48" y="106" width="24" height="28" rx="4" style={muscleStyle('Erectors')} />
              {/* Left tricep */}
              <ellipse cx="15" cy="78" rx="7" ry="18" style={muscleStyle('Triceps')} />
              {/* Right tricep */}
              <ellipse cx="105" cy="78" rx="7" ry="18" style={muscleStyle('Triceps')} />
              {/* Left forearm ext */}
              <ellipse cx="12" cy="112" rx="5" ry="16" style={muscleStyle('Forearm_Extensors')} />
              {/* Right forearm ext */}
              <ellipse cx="108" cy="112" rx="5" ry="16" style={muscleStyle('Forearm_Extensors')} />
              {/* Glute max left */}
              <path d="M36 134 Q36 134 60 134 L60 162 Q44 166 34 160 Z" style={muscleStyle('Glute_Max')} />
              {/* Glute max right */}
              <path d="M84 134 Q60 134 60 134 L60 162 Q76 166 86 160 Z" style={muscleStyle('Glute_Max')} />
              {/* Hamstrings left */}
              <path d="M36 162 Q38 162 52 162 L52 206 Q40 204 34 198 Z" style={muscleStyle('Hamstrings')} />
              {/* Hamstrings right */}
              <path d="M84 162 Q82 162 68 162 L68 206 Q80 204 86 198 Z" style={muscleStyle('Hamstrings')} />
              {/* Calves soleus left */}
              <ellipse cx="42" cy="228" rx="8" ry="18" style={muscleStyle('Calves_Soleus')} />
              {/* Calves soleus right */}
              <ellipse cx="78" cy="228" rx="8" ry="18" style={muscleStyle('Calves_Soleus')} />
            </>
          )}
        </svg>
      </div>

      {/* Volume legend */}
      {sortedMuscles.length > 0 && (
        <div className="space-y-1.5">
          {sortedMuscles.map(([muscle, vol]) => (
            <div key={muscle} className="flex items-center gap-2">
              <span
                className="text-xs w-28 truncate"
                style={{ color: MUSCLE_COLORS[muscle] ?? 'hsl(var(--muted-foreground))' }}
              >
                {MUSCLE_LABELS[muscle as keyof typeof MUSCLE_LABELS] ?? muscle.replace(/_/g, ' ')}
              </span>
              <div className="flex-1 bg-secondary rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(vol / maxVolume) * 100}%`,
                    backgroundColor: MUSCLE_COLORS[muscle] ?? 'hsl(var(--accent))',
                  }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-8 text-right">{vol.toFixed(0)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
