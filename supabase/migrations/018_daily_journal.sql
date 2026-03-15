-- ─────────────────────────────────────────────
-- 018 — Daily journal for coaching signals
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_journal (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  date              DATE NOT NULL,

  -- Sleep (Sabbath)
  sleep_hours       NUMERIC(3,1),
  felt_rested       BOOLEAN,

  -- Nutrition (Nourish)
  protein_hit       BOOLEAN,
  hydration_hit     BOOLEAN,
  alcohol           BOOLEAN,

  -- Training (Labor)
  trained_today     BOOLEAN,
  zone2_cardio      BOOLEAN,
  recovery_work     BOOLEAN,

  -- Supplements (Tend)
  supplements_taken BOOLEAN,

  -- Mindset
  stress_level      SMALLINT,
  energy_level      SMALLINT,

  -- Notes
  notes             TEXT,

  -- Meta
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, date)
);

-- Fast lookups by user, ordered by date
CREATE INDEX IF NOT EXISTS idx_journal_user_date
  ON daily_journal (user_id, date DESC);

-- Row Level Security — user-scoped via my_user_id()
ALTER TABLE daily_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal_select_own" ON daily_journal
  FOR SELECT USING (user_id = public.my_user_id());

CREATE POLICY "journal_insert_own" ON daily_journal
  FOR INSERT WITH CHECK (user_id = public.my_user_id());

CREATE POLICY "journal_update_own" ON daily_journal
  FOR UPDATE USING (user_id = public.my_user_id());

CREATE POLICY "journal_delete_own" ON daily_journal
  FOR DELETE USING (user_id = public.my_user_id());
