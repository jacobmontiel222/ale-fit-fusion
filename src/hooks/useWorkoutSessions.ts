import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ExerciseSet {
  set: number;
  weight: number | null;
  reps: number | null;
  rpe?: number | null;
  completed: boolean;
}

interface ExerciseHistory {
  id: string;
  exercise_name: string;
  sets_data: ExerciseSet[];
  suggested_weight: number | null;
  suggested_reps_min: number | null;
  suggested_reps_max: number | null;
  goal_achieved: boolean | null;
  technique_good: boolean;
  notes: string | null;
  created_at: string;
}

interface WorkoutSession {
  id: string;
  date: string;
  template_id: string | null;
  completed: boolean;
  notes: string | null;
  template?: {
    name: string;
    color: string;
    template_exercises: Array<{
      id: string;
      exercise_name: string;
      exercise_type: string;
      reps_min: number;
      reps_max: number;
      order_index: number;
    }>;
  };
  exercise_history?: ExerciseHistory[];
}

export const useWorkoutSessions = (sessionId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const normalizeNumericValue = (value: unknown): number | null => {
    if (typeof value === 'number') {
      return Number.isNaN(value) ? null : value;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') {
        return null;
      }
      const parsed = Number(trimmed.replace(',', '.'));
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  const normalizeExerciseSets = (rawSets: any[] | null | undefined): ExerciseSet[] =>
    (rawSets ?? []).map((set, index) => ({
      set: typeof set?.set === 'number' && !Number.isNaN(set.set) ? set.set : index + 1,
      weight: normalizeNumericValue(set?.weight),
      reps: normalizeNumericValue(set?.reps),
      rpe: normalizeNumericValue(set?.rpe),
      completed: Boolean(set?.completed),
    }));

  const { data: session, isLoading } = useQuery({
    queryKey: ['workoutSession', sessionId],
    queryFn: async (): Promise<WorkoutSession | null> => {
      if (!sessionId || !user?.id) return null;

      const { data, error } = await supabase
        .from('workout_sessions')
        .select(`
          *,
          workout_templates:template_id(
            name,
            color,
            template_exercises(*)
          ),
          exercise_history(*)
        `)
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      // Transform the data to match our types
      const transformedData: WorkoutSession = {
        ...data,
        exercise_history: (data.exercise_history || []).map((eh: any) => ({
          ...eh,
          sets_data: normalizeExerciseSets(eh.sets_data ?? []),
        })),
      };
      
      return transformedData;
    },
    enabled: !!sessionId && !!user?.id,
  });

  const getPreviousExerciseData = async (
    exerciseName: string,
    templateId?: string | null,
    currentSessionId?: string,
  ) => {
    if (!user?.id) return null;

    let query = supabase
      .from('exercise_history')
      .select(`
        *,
        workout_sessions:session_id(template_id, date)
      `)
      .eq('user_id', user.id)
      .eq('exercise_name', exerciseName)
      .order('created_at', { ascending: false });

    if (currentSessionId) {
      query = query.neq('session_id', currentSessionId);
    }

    if (templateId) {
      query = query.eq('workout_sessions.template_id', templateId);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error || !data) return null;

    return {
      ...data,
      sets_data: normalizeExerciseSets(data.sets_data ?? []),
    } as ExerciseHistory;
  };

  const saveExerciseHistory = useMutation({
    mutationFn: async ({
      sessionId,
      exerciseName,
      setsData,
      suggestedWeight,
      suggestedRepsMin,
      suggestedRepsMax,
      goalAchieved,
      techniqueGood,
      notes,
    }: {
      sessionId: string;
      exerciseName: string;
      setsData: ExerciseSet[];
      suggestedWeight?: number;
      suggestedRepsMin?: number;
      suggestedRepsMax?: number;
      goalAchieved?: boolean;
      techniqueGood?: boolean;
      notes?: string;
    }) => {
      if (!user?.id) throw new Error('No user');

      const normalizedSets = normalizeExerciseSets(setsData);

      const { error } = await supabase
        .from('exercise_history')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          exercise_name: exerciseName,
          sets_data: normalizedSets as any,
          suggested_weight: suggestedWeight || null,
          suggested_reps_min: suggestedRepsMin || null,
          suggested_reps_max: suggestedRepsMax || null,
          goal_achieved: goalAchieved || null,
          technique_good: techniqueGood !== undefined ? techniqueGood : true,
          notes: notes || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutSession', sessionId] });
    },
  });

  const updateSession = useMutation({
    mutationFn: async ({
      sessionId,
      completed,
      notes,
    }: {
      sessionId: string;
      completed?: boolean;
      notes?: string;
    }) => {
      if (!user?.id) throw new Error('No user');

      const updateData: any = {};
      if (completed !== undefined) updateData.completed = completed;
      if (notes !== undefined) updateData.notes = notes;

      const { error } = await supabase
        .from('workout_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutSession', sessionId] });
    },
  });

  return {
    session,
    isLoading,
    getPreviousExerciseData,
    saveExerciseHistory: saveExerciseHistory.mutateAsync,
    updateSession: updateSession.mutateAsync,
  };
};
