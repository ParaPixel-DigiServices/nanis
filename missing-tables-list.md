# **MISSING DATABASE TABLES**
## Dependency-Ordered List for Contact Import & Campaign Creation

---

## **1. CONTACT IMPORT**

### **Missing Field in Existing Table:**

**`contacts` table - Missing `deleted_at` field**
- **Current Status:** Table exists in `schema-contacts.sql` but missing `deleted_at` column
- **Referenced In:** 
  - `apps/api/src/modules/contacts/import/import.deduplicator.ts` (lines 59, 79, 82)
  - `apps/api/src/modules/contacts/import/import.repository.ts` (line 134)
  - `apps/api/src/modules/contacts/import/import.types.ts` (line 109)
- **Required Field:** `deleted_at TIMESTAMPTZ NULL`
- **Dependencies:** None (table already exists, just needs field added)
- **SQL:**
  ```sql
  ALTER TABLE contacts ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  ```

---

## **2. CAMPAIGN CREATION**

### **Missing Tables:**

**`campaigns` table**
- **Current Status:** Table does not exist
- **Referenced In:** Documentation only (no actual code yet)
- **Dependencies:** `organizations`, `profiles`
- **Minimal Required Fields:**
  - `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
  - `organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`
  - `name TEXT NOT NULL`
  - `status TEXT NOT NULL`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - `created_by UUID REFERENCES profiles(id) ON DELETE SET NULL`

---

## **DEPENDENCY ORDER**

1. **Base Tables (Already Exist):**
   - `organizations` ✅
   - `profiles` ✅
   - `organization_members` ✅

2. **Contact Tables (Partially Complete):**
   - `contacts` ⚠️ (exists but missing `deleted_at` field)
   - `contact_custom_field_definitions` ✅
   - `contact_custom_field_values` ✅

3. **Campaign Tables (Missing):**
   - `campaigns` ❌ (does not exist)

---

## **ACTION ITEMS**

1. **Add `deleted_at` to `contacts` table** (required for contact import restore logic)
2. **Create `campaigns` table** (required for campaign creation)
