-- ═══════════════════════════════════════════════════════════════════
-- Seed data for development
--
-- Creates one complete set of test data:
--   1 coach, 1 client, 1 goal, 4 tasks, 8 days of task logs
--
-- Run AFTER both migrations (001 and 002).
-- Safe to run multiple times — ON CONFLICT clauses prevent duplicates.
--
-- Fixed UUIDs are used so the frontend can reference a known client ID.
-- ═══════════════════════════════════════════════════════════════════


-- ── Users ─────────────────────────────────────────────────────────

insert into public.users (id, email, name, role) values
  ('00000000-0000-0000-0000-000000000001', 'coach@example.com',  'Coach Mike',    'coach'),
  ('00000000-0000-0000-0000-000000000002', 'alex@example.com',   'Alex Johnson',  'client')
on conflict (id) do nothing;


-- ── Goal ──────────────────────────────────────────────────────────
-- Weight data mirrors the mock data so the UI looks identical after switch.

insert into public.goals (id, user_id, goal_name, target_days_per_week, start_weight, goal_weight, current_weight) values
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',  -- Alex's user_id
    'Lose 50 lbs by December 31, 2026',
    7,
    240.0,   -- start_weight
    190.0,   -- goal_weight
    218.0    -- current_weight (22 lbs lost so far = 44% progress)
  )
on conflict (id) do nothing;


-- ── Tasks ─────────────────────────────────────────────────────────
-- Four daily habits assigned to Alex's goal.

insert into public.tasks (id, goal_id, task_name) values
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'Morning walk — 30 min'),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', 'Drink 100 oz of water'),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000003', 'Take daily supplements'),
  ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000003', 'No eating after 8pm')
on conflict (id) do nothing;


-- ── Task Logs ─────────────────────────────────────────────────────
-- 7 days of logs (today back through 6 days ago).
-- Each day has one row per task (true = done, false = not done).
--
-- CURRENT_DATE is today's date at the time you run this query.
-- Using INTERVAL arithmetic keeps this seed portable — no hardcoded dates.
--
-- Daily compliance breakdown:
--   Today (day 0):  2/4 = 50%  (walk ✓, water ✓, supplements ✗, no-eating ✗)
--   Day -1:         4/4 = 100%
--   Day -2:         4/4 = 100%
--   Day -3:         3/4 = 75%
--   Day -4:         3/4 = 75%
--   Day -5:         3/4 = 75%
--   Day -6:         3/4 = 75%
--
-- Weekly total: 22 completed / 28 expected = 78.6% ≈ 79%


-- Today
insert into public.task_logs (task_id, user_id, date, completed) values
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', current_date, true),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', current_date, true),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', current_date, false),
  ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002', current_date, false)
on conflict (task_id, user_id, date) do nothing;

-- 1 day ago (all complete)
insert into public.task_logs (task_id, user_id, date, completed) values
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', current_date - interval '1 day', true),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', current_date - interval '1 day', true),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', current_date - interval '1 day', true),
  ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002', current_date - interval '1 day', true)
on conflict (task_id, user_id, date) do nothing;

-- 2 days ago (all complete)
insert into public.task_logs (task_id, user_id, date, completed) values
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', current_date - interval '2 days', true),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', current_date - interval '2 days', true),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', current_date - interval '2 days', true),
  ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002', current_date - interval '2 days', true)
on conflict (task_id, user_id, date) do nothing;

-- 3 days ago (3/4 complete)
insert into public.task_logs (task_id, user_id, date, completed) values
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', current_date - interval '3 days', true),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', current_date - interval '3 days', true),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', current_date - interval '3 days', true),
  ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002', current_date - interval '3 days', false)
on conflict (task_id, user_id, date) do nothing;

-- 4 days ago (3/4 complete)
insert into public.task_logs (task_id, user_id, date, completed) values
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', current_date - interval '4 days', true),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', current_date - interval '4 days', true),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', current_date - interval '4 days', true),
  ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002', current_date - interval '4 days', false)
on conflict (task_id, user_id, date) do nothing;

-- 5 days ago (3/4 complete)
insert into public.task_logs (task_id, user_id, date, completed) values
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', current_date - interval '5 days', true),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', current_date - interval '5 days', true),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', current_date - interval '5 days', true),
  ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002', current_date - interval '5 days', false)
on conflict (task_id, user_id, date) do nothing;

-- 6 days ago (3/4 complete)
insert into public.task_logs (task_id, user_id, date, completed) values
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', current_date - interval '6 days', true),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', current_date - interval '6 days', true),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', current_date - interval '6 days', true),
  ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002', current_date - interval '6 days', false)
on conflict (task_id, user_id, date) do nothing;
