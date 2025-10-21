import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface NutritionGoals {
  calories_goal: number;
  protein_goal: number;
  fat_goal: number;
  carbs_goal: number;
}

export const useNutritionGoals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['nutritionGoals', user?.id],
    queryFn: async (): Promise<NutritionGoals> => {
      if (!user?.id) {
        return {
          calories_goal: 2000,
          protein_goal: 150,
          fat_goal: 65,
          carbs_goal: 250,
        };
      }

      const { data } = await supabase
        .from('nutrition_goals')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      return data || {
        calories_goal: 2000,
        protein_goal: 150,
        fat_goal: 65,
        carbs_goal: 250,
      };
    },
    enabled: !!user?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (goals: Partial<NutritionGoals>) => {
      if (!user?.id) throw new Error('No user');

      const { error } = await supabase
        .from('nutrition_goals')
        .upsert({
          user_id: user.id,
          ...goals,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
      return goals;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutritionGoals', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['mealTotals'] });
    },
  });

  return {
    goals: query.data,
    isLoading: query.isLoading,
    updateGoals: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
};
