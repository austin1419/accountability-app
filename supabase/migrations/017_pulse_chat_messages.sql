-- ─────────────────────────────────────────────
-- 017 — Pulse Chat message persistence
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pulse_chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  role       TEXT NOT NULL,           -- 'user' or 'coach'
  message    TEXT NOT NULL,
  scenario   TEXT,                    -- coaching scenario (null for user messages)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookups by user, ordered by time
CREATE INDEX IF NOT EXISTS idx_pulse_chat_messages_user_time
  ON pulse_chat_messages (user_id, created_at DESC);

-- Dev-mode RLS: allow all via service role
ALTER TABLE pulse_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for dev" ON pulse_chat_messages
  FOR ALL USING (true) WITH CHECK (true);
