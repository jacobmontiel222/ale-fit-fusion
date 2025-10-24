import { useMemo } from 'react';

interface ExerciseData {
  weight: number;
  reps: number;
  technique_good: boolean;
  rpe?: number;
}

interface ProgressionResult {
  suggestedWeight: number;
  suggestedRepsMin: number;
  suggestedRepsMax: number;
  message: string;
}

export const useProgressionLogic = () => {
  const calculateProgression = useMemo(() => {
    return (
      lastExercise: ExerciseData | null,
      exerciseType: 'compound' | 'accessory' | 'calisthenics',
      repsMin: number,
      repsMax: number
    ): ProgressionResult => {
      // Si no hay datos previos, sugerir valores iniciales
      if (!lastExercise) {
        return {
          suggestedWeight: 0,
          suggestedRepsMin: repsMin,
          suggestedRepsMax: repsMax,
          message: 'Calibración inicial'
        };
      }

      const { weight, reps, technique_good, rpe } = lastExercise;

      // Regla de seguridad: técnica mala o RPE muy alto
      if (!technique_good || (rpe && rpe >= 9.5)) {
        return {
          suggestedWeight: weight,
          suggestedRepsMin: repsMin,
          suggestedRepsMax: repsMax,
          message: 'Mantener para mejorar técnica'
        };
      }

      // Lógica según tipo de ejercicio
      if (exerciseType === 'compound') {
        // Para básicos: rango 5-8 reps
        if (reps >= repsMax) {
          // Alcanzó el tope, subir carga 2.5-5%
          const increment = Math.max(2.5, weight * 0.025);
          const newWeight = Math.round((weight + increment) * 2) / 2; // Redondear a .5
          return {
            suggestedWeight: newWeight,
            suggestedRepsMin: repsMin,
            suggestedRepsMax: repsMax,
            message: `+${increment.toFixed(1)}kg (${((increment / weight) * 100).toFixed(1)}%)`
          };
        } else if (reps >= repsMin) {
          // Dentro del rango, mantener peso y subir reps
          return {
            suggestedWeight: weight,
            suggestedRepsMin: reps + 1,
            suggestedRepsMax: repsMax,
            message: 'Subir repeticiones'
          };
        } else {
          // Por debajo del rango, mantener
          return {
            suggestedWeight: weight,
            suggestedRepsMin: repsMin,
            suggestedRepsMax: repsMax,
            message: 'Mantener y mejorar técnica'
          };
        }
      } else if (exerciseType === 'accessory') {
        // Para accesorios: rango 10-15 reps, primero subir reps
        if (reps >= repsMax) {
          // Alcanzó el tope, subir carga mínimamente
          const increment = Math.max(2.5, weight * 0.025);
          const newWeight = Math.round((weight + increment) * 2) / 2;
          return {
            suggestedWeight: newWeight,
            suggestedRepsMin: repsMin,
            suggestedRepsMax: repsMax,
            message: `+${increment.toFixed(1)}kg`
          };
        } else {
          // Subir repeticiones primero
          return {
            suggestedWeight: weight,
            suggestedRepsMin: reps + 1,
            suggestedRepsMax: repsMax,
            message: 'Aumentar reps'
          };
        }
      } else {
        // Para calistenia: 6-12 reps, al tope añadir lastre
        if (reps >= repsMax) {
          // Añadir lastre mínimo
          const newWeight = weight === 0 ? 2.5 : weight + 2.5;
          return {
            suggestedWeight: newWeight,
            suggestedRepsMin: repsMin,
            suggestedRepsMax: repsMax,
            message: weight === 0 ? 'Añadir lastre' : `+2.5kg lastre`
          };
        } else {
          // Subir reps
          return {
            suggestedWeight: weight,
            suggestedRepsMin: reps + 1,
            suggestedRepsMax: repsMax,
            message: 'Aumentar reps'
          };
        }
      }
    };
  }, []);

  return { calculateProgression };
};
