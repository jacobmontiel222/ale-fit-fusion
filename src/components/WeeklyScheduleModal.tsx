import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { useWorkoutTemplates } from '@/hooks/useWorkoutTemplates';
import { useWeeklySchedule } from '@/hooks/useWeeklySchedule';
import { Palette } from 'lucide-react';

interface WeeklyScheduleModalProps {
  open: boolean;
  onClose: () => void;
}

const COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
];

export const WeeklyScheduleModal = ({ open, onClose }: WeeklyScheduleModalProps) => {
  const { t } = useTranslation();
  const { templates } = useWorkoutTemplates();
  const { schedule, setDaySchedule } = useWeeklySchedule();
  const [editingColorTemplateId, setEditingColorTemplateId] = useState<string | null>(null);
  const { updateTemplate } = useWorkoutTemplates();

  const dayNames = [
    t('gym.days.monday'),
    t('gym.days.tuesday'),
    t('gym.days.wednesday'),
    t('gym.days.thursday'),
    t('gym.days.friday'),
    t('gym.days.saturday'),
    t('gym.days.sunday'),
  ];

  const handleUpdateColor = async (templateId: string, newColor: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    await updateTemplate({ id: templateId, name: template.name, color: newColor });
    setEditingColorTemplateId(null);
  };

  const handleSetDay = async (dayOfWeek: number, templateId: string | 'rest') => {
    if (templateId === 'rest') {
      await setDaySchedule({ dayOfWeek, isRestDay: true });
    } else {
      await setDaySchedule({ dayOfWeek, templateId, isRestDay: false });
    }
  };

  const getScheduleForDay = (dayOfWeek: number) => {
    return schedule.find((s) => s.day_of_week === dayOfWeek);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle>{t('gym.scheduleWeek')}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* Días de la semana */}
          {dayNames.map((dayName, index) => {
            const scheduleEntry = getScheduleForDay(index);
            const selectedTemplate = templates.find((t) => t.id === scheduleEntry?.template_id);

            return (
              <div key={index} className="space-y-2">
                <Label>{dayName}</Label>
                <Select
                  value={
                    scheduleEntry?.is_rest_day
                      ? 'rest'
                      : scheduleEntry?.template_id || 'none'
                  }
                  onValueChange={(value) => handleSetDay(index, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('gym.selectRoutine')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('gym.noRoutine')}</SelectItem>
                    <SelectItem value="rest">{t('gym.restDay')}</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: template.color }}
                          />
                          {template.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate && (
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1"
                      onClick={() => setEditingColorTemplateId(selectedTemplate.id)}
                    >
                      <Palette className="w-4 h-4" />
                    </Button>
                    <div
                      className="h-1 rounded-full flex-1"
                      style={{ backgroundColor: selectedTemplate.color }}
                    />
                  </div>
                )}
                {editingColorTemplateId === selectedTemplate?.id && (
                  <div className="flex gap-2 mt-2">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        className="w-6 h-6 rounded-full border-2 border-border hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        onClick={() => handleUpdateColor(selectedTemplate.id, color)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
