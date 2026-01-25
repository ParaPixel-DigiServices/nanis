# **NORMALIZED DATA MODEL**
## Extracted from Codebase

This document contains all data models, types, interfaces, DTOs, and database assumptions extracted from the codebase.

---

## **1. CONTACTS**

### **Entity: `contacts`**

**Purpose:** Stores normalized contact records with core standard fields.

**Fields:**

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `id` | UUID | ✅ | Primary Key | Auto-generated |
| `organization_id` | UUID | ✅ | Foreign Key → `organizations.id` | Multi-tenant boundary |
| `email` | TEXT | ❌ | Nullable, indexed | Case-insensitive for deduplication |
| `first_name` | TEXT | ❌ | Nullable | Trimmed on import |
| `last_name` | TEXT | ❌ | Nullable | Trimmed on import |
| `mobile` | TEXT | ❌ | Nullable, indexed | Phone number |
| `source` | ENUM | ✅ | See SourceEnum | Tracks origin |
| `source_import_job_id` | UUID | ❌ | Foreign Key → `import_jobs.id` | Nullable for manual contacts |
| `source_import_record_id` | UUID | ❌ | Foreign Key → `import_records.id` | Nullable for manual contacts |
| `is_active` | BOOLEAN | ✅ | Default: `true` | Soft delete flag |
| `is_subscribed` | BOOLEAN | ✅ | Default: `true` | Email subscription status |
| `deleted_at` | TIMESTAMPTZ | ❌ | Nullable | Soft delete timestamp |
| `created_at` | TIMESTAMPTZ | ✅ | Auto-set | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | ✅ | Auto-updated | Last update timestamp |
| `created_by` | UUID | ❌ | Foreign Key → `profiles.id` | User who created contact |

**Enums:**

```typescript
type ContactSource = 
  | "manual"           // Created via UI
  | "excel_copy_paste" // Excel copy-paste import
  | "csv_upload"      // CSV file upload
  | "xlsx_upload"      // XLSX file upload
  | "mailchimp_import" // Mailchimp sync
```

**Implicit Constraints:**

- **Unique Constraint:** `(organization_id, email)` - Composite unique index for deduplication
- **Validation:** At least one of `email` or `mobile` must exist
- **Email Normalization:** Email stored in lowercase
- **Soft Delete:** `is_active = false` OR `deleted_at IS NOT NULL` indicates soft-deleted contact
- **RLS:** All queries filtered by `organization_id`

**Relationships:**

- **Many-to-One:** `organizations` (tenant boundary)
- **Many-to-One:** `import_jobs` (via `source_import_job_id`)
- **Many-to-One:** `import_records` (via `source_import_record_id`)
- **Many-to-One:** `profiles` (via `created_by`)
- **One-to-Many:** `contact_custom_field_values`
- **One-to-Many:** `segment_memberships` (future)
- **One-to-Many:** Campaign recipients (future)

**Indexes (Inferred):**

- `(organization_id, email)` - Unique composite index
- `(organization_id, mobile)` - For mobile lookups
- `(organization_id, source)` - For filtering by source
- `(organization_id, created_at)` - For chronological queries
- `(organization_id, is_active)` - For active contact queries
- `source_import_job_id` - For import job lookups

---

## **2. CUSTOM FIELDS**

### **Entity: `contact_custom_field_definitions`**

**Purpose:** Defines custom fields that an organization can add to their contacts.

**Fields:**

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `id` | UUID | ✅ | Primary Key | Auto-generated |
| `organization_id` | UUID | ✅ | Foreign Key → `organizations.id` | Multi-tenant boundary |
| `field_name` | TEXT | ✅ | Unique per organization | Internal identifier |
| `field_type` | ENUM | ✅ | See FieldTypeEnum | Field data type |
| `display_label` | TEXT | ✅ | User-friendly label | Shown in UI |
| `is_required` | BOOLEAN | ✅ | Default: `false` | Validation rule |
| `default_value` | TEXT | ❌ | Nullable, JSON for complex types | Default value |
| `options` | JSONB | ❌ | Nullable | For select/multiselect fields |
| `validation_rules` | JSONB | ❌ | Nullable | Min/max length, regex patterns |
| `display_order` | INTEGER | ❌ | Nullable | UI ordering |
| `is_active` | BOOLEAN | ✅ | Default: `true` | Soft delete flag |
| `created_at` | TIMESTAMPTZ | ✅ | Auto-set | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | ✅ | Auto-updated | Last update timestamp |
| `created_by` | UUID | ✅ | Foreign Key → `profiles.id` | User who created field |

**Enums:**

```typescript
type CustomFieldType = 
  | "text"        // Text input
  | "number"      // Numeric input
  | "date"        // Date picker
  | "boolean"     // Checkbox
  | "select"      // Single select dropdown
  | "multiselect" // Multiple select
```

**Implicit Constraints:**

- **Unique Constraint:** `(organization_id, field_name)` - Composite unique index
- **Auto-creation:** Custom fields auto-created during import if not exist (as "text" type)
- **RLS:** All queries filtered by `organization_id`

**Relationships:**

- **Many-to-One:** `organizations` (tenant boundary)
- **Many-to-One:** `profiles` (via `created_by`)
- **One-to-Many:** `contact_custom_field_values`

**Indexes (Inferred):**

- `(organization_id, field_name)` - Unique composite index
- `(organization_id, is_active)` - For active field queries
- `(organization_id, display_order)` - For ordered field queries

---

### **Entity: `contact_custom_field_values`**

**Purpose:** Stores values for custom fields per contact (EAV pattern).

**Fields:**

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `id` | UUID | ✅ | Primary Key | Auto-generated |
| `contact_id` | UUID | ✅ | Foreign Key → `contacts.id` | ON DELETE CASCADE |
| `field_definition_id` | UUID | ✅ | Foreign Key → `contact_custom_field_definitions.id` | Field definition reference |
| `value_text` | TEXT | ❌ | Nullable | For text/select fields |
| `value_number` | NUMERIC | ❌ | Nullable | For number fields |
| `value_date` | DATE | ❌ | Nullable | For date fields |
| `value_boolean` | BOOLEAN | ❌ | Nullable | For boolean fields |
| `value_json` | JSONB | ❌ | Nullable | For multiselect/complex data |
| `created_at` | TIMESTAMPTZ | ✅ | Auto-set | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | ✅ | Auto-updated | Last update timestamp |

**Implicit Constraints:**

- **Unique Constraint:** `(contact_id, field_definition_id)` - One value per field per contact
- **Value Storage:** Only one value column should be non-null based on field type
- **Cascade Delete:** Deleted when contact is deleted

**Relationships:**

- **Many-to-One:** `contacts` (which contact this value belongs to)
- **Many-to-One:** `contact_custom_field_definitions` (which field definition)

**Indexes (Inferred):**

- `(contact_id, field_definition_id)` - Unique composite index
- `contact_id` - For contact lookups
- `(field_definition_id, value_text)` - For filtering contacts by custom field value
- `(field_definition_id, value_number)` - For numeric field queries

---

## **3. IMPORTS**

### **Entity: `import_jobs`**

**Purpose:** Tracks import operations (CSV, Excel, Mailchimp).

**Fields:**

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `id` | UUID | ✅ | Primary Key | Auto-generated |
| `organization_id` | UUID | ✅ | Foreign Key → `organizations.id` | Multi-tenant boundary |
| `import_type` | ENUM | ✅ | See ImportTypeEnum | Type of import |
| `status` | ENUM | ✅ | See ImportStatusEnum | Current status |
| `file_name` | TEXT | ❌ | Nullable | Original file name for CSV/Excel |
| `file_size_bytes` | BIGINT | ❌ | Nullable | File size |
| `mailchimp_list_id` | TEXT | ❌ | Nullable | For Mailchimp imports |
| `mailchimp_list_name` | TEXT | ❌ | Nullable | Mailchimp list name |
| `total_records` | INTEGER | ✅ | Default: 0 | Total records in import |
| `processed_records` | INTEGER | ✅ | Default: 0 | Records processed so far |
| `successful_records` | INTEGER | ✅ | Default: 0 | Successfully imported |
| `failed_records` | INTEGER | ✅ | Default: 0 | Failed imports |
| `duplicate_records` | INTEGER | ✅ | Default: 0 | Duplicate contacts skipped |
| `column_mapping` | JSONB | ❌ | Nullable | Maps import columns to contact fields |
| `settings` | JSONB | ❌ | Nullable | Import-specific settings |
| `error_summary` | TEXT | ❌ | Nullable | High-level error message |
| `started_at` | TIMESTAMPTZ | ❌ | Nullable | Processing start time |
| `completed_at` | TIMESTAMPTZ | ❌ | Nullable | Processing completion time |
| `created_at` | TIMESTAMPTZ | ✅ | Auto-set | Creation timestamp |
| `created_by` | UUID | ✅ | Foreign Key → `profiles.id` | User who initiated import |

**Enums:**

```typescript
type ImportType = 
  | "csv"
  | "excel"
  | "mailchimp"

type ImportStatus = 
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "partially_completed"
```

**Implicit Constraints:**

- **RLS:** All queries filtered by `organization_id`
- **Status Flow:** `pending` → `processing` → `completed`/`failed`/`partially_completed`

**Relationships:**

- **Many-to-One:** `organizations` (tenant boundary)
- **Many-to-One:** `profiles` (via `created_by`)
- **One-to-Many:** `import_records` (raw records in this import)
- **One-to-Many:** `contacts` (contacts created by this import)
- **One-to-Many:** `import_errors` (errors encountered during import)

**Indexes (Inferred):**

- `(organization_id, status)` - For filtering imports by status
- `(organization_id, created_at)` - For chronological import history
- `(organization_id, import_type)` - For filtering by import type
- `(status, created_at)` - For processing queue queries

---

### **Entity: `import_records`**

**Purpose:** Stores raw imported data before normalization (for debugging and reprocessing).

**Fields:**

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `id` | UUID | ✅ | Primary Key | Auto-generated |
| `import_job_id` | UUID | ✅ | Foreign Key → `import_jobs.id` | ON DELETE CASCADE |
| `organization_id` | UUID | ✅ | Foreign Key → `organizations.id` | Multi-tenant boundary |
| `row_number` | INTEGER | ✅ | Original row number in import file | For ordering |
| `raw_data` | JSONB | ✅ | Complete raw row data as imported | Preserved for debugging |
| `status` | ENUM | ✅ | See ImportRecordStatusEnum | Processing status |
| `contact_id` | UUID | ❌ | Foreign Key → `contacts.id` | If successfully created |
| `error_message` | TEXT | ❌ | Nullable | Error if processing failed |
| `processing_notes` | TEXT | ❌ | Nullable | Additional processing information |
| `processed_at` | TIMESTAMPTZ | ❌ | Nullable | Processing timestamp |
| `created_at` | TIMESTAMPTZ | ✅ | Auto-set | Creation timestamp |

**Enums:**

```typescript
type ImportRecordStatus = 
  | "pending"
  | "processed"
  | "failed"
  | "skipped"
```

**Implicit Constraints:**

- **RLS:** All queries filtered by `organization_id`
- **Cascade Delete:** Deleted when import_job is deleted
- **Contact Link:** `contact_id` is set only when `status = "processed"`

**Relationships:**

- **Many-to-One:** `import_jobs` (which import job this record belongs to)
- **Many-to-One:** `organizations` (tenant boundary)
- **One-to-One:** `contacts` (if successfully processed)
- **One-to-Many:** `import_errors` (errors for this record)

**Indexes (Inferred):**

- `(import_job_id, row_number)` - For ordered record retrieval
- `(import_job_id, status)` - For filtering by processing status
- `(organization_id, created_at)` - For organization-level queries
- `contact_id` - For reverse lookup from contact to import record

---

### **Entity: `import_errors`**

**Purpose:** Stores detailed error information for failed import records.

**Fields:**

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `id` | UUID | ✅ | Primary Key | Auto-generated |
| `import_job_id` | UUID | ✅ | Foreign Key → `import_jobs.id` | ON DELETE CASCADE |
| `import_record_id` | UUID | ❌ | Foreign Key → `import_records.id` | Which record caused error |
| `organization_id` | UUID | ✅ | Foreign Key → `organizations.id` | Multi-tenant boundary |
| `error_type` | ENUM | ✅ | See ImportErrorTypeEnum | Error category |
| `error_code` | TEXT | ✅ | Machine-readable error code | For programmatic handling |
| `error_message` | TEXT | ✅ | Human-readable error message | For user display |
| `error_details` | JSONB | ❌ | Nullable | Additional error context |
| `field_name` | TEXT | ❌ | Nullable | Which field caused the error |
| `row_number` | INTEGER | ❌ | Nullable | Row number in import file |
| `created_at` | TIMESTAMPTZ | ✅ | Auto-set | Creation timestamp |

**Enums:**

```typescript
type ImportErrorType = 
  | "validation"     // Data validation failed
  | "duplicate"      // Duplicate contact detected
  | "format"         // Data format error
  | "system"         // System/database error
  | "custom_field"   // Custom field related error
```

**Implicit Constraints:**

- **RLS:** All queries filtered by `organization_id`
- **Cascade Delete:** Deleted when import_job is deleted

**Relationships:**

- **Many-to-One:** `import_jobs` (which import job this error belongs to)
- **Many-to-One:** `import_records` (which record caused the error)
- **Many-to-One:** `organizations` (tenant boundary)

**Indexes (Inferred):**

- `(import_job_id, error_type)` - For error categorization
- `(import_job_id, created_at)` - For chronological error tracking
- `(organization_id, error_type)` - For organization-level error analysis

---

## **4. SEGMENTS**

### **Entity: `segments`**

**Purpose:** Logical groupings of contacts for campaigns and automation.

**Fields:**

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `id` | UUID | ✅ | Primary Key | Auto-generated |
| `organization_id` | UUID | ✅ | Foreign Key → `organizations.id` | Multi-tenant boundary |
| `name` | TEXT | ✅ | Max 255 chars | Segment name |
| `description` | TEXT | ❌ | Max 1000 chars, nullable | Segment description |
| `type` | ENUM | ✅ | See SegmentTypeEnum | Segment type |
| `composition` | JSONB | ✅ | See SegmentComposition | Query or set operation |
| `consistency` | ENUM | ✅ | Default: "eventual" | Consistency level |
| `status` | ENUM | ✅ | See SegmentStatusEnum | Segment status |
| `membership_count` | INTEGER | ❌ | Nullable | Cached count (for static/materialized) |
| `last_evaluated_at` | TIMESTAMPTZ | ❌ | Nullable | Last evaluation timestamp |
| `materialization_refresh_interval_minutes` | INTEGER | ❌ | Nullable | For dynamic_materialized segments |
| `created_at` | TIMESTAMPTZ | ✅ | Auto-set | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | ✅ | Auto-updated | Last update timestamp |
| `created_by` | UUID | ✅ | Foreign Key → `profiles.id` | User who created segment |

**Enums:**

```typescript
type SegmentType = 
  | "static"              // Pre-computed membership list
  | "dynamic"             // Computed on-demand via query
  | "dynamic_materialized" // Cached dynamic query with periodic refresh

type SegmentConsistency = 
  | "strong"    // Always accurate (dynamic)
  | "eventual"  // Updated via batch/incremental
  | "lazy"      // Updated only when accessed

type SegmentStatus = 
  | "active"    // Active and usable
  | "archived"  // Archived but preserved
  | "draft"     // Draft, not yet active
```

**Segment Composition Structure:**

```typescript
type SegmentComposition = 
  | {
      type: "query"
      query: ContactQuery  // Reuses Contact Query Engine DSL
    }
  | {
      type: "union" | "intersection" | "difference"
      segments: UUID[]  // Array of segment IDs to combine
    }
```

**Implicit Constraints:**

- **RLS:** All queries filtered by `organization_id`
- **Composition Validation:** `composition.type = "query"` requires `query` field; set operations require `segments` array
- **Membership Count:** Only populated for `static` and `dynamic_materialized` types

**Relationships:**

- **Many-to-One:** `organizations` (tenant boundary)
- **Many-to-One:** `profiles` (via `created_by`)
- **One-to-Many:** `segment_memberships` (for static/materialized segments)
- **One-to-Many:** Campaigns (via segment targeting)

**Indexes (Inferred):**

- `(organization_id, status)` - For filtering by status
- `(organization_id, type)` - For filtering by type
- `(organization_id, created_at)` - For chronological queries

---

### **Entity: `segment_memberships`**

**Purpose:** Stores contact memberships for static and materialized segments.

**Fields:**

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `id` | UUID | ✅ | Primary Key | Auto-generated |
| `segment_id` | UUID | ✅ | Foreign Key → `segments.id` | ON DELETE CASCADE |
| `contact_id` | UUID | ✅ | Foreign Key → `contacts.id` | ON DELETE CASCADE |
| `organization_id` | UUID | ✅ | Foreign Key → `organizations.id` | Multi-tenant boundary |
| `added_at` | TIMESTAMPTZ | ✅ | Auto-set | When contact was added to segment |
| `created_at` | TIMESTAMPTZ | ✅ | Auto-set | Creation timestamp |

**Implicit Constraints:**

- **Unique Constraint:** `(segment_id, contact_id)` - One membership per contact per segment
- **Cascade Delete:** Deleted when segment or contact is deleted
- **RLS:** All queries filtered by `organization_id`
- **Usage:** Only used for `static` and `dynamic_materialized` segment types

**Relationships:**

- **Many-to-One:** `segments` (which segment)
- **Many-to-One:** `contacts` (which contact)
- **Many-to-One:** `organizations` (tenant boundary)

**Indexes (Inferred):**

- `(segment_id, contact_id)` - Unique composite index
- `contact_id` - For contact lookups
- `segment_id` - For segment member queries
- `(organization_id, segment_id)` - For organization-scoped queries

---

## **5. CAMPAIGNS**

### **Entity: `campaigns`** (Inferred from relationships)

**Purpose:** Represents email or messaging campaigns.

**Fields (Inferred from codebase references):**

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `id` | UUID | ✅ | Primary Key | Auto-generated |
| `organization_id` | UUID | ✅ | Foreign Key → `organizations.id` | Multi-tenant boundary |
| `name` | TEXT | ✅ | Campaign name | |
| `status` | ENUM | ✅ | Campaign status | `draft`, `scheduled`, `sending`, `sent`, `paused` |
| `segment_id` | UUID | ❌ | Foreign Key → `segments.id` | Target segment |
| `template_id` | UUID | ❌ | Foreign Key → `templates.id` | Email template |
| `scheduled_at` | TIMESTAMPTZ | ❌ | Nullable | When to send |
| `created_at` | TIMESTAMPTZ | ✅ | Auto-set | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | ✅ | Auto-updated | Last update timestamp |
| `created_by` | UUID | ✅ | Foreign Key → `profiles.id` | User who created campaign |

**Implicit Constraints:**

- **RLS:** All queries filtered by `organization_id`
- **Relationship:** References `segments` for targeting

**Relationships:**

- **Many-to-One:** `organizations` (tenant boundary)
- **Many-to-One:** `segments` (target segment)
- **Many-to-One:** `templates` (email template)
- **Many-to-One:** `profiles` (via `created_by`)
- **One-to-Many:** Campaign recipients (future)

---

### **Entity: `campaign_recipients`** (Inferred from relationships)

**Purpose:** Tracks which contacts received a campaign.

**Fields (Inferred from codebase references):**

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `id` | UUID | ✅ | Primary Key | Auto-generated |
| `campaign_id` | UUID | ✅ | Foreign Key → `campaigns.id` | ON DELETE CASCADE |
| `contact_id` | UUID | ✅ | Foreign Key → `contacts.id` | ON DELETE CASCADE |
| `organization_id` | UUID | ✅ | Foreign Key → `organizations.id` | Multi-tenant boundary |
| `status` | ENUM | ✅ | Delivery status | `pending`, `sent`, `delivered`, `bounced`, `opened`, `clicked` |
| `sent_at` | TIMESTAMPTZ | ❌ | Nullable | When email was sent |
| `delivered_at` | TIMESTAMPTZ | ❌ | Nullable | When email was delivered |
| `opened_at` | TIMESTAMPTZ | ❌ | Nullable | When email was opened |
| `clicked_at` | TIMESTAMPTZ | ❌ | Nullable | When link was clicked |
| `bounced_at` | TIMESTAMPTZ | ❌ | Nullable | When email bounced |
| `created_at` | TIMESTAMPTZ | ✅ | Auto-set | Creation timestamp |

**Implicit Constraints:**

- **Unique Constraint:** `(campaign_id, contact_id)` - One recipient record per contact per campaign
- **Cascade Delete:** Deleted when campaign or contact is deleted
- **RLS:** All queries filtered by `organization_id`

**Relationships:**

- **Many-to-One:** `campaigns` (which campaign)
- **Many-to-One:** `contacts` (which contact)
- **Many-to-One:** `organizations` (tenant boundary)

**Indexes (Inferred):**

- `(campaign_id, contact_id)` - Unique composite index
- `contact_id` - For contact campaign history
- `(campaign_id, status)` - For campaign analytics

---

## **6. TAGS/LISTS**

### **Entity: `contact_tags`** (Inferred from schema analysis)

**Purpose:** Normalized tag system for contacts (recommended but not yet implemented).

**Fields (Inferred from recommendations):**

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `id` | UUID | ✅ | Primary Key | Auto-generated |
| `organization_id` | UUID | ✅ | Foreign Key → `organizations.id` | Multi-tenant boundary |
| `name` | TEXT | ✅ | Unique per organization | Tag name |
| `color` | TEXT | ❌ | Nullable | UI color code |
| `created_at` | TIMESTAMPTZ | ✅ | Auto-set | Creation timestamp |
| `created_by` | UUID | ✅ | Foreign Key → `profiles.id` | User who created tag |

**Implicit Constraints:**

- **Unique Constraint:** `(organization_id, name)` - Unique tag name per organization
- **RLS:** All queries filtered by `organization_id`

**Relationships:**

- **Many-to-One:** `organizations` (tenant boundary)
- **Many-to-One:** `profiles` (via `created_by`)
- **One-to-Many:** `contact_tag_assignments`

---

### **Entity: `contact_tag_assignments`** (Inferred from schema analysis)

**Purpose:** Many-to-many relationship between contacts and tags.

**Fields (Inferred from recommendations):**

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `id` | UUID | ✅ | Primary Key | Auto-generated |
| `contact_id` | UUID | ✅ | Foreign Key → `contacts.id` | ON DELETE CASCADE |
| `tag_id` | UUID | ✅ | Foreign Key → `contact_tags.id` | ON DELETE CASCADE |
| `organization_id` | UUID | ✅ | Foreign Key → `organizations.id` | Multi-tenant boundary |
| `assigned_at` | TIMESTAMPTZ | ✅ | Auto-set | When tag was assigned |
| `assigned_by` | UUID | ❌ | Foreign Key → `profiles.id` | User who assigned tag |

**Implicit Constraints:**

- **Unique Constraint:** `(contact_id, tag_id)` - One assignment per contact-tag pair
- **Cascade Delete:** Deleted when contact or tag is deleted
- **RLS:** All queries filtered by `organization_id`

**Relationships:**

- **Many-to-One:** `contacts` (which contact)
- **Many-to-One:** `contact_tags` (which tag)
- **Many-to-One:** `organizations` (tenant boundary)
- **Many-to-One:** `profiles` (via `assigned_by`)

**Indexes (Inferred):**

- `(contact_id, tag_id)` - Unique composite index
- `tag_id` - For tag member queries
- `contact_id` - For contact tag queries

---

## **7. ORGANIZATIONS & AUTH**

### **Entity: `organizations`** (Referenced but not defined in codebase)

**Purpose:** Multi-tenant workspace boundary.

**Fields (Inferred from relationships):**

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `id` | UUID | ✅ | Primary Key | Referenced in all tenant tables |
| `name` | TEXT | ✅ | Organization name | |
| `created_at` | TIMESTAMPTZ | ✅ | Auto-set | Creation timestamp |

**Relationships:**

- **One-to-Many:** All tenant-scoped entities (contacts, segments, campaigns, etc.)

---

### **Entity: `organization_members`** (Referenced in code)

**Purpose:** Maps users to organizations with roles.

**Fields (Inferred from code usage):**

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `id` | UUID | ✅ | Primary Key | |
| `organization_id` | UUID | ✅ | Foreign Key → `organizations.id` | |
| `user_id` | UUID | ✅ | Foreign Key → `profiles.id` or `auth.users.id` | |
| `role` | ENUM | ✅ | User role in organization | `owner`, `admin`, `member`, `viewer` |
| `created_at` | TIMESTAMPTZ | ✅ | Auto-set | Creation timestamp |

**Implicit Constraints:**

- **Unique Constraint:** `(organization_id, user_id)` - One membership per user per org
- **RLS:** Users can only see their own memberships

**Relationships:**

- **Many-to-One:** `organizations`
- **Many-to-One:** `profiles` or `auth.users`

---

### **Entity: `profiles`** (Referenced in code)

**Purpose:** Application-level user metadata.

**Fields (Inferred from relationships):**

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `id` | UUID | ✅ | Primary Key | Linked 1:1 with auth.users.id |
| `full_name` | TEXT | ❌ | Nullable | User's full name |
| `created_at` | TIMESTAMPTZ | ✅ | Auto-set | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | ✅ | Auto-updated | Last update timestamp |

**Relationships:**

- **One-to-One:** `auth.users` (Supabase Auth)
- **One-to-Many:** All entities with `created_by` field

---

## **8. DATA FLOW ASSUMPTIONS**

### **Import Pipeline:**

1. **Normalization Rules:**
   - All strings trimmed
   - Email converted to lowercase
   - Empty strings → `null`
   - `full_name` split into `first_name` + `last_name` if only full_name exists
   - Unknown columns → `custom_fields`

2. **Deduplication Rules:**
   - Primary key: `(organization_id, email)`
   - If email exists:
     - Active contact → Skip (duplicate)
     - Soft-deleted contact → Restore and update
   - If no email but mobile exists → Allow duplicates

3. **Batch Processing:**
   - Batch size: 500 rows
   - Partial failures handled gracefully
   - Individual row retry on unique constraint violations

4. **Custom Fields:**
   - Auto-created if not exist (as "text" type)
   - Stored in `contact_custom_field_values` table
   - Uses `field_definition_id` reference

### **Query Patterns:**

1. **Contact List:**
   - Filtered by `organization_id`
   - Only `is_active = true` contacts
   - Search across `email`, `first_name`, `last_name`, `mobile`
   - Pagination: offset-based (page, limit)

2. **Custom Fields:**
   - Optional join via `include_custom_fields` parameter
   - Fetched separately and attached to contact objects

3. **Segments:**
   - Dynamic segments evaluated on-demand using Contact Query DSL
   - Static/materialized segments use `segment_memberships` table

---

## **9. ENUMS SUMMARY**

```typescript
// Contact Source
type ContactSource = 
  | "manual"
  | "excel_copy_paste"
  | "csv_upload"
  | "xlsx_upload"
  | "mailchimp_import"

// Custom Field Type
type CustomFieldType = 
  | "text"
  | "number"
  | "date"
  | "boolean"
  | "select"
  | "multiselect"

// Import Type
type ImportType = 
  | "csv"
  | "excel"
  | "mailchimp"

// Import Status
type ImportStatus = 
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "partially_completed"

// Import Record Status
type ImportRecordStatus = 
  | "pending"
  | "processed"
  | "failed"
  | "skipped"

// Import Error Type
type ImportErrorType = 
  | "validation"
  | "duplicate"
  | "format"
  | "system"
  | "custom_field"

// Segment Type
type SegmentType = 
  | "static"
  | "dynamic"
  | "dynamic_materialized"

// Segment Consistency
type SegmentConsistency = 
  | "strong"
  | "eventual"
  | "lazy"

// Segment Status
type SegmentStatus = 
  | "active"
  | "archived"
  | "draft"
```

---

## **10. CONSTRAINTS SUMMARY**

### **Unique Constraints:**

- `contacts`: `(organization_id, email)`
- `contact_custom_field_definitions`: `(organization_id, field_name)`
- `contact_custom_field_values`: `(contact_id, field_definition_id)`
- `segment_memberships`: `(segment_id, contact_id)`
- `contact_tag_assignments`: `(contact_id, tag_id)` (if implemented)
- `organization_members`: `(organization_id, user_id)`

### **Foreign Key Constraints:**

- All `organization_id` fields → `organizations.id`
- All `created_by` fields → `profiles.id`
- `contacts.source_import_job_id` → `import_jobs.id`
- `contacts.source_import_record_id` → `import_records.id`
- `contact_custom_field_values.contact_id` → `contacts.id` (ON DELETE CASCADE)
- `contact_custom_field_values.field_definition_id` → `contact_custom_field_definitions.id`
- `import_records.import_job_id` → `import_jobs.id` (ON DELETE CASCADE)
- `import_records.contact_id` → `contacts.id`
- `import_errors.import_job_id` → `import_jobs.id` (ON DELETE CASCADE)
- `segment_memberships.segment_id` → `segments.id` (ON DELETE CASCADE)
- `segment_memberships.contact_id` → `contacts.id` (ON DELETE CASCADE)

### **Validation Constraints:**

- Contacts: At least one of `email` or `mobile` must exist
- Email: Stored in lowercase
- Soft Delete: `is_active = false` OR `deleted_at IS NOT NULL`
- Custom Fields: Only one value column non-null per field type

---

## **11. RLS (Row Level Security) ASSUMPTIONS**

All tenant-scoped tables enforce RLS:

- Users can only access data in their organization
- All queries automatically filtered by `organization_id`
- Foreign key constraints ensure data integrity
- No cross-organization data leakage possible

---

**Document Status:** ✅ Complete - All data models extracted from codebase

**Last Updated:** Based on codebase scan as of current date
