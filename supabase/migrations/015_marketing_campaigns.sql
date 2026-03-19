-- =============================================
-- 015: Marketing Campaigns & WhatsApp Bulk Send
-- =============================================

-- Marketing Campaigns table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  message_template TEXT NOT NULL,           -- Supports {{name}}, {{phone}} variables
  media_url       TEXT,                      -- Cloudinary URL for image/video
  media_type      VARCHAR(20) DEFAULT 'none' CHECK (media_type IN ('none','image','video','document')),
  media_caption   TEXT,

  -- Targeting
  target_type     VARCHAR(20) DEFAULT 'selected' CHECK (target_type IN ('all','selected','filtered')),
  target_filter   JSONB DEFAULT '{}',        -- e.g. {"status": "active", "min_orders": 1}

  -- Status lifecycle
  status          VARCHAR(20) DEFAULT 'draft'
                  CHECK (status IN ('draft','scheduled','running','paused','completed','cancelled')),
  scheduled_at    TIMESTAMP WITH TIME ZONE,

  -- Send config
  delay_seconds   INTEGER DEFAULT 20,        -- Delay between messages (10–60)
  daily_limit     INTEGER DEFAULT 100,       -- Max sends per day

  -- Stats (denormalized for fast reads)
  total_recipients INTEGER DEFAULT 0,
  sent_count      INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count      INTEGER DEFAULT 0,
  failed_count    INTEGER DEFAULT 0,

  -- Metadata
  created_by      UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  started_at      TIMESTAMP WITH TIME ZONE,
  completed_at    TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign Recipients — one row per (campaign, customer)
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  phone           VARCHAR(20) NOT NULL,
  name            VARCHAR(255),

  -- Message state
  status          VARCHAR(20) DEFAULT 'pending'
                  CHECK (status IN ('pending','sending','sent','delivered','read','failed','skipped')),
  wa_message_id   VARCHAR(100),             -- WA internal msg ID, used for ACK matching
  final_message   TEXT,                     -- Resolved message (after variable substitution)

  error_message   TEXT,                     -- If failed, why
  sent_at         TIMESTAMP WITH TIME ZONE,
  delivered_at    TIMESTAMP WITH TIME ZONE,
  read_at         TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE (campaign_id, phone)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON marketing_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_recipients_status ON campaign_recipients(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_recipients_wa_msg_id ON campaign_recipients(wa_message_id);
CREATE INDEX IF NOT EXISTS idx_recipients_phone ON campaign_recipients(phone);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_campaign_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_campaign_updated_at();

CREATE TRIGGER trg_recipients_updated_at
  BEFORE UPDATE ON campaign_recipients
  FOR EACH ROW EXECUTE FUNCTION update_campaign_updated_at();

-- Function to refresh campaign stats from recipients
CREATE OR REPLACE FUNCTION refresh_campaign_stats(p_campaign_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE marketing_campaigns SET
    total_recipients = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = p_campaign_id AND status != 'skipped'),
    sent_count       = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = p_campaign_id AND status IN ('sent','delivered','read')),
    delivered_count  = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = p_campaign_id AND status IN ('delivered','read')),
    read_count       = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = p_campaign_id AND status = 'read'),
    failed_count     = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = p_campaign_id AND status = 'failed'),
    updated_at       = NOW()
  WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql;
