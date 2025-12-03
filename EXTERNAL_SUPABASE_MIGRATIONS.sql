-- =====================================================
-- MIGRACIONES PARA SUPABASE EXTERNO
-- =====================================================
-- Ejecuta estas migraciones en tu Supabase externo
-- desde el SQL Editor en el dashboard de Supabase
-- =====================================================

-- 1. Tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Usuario',
  height INTEGER,
  current_weight NUMERIC,
  target_weight NUMERIC,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Columna para controlar si el usuario comparte nuevos alimentos con la comunidad
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS share_foods_with_community BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Tabla de objetivos nutricionales
CREATE TABLE IF NOT EXISTS public.nutrition_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calories_goal INTEGER NOT NULL DEFAULT 2000,
  protein_goal INTEGER NOT NULL DEFAULT 150,
  fat_goal INTEGER NOT NULL DEFAULT 65,
  carbs_goal INTEGER NOT NULL DEFAULT 250,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Tabla de entradas de comidas
CREATE TABLE IF NOT EXISTS public.meal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  food_name TEXT NOT NULL,
  brand TEXT,
  amount NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  calories NUMERIC NOT NULL,
  protein NUMERIC NOT NULL,
  fat NUMERIC NOT NULL,
  carbs NUMERIC NOT NULL,
  barcode TEXT,
  entry_method TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. Tabla de peso diario
CREATE TABLE IF NOT EXISTS public.daily_weight (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 5. Tabla de pasos diarios
CREATE TABLE IF NOT EXISTS public.daily_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  steps INTEGER NOT NULL,
  distance_km NUMERIC,
  calories_burned NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 6. Tabla de rutinas de gimnasio
CREATE TABLE IF NOT EXISTS public.gym_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 7. Tabla de ejercicios de rutina
CREATE TABLE IF NOT EXISTS public.routine_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES public.gym_routines(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  sets INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight NUMERIC,
  rest_seconds INTEGER,
  notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 8. Tabla de recetas
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 9. Tabla de ingredientes de recetas
CREATE TABLE IF NOT EXISTS public.recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  calories NUMERIC NOT NULL,
  protein NUMERIC NOT NULL,
  fat NUMERIC NOT NULL,
  carbs NUMERIC NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuario')
  );
  RETURN NEW;
END;
$$;

-- Trigger para crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers para actualizar updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nutrition_goals_updated_at
  BEFORE UPDATE ON public.nutrition_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meal_entries_updated_at
  BEFORE UPDATE ON public.meal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_weight_updated_at
  BEFORE UPDATE ON public.daily_weight
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_steps_updated_at
  BEFORE UPDATE ON public.daily_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gym_routines_updated_at
  BEFORE UPDATE ON public.gym_routines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_routine_exercises_updated_at
  BEFORE UPDATE ON public.routine_exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_weight ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_items ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Políticas para nutrition_goals
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

-- Políticas para meal_entries
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

-- Políticas para daily_weight
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

-- Políticas para daily_steps
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

-- Políticas para gym_routines
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

-- Políticas para routine_exercises
CREATE POLICY "Users can view exercises from their routines"
  ON public.routine_exercises FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.gym_routines
    WHERE gym_routines.id = routine_exercises.routine_id
    AND gym_routines.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert exercises to their routines"
  ON public.routine_exercises FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.gym_routines
    WHERE gym_routines.id = routine_exercises.routine_id
    AND gym_routines.user_id = auth.uid()
  ));

CREATE POLICY "Users can update exercises in their routines"
  ON public.routine_exercises FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.gym_routines
    WHERE gym_routines.id = routine_exercises.routine_id
    AND gym_routines.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete exercises from their routines"
  ON public.routine_exercises FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.gym_routines
    WHERE gym_routines.id = routine_exercises.routine_id
    AND gym_routines.user_id = auth.uid()
  ));

-- Políticas para recipes
CREATE POLICY "Users can view their own recipes"
  ON public.recipes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recipes"
  ON public.recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipes"
  ON public.recipes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recipes"
  ON public.recipes FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para recipe_items
CREATE POLICY "Users can view items from their recipes"
  ON public.recipe_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.recipes
    WHERE recipes.id = recipe_items.recipe_id
    AND recipes.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert items to their recipes"
  ON public.recipe_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.recipes
    WHERE recipes.id = recipe_items.recipe_id
    AND recipes.user_id = auth.uid()
  ));

CREATE POLICY "Users can update items in their recipes"
  ON public.recipe_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.recipes
    WHERE recipes.id = recipe_items.recipe_id
    AND recipes.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete items from their recipes"
  ON public.recipe_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.recipes
    WHERE recipes.id = recipe_items.recipe_id
    AND recipes.user_id = auth.uid()
  ));

-- =====================================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_meal_entries_user_date ON public.meal_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_weight_user_date ON public.daily_weight(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_steps_user_date ON public.daily_steps(user_id, date);
CREATE INDEX IF NOT EXISTS idx_gym_routines_user ON public.gym_routines(user_id);
CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine ON public.routine_exercises(routine_id);
CREATE INDEX IF NOT EXISTS idx_recipes_user ON public.recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_items_recipe ON public.recipe_items(recipe_id);
