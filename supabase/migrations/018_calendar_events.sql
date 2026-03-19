-- Calendar Events table for scheduling meetings, follow-ups, calls
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES business_config(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'call', 'demo', 'follow_up', 'reminder', 'other')),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  linked_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  linked_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  google_event_id TEXT,
  google_meet_link TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  reminder_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON calendar_events
  FOR ALL USING (true);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_profile ON calendar_events(profile_id);

-- Google Calendar OAuth tokens per profile
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES business_config(id) ON DELETE CASCADE UNIQUE,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  calendar_id TEXT DEFAULT 'primary',
  is_connected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON google_calendar_tokens FOR ALL USING (true);
