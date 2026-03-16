-- ═══════════════════════════════════════════════════════════════════
-- Migration 021 — get_coach_roster(coach_id, days)
--
-- Returns the active client roster for a coach with per-client
-- compliance metrics. Composes get_client_compliance() internally
-- via CROSS JOIN LATERAL — no compliance math is duplicated.
--
-- Depends on:
--   019_coach_client_assignment (users.coach_id column)
--   020_get_client_compliance   (per-client compliance function)
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.get_coach_roster(
  p_coach_id uuid,
  p_days     int
)
returns table (
  client_id        uuid,
  client_name      text,
  client_email     text,
  is_active        boolean,
  completed_count  bigint,
  expected_count   bigint,
  compliance_pct   int
)
language sql
stable
security invoker
as $$
  select
    u.id             as client_id,
    u.name           as client_name,
    u.email          as client_email,
    u.is_active      as is_active,
    c.completed_count,
    c.expected_count,
    c.compliance_pct
  from public.users u
  cross join lateral public.get_client_compliance(u.id, p_days) c
  where u.coach_id = p_coach_id
    and u.role     = 'client'
    and u.is_active = true
  order by c.compliance_pct asc, u.name asc;
$$;

comment on function public.get_coach_roster(uuid, int) is
  'Returns the active client roster for a coach with compliance metrics. '
  'Composes get_client_compliance() per client. Ordered by compliance ascending.';
