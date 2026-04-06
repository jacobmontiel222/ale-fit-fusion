import { logger } from '@/lib/logger'
import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { useTranslation } from 'react-i18next'
import { toast } from '@/hooks/use-toast'

import { TopBar } from '@/components/workout/TopBar'
import { SummaryStrip } from '@/components/workout/SummaryStrip'
import { RestTimer } from '@/components/workout/RestTimer'
import { ExerciseCard } from '@/components/workout/ExerciseCard'
import { ExercisePickerModal } from '@/components/workout/ExercisePickerModal'
import { FinishSessionModal } from '@/components/workout/FinishSessionModal'
import { MuscleHeatmap } from '@/components/workout/MuscleHeatmap'
import { VolumeChart } from '@/components/workout/VolumeChart'
import { IntensityGrid } from '@/components/workout/IntensityGrid'
import { MuscleImbalanceAlert } from '@/components/workout/MuscleImbalanceAlert'

import type { WorkoutSession as WSession, WorkoutExercise, WorkoutSet, Exercise } from '@/types/workout'

// ─── helpers ────────────────────────────────────────────────────────────────

const calcMuscleVolume = (exercises: WorkoutExercise[]) => {
  const result: Record<string, number> = {}
  exercises.forEach(ex => {
    const snapshot = ex.muscle_weights_snapshot
    if (!snapshot) return
    const hardSets = (ex.workout_sets ?? []).filter(
      s => s.is_completed && s.set_type !== 'warmup'
    ).length
    Object.entries(snapshot).forEach(([muscle, weight]) => {
      result[muscle] = (result[muscle] ?? 0) + weight * hardSets
    })
  })
  return result
}

const calcTotalVolume = (exercises: WorkoutExercise[]) =>
  exercises.reduce((total, ex) =>
    total + (ex.workout_sets ?? []).reduce((sum, s) =>
      sum + (s.is_completed ? (s.weight_kg ?? 0) * (s.reps ?? 0) : 0), 0
    ), 0
  )

const epley1RM = (w: number, r: number) => w * (1 + r / 30)

// ─── WorkoutSession page ─────────────────────────────────────────────────────

const WorkoutSession = () => {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const [restTimerTrigger, setRestTimerTrigger] = useState(0)
  const [showFinishModal, setShowFinishModal] = useState(false)
  const [showExercisePicker, setShowExercisePicker] = useState(false)

  // ── Load session ──────────────────────────────────────────────────────────
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['workoutSession2', sessionId],
    queryFn: async (): Promise<WSession | null> => {
      if (!sessionId || !user?.id) return null
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single()
      if (error) throw error
      return data as WSession
    },
    enabled: !!sessionId && !!user?.id,
  })

  // ── Load workout exercises + sets ─────────────────────────────────────────
  const { data: workoutExercises = [], isLoading: exercisesLoading } = useQuery({
    queryKey: ['workoutExercises', sessionId],
    queryFn: async (): Promise<WorkoutExercise[]> => {
      if (!sessionId) return []
      const { data, error } = await supabase
        .from('workout_exercises')
        .select(`
          *,
          exercises(name, muscle_weights),
          workout_sets(*)
        `)
        .eq('session_id', sessionId)
        .order('position', { ascending: true })
      if (error) throw error

      // Attach ghost data for each exercise from previous completed session
      const enriched = await Promise.all(
        (data ?? []).map(async (ex: any) => {
          const exerciseId = ex.exercise_id
          // Get sets from the last completed session for this exercise
          const { data: prevSets } = await supabase
            .from('workout_sets')
            .select(`
              *,
              workout_exercises!inner(exercise_id, session_id,
                workout_sessions!inner(user_id, status)
              )
            `)
            .eq('workout_exercises.exercise_id', exerciseId)
            .eq('workout_exercises.workout_sessions.user_id', user!.id)
            .eq('workout_exercises.workout_sessions.status', 'completed')
            .order('created_at', { ascending: false })
            .limit(20)

          // Group prev sets by set_number and take most recent
          const ghostMap: Record<number, { weight: number; reps: number }> = {}
          ;(prevSets ?? []).forEach((ps: any) => {
            if (!ghostMap[ps.set_number] && ps.weight_kg != null && ps.reps != null) {
              ghostMap[ps.set_number] = { weight: ps.weight_kg, reps: ps.reps }
            }
          })

          // Merge ghost data into current sets
          const setsWithGhost: WorkoutSet[] = (ex.workout_sets ?? []).map((s: any) => ({
            ...s,
            ghost_weight_kg: ghostMap[s.set_number]?.weight ?? null,
            ghost_reps: ghostMap[s.set_number]?.reps ?? null,
          }))

          return {
            ...ex,
            exercise: ex.exercises,
            workout_sets: setsWithGhost,
            muscle_weights_snapshot: ex.muscle_weights_snapshot ?? ex.exercises?.muscle_weights ?? null,
          } as WorkoutExercise
        })
      )
      return enriched
    },
    enabled: !!sessionId && !!user?.id,
  })

  // ── Load volume history (last 8 sessions) ────────────────────────────────
  const { data: volumeHistory = [] } = useQuery({
    queryKey: ['volumeHistory', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data } = await supabase
        .from('workout_sessions')
        .select('id, started_at, total_volume_kg, status')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('started_at', { ascending: false })
        .limit(8)
      return (data ?? []).reverse()
    },
    enabled: !!user?.id,
  })

  // ── Mutations ─────────────────────────────────────────────────────────────

  const completeSetMutation = useMutation({
    mutationFn: async ({
      setId,
      weightKg,
      reps,
    }: {
      setId: string
      weightKg: number
      reps: number
    }) => {
      const { error } = await supabase
        .from('workout_sets')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          weight_kg: weightKg,
          reps,
        })
        .eq('id', setId)
      if (error) throw error
      return { setId, weightKg, reps }
    },
    onSuccess: ({ setId, weightKg, reps }) => {
      // Actualizar cache local sin refetch para evitar scroll jumps
      queryClient.setQueryData(
        ['workoutExercises', sessionId],
        (prev: WorkoutExercise[] | undefined) =>
          (prev ?? []).map(ex => ({
            ...ex,
            workout_sets: (ex.workout_sets ?? []).map(s =>
              s.id === setId
                ? { ...s, is_completed: true, weight_kg: weightKg, reps, completed_at: new Date().toISOString() }
                : s
            ),
          }))
      )
      setRestTimerTrigger(t => t + 1)
    },
    onError: (err) => {
      logger.error('Error completing set:', err)
      toast({ title: t('common.error'), variant: 'destructive' })
    },
  })

  const addSetMutation = useMutation({
    mutationFn: async (workoutExerciseId: string) => {
      const ex = workoutExercises.find(e => e.id === workoutExerciseId)
      const existingSets = ex?.workout_sets ?? []
      const nextNumber = existingSets.length + 1
      const { data, error } = await supabase
        .from('workout_sets')
        .insert({
          workout_exercise_id: workoutExerciseId,
          set_number: nextNumber,
          set_type: 'normal',
          is_completed: false,
        })
        .select()
        .single()
      if (error) throw error
      return { workoutExerciseId, newSet: data }
    },
    onSuccess: ({ workoutExerciseId, newSet }) => {
      queryClient.setQueryData(
        ['workoutExercises', sessionId],
        (prev: WorkoutExercise[] | undefined) =>
          (prev ?? []).map(ex =>
            ex.id === workoutExerciseId
              ? { ...ex, workout_sets: [...(ex.workout_sets ?? []), { ...newSet, ghost_weight_kg: null, ghost_reps: null }] }
              : ex
          )
      )
    },
  })

  const addExerciseMutation = useMutation({
    mutationFn: async (exercise: Exercise) => {
      const position = workoutExercises.length
      const { data: weData, error: weError } = await supabase
        .from('workout_exercises')
        .insert({
          session_id: sessionId,
          exercise_id: exercise.id,
          display_name: exercise.name,
          position,
          muscle_weights_snapshot: exercise.muscle_weights as any,
        })
        .select()
        .single()
      if (weError) throw weError

      // Insert first default set
      const { error: setError } = await supabase
        .from('workout_sets')
        .insert({
          workout_exercise_id: weData.id,
          set_number: 1,
          set_type: 'normal',
          is_completed: false,
        })
      if (setError) throw setError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutExercises', sessionId] })
    },
    onError: (err) => {
      logger.error('Error adding exercise:', err)
      toast({ title: t('common.error'), variant: 'destructive' })
    },
  })

  const finishSessionMutation = useMutation({
    mutationFn: async () => {
      if (!session || !sessionId) return
      const now = new Date()
      const startedAt = new Date(session.started_at)
      const durationSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000)
      const totalVolume = calcTotalVolume(workoutExercises)

      const { error } = await supabase
        .from('workout_sessions')
        .update({
          status: 'completed',
          finished_at: now.toISOString(),
          duration_seconds: durationSeconds,
          total_volume_kg: totalVolume,
        })
        .eq('id', sessionId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification', user?.id] })
      setShowFinishModal(false)
      navigate('/gimnasio')
      toast({ title: t('gym.workoutCompleted'), description: t('gym.greatJob') })
    },
    onError: (err) => {
      logger.error('Error finishing session:', err)
      toast({ title: t('common.error'), variant: 'destructive' })
    },
  })

  // ── Derived data ──────────────────────────────────────────────────────────

  const muscleVolume = useMemo(() => calcMuscleVolume(workoutExercises), [workoutExercises])

  const completedSets = useMemo(
    () => workoutExercises.flatMap(ex => ex.workout_sets ?? []).filter(s => s.is_completed).length,
    [workoutExercises]
  )

  const totalVolumeKg = useMemo(() => calcTotalVolume(workoutExercises), [workoutExercises])

  const historicalMaxMap = useMemo(() => {
    const map: Record<string, number> = {}
    workoutExercises.forEach(ex => {
      const maxVol = (ex.workout_sets ?? [])
        .filter(s => s.ghost_weight_kg != null && s.ghost_reps != null)
        .reduce((max, s) => {
          const vol = epley1RM(s.ghost_weight_kg!, s.ghost_reps!)
          return Math.max(max, vol)
        }, 0)
      map[ex.exercise_id] = maxVol
    })
    return map
  }, [workoutExercises])

  const isPR = (exerciseId: string, currentVolume: number) => {
    const hist = historicalMaxMap[exerciseId] ?? 0
    return hist > 0 && currentVolume > hist
  }

  const chartData = useMemo(() => {
    const hist = volumeHistory.map((s: any) => ({
      label: new Date(s.started_at).toLocaleDateString('es', { day: '2-digit', month: '2-digit' }),
      volume: s.total_volume_kg ?? 0,
      isCurrent: false,
    }))
    hist.push({
      label: t('gym.today'),
      volume: totalVolumeKg,
      isCurrent: true,
    })
    return hist.slice(-8)
  }, [volumeHistory, totalVolumeKg, t])

  const finishStats = useMemo(() => {
    const durationSeconds = session
      ? Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
      : 0
    return {
      durationSeconds,
      totalVolumeKg,
      completedSets,
      exerciseCount: workoutExercises.length,
    }
  }, [session, totalVolumeKg, completedSets, workoutExercises])

  // ── Render ────────────────────────────────────────────────────────────────

  if (sessionLoading || exercisesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t('gym.sessionNotFound')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <TopBar
        startedAt={session.started_at}
        onFinish={() => setShowFinishModal(true)}
      />

      <Tabs defaultValue="session" className="w-full">
        <div className="sticky top-[57px] z-10 bg-background border-b border-border">
          <div className="max-w-md mx-auto">
          <TabsList className="w-full flex rounded-none bg-transparent h-auto px-4">
            <TabsTrigger value="session" className="flex-1 py-3 text-sm">
              {t('gym.session')}
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex-1 py-3 text-sm">
              {t('gym.stats')}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 py-3 text-sm">
              {t('gym.history')}
            </TabsTrigger>
          </TabsList>
          </div>
        </div>

        {/* ── SESSION TAB ── */}
        <TabsContent value="session" className="mt-0">
          <div className="max-w-md mx-auto px-4 py-4">
            <SummaryStrip
              completedSets={completedSets}
              totalVolumeKg={totalVolumeKg}
              exerciseCount={workoutExercises.length}
            />

            <RestTimer
              isActive={restTimerTrigger > 0}
              defaultSeconds={120}
            />

            {workoutExercises.map(ex => (
              <ExerciseCard
                key={ex.id}
                workoutExercise={ex}
                onSetComplete={(setId, weightKg, reps) =>
                  completeSetMutation.mutate({ setId, weightKg, reps })
                }
                onAddSet={workoutExerciseId =>
                  addSetMutation.mutate(workoutExerciseId)
                }
                isPR={isPR}
              />
            ))}

            {workoutExercises.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">
                {t('gym.noExercisesYet')}
              </p>
            )}

            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => setShowExercisePicker(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('gym.addExercise')}
            </Button>
          </div>
        </TabsContent>

        {/* ── STATS TAB ── */}
        <TabsContent value="stats" className="mt-0">
          <div className="max-w-md mx-auto px-4 py-4">
            <VolumeChart sessions={chartData} />
            <IntensityGrid workoutExercises={workoutExercises} />
            <MuscleImbalanceAlert muscleVolume={muscleVolume} />
            <MuscleHeatmap muscleVolume={muscleVolume} />
          </div>
        </TabsContent>

        {/* ── HISTORY TAB ── */}
        <TabsContent value="history" className="mt-0">
          <div className="max-w-md mx-auto px-4 py-4">
            {volumeHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                {t('gym.noHistory')}
              </p>
            ) : (
              <div className="space-y-3">
                {[...volumeHistory].reverse().map((s: any) => (
                  <div key={s.id} className="bg-card rounded-2xl p-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-semibold text-foreground">
                        {new Date(s.started_at).toLocaleDateString('es', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {s.total_volume_kg != null
                          ? `${s.total_volume_kg.toFixed(0)} kg`
                          : '—'}
                      </span>
                    </div>
                    {s.duration_seconds != null && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.floor(s.duration_seconds / 60)} min
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ExercisePickerModal
        open={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        onSelect={exercise => addExerciseMutation.mutate(exercise)}
      />

      <FinishSessionModal
        open={showFinishModal}
        onClose={() => setShowFinishModal(false)}
        onConfirm={() => finishSessionMutation.mutate()}
        isLoading={finishSessionMutation.isPending}
        stats={finishStats}
      />
    </div>
  )
}

export default WorkoutSession
