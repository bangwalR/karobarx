# WhatsApp Groups & Communities - Complete Guide

## Overview
Complete WhatsApp Groups and Communities management system. Users can:
- **Create new WhatsApp groups** directly from the app
- **Sync existing communities** from WhatsApp
- **View and manage** both groups and communities
- **Send announcements** to groups or communities
- **Add/remove members** from groups

## Features

### 1. **Create WhatsApp Groups**
- Create new groups with selected customers
- Add group name and description
- Select multiple members from customer list
- Groups are created instantly in WhatsApp
- Automatically saved to database

### 2. **View Groups & Communities**
- Toggle between Groups and Communities view
- Search functionality for both
- See member counts
- Beautiful card-based UI
- Real-time sync with WhatsApp

### 3. **Send Announcements**
- Send messages to groups or communities
- Support for text + images
- Select target from dropdown
- Real-time delivery

### 4. **Member Management** (Coming Soon)
- Add members to existing groups
- Remove members from groups
- View member list with roles

## Setup Instructions

### 1. Run Database Migration
```bash
# The migration was already created in previous step
psql -d your_database < mobilehub/supabase/migrations/20260421_create_communities.sql
```

### 2. Restart WhatsApp Backend
```bash
cd mobilehub/whatsapp-backend
npm start
```

### 3. Access the Feature
Navigate to: `http://localhost:3000/admin/communities`

## How to Use

### Creating a WhatsApp Group

1. **Go to Communities Page**
   - Navigate to `/admin/communities`
   - Ensure WhatsApp is connected (green badge)

2. **Click "Create Group"**
   - Enter group name (required)
   - Add description (optional)
   - Search and select customers to add as members
   - Must select at least 1 member

3. **Create**
   - Click "Create Group" button
   - Group is created in WhatsApp instantly
   - You'll see success message
   - Group appears in Groups list

### Viewing Groups & Communities

1. **Switch Views**
   - Click "Groups" button to see your created groups
   - Click "Communities" button to see synced communities

2. **Search**
   - Use search bar to filter by name or description

3. **Send Messages**
   - Click "Send Message" or "Send Announcement" on any card
   - Compose your message
   - Click send

### Syncing Communities

1. **Go to Communities View**
   - Click "Communities" button

2. **Sync**
   - Click "Sync Communities" button
   - All your WhatsApp communities will be imported
   - They'll appear in the list

### Sending Announcements

1. **Go to Announce Tab**
   - Click "Send Announcement" tab
   - Or click "Send Message" button on a group/community card

2. **Select Target**
   - Choose a group or community from dropdown
   - Groups and communities are grouped separately

3. **Compose Message**
   - Enter your message text
   - (Optional) Add image URL
   - Preview image will show

4. **Send**
   - Click "Send Announcement"
   - Message is sent to all members
   - You'll see success confirmation

## API Endpoints

### Groups
- `GET /api/groups` - List all groups
- `POST /api/groups` - Create new group
- `GET /api/groups/[id]` - Get group details
- `PUT /api/groups/[id]` - Update group (name, description)
- `DELETE /api/groups/[id]` - Leave group
- `POST /api/groups/[id]/members` - Add members
- `DELETE /api/groups/[id]/members` - Remove member

### Communities
- `GET /api/communities` - List synced communities
- `POST /api/communities` - Create/sync community
- `GET /api/communities/[id]` - Get community details
- `PUT /api/communities/[id]` - Update community
- `DELETE /api/communities/[id]` - Delete community
- `POST /api/communities/sync` - Sync from WhatsApp
- `POST /api/communities/[id]/announce` - Send announcement

### WhatsApp Backend
- `GET /communities` - List communities from WhatsApp
- `GET /communities/:id` - Get community details
- `POST /communities/:id/announce` - Send to community
- `GET /groups` - List groups from WhatsApp
- `GET /groups/:id` - Get group details
- `POST /groups/create` - Create new group
- `PUT /groups/:id` - Update group
- `POST /groups/:id/add-participants` - Add members
- `POST /groups/:id/remove-participant` - Remove member
- `DELETE /groups/:id/leave` - Leave group

## UI Components

### Main Tabs
1. **Groups & Communities** - View and manage
2. **Create Group** - Create new WhatsApp group
3. **Send Announcement** - Broadcast messages

### Groups & Communities Tab
- **View Toggle**: Switch between Groups and Communities
- **Search Bar**: Filter by name or description
- **Cards**: Show name, description, member count
- **Actions**: Send message, delete/remove

### Create Group Tab
- **Group Name**: Required field
- **Description**: Optional field
- **Member Selection**: 
  - Search customers
  - Select/deselect all
  - Checkbox list with avatars
  - Shows selected count
- **Create Button**: Creates group in WhatsApp

### Send Announcement Tab
- **Target Selector**: Dropdown with groups and communities
- **Message**: Textarea with character count
- **Image URL**: Optional image with preview
- **Send Button**: Broadcasts to all members

## Database Schema

### whatsapp_communities
Stores both communities and groups (groups are stored as communities with group_count=0)

```sql
- id (UUID, PK)
- profile_id (UUID, FK)
- community_id (TEXT) - WhatsApp ID
- name (TEXT)
- description (TEXT)
- member_count (INTEGER)
- group_count (INTEGER)
- is_active (BOOLEAN)
- created_at, updated_at
```

## Security

### Profile Scoping
- All API endpoints require `active_profile_id` cookie
- Users can only see their own groups/communities
- RLS policies enforce data isolation

### WhatsApp Permissions
- User must be admin to create groups
- User must be admin to add/remove members
- User must be member to send messages

## Limitations

### WhatsApp Web.js Limitations
1. **Community Detection**: Limited native support, uses newsletter pattern detection
2. **Group Limits**: WhatsApp limits group size to 1024 members
3. **Creation Limits**: WhatsApp may rate-limit group creation
4. **Admin Rights**: Must be admin to perform certain actions

### App Limitations
1. **Member Sync**: Members are not automatically synced from WhatsApp
2. **Group Icons**: Cannot set group icons via API
3. **Delivery Receipts**: May not be available for all messages

## Troubleshooting

### Group Creation Fails
1. Check WhatsApp connection status
2. Ensure at least 1 member is selected
3. Check if phone numbers are valid
4. Verify WhatsApp backend is running
5. Check browser console for errors

### Groups Not Showing
1. Click refresh button
2. Check WhatsApp connection
3. Verify you're an admin of groups
4. Check if groups exist in WhatsApp

### Announcements Not Sending
1. Verify WhatsApp connection
2. Check if you're a member of the group/community
3. Verify message is not empty
4. Check image URL is accessible
5. Check WhatsApp backend logs

### Members Not Added
1. Verify phone numbers are correct
2. Check if numbers are on WhatsApp
3. Ensure you're group admin
4. Check WhatsApp rate limits

## Best Practices

### Creating Groups
1. **Meaningful Names**: Use clear, descriptive group names
2. **Descriptions**: Add descriptions to explain group purpose
3. **Member Selection**: Start with engaged customers
4. **Size**: Keep groups manageable (under 256 members for best performance)

### Sending Announcements
1. **Timing**: Send during business hours
2. **Frequency**: Don't spam (max 1-2 per day)
3. **Content**: Keep messages concise and valuable
4. **Images**: Use high-quality, relevant images
5. **Testing**: Test with small group first

### Managing Groups
1. **Regular Cleanup**: Remove inactive members
2. **Moderation**: Set clear group rules
3. **Engagement**: Encourage participation
4. **Updates**: Keep group info current

## Future Enhancements

### Planned Features
1. **Member Management UI**: Add/remove members from UI
2. **Group Icons**: Upload and set group icons
3. **Scheduled Messages**: Schedule announcements
4. **Message Templates**: Save and reuse templates
5. **Analytics**: Track message delivery and engagement
6. **Bulk Operations**: Create multiple groups at once
7. **Member Import**: Import members from CSV
8. **Group Settings**: Configure group permissions
9. **Auto-sync**: Automatically sync groups periodically
10. **Rich Media**: Support videos, documents, polls

### API Improvements
1. Real-time member sync
2. Webhook support for group events
3. Batch group creation
4. Advanced filtering and search
5. Export group data

## Files Created/Modified

### New Files
- `mobilehub/src/app/api/groups/route.ts`
- `mobilehub/src/app/api/groups/[id]/route.ts`
- `mobilehub/src/app/api/groups/[id]/members/route.ts`
- `mobilehub/GROUPS_AND_COMMUNITIES_GUIDE.md`

### Modified Files
- `mobilehub/whatsapp-backend/index.js` - Added group management endpoints
- `mobilehub/src/app/admin/communities/page.tsx` - Complete UI overhaul
- `mobilehub/src/app/admin/layout.tsx` - Updated navigation label

## Support

### Common Issues
- **"WhatsApp not connected"**: Go to Marketing page and scan QR code
- **"Failed to create group"**: Check if all phone numbers are valid
- **"No customers found"**: Add customers first in Customers page
- **Groups not syncing**: Restart WhatsApp backend

### Getting Help
1. Check browser console for errors
2. Check WhatsApp backend logs
3. Verify database migration ran successfully
4. Check Supabase logs for API errors
5. Test with a small group first

## Examples

### Example: Create a VIP Customer Group
```
1. Go to Communities → Create Group
2. Name: "VIP Customers"
3. Description: "Exclusive deals for our premium customers"
4. Select customers with 5+ orders
5. Click Create Group
6. Group is created instantly
```

### Example: Send Weekly Promotion
```
1. Go to Communities → Send Announcement
2. Select: "VIP Customers" group
3. Message: "🎉 Weekend Special! 20% off all phones. Valid till Sunday!"
4. Image: Upload promotion banner URL
5. Click Send Announcement
6. All members receive message
```

### Example: Sync Communities
```
1. Go to Communities → Groups & Communities
2. Click "Communities" button
3. Click "Sync Communities"
4. All your WhatsApp communities appear
5. Click "Send Announcement" on any community
```

## Conclusion

The Groups & Communities feature provides a complete solution for managing WhatsApp groups and communities directly from your CRM. Users can create groups, sync communities, and send announcements all from one place.

Key benefits:
- ✅ No need to use WhatsApp app for group management
- ✅ Integrated with customer database
- ✅ Bulk messaging capabilities
- ✅ Professional UI
- ✅ Secure and profile-scoped
- ✅ Real-time sync with WhatsApp

Start creating groups and engaging with your customers today!
