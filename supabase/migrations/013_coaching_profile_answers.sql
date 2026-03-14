-- Coaching profile intake answers
-- One row per user per question, upserted on save.

CREATE TABLE IF NOT EXISTS coaching_profile_answers (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section_key      TEXT NOT NULL,
  question_key     TEXT NOT NULL,
  answer_value_json JSONB NOT NULL DEFAULT '{}',
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, section_key, question_key)
);

-- RLS disabled for dev (matches migration 003 pattern)
ALTER TABLE coaching_profile_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access during dev" ON coaching_profile_answers
  FOR ALL USING (true) WITH CHECK (true);
