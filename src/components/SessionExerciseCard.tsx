import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Check, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

type SetStatus = 'pending' | 'success' | 'failed';

interface ExerciseSet {
  weight?: number;
  reps?: number;
  minutes?: number;
  status?: SetStatus;
}

interface SessionExerciseCardProps {
  sessionId: string;
  exerciseName: string;
  exerciseType: string;
  templateExerciseId: string;
  onSave?: () => void;
}

export const SessionExerciseCard = ({ 
  sessionId, 
  exerciseName, 
  exerciseType,
  templateExerciseId,
  onSave 
}: SessionExerciseCardProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [sets, setSets] = useState<ExerciseSet[]>([]);
  const [previousData, setPreviousData] = useState<ExerciseSet[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const isCardio = exerciseType === "cardio";

  // Load saved data for this session and previous session data
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;

      // Load saved data for this specific session
      const { data: sessionData } = await supabase
        .from('exercise_history')
        .select('sets_data')
        .eq('session_id', sessionId)
        .eq('exercise_name', exerciseName)
        .single();

      if (sessionData) {
        setSets(sessionData.sets_data as ExerciseSet[]);
      } else {
        // Initialize empty sets from template
        const { data: templateData } = await supabase
          .from('template_exercises')
          .select('planned_sets')
          .eq('id', templateExerciseId)
          .single();

        if (templateData && templateData.planned_sets) {
          setSets(templateData.planned_sets as ExerciseSet[]);
        }
      }

      // Load previous session data for placeholders
      const { data: prevData } = await supabase
        .from('exercise_history')
        .select('sets_data, created_at')
        .eq('user_id', user.id)
        .eq('exercise_name', exerciseName)
        .neq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (prevData) {
        setPreviousData(prevData.sets_data as ExerciseSet[]);
      }
    };

    loadData();
  }, [user?.id, sessionId, exerciseName, templateExerciseId]);

  const handleAddSet = () => {
    const newSet: ExerciseSet = isCardio 
      ? { minutes: undefined, status: 'pending' }
      : { weight: undefined, reps: undefined, status: 'pending' };
    
    setSets([...sets, newSet]);
    setHasChanges(true);
  };

  const handleStatusToggle = (index: number) => {
    const updatedSets = [...sets];
    const currentStatus = updatedSets[index].status || 'pending';
    
    const nextStatus: SetStatus = 
      currentStatus === 'pending' ? 'success' :
      currentStatus === 'success' ? 'failed' : 'pending';
    
    updatedSets[index] = { ...updatedSets[index], status: nextStatus };
    setSets(updatedSets);
    setHasChanges(true);
  };

  const handleSetChange = (index: number, field: keyof ExerciseSet, value: number) => {
    const updatedSets = [...sets];
    updatedSets[index] = { ...updatedSets[index], [field]: value };
    setSets(updatedSets);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    setIsSaving(true);
    try {
      // Check if exercise history already exists for this session
      const { data: existing } = await supabase
        .from('exercise_history')
        .select('id')
        .eq('session_id', sessionId)
        .eq('exercise_name', exerciseName)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('exercise_history')
          .update({ sets_data: sets as any })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('exercise_history')
          .insert({
            session_id: sessionId,
            user_id: user.id,
            exercise_name: exerciseName,
            sets_data: sets as any,
          });

        if (error) throw error;
      }

      toast.success(t('gym.exerciseSaved'));
      setHasChanges(false);
      onSave?.();
    } catch (error) {
      console.error('Error saving exercise:', error);
      toast.error(t('common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 rounded-lg bg-card border border-border space-y-3">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {exerciseName}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t(`gym.exerciseTypes.${exerciseType}`)}
          </p>
        </div>
        {hasChanges && (
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? t('common.saving') : t('common.save')}
          </Button>
        )}
      </div>

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
                    className="w-20 h-8 placeholder:text-muted-foreground/40"
                    placeholder={previousData[index]?.minutes ? `${previousData[index].minutes}` : t('gym.minutes')}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{t('gym.minutes')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    type="number"
                    value={set.weight || ""}
                    onChange={(e) => handleSetChange(index, 'weight', parseFloat(e.target.value) || 0)}
                    className="w-16 h-8 placeholder:text-muted-foreground/40"
                    placeholder={previousData[index]?.weight ? `${previousData[index].weight}` : "kg"}
                  />
                  <span className="text-xs text-muted-foreground">kg</span>
                  
                  <Input
                    type="number"
                    value={set.reps || ""}
                    onChange={(e) => handleSetChange(index, 'reps', parseInt(e.target.value) || 0)}
                    className="w-16 h-8 placeholder:text-muted-foreground/40"
                    placeholder={previousData[index]?.reps ? `${previousData[index].reps}` : "reps"}
                  />
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
