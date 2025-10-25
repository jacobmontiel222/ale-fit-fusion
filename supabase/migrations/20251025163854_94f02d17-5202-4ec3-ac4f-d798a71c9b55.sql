-- Añadir campo para almacenar series planificadas en template_exercises
ALTER TABLE template_exercises
ADD COLUMN planned_sets JSONB DEFAULT '[]'::jsonb;

-- Comentario: planned_sets almacenará un array de series con formato:
-- Para ejercicios normales: [{ "weight": 50, "reps": 10, "rest_seconds": 90 }]
-- Para cardio: [{ "minutes": 20 }]