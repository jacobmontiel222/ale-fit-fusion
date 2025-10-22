-- Crear tabla de alimentos en Supabase
CREATE TABLE public.foods (
  id text PRIMARY KEY,
  name text NOT NULL,
  brand text,
  category text NOT NULL,
  tags jsonb DEFAULT '[]'::jsonb,
  
  -- Macronutrientes por 100g
  calories numeric NOT NULL,
  protein numeric NOT NULL,
  fat numeric NOT NULL,
  carbs numeric NOT NULL,
  fiber numeric,
  sugar numeric,
  
  -- Micronutrientes por 100g
  micronutrients jsonb DEFAULT '{"vitamins": [], "minerals": []}'::jsonb,
  
  -- Información adicional
  serving_size numeric NOT NULL DEFAULT 100,
  serving_unit text NOT NULL DEFAULT 'g',
  barcode text,
  
  -- Metadatos
  search_terms text[],
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Índices para búsqueda rápida
CREATE INDEX idx_foods_name ON public.foods USING gin(to_tsvector('spanish', name));
CREATE INDEX idx_foods_category ON public.foods(category);
CREATE INDEX idx_foods_search_terms ON public.foods USING gin(search_terms);

-- Política RLS: los alimentos son de solo lectura para todos
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Foods are viewable by everyone"
  ON public.foods
  FOR SELECT
  USING (true);

-- Solo administradores pueden insertar/actualizar/borrar (por ahora nadie)
CREATE POLICY "Only service role can modify foods"
  ON public.foods
  FOR ALL
  USING (false);