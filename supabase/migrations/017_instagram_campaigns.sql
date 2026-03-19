-- Migration 017: Instagram DM campaigns support
-- Run in Supabase SQL Editor

-- Add channel column to marketing_campaigns
ALTER TABLE marketing_campaigns
  ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'whatsapp' NOT NULL;

-- Add ig_user_id to campaign_recipients for Instagram targeting
ALTER TABLE campaign_recipients
  ADD COLUMN IF NOT EXISTS ig_user_id TEXT;

-- Index for filtering by channel
CREATE INDEX IF NOT EXISTS idx_campaigns_channel ON marketing_campaigns(channel);

-- Update existing campaigns to have channel = 'whatsapp'
UPDATE marketing_campaigns SET channel = 'whatsapp' WHERE channel IS NULL;
