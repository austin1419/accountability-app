-- ═══════════════════════════════════════════════════════════════════
-- Migration 003 — Disable Row Level Security for development
--
-- What is RLS?
--   Row Level Security is a Supabase feature that restricts which rows
--   a user can see or edit. When enabled with NO policies defined,
--   it silently returns 0 rows for ALL queries — no error, just empty.
--   This is the most common reason a connected app shows blank data.
--
-- Why disable it now?
--   We have no auth yet. There are no users logged in, so there is no
--   "current user" to write policies for. Disabling RLS lets the anon
--   key read all data freely during development.
--
-- What happens later?
--   When we add Supabase Auth, we will re-enable RLS and add policies
--   like: "a client can only read their own rows".
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════

alter table public.users      disable row level security;
alter table public.goals      disable row level security;
alter table public.tasks      disable row level security;
alter table public.task_logs  disable row level security;
