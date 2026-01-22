# **ROW LEVEL SECURITY (RLS) — DAY-1 MINIMAL STRATEGY**

---

## **1. Purpose of This Document**

This document describes the **Day-1 minimal Row Level Security (RLS) policies** applied to the core multi-tenant auth tables: `profiles`, `organizations`, and `organization_members`.

These policies provide **basic tenant isolation** for initial development, with a focus on simplicity and safety. They are designed to be expanded as the application matures.

---

## **2. Design Philosophy**

The Day-1 RLS strategy follows these principles:

* **Minimal and explicit** — Only essential policies for basic security
* **No role-based logic** — Simplified access control without owner/admin distinctions
* **No delete operations** — Prevents accidental data loss during development
* **No helper functions** — Direct SQL conditions for clarity and maintainability
* **Safe defaults** — Users can only access their own data or data from organizations they belong to

---

## **3. RLS Status**

✅ **RLS is enabled** on all three core auth tables:
* `profiles`
* `organizations`
* `organization_members`

---

## **4. Profiles Table Policies**

### **4.1 SELECT Policy: `profiles_select_own`**

**Rule:** Users can read only their own profile.

**SQL Condition:**
```sql
USING (auth.uid() = id)
```

**Use Case:** Users can view their own profile information (email, full_name, avatar_url, etc.)

---

### **4.2 INSERT Policy: `profiles_insert_own`**

**Rule:** Users can insert only their own profile.

**SQL Condition:**
```sql
WITH CHECK (auth.uid() = id)
```

**Use Case:** During user signup, users can create their own profile record linked to their auth user ID.

---

### **4.3 UPDATE Policy: `profiles_update_own`**

**Rule:** Users can update only their own profile.

**SQL Conditions:**
```sql
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id)
```

**Use Case:** Users can update their own profile information (e.g., change name, update avatar).

---

## **5. Organizations Table Policies**

### **5.1 SELECT Policy: `organizations_select_member`**

**Rule:** Users can read organizations only if they are a member.

**SQL Condition:**
```sql
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = organizations.id
        AND user_id = auth.uid()
    )
)
```

**Use Case:** Users can view organization details (name, slug, logo) for organizations they belong to. This enforces tenant isolation — users cannot see organizations they are not members of.

---

## **6. Organization Members Table Policies**

### **6.1 SELECT Policy: `organization_members_select_own`**

**Rule:** Users can read only their own organization_members rows.

**SQL Condition:**
```sql
USING (user_id = auth.uid())
```

**Use Case:** Users can see their own memberships across organizations. They can view which organizations they belong to and their role in each.

---

### **6.2 INSERT Policy: `organization_members_insert_own`**

**Rule:** Users can insert their own organization_members row during signup.

**SQL Condition:**
```sql
WITH CHECK (user_id = auth.uid())
```

**Use Case:** During the signup flow, when a user creates an organization, they can add themselves as a member. This allows the initial organization creation workflow.

---

## **7. What's NOT Included (By Design)**

The Day-1 minimal strategy intentionally **excludes** the following:

### **7.1 Role-Based Access Control**
* No distinction between `owner`, `admin`, `member`, or `viewer` roles
* All members have equal access within an organization
* Role-based policies can be added later when team management features are built

### **7.2 Delete Operations**
* No DELETE policies on any table
* Prevents accidental data loss during development
* Delete policies can be added when proper safeguards are in place

### **7.3 Organization Management**
* No INSERT policy for `organizations` table (must be handled via application logic or service role)
* No UPDATE policy for `organizations` table
* Organization creation and updates require elevated permissions

### **7.4 Advanced Member Management**
* No UPDATE policy for `organization_members` (users cannot change their own role)
* No ability for users to add other members
* Member management requires elevated permissions or application-level logic

### **7.5 Helper Functions**
* No custom PostgreSQL functions for permission checks
* All policies use direct SQL conditions
* Keeps policies simple and easy to understand

---

## **8. Security Boundaries**

### **8.1 Tenant Isolation**

The policies ensure that:
* Users can only see organizations they are members of
* Users cannot access data from organizations they don't belong to
* Each organization's data is isolated from other organizations

### **8.2 User Data Protection**

The policies ensure that:
* Users can only access their own profile data
* Users can only see their own organization memberships
* Users cannot modify other users' data

---

## **9. Implementation File**

The Day-1 minimal RLS policies are defined in:
* **File:** `rls-day1-minimal.sql`
* **Location:** Project root directory

To apply these policies, run the SQL file in the Supabase SQL Editor.

---

## **10. Future Enhancements**

As the application matures, consider adding:

1. **Role-Based Policies** — Different permissions for owners, admins, and members
2. **Organization Management** — Policies for creating and updating organizations
3. **Member Management** — Policies for adding, updating, and removing members
4. **Delete Policies** — Safe deletion with proper safeguards
5. **Helper Functions** — Reusable permission check functions for complex scenarios
6. **Cross-Organization Visibility** — Policies for viewing profiles of members in shared organizations

See `Docs/rls-advanced.md` for examples of more comprehensive RLS strategies.

---

## **11. Policy Summary Table**

| Table | Operation | Policy Name | Rule |
|-------|-----------|-------------|------|
| `profiles` | SELECT | `profiles_select_own` | Users can read their own profile |
| `profiles` | INSERT | `profiles_insert_own` | Users can insert their own profile |
| `profiles` | UPDATE | `profiles_update_own` | Users can update their own profile |
| `organizations` | SELECT | `organizations_select_member` | Users can read organizations they are members of |
| `organization_members` | SELECT | `organization_members_select_own` | Users can read their own memberships |
| `organization_members` | INSERT | `organization_members_insert_own` | Users can insert their own membership during signup |

---

## **12. Status**

✅ **Day-1 minimal RLS policies are active and documented.**

These policies provide a secure foundation for initial development while keeping complexity low.

---
