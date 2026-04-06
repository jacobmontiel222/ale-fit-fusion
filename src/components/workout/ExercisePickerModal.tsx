import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/integrations/supabase/client'
import { cn } from '@/lib/utils'
import type { Exercise } from '@/types/workout'
import { MUSCLE_COLORS, MUSCLE_LABELS } from '@/types/workout'

const getTopMuscles = (weights: Record<string, number> | null, count = 3) => {
  if (!weights) return []
  return Object.entries(weights)
    .sort(([, a], [, b]) => b - a)
    .slice(0, count)
    .map(([key]) => key)
}

const ROUTINE_PARTS = [
  'Chest', 'Back', 'Shoulders', 'Triceps', 'Biceps', 'Legs', 'Core', 'Cardio',
]

interface ExercisePickerModalProps {
  open: boolean
  onClose: () => void
  onSelect: (exercise: Exercise) => void
}

export const ExercisePickerModal = ({ open, onClose, onSelect }: ExercisePickerModalProps) => {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchExercises = async (search: string, filter: string | null) => {
    let q = supabase
      .from('exercises')
      .select('*')
      .order('name', { ascending: true })
      .limit(60)

    if (search.trim()) {
      q = q.ilike('name', `%${search.trim()}%`)
    }
    if (filter) {
      q = q.ilike('routine_part', `%${filter}%`)
    }

    const { data } = await q
    if (data) setExercises(data as Exercise[])
  }

  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchExercises(query, activeFilter)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, activeFilter, open])

  // Group by subcategory
  const grouped = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    const key = ex.subcategory ?? 'Other'
    if (!acc[key]) acc[key] = []
    acc[key].push(ex)
    return acc
  }, {})

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>{t('gym.addExercise')}</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="px-4 pb-2">
          <Input
            placeholder={t('gym.searchExercise')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Filter chips */}
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
          {ROUTINE_PARTS.map(part => (
            <button
              key={part}
              onClick={() => setActiveFilter(activeFilter === part ? null : part)}
              className={cn(
                'shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors',
                activeFilter === part
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'border-border text-muted-foreground hover:border-foreground'
              )}
            >
              {part}
            </button>
          ))}
        </div>

        {/* Exercise list */}
        <ScrollArea className="flex-1 px-4">
          {Object.entries(grouped).map(([subcategory, items]) => (
            <div key={subcategory} className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {subcategory}
              </p>
              <div className="space-y-1">
                {items.map(ex => {
                  const top3 = getTopMuscles(ex.muscle_weights)
                  return (
                    <button
                      key={ex.id}
                      onClick={() => {
                        onSelect(ex)
                        onClose()
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-secondary transition-colors text-left"
                    >
                      <span className="text-sm font-medium text-foreground">{ex.name}</span>
                      <div className="flex gap-1">
                        {top3.map(m => (
                          <span
                            key={m}
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: `${MUSCLE_COLORS[m] ?? 'hsl(var(--muted))'}22`,
                              color: MUSCLE_COLORS[m] ?? 'hsl(var(--muted-foreground))',
                            }}
                          >
                            {MUSCLE_LABELS[m as keyof typeof MUSCLE_LABELS] ?? m.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {exercises.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">
              {t('gym.noExercisesFound')}
            </p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
