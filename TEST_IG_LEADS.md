# Test Instagram Leads - Step by Step

## Step 1: Check if leads exist in database
Open this URL in your browser:
```
http://192.168.1.20:3000/api/debug-ig-conversations
```

**Expected result:**
- Should show `allLeads.count` > 0 (e.g., 10+ leads)
- Should show your `profileId` from cookie
- Should show `filteredLeads` data

**If you see leads:** Continue to Step 2
**If you see 0 leads:** The leads were deleted or don't exist

---

## Step 2: Test the conversations API directly
Open this URL in your browser:
```
http://192.168.1.20:3000/api/social/instagram/conversations
```

**Expected result:**
```json
{
  "conversations": [
    {
      "id": "lead_123",
      "name": "mr_shiv_.33",
      "igUserId": "mr_shiv_.33",
      "lastMessage": "New lead from Instagram",
      "isLead": true
    }
  ],
  "connectedAs": null,
  "leadsOnly": true,
  "debug": {
    "profileId": "your-profile-id",
    "leadsCount": 10,
    "hasConnection": false
  }
}
```

**If you see conversations array with data:** The API is working! Continue to Step 3
**If you see empty conversations array:** Check the server console logs

---

## Step 3: Check browser console
1. Open `/admin/conversations` page
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Click on Instagram tab
5. Look for any errors in red

**Common errors:**
- Network error: Server not running
- 401 Unauthorized: Cookie issue
- Empty response: API not returning data

---

## Step 4: Check Network tab
1. Keep Developer Tools open (F12)
2. Go to Network tab
3. Click on Instagram tab in conversations
4. Look for request to `/api/social/instagram/conversations`
5. Click on it and check:
   - Status: Should be 200
   - Response: Should show conversations array

**If status is 401:** Cookie issue
**If status is 500:** Server error (check terminal)
**If status is 200 but empty:** Frontend not displaying data

---

## Step 5: Restart server
Make sure you restarted the Next.js server after making changes:

```bash
# Stop the server (Ctrl+C)
cd mobilehub
npm run dev
```

Wait for "Ready" message, then refresh the page.

---

## Step 6: Clear browser cache
Sometimes the browser caches old API responses:

1. Press Ctrl+Shift+R (hard refresh)
2. Or clear cache: F12 → Application → Clear storage → Clear site data

---

## Quick Fix: Update leads with profile_id

If leads have `profile_id: null`, run this:
```
http://192.168.1.20:3000/api/fix-lead-profiles
```

This will assign your profile_id to all leads.

---

## Still not working?

Share the output of:
1. `/api/debug-ig-conversations` response
2. `/api/social/instagram/conversations` response
3. Browser console errors
4. Server terminal logs
