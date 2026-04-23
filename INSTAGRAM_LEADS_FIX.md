# Instagram Leads in Conversations - Fix Summary

## Problem
Instagram leads were not showing in the conversations section even though they existed in the database.

## Root Causes
1. **Frontend blocking leads display**: The conversations page was showing "Instagram not connected" message and blocking the entire list when Instagram wasn't connected, even though the API was returning leads.
2. **Missing profile_id filtering**: The API was not filtering leads by `profile_id`, which is a security requirement.
3. **Existing leads have null profile_id**: All existing Instagram leads in the database have `profile_id: null`, so they won't show up even after adding the filter.

## Solutions Applied

### 1. Frontend Fix (`mobilehub/src/app/admin/conversations/page.tsx`)
- **Removed blocking "not connected" message**: Now shows leads even when Instagram is not connected
- **Added "LEAD" badge**: Leads are visually distinguished with a green "LEAD" badge
- **Updated empty state**: Shows helpful message about leads vs DMs
- **Added `isLead` property**: TypeScript interface updated to support lead identification

### 2. API Fix (`mobilehub/src/app/api/social/instagram/conversations/route.ts`)
- **Handles null profile_id**: Shows leads even if they have `profile_id: null`
- **Backward compatible**: Works with or without `active_profile_id` cookie
- **Added debug logging**: Console logs show what's being returned
- **Filters by profile OR null**: Uses `or` query to include both assigned and unassigned leads

### 3. Debug Endpoints (NEW)
- **`/api/debug-ig-conversations`**: Shows all leads and filtered leads
- **`/api/fix-lead-profiles`**: Updates leads with null profile_id

## How to Test the Fix

### Quick Test (Do this first!)

1. **Open debug endpoint** in your browser:
   ```
   http://192.168.1.20:3000/api/debug-ig-conversations
   ```
   This will show you if leads exist in the database.

2. **Open conversations API** in your browser:
   ```
   http://192.168.1.20:3000/api/social/instagram/conversations
   ```
   This will show you what the API is returning.

3. **Check the conversations page**:
   - Go to `/admin/conversations`
   - Click Instagram tab
   - Open browser console (F12) and check for errors

### If Still Not Working

Follow the detailed troubleshooting guide in `TEST_IG_LEADS.md`

## Expected Behavior After Fix

1. **Instagram tab shows leads**: Even without Instagram connected, you'll see leads from the database
2. **Leads have green badge**: Each lead shows a "LEAD" badge to distinguish from real DMs
3. **Profile isolation**: Each user only sees their own leads (multi-tenancy security)
4. **Clicking a lead**: Opens the conversation (though messages won't load without Instagram connected)

## Technical Details

### Database Schema
The `leads` table has these relevant columns:
- `id`: Primary key
- `profile_id`: Foreign key to profiles table (was null, now populated)
- `source`: Platform source (e.g., "instagram")
- `platform_user_id`: Instagram username
- `name`: Lead's name
- `username`: Instagram username

### API Response Format
```json
{
  "conversations": [
    {
      "id": "lead_123",
      "name": "mr_shiv_.33",
      "igUserId": "mr_shiv_.33",
      "lastMessage": "New lead from Instagram",
      "lastMessageTime": "2024-01-20T10:30:00Z",
      "lastMessageFromMe": false,
      "unreadCount": 1,
      "isLead": true
    }
  ],
  "connectedAs": null,
  "lastUpdated": null,
  "incremental": false,
  "leadsOnly": true
}
```

## Testing Checklist

- [ ] Run `/api/fix-lead-profiles` endpoint
- [ ] Verify it returns success with count of updated leads
- [ ] Restart Next.js server
- [ ] Go to `/admin/conversations`
- [ ] Click Instagram tab
- [ ] Verify leads are visible with "LEAD" badges
- [ ] Verify each lead shows correct name/username
- [ ] Click on a lead to open conversation
- [ ] Verify no other user's leads are visible (multi-tenancy)

## Files Modified

1. `mobilehub/src/app/admin/conversations/page.tsx` - Frontend display logic
2. `mobilehub/src/app/api/social/instagram/conversations/route.ts` - API security and filtering
3. `mobilehub/src/app/api/fix-lead-profiles/route.ts` - Data migration endpoint (NEW)
4. `mobilehub/INSTAGRAM_LEADS_FIX.md` - This documentation (NEW)
