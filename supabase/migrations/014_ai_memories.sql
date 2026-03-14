-- AI memory system for the coaching engine.
-- Stores patterns, milestones, and coaching notes so the
-- briefing can reference past context instead of being stateless.

CREATE TABLE IF NOT EXISTS ai_memories (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  memory_type      TEXT NOT NULL,           -- pattern | milestone | preference | risk | achievement | coaching_note
  memory_text      TEXT NOT NULL,           -- human-readable memory content
  importance_score SMALLINT NOT NULL DEFAULT 5 CHECK (importance_score BETWEEN 1 AND 10),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast retrieval by user, ordered by importance + recency
CREATE INDEX idx_ai_memories_user_importance
  ON ai_memories (user_id, importance_score DESC, last_used_at DESC);

-- RLS disabled for dev (matches migration 003 pattern)
ALTER TABLE ai_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access during dev" ON ai_memories
  FOR ALL USING (true) WITH CHECK (true);
