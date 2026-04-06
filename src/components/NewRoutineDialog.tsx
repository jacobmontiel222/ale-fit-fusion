import { logger } from "@/lib/logger";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkoutTemplates } from "@/hooks/useWorkoutTemplates";
import { RoutineEditorDialog } from "@/components/RoutineEditorDialog";
import { cn } from "@/lib/utils";

const COLOR_OPTIONS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#06B6D4", "#F97316",
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
  const [saving, setSaving] = useState(false);
  const [newTemplateId, setNewTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setColor(COLOR_OPTIONS[0]);
    }
  }, [open]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const data = await createTemplate({ name: name.trim(), color });
      // Open editor immediately after creation
      setNewTemplateId(data.id);
      onClose();
    } catch (error) {
      logger.error("Error creating routine", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("gym.newRoutine")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("gym.templateName")}</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t("gym.templateNamePlaceholder")}
                onKeyDown={e => e.key === "Enter" && handleSave()}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>{t("gym.color")}</Label>
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
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={!name.trim() || saving}>
              {saving ? t("common.saving") : t("common.next")} →
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Open editor right after creation */}
      {newTemplateId && (
        <RoutineEditorDialog
          templateId={newTemplateId}
          open={!!newTemplateId}
          onClose={() => setNewTemplateId(null)}
        />
      )}
    </>
  );
};
