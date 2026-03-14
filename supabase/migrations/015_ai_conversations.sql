-- PulseAI conversation history.
-- Stores user ↔ assistant messages grouped by conversation_id.

CREATE TABLE IF NOT EXISTS ai_conversations (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id  UUID NOT NULL,
  role             TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content          TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_conversations_user_convo
  ON ai_conversations (user_id, conversation_id, created_at);

CREATE INDEX idx_ai_conversations_user_recent
  ON ai_conversations (user_id, created_at DESC);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access during dev" ON ai_conversations
  FOR ALL USING (true) WITH CHECK (true);
