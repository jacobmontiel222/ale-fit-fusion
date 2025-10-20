-- Add avatar_icon and avatar_color to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_icon text DEFAULT 'apple',
ADD COLUMN IF NOT EXISTS avatar_color text DEFAULT '#10B981';