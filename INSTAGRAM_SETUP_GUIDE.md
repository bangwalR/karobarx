# Instagram Business API Setup Guide

## The Problem
You're getting "Invalid platform app" because your Facebook App needs proper configuration for Instagram Business API.

## Solution: Configure Facebook App Correctly

### Step 1: Go to Facebook Developers
1. Visit: https://developers.facebook.com/apps/963690819557686/
2. Log in with your Facebook account

### Step 2: Add Instagram Product
1. In left sidebar, click **"Add Product"**
2. Find **"Instagram"** and click **"Set Up"**
3. Choose **"Instagram Graph API"** (NOT Basic Display)

### Step 3: Configure OAuth Redirect URIs
1. Go to **Settings** → **Basic**
2. Scroll to **"Add Platform"**
3. Click **"Website"**
4. Add Site URL: `https://nutational-lyda-cambial.ngrok-free.dev`
5. Add another platform for localhost: `http://localhost:3000`

### Step 4: Add Valid OAuth Redirect URIs
1. Still in Settings → Basic
2. Find **"Valid OAuth Redirect URIs"**
3. Add these URLs:
   ```
   https://nutational-lyda-cambial.ngrok-free.dev/api/social/instagram/callback
   http://localhost:3000/api/social/instagram/callback
   ```

### Step 5: Request Permissions
1. Go to **App Review** → **Permissions and Features**
2. Request these permissions:
   - ✅ `instagram_basic` - Basic profile access
   - ✅ `instagram_manage_messages` - **CRITICAL for DMs**
   - ✅ `instagram_manage_comments` - For comments
   - ✅ `pages_show_list` - To list Facebook Pages
   - ✅ `pages_read_engagement` - To read page data

3. Click **"Request"** for each permission
4. Fill out the form explaining why you need each permission

### Step 6: Connect Instagram Business Account to Facebook Page
**IMPORTANT:** Your Instagram account MUST be:
1. **Business Account** (not Personal or Creator)
2. **Connected to a Facebook Page**

**To connect:**
1. Open Instagram app on phone
2. Go to **Settings** → **Account** → **Linked Accounts**
3. Click **Facebook**
4. Connect to your Facebook Page

**OR via Facebook:**
1. Go to your Facebook Page
2. Click **Settings**
3. Click **Instagram** in left sidebar
4. Click **Connect Account**
5. Log in to Instagram

### Step 7: Make App Live (If in Development Mode)
1. Go to **Settings** → **Basic**
2. Toggle **"App Mode"** from Development to Live
3. OR add test users in **Roles** → **Test Users**

### Step 8: Test the Connection
1. Go to your CRM: `http://localhost:3000/admin/settings`
2. Click **Integrations** tab
3. Click **"Connect Instagram"**
4. You should see Facebook login (not Instagram)
5. Grant all permissions
6. Select your Facebook Page
7. Done!

## Common Issues & Solutions

### Issue 1: "Invalid platform app"
**Cause:** App not configured for Instagram Graph API  
**Fix:** Follow Step 2 above - Add Instagram Product

### Issue 2: "No pages found"
**Cause:** Your Facebook account has no Pages  
**Fix:** Create a Facebook Page first

### Issue 3: "No Instagram Business Account"
**Cause:** Instagram not connected to Facebook Page  
**Fix:** Follow Step 6 above

### Issue 4: "Permissions denied"
**Cause:** Didn't grant all permissions during login  
**Fix:** Disconnect and reconnect, grant ALL permissions

### Issue 5: "App not approved"
**Cause:** Permissions not approved by Facebook  
**Fix:** 
- For testing: Add yourself as Test User
- For production: Submit for App Review

## Verification Checklist

Before connecting, verify:
- [ ] Facebook App ID is correct: `963690819557686`
- [ ] Instagram Product is added to app
- [ ] OAuth redirect URIs are configured
- [ ] Permissions are requested (at least in review)
- [ ] Instagram account is Business type
- [ ] Instagram is connected to Facebook Page
- [ ] You're admin of the Facebook Page

## After Successful Connection

Once connected, you can:
1. **Sync leads**: `POST http://localhost:3000/api/leads/sync-instagram`
2. **View conversations**: Go to Conversations → IG tab
3. **Auto-sync**: Set up webhook for real-time updates

## Need Help?

If still having issues:
1. Check Facebook App Dashboard for errors
2. Verify Instagram account type (must be Business)
3. Make sure Page is connected to Instagram
4. Try with a test user first
5. Check browser console for detailed errors

## Quick Test

After setup, test with:
```
http://localhost:3000/api/instagram-diagnostics
```

This will show:
- ✅ Token validity
- ✅ Account type
- ✅ Permissions granted
- ✅ Conversations count
