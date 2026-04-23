-- Create WhatsApp Communities table
CREATE TABLE IF NOT EXISTS whatsapp_communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Community details
  community_id TEXT NOT NULL, -- WhatsApp community ID
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  
  -- Metadata
  member_count INTEGER DEFAULT 0,
  group_count INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(profile_id, community_id)
);

-- Create index for faster queries
CREATE INDEX idx_communities_profile ON whatsapp_communities(profile_id);
CREATE INDEX idx_communities_active ON whatsapp_communities(profile_id, is_active);

-- Create WhatsApp Community Groups table (groups within a community)
CREATE TABLE IF NOT EXISTS whatsapp_community_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES whatsapp_communities(id) ON DELETE CASCADE,
  
  -- Group details
  group_id TEXT NOT NULL, -- WhatsApp group ID
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  
  -- Metadata
  member_count INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(community_id, group_id)
);

-- Create index for faster queries
CREATE INDEX idx_community_groups_community ON whatsapp_community_groups(community_id);

-- Create WhatsApp Community Members table
CREATE TABLE IF NOT EXISTS whatsapp_community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES whatsapp_communities(id) ON DELETE CASCADE,
  
  -- Member details
  phone TEXT NOT NULL,
  name TEXT,
  wa_id TEXT, -- WhatsApp ID
  
  -- Role
  role TEXT DEFAULT 'member', -- admin, member
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(community_id, phone)
);

-- Create index for faster queries
CREATE INDEX idx_community_members_community ON whatsapp_community_members(community_id);
CREATE INDEX idx_community_members_phone ON whatsapp_community_members(phone);

-- Create WhatsApp Community Announcements table
CREATE TABLE IF NOT EXISTS whatsapp_community_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES whatsapp_communities(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Announcement details
  message TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT DEFAULT 'none', -- none, image, video, document
  
  -- Targeting
  target_type TEXT DEFAULT 'all', -- all, specific_groups
  target_group_ids TEXT[], -- Array of group IDs if specific_groups
  
  -- Status
  status TEXT DEFAULT 'draft', -- draft, scheduled, sent, failed
  
  -- Delivery stats
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  
  -- Timestamps
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_announcements_community ON whatsapp_community_announcements(community_id);
CREATE INDEX idx_announcements_profile ON whatsapp_community_announcements(profile_id);
CREATE INDEX idx_announcements_status ON whatsapp_community_announcements(status);

-- Add RLS policies
ALTER TABLE whatsapp_communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_community_announcements ENABLE ROW LEVEL SECURITY;

-- Communities policies
CREATE POLICY "Users can view their own communities"
  ON whatsapp_communities FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert their own communities"
  ON whatsapp_communities FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update their own communities"
  ON whatsapp_communities FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "Users can delete their own communities"
  ON whatsapp_communities FOR DELETE
  USING (profile_id = auth.uid());

-- Community groups policies
CREATE POLICY "Users can view groups in their communities"
  ON whatsapp_community_groups FOR SELECT
  USING (community_id IN (SELECT id FROM whatsapp_communities WHERE profile_id = auth.uid()));

CREATE POLICY "Users can insert groups in their communities"
  ON whatsapp_community_groups FOR INSERT
  WITH CHECK (community_id IN (SELECT id FROM whatsapp_communities WHERE profile_id = auth.uid()));

CREATE POLICY "Users can update groups in their communities"
  ON whatsapp_community_groups FOR UPDATE
  USING (community_id IN (SELECT id FROM whatsapp_communities WHERE profile_id = auth.uid()));

CREATE POLICY "Users can delete groups in their communities"
  ON whatsapp_community_groups FOR DELETE
  USING (community_id IN (SELECT id FROM whatsapp_communities WHERE profile_id = auth.uid()));

-- Community members policies
CREATE POLICY "Users can view members in their communities"
  ON whatsapp_community_members FOR SELECT
  USING (community_id IN (SELECT id FROM whatsapp_communities WHERE profile_id = auth.uid()));

CREATE POLICY "Users can insert members in their communities"
  ON whatsapp_community_members FOR INSERT
  WITH CHECK (community_id IN (SELECT id FROM whatsapp_communities WHERE profile_id = auth.uid()));

CREATE POLICY "Users can update members in their communities"
  ON whatsapp_community_members FOR UPDATE
  USING (community_id IN (SELECT id FROM whatsapp_communities WHERE profile_id = auth.uid()));

CREATE POLICY "Users can delete members in their communities"
  ON whatsapp_community_members FOR DELETE
  USING (community_id IN (SELECT id FROM whatsapp_communities WHERE profile_id = auth.uid()));

-- Announcements policies
CREATE POLICY "Users can view their own announcements"
  ON whatsapp_community_announcements FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert their own announcements"
  ON whatsapp_community_announcements FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update their own announcements"
  ON whatsapp_community_announcements FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "Users can delete their own announcements"
  ON whatsapp_community_announcements FOR DELETE
  USING (profile_id = auth.uid());
