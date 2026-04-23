# Quick Test Guide - Instagram Leads Not Showing

## 🚨 IMPORTANT: Restart Server First!

Before testing anything, make sure you've restarted the server:

```bash
# In terminal, press Ctrl+C to stop the server
cd mobilehub
npm run dev
```

Wait for the "Ready" message before continuing.

---

## Test 1: Check if leads exist (30 seconds)

**Open this URL:**
```
http://192.168.1.20:3000/api/debug-ig-conversations
```

**What to look for:**
- `allLeads.count` should be > 0 (like 10 or more)
- `allLeads.data` should show your Instagram leads

**Result:**
- ✅ If you see leads: Continue to Test 2
- ❌ If count is 0: Leads don't exist in database

---

## Test 2: Check API response (30 seconds)

**Open this URL:**
```
http://192.168.1.20:3000/api/test-ig-api
```

**What to look for:**
```json
{
  "success": true,
  "status": 200,
  "conversationsCount": 10,
  "firstConversation": {
    "id": "lead_123",
    "name": "mr_shiv_.33",
    "isLead": true
  }
}
```

**Result:**
- ✅ If `conversationsCount` > 0: API is working! Continue to Test 3
- ❌ If `conversationsCount` is 0: API not returning leads

---

## Test 3: Check frontend (1 minute)

1. Go to: `http://192.168.1.20:3000/admin/conversations`
2. Click the **Instagram** tab (IG button)
3. Press **F12** to open Developer Tools
4. Go to **Console** tab
5. Look for any red errors

**What you should see:**
- List of Instagram leads with green "LEAD" badges
- Names like: mr_shiv_.33, prin85792, tirthani_bhoomi, etc.

**If you see "No conversations found":**
- Check Console tab for errors
- Check Network tab for failed requests

---

## Test 4: Check Network requests (1 minute)

1. Keep Developer Tools open (F12)
2. Go to **Network** tab
3. Click Instagram tab again to trigger a refresh
4. Look for request to `conversations`
5. Click on it and check:
   - **Status**: Should be 200 (green)
   - **Response**: Should show conversations array

**Common issues:**
- Status 401: Cookie/auth issue
- Status 500: Server error (check terminal)
- Status 200 but empty: Frontend not rendering

---

## Quick Fixes

### Fix 1: Hard refresh browser
Press **Ctrl+Shift+R** to clear cache and reload

### Fix 2: Clear browser data
1. Press F12
2. Go to Application tab
3. Click "Clear storage"
4. Click "Clear site data"
5. Refresh page

### Fix 3: Update lead profile_id
Open this URL:
```
http://192.168.1.20:3000/api/fix-lead-profiles
```

This assigns your profile_id to all leads.

---

## Still Not Working?

Please share:

1. **Output from Test 1** (`/api/debug-ig-conversations`)
2. **Output from Test 2** (`/api/test-ig-api`)
3. **Browser console errors** (F12 → Console tab)
4. **Server terminal output** (any errors in red)

Copy and paste the JSON responses so I can see what's happening!
