-- Add flag to control whether users share new foods with the community database
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS share_foods_with_community BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.share_foods_with_community IS 'Opt-in to share newly created foods with the community database';
