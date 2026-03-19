-- Telegram Bot Configuration per profile
CREATE TABLE IF NOT EXISTS telegram_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES business_config(id) ON DELETE CASCADE UNIQUE,
  bot_token TEXT,
  chat_id TEXT,
  notify_new_lead BOOLEAN DEFAULT true,
  notify_new_order BOOLEAN DEFAULT true,
  notify_low_stock BOOLEAN DEFAULT false,
  notify_daily_summary BOOLEAN DEFAULT false,
  notify_new_inquiry BOOLEAN DEFAULT true,
  notify_payment_received BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE telegram_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON telegram_config FOR ALL USING (true);

-- Telegram message log
CREATE TABLE IF NOT EXISTS telegram_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES business_config(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'manual' CHECK (message_type IN ('manual', 'auto_new_lead', 'auto_new_order', 'auto_low_stock', 'auto_daily_summary', 'auto_inquiry', 'auto_payment')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error_message TEXT
);

ALTER TABLE telegram_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON telegram_messages FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_telegram_messages_profile ON telegram_messages(profile_id, sent_at DESC);

-- Lead enrichment data (Hunter.io + Clearbit results)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS enrichment_data JSONB DEFAULT '{}';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS job_title TEXT;
