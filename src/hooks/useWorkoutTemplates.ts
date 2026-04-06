import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TemplateExercise {
  id: string;
  template_id: string;
  exercise_id: string | null;
  exercise_name: string;
  custom_name: string | null;
  exercise_type: 'compound' | 'accessory' | 'calisthenics' | 'cardio';
  reps_min: number;
  reps_max: number;
  order_index: number;
  planned_sets?: any[];
  // joined from exercises table
  exercise?: {
    id: string;
    name: string;
    muscle_weights: Record<string, number> | null;
    routine_part: string | null;
    subcategory: string | null;
  } | null;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  color: string;
  template_exercises?: TemplateExercise[];
}

export const useWorkoutTemplates = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['workoutTemplates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('workout_templates')
        .select(`
          *,
          template_exercises(
            *,
            exercises(id, name, muscle_weights, routine_part, subcategory)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Sort template_exercises by order_index
      return (data as WorkoutTemplate[]).map(t => ({
        ...t,
        template_exercises: (t.template_exercises ?? []).sort(
          (a, b) => a.order_index - b.order_index
        ),
      }));
    },
    enabled: !!user?.id,
  });

  const createTemplate = useMutation({
    mutationFn: async (template: { name: string; color: string }) => {
      if (!user?.id) throw new Error('No user');

      const { data, error } = await supabase
        .from('workout_templates')
        .insert({ user_id: user.id, name: template.name, color: template.color })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutTemplates', user?.id] });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      if (!user?.id) throw new Error('No user');
      const { error } = await supabase
        .from('workout_templates')
        .update({ name, color })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutTemplates', user?.id] });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('No user');
      const { error } = await supabase
        .from('workout_templates')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutTemplates', user?.id] });
    },
  });

  // Add exercise from the catalog (exercises table)
  const addExerciseToTemplate = useMutation({
    mutationFn: async ({
      templateId,
      exercise,
      customName,
    }: {
      templateId: string;
      exercise: { id: string; name: string };
      customName?: string;
    }) => {
      // Get next order_index
      const { data: existing } = await supabase
        .from('template_exercises')
        .select('order_index')
        .eq('template_id', templateId)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextIndex = existing && existing.length > 0 ? existing[0].order_index + 1 : 0;

      const { error } = await supabase
        .from('template_exercises')
        .insert({
          template_id: templateId,
          exercise_id: exercise.id,
          exercise_name: exercise.name,
          custom_name: customName ?? null,
          exercise_type: 'compound',
          reps_min: 8,
          reps_max: 12,
          order_index: nextIndex,
          planned_sets: [],
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutTemplates', user?.id] });
    },
  });

  // Update custom name of a template exercise
  const updateExerciseCustomName = useMutation({
    mutationFn: async ({ exerciseId, customName }: { exerciseId: string; customName: string }) => {
      const { error } = await supabase
        .from('template_exercises')
        .update({ custom_name: customName || null })
        .eq('id', exerciseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutTemplates', user?.id] });
    },
  });

  // Remove exercise from template
  const removeExerciseFromTemplate = useMutation({
    mutationFn: async (templateExerciseId: string) => {
      const { error } = await supabase
        .from('template_exercises')
        .delete()
        .eq('id', templateExerciseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutTemplates', user?.id] });
    },
  });

  // Reorder exercises (update order_index for all)
  const reorderExercises = useMutation({
    mutationFn: async (exercises: { id: string; order_index: number }[]) => {
      const updates = exercises.map(ex =>
        supabase
          .from('template_exercises')
          .update({ order_index: ex.order_index })
          .eq('id', ex.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutTemplates', user?.id] });
    },
  });

  return {
    templates,
    isLoading,
    createTemplate: createTemplate.mutateAsync,
    updateTemplate: updateTemplate.mutateAsync,
    deleteTemplate: deleteTemplate.mutateAsync,
    addExerciseToTemplate: addExerciseToTemplate.mutateAsync,
    updateExerciseCustomName: updateExerciseCustomName.mutateAsync,
    removeExerciseFromTemplate: removeExerciseFromTemplate.mutateAsync,
    reorderExercises: reorderExercises.mutateAsync,
  };
};
