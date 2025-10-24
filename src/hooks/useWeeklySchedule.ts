import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface WeeklyScheduleEntry {
  id: string;
  day_of_week: number; // 0=Lunes, 6=Domingo
  template_id: string | null;
  is_rest_day: boolean;
}

export const useWeeklySchedule = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: schedule = [], isLoading } = useQuery({
    queryKey: ['weeklySchedule', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('weekly_schedule')
        .select('*')
        .eq('user_id', user.id)
        .order('day_of_week', { ascending: true });

      if (error) throw error;
      return data as WeeklyScheduleEntry[];
    },
    enabled: !!user?.id,
  });

  const setDaySchedule = useMutation({
    mutationFn: async ({
      dayOfWeek,
      templateId,
      isRestDay,
    }: {
      dayOfWeek: number;
      templateId?: string;
      isRestDay?: boolean;
    }) => {
      if (!user?.id) throw new Error('No user');

      const { error } = await supabase
        .from('weekly_schedule')
        .upsert(
          {
            user_id: user.id,
            day_of_week: dayOfWeek,
            template_id: templateId || null,
            is_rest_day: isRestDay || false,
          },
          {
            onConflict: 'user_id,day_of_week',
          }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklySchedule', user?.id] });
    },
  });

  return {
    schedule,
    isLoading,
    setDaySchedule: setDaySchedule.mutateAsync,
  };
};
