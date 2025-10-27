import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExerciseCard } from '@/components/ExerciseCard';
import { useWorkoutSessions } from '@/hooks/useWorkoutSessions';
import { useTranslation } from 'react-i18next';
import { toast } from '@/hooks/use-toast';

const WorkoutSession = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { session, isLoading, updateSession } = useWorkoutSessions(sessionId);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t('gym.sessionNotFound')}</p>
      </div>
    );
  }

  const exercises = session.template?.template_exercises || [];

  const handleExerciseSave = (exerciseName: string) => {
    setCompletedExercises(new Set([...completedExercises, exerciseName]));
    toast({
      title: t('gym.exerciseSaved'),
      description: `${exerciseName} ${t('gym.savedSuccessfully')}`,
    });
  };

  const handleCompleteWorkout = async () => {
    try {
      await updateSession({ sessionId: session.id, completed: true });
      toast({
        title: t('gym.workoutCompleted'),
        description: t('gym.greatJob'),
      });
      navigate('/gimnasio');
    } catch (error) {
      console.error('Error completing workout:', error);
      toast({
        title: t('common.error'),
        description: t('gym.errorCompletingWorkout'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gimnasio')}>
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">
              {session.template?.name || t('gym.workout')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {exercises.length} {t('gym.exercises')}
            </p>
          </div>
          {session.template?.color && (
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: session.template.color }}
            />
          )}
        </div>

        {/* Exercises */}
        <div className="space-y-4 mb-6">
          {exercises
            .sort((a, b) => a.order_index - b.order_index)
            .map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                sessionId={session.id}
                templateId={session.template_id}
                exerciseName={exercise.exercise_name}
                exerciseType={exercise.exercise_type as 'compound' | 'accessory' | 'calisthenics'}
                repsMin={exercise.reps_min}
                repsMax={exercise.reps_max}
                onSave={() => handleExerciseSave(exercise.exercise_name)}
              />
            ))}
        </div>

        {/* Complete Workout Button */}
        <Button
          onClick={handleCompleteWorkout}
          disabled={completedExercises.size < exercises.length}
          className="w-full"
          size="lg"
        >
          <Check className="w-5 h-5 mr-2" />
          {t('gym.completeWorkout')}
        </Button>

        {completedExercises.size < exercises.length && (
          <p className="text-center text-sm text-muted-foreground mt-3">
            {t('gym.completeAllExercises')} ({completedExercises.size}/{exercises.length})
          </p>
        )}
      </div>
    </div>
  );
};

export default WorkoutSession;
