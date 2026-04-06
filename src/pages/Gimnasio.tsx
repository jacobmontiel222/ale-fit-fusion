import { logger } from "@/lib/logger";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, CalendarIcon, CalendarDays, ListChecks } from "lucide-react";
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
import { NewRoutineDialog } from "@/components/NewRoutineDialog";
import { MyRoutinesDialog } from "@/components/MyRoutinesDialog";
import { MUSCLE_COLORS, MUSCLE_LABELS } from "@/types/workout";

// Active session from the new schema
interface ActiveSession {
  id: string;
  routine_id: string | null;
  status: 'active' | 'completed' | 'discarded';
  started_at: string;
}

const Gimnasio = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showNewRoutineDialog, setShowNewRoutineDialog] = useState(false);
  const [showMyRoutinesDialog, setShowMyRoutinesDialog] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const { templates } = useWorkoutTemplates();
  const { schedule } = useWeeklySchedule();

  // ── Week helpers ────────────────────────────────────────────────────────
  const getWeekDays = () => {
    const days = [];
    const current = new Date(selectedDate);
    const dayOfWeek = current.getDay();
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
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 7);
    setSelectedDate(d);
  };

  const goToNextWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 7);
    setSelectedDate(d);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setCalendarOpen(false);
    }
  };

  const formatDate = (date: Date) => date.toISOString().split("T")[0];

  const todayLabel = new Date().toLocaleDateString(
    i18n.language === "en" ? "en-US" : i18n.language === "es" ? "es-ES" : i18n.language,
    { day: "numeric", month: "long", year: "numeric" }
  );

  // ── Schedule helpers ────────────────────────────────────────────────────
  const getScheduledTemplateForDate = (date: Date) => {
    const dayOfWeek = date.getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const scheduleEntry = schedule.find(s => s.day_of_week === adjustedDay);
    if (!scheduleEntry) return null;

    if (scheduleEntry.is_rest_day) {
      return { name: t("gym.restDay"), color: "#6B7280", isRest: true as const, id: "" };
    }

    const template = templates.find(tmpl => tmpl.id === scheduleEntry.template_id);
    if (!template) return null;
    return { ...template, isRest: false as const };
  };

  const scheduledTemplate = getScheduledTemplateForDate(selectedDate);

  // ── Load active session for selected date ───────────────────────────────
  useEffect(() => {
    const loadActiveSession = async () => {
      if (!user) return;

      // Look for any active session today that matches the routine/template
      // In the new schema we check status='active' for today
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data } = await supabase
        .from("workout_sessions")
        .select("id, routine_id, status, started_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gte("started_at", startOfDay.toISOString())
        .lte("started_at", endOfDay.toISOString())
        .maybeSingle();

      setActiveSession(data ?? null);
    };

    loadActiveSession();
  }, [user, selectedDate]);

  const isToday = formatDate(selectedDate) === formatDate(new Date());

  // ── Start session ───────────────────────────────────────────────────────
  const handleStartSession = async () => {
    if (!user || !scheduledTemplate || scheduledTemplate.isRest) return;

    setIsStarting(true);
    try {
      // 1. Crear la sesión
      const { data: sessionData, error: sessionError } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: user.id,
          status: "active",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (sessionError || !sessionData) {
        logger.error("Error creating session:", sessionError);
        return;
      }

      // 2. Insertar los ejercicios de la rutina en workout_exercises
      const exercises = scheduledTemplate.template_exercises ?? [];
      if (exercises.length > 0) {
        const wePayload = exercises.map((ex, idx) => ({
          session_id: sessionData.id,
          exercise_id: ex.exercise_id ?? null,
          display_name: ex.custom_name ?? ex.exercise_name,
          position: idx,
          muscle_weights_snapshot: (ex.exercise?.muscle_weights ?? null) as any,
        }));

        const { data: weData, error: weError } = await supabase
          .from("workout_exercises")
          .insert(wePayload)
          .select();

        if (weError) {
          logger.error("Error inserting workout_exercises:", weError);
        } else if (weData) {
          // 3. Insertar un set inicial por cada ejercicio
          const setsPayload = weData.map((we: any) => ({
            workout_exercise_id: we.id,
            set_number: 1,
            set_type: "normal",
            is_completed: false,
          }));

          const { error: setsError } = await supabase
            .from("workout_sets")
            .insert(setsPayload);

          if (setsError) {
            logger.error("Error inserting default sets:", setsError);
          }
        }
      }

      navigate(`/sesion/${sessionData.id}`);
    } finally {
      setIsStarting(false);
    }
  };

  const weekDays = getWeekDays();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground leading-tight">{t("gym.title")}</h1>
            <p className="text-sm text-muted-foreground">{todayLabel}</p>
          </div>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t("analytics.date")}>
                <CalendarIcon className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Weekly strip */}
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="icon" onClick={goToPreviousWeek} aria-label={t("common.previous")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="grid grid-cols-7 gap-2 flex-1">
            {weekDays.map((day, idx) => {
              const isSelected = formatDate(day) === formatDate(selectedDate);
              const isToday = formatDate(day) === formatDate(new Date());
              const dayTemplate = getScheduledTemplateForDate(day);

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={`flex flex-col items-center py-2 rounded-lg transition-colors relative ${
                    isSelected ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                  }`}
                >
                  <span className="text-xs text-muted-foreground mb-1">
                    {day
                      .toLocaleDateString(
                        i18n.language === "en" ? "en-US" : i18n.language === "es" ? "es-ES" : i18n.language,
                        { weekday: "short" }
                      )
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                  <span className={`text-sm font-semibold ${isToday ? "text-accent" : ""}`}>
                    {day.getDate()}
                  </span>
                  {dayTemplate && (
                    <div
                      className="absolute bottom-1 w-6 h-1 rounded-full"
                      style={{ backgroundColor: dayTemplate.color }}
                    />
                  )}
                </button>
              );
            })}
          </div>
          <Button variant="ghost" size="icon" onClick={goToNextWeek} aria-label={t("common.next")}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Schedule buttons */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="w-full" onClick={() => setShowScheduleModal(true)}>
              <CalendarDays className="w-4 h-4 mr-2" />
              {t("gym.scheduleWeek")}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setShowMyRoutinesDialog(true)}>
              <ListChecks className="w-4 h-4 mr-2" />
              {t("gym.myRoutines")}
            </Button>
          </div>
        </div>

        {/* Date header */}
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-foreground">
            {selectedDate.toLocaleDateString(i18n.language, { day: "numeric", month: "long" })}
          </h2>
        </div>

        {/* Day content */}
        <div className="space-y-4">
          {/* No routine scheduled */}
          {!scheduledTemplate && (
            <p className="text-center text-muted-foreground py-8">{t("gym.noRoutineScheduled")}</p>
          )}

          {/* Rest day */}
          {scheduledTemplate?.isRest && (
            <p className="text-center text-muted-foreground py-8">{t("gym.restDayMessage")}</p>
          )}

          {/* Routine scheduled */}
          {scheduledTemplate && !scheduledTemplate.isRest && (() => {
            const exercises = scheduledTemplate.template_exercises ?? [];
            return (
              <div className="bg-card rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-full shrink-0"
                      style={{ backgroundColor: scheduledTemplate.color }}
                    />
                    <div>
                      <h3 className="text-lg font-bold text-foreground leading-tight">
                        {scheduledTemplate.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {exercises.length} {t("gym.exercisesLabel")}
                      </p>
                    </div>
                  </div>

                  {/* Exercise list */}
                  {exercises.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {exercises.map((ex, idx) => {
                        const displayName = ex.custom_name ?? ex.exercise_name;
                        const muscleWeights = (ex.exercise?.muscle_weights ?? null) as Record<string, number> | null;
                        const topMuscle = muscleWeights
                          ? Object.entries(muscleWeights).sort(([, a], [, b]) => b - a)[0]?.[0]
                          : null;

                        return (
                          <div key={ex.id} className="flex items-center gap-3">
                            <span
                              className="text-sm font-medium text-muted-foreground w-5 text-right shrink-0"
                            >
                              {idx + 1}
                            </span>
                            <div
                              className="w-1 h-4 rounded-full shrink-0"
                              style={{ backgroundColor: scheduledTemplate.color }}
                            />
                            <span className="text-sm text-foreground flex-1 truncate">{displayName}</span>
                            {topMuscle && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                                style={{
                                  backgroundColor: `${MUSCLE_COLORS[topMuscle] ?? "hsl(var(--muted))"}22`,
                                  color: MUSCLE_COLORS[topMuscle] ?? "hsl(var(--muted-foreground))",
                                }}
                              >
                                {MUSCLE_LABELS[topMuscle as keyof typeof MUSCLE_LABELS] ?? topMuscle.replace(/_/g, " ")}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {exercises.length === 0 && (
                    <p className="text-sm text-muted-foreground mb-4">{t("gym.noExercisesYet")}</p>
                  )}

                  {/* CTA — solo si es hoy */}
                  {isToday && (
                    activeSession ? (
                      <Button
                        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                        size="lg"
                        onClick={() => navigate(`/sesion/${activeSession.id}`)}
                      >
                        {t("gym.continueSession")} →
                      </Button>
                    ) : (
                      <Button
                        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                        size="lg"
                        disabled={isStarting}
                        onClick={handleStartSession}
                      >
                        {isStarting ? t("common.loading") : `${t("gym.startSession")} →`}
                      </Button>
                    )
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Modals */}
        <WeeklyScheduleModal
          open={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
        />
        <NewRoutineDialog
          open={showNewRoutineDialog}
          onClose={() => setShowNewRoutineDialog(false)}
        />
        <MyRoutinesDialog
          open={showMyRoutinesDialog}
          onClose={() => setShowMyRoutinesDialog(false)}
          onCreateNewRoutine={() => setShowNewRoutineDialog(true)}
        />
      </div>

      <BottomNav />
    </div>
  );
};

export default Gimnasio;
