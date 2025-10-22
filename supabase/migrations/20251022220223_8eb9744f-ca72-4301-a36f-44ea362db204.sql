-- Actualizar el constraint de entry_method para permitir 'database'
ALTER TABLE meal_entries 
DROP CONSTRAINT meal_entries_entry_method_check;

ALTER TABLE meal_entries 
ADD CONSTRAINT meal_entries_entry_method_check 
CHECK (entry_method = ANY (ARRAY['manual'::text, 'scanner'::text, 'database'::text]));