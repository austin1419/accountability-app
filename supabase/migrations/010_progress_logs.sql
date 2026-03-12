-- ─────────────────────────────────────────────
-- Migration 010: progress_logs table
--
-- Creates the progress_logs table (body composition and performance tracking).
-- Enables RLS with a policy matching the pattern used by weight_logs.
--
-- Safe to run even if the table already exists in Supabase —
-- CREATE TABLE IF NOT EXISTS and IF NOT EXISTS index guards are no-ops
-- on an existing table and do not modify or drop any existing data.
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.progress_logs (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid          NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  goal_id           uuid          NOT NULL REFERENCES public.goals(id)  ON DELETE CASCADE,
  logged_at         date          NOT NULL DEFAULT CURRENT_DATE,
  body_fat          numeric(5,2)           DEFAULT NULL,
  smm               numeric(6,2)           DEFAULT NULL,
  performance_value numeric(10,2)          DEFAULT NULL,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

-- One entry per user per goal per day (required for the upsert in insertProgressLog)
CREATE UNIQUE INDEX IF NOT EXISTS progress_logs_user_goal_date_idx
  ON public.progress_logs(user_id, goal_id, logged_at);

CREATE INDEX IF NOT EXISTS progress_logs_user_id_idx
  ON public.progress_logs(user_id);

CREATE INDEX IF NOT EXISTS progress_logs_goal_id_idx
  ON public.progress_logs(goal_id);

ALTER TABLE public.progress_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "progress_logs_own_rows" ON public.progress_logs;
CREATE POLICY "progress_logs_own_rows" ON public.progress_logs
  FOR ALL USING (user_id = public.my_user_id());
