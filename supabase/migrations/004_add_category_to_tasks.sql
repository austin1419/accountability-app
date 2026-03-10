-- ═══════════════════════════════════════════════════════════════════
-- Migration 004 — Add category column to tasks
--
-- Why: The Tasks page groups habits by category (Movement, Nutrition,
--      Supplements). Previously this was stored only in mock data.
--      Now it lives in the database alongside the task.
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════

alter table public.tasks
  add column if not exists category text not null default 'General';

-- Backfill the 4 seed tasks with the correct categories
update public.tasks set category = 'Movement'    where id = '00000000-0000-0000-0000-000000000004';
update public.tasks set category = 'Nutrition'   where id = '00000000-0000-0000-0000-000000000005';
update public.tasks set category = 'Supplements' where id = '00000000-0000-0000-0000-000000000006';
update public.tasks set category = 'Nutrition'   where id = '00000000-0000-0000-0000-000000000007';
