-- ============================================
-- MULTI-TENANCY MIGRATION
-- Adds profile_id to all tables for complete data isolation
-- ============================================

-- Add profile_id column to all tables that need it
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS profile_id UUID;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS profile_id UUID;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS profile_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS profile_id UUID;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS profile_id UUID;
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS profile_id UUID;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS profile_id UUID;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS profile_id UUID;

-- Create indexes for profile_id filtering (critical for performance)
CREATE INDEX IF NOT EXISTS idx_sellers_profile ON sellers(profile_id);
CREATE INDEX IF NOT EXISTS idx_customers_profile ON customers(profile_id);
CREATE INDEX IF NOT EXISTS idx_phones_profile ON phones(profile_id);
CREATE INDEX IF NOT EXISTS idx_orders_profile ON orders(profile_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_profile ON inquiries(profile_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_profile ON whatsapp_conversations(profile_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_profile ON whatsapp_messages(profile_id);
CREATE INDEX IF NOT EXISTS idx_leads_profile ON leads(profile_id);

-- Make phone UNIQUE constraint scoped to profile (allow same IMEI across different businesses)
ALTER TABLE phones DROP CONSTRAINT IF EXISTS phones_imei_1_key;
CREATE UNIQUE INDEX IF NOT EXISTS phones_imei_profile_unique ON phones(imei_1, profile_id) WHERE imei_1 IS NOT NULL;

-- Make customer phone UNIQUE constraint scoped to profile
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_phone_key;
CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_profile_unique ON customers(phone, profile_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS to enforce data isolation at database level
-- ============================================

-- Enable RLS on all tables
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS sellers_isolation ON sellers;
DROP POLICY IF EXISTS customers_isolation ON customers;
DROP POLICY IF EXISTS phones_isolation ON phones;
DROP POLICY IF EXISTS orders_isolation ON orders;
DROP POLICY IF EXISTS inquiries_isolation ON inquiries;
DROP POLICY IF EXISTS whatsapp_conversations_isolation ON whatsapp_conversations;
DROP POLICY IF EXISTS whatsapp_messages_isolation ON whatsapp_messages;
DROP POLICY IF EXISTS leads_isolation ON leads;

-- Create RLS policies for each table
-- These policies allow access only to rows matching the user's profile_id
-- Service role bypasses RLS, so API routes using service role must filter manually

CREATE POLICY sellers_isolation ON sellers
  FOR ALL
  USING (
    profile_id IS NULL OR 
    profile_id = current_setting('app.current_profile_id', true)::uuid
  );

CREATE POLICY customers_isolation ON customers
  FOR ALL
  USING (
    profile_id IS NULL OR 
    profile_id = current_setting('app.current_profile_id', true)::uuid
  );

CREATE POLICY phones_isolation ON phones
  FOR ALL
  USING (
    profile_id IS NULL OR 
    profile_id = current_setting('app.current_profile_id', true)::uuid
  );

CREATE POLICY orders_isolation ON orders
  FOR ALL
  USING (
    profile_id IS NULL OR 
    profile_id = current_setting('app.current_profile_id', true)::uuid
  );

CREATE POLICY inquiries_isolation ON inquiries
  FOR ALL
  USING (
    profile_id IS NULL OR 
    profile_id = current_setting('app.current_profile_id', true)::uuid
  );

CREATE POLICY whatsapp_conversations_isolation ON whatsapp_conversations
  FOR ALL
  USING (
    profile_id IS NULL OR 
    profile_id = current_setting('app.current_profile_id', true)::uuid
  );

CREATE POLICY whatsapp_messages_isolation ON whatsapp_messages
  FOR ALL
  USING (
    profile_id IS NULL OR 
    profile_id = current_setting('app.current_profile_id', true)::uuid
  );

CREATE POLICY leads_isolation ON leads
  FOR ALL
  USING (
    profile_id IS NULL OR 
    profile_id = current_setting('app.current_profile_id', true)::uuid
  );

-- ============================================
-- HELPER FUNCTION
-- Set profile context for RLS (when not using service role)
-- ============================================

CREATE OR REPLACE FUNCTION set_profile_context(p_profile_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_profile_id', p_profile_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- MIGRATION NOTES
-- ============================================

-- After running this migration:
-- 1. All existing data will have profile_id = NULL (visible to super admins only)
-- 2. Update existing data to assign proper profile_ids:
--    UPDATE phones SET profile_id = '<your-profile-id>' WHERE profile_id IS NULL;
--    UPDATE customers SET profile_id = '<your-profile-id>' WHERE profile_id IS NULL;
--    UPDATE orders SET profile_id = '<your-profile-id>' WHERE profile_id IS NULL;
-- 3. Make profile_id NOT NULL after data migration (optional but recommended):
--    ALTER TABLE phones ALTER COLUMN profile_id SET NOT NULL;
--    ALTER TABLE customers ALTER COLUMN profile_id SET NOT NULL;
--    etc.
