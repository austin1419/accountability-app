-- ─────────────────────────────────────────────
-- Migration 005: weight_logs table
--
-- Stores each weight entry a client logs on the Progress page.
-- goals.current_weight is just a snapshot of the latest value;
-- this table holds the full history for the chart and log list.
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.weight_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  weight     numeric(5,1) NOT NULL,
  logged_at  date        NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One entry per user per day (upsert-safe)
CREATE UNIQUE INDEX IF NOT EXISTS weight_logs_user_date_idx
  ON public.weight_logs(user_id, logged_at);

CREATE INDEX IF NOT EXISTS weight_logs_user_id_idx
  ON public.weight_logs(user_id);

ALTER TABLE public.weight_logs DISABLE ROW LEVEL SECURITY;

-- Seed historical weight data for the demo client
-- Matches the mock data that was previously hardcoded in mockData.ts
INSERT INTO public.weight_logs (user_id, weight, logged_at) VALUES
  ('00000000-0000-0000-0000-000000000002', 240.0, '2026-01-06'),
  ('00000000-0000-0000-0000-000000000002', 236.0, '2026-01-13'),
  ('00000000-0000-0000-0000-000000000002', 234.0, '2026-01-20'),
  ('00000000-0000-0000-0000-000000000002', 231.0, '2026-01-27'),
  ('00000000-0000-0000-0000-000000000002', 228.0, '2026-02-03'),
  ('00000000-0000-0000-0000-000000000002', 225.0, '2026-02-10'),
  ('00000000-0000-0000-0000-000000000002', 221.0, '2026-02-17'),
  ('00000000-0000-0000-0000-000000000002', 218.0, '2026-02-24')
ON CONFLICT DO NOTHING;
