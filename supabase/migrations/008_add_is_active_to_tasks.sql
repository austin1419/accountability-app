-- Migration 008 — add is_active flag to tasks
--
-- Enables soft-delete / archiving of habits.
-- Setting is_active = false hides a habit from the client app
-- and from compliance calculations, while preserving the row
-- and its history in the coach's "Old Habits" view.

alter table public.tasks
  add column is_active boolean not null default true;

-- Index: active-task queries always filter on this column
create index on public.tasks (goal_id, is_active);
