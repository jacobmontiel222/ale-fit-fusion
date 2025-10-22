-- Add micronutrients column to meal_entries table
ALTER TABLE public.meal_entries 
ADD COLUMN micronutrients JSONB DEFAULT '{}'::jsonb;

-- Add comment to document the column structure
COMMENT ON COLUMN public.meal_entries.micronutrients IS 'Stores vitamins and minerals data in format: {"vitamins": [{"name": "...", "amount": 0, "unit": "..."}], "minerals": [...]}';