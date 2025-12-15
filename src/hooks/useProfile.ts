import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileData {
  name: string;
  height: number | null;
  current_weight: number | null;
  target_weight: number | null;
  avatar_icon: string;
  avatar_color: string;
  share_foods_with_community: boolean;
  water_goal_ml?: number | null;
  burn_goal_kcal?: number | null;
  calories_goal?: number | null;
  steps_goal?: number | null;
}

export const useProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async (): Promise<ProfileData> => {
      if (!user?.id) {
        return {
          name: 'Usuario',
          height: null,
          current_weight: null,
          target_weight: null,
          avatar_icon: 'apple',
          avatar_color: '#10B981',
          water_goal_ml: null,
          burn_goal_kcal: null,
          calories_goal: null,
          steps_goal: null,
        };
      }

      const [
        { data: authData },
        { data: profileData },
        { data: latestWeight },
        { data: nutritionGoals },
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from('profiles')
          .select('name, height, current_weight, target_weight, avatar_icon, avatar_color, share_foods_with_community, water_goal_ml, burn_goal_kcal, steps_goal')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('daily_weight')
          .select('weight, date, created_at')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('nutrition_goals')
          .select('calories_goal')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      const metaName = authData.user?.user_metadata?.name as string | undefined;
      const currentWeight =
        latestWeight?.weight !== undefined && latestWeight?.weight !== null
          ? Number(latestWeight.weight)
          : profileData?.current_weight ?? null;

      return {
        name: profileData?.name || metaName || 'Usuario',
        height: profileData?.height ?? null,
        current_weight: currentWeight,
        target_weight: profileData?.target_weight ?? null,
        avatar_icon: profileData?.avatar_icon || 'apple',
        avatar_color: profileData?.avatar_color || '#10B981',
        share_foods_with_community: profileData?.share_foods_with_community ?? false,
        water_goal_ml: profileData?.water_goal_ml ?? null,
        burn_goal_kcal: profileData?.burn_goal_kcal ?? null,
        calories_goal: nutritionGoals?.calories_goal ?? null,
        steps_goal: profileData?.steps_goal ?? null,
      };
    },
    enabled: !!user?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<ProfileData>) => {
      if (!user?.id) throw new Error('No user');

      const updateData: Record<string, any> = {};
      if (data.height !== undefined) updateData.height = data.height;
      if (data.current_weight !== undefined) updateData.current_weight = data.current_weight;
      if (data.target_weight !== undefined) updateData.target_weight = data.target_weight;
      if (data.avatar_icon !== undefined) updateData.avatar_icon = data.avatar_icon;
      if (data.avatar_color !== undefined) updateData.avatar_color = data.avatar_color;
      if (data.name !== undefined) updateData.name = data.name;
      if (data.share_foods_with_community !== undefined) {
        updateData.share_foods_with_community = data.share_foods_with_community;
      }
      if (data.water_goal_ml !== undefined) updateData.water_goal_ml = data.water_goal_ml;
      if (data.burn_goal_kcal !== undefined) updateData.burn_goal_kcal = data.burn_goal_kcal;
      if (data.steps_goal !== undefined) updateData.steps_goal = data.steps_goal;

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', user.id);

        if (error) throw error;
      }

      if (data.calories_goal !== undefined) {
        const { error: goalsError } = await supabase
          .from('nutrition_goals')
          .upsert({
            user_id: user.id,
            calories_goal: data.calories_goal,
          }, { onConflict: 'user_id' });

        if (goalsError) throw goalsError;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`daily_weight_changes:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_weight',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    profile: query.data,
    isLoading: query.isLoading,
    updateProfile: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
};
