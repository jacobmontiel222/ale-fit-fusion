import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { useWorkoutTemplates } from '@/hooks/useWorkoutTemplates';
import { Plus, Search, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TemplateExercisesModalProps {
  open: boolean;
  onClose: () => void;
  templateId: string;
  templateName: string;
}

const exerciseLibrary = [
  "gym.exercises.squat",
  "gym.exercises.legPress",
  "gym.exercises.legExtension",
  "gym.exercises.legCurl",
  "gym.exercises.calves",
  "gym.exercises.benchPress",
  "gym.exercises.inclinePress",
  "gym.exercises.flyes",
  "gym.exercises.pullups",
  "gym.exercises.barbellRow",
  "gym.exercises.deadlift",
  "gym.exercises.hipThrust",
];

export const TemplateExercisesModal = ({
  open,
  onClose,
  templateId,
  templateName,
}: TemplateExercisesModalProps) => {
  const { t } = useTranslation();
  const { templates, addExerciseToTemplate } = useWorkoutTemplates();
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExercise, setNewExercise] = useState({
    name: '',
    type: 'compound' as 'compound' | 'accessory' | 'calisthenics',
    repsMin: 5,
    repsMax: 8,
  });

  const template = templates.find((t) => t.id === templateId);
  const exercises = template?.template_exercises || [];

  const filteredLibrary = exerciseLibrary.filter((ex) =>
    t(ex).toLowerCase().includes(search.toLowerCase())
  );

  const handleAddExercise = async () => {
    if (!newExercise.name) return;

    try {
      await addExerciseToTemplate({
        template_id: templateId,
        exercise_name: newExercise.name,
        exercise_type: newExercise.type,
        reps_min: newExercise.repsMin,
        reps_max: newExercise.repsMax,
        order_index: exercises.length,
      });

      toast({
        title: t('gym.exerciseAdded'),
        description: `${newExercise.name} ${t('gym.addedToTemplate')}`,
      });

      setNewExercise({
        name: '',
        type: 'compound',
        repsMin: 5,
        repsMax: 8,
      });
      setShowAddForm(false);
      setSearch('');
    } catch (error) {
      console.error('Error adding exercise:', error);
      toast({
        title: t('common.error'),
        description: t('gym.errorAddingExercise'),
        variant: 'destructive',
      });
    }
  };

  const handleSelectFromLibrary = (exerciseKey: string) => {
    const exerciseName = t(exerciseKey);
    setNewExercise({
      ...newExercise,
      name: exerciseName,
    });
    setShowAddForm(true);
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {templateName} - {t('gym.exercisesLabel')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Exercises */}
          {exercises.length > 0 && (
            <div className="space-y-2">
              <Label>{t('gym.currentExercises')}</Label>
              {exercises
                .sort((a, b) => a.order_index - b.order_index)
                .map((exercise) => (
                  <div
                    key={exercise.id}
                    className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{exercise.exercise_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {exercise.reps_min}-{exercise.reps_max} {t('gym.reps').toLowerCase()} •{' '}
                        {t(`gym.exerciseTypes.${exercise.exercise_type}`)}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
            </div>
          )}

          {/* Add Exercise */}
          {!showAddForm && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('gym.searchExercise')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {search && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {filteredLibrary.map((exerciseKey) => (
                    <Button
                      key={exerciseKey}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleSelectFromLibrary(exerciseKey)}
                    >
                      {t(exerciseKey)}
                    </Button>
                  ))}
                </div>
              )}

              <Button variant="outline" className="w-full" onClick={() => setShowAddForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('gym.addCustomExercise')}
              </Button>
            </>
          )}

          {/* Add Form */}
          {showAddForm && (
            <div className="space-y-3 border rounded-lg p-4">
              <div className="space-y-2">
                <Label>{t('gym.exerciseName')}</Label>
                <Input
                  value={newExercise.name}
                  onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                  placeholder={t('gym.exerciseNamePlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('gym.exerciseType')}</Label>
                <Select
                  value={newExercise.type}
                  onValueChange={(value: any) => {
                    const defaultRanges = {
                      compound: { min: 5, max: 8 },
                      accessory: { min: 10, max: 15 },
                      calisthenics: { min: 6, max: 12 },
                    };
                    setNewExercise({
                      ...newExercise,
                      type: value,
                      repsMin: defaultRanges[value].min,
                      repsMax: defaultRanges[value].max,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compound">{t('gym.exerciseTypes.compound')}</SelectItem>
                    <SelectItem value="accessory">{t('gym.exerciseTypes.accessory')}</SelectItem>
                    <SelectItem value="calisthenics">
                      {t('gym.exerciseTypes.calisthenics')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t('gym.repsMin')}</Label>
                  <Input
                    type="number"
                    value={newExercise.repsMin}
                    onChange={(e) =>
                      setNewExercise({ ...newExercise, repsMin: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('gym.repsMax')}</Label>
                  <Input
                    type="number"
                    value={newExercise.repsMax}
                    onChange={(e) =>
                      setNewExercise({ ...newExercise, repsMax: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewExercise({
                      name: '',
                      type: 'compound',
                      repsMin: 5,
                      repsMax: 8,
                    });
                  }}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleAddExercise} className="flex-1" disabled={!newExercise.name}>
                  {t('common.add')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
