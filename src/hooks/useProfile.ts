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
        };
      }

      const [
        { data: authData },
        { data: profileData },
        { data: latestWeight },
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from('profiles')
          .select('name, height, current_weight, target_weight, avatar_icon, avatar_color')
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
      };
    },
    enabled: !!user?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<ProfileData>) => {
      if (!user?.id) throw new Error('No user');

      const { error } = await supabase
        .from('profiles')
        .update({
          height: data.height,
          current_weight: data.current_weight,
          target_weight: data.target_weight,
          avatar_icon: data.avatar_icon,
          avatar_color: data.avatar_color,
        })
        .eq('id', user.id);

      if (error) throw error;
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
