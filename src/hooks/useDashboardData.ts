import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNutrition } from '@/contexts/NutritionContext';

export const useDashboardData = () => {
  const { user } = useAuth();
  const { getTotals } = useNutrition();
  const today = new Date().toISOString().split('T')[0];

  const query = useQuery({
    queryKey: ['dashboard', user?.id, today],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user');

      // Load all data in parallel
      const [profileData, weightData, stepsData, nutritionData, waterData, goalsData] = await Promise.all([
        supabase.from('profiles').select('name, water_goal_ml, burn_goal_kcal').eq('id', user.id).maybeSingle(),
        supabase.from('daily_weight').select('weight').eq('user_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('daily_steps').select('steps').eq('user_id', user.id).eq('date', today).maybeSingle(),
        getTotals(today),
        supabase.from('daily_water_intake').select('ml_consumed').eq('user_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('nutrition_goals').select('calories_goal').eq('user_id', user.id).maybeSingle(),
      ]);

      return {
        userName: profileData.data?.name || 'Usuario',
        todayWeight: weightData.data ? Number(weightData.data.weight) : null,
        todaySteps: stepsData.data?.steps || 0,
        todayNutrition: nutritionData,
        todayWater: waterData.data?.ml_consumed || 0,
        waterGoal: profileData.data?.water_goal_ml || 2000,
        burnGoal: profileData.data?.burn_goal_kcal || 500,
        caloriesGoal: goalsData.data?.calories_goal || nutritionData?.kcalTarget || 2000,
      };
    },
    enabled: !!user?.id,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
};
