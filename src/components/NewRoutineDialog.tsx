import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkoutTemplates } from "@/hooks/useWorkoutTemplates";
import { X } from "lucide-react";

const COLOR_OPTIONS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#06B6D4", // cyan
];

interface NewRoutineDialogProps {
  open: boolean;
  onClose: () => void;
}

export const NewRoutineDialog = ({ open, onClose }: NewRoutineDialogProps) => {
  const { t } = useTranslation();
  const { createTemplate } = useWorkoutTemplates();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [exerciseInput, setExerciseInput] = useState("");
  const [exercises, setExercises] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const resetState = () => {
    setName("");
    setColor(COLOR_OPTIONS[0]);
    setExerciseInput("");
    setExercises([]);
  };

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  const handleAddExercise = () => {
    const trimmed = exerciseInput.trim();
    if (!trimmed) return;
    setExercises((prev) => [...prev, trimmed]);
    setExerciseInput("");
  };

  const handleRemoveExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    if (!name.trim() || exercises.length === 0) return;
    setSaving(true);
    try {
      await createTemplate({
        name: name.trim(),
        color,
        exercises,
      });
      onClose();
      resetState();
    } catch (error) {
      console.error("Error creating routine", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("gym.newRoutine")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("gym.templateName")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("gym.templateNamePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("gym.color")}</Label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                    color === option ? "border-foreground scale-110" : "border-border"
                  }`}
                  style={{ backgroundColor: option }}
                  onClick={() => setColor(option)}
                  type="button"
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("gym.exercises")}</Label>
            <div className="flex gap-2">
              <Input
                value={exerciseInput}
                onChange={(e) => setExerciseInput(e.target.value)}
                placeholder={t("gym.exerciseName")}
              />
              <Button
                type="button"
                onClick={handleAddExercise}
                disabled={!exerciseInput.trim()}
              >
                {t("common.add")}
              </Button>
            </div>
            {exercises.length > 0 && (
              <div className="space-y-2">
                {exercises.map((exercise, index) => (
                  <div
                    key={`${exercise}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                  >
                    <span className="text-sm text-foreground">{exercise}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveExercise(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || exercises.length === 0 || saving}
          >
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
