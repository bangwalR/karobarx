# Multi-Tenancy Data Isolation Fix

## Problem
Currently, when a new user creates an account, they can see data from other accounts. This is a **critical security issue** that violates data privacy.

## Root Cause
1. **Database schema missing `profile_id` columns** on most tables
2. **API routes not filtering by `profile_id`** consistently
3. **No Row Level Security (RLS)** policies enforcing isolation at DB level

---

## Solution Overview

### 1. Database Migration (CRITICAL - Run First)
Run the migration file: `supabase/migrations/001_add_multi_tenancy.sql`

This migration:
- ✅ Adds `profile_id` column to all tables
- ✅ Creates indexes for performance
- ✅ Enables Row Level Security (RLS)
- ✅ Makes IMEI/phone unique per profile (not globally)
- ✅ Adds helper functions for profile context

**After migration, assign existing data to profiles:**
```sql
-- Get your profile ID from business_config table
SELECT id, display_name FROM business_config;

-- Update all existing data (replace <profile-id> with actual ID)
UPDATE phones SET profile_id = '<profile-id>' WHERE profile_id IS NULL;
UPDATE customers SET profile_id = '<profile-id>' WHERE profile_id IS NULL;
UPDATE orders SET profile_id = '<profile-id>' WHERE profile_id IS NULL;
UPDATE inquiries SET profile_id = '<profile-id>' WHERE profile_id IS NULL;
UPDATE sellers SET profile_id = '<profile-id>' WHERE profile_id IS NULL;
UPDATE leads SET profile_id = '<profile-id>' WHERE profile_id IS NULL;
UPDATE whatsapp_messages SET profile_id = '<profile-id>' WHERE profile_id IS NULL;
```

---

### 2. API Routes That Need Fixing

#### ✅ Already Fixed (have profile_id filtering):
- `/api/phones` - GET, POST
- `/api/phones/[id]` - GET, PUT, DELETE
- `/api/orders` - GET, POST
- `/api/orders/[id]` - GET, PUT, DELETE
- `/api/customers` - GET, POST
- `/api/customers/[id]` - GET, PUT, DELETE
- `/api/inquiries` - GET, POST
- `/api/settings` - GET, POST
- `/api/telegram` - GET, POST

#### ❌ Missing profile_id filtering (MUST FIX):

**High Priority:**
1. `/api/phones/search` - No profile filter at all
2. `/api/leads` - Stats query missing profile filter
3. `/api/conversations` - No profile filter
4. `/api/conversations/[phone]` - No profile filter
5. `/api/dashboard` - No profile filter

**Medium Priority:**
6. `/api/inquiries/[id]` - No profile filter
7. `/api/marketing/campaigns` - No profile filter
8. `/api/webhook/whatsapp` - Should store profile_id from context

---

### 3. Code Fixes Required

#### Fix #1: `/api/phones/search/route.ts`
```typescript
// ADD THIS at the top of GET handler:
import { getProfileId } from "@/lib/profile";

export async function GET(request: NextRequest) {
  const profileId = getProfileId(request);
  
  let dbQuery = supabase
    .from("phones")
    .select("*")
    .order("selling_price", { ascending: true });

  // ADD THIS LINE:
  if (profileId) {
    dbQuery = dbQuery.eq("profile_id", profileId);
  }
  
  // ... rest of code
}

// SAME FIX for POST handler
```

#### Fix #2: `/api/leads/route.ts`
```typescript
// In GET handler, fix the stats query:
const { data: statsData } = await supabase
  .from("leads")
  .select("status, source");

// CHANGE TO:
let statsQuery = supabase.from("leads").select("status, source");
if (profileId) statsQuery = statsQuery.eq("profile_id", profileId);
const { data: statsData } = await statsQuery;
```

#### Fix #3: `/api/conversations/route.ts`
```typescript
// ADD at top:
import { getProfileId } from "@/lib/profile";

export async function GET(request: NextRequest) {
  const profileId = getProfileId(request);
  
  // For single conversation:
  if (phone) {
    let query = supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("customer_phone", phone);
    
    // ADD THIS:
    if (profileId) {
      query = query.eq("profile_id", profileId);
    }
    
    // ... rest
  }
  
  // For all threads:
  let threadsQuery = supabase
    .from("whatsapp_messages")
    .select("customer_phone, customer_name, customer_id, message_text, direction, created_at")
    .order("created_at", { ascending: false });
  
  // ADD THIS:
  if (profileId) {
    threadsQuery = threadsQuery.eq("profile_id", profileId);
  }
  
  const { data: threads, error } = await threadsQuery;
  // ... rest
}

// In POST handler:
export async function POST(request: NextRequest) {
  const profileId = getProfileId(request);
  
  // When inserting message:
  const { data: message, error } = await supabase
    .from("whatsapp_messages")
    .insert([{
      // ... existing fields
      ...(profileId ? { profile_id: profileId } : {}),
    }])
    .select()
    .single();
}
```

#### Fix #4: `/api/dashboard/route.ts`
```typescript
import { getProfileId } from "@/lib/profile";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const profileId = getProfileId(request);

  // Build queries with profile filter
  let phonesQuery = supabase.from("phones").select("status, selling_price, cost_price, created_at");
  let ordersQuery = supabase.from("orders").select("status, final_amount, created_at");
  let customersQuery = supabase.from("customers").select("status, total_spent, created_at");
  let inquiriesQuery = supabase.from("inquiries").select("status, source, created_at");

  // ADD PROFILE FILTERS:
  if (profileId) {
    phonesQuery = phonesQuery.eq("profile_id", profileId);
    ordersQuery = ordersQuery.eq("profile_id", profileId);
    customersQuery = customersQuery.eq("profile_id", profileId);
    inquiriesQuery = inquiriesQuery.eq("profile_id", profileId);
  }

  const [phonesRes, ordersRes, customersRes, inquiriesRes] = await Promise.all([
    phonesQuery,
    ordersQuery,
    customersQuery,
    inquiriesQuery,
  ]);
  
  // ... rest of code
}
```

#### Fix #5: `/api/webhook/whatsapp/route.ts`
```typescript
// This webhook receives data from external sources
// We need to determine which profile it belongs to

// Option A: Add profile_id to webhook URL
// https://yoursite.com/api/webhook/whatsapp?profile_id=xxx

// Option B: Map phone number to profile
// Store a mapping table: whatsapp_phone_number -> profile_id

// For now, use query param:
export async function POST(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get("profile_id");
  
  // Store in conversation context with profile_id
  conversationContext[from] = {
    profile_id: profileId,
    lastMessage: message,
    // ... rest
  };
  
  // When creating inquiry, include profile_id
}
```

---

### 4. WhatsApp Backend Integration

The WhatsApp backend (`whatsapp-backend/index.js`) needs to know which profile each message belongs to.

**Solution: Profile-specific WhatsApp sessions**

Each profile should have its own WhatsApp session:

```javascript
// In whatsapp-backend/index.js

// Change from single client to multiple clients per profile
const clients = new Map(); // profileId -> Client instance

app.post('/init-session', async (req, res) => {
  const { profileId } = req.body;
  
  if (clients.has(profileId)) {
    return res.json({ message: 'Session already exists' });
  }
  
  const client = new Client({
    authStrategy: new LocalAuth({ 
      clientId: `mobilehub-${profileId}`,
      dataPath: waDataPath 
    }),
    // ... puppeteer config
  });
  
  clients.set(profileId, client);
  client.initialize();
  
  res.json({ success: true });
});

// Update all endpoints to accept profileId
app.post('/send', async (req, res) => {
  const { profileId, phone, message } = req.body;
  const client = clients.get(profileId);
  
  if (!client || !client.info) {
    return res.status(503).json({ error: 'WhatsApp not connected for this profile' });
  }
  
  // ... send message
});
```

---

### 5. Testing Checklist

After applying all fixes, test:

1. ✅ Create two separate user accounts
2. ✅ Login as User A, add phones/customers/orders
3. ✅ Login as User B, verify you see ZERO data from User A
4. ✅ Add data as User B
5. ✅ Switch back to User A, verify User B's data is NOT visible
6. ✅ Test search, dashboard, conversations - all should be isolated
7. ✅ Test WhatsApp integration with profile-specific sessions

---

### 6. Security Best Practices

**After migration is complete:**

1. Make `profile_id` NOT NULL:
```sql
ALTER TABLE phones ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE customers ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE orders ALTER COLUMN profile_id SET NOT NULL;
-- etc for all tables
```

2. Add foreign key constraints:
```sql
ALTER TABLE phones 
  ADD CONSTRAINT fk_phones_profile 
  FOREIGN KEY (profile_id) 
  REFERENCES business_config(id) 
  ON DELETE CASCADE;

-- Repeat for all tables
```

3. Enable RLS on ALL tables (already in migration)

4. Audit all API routes to ensure they use `getProfileId(request)`

---

## Summary

**Before Fix:**
- ❌ User A can see User B's data
- ❌ No database-level isolation
- ❌ Inconsistent API filtering

**After Fix:**
- ✅ Complete data isolation per profile
- ✅ Database-level RLS enforcement
- ✅ All API routes filter by profile_id
- ✅ Each profile has separate WhatsApp session
- ✅ Secure multi-tenant architecture

---

## Priority Order

1. **CRITICAL**: Run database migration
2. **CRITICAL**: Fix `/api/phones/search` (public-facing)
3. **HIGH**: Fix `/api/dashboard`, `/api/conversations`, `/api/leads`
4. **MEDIUM**: Fix remaining routes
5. **FINAL**: Make profile_id NOT NULL and add FK constraints
