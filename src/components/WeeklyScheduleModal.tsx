import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { useWorkoutTemplates } from '@/hooks/useWorkoutTemplates';
import { useWeeklySchedule } from '@/hooks/useWeeklySchedule';
import { Plus, Settings } from 'lucide-react';
import { TemplateExercisesModal } from '@/components/TemplateExercisesModal';

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
  const { templates, createTemplate } = useWorkoutTemplates();
  const { schedule, setDaySchedule } = useWeeklySchedule();
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateColor, setNewTemplateColor] = useState(COLORS[0]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState('');

  const dayNames = [
    t('gym.days.monday'),
    t('gym.days.tuesday'),
    t('gym.days.wednesday'),
    t('gym.days.thursday'),
    t('gym.days.friday'),
    t('gym.days.saturday'),
    t('gym.days.sunday'),
  ];

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) return;
    await createTemplate({ name: newTemplateName, color: newTemplateColor });
    setNewTemplateName('');
    setShowNewTemplate(false);
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
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('gym.scheduleWeek')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
                    <div
                      className="h-1 rounded-full flex-1"
                      style={{ backgroundColor: selectedTemplate.color }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingTemplateId(selectedTemplate.id);
                        setEditingTemplateName(selectedTemplate.name);
                      }}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Crear nueva plantilla */}
          {!showNewTemplate && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowNewTemplate(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('gym.newTemplate')}
            </Button>
          )}

          {showNewTemplate && (
            <div className="space-y-3 border rounded-lg p-4">
              <Label>{t('gym.templateName')}</Label>
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder={t('gym.templateNamePlaceholder')}
              />
              <Label>{t('gym.color')}</Label>
              <div className="flex gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      newTemplateColor === color ? 'border-foreground' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewTemplateColor(color)}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowNewTemplate(false)} className="flex-1">
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleCreateTemplate} className="flex-1">
                  {t('common.save')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {editingTemplateId && (
          <TemplateExercisesModal
            open={!!editingTemplateId}
            onClose={() => {
              setEditingTemplateId(null);
              setEditingTemplateName('');
            }}
            templateId={editingTemplateId}
            templateName={editingTemplateName}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
