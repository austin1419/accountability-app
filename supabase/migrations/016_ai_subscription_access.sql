-- ─────────────────────────────────────────────
-- 016 — Subscription-based AI access
--
-- 1. Add ai_access_enabled + ai_access_updated_at to users
-- 2. Add response_mode to ai_conversations
-- ─────────────────────────────────────────────

-- ── Users: AI entitlement columns ────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS ai_access_enabled    BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_access_updated_at TIMESTAMPTZ;

-- ── AI Conversations: response mode tracking ─
ALTER TABLE ai_conversations
  ADD COLUMN IF NOT EXISTS response_mode TEXT NOT NULL DEFAULT 'rule_based';

-- Valid values: 'rule_based', 'llm', 'fallback_rule_based'
COMMENT ON COLUMN ai_conversations.response_mode IS 'How the response was generated: rule_based | llm | fallback_rule_based';
