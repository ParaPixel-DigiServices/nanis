# **CONTACTS TABLE — IMPLEMENTATION PLAN**

---

## **1. Purpose of This Document**

This document defines the **implementation plan** for the `contacts` table in a multi-tenant SaaS using Supabase with Row Level Security (RLS).

The plan covers:

* Conceptual table design
* Data integrity rules
* RLS policy logic
* API-level behavior patterns
* Deduplication strategy
* Soft delete implementation
* Future compatibility considerations

**Note:** This document describes **conceptual design and behavior**, not SQL implementation details.

---

## **2. Table Design Overview**

### **2.1 Core Purpose**

The `contacts` table stores normalized contact records for a multi-tenant SaaS platform, with:
* Organization-based tenant isolation
* Optional email with case-insensitive uniqueness per organization
* Optional mobile (not unique)
* Source tracking for audit trail
* Soft delete support
* Compatibility with imports and custom fields

### **2.2 Table Structure (Conceptual)**

```
contacts
├── id (UUID, Primary Key)
├── organization_id (UUID, Foreign Key → organizations.id)
├── email (TEXT, nullable)
├── first_name (TEXT, nullable)
├── last_name (TEXT, nullable)
├── mobile (TEXT, nullable)
├── source (ENUM: manual, csv, excel, mailchimp)
├── source_import_job_id (UUID, nullable, Foreign Key → import_jobs.id)
├── source_import_record_id (UUID, nullable, Foreign Key → import_records.id)
├── is_active (BOOLEAN, default: true)
├── is_subscribed (BOOLEAN, default: true)
├── deleted_at (TIMESTAMPTZ, nullable)
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ)
└── created_by (UUID, nullable, Foreign Key → profiles.id)

Future Extension (Conceptual):
└── created_via (ENUM: user, import, system) - For future automation/AI/webhook imports
```

**Note:** `created_via` is a conceptual field for future extensibility. Not included in MVP schema but architecture anticipates it for:
* Distinguishing user-created vs system-created contacts
* Automation-generated contacts
* AI enrichment processes
* Webhook imports from external systems

---

## **3. Data Rules & Constraints**

### **3.1 Multi-Tenant Isolation**

**Rule:** All contacts must belong to an organization

**Enforcement:**
* `organization_id` is required (NOT NULL)
* Foreign key constraint to `organizations.id`
* All queries must filter by `organization_id` first
* RLS policies enforce organization-level access

**API Behavior:**
* API endpoints require `organization_id` in request context
* Cannot create contact without valid `organization_id`
* Cannot query contacts across organizations

---

### **3.2 Email Uniqueness (Case-Insensitive, Active Contacts Only)**

**Rule:** Email must be unique per organization for active contacts only, case-insensitive

**Enforcement:**
* Partial unique index on `(organization_id, LOWER(email))` WHERE `email IS NOT NULL AND is_active = true AND deleted_at IS NULL`
* Allows multiple NULL emails per organization
* Case-insensitive comparison (e.g., "John@Example.com" = "john@example.com")
* **Critical:** Uniqueness applies only to active contacts (not deleted ones)

**API Behavior:**
* Before insert/update: Normalize email to lowercase
* Check for existing **active** contact with same `organization_id` + lowercase email
* Return error if duplicate email found in active contacts (unless merge strategy)
* Email can be NULL (contacts without email allowed)
* **Deleted contacts do not block email reuse** - allows better UX for re-adding deleted contacts

**Deduplication Logic:**
```
1. Normalize email: email = LOWER(trim(email))
2. Check only ACTIVE contacts:
   SELECT * FROM contacts 
   WHERE organization_id = ? 
   AND LOWER(email) = LOWER(?) 
   AND email IS NOT NULL
   AND is_active = true
   AND deleted_at IS NULL
3. If found: Apply deduplication strategy (skip/merge/create)
4. If not found (or only deleted contacts found): Allow creation
```

**Email Reuse Behavior:**
* If contact is deleted → email can be reused for new contact
* If deleted contact is restored → conflict check happens (may conflict with new contact using same email)
* This prevents weird UX where deleted emails are permanently locked

---

### **3.3 Mobile Field Rules**

**Rule:** Mobile is optional and NOT unique

**Enforcement:**
* `mobile` is nullable
* No unique constraint on mobile
* Indexed for lookup performance (not uniqueness)

**API Behavior:**
* Mobile can be NULL
* Multiple contacts can have same mobile in same organization
* Mobile used for lookup/search, not deduplication
* Mobile format validation at application level (optional)

**Deduplication Logic:**
* Mobile is NOT used for primary deduplication
* Mobile can be used as secondary lookup if email not provided
* Mobile matching is informational only (does not prevent duplicates)

---

### **3.4 Source Tracking**

**Rule:** Every contact tracks its origin

**Enforcement:**
* `source` is required (ENUM: `manual`, `csv`, `excel`, `mailchimp`)
* `source_import_job_id` is nullable (only set for imports)
* `source_import_record_id` is nullable (only set for imports)

**API Behavior:**
* Manual creation: `source = 'manual'`, import IDs = NULL
* CSV/Excel import: `source = 'csv'/'excel'`, import IDs set
* Mailchimp import: `source = 'mailchimp'`, import IDs set
* Cannot change `source` after creation (immutable)
* Can query contacts by source for analytics

**Future Extension (Conceptual):**
* Consider adding `created_via` field (ENUM: `user`, `import`, `system`) in future phases
* `created_via` would distinguish:
  * `user` - Created by user via UI
  * `import` - Created via CSV/Excel/Mailchimp import
  * `system` - Created by automation, AI enrichment, webhooks, or system processes
* This provides finer granularity than `source` alone
* Not required for MVP, but architecture should anticipate this distinction

---

### **3.5 Soft Delete Support**

**Rule:** Contacts are soft-deleted, not hard-deleted

**Enforcement:**
* `is_active` boolean flag (default: true)
* `deleted_at` timestamp (nullable, set on deletion)
* Both fields used together for soft delete

**API Behavior:**
* Delete operation: Set `is_active = false`, `deleted_at = NOW()`
* Queries filter by `is_active = true` AND `deleted_at IS NULL` by default
* Can query deleted contacts with explicit filter
* Cannot create contact with same email if deleted contact exists (unless restore)
* Restore operation: Set `is_active = true`, `deleted_at = NULL`

**Soft Delete Logic:**
```
Default query filter:
WHERE organization_id = ? 
AND is_active = true 
AND deleted_at IS NULL

Delete operation:
UPDATE contacts 
SET is_active = false, deleted_at = NOW() 
WHERE id = ? AND organization_id = ?

Restore operation:
UPDATE contacts 
SET is_active = true, deleted_at = NULL 
WHERE id = ? AND organization_id = ?
```

---

### **3.6 Subscription Status**

**Rule:** Track email subscription status

**Enforcement:**
* `is_subscribed` boolean (default: true)
* Can be updated independently of contact data
* Used for campaign targeting

**API Behavior:**
* Default: `is_subscribed = true` on creation
* Can update subscription status without updating contact
* Campaign queries filter by `is_subscribed = true`
* Unsubscribe sets `is_subscribed = false` (contact remains active)

---

### **3.7 Timestamps**

**Rule:** Automatic timestamp management

**Enforcement:**
* `created_at` set on insert (immutable)
* `updated_at` updated on every update
* `deleted_at` set on soft delete (immutable after set)

**API Behavior:**
* `created_at` cannot be modified
* `updated_at` automatically updated by database trigger
* `deleted_at` set once, cannot be modified (use restore to clear)

---

## **4. Deduplication Strategy**

### **4.1 Primary Deduplication Rule**

**Rule:** One **active** contact per email per organization (case-insensitive)

**Logic:**
```
1. Normalize email: email = LOWER(TRIM(email))
2. Check existing ACTIVE contacts only: 
   SELECT id FROM contacts 
   WHERE organization_id = ? 
   AND LOWER(email) = ? 
   AND email IS NOT NULL
   AND is_active = true
   AND deleted_at IS NULL
3. If found: Apply deduplication strategy
4. If not found (or only deleted contacts): Create new contact
```

**Important:** Email uniqueness applies only to active contacts. Deleted contacts do not block email reuse, allowing better UX for re-adding contacts that were previously deleted.

### **4.2 Deduplication Strategies**

**Strategy A: Skip (Default)**
* If duplicate found: Skip creation, increment duplicate counter
* Return: `{ skipped: true, reason: 'duplicate_email' }`
* Use case: Import operations where duplicates should be ignored

**Strategy B: Merge**
* If duplicate found: Update existing contact with new data
* Merge logic: Non-null fields from new data overwrite existing
* Return: `{ merged: true, contact_id: existing_id }`
* Use case: Import operations where new data should update existing

**Strategy C: Create Duplicate**
* If duplicate found: Create new contact anyway
* Return: `{ created: true, contact_id: new_id }`
* Use case: Explicitly allow duplicates (rare, requires explicit flag)

**Strategy Selection:**
* Stored in `import_jobs.settings.deduplication_strategy` for imports
* Default: "skip" for imports, "error" for manual creation
* Manual creation always errors on duplicate (no auto-merge)

### **4.3 Secondary Lookup (Mobile)**

**Rule:** Mobile used for lookup only, not deduplication

**Logic:**
```
If email is NULL:
  1. Use mobile for search/lookup
  2. Do NOT enforce uniqueness on mobile
  3. Multiple contacts can have same mobile
  4. Mobile matching is informational only
```

---

## **5. Row Level Security (RLS) Logic**

### **5.1 RLS Policy: `contacts_select_member`**

**Purpose:** Users can read contacts only in their organization

**Logic:**
```
1. Check if user is member of contact's organization:
   EXISTS (
     SELECT 1 FROM organization_members
     WHERE organization_id = contacts.organization_id
     AND user_id = auth.uid()
   )
2. Filter soft-deleted contacts (optional, can be in application layer):
   AND (is_active = true AND deleted_at IS NULL)
```

**API Behavior:**
* Users can only query contacts in organizations they belong to
* Cannot see contacts from other organizations
* Soft-deleted contacts excluded by default (can be included with explicit filter)

---

### **5.2 RLS Policy: `contacts_insert_member`**

**Purpose:** Users can create contacts only in their organization

**Logic:**
```
1. Verify user is member of target organization:
   EXISTS (
     SELECT 1 FROM organization_members
     WHERE organization_id = contacts.organization_id
     AND user_id = auth.uid()
   )
2. Ensure organization_id matches user's membership
3. Set created_by = auth.uid() automatically
```

**API Behavior:**
* User must be member of organization to create contact
* `organization_id` must match user's organization membership
* `created_by` automatically set to current user
* Cannot create contact in organization user doesn't belong to

---

### **5.3 RLS Policy: `contacts_update_member`**

**Purpose:** Users can update contacts only in their organization

**Logic:**
```
1. Verify user is member of contact's organization:
   EXISTS (
     SELECT 1 FROM organization_members
     WHERE organization_id = contacts.organization_id
     AND user_id = auth.uid()
   )
2. Prevent changing organization_id (immutable):
   WITH CHECK (organization_id = contacts.organization_id)
3. Prevent changing source (immutable):
   WITH CHECK (source = contacts.source)
```

**API Behavior:**
* Users can update contacts in their organization
* Cannot change `organization_id` (immutable)
* Cannot change `source` (immutable)
* Cannot change `created_at` (immutable)
* `updated_at` automatically updated
* Email uniqueness checked before update

---

### **5.4 RLS Policy: `contacts_delete_member` (Soft Delete)**

**Purpose:** Users can soft-delete contacts in their organization

**Logic:**
```
1. Verify user is member of contact's organization:
   EXISTS (
     SELECT 1 FROM organization_members
     WHERE organization_id = contacts.organization_id
     AND user_id = auth.uid()
   )
2. Soft delete: Set is_active = false, deleted_at = NOW()
3. No hard delete policy (RLS prevents DELETE operations)
```

**API Behavior:**
* DELETE operation performs soft delete (UPDATE)
* Sets `is_active = false` and `deleted_at = NOW()`
* Contact data preserved for audit/recovery
* Cannot hard delete via API (RLS blocks DELETE)

---

## **6. API-Level Behavior Patterns**

### **6.1 Create Contact (Manual)**

**Request:**
```
POST /api/contacts
{
  organization_id: "uuid",
  email: "john@example.com",
  first_name: "John",
  last_name: "Doe",
  mobile: "+1234567890",
  is_subscribed: true
}
```

**Behavior:**
1. **Validate organization membership**: User must be member of `organization_id`
2. **Normalize email**: Convert to lowercase, trim whitespace
3. **Check duplicate**: Query for existing **active** contact with same `organization_id` + email
   - Only check contacts where `is_active = true AND deleted_at IS NULL`
   - Deleted contacts do not block email reuse
4. **If duplicate (active contact)**: Return error `409 Conflict: "Contact with this email already exists"`
5. **If not duplicate (or only deleted contacts)**: Create contact with:
   - `source = 'manual'`
   - `source_import_job_id = NULL`
   - `source_import_record_id = NULL`
   - `created_by = current_user_id`
   - `is_active = true`
   - `is_subscribed = provided or default true`
6. **Return**: Created contact object

**Error Cases:**
* User not member of organization → `403 Forbidden`
* Duplicate email (in active contact) → `409 Conflict`
* Invalid organization_id → `400 Bad Request`

---

### **6.2 Update Contact**

**Request:**
```
PATCH /api/contacts/:id
{
  first_name: "Jane",
  email: "jane@example.com"
}
```

**Behavior:**
1. **Validate access**: User must be member of contact's organization
2. **Check contact exists**: Query contact by id + organization_id
3. **If email changed**: 
   - Normalize new email
   - Check for duplicate (excluding current contact)
   - If duplicate: Return error `409 Conflict`
4. **Update fields**: Only update provided fields
5. **Immutable fields**: Cannot change `organization_id`, `source`, `created_at`
6. **Auto-update**: `updated_at` set automatically
7. **Return**: Updated contact object

**Error Cases:**
* Contact not found → `404 Not Found`
* User not member → `403 Forbidden`
* Duplicate email → `409 Conflict`
* Attempt to change immutable field → `400 Bad Request`

---

### **6.3 Delete Contact (Soft Delete)**

**Request:**
```
DELETE /api/contacts/:id
```

**Behavior:**
1. **Validate access**: User must be member of contact's organization
2. **Check contact exists**: Query contact by id + organization_id
3. **Soft delete**: Update contact:
   - `is_active = false`
   - `deleted_at = NOW()`
4. **Preserve data**: All other fields unchanged
5. **Return**: `204 No Content` or deleted contact object

**Error Cases:**
* Contact not found → `404 Not Found`
* User not member → `403 Forbidden`
* Contact already deleted → `410 Gone` (optional)

---

### **6.4 List Contacts**

**Request:**
```
GET /api/contacts?organization_id=uuid&page=1&limit=50&is_active=true
```

**Behavior:**
1. **Validate organization membership**: User must be member of `organization_id`
2. **Default filters**: 
   - `organization_id = provided`
   - `is_active = true` (unless `include_deleted=true`)
   - `deleted_at IS NULL` (unless `include_deleted=true`)
3. **Pagination**: Apply LIMIT/OFFSET or cursor-based pagination
4. **Sorting**: Default by `created_at DESC`
5. **Return**: Paginated list of contacts

**Query Parameters:**
* `organization_id` (required)
* `page`, `limit` (pagination)
* `is_active` (filter active/inactive)
* `include_deleted` (include soft-deleted contacts)
* `source` (filter by source)
* `is_subscribed` (filter by subscription status)
* `search` (search by name/email/mobile)

---

### **6.5 Get Contact by ID**

**Request:**
```
GET /api/contacts/:id
```

**Behavior:**
1. **Validate access**: User must be member of contact's organization
2. **Query contact**: Select by id + organization_id
3. **Default filter**: Exclude soft-deleted (`is_active = true`)
4. **Return**: Contact object with custom fields (if requested)

**Error Cases:**
* Contact not found → `404 Not Found`
* User not member → `403 Forbidden`

---

### **6.6 Import Contact (CSV/Excel/Mailchimp)**

**Request:**
```
POST /api/contacts/import
{
  import_job_id: "uuid",
  contact_data: { email, first_name, ... }
}
```

**Behavior:**
1. **Validate import job**: Check `import_job_id` belongs to user's organization
2. **Normalize email**: Convert to lowercase
3. **Check duplicate**: Query for existing contact
4. **Apply deduplication strategy**: From `import_jobs.settings.deduplication_strategy`
   - "skip": Return `{ skipped: true }`
   - "merge": Update existing, return `{ merged: true }`
   - "create": Create new, return `{ created: true }`
5. **Set source**: `source = import_type` from import_job
6. **Set import references**: `source_import_job_id`, `source_import_record_id`
7. **Return**: Result object with contact_id or skip reason

---

## **7. Data Validation Rules**

### **7.1 Email Validation**

**Rule:** Email must be valid format (if provided)

**Validation:**
* Format: Standard email regex pattern
* Case-insensitive: Convert to lowercase before storage
* Trim whitespace: Remove leading/trailing spaces
* Can be NULL: Contacts without email allowed

**API Behavior:**
* Validate email format before insert/update
* Return `400 Bad Request` if invalid format
* Normalize to lowercase before database operation

---

### **7.2 Mobile Validation**

**Rule:** Mobile format validation (optional, if provided)

**Validation:**
* Format: Flexible (international formats supported)
* Trim whitespace: Remove leading/trailing spaces
* Can be NULL: Contacts without mobile allowed
* Not unique: Multiple contacts can have same mobile

**API Behavior:**
* Optional format validation (can be strict or lenient)
* Normalize format if validation passes
* Return `400 Bad Request` if invalid format (if validation enabled)

---

### **7.3 Required Fields**

**Rule:** Minimum data required for contact

**Required:**
* `organization_id` (always required)
* At least one of: `email` OR `mobile` (at least one identifier)

**API Behavior:**
* Return `400 Bad Request` if both email and mobile are NULL
* Return `400 Bad Request` if organization_id missing

---

## **8. Soft Delete Implementation**

### **8.1 Delete Operation**

**Behavior:**
```
1. Validate user access
2. Update contact:
   - is_active = false
   - deleted_at = NOW()
3. Preserve all other data
4. Return success
```

**Cascade Behavior:**
* Custom field values: Preserved (linked via contact_id)
* Import records: Preserved (historical data)
* Future: Campaign history preserved (when implemented)

---

### **8.2 Restore Operation**

**Behavior:**
```
1. Validate user access
2. Check if contact exists and is deleted
3. Update contact:
   - is_active = true
   - deleted_at = NULL
4. Return restored contact
```

**Deduplication on Restore:**
* Before restore: Check if email conflicts with existing active contact
* If restored contact's email conflicts with active contact:
  * Return error: `409 Conflict: "Cannot restore: Email already in use by another contact"`
* If no conflict: Allow restore
* **Email uniqueness applies only to active contacts**, so restore can proceed if email is available

---

### **8.3 Query Behavior**

**Default Queries:**
* Filter: `is_active = true AND deleted_at IS NULL`
* Exclude soft-deleted contacts from normal queries

**Include Deleted:**
* Query parameter: `include_deleted=true`
* Filter: No `is_active`/`deleted_at` filter
* Use case: Admin views, audit trails, restore operations

---

## **9. Future Compatibility**

### **9.1 Custom Fields Integration**

**Compatibility:**
* `contacts.id` used as foreign key in `contact_custom_field_values`
* No schema changes needed for custom fields
* EAV pattern works with existing contact structure

**API Behavior:**
* Create contact: Can include custom field values in same request
* Update contact: Can update custom fields independently
* Get contact: Include custom fields in response (optional)

---

### **9.2 Import System Integration**

**Compatibility:**
* `source_import_job_id` links to `import_jobs` table
* `source_import_record_id` links to `import_records` table
* Source tracking enables import audit trail

**API Behavior:**
* Import operations set source and import IDs
* Can query contacts by import job
* Can trace contact back to original import data

---

### **9.3 Campaign Integration (Future)**

**Compatibility:**
* `contacts.id` will be foreign key in `campaign_recipients` table
* `is_subscribed` field ready for campaign filtering
* No schema changes needed for basic campaign sending

**API Behavior:**
* Campaign queries filter by `is_subscribed = true`
* Campaign targeting uses `contact_id` references
* Engagement tracking will use separate table (Phase 3)

---

### **9.4 Automation Integration (Future)**

**Compatibility:**
* `contacts.id` will be foreign key in `contact_events` table
* Custom fields accessible via EAV pattern for automation conditions
* `is_active` and `is_subscribed` available for automation triggers
* Future `created_via` field would enable automation-created contacts

**API Behavior:**
* Automation triggers can query contacts by standard fields
* Custom field conditions require EAV JOINs (performance acceptable for MVP)
* No schema changes needed for automation system
* Automation-created contacts would use `created_via = 'system'` (future)

---

## **10. Index Strategy**

### **10.1 Required Indexes**

**Primary Indexes:**
* `(organization_id, LOWER(email))` - Unique, partial (WHERE email IS NOT NULL AND is_active = true AND deleted_at IS NULL)
  - **Critical:** Uniqueness applies only to active contacts, allowing email reuse after deletion
* `(organization_id, mobile)` - Non-unique, for lookups
* `(organization_id, is_active, deleted_at)` - For active contact queries
* `(organization_id, source)` - For source-based queries
* `(organization_id, created_at)` - For chronological queries

**Performance Indexes:**
* `(organization_id, is_subscribed)` - For campaign targeting
* `(source_import_job_id)` - For import job lookups
* Partial: `(organization_id, created_at) WHERE is_active = true`

---

## **11. Error Handling Patterns**

### **11.1 Duplicate Email Error**

**Scenario:** Attempt to create contact with existing email

**Response:**
```
Status: 409 Conflict
Body: {
  error: "duplicate_email",
  message: "A contact with this email already exists in your organization",
  existing_contact_id: "uuid"
}
```

---

### **11.2 Organization Access Error**

**Scenario:** User not member of organization

**Response:**
```
Status: 403 Forbidden
Body: {
  error: "organization_access_denied",
  message: "You do not have access to this organization"
}
```

---

### **11.3 Contact Not Found Error**

**Scenario:** Contact doesn't exist or user can't access

**Response:**
```
Status: 404 Not Found
Body: {
  error: "contact_not_found",
  message: "Contact not found or you do not have access"
}
```

---

## **12. Implementation Checklist**

### **12.1 Database Setup**

- [ ] Create `contacts` table with all fields
- [ ] Add foreign key constraints
- [ ] Create partial unique index for email (case-insensitive)
- [ ] Create performance indexes
- [ ] Add `updated_at` trigger
- [ ] Enable RLS on table

### **12.2 RLS Policies**

- [ ] `contacts_select_member` - Read contacts in organization
- [ ] `contacts_insert_member` - Create contacts in organization
- [ ] `contacts_update_member` - Update contacts in organization
- [ ] No DELETE policy (soft delete only)

### **12.3 API Implementation**

- [ ] Create contact endpoint (with deduplication)
- [ ] Update contact endpoint (with email uniqueness check)
- [ ] Delete contact endpoint (soft delete)
- [ ] List contacts endpoint (with pagination and filters)
- [ ] Get contact endpoint
- [ ] Email normalization logic
- [ ] Deduplication strategy implementation

### **12.4 Validation**

- [ ] Email format validation
- [ ] Mobile format validation (optional)
- [ ] Required fields validation
- [ ] Organization membership validation

---

## **13. Status**

✅ **Contacts table implementation plan is complete and ready for development.**

This plan provides a comprehensive guide for implementing the contacts table with multi-tenant isolation, RLS, and all required features.

---

## **14. Related Documents**

* `Docs/Contacts/contacts-schema-mvp.md` - MVP schema design
* `Docs/Contacts/contacts-schema-mvp-evaluation.md` - Schema evaluation
* `Docs/Database/rls.md` - RLS strategy documentation
* `schema-auth-tables.sql` - Reference implementation for auth tables

---
