-- Tabla de plantillas de rutina (ej: "Pierna", "Pecho", "Espalda")
CREATE TABLE public.workout_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own workout templates"
ON public.workout_templates FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workout templates"
ON public.workout_templates FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout templates"
ON public.workout_templates FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout templates"
ON public.workout_templates FOR DELETE
USING (auth.uid() = user_id);

-- Tabla de ejercicios base de cada plantilla
CREATE TABLE public.template_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  exercise_type TEXT NOT NULL DEFAULT 'compound', -- 'compound', 'accessory', 'calisthenics'
  reps_min INTEGER NOT NULL DEFAULT 5,
  reps_max INTEGER NOT NULL DEFAULT 8,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.template_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exercises from their templates"
ON public.template_exercises FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.workout_templates
  WHERE workout_templates.id = template_exercises.template_id
  AND workout_templates.user_id = auth.uid()
));

CREATE POLICY "Users can insert exercises to their templates"
ON public.template_exercises FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.workout_templates
  WHERE workout_templates.id = template_exercises.template_id
  AND workout_templates.user_id = auth.uid()
));

CREATE POLICY "Users can update exercises in their templates"
ON public.template_exercises FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.workout_templates
  WHERE workout_templates.id = template_exercises.template_id
  AND workout_templates.user_id = auth.uid()
));

CREATE POLICY "Users can delete exercises from their templates"
ON public.template_exercises FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.workout_templates
  WHERE workout_templates.id = template_exercises.template_id
  AND workout_templates.user_id = auth.uid()
));

-- Tabla de programación semanal (qué plantilla va en cada día)
CREATE TABLE public.weekly_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Lunes, 6=Domingo
  template_id UUID REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  is_rest_day BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_of_week)
);

ALTER TABLE public.weekly_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weekly schedule"
ON public.weekly_schedule FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly schedule"
ON public.weekly_schedule FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly schedule"
ON public.weekly_schedule FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly schedule"
ON public.weekly_schedule FOR DELETE
USING (auth.uid() = user_id);

-- Tabla de sesiones de entrenamiento (instancias reales de entrenamientos)
CREATE TABLE public.workout_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  template_id UUID REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own workout sessions"
ON public.workout_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workout sessions"
ON public.workout_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout sessions"
ON public.workout_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout sessions"
ON public.workout_sessions FOR DELETE
USING (auth.uid() = user_id);

-- Tabla de historial de ejercicios (registro detallado de cada ejercicio)
CREATE TABLE public.exercise_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  exercise_name TEXT NOT NULL,
  sets_data JSONB NOT NULL, -- Array de objetos {set: 1, weight: 60, reps: 8, rpe: 8, completed: true}
  suggested_weight NUMERIC,
  suggested_reps_min INTEGER,
  suggested_reps_max INTEGER,
  goal_achieved BOOLEAN,
  technique_good BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.exercise_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own exercise history"
ON public.exercise_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exercise history"
ON public.exercise_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise history"
ON public.exercise_history FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercise history"
ON public.exercise_history FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_workout_templates_updated_at
BEFORE UPDATE ON public.workout_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_weekly_schedule_updated_at
BEFORE UPDATE ON public.weekly_schedule
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workout_sessions_updated_at
BEFORE UPDATE ON public.workout_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();