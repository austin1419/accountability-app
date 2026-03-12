-- ─────────────────────────────────────────────
-- Migration 011: add goal_id to weight_logs (Phase 1)
--
-- Adds a nullable goal_id column to weight_logs so entries can
-- optionally be scoped to a goal. Existing rows remain valid with
-- goal_id = NULL. No existing indexes, constraints, or queries change.
-- ─────────────────────────────────────────────

ALTER TABLE public.weight_logs
  ADD COLUMN IF NOT EXISTS goal_id uuid
    REFERENCES public.goals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS weight_logs_goal_id_idx
  ON public.weight_logs(goal_id);
