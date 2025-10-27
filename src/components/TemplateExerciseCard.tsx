import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
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

interface TemplateExerciseCardProps {
  exercise: TemplateExercise;
  onUpdate: () => void;
}

export const TemplateExerciseCard = ({ exercise, onUpdate }: TemplateExerciseCardProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [sets, setSets] = useState<PlannedSet[]>(exercise.planned_sets || []);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [previousData, setPreviousData] = useState<PlannedSet[]>([]);
  const isCardio = exercise.exercise_type === "cardio";

  useEffect(() => {
    const fetchPreviousData = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('exercise_history')
        .select('sets_data')
        .eq('user_id', user.id)
        .eq('exercise_name', exercise.exercise_name)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        setPreviousData(data.sets_data as PlannedSet[]);
      }
    };

    fetchPreviousData();
  }, [user?.id, exercise.exercise_name]);

  const handleAddSet = async () => {
    const newSet: PlannedSet = isCardio 
      ? { minutes: 10, status: 'pending' }
      : { weight: undefined, reps: 10, status: 'pending' };
    
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
        {sets.map((set, index) => {
          const status = set.status || 'pending';
          return (
            <div key={index} className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {t('gym.series')} {index + 1}
              </span>
              
              {isCardio ? (
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    type="number"
                    value={set.minutes || ""}
                    onChange={(e) => handleSetChange(index, 'minutes', parseFloat(e.target.value) || 0)}
                    className="w-20 h-8"
                    placeholder={previousData[index]?.minutes ? `${previousData[index].minutes}` : t('gym.minutes')}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{t('gym.minutes')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 flex-1">
                  <div className="relative">
                    <Input
                      type="number"
                      value={set.weight || ""}
                      onChange={(e) => handleSetChange(index, 'weight', parseFloat(e.target.value) || 0)}
                      className="w-16 h-8"
                      placeholder={previousData[index]?.weight ? `${previousData[index].weight}` : "kg"}
                    />
                    {!set.weight && previousData[index]?.weight && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/30 text-sm pointer-events-none">
                        {previousData[index].weight}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">kg</span>
                  
                  <div className="relative">
                    <Input
                      type="number"
                      value={set.reps || ""}
                      onChange={(e) => handleSetChange(index, 'reps', parseInt(e.target.value) || 0)}
                      className="w-16 h-8"
                      placeholder={previousData[index]?.reps ? `${previousData[index].reps}` : "reps"}
                    />
                    {!set.reps && previousData[index]?.reps && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/30 text-sm pointer-events-none">
                        {previousData[index].reps}
                      </span>
                    )}
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
