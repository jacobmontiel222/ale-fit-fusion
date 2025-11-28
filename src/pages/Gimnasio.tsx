import { useState, useEffect } from "react";
import { Plus, ChevronLeft, ChevronRight, CalendarIcon, Settings, GripVertical, Check, CalendarDays } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { WeeklyScheduleModal } from "@/components/WeeklyScheduleModal";
import { useWorkoutTemplates } from "@/hooks/useWorkoutTemplates";
import { useWeeklySchedule } from "@/hooks/useWeeklySchedule";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AddExerciseDialog } from "@/components/AddExerciseDialog";
import { TemplateExerciseCard } from "@/components/TemplateExerciseCard";
import { ReorderExercisesModal } from "@/components/ReorderExercisesModal";

interface WorkoutSession {
  id: string;
  date: string;
  template_id: string | null;
  completed: boolean;
  template?: {
    name: string;
    color: string;
  };
}

interface PlannedSet {
  weight?: number;
  reps?: number;
  rest_seconds?: number;
  minutes?: number;
}

interface TemplateExercise {
  id: string;
  exercise_name: string;
  exercise_type: string;
  reps_min: number;
  reps_max: number;
  order_index: number;
  planned_sets: PlannedSet[];
}

const Gimnasio = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [templateExercises, setTemplateExercises] = useState<TemplateExercise[]>([]);
  const [showAddExerciseDialog, setShowAddExerciseDialog] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const { templates } = useWorkoutTemplates();
  const { schedule } = useWeeklySchedule();

  // Load workout sessions from Supabase
  useEffect(() => {
    const loadSessions = async () => {
      if (!user) return;

      // Get start and end of current month for efficient loading
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

      const { data: sessionsData } = await supabase
        .from('workout_sessions')
        .select(`
          *,
          workout_templates:template_id(name, color)
        `)
        .eq('user_id', user.id)
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .lte('date', endOfMonth.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (sessionsData) {
        const formattedSessions: WorkoutSession[] = sessionsData.map(s => ({
          id: s.id,
          date: s.date,
          template_id: s.template_id,
          completed: s.completed,
          template: s.workout_templates ? {
            name: s.workout_templates.name,
            color: s.workout_templates.color,
          } : undefined,
        }));
        setSessions(formattedSessions);
      }
    };

    loadSessions();
  }, [user, selectedDate]);

  // Load exercises for the scheduled template
  const loadTemplateExercises = async () => {
    const scheduledTemplate = getScheduledTemplateForDate(selectedDate);
    if (!scheduledTemplate || scheduledTemplate.isRest || !('id' in scheduledTemplate)) {
      setTemplateExercises([]);
      return;
    }

    const { data: exercises } = await supabase
      .from('template_exercises')
      .select('*')
      .eq('template_id', scheduledTemplate.id)
      .order('order_index', { ascending: true });

    if (exercises) {
      setTemplateExercises(exercises as TemplateExercise[]);
    }
  };

  useEffect(() => {
    loadTemplateExercises();
  }, [selectedDate, schedule, templates]);

  // Generate calendar days (current week - Monday to Sunday)
  const getWeekDays = () => {
    const days = [];
    const current = new Date(selectedDate);
    const dayOfWeek = current.getDay();
    // Adjust so Monday = 0, Tuesday = 1, ..., Sunday = 6
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(current);
    startOfWeek.setDate(current.getDate() - mondayOffset);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setCalendarOpen(false);
    }
  };

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const getSessionsForDate = (date: Date) => {
    return sessions.filter(s => s.date === formatDate(date));
  };

  const getScheduledTemplateForDate = (date: Date) => {
    const dayOfWeek = date.getDay();
    // Convert Sunday (0) to 6, and Monday-Saturday to 0-5
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const scheduleEntry = schedule.find(s => s.day_of_week === adjustedDay);
    if (!scheduleEntry) return null;

    if (scheduleEntry.is_rest_day) {
      return { name: t('gym.restDay'), color: '#6B7280', isRest: true };
    }

    const template = templates.find(t => t.id === scheduleEntry.template_id);
    if (!template) return null;

    return { ...template, isRest: false };
  };

  const createSessionForDate = async () => {
    if (!user) return;

    const scheduledTemplate = getScheduledTemplateForDate(selectedDate);
    if (!scheduledTemplate || scheduledTemplate.isRest) return;

    // Verificar que tiene id (no es día de descanso)
    const templateId = 'id' in scheduledTemplate ? scheduledTemplate.id : null;
    if (!templateId) return;

    const { data, error } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: user.id,
        date: formatDate(selectedDate),
        template_id: templateId,
        completed: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return;
    }

    // Reload sessions
    const { data: sessionsData } = await supabase
      .from('workout_sessions')
      .select(`
        *,
        workout_templates:template_id(name, color)
      `)
      .eq('user_id', user.id)
      .eq('date', formatDate(selectedDate));

    if (sessionsData && sessionsData.length > 0) {
      const newSession: WorkoutSession = {
        id: sessionsData[0].id,
        date: sessionsData[0].date,
        template_id: sessionsData[0].template_id,
        completed: sessionsData[0].completed,
        template: sessionsData[0].workout_templates ? {
          name: sessionsData[0].workout_templates.name,
          color: sessionsData[0].workout_templates.color,
        } : undefined,
      };
      setSessions([...sessions, newSession]);
    }
  };

  const weekDays = getWeekDays();
  const daySessions = getSessionsForDate(selectedDate);
  const scheduledTemplate = getScheduledTemplateForDate(selectedDate);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">{t('gym.title')}</h1>
        </div>

        {/* Mini Calendar */}
        <StatsCard className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="font-semibold text-lg">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {selectedDate.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, idx) => {
              const isSelected = formatDate(day) === formatDate(selectedDate);
              const isToday = formatDate(day) === formatDate(new Date());
              const hasSessions = getSessionsForDate(day).length > 0;
              const dayTemplate = getScheduledTemplateForDate(day);
              
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={`flex flex-col items-center py-2 rounded-lg transition-colors relative ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                  }`}
                >
                  <span className="text-xs text-muted-foreground mb-1">
                    {day.toLocaleDateString(i18n.language, { weekday: 'short' }).charAt(0).toUpperCase()}
                  </span>
                  <span className={`text-sm font-semibold ${isToday ? 'text-accent' : ''}`}>
                    {day.getDate()}
                  </span>
                  {dayTemplate && (
                    <div
                      className="absolute bottom-1 w-6 h-1 rounded-full"
                      style={{ backgroundColor: dayTemplate.color }}
                    />
                  )}
                  {hasSessions && !dayTemplate && (
                    <div className="w-1 h-1 rounded-full bg-accent mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        </StatsCard>

        {/* Schedule Section - Moved below calendar */}
        <div className="mb-6">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowScheduleModal(true)}
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            {t('gym.scheduleWeek')}
          </Button>
        </div>

        {/* Date Header */}
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-foreground">
            {selectedDate.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' })}
          </h2>
        </div>

        {/* Template Name Subtitle */}
        {scheduledTemplate && !scheduledTemplate.isRest && (
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowReorderModal(true)}
                className="p-1 hover:bg-secondary rounded transition-colors"
                disabled={templateExercises.length === 0}
              >
                <GripVertical className="w-5 h-5 text-muted-foreground cursor-pointer" />
              </button>
              <button
                onClick={() => setIsEditMode(true)}
                className={cn(
                  "p-1 rounded transition-colors",
                  isEditMode ? "bg-primary/10 text-primary" : "hover:bg-secondary text-muted-foreground"
                )}
              >
                <Settings className="w-5 h-5" />
              </button>
              <h3 className="text-xl font-semibold" style={{ color: scheduledTemplate.color }}>
                {scheduledTemplate.name}
              </h3>
            </div>
            {isEditMode && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditMode(false)}
              >
                <Check className="w-5 h-5" />
              </Button>
            )}
          </div>
        )}

        {/* Exercises List or Empty State */}
        <div className="space-y-3 mb-6">
          {daySessions.length === 0 && !scheduledTemplate && (
            <p className="text-center text-muted-foreground py-4">
              {t('gym.noRoutineScheduled')}
            </p>
          )}

          {daySessions.length === 0 && scheduledTemplate && scheduledTemplate.isRest && (
            <p className="text-center text-muted-foreground py-4">
              {t('gym.restDayMessage')}
            </p>
          )}

          {daySessions.length === 0 && scheduledTemplate && !scheduledTemplate.isRest && (
            <>
              {templateExercises.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {templateExercises.map((exercise) => (
                      <TemplateExerciseCard
                        key={exercise.id}
                        exercise={exercise}
                        onUpdate={loadTemplateExercises}
                        isEditMode={isEditMode}
                      />
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-3"
                    onClick={() => setShowAddExerciseDialog(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('gym.addExercise')}
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAddExerciseDialog(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('gym.addExercise')}
                </Button>
              )}
            </>
          )}

          {daySessions.map((session) => (
            <StatsCard
              key={session.id}
              className="cursor-pointer hover:bg-secondary/50 transition-colors"
              onClick={() => navigate(`/gimnasio/session/${session.id}`)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {session.template?.name || t('gym.workout')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {session.completed ? t('gym.completed') : t('gym.inProgress')}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </StatsCard>
          ))}
        </div>

        <WeeklyScheduleModal
          open={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
        />

        {scheduledTemplate && !scheduledTemplate.isRest && 'id' in scheduledTemplate && (
          <>
            <AddExerciseDialog
              open={showAddExerciseDialog}
              onClose={() => setShowAddExerciseDialog(false)}
              templateId={scheduledTemplate.id}
              onExerciseAdded={loadTemplateExercises}
            />
            <ReorderExercisesModal
              open={showReorderModal}
              onClose={() => setShowReorderModal(false)}
              templateId={scheduledTemplate.id}
              exercises={templateExercises}
              onReorder={loadTemplateExercises}
            />
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Gimnasio;
