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
      const [profileData, weightData, stepsData, nutritionData, waterData] = await Promise.all([
        supabase.from('profiles').select('name').eq('id', user.id).maybeSingle(),
        supabase.from('daily_weight').select('weight').eq('user_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('daily_steps').select('steps').eq('user_id', user.id).eq('date', today).maybeSingle(),
        getTotals(today),
        supabase.from('daily_water_intake').select('ml_consumed').eq('user_id', user.id).eq('date', today).maybeSingle(),
      ]);

      return {
        userName: profileData.data?.name || 'Usuario',
        todayWeight: weightData.data ? Number(weightData.data.weight) : null,
        todaySteps: stepsData.data?.steps || 0,
        todayNutrition: nutritionData,
        todayWater: waterData.data?.ml_consumed || 0,
      };
    },
    enabled: !!user?.id,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
  };
};
