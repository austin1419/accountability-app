-- ─────────────────────────────────────────────
-- 027 · coach_notes
--
-- General coaching notebook. Supports both
-- client-linked and global (unlinked) notes.
-- Separate from client_notes which is a simpler
-- per-client note log without coach context.
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.coach_notes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  note_text    text NOT NULL,
  note_type    text NOT NULL DEFAULT 'observation'
               CHECK (note_type IN ('observation', 'conversation', 'strategy', 'reminder')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup by coach (primary access pattern)
CREATE INDEX IF NOT EXISTS idx_coach_notes_coach
  ON public.coach_notes (coach_id, created_at DESC);

-- Fast lookup by coach + client
CREATE INDEX IF NOT EXISTS idx_coach_notes_coach_client
  ON public.coach_notes (coach_id, client_id)
  WHERE client_id IS NOT NULL;

-- Auto-update updated_at on row change
DROP TRIGGER IF EXISTS trg_coach_notes_updated ON public.coach_notes;
CREATE TRIGGER trg_coach_notes_updated
  BEFORE UPDATE ON public.coach_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
