-- ─────────────────────────────────────────────
-- 028 · Soft delete for clients
--
-- Adds is_deleted flag to users table. Replaces
-- hard DELETE with UPDATE is_deleted=true. All
-- coach queries filter WHERE is_deleted=false.
-- ─────────────────────────────────────────────

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

-- Index for fast filtering on non-deleted users
CREATE INDEX IF NOT EXISTS idx_users_not_deleted
  ON public.users (role, is_active)
  WHERE is_deleted = false;
