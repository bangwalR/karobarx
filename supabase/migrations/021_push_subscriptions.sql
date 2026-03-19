-- Push subscriptions for Web Push (VAPID)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES business_config(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON push_subscriptions;
CREATE POLICY "Allow all for authenticated" ON push_subscriptions FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_profile ON push_subscriptions(profile_id);

-- Add ntfy_topic to business_config if not exists
ALTER TABLE business_config ADD COLUMN IF NOT EXISTS ntfy_topic TEXT;
