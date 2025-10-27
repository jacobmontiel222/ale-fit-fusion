import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

type SetStatus = 'pending' | 'success' | 'failed';

interface PlannedSet {
  weight?: number;
  reps?: number;
  minutes?: number;
  status?: SetStatus;
}

interface TemplateExercise {
  id: string;
  exercise_name: string;
  exercise_type: string;
  planned_sets: PlannedSet[];
}

interface GhostSetValue {
  weight_kg: number | null;
  reps: number | null;
}

interface TemplateExerciseCardProps {
  exercise: TemplateExercise;
  onUpdate: () => void;
  ghostValues?: Record<number, GhostSetValue>;
  selectedDate: Date;
  userId?: string;
}

export const TemplateExerciseCard = ({
  exercise,
  onUpdate,
  ghostValues,
  selectedDate,
  userId,
}: TemplateExerciseCardProps) => {
  const { t } = useTranslation();
  const [sets, setSets] = useState<PlannedSet[]>(exercise.planned_sets || []);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const isCardio = exercise.exercise_type === "cardio";

  const formatGhostNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined) {
      return '—';
    }
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return '—';
    }
    return Number.isInteger(numeric)
      ? numeric.toString()
      : numeric.toFixed(1).replace(/\.0$/, '');
  };

  const handleAddSet = async () => {
    const newSet: PlannedSet = isCardio 
      ? { minutes: 10, status: 'pending' }
      : { weight: undefined, reps: undefined, status: 'pending' };
    
    const updatedSets = [...sets, newSet];
    setSets(updatedSets);
    await saveSets(updatedSets);
  };

  const handleStatusToggle = async (index: number) => {
    const updatedSets = [...sets];
    const currentStatus = updatedSets[index].status || 'pending';
    
    // Cycle through: pending -> success -> failed -> pending
    const nextStatus: SetStatus = 
      currentStatus === 'pending' ? 'success' :
      currentStatus === 'success' ? 'failed' : 'pending';
    
    updatedSets[index] = { ...updatedSets[index], status: nextStatus };
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

  const handleSetChange = async (index: number, field: keyof PlannedSet, value: number | undefined) => {
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

  const persistGymSets = async (updatedSets: PlannedSet[]) => {
    if (!userId || isCardio) {
      return;
    }

    const workoutDate = new Date(selectedDate);
    workoutDate.setHours(0, 0, 0, 0);
    const dateString = workoutDate.toISOString().split('T')[0];
    const timestamp = workoutDate.toISOString();

    const entries = updatedSets
      .map((set, idx) => ({
        user_id: userId,
        exercise_id: exercise.id,
        set_number: idx + 1,
        weight_kg: set.weight ?? null,
        reps: set.reps ?? null,
        date: dateString,
        performed_at: timestamp,
      }))
      .filter((entry) => entry.weight_kg !== null || entry.reps !== null);

    if (entries.length === 0) {
      return;
    }

    const { error } = await supabase
      .from('gym_sets')
      .upsert(entries, { onConflict: 'user_id,exercise_id,set_number,date' });

    if (error) {
      console.error('Error saving gym sets history:', error);
    }
  };

  const saveSets = async (updatedSets: PlannedSet[]) => {
    const { error } = await supabase
      .from('template_exercises')
      .update({ planned_sets: updatedSets as any })
      .eq('id', exercise.id);

    if (error) {
      console.error('Error saving sets:', error);
      return;
    }

    await persistGymSets(updatedSets);
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
        {sets.map((set, index) => {
          const status = set.status || 'pending';
          const ghostEntry = ghostValues?.[index + 1];
          const ghostText = ghostEntry
            ? `${formatGhostNumber(ghostEntry.weight_kg)} × ${formatGhostNumber(ghostEntry.reps)}`
            : null;
          const weightGhostText = ghostText ?? 'KG';
          const repsGhostText = ghostText ?? 'reps';
          const hasWeightValue = typeof set.weight === 'number' && !Number.isNaN(set.weight);
          const hasRepsValue = typeof set.reps === 'number' && !Number.isNaN(set.reps);
          return (
            <div key={index} className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {t('gym.series')} {index + 1}
              </span>
              
              {isCardio ? (
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    type="number"
                    value={set.minutes ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      const parsed = value === '' ? undefined : parseFloat(value);
                      handleSetChange(
                        index,
                        'minutes',
                        parsed === undefined || Number.isNaN(parsed) ? undefined : parsed,
                      );
                    }}
                    className="w-20 h-8"
                    placeholder={t('gym.minutes')}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{t('gym.minutes')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 flex-1">
                  <div className="relative w-16 h-8">
                    <Input
                      type="number"
                      value={set.weight ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        const parsed = value === '' ? undefined : parseFloat(value);
                        handleSetChange(
                          index,
                          'weight',
                          parsed === undefined || Number.isNaN(parsed) ? undefined : parsed,
                        );
                      }}
                      className="w-full h-full peer"
                      aria-label={`Set ${index + 1} peso (kg)`}
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute inset-0 flex items-center px-3 text-sm text-[#ffffff33] transition-opacity",
                        "peer-focus:opacity-0",
                        hasWeightValue ? "opacity-0" : "opacity-100",
                      )}
                    >
                      {weightGhostText}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">kg</span>
                  
                  <div className="relative w-16 h-8">
                    <Input
                      type="number"
                      value={set.reps ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        const parsed = value === '' ? undefined : parseInt(value, 10);
                        handleSetChange(
                          index,
                          'reps',
                          parsed === undefined || Number.isNaN(parsed) ? undefined : parsed,
                        );
                      }}
                      className="w-full h-full peer"
                      aria-label={`Set ${index + 1} repeticiones`}
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute inset-0 flex items-center px-3 text-sm text-[#ffffff33] transition-opacity",
                        "peer-focus:opacity-0",
                        hasRepsValue ? "opacity-0" : "opacity-100",
                      )}
                    >
                      {repsGhostText}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{t('gym.reps')}</span>
                </div>
              )}
              
              {/* Status button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleStatusToggle(index)}
                className={cn(
                  "h-8 w-8 shrink-0",
                  status === 'success' && "text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100",
                  status === 'failed' && "text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100"
                )}
              >
                {status === 'success' && <Check className="w-4 h-4" />}
                {status === 'failed' && <X className="w-4 h-4" />}
                {status === 'pending' && <Check className="w-4 h-4 opacity-30" />}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteSet(index)}
                className="text-destructive hover:text-destructive h-8 w-8 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          );
        })}
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
