# 🚨 URGENT: Cookie Missing - Random Accounts Showing

## THE PROBLEM

When you continuously refresh, it **randomly shows different accounts**!

### Root Cause:
The `active_profile_id` cookie is **MISSING** from your browser.

### Proof:
```bash
curl http://localhost:3000/api/debug-config
# Returns: {"profileId":null,"cookies":{"active_profile_id":"missing"}}
```

---

## WHY THIS HAPPENS

1. **Cookie was never set** during login
2. **Cookie expired** (30 days)
3. **Browser cleared cookies**
4. **Server restarted** and session lost

Without the cookie:
- System doesn't know which profile to load
- May load random data (if any endpoints are still vulnerable)
- Inconsistent behavior on refresh

---

## 🔴 IMMEDIATE FIX

### Option 1: Visit Force Cookie Page (FASTEST)
1. Go to: **`http://localhost:3000/force-cookie`**
2. Wait for it to set the cookie
3. You'll be redirected to dashboard
4. Problem solved!

### Option 2: Log Out and Log Back In
1. Go to dashboard
2. Click "Logout" in sidebar
3. Log in again with your credentials
4. Cookie will be set during login

### Option 3: Clear Everything and Start Fresh
1. Clear all browser cookies for localhost:3000
2. Close browser completely
3. Reopen and go to `http://localhost:3000/admin/login`
4. Log in
5. Cookie will be set

---

## 🔍 HOW TO VERIFY COOKIE IS SET

### Method 1: Browser DevTools
1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **Cookies** → `http://localhost:3000`
4. Look for `active_profile_id`
5. Should have a UUID value like: `c2c0d0ee-85df-47d6-b57f-2a7be1ea5867`

### Method 2: Debug Endpoint
```bash
curl http://localhost:3000/api/debug-config
```

Should return:
```json
{
  "profileId": "c2c0d0ee-85df-47d6-b57f-2a7be1ea5867",
  "config": { ... },
  "cookies": { "active_profile_id": "present" }
}
```

---

## ⚠️ ENDPOINTS NOW SECURED

All endpoints have been fixed to REQUIRE profileId:

1. ✅ `/api/profiles` - Requires auth and filters by owner_id
2. ✅ `/api/dashboard` - Requires profileId
3. ✅ `/api/business-config` - Requires profileId
4. ✅ `/api/phones` - Requires profileId
5. ✅ `/api/orders` - Requires profileId
6. ✅ `/api/customers` - Requires profileId
7. ✅ `/api/inquiries` - Requires profileId
8. ✅ `/api/settings` - Requires profileId (GET, POST, PUT)
9. ✅ `/api/calendar/events` - Requires profileId (GET, POST, PUT, DELETE)

**All endpoints now return 401 if cookie is missing!**

---

## 🔧 ALL ENDPOINTS NOW SECURED

All vulnerable endpoints have been fixed to require the `active_profile_id` cookie.

**Pattern applied:**
```typescript
// BEFORE (Vulnerable):
const profileId = getProfileId(request);
let query = supabase.from("table").select("*");
if (profileId) query = query.eq("profile_id", profileId); // OPTIONAL!

// AFTER (Secure):
const profileId = getProfileId(request);
if (!profileId) {
  return NextResponse.json({ error: "No active profile" }, { status: 401 });
}
let query = supabase.from("table").select("*").eq("profile_id", profileId); // REQUIRED!
```

---

## 📋 ACTION ITEMS

### Immediate (Do Now):
1. ✅ **RESTART SERVER** - API changes require restart
2. ✅ Visit `http://localhost:3000/force-cookie`
3. ✅ Verify cookie is set in DevTools
4. ✅ Test dashboard - should show consistent data

### Completed:
1. ✅ Fixed all vulnerable endpoints
2. ✅ Added profileId requirement checks
3. ✅ All endpoints return 401 if cookie missing

### Long-term (Later):
1. ⏳ Implement proper session management
2. ⏳ Add cookie expiration warnings
3. ⏳ Add automatic re-authentication

---

## 🧪 TEST AFTER FIX

1. Visit `/force-cookie` to set cookie
2. Go to dashboard
3. Refresh 10 times rapidly
4. **Expected:** Same account data every time ✅
5. **Expected:** No random switching ✅

---

## 🔒 WHY THIS IS CRITICAL

Without the cookie:
- ❌ Users see random accounts
- ❌ Data leakage between users
- ❌ Inconsistent experience
- ❌ Security vulnerability

With the cookie:
- ✅ Users see only their account
- ✅ Consistent data
- ✅ Secure isolation
- ✅ Professional experience

---

## 📞 IF STILL NOT WORKING

1. Check if server is running
2. Check if you're logged in (visit `/admin/login`)
3. Check browser console for errors
4. Try incognito/private window
5. Clear ALL site data and try again

---

**GO TO: `http://localhost:3000/force-cookie` NOW!**
