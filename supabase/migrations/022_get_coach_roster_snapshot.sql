-- ═══════════════════════════════════════════════════════════════════
-- Migration 022 — get_coach_roster_snapshot(coach_id)
--
-- Returns the full triage view of a coach's active client roster.
-- One row per active client with compliance at 3 windows, latest
-- journal/task_log dates, stress/energy signals, and a deterministic
-- status label (thriving / at_risk / critical / gone_dark).
--
-- Composes get_client_compliance() via CROSS JOIN LATERAL for each
-- of the 3 compliance windows (1-day, 7-day, 30-day).
--
-- Depends on:
--   019_coach_client_assignment  (users.coach_id column)
--   020_get_client_compliance    (per-client compliance function)
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.get_coach_roster_snapshot(
  p_coach_id uuid
)
returns table (
  client_id            uuid,
  client_name          text,
  client_email         text,
  is_active            boolean,
  today_pct            int,
  seven_day_pct        int,
  thirty_day_pct       int,
  latest_journal_date  date,
  has_journal_today    boolean,
  last_task_log_date   date,
  days_since_active    int,
  latest_stress        smallint,
  latest_energy        smallint,
  status_label         text
)
language sql
stable
security invoker
as $$
  select
    u.id                as client_id,
    u.name              as client_name,
    u.email             as client_email,
    u.is_active         as is_active,

    -- Compliance from get_client_compliance at 3 windows
    c1.compliance_pct   as today_pct,
    c7.compliance_pct   as seven_day_pct,
    c30.compliance_pct  as thirty_day_pct,

    -- Latest journal
    j.latest_date       as latest_journal_date,
    (j.latest_date = (now() at time zone 'America/Chicago')::date)
                        as has_journal_today,

    -- Latest task_log
    tl.latest_date      as last_task_log_date,

    -- Days since most recent activity (derived once, NULL-safe)
    case
      when act.dt is not null
      then ((now() at time zone 'America/Chicago')::date - act.dt)
      else null
    end::int            as days_since_active,

    -- Latest journal stress/energy
    j.stress_level      as latest_stress,
    j.energy_level      as latest_energy,

    -- Deterministic status label
    case
      -- No activity ever, or 3+ days since last activity
      when act.dt is null
        or ((now() at time zone 'America/Chicago')::date - act.dt) >= 3
      then 'gone_dark'

      -- 7-day compliance below 40%
      when c7.compliance_pct < 40
      then 'critical'

      -- 7-day compliance below 70% (the existing COMPLIANCE_TARGET)
      when c7.compliance_pct < 70
      then 'at_risk'

      -- 7-day compliance 70%+
      else 'thriving'
    end                 as status_label

  from public.users u

  -- 3 lateral joins for compliance at each window
  cross join lateral public.get_client_compliance(u.id, 1)  c1
  cross join lateral public.get_client_compliance(u.id, 7)  c7
  cross join lateral public.get_client_compliance(u.id, 30) c30

  -- Latest journal entry + stress/energy from that entry
  left join lateral (
    select dj.date as latest_date, dj.stress_level, dj.energy_level
      from public.daily_journal dj
     where dj.user_id = u.id
     order by dj.date desc
     limit 1
  ) j on true

  -- Latest task_log date
  left join lateral (
    select max(tl2.date) as latest_date
      from public.task_logs tl2
     where tl2.user_id = u.id
  ) tl on true

  -- Derive most recent activity date (NULL-safe, computed once)
  -- Handles: both NULL → NULL, one NULL → the other, both present → the later one
  cross join lateral (
    select case
      when j.latest_date is null then tl.latest_date
      when tl.latest_date is null then j.latest_date
      when j.latest_date > tl.latest_date then j.latest_date
      else tl.latest_date
    end as dt
  ) act

  where u.coach_id  = p_coach_id
    and u.role      = 'client'
    and u.is_active = true

  order by
    case
      when act.dt is null
        or ((now() at time zone 'America/Chicago')::date - act.dt) >= 3
      then 0
      when c7.compliance_pct < 40  then 1
      when c7.compliance_pct < 70  then 2
      else 3
    end asc,
    c7.compliance_pct asc,
    u.name asc;
$$;

comment on function public.get_coach_roster_snapshot(uuid) is
  'Returns the full triage roster snapshot for a coach. One row per active client '
  'with compliance at 3 windows, latest journal/task activity, stress/energy signals, '
  'and a deterministic status label (thriving / at_risk / critical / gone_dark).';
