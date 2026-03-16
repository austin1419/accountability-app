-- ═══════════════════════════════════════════════════════════════════
-- Migration 019 — Coach-Client Assignment Foundation
--
-- Adds a nullable coach_id column to public.users so each client
-- can be assigned to a specific coach. This enables roster-level
-- queries filtered by coach.
--
-- This migration is SCHEMA ONLY. It does not backfill any data.
-- Backfill should be run manually after verifying coach/client state.
-- See the separate backfill statement in the migration comments below.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Add nullable coach_id column
alter table public.users
  add column coach_id uuid references public.users(id) on delete set null;

-- 2. Index for efficient roster filtering
create index idx_users_coach_id on public.users (coach_id)
  where coach_id is not null;

-- 3. Documentation
comment on column public.users.coach_id is
  'FK to the coach (users.id) assigned to this client. NULL for coaches and unassigned clients.';


-- ═══════════════════════════════════════════════════════════════════
-- MANUAL BACKFILL — Run in Supabase SQL Editor after migration.
--
-- Two-step process. Do not combine into one statement.
--
-- Step 1: Identify which coach should own the roster.
-- Step 2: Paste the chosen coach ID into the update statement.
--
-- Only active clients are updated. Archived / inactive clients
-- are left with coach_id = NULL. Coach rows are not touched.
-- ═══════════════════════════════════════════════════════════════════

-- ── STEP 1: List all coach accounts ──────────────────────────────
-- Run this. Review the output. Pick the correct coach ID.
--
-- SELECT id, name, email, auth_id, is_active
--   FROM public.users
--  WHERE role = 'coach'
--  ORDER BY name;

-- ── STEP 2: Assign active clients to the chosen coach ───────────
-- Replace <PASTE_COACH_ID_HERE> with the exact UUID from Step 1.
-- Do NOT run this until you have confirmed the correct coach ID.
--
-- UPDATE public.users
--    SET coach_id = '<PASTE_COACH_ID_HERE>'
--  WHERE role = 'client'
--    AND is_active = true;
