# **SCHEMA DISCREPANCIES ANALYSIS**

## **DISCREPANCIES FOUND**

### **1. `contact_custom_field_definitions` Table - MISSING FIELDS**

**Backend Code Expects (from `import.repository.ts` lines 179, 202, 204, 205):**
- `is_active BOOLEAN` - Used in query filter: `.eq("is_active", true)`
- `display_label TEXT` - Used when creating new fields: `display_label: fieldName`
- `created_by UUID` - Used when creating new fields: `created_by: userId`

**Your Schema Has:**
- `id`, `organization_id`, `field_name`, `field_type`, `created_at` only

**Impact:** 
- ❌ **CRITICAL** - Code will fail when querying existing fields (line 179)
- ❌ **CRITICAL** - Code will fail when inserting new fields (lines 202-205)

**Location:** `apps/api/src/modules/contacts/import/import.repository.ts`

---

### **2. `contacts` Table - SOURCE ENUM MISMATCH**

**Backend Code Expects (from `import.types.ts` line 5):**
```typescript
type ImportSource = "excel_copy_paste" | "csv_upload" | "xlsx_upload" | "mailchimp_import"
```

**Your Schema Comment Says:**
```sql
source TEXT NOT NULL, -- manual | csv | excel | copy_paste | mailchimp
```

**Impact:**
- ⚠️ **WARNING** - Schema comment doesn't match actual enum values used in code
- The code will work (TEXT accepts any string), but comment is misleading

**Location:** Schema comment vs `apps/api/src/modules/contacts/import/import.types.ts`

---

### **3. `contacts` Table - TRIGGER BEHAVIOR**

**Your Schema:**
- Single trigger `trg_contacts_normalize` handles both:
  - Email normalization (LOWER, TRIM)
  - `updated_at` update

**Backend Code Expects:**
- `updated_at` should update on ANY UPDATE (not just when email changes)
- Your trigger does update `updated_at` on INSERT OR UPDATE, which is correct

**Impact:**
- ✅ **OK** - Your trigger correctly updates `updated_at` on all INSERT/UPDATE operations

---

### **4. `contacts` Table - MISSING INDEXES**

**Backend Code Queries:**
- `list.repository.ts` line 23: `.select("*", { count: "exact" })` with filters on `organization_id`, `is_active`, search across `email`, `first_name`, `last_name`, `mobile`
- `import.deduplicator.ts` line 58: Queries by `organization_id`, `email` (with `is_active`, `deleted_at`)

**Your Schema Has:**
- ✅ Unique index on `(organization_id, LOWER(email))` for active contacts
- ❌ **MISSING** - No explicit indexes for:
  - `(organization_id, is_active)` - Used in list queries
  - `(organization_id, deleted_at)` - Used in deduplication queries
  - Search indexes on `first_name`, `last_name`, `mobile` for list search

**Impact:**
- ⚠️ **PERFORMANCE** - List queries may be slower without composite indexes
- ⚠️ **PERFORMANCE** - Deduplication queries may be slower without `deleted_at` index

---

### **5. `contact_custom_field_values` Table - QUERY EXPECTATION**

**Backend Code (from `list.repository.ts` lines 65-73):**
```typescript
.from("contact_custom_field_values")
.select(`
  contact_id,
  value_text,
  contact_custom_field_definitions!inner(field_name)
`)
```

**Your Schema:**
- ✅ Has all required fields
- ✅ Has `organization_id` (good for RLS)
- ✅ Has proper foreign keys

**Impact:**
- ✅ **OK** - Schema matches code expectations

---

### **6. `campaigns` Table - ADDITIONAL FIELDS**

**Backend Code:**
- No campaign code exists yet (only documentation references)

**Your Schema Has:**
- Additional fields: `sender_email_id`, `template_id`, `subject`, `preview_text`, `scheduled_at`
- Related tables: `sender_emails`, `email_templates`, `campaign_target_rules`, `campaign_recipients`

**Impact:**
- ✅ **OK** - Extra fields are fine, no code conflicts

---

## **SUMMARY**

### **CRITICAL (Will Break Code):**
1. ❌ `contact_custom_field_definitions` missing: `is_active`, `display_label`, `created_by`

### **WARNINGS (Performance/Clarity):**
2. ⚠️ Schema comment for `contacts.source` doesn't match actual enum values
3. ⚠️ Missing performance indexes on `contacts` table

### **OK:**
4. ✅ `contacts` trigger correctly handles `updated_at`
5. ✅ `contact_custom_field_values` matches code expectations
6. ✅ `campaigns` table and related tables are fine (no code conflicts)

---

## **FILES TO CHECK**

**Backend Code References:**
- `apps/api/src/modules/contacts/import/import.repository.ts` (lines 179, 202-205)
- `apps/api/src/modules/contacts/import/import.types.ts` (line 5)
- `apps/api/src/modules/contacts/list/list.repository.ts` (line 23)
- `apps/api/src/modules/contacts/import/import.deduplicator.ts` (line 58)
