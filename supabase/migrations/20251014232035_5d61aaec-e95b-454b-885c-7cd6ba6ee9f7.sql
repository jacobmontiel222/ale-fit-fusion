-- Add profile fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS height INTEGER,
ADD COLUMN IF NOT EXISTS current_weight DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS target_weight DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add comments
COMMENT ON COLUMN public.profiles.height IS 'Height in centimeters';
COMMENT ON COLUMN public.profiles.current_weight IS 'Current weight in kilograms';
COMMENT ON COLUMN public.profiles.target_weight IS 'Target weight in kilograms';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to user avatar image';