# **MISSING DATABASE TABLES ANALYSIS**

## **Dependency-Ordered List of Missing Tables**

### **For Contact Import:**

1. **`contacts`** (MISSING FIELD: `deleted_at`)
   - **Status:** Table exists but missing `deleted_at` field
   - **Used in:** `import.deduplicator.ts` (line 59, 79, 82)
   - **Dependencies:** `organizations`, `profiles`
   - **Required Field:** `deleted_at TIMESTAMPTZ NULL`

### **For Campaign Creation:**

2. **`campaigns`** (NOT CREATED)
   - **Status:** Table does not exist
   - **Used in:** Referenced in documentation, no actual code yet
   - **Dependencies:** `organizations`, `profiles`
   - **Minimal Fields Required:**
     - `id UUID PRIMARY KEY`
     - `organization_id UUID NOT NULL REFERENCES organizations(id)`
     - `name TEXT NOT NULL`
     - `status TEXT NOT NULL`
     - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
     - `created_by UUID REFERENCES profiles(id)`

---

## **Summary**

**Missing/Incomplete Tables:**
1. `contacts` - Missing `deleted_at` field (required for soft delete restore logic)
2. `campaigns` - Table does not exist (required for campaign creation)

**Note:** No campaign code exists yet, so `campaigns` table is inferred from documentation requirements only.
