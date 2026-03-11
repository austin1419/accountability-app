-- ═══════════════════════════════════════════════════════════════════
-- Migration 007 — Supabase Auth integration
--
-- Adds auth_id to public.users so each row can be linked to a real
-- Supabase Auth account. Installs a trigger that auto-links the two
-- by email whenever a new auth user is created (invite accepted).
-- Then re-enables RLS with sensible beta policies.
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════


-- ── 1. Link column ────────────────────────────────────────────────
-- Nullable so existing rows are unaffected until the auth account is
-- claimed. Unique so one auth user can only link to one profile.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_id uuid UNIQUE REFERENCES auth.users(id);


-- ── 2. Auto-link trigger ──────────────────────────────────────────
-- When Supabase creates an auth.users row (invite accepted, sign-up),
-- find the matching public.users row by email and populate auth_id.
-- SECURITY DEFINER runs as the function owner (bypasses RLS safely).
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.users
  SET auth_id = NEW.id
  WHERE email = NEW.email
    AND auth_id IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- ── 3. Helper: current session's public.users.id ──────────────────
-- Used in RLS policies to avoid repeated subqueries and recursion.
-- SECURITY DEFINER bypasses RLS so it can always read the users table.
CREATE OR REPLACE FUNCTION public.my_user_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;


-- ── 4. Re-enable Row Level Security ──────────────────────────────
ALTER TABLE public.users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;


-- ── 5. RLS policies ───────────────────────────────────────────────
-- The service role key used by server-side code bypasses ALL policies.
-- These policies only apply to browser (anon key + user JWT) requests.

-- users: each person can read/update their own row only.
-- Coaches reading client data always go through the admin (service role) client.
DROP POLICY IF EXISTS "users_own_row"   ON public.users;
CREATE POLICY "users_own_row" ON public.users
  FOR ALL USING (auth_id = auth.uid());

-- Coaches need to INSERT clients from the browser (AddClientModal) until
-- Phase 3 moves that to a server action. Allow any authenticated user to insert.
DROP POLICY IF EXISTS "users_authenticated_insert" ON public.users;
CREATE POLICY "users_authenticated_insert" ON public.users
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- goals: own goals only (client side)
DROP POLICY IF EXISTS "goals_own_rows" ON public.goals;
CREATE POLICY "goals_own_rows" ON public.goals
  FOR ALL USING (user_id = public.my_user_id());

-- tasks: clients can read tasks belonging to their goals
DROP POLICY IF EXISTS "tasks_own_goals" ON public.tasks;
CREATE POLICY "tasks_own_goals" ON public.tasks
  FOR SELECT USING (
    goal_id IN (
      SELECT id FROM public.goals WHERE user_id = public.my_user_id()
    )
  );

-- Coaches inserting tasks from the browser (AddHabitModal)
DROP POLICY IF EXISTS "tasks_authenticated_insert" ON public.tasks;
CREATE POLICY "tasks_authenticated_insert" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- task_logs: own logs only
DROP POLICY IF EXISTS "task_logs_own_rows" ON public.task_logs;
CREATE POLICY "task_logs_own_rows" ON public.task_logs
  FOR ALL USING (user_id = public.my_user_id());

-- weight_logs: own logs only
DROP POLICY IF EXISTS "weight_logs_own_rows" ON public.weight_logs;
CREATE POLICY "weight_logs_own_rows" ON public.weight_logs
  FOR ALL USING (user_id = public.my_user_id());
