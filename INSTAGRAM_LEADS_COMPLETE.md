# Instagram Leads - Complete Fix ✅

## What Was Fixed

### 1. Leads Now Show in Conversations ✅
- **Problem**: Instagram leads existed in database but weren't showing
- **Root Cause**: API was querying non-existent `username` column
- **Fix**: Changed to use `platform_username` column
- **Result**: 50+ Instagram leads now display in conversations list

### 2. Recent Leads Only ✅
- **Problem**: Showing old leads from March 26
- **Fix**: Added 30-day filter to show only recent leads
- **Result**: Only leads from last 30 days are shown

### 3. Lead Conversations Show Messages ✅
- **Problem**: Clicking a lead showed no messages
- **Fix**: Updated messages API to handle lead conversations
- **Result**: Shows lead notes/conversation history when clicked

## How It Works Now

### Conversations List
1. Go to `/admin/conversations`
2. Click **IG** (Instagram) tab
3. See all Instagram leads from last 30 days
4. Leads have green "LEAD" badge
5. Sorted by most recent first

### Lead Messages
1. Click on any lead
2. See conversation history from `notes` field
3. Shows lead info (name, username, status, tags)
4. Can send messages (if Instagram is connected)

## Technical Details

### API Endpoints

**`/api/social/instagram/conversations`**
- Returns Instagram DMs + Leads
- Filters leads by last 30 days
- Sorts by `updated_at` descending
- Adds `isLead: true` flag for leads

**`/api/social/instagram/messages/[conversationId]`**
- Handles both real conversations and leads
- If `conversationId` starts with `lead_`, fetches from database
- Shows lead notes as conversation history
- Returns lead metadata

### Database Schema
```sql
leads table:
- id (uuid)
- name (text)
- platform_user_id (text) -- Instagram user ID
- platform_username (text) -- Instagram username
- source (text) -- "instagram"
- notes (text) -- Conversation history
- last_contacted_at (timestamp)
- updated_at (timestamp)
- profile_id (uuid) -- For multi-tenancy
```

### Frontend Changes
- Removed "Instagram not connected" blocking message
- Shows leads even without Instagram connection
- Added green "LEAD" badge for leads
- Handles lead conversations in messages view

## Testing

### Test 1: View Leads
```
http://localhost:3000/admin/conversations
```
Click IG tab → Should see 50+ leads

### Test 2: View Lead Messages
Click any lead → Should see conversation history

### Test 3: API Response
```
http://localhost:3000/api/social/instagram/conversations
```
Should return JSON with conversations array

## Current Status

✅ Instagram leads show in conversations list
✅ Only recent leads (last 30 days) are shown
✅ Leads have green "LEAD" badge
✅ Clicking a lead shows conversation history
✅ Lead info displayed (name, username, status)
✅ Multi-tenancy ready (profile_id filtering)

## Next Steps (Optional)

1. **Connect Instagram** to see real DMs alongside leads
2. **Update profile_id** for existing leads:
   ```
   http://localhost:3000/api/fix-lead-profiles
   ```
3. **Sync new leads** from Instagram DMs automatically
4. **Add reply functionality** for leads

## Files Modified

1. `src/app/api/social/instagram/conversations/route.ts`
   - Fixed `username` → `platform_username`
   - Added 30-day filter
   - Added debug logging

2. `src/app/api/social/instagram/messages/[conversationId]/route.ts`
   - Added lead conversation handling
   - Shows lead notes as messages
   - Returns lead metadata

3. `src/app/admin/conversations/page.tsx`
   - Removed blocking "not connected" message
   - Added lead badge display
   - Updated empty states

## Troubleshooting

**No leads showing?**
- Check if leads exist: `http://localhost:3000/api/simple-ig-test`
- Hard refresh: Ctrl+Shift+R
- Check console for errors: F12 → Console

**Old leads showing?**
- Leads are filtered to last 30 days
- Update `thirtyDaysAgo` in API if you want different range

**Messages not loading?**
- Check if `notes` field has data in database
- Lead conversations show notes, not real Instagram messages
- Connect Instagram to see real DM history
