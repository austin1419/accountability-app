-- ─────────────────────────────────────────────
-- 026 · coach_alert_intervention fields
--
-- Extends coach_alert_state with intervention
-- metadata so coaches can record what action
-- they took on an alert.
--
-- Additive only — no changes to PK, unique
-- constraint, or existing columns.
-- ─────────────────────────────────────────────

ALTER TABLE public.coach_alert_state
  ADD COLUMN IF NOT EXISTS intervention_type text,
  ADD COLUMN IF NOT EXISTS intervention_note text,
  ADD COLUMN IF NOT EXISTS follow_up_date    timestamptz;
