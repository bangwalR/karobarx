# Instagram Sync Issue - No April Data

## Problem
Instagram leads are only showing until March 23, 2026. No new leads from April are being synced.

## Root Cause
The Instagram Graph API is returning **0 conversations** when queried, even though:
- Instagram is connected as "skillsxai"
- Access token is valid (API returns 200 OK)
- Connection was created on March 17, 2026

## Investigation Results

### Test 1: Connection Status ✅
```
Connected: Yes
Account: skillsxai
Account ID: 17841479937783453
```

### Test 2: Graph API Response ❌
```
Status: 200 OK
Conversations Returned: 0
Has Next Page: Yes (but also empty)
```

### Test 3: Multi-Page Fetch ❌
```
Total Pages Checked: 5
Total Conversations: 0
```

## Possible Causes

### 1. Missing Permissions
The Instagram app might not have the required permission:
- `instagram_business_manage_messages` - Required to read DMs

**How to check:**
1. Go to Facebook Developers Console
2. Check app permissions
3. Verify `instagram_business_manage_messages` is approved

### 2. Wrong Account Type
Instagram Graph API only works with:
- Instagram Business Accounts
- Connected to a Facebook Page

**NOT supported:**
- Instagram Personal Accounts
- Instagram Creator Accounts (without Page)

### 3. No Active Conversations
The Instagram Business Account might genuinely have no DM conversations in the API.

**Note:** The leads in the database (from March) might have been:
- Imported manually
- From Instagram Lead Ads (not DMs)
- From a webhook that's no longer working

### 4. Token Expired or Limited
The access token might have limited scope or expired.

## Solutions

### Solution 1: Reconnect Instagram
1. Go to `/admin/settings` → Integrations
2. Disconnect Instagram
3. Reconnect with full permissions
4. Make sure to grant `instagram_business_manage_messages`

### Solution 2: Check Account Type
1. Verify the Instagram account is a **Business Account**
2. Make sure it's connected to a Facebook Page
3. Check in Instagram app: Settings → Account → Switch to Professional Account

### Solution 3: Use Instagram Webhook
Instead of polling, set up real-time webhooks:
1. Configure webhook URL in Facebook App
2. Subscribe to `messages` events
3. Webhook will push new messages in real-time

**Webhook URL:**
```
https://your-domain.com/api/webhook/instagram
```

### Solution 4: Manual Sync
Run the sync endpoint manually to test:
```
POST http://localhost:3000/api/leads/sync-instagram
```

## Current Workaround

The existing March leads are showing correctly. To see them:
1. Go to `/admin/conversations`
2. Click IG tab
3. Leads from last 60 days are displayed

## Next Steps

1. **Check permissions** in Facebook Developers Console
2. **Verify account type** (must be Business Account)
3. **Reconnect Instagram** with full permissions
4. **Test sync** after reconnecting
5. **Set up webhook** for real-time updates

## Files to Check

- `src/app/api/leads/sync-instagram/route.ts` - Sync endpoint
- `src/app/api/webhook/instagram/route.ts` - Webhook (not saving to DB)
- `src/app/api/social/instagram/conversations/route.ts` - Conversations API

## Diagnostic Endpoints

Test these URLs to diagnose:
- `http://localhost:3000/api/test-ig-connection` - Check connection
- `http://localhost:3000/api/test-ig-pages` - Check API response
- `http://localhost:3000/api/simple-ig-test` - Check database leads
