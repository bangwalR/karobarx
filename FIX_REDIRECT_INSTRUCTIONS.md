# Fix Admin Redirect Issue - Instructions

## Problem
When you refresh `http://localhost:3000/admin`, it redirects to `/admin/setup?from_signup=1`

## Root Cause
The `active_profile_id` cookie is missing, causing the system to not know which profile to load.

## Solution

### Option 1: Log Out and Log Back In (Recommended)
1. Go to `http://localhost:3000/admin`
2. Click "Logout" in the sidebar
3. Log back in with your credentials
4. The cookie will be set automatically during login
5. You should now stay on `/admin` when refreshing

### Option 2: Run This in Browser Console
1. Open `http://localhost:3000/admin` in your browser
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Paste and run this code:

```javascript
fetch('/api/profiles/init', { method: 'POST' })
  .then(r => r.json())
  .then(data => {
    console.log('Profile initialized:', data);
    window.location.href = '/admin';
  });
```

5. The page will reload and the cookie will be set

### Option 3: Clear Browser Data and Re-login
1. Clear your browser cookies for `localhost:3000`
2. Go to `http://localhost:3000/admin/login`
3. Log in again
4. The cookie will be set during login

## Verify the Fix
After applying any solution above, check if the cookie is set:

1. Open Developer Tools (F12)
2. Go to Application tab → Cookies → `http://localhost:3000`
3. Look for `active_profile_id` cookie
4. It should have a UUID value like `c2c0d0ee-85df-47d6-b57f-2a7be1ea5867`

## Test
1. Go to `http://localhost:3000/admin`
2. Refresh the page (F5 or Ctrl+R)
3. You should stay on `/admin` and NOT redirect to `/admin/setup`

## What Was Fixed in the Code

### 1. Admin Layout (`src/app/admin/layout.tsx`)
- Changed default for `setup_completed` from `false` to `true`
- Added check for `configLoading` state
- Only redirect if `setup_completed === false` AND no `display_name`
- Added console logging for debugging

### 2. Login Page (`src/app/admin/login/page.tsx`)
- Fixed the setup check to only redirect if truly incomplete
- Check both `setup_completed === false` AND no `display_name`

### 3. Business Config API (`src/app/api/business-config/route.ts`)
- Prioritize completed profiles when no cookie is set
- Order by `setup_completed DESC, created_at ASC`

### 4. Profile Init API (`src/app/api/profiles/init/route.ts`)
- Prioritize completed profiles when looking up by owner_id
- Order by `setup_completed DESC, created_at ASC`

### 5. Database Fix
- Marked all incomplete profiles as complete (1 profile fixed)
- Profile `c202b1b5-1320-46da-ae2a-fa8be3777260` now has `setup_completed = true`

## Debug Endpoints

### Check Current Config
```bash
curl http://localhost:3000/api/debug-config
```

### Check All Profiles
```bash
curl http://localhost:3000/api/fix-setup
```

### Fix Incomplete Profiles
```bash
curl -X POST http://localhost:3000/api/fix-setup
```

## If Issue Persists

If you still see the redirect after trying all options above:

1. Check browser console for errors
2. Check the console log message: "Redirecting to setup - profile incomplete"
3. Run the debug endpoint and share the output:
   ```bash
   curl http://localhost:3000/api/debug-config
   ```

The issue should be resolved after logging out and back in!
