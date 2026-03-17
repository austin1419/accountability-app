-- ─────────────────────────────────────────────
-- 029 · Add 'intervention' to alert status values
--
-- Extends the allowed status values in coach_alert_state
-- to include 'intervention' as a distinct lifecycle state
-- between 'reviewed' and 'resolved'.
-- ─────────────────────────────────────────────

-- Drop the old check constraint and add a new one with 'intervention'
ALTER TABLE public.coach_alert_state
  DROP CONSTRAINT IF EXISTS coach_alert_state_status_check;

ALTER TABLE public.coach_alert_state
  ADD CONSTRAINT coach_alert_state_status_check
  CHECK (status IN ('new', 'reviewed', 'action_taken', 'intervention', 'resolved'));
