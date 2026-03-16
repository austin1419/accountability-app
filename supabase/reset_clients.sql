-- ═══════════════════════════════════════════════════════════════════
-- RESET CLIENTS — Purge all client data, preserve coach accounts
--
-- Run this in the Supabase SQL Editor.
-- This deletes ALL client records and related data.
-- Coach accounts (role = 'coach') are NOT touched.
--
-- Dependency order: children first, parents last.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Tables with NO ACTION FKs (must delete explicitly) ────────
DELETE FROM public.daily_journal
  WHERE user_id IN (SELECT id FROM public.users WHERE role = 'client');

DELETE FROM public.pulse_chat_messages
  WHERE user_id IN (SELECT id FROM public.users WHERE role = 'client');

DELETE FROM public.client_notes
  WHERE client_id IN (SELECT id FROM public.users WHERE role = 'client');

-- ── 2. Untyped tables (later migrations) ─────────────────────────
DELETE FROM public.coach_alert_state
  WHERE client_id IN (SELECT id FROM public.users WHERE role = 'client');

DELETE FROM public.coach_notes
  WHERE client_id IN (SELECT id FROM public.users WHERE role = 'client');

-- ── 3. AI tables ─────────────────────────────────────────────────
DELETE FROM public.ai_conversations
  WHERE user_id IN (SELECT id FROM public.users WHERE role = 'client');

DELETE FROM public.ai_memories
  WHERE user_id IN (SELECT id FROM public.users WHERE role = 'client');

-- ── 4. Coaching profile ──────────────────────────────────────────
DELETE FROM public.coaching_profile_answers
  WHERE user_id IN (SELECT id FROM public.users WHERE role = 'client');

-- ── 5. Logs (depend on tasks/goals/users) ────────────────────────
DELETE FROM public.task_logs
  WHERE user_id IN (SELECT id FROM public.users WHERE role = 'client');

DELETE FROM public.weight_logs
  WHERE user_id IN (SELECT id FROM public.users WHERE role = 'client');

DELETE FROM public.progress_logs
  WHERE user_id IN (SELECT id FROM public.users WHERE role = 'client');

-- ── 6. Tasks (depend on goals) ───────────────────────────────────
DELETE FROM public.tasks
  WHERE goal_id IN (
    SELECT id FROM public.goals
    WHERE user_id IN (SELECT id FROM public.users WHERE role = 'client')
  );

-- ── 7. Goals (depend on users) ───────────────────────────────────
DELETE FROM public.goals
  WHERE user_id IN (SELECT id FROM public.users WHERE role = 'client');

-- ── 8. Client user rows ──────────────────────────────────────────
DELETE FROM public.users WHERE role = 'client';

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- After running this, manually delete client auth accounts:
--
-- In Supabase Dashboard → Authentication → Users
-- Delete all users EXCEPT the coach (austin@irontribefitness.com)
--
-- Or use the Supabase admin API to delete them programmatically.
-- ═══════════════════════════════════════════════════════════════════
