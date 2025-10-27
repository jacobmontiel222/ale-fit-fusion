import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SetStatus = "pending" | "success" | "failed";

interface PlannedSet {
  weight?: number;
  reps?: number;
  minutes?: number;
  status?: SetStatus;
}

interface TemplateExercise {
  id: string;
  exercise_name: string;
  exercise_type: string;
  planned_sets: PlannedSet[];
}

interface GhostSetValue {
  weight_kg: number | null;
  reps: number | null;
}

interface TemplateExerciseCardProps {
  exercise: TemplateExercise;
  onUpdate: () => void;
  ghostValues?: Record<number, GhostSetValue>;
  currentValues?: Record<number, GhostSetValue>;
  selectedDate: Date;
  userId?: string;
}

const DEFAULT_CARDIO_MINUTES = 10;

const formatGhostNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return "\u2014";
  }
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return "\u2014";
  }
  return Number.isInteger(numeric)
    ? numeric.toString()
    : numeric.toFixed(1).replace(/\.0$/, "");
};

const formatGhostPair = (value?: GhostSetValue) => {
  if (!value) {
    return null;
  }
  const weightText = formatGhostNumber(value.weight_kg);
  const repsText = formatGhostNumber(value.reps);
  return `${weightText} \u00D7 ${repsText}`;
};

export const TemplateExerciseCard = ({
  exercise,
  onUpdate,
  ghostValues,
  currentValues,
  selectedDate,
  userId,
}: TemplateExerciseCardProps) => {
  const { t } = useTranslation();
  const isCardio = exercise.exercise_type === "cardio";

  const plannedSets = useMemo(() => exercise.planned_sets || [], [exercise.planned_sets]);

  const targetSetCount = useMemo(() => {
    if (isCardio) {
      return plannedSets.length > 0 ? plannedSets.length : 1;
    }
    const ghostLength = ghostValues ? Object.keys(ghostValues).length : 0;
    const currentLength = currentValues ? Object.keys(currentValues).length : 0;
    return Math.max(plannedSets.length, ghostLength, currentLength, 1);
  }, [isCardio, plannedSets, ghostValues, currentValues]);

  const buildInitialSets = useCallback((): PlannedSet[] => {
    if (isCardio) {
      return Array.from({ length: targetSetCount }, (_, index) => ({
        minutes: plannedSets[index]?.minutes ?? DEFAULT_CARDIO_MINUTES,
        status: plannedSets[index]?.status ?? "pending",
      }));
    }

    return Array.from({ length: targetSetCount }, (_, index) => {
      const planned = plannedSets[index];
      const currentValue = currentValues?.[index + 1];

      return {
        status: planned?.status ?? "pending",
        weight:
          currentValue && currentValue.weight_kg !== null
            ? Number(currentValue.weight_kg)
            : undefined,
        reps:
          currentValue && currentValue.reps !== null
            ? Number(currentValue.reps)
            : undefined,
      };
    });
  }, [currentValues, isCardio, plannedSets, targetSetCount]);

  const [sets, setSets] = useState<PlannedSet[]>(buildInitialSets);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const initializedRef = useRef(false);
  const setsRef = useRef<PlannedSet[]>(sets);

  useEffect(() => {
    setsRef.current = sets;
  }, [sets]);

  useEffect(() => {
    const currentSets = setsRef.current;
    const initialSets = buildInitialSets();
    const lengthChanged = currentSets.length !== initialSets.length;

    const needsHydration = initialSets.some((initialSet, index) => {
      const currentSet = currentSets[index];
      if (!currentSet) {
        return true;
      }

      const initialWeight =
        typeof initialSet.weight === "number" && !Number.isNaN(initialSet.weight)
          ? initialSet.weight
          : undefined;
      const currentWeight =
        typeof currentSet.weight === "number" && !Number.isNaN(currentSet.weight)
          ? currentSet.weight
          : undefined;
      const initialReps =
        typeof initialSet.reps === "number" && !Number.isNaN(initialSet.reps)
          ? initialSet.reps
          : undefined;
      const currentReps =
        typeof currentSet.reps === "number" && !Number.isNaN(currentSet.reps)
          ? currentSet.reps
          : undefined;

      return (
        (initialWeight !== undefined && currentWeight === undefined) ||
        (initialReps !== undefined && currentReps === undefined)
      );
    });

    if (!initializedRef.current || lengthChanged || needsHydration) {
      setSets(initialSets);
      setsRef.current = initialSets;
      initializedRef.current = true;
    }
  }, [buildInitialSets]);

  const persistGymSets = useCallback(
    async (updatedSets: PlannedSet[]) => {
      if (!userId || isCardio) {
        return;
      }

      const workoutDate = new Date(selectedDate);
      workoutDate.setHours(0, 0, 0, 0);
      const dateString = workoutDate.toISOString().split("T")[0];
      const timestamp = workoutDate.toISOString();

      const rows = updatedSets.map((set, index) => {
        const weightValue =
          typeof set.weight === "number" && !Number.isNaN(set.weight) ? set.weight : null;
        const repsValue =
          typeof set.reps === "number" && !Number.isNaN(set.reps) ? set.reps : null;

        return {
          user_id: userId,
          exercise_id: exercise.id,
          set_number: index + 1,
          weight_kg: weightValue,
          reps: repsValue,
          date: dateString,
          performed_at: timestamp,
        };
      });

      const upsertEntries = rows.filter(
        (row) => row.weight_kg !== null || row.reps !== null,
      );

      const emptySetNumbers = rows
        .filter((row) => row.weight_kg === null && row.reps === null)
        .map((row) => row.set_number);

      if (upsertEntries.length > 0) {
        const { error } = await supabase
          .from("gym_sets")
          .upsert(upsertEntries, { onConflict: "user_id,exercise_id,set_number,date" });

        if (error) {
          console.error("Error saving gym sets history:", error);
        }
      }

      if (emptySetNumbers.length > 0) {
        const { error } = await supabase
          .from("gym_sets")
          .delete()
          .eq("user_id", userId)
          .eq("exercise_id", exercise.id)
          .eq("date", dateString)
          .in("set_number", emptySetNumbers);

        if (error) {
          console.error("Error cleaning empty gym sets:", error);
        }
      }

      if (upsertEntries.length === 0 && emptySetNumbers.length === rows.length) {
        const { error } = await supabase
          .from("gym_sets")
          .delete()
          .eq("user_id", userId)
          .eq("exercise_id", exercise.id)
          .eq("date", dateString);

        if (error) {
          console.error("Error clearing gym sets:", error);
        }
      }
    },
    [exercise.id, isCardio, selectedDate, userId],
  );

  const saveSets = useCallback(
    async (updatedSets: PlannedSet[]) => {
      const templatePayload = updatedSets.map((set) => {
        if (isCardio) {
          const minutesValue =
            typeof set.minutes === "number" && !Number.isNaN(set.minutes)
              ? set.minutes
              : null;
          return {
            minutes: minutesValue,
            status: set.status ?? "pending",
          };
        }

        const weightValue =
          typeof set.weight === "number" && !Number.isNaN(set.weight)
            ? set.weight
            : null;
        const repsValue =
          typeof set.reps === "number" && !Number.isNaN(set.reps) ? set.reps : null;

        return {
          weight: weightValue,
          reps: repsValue,
          status: set.status ?? "pending",
        };
      });

      const { error } = await supabase
        .from("template_exercises")
        .update({ planned_sets: templatePayload as any })
        .eq("id", exercise.id);

      if (error) {
        console.error("Error saving sets:", error);
        toast.error(t("common.error"));
        return;
      }

      if (!isCardio) {
        await persistGymSets(updatedSets);
      }
    },
    [exercise.id, isCardio, persistGymSets, t],
  );

  const handleAddSet = async () => {
    const newSet: PlannedSet = isCardio
      ? { minutes: DEFAULT_CARDIO_MINUTES, status: "pending" }
      : { weight: undefined, reps: undefined, status: "pending" };

    const updatedSets = [...sets, newSet];
    setSets(updatedSets);
    await saveSets(updatedSets);
  };

  const handleStatusToggle = async (index: number) => {
    const updatedSets = [...sets];
    const currentStatus = updatedSets[index].status ?? "pending";
    const nextStatus: SetStatus =
      currentStatus === "pending"
        ? "success"
        : currentStatus === "success"
          ? "failed"
          : "pending";

    updatedSets[index] = { ...updatedSets[index], status: nextStatus };
    setSets(updatedSets);
    await saveSets(updatedSets);
  };

  const confirmDeleteExercise = async () => {
    const { error } = await supabase
      .from("template_exercises")
      .delete()
      .eq("id", exercise.id);

    if (error) {
      toast.error(t("common.error"));
      return;
    }

    toast.success(t("gym.exerciseDeleted"));
    setShowDeleteDialog(false);
    onUpdate();
  };

  const handleSetChange = async (
    index: number,
    field: keyof PlannedSet,
    value: number | undefined,
  ) => {
    const updatedSets = [...sets];
    updatedSets[index] = { ...updatedSets[index], [field]: value };
    setSets(updatedSets);
    await saveSets(updatedSets);
  };

  const handleDeleteSet = async (index: number) => {
    const updatedSets = sets.filter((_, i) => i !== index);
    setSets(updatedSets);
    await saveSets(updatedSets);
  };

  return (
    <div className="p-4 rounded-lg bg-card border border-border space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {exercise.exercise_name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t(`gym.exerciseTypes.${exercise.exercise_type}`)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowDeleteDialog(true)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("gym.deleteExerciseTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("gym.deleteExerciseConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteExercise}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-2">
        {sets.map((set, index) => {
          const status = set.status ?? "pending";
          if (isCardio) {
            return (
              <div key={index} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {t("gym.series")} {index + 1}
                </span>
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    type="number"
                    value={
                      typeof set.minutes === "number" && !Number.isNaN(set.minutes)
                        ? set.minutes
                        : ""
                    }
                    onChange={(event) => {
                      const raw = event.target.value;
                      const parsed =
                        raw === "" ? undefined : parseFloat(raw.replace(",", "."));
                      handleSetChange(
                        index,
                        "minutes",
                        parsed === undefined || Number.isNaN(parsed) ? undefined : parsed,
                      );
                    }}
                    className="w-20 h-8"
                    placeholder={t("gym.minutes")}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {t("gym.minutes")}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleStatusToggle(index)}
                  className={cn(
                    "h-8 w-8 shrink-0",
                    status === "success" &&
                      "text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100",
                    status === "failed" &&
                      "text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100",
                  )}
                >
                  {status === "success" && <Check className="w-4 h-4" />}
                  {status === "failed" && <X className="w-4 h-4" />}
                  {status === "pending" && <Check className="w-4 h-4 opacity-30" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteSet(index)}
                  className="text-destructive hover:text-destructive h-8 w-8 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          }

          const ghostEntry = ghostValues?.[index + 1];
          const ghostPair = formatGhostPair(ghostEntry);
          const weightGhostText = ghostPair ?? "KG";
          const repsGhostText = ghostPair ?? t("gym.reps");
          const hasWeightValue =
            typeof set.weight === "number" && !Number.isNaN(set.weight);
          const hasRepsValue =
            typeof set.reps === "number" && !Number.isNaN(set.reps);

          return (
            <div key={index} className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {t("gym.series")} {index + 1}
              </span>

              <div className="relative w-16 h-8">
                <Input
                  type="number"
                  value={hasWeightValue ? set.weight : ""}
                  onChange={(event) => {
                    const raw = event.target.value;
                    const parsed =
                      raw === "" ? undefined : parseFloat(raw.replace(",", "."));
                    const sanitized =
                      parsed === undefined || Number.isNaN(parsed) ? undefined : parsed;
                    handleSetChange(index, "weight", sanitized);
                  }}
                  className="w-full h-full peer"
                  aria-label={`Set ${index + 1} peso (kg)`}
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute inset-0 flex items-center px-3 text-sm text-[#ffffff33] transition-opacity",
                    "peer-focus:opacity-0",
                    hasWeightValue ? "opacity-0" : "opacity-100",
                  )}
                >
                  {weightGhostText}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">kg</span>

              <div className="relative w-16 h-8">
                <Input
                  type="number"
                  value={hasRepsValue ? set.reps : ""}
                  onChange={(event) => {
                    const raw = event.target.value;
                    const parsed =
                      raw === "" ? undefined : parseInt(raw.replace(",", "."), 10);
                    const sanitized =
                      parsed === undefined || Number.isNaN(parsed) ? undefined : parsed;
                    handleSetChange(index, "reps", sanitized);
                  }}
                  className="w-full h-full peer"
                  aria-label={`Set ${index + 1} repeticiones`}
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute inset-0 flex items-center px-3 text-sm text-[#ffffff33] transition-opacity",
                    "peer-focus:opacity-0",
                    hasRepsValue ? "opacity-0" : "opacity-100",
                  )}
                >
                  {repsGhostText}
                </span>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {t("gym.reps")}
              </span>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleStatusToggle(index)}
                className={cn(
                  "h-8 w-8 shrink-0",
                  status === "success" &&
                    "text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100",
                  status === "failed" &&
                    "text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100",
                )}
              >
                {status === "success" && <Check className="w-4 h-4" />}
                {status === "failed" && <X className="w-4 h-4" />}
                {status === "pending" && <Check className="w-4 h-4 opacity-30" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteSet(index)}
                className="text-destructive hover:text-destructive h-8 w-8 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          );
        })}
      </div>

      <Button variant="outline" size="sm" onClick={handleAddSet} className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        {t("gym.addSet")}
      </Button>
    </div>
  );
};
