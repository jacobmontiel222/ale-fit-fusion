-- Tabla de objetivos nutricionales
CREATE TABLE public.nutrition_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calories_goal INTEGER NOT NULL DEFAULT 2000,
  protein_goal INTEGER NOT NULL DEFAULT 150,
  fat_goal INTEGER NOT NULL DEFAULT 65,
  carbs_goal INTEGER NOT NULL DEFAULT 250,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.nutrition_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own nutrition goals"
ON public.nutrition_goals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own nutrition goals"
ON public.nutrition_goals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nutrition goals"
ON public.nutrition_goals FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nutrition goals"
ON public.nutrition_goals FOR DELETE
USING (auth.uid() = user_id);

-- Tabla de historial de comidas
CREATE TABLE public.meal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('Desayuno', 'Comida', 'Cena')),
  food_name TEXT NOT NULL,
  brand TEXT,
  calories NUMERIC NOT NULL,
  protein NUMERIC NOT NULL,
  fat NUMERIC NOT NULL,
  carbs NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  entry_method TEXT NOT NULL CHECK (entry_method IN ('manual', 'scanner')),
  barcode TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_meal_entries_user_date ON public.meal_entries(user_id, date);

ALTER TABLE public.meal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own meal entries"
ON public.meal_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meal entries"
ON public.meal_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal entries"
ON public.meal_entries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal entries"
ON public.meal_entries FOR DELETE
USING (auth.uid() = user_id);

-- Tabla de rutinas de gimnasio
CREATE TABLE public.gym_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gym_routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own gym routines"
ON public.gym_routines FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gym routines"
ON public.gym_routines FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gym routines"
ON public.gym_routines FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gym routines"
ON public.gym_routines FOR DELETE
USING (auth.uid() = user_id);

-- Tabla de ejercicios dentro de rutinas
CREATE TABLE public.routine_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES public.gym_routines(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  sets INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight NUMERIC,
  rest_seconds INTEGER,
  notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exercises from their routines"
ON public.routine_exercises FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gym_routines
    WHERE gym_routines.id = routine_exercises.routine_id
    AND gym_routines.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert exercises to their routines"
ON public.routine_exercises FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gym_routines
    WHERE gym_routines.id = routine_exercises.routine_id
    AND gym_routines.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update exercises in their routines"
ON public.routine_exercises FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.gym_routines
    WHERE gym_routines.id = routine_exercises.routine_id
    AND gym_routines.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete exercises from their routines"
ON public.routine_exercises FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.gym_routines
    WHERE gym_routines.id = routine_exercises.routine_id
    AND gym_routines.user_id = auth.uid()
  )
);

-- Tabla de registros de peso diario
CREATE TABLE public.daily_weight (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_weight_user_date ON public.daily_weight(user_id, date);

ALTER TABLE public.daily_weight ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weight records"
ON public.daily_weight FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weight records"
ON public.daily_weight FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weight records"
ON public.daily_weight FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weight records"
ON public.daily_weight FOR DELETE
USING (auth.uid() = user_id);

-- Tabla de registros de pasos diarios
CREATE TABLE public.daily_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  steps INTEGER NOT NULL,
  distance_km NUMERIC,
  calories_burned NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_steps_user_date ON public.daily_steps(user_id, date);

ALTER TABLE public.daily_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own steps records"
ON public.daily_steps FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own steps records"
ON public.daily_steps FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own steps records"
ON public.daily_steps FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own steps records"
ON public.daily_steps FOR DELETE
USING (auth.uid() = user_id);

-- Triggers para actualizar updated_at automáticamente
CREATE TRIGGER update_nutrition_goals_updated_at
BEFORE UPDATE ON public.nutrition_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meal_entries_updated_at
BEFORE UPDATE ON public.meal_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gym_routines_updated_at
BEFORE UPDATE ON public.gym_routines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_routine_exercises_updated_at
BEFORE UPDATE ON public.routine_exercises
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_weight_updated_at
BEFORE UPDATE ON public.daily_weight
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_steps_updated_at
BEFORE UPDATE ON public.daily_steps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();