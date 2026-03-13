-- 012: Add profile context fields (gender, date_of_birth, height)
-- These are metadata for future AI coaching — they do NOT affect progress math.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS gender        text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS height        numeric;
