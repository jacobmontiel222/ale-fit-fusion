import { useState, useEffect } from 'react';
import { StatsCard } from '@/components/StatsCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Save, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useProgressionLogic } from '@/hooks/useProgressionLogic';
import { useWorkoutSessions } from '@/hooks/useWorkoutSessions';

interface Set {
  set: number;
  weight: number;
  reps: number;
  rpe?: number;
  completed: boolean;
}

interface ExerciseCardProps {
  sessionId: string;
  exerciseName: string;
  exerciseType: 'compound' | 'accessory' | 'calisthenics';
  repsMin: number;
  repsMax: number;
  onSave?: () => void;
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
  const { calculateProgression } = useProgressionLogic();
  const { getLastExerciseData, saveExerciseHistory } = useWorkoutSessions(sessionId);
  
  const [sets, setSets] = useState<Set[]>([
    { set: 1, weight: 0, reps: 0, completed: false }
  ]);
  const [suggestedWeight, setSuggestedWeight] = useState<number>(0);
  const [suggestedRepsMin, setSuggestedRepsMin] = useState<number>(repsMin);
  const [suggestedRepsMax, setSuggestedRepsMax] = useState<number>(repsMax);
  const [progressionMessage, setProgressionMessage] = useState<string>('');
  const [techniqueGood, setTechniqueGood] = useState(true);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadLastData = async () => {
      const lastData = await getLastExerciseData(exerciseName);
      
      if (lastData) {
        const lastSets = lastData.sets_data as Set[];
        const lastEffectiveSet = lastSets[lastSets.length - 1];

        const progression = calculateProgression(
          {
            weight: lastEffectiveSet.weight,
            reps: lastEffectiveSet.reps,
            technique_good: lastData.technique_good,
            rpe: lastEffectiveSet.rpe,
          },
          exerciseType,
          repsMin,
          repsMax
        );

        setSuggestedWeight(progression.suggestedWeight);
        setSuggestedRepsMin(progression.suggestedRepsMin);
        setSuggestedRepsMax(progression.suggestedRepsMax);
        setProgressionMessage(progression.message);

        // Inicializar con los valores sugeridos
        setSets([
          {
            set: 1,
            weight: progression.suggestedWeight,
            reps: progression.suggestedRepsMin,
            completed: false,
          },
        ]);
      }
    };

    loadLastData();
  }, [exerciseName, exerciseType, repsMin, repsMax]);

  const addSet = () => {
    const lastSet = sets[sets.length - 1];
    setSets([
      ...sets,
      {
        set: sets.length + 1,
        weight: lastSet.weight,
        reps: lastSet.reps,
        rpe: lastSet.rpe,
        completed: false,
      },
    ]);
  };

  const updateSet = (index: number, field: keyof Set, value: any) => {
    const newSets = [...sets];
    newSets[index] = { ...newSets[index], [field]: value };
    setSets(newSets);
  };

  const deleteSet = (index: number) => {
    if (sets.length === 1) return;
    setSets(sets.filter((_, i) => i !== index).map((s, i) => ({ ...s, set: i + 1 })));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Verificar si se cumplió el objetivo
      const completedSets = sets.filter(s => s.completed);
      const lastSet = completedSets[completedSets.length - 1];
      
      let goalAchieved = false;
      if (lastSet) {
        goalAchieved = lastSet.weight >= suggestedWeight && lastSet.reps >= suggestedRepsMin;
      }

      await saveExerciseHistory({
        sessionId,
        exerciseName,
        setsData: sets,
        suggestedWeight,
        suggestedRepsMin,
        suggestedRepsMax,
        goalAchieved,
        techniqueGood,
        notes: notes || undefined,
      });

      onSave?.();
    } catch (error) {
      console.error('Error saving exercise:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <StatsCard>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">{exerciseName}</h3>
            {progressionMessage && (
              <div className="flex items-center gap-2 mt-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary font-medium">
                  {progressionMessage}
                </span>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              {t('gym.objective')}: {suggestedWeight}kg × {suggestedRepsMin}-{suggestedRepsMax} {t('gym.reps').toLowerCase()}
            </p>
          </div>
        </div>

        {/* Sets Table */}
        <div className="space-y-2">
          <div className="grid grid-cols-6 gap-2 text-xs text-muted-foreground font-medium">
            <span className="text-center">{t('gym.series')}</span>
            <span className="text-center">Kg</span>
            <span className="text-center">{t('gym.reps')}</span>
            <span className="text-center">{t('gym.rpe')}</span>
            <span className="text-center">✓</span>
            <span></span>
          </div>

          {sets.map((set, index) => (
            <div key={index} className="grid grid-cols-6 gap-2">
              <div className="flex items-center justify-center text-sm font-semibold">
                {set.set}
              </div>
              <Input
                type="number"
                value={set.weight || ''}
                onChange={(e) => updateSet(index, 'weight', Number(e.target.value))}
                className="h-9 text-center text-sm"
                step="0.5"
              />
              <Input
                type="number"
                value={set.reps || ''}
                onChange={(e) => updateSet(index, 'reps', Number(e.target.value))}
                className="h-9 text-center text-sm"
              />
              <Input
                type="number"
                value={set.rpe || ''}
                onChange={(e) => updateSet(index, 'rpe', Number(e.target.value) || undefined)}
                className="h-9 text-center text-sm"
                placeholder="-"
                min="1"
                max="10"
              />
              <div className="flex items-center justify-center">
                <Switch
                  checked={set.completed}
                  onCheckedChange={(checked) => updateSet(index, 'completed', checked)}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => deleteSet(index)}
                disabled={sets.length === 1}
              >
                ×
              </Button>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addSet} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            {t('gym.addSet')}
          </Button>
        </div>

        {/* Technique Toggle */}
        <div className="flex items-center justify-between py-2 border-t">
          <Label htmlFor={`technique-${exerciseName}`} className="text-sm">
            {t('gym.goodTechnique')}
          </Label>
          <Switch
            id={`technique-${exerciseName}`}
            checked={techniqueGood}
            onCheckedChange={setTechniqueGood}
          />
        </div>

        {/* Notes */}
        {showNotes ? (
          <div className="space-y-2 border-t pt-3">
            <Label className="text-sm">{t('gym.notes')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('gym.notesPlaceholder')}
              rows={3}
              className="text-sm"
            />
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNotes(true)}
            className="w-full"
          >
            {t('gym.addNotes')}
          </Button>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isSaving || !sets.some(s => s.completed)}
          className="w-full"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </StatsCard>
  );
};
