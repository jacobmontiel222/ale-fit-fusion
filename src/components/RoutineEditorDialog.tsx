import { logger } from "@/lib/logger";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GripVertical,
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useWorkoutTemplates, type TemplateExercise } from "@/hooks/useWorkoutTemplates";
import { ExercisePickerModal } from "@/components/workout/ExercisePickerModal";
import { MUSCLE_COLORS, MUSCLE_LABELS } from "@/types/workout";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/types/workout";

const COLOR_OPTIONS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#06B6D4", "#F97316",
];

const getTopMuscles = (weights: Record<string, number> | null, count = 3) => {
  if (!weights) return [];
  return Object.entries(weights)
    .sort(([, a], [, b]) => b - a)
    .slice(0, count)
    .map(([key]) => key);
};

interface RoutineEditorDialogProps {
  templateId: string;
  open: boolean;
  onClose: () => void;
}

export const RoutineEditorDialog = ({ templateId, open, onClose }: RoutineEditorDialogProps) => {
  const { t } = useTranslation();
  const {
    templates,
    updateTemplate,
    deleteTemplate,
    addExerciseToTemplate,
    updateExerciseCustomName,
    removeExerciseFromTemplate,
    reorderExercises,
  } = useWorkoutTemplates();

  const template = templates.find(t => t.id === templateId);
  const exercises: TemplateExercise[] = template?.template_exercises ?? [];

  const [name, setName] = useState(template?.name ?? "");
  const [color, setColor] = useState(template?.color ?? COLOR_OPTIONS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setColor(template.color);
    }
  }, [template?.id]);

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateTemplate({ id: templateId, name: name.trim(), color });
    } catch (e) {
      logger.error("Error updating template:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleColorChange = async (c: string) => {
    setColor(c);
    try {
      await updateTemplate({ id: templateId, name: name.trim() || (template?.name ?? ""), color: c });
    } catch (e) {
      logger.error("Error updating color:", e);
    }
  };

  const handleStartEditName = (ex: TemplateExercise) => {
    setEditingId(ex.id);
    setEditingValue(ex.custom_name ?? ex.exercise_name);
  };

  const handleSaveCustomName = async (ex: TemplateExercise) => {
    try {
      await updateExerciseCustomName({ exerciseId: ex.id, customName: editingValue });
    } catch (e) {
      logger.error("Error updating custom name:", e);
    } finally {
      setEditingId(null);
      setEditingValue("");
    }
  };

  const handleRemoveExercise = async (id: string) => {
    try {
      await removeExerciseFromTemplate(id);
    } catch (e) {
      logger.error("Error removing exercise:", e);
    }
  };

  const handleAddExercise = async (exercise: Exercise) => {
    try {
      await addExerciseToTemplate({ templateId, exercise });
    } catch (e) {
      logger.error("Error adding exercise:", e);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const reordered = [...exercises];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    await reorderExercises(
      reordered.map((ex, i) => ({ id: ex.id, order_index: i }))
    );
  };

  const handleMoveDown = async (index: number) => {
    if (index === exercises.length - 1) return;
    const reordered = [...exercises];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    await reorderExercises(
      reordered.map((ex, i) => ({ id: ex.id, order_index: i }))
    );
  };

  const handleDelete = async () => {
    try {
      await deleteTemplate(templateId);
      onClose();
    } catch (e) {
      logger.error("Error deleting template:", e);
    }
  };

  if (!template) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              {t("gym.editRoutine")}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 px-4">
            {/* Name */}
            <div className="space-y-1 mb-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {t("gym.templateName")}
              </p>
              <div className="flex gap-2">
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="flex-1"
                  onBlur={handleSaveName}
                  onKeyDown={e => e.key === "Enter" && handleSaveName()}
                />
                {saving && <span className="text-xs text-muted-foreground self-center">...</span>}
              </div>
            </div>

            {/* Color */}
            <div className="space-y-2 mb-6">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {t("gym.color")}
              </p>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                      color === c ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => handleColorChange(c)}
                  />
                ))}
              </div>
            </div>

            {/* Exercises */}
            <div className="space-y-1 mb-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {t("gym.exercisesLabel")} ({exercises.length})
              </p>
            </div>

            <div className="space-y-2 mb-4">
              {exercises.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {t("gym.noExercisesYet")}
                </p>
              )}

              {exercises.map((ex, idx) => {
                const displayName = ex.custom_name ?? ex.exercise_name;
                const muscleWeights = (ex.exercise?.muscle_weights ?? null) as Record<string, number> | null;
                const topMuscles = getTopMuscles(muscleWeights);
                const isEditing = editingId === ex.id;

                return (
                  <div
                    key={ex.id}
                    className="bg-card rounded-xl px-3 py-3 flex items-start gap-2"
                  >
                    {/* Reorder */}
                    <div className="flex flex-col gap-0.5 pt-1 shrink-0">
                      <button
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === exercises.length - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <Input
                            value={editingValue}
                            onChange={e => setEditingValue(e.target.value)}
                            className="h-7 text-sm"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === "Enter") handleSaveCustomName(ex);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            onClick={() => handleSaveCustomName(ex)}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground leading-tight">
                            {displayName}
                          </span>
                          {ex.custom_name && ex.custom_name !== ex.exercise_name && (
                            <span className="text-[10px] text-muted-foreground">
                              ({ex.exercise_name})
                            </span>
                          )}
                          <button
                            onClick={() => handleStartEditName(ex)}
                            className="text-muted-foreground hover:text-foreground ml-0.5"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Muscle badges */}
                      {topMuscles.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {topMuscles.map(m => (
                            <span
                              key={m}
                              className="text-[10px] px-1.5 py-0.5 rounded"
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
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => handleRemoveExercise(ex.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0 pt-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Add exercise */}
            <Button
              variant="outline"
              className="w-full mb-6"
              onClick={() => setShowPicker(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("gym.addExercise")}
            </Button>

            {/* Delete routine */}
            <div className="border-t border-border pt-4 pb-4">
              {!confirmDelete ? (
                <Button
                  variant="ghost"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("gym.deleteRoutine")}
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-center text-muted-foreground">
                    {t("gym.confirmDeleteRoutine")}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setConfirmDelete(false)}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={handleDelete}
                    >
                      {t("common.delete")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <ExercisePickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleAddExercise}
      />
    </>
  );
};
