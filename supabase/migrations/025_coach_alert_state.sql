-- ─────────────────────────────────────────────
-- 025 · coach_alert_state
--
-- Persists lifecycle state for coach alerts.
-- Alerts are generated deterministically each request;
-- this table stores the coach's triage decisions so
-- state survives across page loads.
--
-- Composite key: (coach_id, client_id, alert_type)
-- ensures one state row per unique alert signal.
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.coach_alert_state (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  alert_type   text NOT NULL,
  status       text NOT NULL DEFAULT 'new'
               CHECK (status IN ('new', 'reviewed', 'action_taken', 'resolved')),
  reviewed_at  timestamptz,
  resolved_at  timestamptz,
  coach_note   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- One state row per coach + client + alert type
CREATE UNIQUE INDEX IF NOT EXISTS idx_coach_alert_state_unique
  ON public.coach_alert_state (coach_id, client_id, alert_type);

-- Fast lookup by coach
CREATE INDEX IF NOT EXISTS idx_coach_alert_state_coach
  ON public.coach_alert_state (coach_id);

-- Fast lookup for active (non-resolved) alerts
CREATE INDEX IF NOT EXISTS idx_coach_alert_state_active
  ON public.coach_alert_state (coach_id)
  WHERE status != 'resolved';

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_coach_alert_state_updated ON public.coach_alert_state;
CREATE TRIGGER trg_coach_alert_state_updated
  BEFORE UPDATE ON public.coach_alert_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
