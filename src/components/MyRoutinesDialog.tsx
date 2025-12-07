import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWorkoutTemplates } from "@/hooks/useWorkoutTemplates";

interface MyRoutinesDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateNewRoutine: () => void;
}

export const MyRoutinesDialog = ({
  open,
  onClose,
  onCreateNewRoutine,
}: MyRoutinesDialogProps) => {
  const { t } = useTranslation();
  const { templates, isLoading } = useWorkoutTemplates();
  const hasRoutines = templates.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle>{t("gym.myRoutines")}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-6">
              {t("common.loading")}
            </p>
          ) : hasRoutines ? (
            <ScrollArea className="max-h-72 pr-2">
              <div className="space-y-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full border border-border"
                        style={{ backgroundColor: template.color }}
                        aria-label={template.name}
                      />
                      <div>
                        <p className="font-semibold text-foreground">{template.name}</p>
                        {template.template_exercises && template.template_exercises.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {`${template.template_exercises.length} ${t("gym.exercisesLabel")}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center text-muted-foreground py-6 space-y-3">
              <p>{t("gym.noRoutinesCreated")}</p>
              <Button onClick={onCreateNewRoutine}>
                {t("gym.createNewRoutine")}
              </Button>
            </div>
          )}
        </div>

        {hasRoutines && !isLoading && (
          <div className="flex justify-end pt-2">
            <Button onClick={onCreateNewRoutine}>
              {t("gym.createNewRoutine")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
