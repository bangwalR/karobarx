-- WhatsApp AI Agents
-- Each business profile can have multiple named agents (Sales Bot, Support Bot, etc.)
-- connected to NVIDIA LLM with their own Meta Cloud API credentials.

CREATE TABLE IF NOT EXISTS whatsapp_agents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES business_config(id) ON DELETE CASCADE,

  -- Identity
  name            TEXT NOT NULL,
  description     TEXT,
  purpose         TEXT NOT NULL DEFAULT 'general',        -- sales | support | general

  -- LLM
  system_message  TEXT NOT NULL DEFAULT 'You are a helpful WhatsApp assistant. Keep replies concise, friendly, and actionable.',
  model           TEXT NOT NULL DEFAULT 'moonshotai/kimi-k2.6',
  temperature     NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  max_tokens      INTEGER NOT NULL DEFAULT 1024,
  top_p           NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  thinking_mode   BOOLEAN NOT NULL DEFAULT true,
  context_window  INTEGER NOT NULL DEFAULT 10,            -- last N messages included as history

  -- Meta Cloud API credentials (per-agent)
  meta_access_token     TEXT,
  meta_phone_number_id  TEXT,
  meta_verify_token     TEXT,
  meta_api_version      TEXT NOT NULL DEFAULT 'v25.0',

  -- State
  is_active       BOOLEAN NOT NULL DEFAULT false,
  auto_reply      BOOLEAN NOT NULL DEFAULT true,
  message_count   BIGINT NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-agent conversation history (for context window in LLM calls)
CREATE TABLE IF NOT EXISTS whatsapp_agent_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        UUID NOT NULL REFERENCES whatsapp_agents(id) ON DELETE CASCADE,
  customer_phone  TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_agents_profile ON whatsapp_agents(profile_id);
CREATE INDEX IF NOT EXISTS idx_wa_agent_convos ON whatsapp_agent_conversations(agent_id, customer_phone, created_at DESC);

-- updated_at auto-bump
CREATE OR REPLACE FUNCTION touch_whatsapp_agent()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_touch_whatsapp_agent ON whatsapp_agents;
CREATE TRIGGER trg_touch_whatsapp_agent
  BEFORE UPDATE ON whatsapp_agents
  FOR EACH ROW EXECUTE FUNCTION touch_whatsapp_agent();

-- RLS
ALTER TABLE whatsapp_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_agent_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON whatsapp_agents FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON whatsapp_agent_conversations FOR ALL USING (true);
