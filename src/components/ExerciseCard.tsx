import { useEffect, useCallback, useState } from "react";
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
  weight: number | null;
  reps: number | null;
  completed: boolean;
}

interface ExerciseCardProps {
  sessionId: string;
  templateId?: string | null;
  exerciseName: string;
  exerciseType: 'compound' | 'accessory' | 'calisthenics' | 'cardio';
  repsMin: number;
  repsMax: number;
  onSave: () => void;
}

export const ExerciseCard = ({
  sessionId,
  templateId,
  exerciseName,
  exerciseType,
  repsMin,
  repsMax,
  onSave,
}: ExerciseCardProps) => {
  const { t } = useTranslation();
  const { saveExerciseHistory, getPreviousExerciseData } = useWorkoutSessions();
  const [sets, setSets] = useState<ExerciseSet[]>([
    { set: 1, weight: null, reps: null, completed: false },
  ]);
  const [notes, setNotes] = useState("");
  const [goalAchieved, setGoalAchieved] = useState(true);
  const [techniquegood, setTechniqueGood] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
  const [ghostSets, setGhostSets] = useState<Record<number, { weight: number | null; reps: number | null }>>({});

  const normalizeNumericValue = useCallback((value: unknown): number | null => {
    if (typeof value === 'number') {
      return Number.isNaN(value) ? null : value;
    }
    if (typeof value === 'string') {
      const sanitized = value.trim();
      if (sanitized === '') {
        return null;
      }
      const parsed = Number(sanitized.replace(',', '.'));
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadGhostSets = async () => {
      try {
        const lastData = await getPreviousExerciseData(
          exerciseName,
          templateId,
          sessionId,
        );
        if (!isMounted) return;

        if (lastData?.sets_data) {
          const mapped: Record<number, { weight: number | null; reps: number | null }> = {};

          (lastData.sets_data as ExerciseSet[]).forEach((set, idx) => {
            const setNumber =
              typeof set.set === 'number' && !Number.isNaN(set.set)
                ? set.set
                : idx + 1;
            const weightValue = normalizeNumericValue(set.weight);
            const repsValue = normalizeNumericValue(set.reps);

            if (weightValue !== null || repsValue !== null) {
              mapped[setNumber] = {
                weight: weightValue,
                reps: repsValue,
              };
            }
          });

          setGhostSets(mapped);
        } else {
          setGhostSets({});
        }
      } catch (error) {
        console.error('Error fetching previous exercise data:', error);
        if (isMounted) {
          setGhostSets({});
        }
      }
    };

    loadGhostSets();

    return () => {
      isMounted = false;
    };
  }, [exerciseName, getPreviousExerciseData, normalizeNumericValue, sessionId, templateId]);

  useEffect(() => {
    const ghostIndices = Object.keys(ghostSets)
      .map((key) => Number(key))
      .filter((value) => Number.isInteger(value) && value > 0);

    if (ghostIndices.length === 0) {
      return;
    }

    const requiredSets = Math.max(...ghostIndices);

    if (requiredSets > sets.length) {
      setSets((prev) => {
        const updated = [...prev];
        for (let index = prev.length; index < requiredSets; index++) {
          updated.push({
            set: index + 1,
            weight: null,
            reps: null,
            completed: false,
          });
        }
        return updated;
      });
    }
  }, [ghostSets, sets.length]);

  const findGhostValue = useCallback(
    (setIndex: number, field: 'weight' | 'reps') => {
      for (let index = setIndex; index >= 1; index--) {
        const candidate = ghostSets[index];
        if (!candidate) continue;
        const value = candidate[field];
        if (value !== null && value !== undefined) {
          return value;
        }
      }
      return null;
    },
    [ghostSets],
  );

  const formatGhostValue = useCallback((value: number | null | undefined) => {
    if (value === null || value === undefined) {
      return null;
    }
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return null;
    }
    return Number.isInteger(numeric) ? numeric.toString() : numeric.toFixed(1).replace(/\.0$/, '');
  }, []);

  const handleAddSet = () => {
    setSets(prev => [
      ...prev,
      {
        set: prev.length + 1,
        weight: null,
        reps: null,
        completed: false,
      },
    ]);
  };

  const handleSetChange = (
    index: number,
    field: keyof ExerciseSet,
    value: number | boolean | null,
  ) => {
    const newSets = [...sets];
    newSets[index] = { ...newSets[index], [field]: value };
    setSets(newSets);
  };

  const handleLoadPrevious = async () => {
    setIsLoadingPrevious(true);
    try {
      const lastData = await getPreviousExerciseData(
        exerciseName,
        templateId,
        sessionId,
      );
      if (lastData && lastData.sets_data) {
        const previousSets = (lastData.sets_data as ExerciseSet[]).map((set, index) => {
          const weightValue = normalizeNumericValue(set.weight);
          const repsValue = normalizeNumericValue(set.reps);

          return {
            set: index + 1,
            weight: weightValue,
            reps: repsValue,
            completed: false,
          };
        });
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

  const allSetsCompleted = sets.every(
    (set) =>
      set.completed &&
      typeof set.weight === 'number' &&
      !Number.isNaN(set.weight) &&
      typeof set.reps === 'number' &&
      !Number.isNaN(set.reps),
  );

  return (
    <StatsCard className={isSaved ? 'border-2 border-primary' : ''}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{exerciseName}</h3>
            <p className="text-sm text-muted-foreground">
              {t(`gym.exerciseTypes.${exerciseType}`)}{' - '}{repsMin}-{repsMax} {t('gym.reps')}
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
          {sets.map((set, index) => {
            const setIndex = index + 1;
            const ghostWeight = findGhostValue(setIndex, 'weight');
            const ghostReps = findGhostValue(setIndex, 'reps');
            const weightPlaceholder = formatGhostValue(ghostWeight) ?? '';
            const repsPlaceholder = formatGhostValue(ghostReps) ?? '';

            const weightValue =
              typeof set.weight === 'number' && !Number.isNaN(set.weight)
                ? String(set.weight)
                : '';
            const repsValue =
              typeof set.reps === 'number' && !Number.isNaN(set.reps)
                ? String(set.reps)
                : '';

            return (
              <div key={index} className="flex items-center gap-2">
                <Checkbox
                  checked={set.completed}
                  onCheckedChange={(checked) =>
                    handleSetChange(index, 'completed', checked === true)
                  }
                />
                <span className="text-sm text-muted-foreground min-w-[60px]">
                  {t('gym.series')} {setIndex}
                </span>
                <Input
                  type="number"
                  value={weightValue}
                  onChange={(event) => {
                    const raw = event.target.value;
                    if (raw === '') {
                      handleSetChange(index, 'weight', null);
                      return;
                    }
                    const parsed = parseFloat(raw.replace(',', '.'));
                    handleSetChange(
                      index,
                      'weight',
                      Number.isNaN(parsed) ? null : parsed,
                    );
                  }}
                  className="w-20"
                  placeholder={weightPlaceholder}
                  aria-label={`${t('gym.series')} ${setIndex} peso (kg)`}
                />
                <span className="text-xs text-muted-foreground">kg</span>
                <Input
                  type="number"
                  value={repsValue}
                  onChange={(event) => {
                    const raw = event.target.value;
                    if (raw === '') {
                      handleSetChange(index, 'reps', null);
                      return;
                    }
                    const parsed = parseInt(raw.replace(',', '.'), 10);
                    handleSetChange(
                      index,
                      'reps',
                      Number.isNaN(parsed) ? null : parsed,
                    );
                  }}
                  className="w-20"
                  placeholder={repsPlaceholder}
                  aria-label={`${t('gym.series')} ${setIndex} ${t('gym.reps')}`}
                />
                <span className="text-xs text-muted-foreground">{t('gym.reps')}</span>
              </div>
            );
          })}
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
