import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, Plus } from "lucide-react";
import { useWorkoutTemplates } from "@/hooks/useWorkoutTemplates";
import { RoutineEditorDialog } from "@/components/RoutineEditorDialog";
import { MUSCLE_COLORS, MUSCLE_LABELS } from "@/types/workout";

const getTopMuscles = (exercises: any[], count = 4) => {
  const totals: Record<string, number> = {};
  exercises.forEach(ex => {
    const weights = ex.exercise?.muscle_weights as Record<string, number> | null;
    if (!weights) return;
    Object.entries(weights).forEach(([m, w]) => {
      totals[m] = (totals[m] ?? 0) + w;
    });
  });
  return Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, count)
    .map(([key]) => key);
};

interface MyRoutinesDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateNewRoutine: () => void;
}

export const MyRoutinesDialog = ({ open, onClose, onCreateNewRoutine }: MyRoutinesDialogProps) => {
  const { t } = useTranslation();
  const { templates, isLoading } = useWorkoutTemplates();
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between">
            <DialogTitle>{t("gym.myRoutines")}</DialogTitle>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={onCreateNewRoutine}
            >
              <Plus className="w-4 h-4" />
              {t("gym.newRoutine")}
            </Button>
          </DialogHeader>

          <ScrollArea className="flex-1 px-4 pb-4">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8 text-sm">{t("common.loading")}</p>
            ) : templates.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <p className="text-muted-foreground text-sm">{t("gym.noRoutinesCreated")}</p>
                <Button onClick={onCreateNewRoutine}>{t("gym.createNewRoutine")}</Button>
              </div>
            ) : (
              <div className="space-y-3 mt-1">
                {templates.map(template => {
                  const exercises = template.template_exercises ?? [];
                  const topMuscles = getTopMuscles(exercises);

                  return (
                    <button
                      key={template.id}
                      className="w-full bg-card rounded-2xl p-4 text-left hover:bg-secondary/50 transition-colors"
                      onClick={() => setEditingTemplateId(template.id)}
                    >
                      {/* Header row */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full shrink-0"
                            style={{ backgroundColor: template.color }}
                          />
                          <div>
                            <p className="font-semibold text-foreground text-base leading-tight">
                              {template.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {exercises.length} {t("gym.exercisesLabel")}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>

                      {/* Muscle badges */}
                      {topMuscles.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap mb-3">
                          {topMuscles.map(m => (
                            <span
                              key={m}
                              className="text-[11px] px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${MUSCLE_COLORS[m] ?? "hsl(var(--muted))"}22`,
                                color: MUSCLE_COLORS[m] ?? "hsl(var(--muted-foreground))",
                              }}
                            >
                              {MUSCLE_LABELS[m as keyof typeof MUSCLE_LABELS] ?? m.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Exercise list preview */}
                      {exercises.length > 0 && (
                        <div className="space-y-1">
                          {exercises.slice(0, 5).map(ex => (
                            <div key={ex.id} className="flex items-center gap-2">
                              <div
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: template.color }}
                              />
                              <span className="text-xs text-muted-foreground truncate">
                                {ex.custom_name ?? ex.exercise_name}
                              </span>
                            </div>
                          ))}
                          {exercises.length > 5 && (
                            <p className="text-xs text-muted-foreground pl-3.5">
                              +{exercises.length - 5} {t("gym.more")}
                            </p>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {editingTemplateId && (
        <RoutineEditorDialog
          templateId={editingTemplateId}
          open={!!editingTemplateId}
          onClose={() => setEditingTemplateId(null)}
        />
      )}
    </>
  );
};
