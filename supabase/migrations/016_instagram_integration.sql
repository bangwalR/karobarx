-- Instagram DM integration tables
-- Run this in Supabase SQL Editor

-- Store cached Instagram messages for history
CREATE TABLE IF NOT EXISTS instagram_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id TEXT NOT NULL,
  message_id TEXT UNIQUE NOT NULL,
  from_id TEXT NOT NULL,
  from_username TEXT,
  body TEXT,
  is_from_me BOOLEAN DEFAULT false,
  message_type TEXT DEFAULT 'text',
  has_media BOOLEAN DEFAULT false,
  media_url TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ig_messages_conversation
  ON instagram_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ig_messages_timestamp
  ON instagram_messages(timestamp DESC);

-- Ensure instagram_business_id column exists on social_connections (may already exist)
ALTER TABLE social_connections
  ADD COLUMN IF NOT EXISTS instagram_business_id VARCHAR(100);
