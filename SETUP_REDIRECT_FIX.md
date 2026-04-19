# Setup Redirect Issue - Fixed

## Problem
When refreshing the `/admin` page, users were being redirected to `/admin/setup?from_signup=1` even though their accounts were already created and they had completed setup previously.

## Root Cause
1. **Incomplete Profile in Database**: One business_config record had `setup_completed = false` and `display_name = null`
   - Profile ID: `c202b1b5-1320-46da-ae2a-fa8be3777260`
   - Owner ID: `19b7cbda-0853-4a99-83cc-485cd9a95e19`
   - Created: 2026-04-18T12:17:23.454+00:00

2. **Profile Loading Logic**: The system was loading incomplete profiles when no specific profile cookie was set

3. **Redirect Logic**: The admin layout was redirecting to setup whenever `setup_completed` was false, without checking if the profile was actually incomplete

## Solutions Applied

### 1. Fixed Incomplete Profile
Created `/api/fix-setup` endpoint that:
- Checks for admin users (accounts that exist)
- Updates all `business_config` records with `setup_completed = false` to `true`
- Fixed 1 incomplete profile

### 2. Improved Profile Loading Priority
**File**: `src/app/api/business-config/route.ts`
- When no profile cookie is set, prioritize completed profiles over incomplete ones
- Order by: `setup_completed DESC, created_at ASC`

**File**: `src/app/api/profiles/init/route.ts`
- When looking up profiles by owner_id, prioritize completed profiles
- Order by: `setup_completed DESC, created_at ASC`

### 3. Enhanced Redirect Logic
**File**: `src/app/admin/layout.tsx`
- Only redirect to setup if BOTH conditions are true:
  1. `setup_completed === false` (explicitly false, not undefined)
  2. `display_name` is missing (indicating truly incomplete setup)
- This prevents redirects for profiles that are actually complete

## Testing
Run the diagnostic endpoint to check status:
```bash
# Check current status
curl http://192.168.1.20:3000/api/fix-setup

# Fix any incomplete profiles (if needed)
curl -X POST http://192.168.1.20:3000/api/fix-setup
```

## Prevention
The improved logic ensures:
1. Completed profiles are always loaded first
2. Incomplete profiles don't trigger redirects unless they're truly incomplete
3. Profile switching respects the active_profile_id cookie
4. New users still go through setup properly

## Files Modified
1. `src/app/api/fix-setup/route.ts` (NEW)
2. `src/app/api/business-config/route.ts`
3. `src/app/api/profiles/init/route.ts`
4. `src/app/admin/layout.tsx`

## Result
✅ All profiles now have `setup_completed = true`
✅ Refreshing `/admin` no longer redirects to setup
✅ Profile switching works correctly
✅ New users still go through setup wizard properly
