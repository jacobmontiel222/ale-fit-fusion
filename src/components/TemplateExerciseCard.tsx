import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PlannedSet {
  weight?: number;
  reps?: number;
  minutes?: number;
}

interface TemplateExercise {
  id: string;
  exercise_name: string;
  exercise_type: string;
  planned_sets: PlannedSet[];
}

interface TemplateExerciseCardProps {
  exercise: TemplateExercise;
  onUpdate: () => void;
}

export const TemplateExerciseCard = ({ exercise, onUpdate }: TemplateExerciseCardProps) => {
  const { t } = useTranslation();
  const [sets, setSets] = useState<PlannedSet[]>(exercise.planned_sets || []);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const isCardio = exercise.exercise_type === "cardio";

  const handleAddSet = async () => {
    const newSet: PlannedSet = isCardio 
      ? { minutes: 10 }
      : { weight: undefined, reps: 10 };
    
    const updatedSets = [...sets, newSet];
    setSets(updatedSets);
    await saveSets(updatedSets);
  };

  const confirmDeleteExercise = async () => {
    const { error } = await supabase
      .from('template_exercises')
      .delete()
      .eq('id', exercise.id);

    if (error) {
      toast.error(t('common.error'));
      return;
    }

    toast.success(t('gym.exerciseDeleted'));
    setShowDeleteDialog(false);
    onUpdate();
  };

  const handleSetChange = async (index: number, field: keyof PlannedSet, value: number) => {
    const updatedSets = [...sets];
    updatedSets[index] = { ...updatedSets[index], [field]: value };
    setSets(updatedSets);
    await saveSets(updatedSets);
  };

  const handleDeleteSet = async (index: number) => {
    const updatedSets = sets.filter((_, i) => i !== index);
    setSets(updatedSets);
    await saveSets(updatedSets);
  };

  const saveSets = async (updatedSets: PlannedSet[]) => {
    const { error } = await supabase
      .from('template_exercises')
      .update({ planned_sets: updatedSets as any })
      .eq('id', exercise.id);

    if (error) {
      console.error('Error saving sets:', error);
    }
  };

  return (
    <div className="p-4 rounded-lg bg-card border border-border space-y-3">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {exercise.exercise_name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t(`gym.exerciseTypes.${exercise.exercise_type}`)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowDeleteDialog(true)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('gym.deleteExerciseTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('gym.deleteExerciseConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteExercise}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sets */}
      <div className="space-y-2">
        {sets.map((set, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground min-w-[60px]">
              {t('gym.series')} {index + 1}
            </span>
            
            {isCardio ? (
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Input
                  type="number"
                  value={set.minutes || ""}
                  onChange={(e) => handleSetChange(index, 'minutes', parseFloat(e.target.value) || 0)}
                  className="w-24"
                  placeholder={t('gym.minutes')}
                />
                <span className="text-sm text-muted-foreground">{t('gym.minutes')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1 min-w-[200px] flex-wrap">
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={set.weight || ""}
                    onChange={(e) => handleSetChange(index, 'weight', parseFloat(e.target.value) || 0)}
                    className="w-20"
                    placeholder={t('gym.kg')}
                  />
                  <span className="text-xs text-muted-foreground">kg</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={set.reps || ""}
                    onChange={(e) => handleSetChange(index, 'reps', parseInt(e.target.value) || 0)}
                    className="w-20"
                    placeholder={t('gym.reps')}
                  />
                  <span className="text-xs text-muted-foreground">{t('gym.reps')}</span>
                </div>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteSet(index)}
              className="text-destructive hover:text-destructive shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add Set Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAddSet}
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        {t('gym.addSet')}
      </Button>
    </div>
  );
};
