-- ─────────────────────────────────────────────
-- Migration 006: client profile fields
--
-- Adds phone_number to users and goal_date to goals.
-- Both are nullable — existing rows are unaffected.
-- ─────────────────────────────────────────────

-- Optional contact field on users.
-- Not required for app functionality; coaches can fill it in later.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone_number text;

-- Target completion date for a goal.
-- Used on the Add Client form and the client detail page.
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS goal_date date;
