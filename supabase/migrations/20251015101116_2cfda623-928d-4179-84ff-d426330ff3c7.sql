-- =====================================================
-- MIGRACIÓN: SISTEMA DE RECETAS
-- =====================================================

-- Tabla para almacenar recetas
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabla para almacenar los ingredientes de cada receta
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

-- Habilitar RLS
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_items ENABLE ROW LEVEL SECURITY;

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

-- Trigger para actualizar updated_at
CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON public.recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_items_recipe_id ON public.recipe_items(recipe_id);