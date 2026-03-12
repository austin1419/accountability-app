-- Migration 009 — goal history columns
--
-- Enables the "Change Goal" feature by tracking whether a goal is active
-- and recording who changed it, when, and why.
--
-- is_active     — false on superseded goals; active goal query filters on this
-- completed_at  — timestamp when this goal was closed out
-- change_reason — coach's stated reason for the goal change
-- completed_by  — UUID of the coach (users.id) who performed the change
--
-- Existing goals are backfilled with is_active = true so no data is lost
-- and all current queries continue to work unchanged.
--
-- The partial unique index enforces the invariant that a user can never
-- have more than one active goal at a time, guarding against double-submits
-- or bugs in the changeClientGoal action.

alter table public.goals
  add column is_active     boolean     not null default true,
  add column completed_at  timestamptz          default null,
  add column change_reason text                 default null,
  add column completed_by  uuid                 default null;

-- Backfill: mark all existing goals as active
update public.goals
  set is_active = true;

-- Partial unique index: one active goal per user at all times
create unique index goals_one_active_goal_per_user
  on public.goals (user_id)
  where is_active = true;

-- Supporting index: active-goal queries filter on (user_id, is_active)
create index on public.goals (user_id, is_active);
