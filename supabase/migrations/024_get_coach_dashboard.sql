-- ═══════════════════════════════════════════════════════════════════
-- Migration 024 — get_coach_dashboard(coach_id)
--
-- Single RPC that powers the Coach Dashboard UI. Returns a structured
-- JSON object containing the full roster snapshot, all alerts, status
-- counts, and the top 5 priority clients.
--
-- Reuses existing functions — no compliance or alert logic is
-- duplicated. Counts and priority_clients are derived from the
-- already-materialized JSON arrays, not from additional table scans.
--
-- Depends on:
--   022_get_coach_roster_snapshot  (roster + status labels)
--   023_get_coach_alerts           (priority-sorted alerts)
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.get_coach_dashboard(
  p_coach_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
as $$
declare
  v_roster   jsonb;
  v_alerts   jsonb;
  v_counts   jsonb;
  v_priority jsonb;
begin
  -- ── 1. Roster snapshot (reuse 022) ────────────────────────────────
  select coalesce(jsonb_agg(row_to_json(r)::jsonb), '[]'::jsonb)
    into v_roster
    from get_coach_roster_snapshot(p_coach_id) r;

  -- ── 2. Alerts (reuse 023) ────────────────────────────────────────
  select coalesce(jsonb_agg(row_to_json(a)::jsonb), '[]'::jsonb)
    into v_alerts
    from get_coach_alerts(p_coach_id) a;

  -- ── 3. Counts (derived from roster snapshot already in memory) ───
  select jsonb_build_object(
    'total',     count(*),
    'critical',  count(*) filter (where s.status_label = 'critical'),
    'warning',   count(*) filter (where s.status_label = 'at_risk'),
    'good',      count(*) filter (where s.status_label = 'thriving'),
    'gone_dark', count(*) filter (where s.status_label = 'gone_dark')
  ) into v_counts
  from jsonb_array_elements(v_roster) e,
       jsonb_to_record(e.value) as s(status_label text);

  -- ── 4. Priority clients: top 5 by lowest alert_priority, most alerts
  select coalesce(jsonb_agg(pc), '[]'::jsonb)
    into v_priority
    from (
      select jsonb_build_object(
        'client_id',          a.value->>'client_id',
        'client_name',        a.value->>'client_name',
        'top_alert_type',     min(a.value->>'alert_type')
                                filter (where (a.value->>'alert_priority')::int = min_p.mp),
        'top_alert_priority', min((a.value->>'alert_priority')::int),
        'alert_count',        count(*)
      ) as pc
      from jsonb_array_elements(v_alerts) a,
      lateral (
        select min((a2.value->>'alert_priority')::int) as mp
          from jsonb_array_elements(v_alerts) a2
         where a2.value->>'client_id' = a.value->>'client_id'
      ) min_p
      group by a.value->>'client_id', a.value->>'client_name'
      order by min((a.value->>'alert_priority')::int) asc, count(*) desc
      limit 5
    ) sub;

  -- ── Assemble final object ────────────────────────────────────────
  return jsonb_build_object(
    'roster_snapshot',  v_roster,
    'alerts',           v_alerts,
    'counts',           v_counts,
    'priority_clients', v_priority
  );
end;
$$;

comment on function public.get_coach_dashboard(uuid) is
  'Single RPC powering the Coach Dashboard UI. Returns a jsonb object with '
  'roster_snapshot, alerts, counts (by status_label), and priority_clients '
  '(top 5 by alert severity). Composes get_coach_roster_snapshot and '
  'get_coach_alerts — no logic is duplicated.';
