import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

      // Get name from session metadata
      const { data: authData } = await supabase.auth.getUser();
      const metaName = authData.user?.user_metadata?.name as string | undefined;

      // Get profile data from database
      const { data } = await supabase
        .from('profiles')
        .select('name, height, current_weight, target_weight, avatar_icon, avatar_color')
        .eq('id', user.id)
        .maybeSingle();

      return {
        name: data?.name || metaName || 'Usuario',
        height: data?.height ?? null,
        current_weight: data?.current_weight ?? null,
        target_weight: data?.target_weight ?? null,
        avatar_icon: data?.avatar_icon || 'apple',
        avatar_color: data?.avatar_color || '#10B981',
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

  return {
    profile: query.data,
    isLoading: query.isLoading,
    updateProfile: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
};
