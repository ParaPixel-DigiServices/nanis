# **CONTACTS SCHEMA — PHASE-1 MVP DESIGN**

---

## **1. Purpose of This Document**

This document defines the **Phase-1 MVP database schema** for the Contacts & CRM module, focusing on core functionality:

* Manual contact creation
* CSV import
* Excel copy-paste import
* Mailchimp import
* Custom fields per organization
* Multi-tenant organization-based model

**Excluded from MVP:**
* Automation support (events, automation states)
* Segmentation (segment memberships)
* Tags (normalized tag system)
* Analytics and engagement tracking
* Contact activities and history
* Email preferences (granular)

These features will be added in later phases as the platform matures.

---

## **2. Design Principles**

* **Minimal but extensible**: Core tables only, designed for future additions
* **Multi-tenant isolation**: All contacts scoped to organization
* **Import tracking**: Complete audit trail for all imports
* **Custom fields**: Flexible EAV pattern for organization-specific fields
* **Scalability**: Indexed for efficient queries, ready for growth

---

## **3. MVP Tables Overview**

The Phase-1 MVP schema consists of **6 core tables**:

1. **`contacts`** - Normalized contact records (simplified)
2. **`contact_custom_field_definitions`** - Custom field definitions per organization
3. **`contact_custom_field_values`** - Values for custom fields per contact
4. **`import_jobs`** - Import operation tracking
5. **`import_records`** - Raw imported data (before normalization)
6. **`import_errors`** - Errors encountered during import processing

---

## **4. Table: `contacts`**

### **4.1 Purpose**
Stores normalized contact records with core standard fields. This is the primary table for all contact operations.

### **4.2 Key Fields**

* **`id`** (UUID, Primary Key)
* **`organization_id`** (UUID, Foreign Key → `organizations.id`)
* **`email`** (TEXT, nullable, indexed)
* **`first_name`** (TEXT, nullable)
* **`last_name`** (TEXT, nullable)
* **`mobile`** (TEXT, nullable, indexed)
* **`source`** (ENUM: `manual`, `csv`, `excel`, `mailchimp`)
* **`source_import_job_id`** (UUID, nullable, Foreign Key → `import_jobs.id`)
* **`source_import_record_id`** (UUID, nullable, Foreign Key → `import_records.id`)
* **`is_active`** (BOOLEAN, default: true)
* **`is_subscribed`** (BOOLEAN, default: true)
* **`created_at`** (TIMESTAMPTZ)
* **`updated_at`** (TIMESTAMPTZ)
* **`created_by`** (UUID, nullable, Foreign Key → `profiles.id`)

### **4.3 Relationships**

* **Many-to-One** with `organizations` (tenant boundary)
* **Many-to-One** with `import_jobs` (tracks which import job created this contact)
* **Many-to-One** with `import_records` (links to raw import data)
* **One-to-Many** with `contact_custom_field_values` (custom field values)

### **4.4 Indexes**

* `organization_id` + `email` (unique composite index for deduplication)
* `organization_id` + `mobile` (for mobile lookups)
* `organization_id` + `source` (for filtering by source)
* `organization_id` + `created_at` (for chronological queries)
* `organization_id` + `is_active` (for active contact queries)
* `source_import_job_id` (for import job lookups)

### **4.5 MVP Simplifications**

**Removed for MVP:**
* `tags` (TEXT[]) - Will be added in Phase 2 with normalized tag system
* `last_contacted_at` - Will be tracked via activities table in Phase 2
* `last_campaign_sent_at` - Will be tracked via campaign interactions in Phase 2

**Kept for MVP:**
* Core contact fields (email, name, mobile)
* Source tracking (manual, csv, excel, mailchimp)
* Basic subscription status
* Active/inactive flag

---

## **5. Table: `contact_custom_field_definitions`**

### **5.1 Purpose**
Defines custom fields that an organization can add to their contacts. Each organization can define their own set of custom fields.

### **5.2 Key Fields**

* **`id`** (UUID, Primary Key)
* **`organization_id`** (UUID, Foreign Key → `organizations.id`)
* **`field_name`** (TEXT, unique per organization)
* **`field_type`** (ENUM: `text`, `number`, `date`, `boolean`, `select`, `multiselect`)
* **`display_label`** (TEXT, user-friendly label)
* **`is_required`** (BOOLEAN, default: false)
* **`default_value`** (TEXT, nullable, JSON for complex types)
* **`options`** (JSONB, nullable, for select/multiselect field options)
* **`validation_rules`** (JSONB, nullable, e.g., min/max length, regex patterns)
* **`display_order`** (INTEGER, for UI ordering)
* **`is_active`** (BOOLEAN, default: true)
* **`created_at`** (TIMESTAMPTZ)
* **`updated_at`** (TIMESTAMPTZ)
* **`created_by`** (UUID, Foreign Key → `profiles.id`)

### **5.3 Relationships**

* **Many-to-One** with `organizations` (tenant boundary)
* **One-to-Many** with `contact_custom_field_values` (values for this field)

### **5.4 Indexes**

* `organization_id` + `field_name` (unique composite index)
* `organization_id` + `is_active` (for active field queries)
* `organization_id` + `display_order` (for ordered field queries)

---

## **6. Table: `contact_custom_field_values`**

### **6.1 Purpose**
Stores values for custom fields per contact. Uses an EAV (Entity-Attribute-Value) pattern for flexibility.

### **6.2 Key Fields**

* **`id`** (UUID, Primary Key)
* **`contact_id`** (UUID, Foreign Key → `contacts.id`, ON DELETE CASCADE)
* **`field_definition_id`** (UUID, Foreign Key → `contact_custom_field_definitions.id`)
* **`value_text`** (TEXT, nullable, for text/select fields)
* **`value_number`** (NUMERIC, nullable, for number fields)
* **`value_date`** (DATE, nullable, for date fields)
* **`value_boolean`** (BOOLEAN, nullable, for boolean fields)
* **`value_json`** (JSONB, nullable, for complex/multiselect values)
* **`created_at`** (TIMESTAMPTZ)
* **`updated_at`** (TIMESTAMPTZ)

### **6.3 Relationships**

* **Many-to-One** with `contacts` (which contact this value belongs to)
* **Many-to-One** with `contact_custom_field_definitions` (which field definition)

### **6.4 Indexes**

* `contact_id` + `field_definition_id` (unique composite index, one value per field per contact)
* `contact_id` (for contact lookups)
* `field_definition_id` + `value_text` (for filtering contacts by custom field value)
* `field_definition_id` + `value_number` (for numeric field queries)

---

## **7. Table: `import_jobs`**

### **7.1 Purpose**
Tracks import operations (CSV, Excel, Mailchimp). Each import operation is a single job that may process multiple records.

### **7.2 Key Fields**

* **`id`** (UUID, Primary Key)
* **`organization_id`** (UUID, Foreign Key → `organizations.id`)
* **`import_type`** (ENUM: `csv`, `excel`, `mailchimp`)
* **`status`** (ENUM: `pending`, `processing`, `completed`, `failed`, `partially_completed`)
* **`file_name`** (TEXT, nullable, original file name for CSV/Excel)
* **`file_size_bytes`** (BIGINT, nullable)
* **`mailchimp_list_id`** (TEXT, nullable, for Mailchimp imports)
* **`mailchimp_list_name`** (TEXT, nullable)
* **`total_records`** (INTEGER, default: 0, total records in import)
* **`processed_records`** (INTEGER, default: 0, records processed so far)
* **`successful_records`** (INTEGER, default: 0, successfully imported)
* **`failed_records`** (INTEGER, default: 0, failed imports)
* **`duplicate_records`** (INTEGER, default: 0, duplicate contacts skipped)
* **`column_mapping`** (JSONB, nullable, maps import columns to contact fields)
* **`settings`** (JSONB, nullable, import-specific settings like deduplication rules)
* **`error_summary`** (TEXT, nullable, high-level error message if job failed)
* **`started_at`** (TIMESTAMPTZ, nullable)
* **`completed_at`** (TIMESTAMPTZ, nullable)
* **`created_at`** (TIMESTAMPTZ)
* **`created_by`** (UUID, Foreign Key → `profiles.id`)

### **7.3 Relationships**

* **Many-to-One** with `organizations` (tenant boundary)
* **One-to-Many** with `import_records` (raw records in this import)
* **One-to-Many** with `contacts` (contacts created by this import)
* **One-to-Many** with `import_errors` (errors encountered during import)

### **7.4 Indexes**

* `organization_id` + `status` (for filtering imports by status)
* `organization_id` + `created_at` (for chronological import history)
* `organization_id` + `import_type` (for filtering by import type)
* `status` + `created_at` (for processing queue queries)

---

## **8. Table: `import_records`**

### **8.1 Purpose**
Stores raw imported data before normalization. This preserves the original import data for debugging, reprocessing, and audit purposes.

### **8.2 Key Fields**

* **`id`** (UUID, Primary Key)
* **`import_job_id`** (UUID, Foreign Key → `import_jobs.id`, ON DELETE CASCADE)
* **`organization_id`** (UUID, Foreign Key → `organizations.id`)
* **`row_number`** (INTEGER, original row number in import file)
* **`raw_data`** (JSONB, complete raw row data as imported)
* **`status`** (ENUM: `pending`, `processed`, `failed`, `skipped`)
* **`contact_id`** (UUID, nullable, Foreign Key → `contacts.id`, if successfully created)
* **`error_message`** (TEXT, nullable, error if processing failed)
* **`processing_notes`** (TEXT, nullable, additional processing information)
* **`processed_at`** (TIMESTAMPTZ, nullable)
* **`created_at`** (TIMESTAMPTZ)

### **8.3 Relationships**

* **Many-to-One** with `import_jobs` (which import job this record belongs to)
* **Many-to-One** with `organizations` (tenant boundary)
* **One-to-One** with `contacts` (if successfully processed)

### **8.4 Indexes**

* `import_job_id` + `row_number` (for ordered record retrieval)
* `import_job_id` + `status` (for filtering by processing status)
* `organization_id` + `created_at` (for organization-level queries)
* `contact_id` (for reverse lookup from contact to import record)

---

## **9. Table: `import_errors`**

### **9.1 Purpose**
Stores detailed error information for failed import records. Provides granular error tracking for debugging and user feedback.

### **9.2 Key Fields**

* **`id`** (UUID, Primary Key)
* **`import_job_id`** (UUID, Foreign Key → `import_jobs.id`, ON DELETE CASCADE)
* **`import_record_id`** (UUID, nullable, Foreign Key → `import_records.id`)
* **`organization_id`** (UUID, Foreign Key → `organizations.id`)
* **`error_type`** (ENUM: `validation`, `duplicate`, `format`, `system`, `custom_field`)
* **`error_code`** (TEXT, machine-readable error code)
* **`error_message`** (TEXT, human-readable error message)
* **`error_details`** (JSONB, nullable, additional error context)
* **`field_name`** (TEXT, nullable, which field caused the error)
* **`row_number`** (INTEGER, nullable, row number in import file)
* **`created_at`** (TIMESTAMPTZ)

### **9.3 Relationships**

* **Many-to-One** with `import_jobs` (which import job this error belongs to)
* **Many-to-One** with `import_records` (which record caused the error)
* **Many-to-One** with `organizations` (tenant boundary)

### **9.4 Indexes**

* `import_job_id` + `error_type` (for error categorization)
* `import_job_id` + `created_at` (for chronological error tracking)
* `organization_id` + `error_type` (for organization-level error analysis)

---

## **10. Relationships Diagram**

```
organizations (1) ──< (many) contacts
organizations (1) ──< (many) contact_custom_field_definitions
organizations (1) ──< (many) import_jobs

contacts (1) ──< (many) contact_custom_field_values
contact_custom_field_definitions (1) ──< (many) contact_custom_field_values

import_jobs (1) ──< (many) import_records
import_jobs (1) ──< (many) contacts (via source_import_job_id)
import_jobs (1) ──< (many) import_errors

import_records (1) ──> (1) contacts (optional, if processed successfully)
import_records (1) ──< (many) import_errors
```

---

## **11. MVP Use Cases**

### **11.1 Manual Contact Creation**

1. User creates contact via UI → Create `contacts` record directly
2. `source: manual`, `source_import_job_id: null`, `source_import_record_id: null`
3. Custom field values stored in `contact_custom_field_values`

### **11.2 CSV/Excel Import**

1. User uploads file → Create `import_jobs` record with `status: pending`
2. Parse file → Create `import_records` for each row with `raw_data` JSONB
3. Process each record:
   - Map columns to contact fields using `column_mapping`
   - Validate data
   - Check for duplicates (email + organization_id)
   - Create `contacts` record if valid
   - Link `import_records.contact_id` to created contact
   - Update `import_records.status` to `processed` or `failed`
   - Create `import_errors` if validation fails
4. Update `import_jobs` with final counts and `status: completed`

### **11.3 Mailchimp Import**

1. User initiates Mailchimp sync → Create `import_jobs` with `import_type: mailchimp`
2. Fetch contacts from Mailchimp API → Create `import_records` for each contact
3. Process each record (same as CSV/Excel flow)
4. Update `import_jobs` with final counts

### **11.4 Custom Fields**

1. Organization defines custom fields in `contact_custom_field_definitions`
2. When creating/updating contact, store values in `contact_custom_field_values`
3. During imports, map import columns to custom fields via `column_mapping` in `import_jobs`

---

## **12. Deduplication Strategy (MVP)**

### **12.1 Deduplication Rules**

Contacts are deduplicated based on:
- **Primary key**: `organization_id` + `email` (unique composite index)
- **Secondary check**: `organization_id` + `mobile` (if email not provided)

### **12.2 Import Deduplication**

During imports:
1. Check if contact with same `email` + `organization_id` exists
2. If exists:
   - Option A: Skip (increment `duplicate_records` in `import_jobs`)
   - Option B: Update existing contact (merge strategy)
   - Option C: Create duplicate (if explicitly allowed)
3. Decision stored in `import_jobs.settings.deduplication_strategy`

---

## **13. Future Extensibility**

The MVP schema is designed to be extended in future phases:

### **13.1 Phase 2 Additions (Planned)**

* **Tags System**: `contact_tags` and `contact_tag_assignments` tables
* **Activities**: `contact_activities` table for tracking contact interactions
* **Events**: `contact_events` table for automation triggers
* **Segments**: `contact_segment_memberships` table for campaign targeting

### **13.2 Phase 3 Additions (Planned)**

* **Engagement Tracking**: Fields or tables for email engagement metrics
* **Email Preferences**: Granular preference management
* **Contact History**: Audit trail for contact changes
* **Relationships**: Contact-to-contact relationships (B2B support)

### **13.3 Schema Design for Extensibility**

* **No breaking changes required**: Future tables link to existing `contacts` table via `contact_id`
* **Indexes can be added**: Current indexes don't block future additions
* **JSONB fields**: `settings` and `column_mapping` in `import_jobs` allow flexible configuration
* **Source tracking**: `source` field in `contacts` can be extended with new import types

---

## **14. Scalability Considerations**

### **14.1 Indexing Strategy**

* Composite indexes on `organization_id` + common query fields
* Separate indexes for different query patterns
* Partial indexes for active contacts (`is_active = true`)

### **14.2 Query Optimization**

* Use pagination for contact lists
* Filter by `organization_id` first in all queries
* Consider materialized views for common aggregations (future)

### **14.3 Import Processing**

* Process imports in batches (configurable batch size)
* Use async processing for large imports (future enhancement)
* Archive old `import_records` after retention period (future)

---

## **15. Security & Multi-Tenancy**

### **15.1 Row Level Security (RLS)**

All tables enforce RLS:
* `contacts`: Users can only access contacts in their organization
* `contact_custom_field_definitions`: Scoped to organization
* `import_jobs`, `import_records`, `import_errors`: Scoped to organization

### **15.2 Data Isolation**

* All queries filtered by `organization_id`
* Foreign key constraints ensure data integrity
* No cross-organization data leakage possible

---

## **16. MVP Limitations & Workarounds**

### **16.1 No Tags System**

**Limitation:** Cannot tag contacts for organization
**Workaround:** Use custom fields with `field_type: select` or `multiselect` as temporary solution
**Future:** Normalized tag system in Phase 2

### **16.2 No Activity Tracking**

**Limitation:** Cannot track when contacts were last contacted
**Workaround:** Use `updated_at` field as proxy (less accurate)
**Future:** `contact_activities` table in Phase 2

### **16.3 No Segmentation**

**Limitation:** Cannot create segments for campaign targeting
**Workaround:** Filter contacts manually using custom fields and standard fields
**Future:** Segment system in Phase 2

### **16.4 No Engagement Metrics**

**Limitation:** Cannot track email opens, clicks, etc.
**Workaround:** N/A - requires campaign system integration
**Future:** Engagement tracking in Phase 3

---

## **17. Status**

✅ **Phase-1 MVP schema is complete and ready for implementation.**

This minimal schema provides:
* Core contact management
* Full import support (CSV, Excel, Mailchimp)
* Custom fields per organization
* Complete import audit trail
* Multi-tenant isolation
* Foundation for future enhancements

---

## **18. Related Documents**

* `Docs/contacts-schema-design.md` - Full schema design with all features
* `Docs/contacts-schema-analysis.md` - Analysis and improvements
* `Docs/database-overview.md` - High-level database model
* `schema-auth-tables.sql` - Reference implementation for auth tables

---
