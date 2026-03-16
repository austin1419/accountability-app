-- ═══════════════════════════════════════════════════════════════════
-- Migration 020 — get_client_compliance(user_id, days)
--
-- Reusable SQL function that replicates the per-client compliance
-- calculation currently performed in TypeScript (server-queries.ts).
--
-- Logic replicated from:
--   fetchAllClientsForCoach()  — lines 455-474
--   fetchClientDetail()        — lines 699-715
--   computeCompliance()        — lib/utils/computeCompliance.ts
--   effectiveStart()           — clamp window to goal/user created_at
--   daysBetween()              — inclusive calendar day count
--   cstDate()                  — all dates in America/Chicago timezone
--
-- Returns one row: user_id, days, completed_count, expected_count, compliance_pct
-- Read-only. No side effects.
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.get_client_compliance(
  p_user_id uuid,
  p_days    int
)
returns table (
  user_id         uuid,
  days            int,
  completed_count bigint,
  expected_count  bigint,
  compliance_pct  int
)
language plpgsql
stable               -- read-only, safe to cache within a transaction
security invoker     -- respects caller's permissions
as $$
declare
  v_today           date;
  v_window_start    date;
  v_created_date    date;
  v_effective_start date;
  v_task_count      bigint;
  v_goal_id         uuid;
  v_goal_created_at timestamptz;
  v_user_created_at timestamptz;
  v_completed       bigint;
  v_expected        bigint;
  v_pct             int;
  v_task_ids        uuid[];
begin
  -- ── Step 1: Today in CST (America/Chicago), matching the TS cstDate() ──
  v_today := (now() at time zone 'America/Chicago')::date;

  -- ── Step 2: Window start ──
  -- TS logic: for 7-day, sixDaysAgo = today - 6; for 30-day, twentyNineDaysAgo = today - 29
  -- Generalized: window_start = today - (days - 1)
  -- For days=1 (today only): window_start = today
  v_window_start := v_today - (p_days - 1);

  -- ── Step 3: Get user created_at ──
  select u.created_at into v_user_created_at
    from public.users u
   where u.id = p_user_id;

  if v_user_created_at is null then
    -- User not found — return zeros
    return query select p_user_id, p_days, 0::bigint, 0::bigint, 0;
    return;
  end if;

  -- ── Step 4: Get active goal and its created_at ──
  select g.id, g.created_at into v_goal_id, v_goal_created_at
    from public.goals g
   where g.user_id = p_user_id
     and g.is_active = true
   limit 1;

  -- ── Step 5: createdDate — matches TS logic ──
  -- TS: const createdDate = goal?.created_at ? toDateStr(goal.created_at) : toDateStr(client.created_at);
  -- toDateStr converts a timestamp to YYYY-MM-DD in CST
  if v_goal_created_at is not null then
    v_created_date := (v_goal_created_at at time zone 'America/Chicago')::date;
  else
    v_created_date := (v_user_created_at at time zone 'America/Chicago')::date;
  end if;

  -- ── Step 6: Get active task count and IDs ──
  if v_goal_id is not null then
    select array_agg(t.id), count(*)
      into v_task_ids, v_task_count
      from public.tasks t
     where t.goal_id = v_goal_id
       and t.is_active = true;
  end if;

  v_task_count := coalesce(v_task_count, 0);
  v_task_ids   := coalesce(v_task_ids, '{}'::uuid[]);

  if v_task_count = 0 then
    -- No active tasks — compliance is 0
    return query select p_user_id, p_days, 0::bigint, 0::bigint, 0;
    return;
  end if;

  -- ── Step 7: Effective start — clamp window ──
  -- TS: effectiveStart(windowStart, createdDate) = createdAt > windowStart ? createdAt : windowStart
  -- For days=1, the TS code doesn't use effectiveStart — it just counts today's logs.
  -- But since today >= any valid createdDate, the clamp is a no-op for days=1.
  v_effective_start := greatest(v_window_start, v_created_date);

  -- If effective_start is after today, there's no valid window
  if v_effective_start > v_today then
    return query select p_user_id, p_days, 0::bigint, 0::bigint, 0;
    return;
  end if;

  -- ── Step 8: Count completed logs in the effective window ──
  -- TS: allLogs.filter(l => l.date >= weekEff && l.completed).length
  -- For days=1 (today), TS does: todayLogs.filter(l => l.completed).length / taskCount
  -- which is equivalent to effective_start = today, expected = taskCount * 1
  select count(*) into v_completed
    from public.task_logs tl
   where tl.user_id = p_user_id
     and tl.task_id = any(v_task_ids)
     and tl.date >= v_effective_start
     and tl.date <= v_today
     and tl.completed = true;

  -- ── Step 9: Expected count ──
  -- TS: taskCount * daysBetween(effectiveStart, today)
  -- daysBetween(start, end) = Math.round((end - start) / 86400000) + 1  (inclusive)
  -- In SQL: (today - effective_start) + 1
  v_expected := v_task_count * ((v_today - v_effective_start) + 1);

  -- ── Step 10: Compliance percentage ──
  -- TS: Math.round((completed / expected) * 100) or 0 if expected = 0
  if v_expected > 0 then
    v_pct := round((v_completed::numeric / v_expected::numeric) * 100)::int;
  else
    v_pct := 0;
  end if;

  return query select p_user_id, p_days, v_completed, v_expected, v_pct;
end;
$$;

comment on function public.get_client_compliance(uuid, int) is
  'Returns per-client compliance metrics for a given time window (in days). '
  'Replicates the TypeScript compliance logic from server-queries.ts exactly.';
