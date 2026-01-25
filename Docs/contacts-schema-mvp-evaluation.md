# **CONTACTS SCHEMA MVP — EVALUATION REPORT**

---

## **1. Purpose of This Document**

This document provides a **comprehensive evaluation** of the Phase-1 MVP Contacts schema design, assessing:

* **Correctness**: Data integrity, constraints, and logical consistency
* **Scalability**: Performance at scale (millions of contacts)
* **Future Compatibility**: Compatibility with automations and campaigns
* **Missing Critical Elements**: Gaps that could block future features

---

## **2. Overall Assessment**

**Status:** ⚠️ **MVP schema is mostly correct but requires minor fixes before implementation.**

The schema is well-designed for MVP functionality but has several issues that should be addressed to ensure correctness, scalability, and smooth future integration.

---

## **3. Correctness Analysis**

### **3.1 Strengths**

✅ **Multi-tenant isolation** properly implemented with `organization_id`  
✅ **Foreign key relationships** correctly defined  
✅ **Source tracking** enables audit trail  
✅ **Custom fields EAV pattern** is logically sound  
✅ **Import tracking** provides complete audit trail  

### **3.2 Critical Issues**

#### **3.2.1 Email Uniqueness Constraint with NULL Values**

**Issue:** Unique constraint on `organization_id + email` but `email` is nullable

**Problem:**
* PostgreSQL unique constraints allow multiple NULL values
* Multiple contacts in same organization can have `email = NULL`
* Deduplication logic may not work correctly for contacts without emails
* Cannot enforce "one contact per email per org" when email is NULL

**Impact:** High - Data integrity issue

**Recommendation:**
```
Option 1: Partial unique index (recommended)
CREATE UNIQUE INDEX idx_contacts_org_email_unique 
ON contacts(organization_id, email) 
WHERE email IS NOT NULL;

Option 2: Make email required (if business logic allows)
ALTER TABLE contacts ALTER COLUMN email SET NOT NULL;

Option 3: Use COALESCE with empty string
CREATE UNIQUE INDEX idx_contacts_org_email_unique 
ON contacts(organization_id, COALESCE(email, ''))
WHERE email IS NOT NULL;
```

#### **3.2.2 Mobile Uniqueness Constraint Missing**

**Issue:** Deduplication mentions `organization_id + mobile` but no unique constraint defined

**Problem:**
* Section 12.1 mentions "Secondary check: organization_id + mobile"
* But no unique index on `organization_id + mobile` in section 4.4
* Inconsistent with deduplication strategy
* Cannot enforce mobile uniqueness if needed

**Impact:** Medium - Inconsistency between design and implementation

**Recommendation:**
```
Add partial unique index for mobile (if email not provided):
CREATE UNIQUE INDEX idx_contacts_org_mobile_unique 
ON contacts(organization_id, mobile) 
WHERE mobile IS NOT NULL AND email IS NULL;

Or clarify that mobile is NOT unique, only used for lookup.
```

#### **3.2.3 Foreign Key ON DELETE Behaviors Not Specified**

**Issue:** Foreign key constraints mentioned but ON DELETE behaviors not defined

**Problem:**
* `source_import_job_id` → `import_jobs.id` - what happens if import_job deleted?
* `source_import_record_id` → `import_records.id` - what happens if import_record deleted?
* `contact_custom_field_values.contact_id` has ON DELETE CASCADE (good)
* But `contact_custom_field_values.field_definition_id` - what if field definition deleted?

**Impact:** Medium - Data integrity and referential integrity issues

**Recommendation:**
```
Specify ON DELETE behaviors:
- contacts.source_import_job_id → import_jobs.id: ON DELETE SET NULL (preserve contact, lose source link)
- contacts.source_import_record_id → import_records.id: ON DELETE SET NULL
- contact_custom_field_values.field_definition_id → contact_custom_field_definitions.id: 
  ON DELETE RESTRICT (prevent deletion if values exist) OR
  ON DELETE CASCADE (delete values if field definition deleted)
```

#### **3.2.4 Missing Validation Constraints**

**Issue:** No database-level validation rules specified

**Problem:**
* Email format not validated at database level
* Mobile format not validated
* No CHECK constraints for data integrity
* Validation only at application level (can be bypassed)

**Impact:** Low - Application-level validation is acceptable for MVP, but database constraints add safety

**Recommendation:**
```
Add CHECK constraints (optional for MVP):
- Email format validation (if email IS NOT NULL)
- Mobile format validation (if mobile IS NOT NULL)
- Ensure at least email OR mobile is provided
```

#### **3.2.5 Email Case Sensitivity**

**Issue:** No mention of email case handling

**Problem:**
* PostgreSQL TEXT comparisons are case-sensitive by default
* "John@Example.com" and "john@example.com" would be treated as different
* Deduplication may fail for case variations

**Impact:** Medium - Data quality issue

**Recommendation:**
```
Option 1: Store emails in lowercase
- Add trigger or application logic to lowercase emails before insert/update
- Or use LOWER() in unique index

Option 2: Case-insensitive unique index
CREATE UNIQUE INDEX idx_contacts_org_email_unique 
ON contacts(organization_id, LOWER(email)) 
WHERE email IS NOT NULL;
```

---

## **4. Scalability Analysis**

### **4.1 Strengths**

✅ **Composite indexes** on `organization_id + common fields`  
✅ **Pagination strategy** mentioned  
✅ **Multi-tenant filtering** ensures efficient queries  

### **4.2 Critical Issues**

#### **4.2.1 EAV Pattern Performance at Scale**

**Issue:** Custom fields use EAV pattern which is slow for large datasets

**Problem:**
* Querying contacts with custom fields requires multiple JOINs
* Performance degrades with many custom fields per contact
* Cannot efficiently filter "contacts where custom_field_X > 100" at scale

**Impact:** High - Will be slow with 100K+ contacts and multiple custom fields

**Recommendation:**
```
For MVP: Acceptable, but document performance expectations
- Limit number of custom fields per organization (e.g., 20-30)
- Use pagination and limit custom field queries
- Consider materialized views for common queries (Phase 2)

Future: Denormalize frequently-queried custom fields to contacts table
```

#### **4.2.2 Missing Composite Indexes**

**Issue:** Some common query patterns lack optimized indexes

**Problem:**
* Queries like "active subscribed contacts created in last 30 days" may be slow
* No index on `organization_id + is_active + is_subscribed + created_at`
* Filtering by multiple boolean flags requires sequential scan

**Impact:** Medium - Performance degradation with large contact bases

**Recommendation:**
```
Add composite indexes for common query patterns:
- organization_id + is_active + is_subscribed + created_at
- organization_id + source + created_at
- Partial index: organization_id + created_at WHERE is_active = true
```

#### **4.2.3 Import Processing Scalability**

**Issue:** No async/batch processing strategy in MVP schema

**Problem:**
* Large imports (50K+ rows) will timeout
* Synchronous processing blocks users
* No resume capability for failed imports
* All-or-nothing failure model

**Impact:** Critical - Will fail for enterprise customers

**Recommendation:**
```
Add to import_jobs table:
- processing_mode (ENUM: sync, async) - default: sync for MVP
- batch_size (INTEGER) - default: 1000
- current_batch (INTEGER) - for tracking progress
- resume_token (TEXT, nullable) - for resuming failed imports

Document: MVP supports sync processing for small imports (<10K rows)
Phase 2: Add async processing for large imports
```

#### **4.2.4 Import Records Growth**

**Issue:** `import_records` table will grow unbounded

**Problem:**
* Millions of import records over time
* Slow queries on import history
* Storage costs increase
* No archival strategy

**Impact:** Medium - Performance degradation over time

**Recommendation:**
```
Add to import_records table:
- archived_at (TIMESTAMPTZ, nullable)
- Add retention policy: Archive records older than 90 days (configurable)

Document: MVP keeps all import records
Phase 2: Implement automatic archival
```

---

## **5. Future Compatibility Analysis**

### **5.1 Campaign Compatibility**

#### **5.1.1 Contact References**

**Status:** ✅ **Compatible**

**Analysis:**
* Campaigns can reference contacts via `contact_id` foreign key
* `contacts.id` is UUID primary key - suitable for foreign key references
* `is_subscribed` field exists for campaign targeting
* `is_active` field exists for filtering active contacts

**No blocking issues identified.**

#### **5.1.2 Missing Campaign-Specific Fields**

**Issue:** No fields for campaign attribution or engagement

**Problem:**
* Cannot track which campaigns a contact received
* Cannot attribute conversions to campaigns
* No engagement metrics for campaign effectiveness

**Impact:** Low for MVP - Campaigns can still send to contacts, but analytics limited

**Recommendation:**
```
Acceptable for MVP - campaigns will create separate campaign_recipients table
Future: Add contact_campaign_interactions table in Phase 3
```

### **5.2 Automation Compatibility**

#### **5.2.1 Contact References**

**Status:** ✅ **Compatible**

**Analysis:**
* Automations can reference contacts via `contact_id`
* Custom fields can be used in automation conditions (via EAV pattern)
* `is_active` and `is_subscribed` fields available for automation triggers

**No blocking issues identified.**

#### **5.2.2 Missing Automation Prerequisites**

**Issue:** No `contact_events` table for automation triggers

**Problem:**
* Cannot trigger automations on "email opened", "link clicked", etc.
* Cannot track contact behavior for automation workflows
* No event history for automation decision nodes

**Impact:** Expected - Documented as Phase 2 feature

**Recommendation:**
```
Acceptable for MVP - automations will be added in Phase 2
Ensure contacts table has no fields that would block contact_events table addition
✅ No blocking issues - contact_events will link via contact_id
```

#### **5.2.3 Custom Fields Query Performance**

**Issue:** EAV pattern makes automation trigger queries slow

**Problem:**
* Automation triggers checking custom field values require complex JOINs
* Performance degrades with many custom fields
* Cannot efficiently filter "contacts where custom_field_X > 100"

**Impact:** Medium - Will need optimization in Phase 2

**Recommendation:**
```
Document performance expectations for MVP
Phase 2: Add materialized views or denormalize frequently-queried custom fields
```

### **5.3 Segmentation Compatibility**

#### **5.3.1 Contact Filtering**

**Status:** ⚠️ **Partially Compatible**

**Analysis:**
* Can filter by standard fields (email, name, mobile, source, is_active, is_subscribed)
* Can filter by custom fields (via EAV JOINs - slow but functional)
* Cannot efficiently create segments with complex rules

**Impact:** Medium - Segmentation will work but be slow at scale

**Recommendation:**
```
MVP: Acceptable - manual filtering and simple segments
Phase 2: Add contact_segment_memberships table for performance
```

---

## **6. Missing Critical Elements**

### **6.1 Must Add Before Implementation (P0)**

#### **6.1.1 Email Uniqueness Constraint Fix**

**Critical:** Yes  
**Reason:** Data integrity - prevents duplicate contacts  
**Fix:** Add partial unique index for non-NULL emails  

#### **6.1.2 Foreign Key ON DELETE Behaviors**

**Critical:** Yes  
**Reason:** Referential integrity - prevents orphaned records  
**Fix:** Specify ON DELETE behaviors for all foreign keys  

#### **6.1.3 Email Case Handling**

**Critical:** Yes  
**Reason:** Data quality - prevents case-sensitive duplicates  
**Fix:** Use LOWER() in unique index or lowercase emails before insert  

### **6.2 Should Add Before Implementation (P1)**

#### **6.2.1 Mobile Uniqueness Clarification**

**Critical:** No  
**Reason:** Consistency - align design with implementation  
**Fix:** Either add unique constraint or clarify mobile is NOT unique  

#### **6.2.2 Additional Composite Indexes**

**Critical:** No  
**Reason:** Performance - optimize common query patterns  
**Fix:** Add indexes for `is_active + is_subscribed + created_at` patterns  

#### **6.2.3 Soft Delete Support**

**Critical:** No  
**Reason:** Data retention - `is_active` exists but no `deleted_at` timestamp  
**Fix:** Add `deleted_at` field for audit trail (optional for MVP)  

### **6.3 Can Add Later (P2)**

#### **6.3.1 Async Import Processing**

**Critical:** No (for MVP)  
**Reason:** Scalability - needed for large imports  
**Fix:** Add `processing_mode`, `batch_size`, `current_batch` fields in Phase 2  

#### **6.3.2 Import Records Archival**

**Critical:** No  
**Reason:** Storage - needed for long-term operation  
**Fix:** Add `archived_at` field and archival process in Phase 2  

#### **6.3.3 Database-Level Validation**

**Critical:** No  
**Reason:** Data quality - application-level validation acceptable for MVP  
**Fix:** Add CHECK constraints in Phase 2 if needed  

---

## **7. Recommended Schema Fixes**

### **7.1 Contacts Table Fixes**

```
contacts table modifications:

1. Add partial unique index for email:
   CREATE UNIQUE INDEX idx_contacts_org_email_unique 
   ON contacts(organization_id, LOWER(email)) 
   WHERE email IS NOT NULL;

2. Clarify mobile uniqueness:
   - If mobile should be unique: Add partial unique index
   - If mobile is NOT unique: Remove from deduplication strategy or clarify it's lookup-only

3. Specify foreign key behaviors:
   - source_import_job_id → import_jobs.id: ON DELETE SET NULL
   - source_import_record_id → import_records.id: ON DELETE SET NULL

4. Add deleted_at field (optional for MVP):
   - deleted_at (TIMESTAMPTZ, nullable)
   - Index on organization_id + deleted_at WHERE deleted_at IS NOT NULL
```

### **7.2 Custom Field Values Table Fixes**

```
contact_custom_field_values table modifications:

1. Specify foreign key behavior:
   - field_definition_id → contact_custom_field_definitions.id: 
     ON DELETE RESTRICT (prevent deletion if values exist)
     OR ON DELETE CASCADE (delete values if field deleted - document choice)

2. Add index for common queries:
   - organization_id + field_definition_id + value_text (via JOIN through contact)
   - Consider partial index for active field definitions
```

### **7.3 Import Jobs Table Fixes**

```
import_jobs table additions (for future async processing):

1. Add fields for Phase 2 async processing:
   - processing_mode (ENUM: sync, async) - default: 'sync' for MVP
   - batch_size (INTEGER) - default: 1000
   - current_batch (INTEGER) - nullable, for tracking progress
   - resume_token (TEXT, nullable) - for resuming failed imports

2. Document: MVP uses sync processing, async added in Phase 2
```

### **7.4 Import Records Table Fixes**

```
import_records table additions:

1. Add archival field:
   - archived_at (TIMESTAMPTZ, nullable)
   - Index on organization_id + archived_at WHERE archived_at IS NOT NULL

2. Document: MVP keeps all records, archival in Phase 2
```

---

## **8. Performance Recommendations**

### **8.1 Additional Indexes**

```
Recommended indexes for MVP:

1. contacts:
   - (organization_id, is_active, is_subscribed, created_at) - for common filtering
   - (organization_id, source, created_at) - for source-based queries
   - Partial: (organization_id, created_at) WHERE is_active = true

2. contact_custom_field_values:
   - (field_definition_id, value_text) WHERE value_text IS NOT NULL
   - (field_definition_id, value_number) WHERE value_number IS NOT NULL

3. import_jobs:
   - (organization_id, status, created_at) - for import history queries
```

### **8.2 Query Optimization Guidelines**

```
Document query patterns for MVP:

1. Contact list queries:
   - Always filter by organization_id first
   - Use pagination (LIMIT/OFFSET or cursor-based)
   - Limit custom field JOINs (fetch separately if needed)

2. Custom field queries:
   - Cache field definitions per organization
   - Batch custom field value fetches
   - Consider denormalizing top 3-5 most-queried custom fields

3. Import processing:
   - Process in batches of 1000 records
   - Use transactions per batch
   - Update progress counters incrementally
```

---

## **9. Future Extensibility Assessment**

### **9.1 Campaign Integration**

**Compatibility:** ✅ **Excellent**

* Contacts table has all required fields
* Foreign key structure supports campaign_recipients table
* No schema changes needed for basic campaign sending
* Engagement tracking can be added via separate table (Phase 3)

### **9.2 Automation Integration**

**Compatibility:** ✅ **Good**

* Contacts table compatible with automation triggers
* Custom fields accessible (via EAV - performance acceptable for MVP)
* `contact_events` table can be added without breaking changes
* `contact_automation_states` table can link via `contact_id`

**Potential Issue:** EAV query performance for automation triggers
**Mitigation:** Document performance limits, optimize in Phase 2

### **9.3 Segmentation Integration**

**Compatibility:** ⚠️ **Acceptable with Limitations**

* Can create segments using standard fields efficiently
* Custom field segmentation works but slow at scale
* `contact_segment_memberships` table can be added in Phase 2
* No blocking issues for MVP segmentation needs

---

## **10. Critical Fixes Summary**

### **10.1 Before Implementation (Required)**

1. ✅ **Add partial unique index** for `organization_id + email` (handle NULLs)
2. ✅ **Specify ON DELETE behaviors** for all foreign keys
3. ✅ **Handle email case sensitivity** (use LOWER() in index)
4. ✅ **Clarify mobile uniqueness** (add constraint or remove from deduplication)

### **10.2 Before Production (Recommended)**

5. ⚠️ **Add composite indexes** for common query patterns
6. ⚠️ **Add `deleted_at` field** for soft delete audit trail
7. ⚠️ **Document import processing limits** (sync processing, max rows)
8. ⚠️ **Add performance guidelines** for custom field queries

### **10.3 Phase 2 Enhancements (Planned)**

9. 📋 **Add async import processing** fields
10. 📋 **Implement import records archival**
11. 📋 **Add materialized views** for custom field queries
12. 📋 **Optimize EAV pattern** performance

---

## **11. Final Verdict**

### **11.1 Correctness**

**Status:** ⚠️ **Requires fixes before implementation**

**Issues:**
* Email uniqueness constraint needs NULL handling
* Foreign key behaviors not specified
* Email case sensitivity not addressed
* Mobile uniqueness inconsistent

**Fix Required:** Yes - 4 critical fixes needed

### **11.2 Scalability**

**Status:** ⚠️ **Acceptable for MVP, needs optimization for scale**

**Issues:**
* EAV pattern will be slow with many custom fields
* Missing some composite indexes
* No async import processing (limits import size)
* Import records will grow unbounded

**Fix Required:** Partial - Document limits, optimize in Phase 2

### **11.3 Future Compatibility**

**Status:** ✅ **Excellent - No blocking issues**

**Analysis:**
* Campaigns: Fully compatible
* Automations: Compatible (performance optimization needed in Phase 2)
* Segments: Compatible (performance optimization needed in Phase 2)
* No schema changes required for future features

**Fix Required:** No - Schema is future-proof

---

## **12. Implementation Readiness**

**Overall Status:** ⚠️ **Ready with fixes**

The MVP schema is **well-designed and future-proof** but requires **4 critical fixes** before implementation:

1. Email uniqueness constraint (NULL handling)
2. Foreign key ON DELETE behaviors
3. Email case sensitivity
4. Mobile uniqueness clarification

After these fixes, the schema is ready for MVP implementation and will scale to support future automations and campaigns without breaking changes.

---

## **13. Related Documents**

* `Docs/contacts-schema-mvp.md` - Original MVP schema design
* `Docs/contacts-schema-design.md` - Full schema design
* `Docs/contacts-schema-analysis.md` - Detailed analysis and improvements

---
