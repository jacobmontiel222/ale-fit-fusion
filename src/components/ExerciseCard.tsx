import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatsCard } from "@/components/StatsCard";
import { useWorkoutSessions } from "@/hooks/useWorkoutSessions";
import { toast } from "sonner";

interface ExerciseSet {
  set: number;
  weight: number;
  reps: number;
  completed: boolean;
}

interface ExerciseCardProps {
  sessionId: string;
  exerciseName: string;
  exerciseType: 'compound' | 'accessory' | 'calisthenics' | 'cardio';
  repsMin: number;
  repsMax: number;
  onSave: () => void;
}

export const ExerciseCard = ({
  sessionId,
  exerciseName,
  exerciseType,
  repsMin,
  repsMax,
  onSave,
}: ExerciseCardProps) => {
  const { t } = useTranslation();
  const { saveExerciseHistory, getLastExerciseData } = useWorkoutSessions();
  const [sets, setSets] = useState<ExerciseSet[]>([
    { set: 1, weight: 0, reps: repsMin, completed: false },
  ]);
  const [notes, setNotes] = useState("");
  const [goalAchieved, setGoalAchieved] = useState(true);
  const [techniquegood, setTechniqueGood] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);

  const handleAddSet = () => {
    const lastSet = sets[sets.length - 1];
    setSets([...sets, { 
      set: sets.length + 1,
      weight: lastSet?.weight || 0, 
      reps: lastSet?.reps || repsMin, 
      completed: false 
    }]);
  };

  const handleSetChange = (index: number, field: keyof ExerciseSet, value: number | boolean) => {
    const newSets = [...sets];
    newSets[index] = { ...newSets[index], [field]: value };
    setSets(newSets);
  };

  const handleLoadPrevious = async () => {
    setIsLoadingPrevious(true);
    try {
      const lastData = await getLastExerciseData(exerciseName);
      if (lastData && lastData.sets_data) {
        const previousSets = (lastData.sets_data as ExerciseSet[]).map((set, index) => ({
          ...set,
          set: index + 1,
          completed: false,
        }));
        setSets(previousSets);
        toast.success(t('gym.previousDataLoaded'));
      } else {
        toast.info(t('gym.noPreviousData'));
      }
    } catch (error) {
      console.error('Error loading previous data:', error);
      toast.error(t('common.error'));
    } finally {
      setIsLoadingPrevious(false);
    }
  };

  const handleSave = async () => {
    try {
      await saveExerciseHistory({
        sessionId,
        exerciseName,
        setsData: sets,
        notes: notes || null,
        goalAchieved,
        techniqueGood: techniquegood,
      });
      setIsSaved(true);
      onSave();
      toast.success(t('gym.exerciseSaved'));
    } catch (error) {
      console.error('Error saving exercise:', error);
      toast.error(t('common.error'));
    }
  };

  const allSetsCompleted = sets.every(set => set.completed);

  return (
    <StatsCard className={isSaved ? 'border-2 border-primary' : ''}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{exerciseName}</h3>
            <p className="text-sm text-muted-foreground">
              {t(`gym.exerciseTypes.${exerciseType}`)} • {repsMin}-{repsMax} {t('gym.reps')}
            </p>
          </div>
          {isSaved && <Check className="w-5 h-5 text-primary" />}
        </div>

        {/* Load Previous Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLoadPrevious}
          disabled={isLoadingPrevious}
          className="w-full"
        >
          {isLoadingPrevious ? t('common.loading') : t('gym.loadPrevious')}
        </Button>

        {/* Sets */}
        <div className="space-y-2">
          {sets.map((set, index) => (
            <div key={index} className="flex items-center gap-2">
              <Checkbox
                checked={set.completed}
                onCheckedChange={(checked) =>
                  handleSetChange(index, 'completed', checked as boolean)
                }
              />
              <span className="text-sm text-muted-foreground min-w-[60px]">
                {t('gym.series')} {index + 1}
              </span>
              <Input
                type="number"
                value={set.weight}
                onChange={(e) => handleSetChange(index, 'weight', parseFloat(e.target.value))}
                className="w-20"
                placeholder="kg"
              />
              <span className="text-xs text-muted-foreground">kg</span>
              <Input
                type="number"
                value={set.reps}
                onChange={(e) => handleSetChange(index, 'reps', parseInt(e.target.value))}
                className="w-20"
                placeholder={t('gym.reps')}
              />
              <span className="text-xs text-muted-foreground">{t('gym.reps')}</span>
            </div>
          ))}
        </div>

        {/* Add Set Button */}
        <Button variant="outline" size="sm" onClick={handleAddSet} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          {t('gym.addSet')}
        </Button>

        {/* Goal and Technique */}
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`goal-${exerciseName}`}
              checked={goalAchieved}
              onCheckedChange={(checked) => setGoalAchieved(checked as boolean)}
            />
            <Label htmlFor={`goal-${exerciseName}`} className="text-sm">
              {t('gym.objective')}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`technique-${exerciseName}`}
              checked={techniquegood}
              onCheckedChange={(checked) => setTechniqueGood(checked as boolean)}
            />
            <Label htmlFor={`technique-${exerciseName}`} className="text-sm">
              {t('gym.goodTechnique')}
            </Label>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor={`notes-${exerciseName}`}>{t('gym.notes')}</Label>
          <Textarea
            id={`notes-${exerciseName}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('gym.notesPlaceholder')}
            rows={2}
          />
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={!allSetsCompleted || isSaved}
          className="w-full"
        >
          {isSaved ? t('gym.exerciseSaved') : t('common.save')}
        </Button>
      </div>
    </StatsCard>
  );
};
