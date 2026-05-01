-- Strict tenant/RBAC support for account-scoped integrations and lead conversion.

-- Social integrations must belong to exactly one account/profile.
ALTER TABLE social_connections
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES business_config(id) ON DELETE CASCADE;

UPDATE social_connections
SET profile_id = (
  SELECT id FROM business_config ORDER BY created_at ASC LIMIT 1
)
WHERE profile_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_social_connections_profile
  ON social_connections(profile_id);

CREATE UNIQUE INDEX IF NOT EXISTS social_connections_profile_platform_unique
  ON social_connections(profile_id, platform);

-- Link customers back to the lead that created them so conversion is idempotent.
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS source_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customers_source_lead
  ON customers(source_lead_id);

CREATE UNIQUE INDEX IF NOT EXISTS customers_profile_source_lead_unique
  ON customers(profile_id, source_lead_id)
  WHERE source_lead_id IS NOT NULL;

-- Keep lookup performance stable for tenant-scoped lead workflows.
CREATE INDEX IF NOT EXISTS idx_leads_profile_customer
  ON leads(profile_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_leads_profile_platform_source
  ON leads(profile_id, platform_user_id, source)
  WHERE platform_user_id IS NOT NULL;

-- Align stored role presets with app-level RBAC defaults. These are presets only;
-- route guards still enforce protected modules even if older user JSON is stale.
UPDATE role_presets
SET permissions = permissions
  || jsonb_build_object('settings', jsonb_build_object('read', true, 'write', true))
  || jsonb_build_object('users', jsonb_build_object('read', true, 'write', true, 'delete', true))
WHERE role = 'admin';

UPDATE role_presets
SET permissions = permissions
  || jsonb_build_object('settings', jsonb_build_object('read', false, 'write', false))
  || jsonb_build_object('users', jsonb_build_object('read', true, 'write', true, 'delete', false))
WHERE role = 'manager';

UPDATE role_presets
SET permissions = permissions
  || jsonb_build_object('settings', jsonb_build_object('read', false, 'write', false))
  || jsonb_build_object('customers', jsonb_build_object('read', true, 'write', true, 'delete', false))
  || jsonb_build_object('orders', jsonb_build_object('read', true, 'write', true, 'delete', false))
  || jsonb_build_object('inquiries', jsonb_build_object('read', true, 'write', true, 'delete', false))
  || jsonb_build_object('leads', jsonb_build_object('read', true, 'write', true, 'delete', false))
  || jsonb_build_object('conversations', jsonb_build_object('read', true, 'write', true))
WHERE role = 'staff';
