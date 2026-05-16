-- Supabase OTP auth support and stronger admin login controls

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(30) DEFAULT 'credentials',
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_failed_login_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE admin_users
  ALTER COLUMN password_hash DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_users_auth_user_id ON admin_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_locked_until ON admin_users(locked_until);

CREATE TABLE IF NOT EXISTS auth_otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  flow VARCHAR(20) NOT NULL CHECK (flow IN ('login', 'signup')),
  full_name VARCHAR(100),
  username VARCHAR(50),
  password_hash TEXT,
  requested_role VARCHAR(20),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  consumed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE auth_otp_challenges
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_auth_otp_challenges_email ON auth_otp_challenges(email);
CREATE INDEX IF NOT EXISTS idx_auth_otp_challenges_expires_at ON auth_otp_challenges(expires_at);

CREATE TABLE IF NOT EXISTS auth_otp_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  ticket VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  consumed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_otp_tickets_ticket ON auth_otp_tickets(ticket);
CREATE INDEX IF NOT EXISTS idx_auth_otp_tickets_expires_at ON auth_otp_tickets(expires_at);

INSERT INTO role_presets (role, display_name, description, permissions) VALUES
  ('sales', 'Sales', 'Sales-focused access with customer and lead updates', '{
    "dashboard": {"read": true},
    "customers": {"read": true, "write": true, "delete": false},
    "leads": {"read": true, "write": true, "delete": false},
    "orders": {"read": true, "write": true, "delete": false},
    "conversations": {"read": true, "write": true},
    "analytics": {"read": true}
  }'::jsonb),
  ('support', 'Support', 'Support access for customer communication and issue resolution', '{
    "dashboard": {"read": true},
    "customers": {"read": true, "write": true, "delete": false},
    "conversations": {"read": true, "write": true},
    "inquiries": {"read": true, "write": true, "delete": false},
    "orders": {"read": true, "write": false, "delete": false}
  }'::jsonb),
  ('viewer', 'Viewer', 'Read-only reporting access', '{
    "dashboard": {"read": true},
    "inventory": {"read": true},
    "customers": {"read": true},
    "orders": {"read": true},
    "inquiries": {"read": true},
    "leads": {"read": true},
    "analytics": {"read": true}
  }'::jsonb)
ON CONFLICT (role) DO NOTHING;
