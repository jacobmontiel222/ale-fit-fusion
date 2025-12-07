import { useState, useEffect } from "react";
import { GripVertical, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface Exercise {
  id: string;
  exercise_name: string;
  order_index: number;
}

interface ReorderExercisesModalProps {
  open: boolean;
  onClose: () => void;
  templateId: string;
  exercises: Exercise[];
  onReorder: () => void;
}

export const ReorderExercisesModal = ({
  open,
  onClose,
  templateId,
  exercises,
  onReorder,
}: ReorderExercisesModalProps) => {
  const { t } = useTranslation();
  const [orderedExercises, setOrderedExercises] = useState<Exercise[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchCurrentY, setTouchCurrentY] = useState<number | null>(null);

  useEffect(() => {
    setOrderedExercises([...exercises].sort((a, b) => a.order_index - b.order_index));
  }, [exercises]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === index) return;

    const newExercises = [...orderedExercises];
    const draggedExercise = newExercises[draggedIndex];
    
    // Remove from old position
    newExercises.splice(draggedIndex, 1);
    // Insert at new position
    newExercises.splice(index, 0, draggedExercise);
    
    setOrderedExercises(newExercises);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleTouchStart = (index: number, e: React.TouchEvent) => {
    setDraggedIndex(index);
    setTouchStartY(e.touches[0].clientY);
    setTouchCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (draggedIndex === null || touchStartY === null) return;
    
    e.preventDefault();
    const currentY = e.touches[0].clientY;
    setTouchCurrentY(currentY);
    
    // Calculate which position we're over based on touch position
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const exerciseElement = element?.closest('[data-exercise-index]');
    
    if (exerciseElement) {
      const targetIndex = parseInt(exerciseElement.getAttribute('data-exercise-index') || '0');
      
      if (targetIndex !== draggedIndex) {
        const newExercises = [...orderedExercises];
        const draggedExercise = newExercises[draggedIndex];
        
        newExercises.splice(draggedIndex, 1);
        newExercises.splice(targetIndex, 0, draggedExercise);
        
        setOrderedExercises(newExercises);
        setDraggedIndex(targetIndex);
      }
    }
  };

  const handleTouchEnd = () => {
    setDraggedIndex(null);
    setTouchStartY(null);
    setTouchCurrentY(null);
  };

  const handleSave = async () => {
    try {
      // Update order_index for all exercises
      const updates = orderedExercises.map((exercise, index) => ({
        id: exercise.id,
        order_index: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('template_exercises')
          .update({ order_index: update.order_index })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast.success(t('gym.exercisesReordered') || 'Ejercicios reordenados');
      onReorder();
      onClose();
    } catch (error) {
      console.error('Error reordering exercises:', error);
      toast.error(t('gym.errorReordering') || 'Error al reordenar ejercicios');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle>{t('gym.reorderExercises') || 'Reordenar ejercicios'}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 py-4">
          {orderedExercises.map((exercise, index) => (
            <div
              key={exercise.id}
              data-exercise-index={index}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(index, e)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={`flex items-center gap-3 p-3 bg-secondary/50 rounded-lg cursor-grab active:cursor-grabbing transition-all touch-none ${
                draggedIndex === index ? 'opacity-50 scale-105' : 'opacity-100'
              }`}
            >
              <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium text-foreground flex-1">
                {index + 1}. {exercise.exercise_name}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {t('common.cancel') || 'Cancelar'}
          </Button>
          <Button onClick={handleSave} className="flex-1">
            {t('common.save') || 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
