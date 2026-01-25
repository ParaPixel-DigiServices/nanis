# **SIGNUP FLOW IMPLEMENTATION**

---

## **1. Purpose of This Document**

This document describes the **signup flow implementation** for the multi-tenant SaaS platform. It covers how new user signups automatically trigger the creation of user profiles, organizations, and organization memberships.

---

## **2. Overview**

When a user signs up through Supabase Auth, the system automatically:

1. Creates a **profile** row for the user
2. Creates a new **organization** owned by the user
3. Inserts an **organization_members** row with `role = 'owner'`

All operations are handled server-side via a Supabase Edge Function to ensure security, atomicity, and idempotency.

---

## **3. Architecture Decision**

**Decision:** Signup side effects are handled via a Supabase Edge Function called immediately after user signup.

**Reference:** See `Docs/Overview/decision-log.md` - **D-011: Signup Side Effects via Edge Function**

**Key Benefits:**
* Atomic operations ensure data consistency
* Service role access bypasses RLS for organization creation
* Idempotent design handles duplicate retries safely
* Keeps frontend logic simple and secure

---

## **4. Flow Diagram**

```
User Signup (Supabase Auth)
    ↓
auth.users table INSERT
    ↓
Database Webhook Triggered
    ↓
Edge Function: on-signup-create-org
    ↓
[Service Role Client - Bypasses RLS]
    ↓
┌─────────────────────────────────────┐
│ 1. Check if profile exists          │
│ 2. Create profile (if missing)      │
│ 3. Generate unique org slug          │
│ 4. Create organization               │
│ 5. Create organization_members      │
│    with role = 'owner'               │
└─────────────────────────────────────┘
    ↓
Return Success Response
```

---

## **5. Edge Function Implementation**

### **5.1 Function Details**

* **Name:** `on-signup-create-org`
* **Location:** `apps/api/on-signup-create-org.ts`
* **Runtime:** Deno (Supabase Edge Functions)
* **Trigger:** Database webhook on `auth.users` INSERT

### **5.2 Required Environment Variables**

The function requires these environment variables to be set in Supabase Dashboard:

1. **`SUPABASE_URL`**
   * Your Supabase project URL
   * Format: `https://[project-ref].supabase.co`
   * Found in: Project Settings → API → Project URL

2. **`SUPABASE_SERVICE_ROLE_KEY`**
   * Service role key (bypasses RLS)
   * Found in: Project Settings → API → service_role key (secret)
   * **Important:** Use service_role key, not anon key

### **5.3 Function Logic**

#### **Step 1: Parse Signup Event**
```typescript
const event: SignupEvent = await req.json();
const userId = event.record.id;
const userEmail = event.record.email;
const fullName = userMetadata.full_name || userMetadata.name || userEmail?.split("@")[0] || "User";
```

#### **Step 2: Idempotency Check**
* Checks if profile already exists
* If profile exists, checks for existing organization membership
* Returns early if user already has an organization (idempotent)

#### **Step 3: Create Profile**
* Creates profile row if it doesn't exist
* Handles race conditions (unique constraint violations)

#### **Step 4: Generate Organization Details**
* Organization name: `{fullName}'s Workspace`
* Slug generation:
  * Converts name/email to lowercase
  * Removes special characters
  * Ensures uniqueness by appending user ID if needed
  * Maximum 10 attempts to find unique slug

#### **Step 5: Create Organization**
* Creates organization with generated name and slug
* Sets `created_by` to user ID
* Handles race conditions (slug conflicts)

#### **Step 6: Create Membership**
* Inserts `organization_members` row
* Sets `role = 'owner'`
* Handles race conditions (duplicate membership)

### **5.4 Error Handling**

The function handles:
* **Race conditions** - Unique constraint violations (23505) are handled gracefully
* **Missing data** - Validates user ID and handles missing email/name
* **Idempotency** - Returns success if records already exist
* **Service errors** - Returns 500 with error message on unexpected failures

---

## **6. Webhook Configuration**

### **6.1 Setup Steps**

1. Go to **Database** → **Webhooks** in Supabase Dashboard
2. Click **"Create a new webhook"**
3. Configure:
   * **Name:** `on-user-signup` (or any descriptive name)
   * **Table:** `auth.users`
   * **Events:** `INSERT`
   * **Type:** `HTTP Request`
   * **URL:** `https://[project-ref].supabase.co/functions/v1/on-signup-create-org`
   * **HTTP Method:** `POST`
   * **HTTP Headers:** 
     * `Authorization: Bearer [SERVICE_ROLE_KEY]`
     * `Content-Type: application/json`

### **6.2 Webhook Payload**

The webhook sends the following payload to the Edge Function:

```json
{
  "record": {
    "id": "user-uuid",
    "email": "user@example.com",
    "raw_user_meta_data": {
      "full_name": "John Doe",
      "name": "John Doe"
    }
  }
}
```

---

## **7. What Gets Created**

### **7.1 Profile Row**

**Table:** `profiles`

**Fields:**
* `id` - User's UUID (references `auth.users.id`)
* `email` - User's email address
* `full_name` - User's full name (from metadata or email)
* `avatar_url` - NULL (can be updated later)
* `created_at` - Timestamp
* `updated_at` - Timestamp

### **7.2 Organization Row**

**Table:** `organizations`

**Fields:**
* `id` - Generated UUID
* `name` - `"{fullName}'s Workspace"`
* `slug` - URL-safe slug (e.g., `john-doe-workspace` or `john-doe-abc12345`)
* `logo_url` - NULL (can be updated later)
* `created_by` - User's UUID
* `created_at` - Timestamp
* `updated_at` - Timestamp

### **7.3 Organization Member Row**

**Table:** `organization_members`

**Fields:**
* `id` - Generated UUID
* `organization_id` - Organization UUID
* `user_id` - User's UUID
* `role` - `"owner"`
* `created_at` - Timestamp
* `updated_at` - Timestamp

---

## **8. Idempotency**

The function is **fully idempotent**, meaning it can be called multiple times safely without creating duplicate records.

### **8.1 Idempotency Checks**

1. **Profile Check:** If profile exists, checks for existing organization
2. **Organization Check:** If organization exists (slug conflict), uses existing organization
3. **Membership Check:** If membership exists, returns success without error

### **8.2 Race Condition Handling**

The function handles race conditions by:
* Checking for existing records before creating
* Catching unique constraint violations (23505)
* Returning success if records already exist
* Using service role to ensure consistent access

---

## **9. Testing the Signup Flow**

### **9.1 Method 1: Create User via Dashboard**

1. Go to **Authentication** → **Users** in Supabase Dashboard
2. Click **"Add user"** → **"Create new user"**
3. Enter:
   * Email: `test@example.com`
   * Password: (any password)
   * Auto Confirm User: ON (optional)
4. Click **"Create user"**

### **9.2 Method 2: Signup via Frontend**

1. Use your application's signup page
2. Create a new user account
3. The webhook will trigger automatically

### **9.3 Verification Steps**

After signup, verify the following:

#### **Check Edge Function Logs**
1. Go to **Edge Functions** → `on-signup-create-org` → **Logs**
2. Look for successful execution or errors

#### **Verify Database Records**

Run this SQL query to verify all records were created:

```sql
-- Replace 'test@example.com' with the email you used
SELECT 
  p.id as user_id,
  p.email,
  p.full_name,
  o.id as org_id,
  o.name as org_name,
  o.slug as org_slug,
  om.role
FROM profiles p
LEFT JOIN organization_members om ON om.user_id = p.id
LEFT JOIN organizations o ON o.id = om.organization_id
WHERE p.email = 'test@example.com';
```

Expected result:
* One profile row
* One organization row
* One organization_members row with `role = 'owner'`

#### **Check Webhook Status**

1. Go to **Database** → **Webhooks**
2. Check delivery status and attempts
3. Verify webhook was triggered

---

## **10. Troubleshooting**

### **10.1 Profile Not Created**

**Possible Causes:**
* Edge Function not receiving webhook
* Service role key incorrect
* RLS blocking (shouldn't happen with service role)

**Solutions:**
* Check Edge Function logs
* Verify environment variables
* Check webhook configuration

### **10.2 Organization Not Created**

**Possible Causes:**
* Service role key missing or incorrect
* Slug generation failing
* Database constraint violation

**Solutions:**
* Verify `SUPABASE_SERVICE_ROLE_KEY` is set
* Check Edge Function logs for errors
* Verify `organizations` table exists and has correct schema

### **10.3 Membership Not Created**

**Possible Causes:**
* Organization creation failed
* Unique constraint violation (user already member)
* Foreign key constraint violation

**Solutions:**
* Check if organization was created
* Verify user doesn't already have membership
* Check Edge Function logs

### **10.4 Webhook Not Triggering**

**Possible Causes:**
* Webhook not configured correctly
* Wrong table or event type
* Webhook URL incorrect

**Solutions:**
* Verify webhook points to `auth.users` table
* Check event type is `INSERT`
* Verify webhook URL matches Edge Function URL
* Check webhook delivery logs

### **10.5 Duplicate Records**

**Possible Causes:**
* Webhook triggered multiple times
* Idempotency logic not working

**Solutions:**
* Check Edge Function logs for idempotency checks
* Verify unique constraints on tables
* Review webhook retry settings

---

## **11. Security Considerations**

### **11.1 Service Role Key**

* **Never expose** service role key to frontend
* Store securely in Supabase environment variables
* Service role bypasses all RLS policies

### **11.2 RLS Compatibility**

The function uses service role to:
* Bypass RLS for organization creation (no INSERT policy exists in Day-1 RLS)
* Create profile and membership (users can create their own via RLS, but service role ensures consistency)

### **11.3 Data Validation**

* Validates user ID exists
* Handles missing email/name gracefully
* Generates safe slugs (URL-safe, no special characters)

---

## **12. Future Enhancements**

Potential improvements for future iterations:

1. **Email Verification** - Only create organization after email verification
2. **Custom Organization Names** - Allow users to set custom organization name during signup
3. **Onboarding Flow** - Add additional setup steps after organization creation
4. **Welcome Email** - Send welcome email after successful signup
5. **Analytics** - Track signup completion rates and failures

---

## **13. Related Documentation**

* **Decision Log:** `Docs/Overview/decision-log.md` - D-011
* **RLS Policies:** `Docs/Database/rls.md` - Day-1 minimal RLS strategy
* **Database Schema:** `schema-auth-tables.sql` - Table definitions
* **Edge Function Code:** `apps/api/on-signup-create-org.ts`

---

## **14. Status**

✅ **Signup flow implementation is complete and documented.**

The signup flow is production-ready with proper error handling, idempotency, and security measures.

---
