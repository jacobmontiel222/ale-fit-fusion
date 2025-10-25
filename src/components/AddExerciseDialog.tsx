import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface AddExerciseDialogProps {
  open: boolean;
  onClose: () => void;
  templateId: string;
  onExerciseAdded: () => void;
}

export const AddExerciseDialog = ({ open, onClose, templateId, onExerciseAdded }: AddExerciseDialogProps) => {
  const { t } = useTranslation();
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseType, setExerciseType] = useState("compound");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!exerciseName.trim()) return;

    setSaving(true);
    try {
      // Get the current max order_index
      const { data: existingExercises } = await supabase
        .from('template_exercises')
        .select('order_index')
        .eq('template_id', templateId)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = existingExercises && existingExercises.length > 0 
        ? existingExercises[0].order_index + 1 
        : 0;

      const { error } = await supabase
        .from('template_exercises')
        .insert({
          template_id: templateId,
          exercise_name: exerciseName.trim(),
          exercise_type: exerciseType,
          reps_min: 5,
          reps_max: 8,
          order_index: nextOrderIndex,
          planned_sets: [],
        });

      if (error) throw error;

      setExerciseName("");
      setExerciseType("compound");
      onExerciseAdded();
      onClose();
    } catch (error) {
      console.error('Error adding exercise:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('gym.addExercise')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="exercise-name">{t('gym.exerciseName')}</Label>
            <Input
              id="exercise-name"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              placeholder={t('gym.enterExerciseName')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exercise-type">{t('gym.exerciseType')}</Label>
            <Select value={exerciseType} onValueChange={setExerciseType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compound">{t('gym.exerciseTypes.compound')}</SelectItem>
                <SelectItem value="accessory">{t('gym.exerciseTypes.accessory')}</SelectItem>
                <SelectItem value="calisthenics">{t('gym.exerciseTypes.calisthenics')}</SelectItem>
                <SelectItem value="cardio">{t('gym.exerciseTypes.cardio')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!exerciseName.trim() || saving}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
