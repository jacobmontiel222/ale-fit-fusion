import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface WorkoutTemplate {
  id: string;
  name: string;
  color: string;
  template_exercises?: TemplateExercise[];
}

interface TemplateExercise {
  id: string;
  exercise_name: string;
  exercise_type: 'compound' | 'accessory' | 'calisthenics';
  reps_min: number;
  reps_max: number;
  order_index: number;
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
          template_exercises(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as WorkoutTemplate[];
    },
    enabled: !!user?.id,
  });

  const createTemplate = useMutation({
    mutationFn: async (template: { name: string; color: string }) => {
      if (!user?.id) throw new Error('No user');

      const { data, error } = await supabase
        .from('workout_templates')
        .insert({
          user_id: user.id,
          name: template.name,
          color: template.color,
        })
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

  const addExerciseToTemplate = useMutation({
    mutationFn: async (exercise: {
      template_id: string;
      exercise_name: string;
      exercise_type: 'compound' | 'accessory' | 'calisthenics';
      reps_min: number;
      reps_max: number;
      order_index: number;
    }) => {
      const { error } = await supabase
        .from('template_exercises')
        .insert(exercise);

      if (error) throw error;
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
  };
};
