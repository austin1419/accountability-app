-- ═══════════════════════════════════════════════════════════════════
-- Migration 023 — get_coach_alerts(coach_id)
--
-- Returns a priority-sorted list of actionable alerts for a coach's
-- active roster. Each alert represents one client + one specific
-- concern. A single client can generate multiple alerts.
--
-- Alert types (by priority):
--   0  gone_dark              — no activity in 3+ days
--   1  compliance_critical    — 7-day compliance < 40%
--   1  low_readiness          — journal: not rested + energy <= 2
--   1  high_stress_low_energy — journal: stress >= 4 + energy <= 2
--   2  compliance_declining   — 7-day < 70% but 30-day >= 70%
--   2  recovery_deficit       — journal: sleep deficit + no recovery
--   2  sleep_deficit          — journal: sleep < 6h or not rested
--   3  nutrition_slip         — journal: missed protein/hydration or alcohol
--   3  training_gap           — journal: no training + no zone2
--   4  no_journal_today       — has task_logs today but no journal
--
-- Depends on:
--   019_coach_client_assignment  (users.coach_id column)
--   020_get_client_compliance    (per-client compliance function)
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.get_coach_alerts(
  p_coach_id uuid
)
returns table (
  client_id      uuid,
  client_name    text,
  alert_type     text,
  alert_priority int,
  alert_message  text,
  detail_value   text
)
language sql
stable
security invoker
as $$

-- ── Base CTE: active clients with compliance, journal, activity ──

with clients as (
  select
    u.id,
    u.name,

    -- Compliance
    c7.compliance_pct   as seven_day_pct,
    c30.compliance_pct  as thirty_day_pct,

    -- Today's journal (NULL if no entry today)
    j.sleep_hours,
    j.felt_rested,
    j.protein_hit,
    j.hydration_hit,
    j.alcohol,
    j.trained_today,
    j.zone2_cardio,
    j.recovery_work,
    j.stress_level,
    j.energy_level,
    j.has_journal     as has_journal_today,

    -- Has task_logs for today?
    exists (
      select 1 from public.task_logs tl
       where tl.user_id = u.id
         and tl.date = (now() at time zone 'America/Chicago')::date
    )                   as has_tasks_today,

    -- Most recent activity date (NULL-safe, same logic as 022)
    case
      when jl.latest_date is null then tll.latest_date
      when tll.latest_date is null then jl.latest_date
      when jl.latest_date > tll.latest_date then jl.latest_date
      else tll.latest_date
    end                 as most_recent_activity,

    -- Days since activity
    case
      when coalesce(jl.latest_date, tll.latest_date) is not null
      then (now() at time zone 'America/Chicago')::date - (
        case
          when jl.latest_date is null then tll.latest_date
          when tll.latest_date is null then jl.latest_date
          when jl.latest_date > tll.latest_date then jl.latest_date
          else tll.latest_date
        end
      )
      else null
    end                 as days_inactive

  from public.users u

  cross join lateral public.get_client_compliance(u.id, 7)  c7
  cross join lateral public.get_client_compliance(u.id, 30) c30

  -- Today's journal
  left join lateral (
    select
      dj.sleep_hours, dj.felt_rested,
      dj.protein_hit, dj.hydration_hit, dj.alcohol,
      dj.trained_today, dj.zone2_cardio, dj.recovery_work,
      dj.stress_level, dj.energy_level,
      true as has_journal
    from public.daily_journal dj
    where dj.user_id = u.id
      and dj.date = (now() at time zone 'America/Chicago')::date
  ) j on true

  -- Latest journal date (any date, for activity tracking)
  left join lateral (
    select max(dj2.date) as latest_date
      from public.daily_journal dj2
     where dj2.user_id = u.id
  ) jl on true

  -- Latest task_log date
  left join lateral (
    select max(tl2.date) as latest_date
      from public.task_logs tl2
     where tl2.user_id = u.id
  ) tll on true

  where u.coach_id  = p_coach_id
    and u.role      = 'client'
    and u.is_active = true
)

-- ── Priority 0: gone_dark ────────────────────────────────────────

select
  id, name,
  'gone_dark'::text,
  0,
  name || ' has not logged any activity in ' || days_inactive || ' days',
  days_inactive || ' days'
from clients
where most_recent_activity is null
   or days_inactive >= 3

union all

-- ── Priority 1: compliance_critical ──────────────────────────────

select
  id, name,
  'compliance_critical'::text,
  1,
  name || ' is at ' || seven_day_pct || '% 7-day compliance',
  seven_day_pct || '%'
from clients
where seven_day_pct < 40

union all

-- ── Priority 1: low_readiness ────────────────────────────────────

select
  id, name,
  'low_readiness'::text,
  1,
  name || ' is reporting low readiness today',
  'energy: ' || energy_level
from clients
where has_journal_today = true
  and felt_rested = false
  and energy_level is not null
  and energy_level <= 2

union all

-- ── Priority 1: high_stress_low_energy ───────────────────────────

select
  id, name,
  'high_stress_low_energy'::text,
  1,
  name || ' is reporting high stress and low energy today',
  'stress: ' || stress_level || ', energy: ' || energy_level
from clients
where has_journal_today = true
  and stress_level is not null and stress_level >= 4
  and energy_level is not null and energy_level <= 2

union all

-- ── Priority 2: compliance_declining ─────────────────────────────

select
  id, name,
  'compliance_declining'::text,
  2,
  name || ' dropped to ' || seven_day_pct || '% 7-day compliance (30-day: ' || thirty_day_pct || '%)',
  seven_day_pct || '% / ' || thirty_day_pct || '%'
from clients
where seven_day_pct < 70
  and thirty_day_pct >= 70

union all

-- ── Priority 2: recovery_deficit ─────────────────────────────────

select
  id, name,
  'recovery_deficit'::text,
  2,
  name || ' has a recovery deficit today',
  'sleep: ' || coalesce(sleep_hours::text, '?') || 'h, rested: ' || coalesce(felt_rested::text, '?')
from clients
where has_journal_today = true
  and (
    (sleep_hours is not null and sleep_hours < 6)
    or felt_rested = false
  )
  and recovery_work = false

union all

-- ── Priority 2: sleep_deficit ────────────────────────────────────

select
  id, name,
  'sleep_deficit'::text,
  2,
  name || ' reported poor sleep today',
  coalesce(sleep_hours::text, '?') || 'h, rested: ' || coalesce(felt_rested::text, '?')
from clients
where has_journal_today = true
  and (
    (sleep_hours is not null and sleep_hours < 6)
    or felt_rested = false
  )

union all

-- ── Priority 3: nutrition_slip ───────────────────────────────────

select
  id, name,
  'nutrition_slip'::text,
  3,
  name || ' missed nutrition targets today',
  'protein: ' || coalesce(protein_hit::text, '?')
    || ', hydration: ' || coalesce(hydration_hit::text, '?')
    || ', alcohol: ' || coalesce(alcohol::text, '?')
from clients
where has_journal_today = true
  and (
    protein_hit = false
    or hydration_hit = false
    or alcohol = true
  )

union all

-- ── Priority 3: training_gap ─────────────────────────────────────

select
  id, name,
  'training_gap'::text,
  3,
  name || ' had no training activity today',
  'trained: false, zone2: false'
from clients
where has_journal_today = true
  and trained_today = false
  and zone2_cardio = false

union all

-- ── Priority 4: no_journal_today ─────────────────────────────────

select
  id, name,
  'no_journal_today'::text,
  4,
  name || ' has not journaled today',
  null::text
from clients
where has_journal_today is not true
  and has_tasks_today = true

-- ── Final ordering ───────────────────────────────────────────────
order by 4 asc, 2 asc;

$$;

comment on function public.get_coach_alerts(uuid) is
  'Returns priority-sorted actionable alerts for a coach''s active roster. '
  'One row per client per alert. Derives gone_dark, compliance, and journal-signal '
  'alerts deterministically from current data.';
