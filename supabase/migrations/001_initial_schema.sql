-- ═══════════════════════════════════════════════════════════════════
-- IronTribe Accountability App — Initial Schema
-- Migration 001
--
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
--
-- Table creation order matters because of foreign keys:
--   users → goals → tasks → task_logs
-- ═══════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────
-- USERS
--
-- Every person in the system — both coaches and clients.
--
-- Note: When we add Supabase Auth later, this table's `id` will be
-- linked to `auth.users` so login is tied to these records.
-- ───────────────────────────────────────────────────────────────────
create table public.users (
  id         uuid        primary key default gen_random_uuid(),
  email      text        not null unique,
  name       text        not null,

  -- role must be exactly 'coach' or 'client' — nothing else is allowed
  role       text        not null check (role in ('coach', 'client')),

  created_at timestamptz not null default now()
);

-- Index: we'll frequently look up a user by email (e.g. at login)
create index on public.users (email);


-- ───────────────────────────────────────────────────────────────────
-- GOALS
--
-- A client's primary goal. Each goal belongs to one user (client).
-- `target_days_per_week` defines how many days per week the client
-- is expected to complete their tasks (used to compute weekly compliance).
-- ───────────────────────────────────────────────────────────────────
create table public.goals (
  id                   uuid        primary key default gen_random_uuid(),

  -- Which client owns this goal
  user_id              uuid        not null references public.users (id) on delete cascade,

  goal_name            text        not null,

  -- Must be a real week value: 1–7 days
  target_days_per_week integer     not null default 7
                                   check (target_days_per_week between 1 and 7),

  created_at           timestamptz not null default now()
);

-- Index: we'll often query "give me all goals for this user"
create index on public.goals (user_id);


-- ───────────────────────────────────────────────────────────────────
-- TASKS
--
-- The individual habits/actions that make up a goal.
-- Example: goal = "Lose 50 lbs" → tasks = "Morning walk", "Drink 100oz water"
--
-- Tasks are templates — they don't have a date.
-- Whether a task was done on a given day is tracked in task_logs.
-- ───────────────────────────────────────────────────────────────────
create table public.tasks (
  id         uuid        primary key default gen_random_uuid(),

  -- Which goal this task belongs to
  goal_id    uuid        not null references public.goals (id) on delete cascade,

  task_name  text        not null,

  created_at timestamptz not null default now()
);

-- Index: we'll often query "give me all tasks for this goal"
create index on public.tasks (goal_id);


-- ───────────────────────────────────────────────────────────────────
-- TASK_LOGS
--
-- One row = one client's completion record for one task on one day.
--
-- This is the most queried table. Compliance is calculated from it:
--   daily compliance  = count(completed=true)  / count(*)  for a given user + date
--   weekly compliance = count(completed=true)  / count(*)  for a given user + date range
--
-- The unique constraint on (task_id, user_id, date) prevents duplicate
-- entries — a client can only have one record per task per day.
-- ───────────────────────────────────────────────────────────────────
create table public.task_logs (
  id         uuid        primary key default gen_random_uuid(),

  -- Which task was (or wasn't) completed
  task_id    uuid        not null references public.tasks (id) on delete cascade,

  -- Which client this log belongs to
  user_id    uuid        not null references public.users (id) on delete cascade,

  -- The calendar date of the log entry (not a timestamp — just the date)
  -- Stored as `date` type so "2026-03-10" doesn't shift with timezones
  date       date        not null,

  -- Did the client complete this task on this date?
  completed  boolean     not null default false,

  created_at timestamptz not null default now(),

  -- Enforce one log per task per user per day
  unique (task_id, user_id, date)
);

-- Indexes: the two most common query patterns
create index on public.task_logs (user_id, date);   -- "show me all logs for user X on date Y"
create index on public.task_logs (task_id, date);   -- "show me all logs for task X on date Y"
