# WhatsApp Communities Feature

## Overview
Complete WhatsApp Communities management system integrated into your CRM. Allows you to sync, manage, and send announcements to WhatsApp Communities directly from the admin panel.

## Features

### 1. **Community Management**
- Sync communities from WhatsApp automatically
- View all communities with member counts
- Search and filter communities
- Remove communities from the list

### 2. **Announcements**
- Send broadcast messages to entire communities
- Support for text and image announcements
- Real-time delivery tracking
- Announcement history

### 3. **Database Schema**
Four new tables created:
- `whatsapp_communities` - Store community details
- `whatsapp_community_groups` - Groups within communities
- `whatsapp_community_members` - Community members
- `whatsapp_community_announcements` - Announcement history

## Setup Instructions

### 1. Run Database Migration
```bash
# Apply the migration to create tables
psql -d your_database < mobilehub/supabase/migrations/20260421_create_communities.sql
```

Or if using Supabase CLI:
```bash
supabase db push
```

### 2. Restart WhatsApp Backend
The WhatsApp backend has been updated with new endpoints. Restart it:
```bash
cd mobilehub/whatsapp-backend
npm start
```

### 3. Access the Feature
Navigate to: `http://localhost:3000/admin/communities`

## How to Use

### Step 1: Connect WhatsApp
1. Go to **Marketing** page
2. Click "Connect WhatsApp"
3. Scan the QR code with your WhatsApp mobile app
4. Wait for "Connected" status

### Step 2: Sync Communities
1. Go to **Communities** page
2. Click "Sync Communities" button
3. All your WhatsApp communities will be imported

### Step 3: Send Announcements
1. Select a community from the list
2. Click "Send Announcement"
3. Enter your message
4. (Optional) Add an image URL
5. Click "Send Announcement"

## API Endpoints

### Backend (WhatsApp)
- `GET /communities` - List all communities from WhatsApp
- `GET /communities/:communityId` - Get community details
- `POST /communities/:communityId/announce` - Send announcement
- `GET /groups` - List all groups (including community groups)
- `GET /groups/:groupId` - Get group details

### Frontend (Next.js)
- `GET /api/communities` - List synced communities
- `POST /api/communities` - Create/sync community
- `GET /api/communities/[id]` - Get community details
- `PUT /api/communities/[id]` - Update community
- `DELETE /api/communities/[id]` - Delete community
- `POST /api/communities/sync` - Sync from WhatsApp
- `POST /api/communities/[id]/announce` - Send announcement

## Database Tables

### whatsapp_communities
```sql
- id (UUID, PK)
- profile_id (UUID, FK to profiles)
- community_id (TEXT) - WhatsApp community ID
- name (TEXT)
- description (TEXT)
- icon_url (TEXT)
- member_count (INTEGER)
- group_count (INTEGER)
- is_active (BOOLEAN)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### whatsapp_community_groups
```sql
- id (UUID, PK)
- community_id (UUID, FK to whatsapp_communities)
- group_id (TEXT) - WhatsApp group ID
- name (TEXT)
- description (TEXT)
- icon_url (TEXT)
- member_count (INTEGER)
- is_active (BOOLEAN)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### whatsapp_community_members
```sql
- id (UUID, PK)
- community_id (UUID, FK to whatsapp_communities)
- phone (TEXT)
- name (TEXT)
- wa_id (TEXT)
- role (TEXT) - admin, member
- is_active (BOOLEAN)
- joined_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
```

### whatsapp_community_announcements
```sql
- id (UUID, PK)
- community_id (UUID, FK to whatsapp_communities)
- profile_id (UUID, FK to profiles)
- message (TEXT)
- media_url (TEXT)
- media_type (TEXT) - none, image, video, document
- target_type (TEXT) - all, specific_groups
- target_group_ids (TEXT[])
- status (TEXT) - draft, scheduled, sent, failed
- total_recipients (INTEGER)
- sent_count (INTEGER)
- delivered_count (INTEGER)
- read_count (INTEGER)
- failed_count (INTEGER)
- scheduled_at (TIMESTAMPTZ)
- sent_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

## Security

### Row Level Security (RLS)
All tables have RLS enabled with policies ensuring:
- Users can only access their own communities
- Users can only send announcements to their communities
- Profile isolation is enforced at database level

### Profile Scoping
All API endpoints require `active_profile_id` cookie and filter by profile_id.

## UI Features

### Communities Tab
- Grid layout showing all communities
- Community cards with:
  - Community name and icon
  - Description
  - Member count
  - Group count
  - Send announcement button
  - Delete button
- Search functionality
- Sync button with loading state

### Announce Tab
- Community selector dropdown
- Message textarea with character count
- Optional image URL input with preview
- Send button with loading state
- Success/error notifications
- WhatsApp connection status indicator

## Limitations

### WhatsApp Web.js Limitations
1. **Community Detection**: WhatsApp Web.js doesn't have native community support yet. The implementation looks for newsletter-type chats (`@newsletter` in ID).
2. **Group Count**: Cannot directly fetch the number of groups in a community.
3. **Announcement Delivery**: Delivery/read receipts may not be available for community announcements.

### Workarounds
- Communities are detected by checking chat IDs for newsletter patterns
- Group count is stored when synced but may need manual updates
- Announcements are sent as regular messages to the community chat

## Future Enhancements

### Planned Features
1. **Group Management**: View and manage groups within communities
2. **Member Management**: Add/remove members, assign roles
3. **Scheduled Announcements**: Schedule announcements for future delivery
4. **Analytics**: Track announcement performance (views, clicks, engagement)
5. **Templates**: Save and reuse announcement templates
6. **Targeting**: Send to specific groups within a community
7. **Rich Media**: Support for videos, documents, polls
8. **Bulk Operations**: Manage multiple communities at once

### API Improvements
1. Better community detection when WhatsApp Web.js adds native support
2. Real-time delivery status updates via webhooks
3. Batch announcement sending with rate limiting
4. Community member sync from WhatsApp

## Troubleshooting

### Communities Not Showing
1. Ensure WhatsApp is connected (check status badge)
2. Click "Sync Communities" button
3. Check if you're an admin of any WhatsApp communities
4. Check browser console for errors

### Announcements Not Sending
1. Verify WhatsApp connection status
2. Ensure you have admin rights in the community
3. Check message length (WhatsApp has limits)
4. Verify image URL is accessible
5. Check WhatsApp backend logs for errors

### Database Errors
1. Ensure migration was run successfully
2. Check Supabase connection
3. Verify RLS policies are enabled
4. Check profile_id cookie is set

## Files Created/Modified

### New Files
- `mobilehub/supabase/migrations/20260421_create_communities.sql`
- `mobilehub/src/app/api/communities/route.ts`
- `mobilehub/src/app/api/communities/[id]/route.ts`
- `mobilehub/src/app/api/communities/sync/route.ts`
- `mobilehub/src/app/api/communities/[id]/announce/route.ts`
- `mobilehub/src/app/admin/communities/page.tsx`
- `mobilehub/WHATSAPP_COMMUNITIES_FEATURE.md`

### Modified Files
- `mobilehub/whatsapp-backend/index.js` - Added community endpoints
- `mobilehub/src/app/admin/layout.tsx` - Added Communities to navigation

## Support
For issues or questions, check:
1. WhatsApp backend logs: `mobilehub/whatsapp-backend`
2. Browser console for frontend errors
3. Supabase logs for database errors
4. Network tab for API request failures
