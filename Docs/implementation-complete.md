# **IMPLEMENTATION COMPLETE — CONTACTS & CAMPAIGNS MODULE (REFERENCE)**

## **FRESH START — PROJECT RESET**

**The project was reset and is starting afresh.** This document is kept as **reference only** for the previous attempt. No tasks or features described here should be considered done in the current codebase. All work is to be (re)implemented according to the phase task files (Phase 1–4) and current repo structure.

---

## **Document Overview (Reference)**

This document describes the **previous** implementation attempt for Contacts and Campaigns modules. Use it as a specification reference when re-implementing; do not assume any of it exists in the current repo.

**Last Updated:** January 31, 2026  
**Status:** Reference only — all implementation tasks reset to uncompleted.

> Note: This document refers to a **previous** implementation. The current repo uses **FastAPI** in `backend/` and a **Vite + React** frontend in `frontend/`; there are no Next.js API routes.
> However, some database tables referenced by the code (e.g. tags + campaign recipients/targeting) are not present in the current `database/` SQL scripts or `migrations/` folder, and RLS policies for these domain tables are not yet captured in the repo.
> Treat this document as “what the code intends/implements”, not an end-to-end production readiness guarantee.

### **Reality Check (Fresh Start)**

**Current repo:** No Contacts/Campaigns/Tags implementation is assumed. Backend and frontend folders are empty (.gitkeep). All features described in this document are **to be implemented** as part of Phase 2+ per the task files.

**When re-implementing, ensure:**

- Database: Define all required tables (contacts, contact_tags, contact_tag_assignments, campaigns, campaign_recipients, campaign_target_rules, etc.) in migrations.
- RLS: Add tenant-scoped RLS policies for all domain tables.
- UI: Build contacts/campaigns/tags pages per phase task breakdowns.

**Previous attempt (reference only):**

- Contacts: list + import modules existed under `apps/api/src/modules/contacts/**` and were exposed via `apps/web/app/api/contacts/**`.
- Tags: tags module existed under `apps/api/src/modules/tags/**` and was exposed via `apps/web/app/api/tags/**`.
- Campaigns: campaigns module existed under `apps/api/src/modules/campaigns/**` and was exposed via `apps/web/app/api/campaigns/**`.

**Known repo gaps (must be addressed before calling this “production-ready”):**

- Database: `contact_tags`, `contact_tag_assignments`, `campaign_recipients`, `campaign_target_rules` tables are referenced by code but are not currently defined in `database/` scripts or `migrations/`.
- RLS: tenant-scoped RLS policies for contacts/campaigns/tags domain tables are not present in repo SQL.
- UI: contacts/campaigns/tags UI pages are not present (current web app is primarily auth + dashboard).

---

## **TABLE OF CONTENTS**

1. [Contacts Module](#1-contacts-module)
2. [Campaigns Module](#2-campaigns-module)
3. [Database Schema](#3-database-schema)
4. [API Endpoints](#4-api-endpoints)
5. [Architecture Patterns](#5-architecture-patterns)

---

## **1. CONTACTS MODULE**

### **1.1 Contact Import System**

#### **Overview**

A production-grade contact import system that supports multiple data sources and handles normalization, deduplication, and custom field management.

#### **Supported Import Sources**

- `excel_copy_paste` — Excel data pasted directly
- `csv_upload` — CSV file upload
- `xlsx_upload` — XLSX file upload
- `mailchimp_import` — Mailchimp contact sync

#### **Import Pipeline**

**1. Normalization (`import.normalizer.ts`)**

- **Field Detection:** Auto-detects standard fields using aliases:

  - `first_name`: `["first_name", "firstname", "first name", "fname", "f_name"]`
  - `last_name`: `["last_name", "lastname", "last name", "lname", "l_name"]`
  - `full_name`: `["full_name", "fullname", "full name", "name"]`
  - `email`: `["email", "mail", "e-mail", "e_mail"]`
  - `mobile`: `["mobile", "phone", "number", "phone_number", "phone number", "phoneNumber"]`
  - `country`: `["country", "country_code", "country code", "countrycode", "iso_country", "iso_country_code"]`

- **Normalization Rules:**
  - All strings trimmed
  - Email converted to lowercase
  - Country codes converted to lowercase
  - Empty strings → `null`
  - Full name split into `first_name` and `last_name` if individual fields don't exist
  - Unknown columns mapped to `custom_fields`

**2. Deduplication (`import.deduplicator.ts`)**

- **Primary Key:** `(organization_id, email)` — case-insensitive
- **Logic:**
  - Queries existing contacts by email (case-insensitive) for the organization
  - Marks contacts as:
    - `unique` — email doesn't exist
    - `duplicate` — email exists
  - Contacts without email are treated as unique
  - Bulk query (not one-by-one) for efficiency

**3. Contact Restoration**

- If duplicate email exists and contact is soft-deleted:
  - Restore contact (`is_active = true`, `deleted_at = null`)
  - Update contact fields with new data
  - Track as `restored` in import result

**4. Bulk Insert (`import.repository.ts`)**

- **Batch Size:** 500 contacts per batch
- **Conflict Handling:**
  - Handles unique constraint violations gracefully
  - Tries individual inserts if batch fails
  - Continues with next batch on partial failures
- **Custom Fields:**
  - Auto-creates custom field definitions if they don't exist
  - Bulk inserts custom field values
  - Handles partial failures gracefully

**5. Import Result**

```typescript
{
  total: number; // Total rows processed
  created: number; // New contacts created
  skipped: number; // Duplicates skipped
  restored: number; // Soft-deleted contacts restored
  invalid: number; // Contacts that failed validation
  errors: Array<{
    rowIndex: number;
    reason: string;
  }>;
}
```

#### **API Endpoint**

```
POST /api/contacts/import
Content-Type: application/json

{
  "source": "excel_copy_paste" | "csv_upload" | "xlsx_upload" | "mailchimp_import",
  "rows": Array<Record<string, string>>
}
```

**Response:**

```json
{
  "total": 100,
  "created": 85,
  "skipped": 10,
  "restored": 3,
  "invalid": 2,
  "errors": [
    { "rowIndex": 5, "reason": "Missing email and mobile" },
    { "rowIndex": 12, "reason": "Invalid email format" }
  ]
}
```

---

### **1.2 Contact List & Filtering**

#### **Overview**

A comprehensive contact list system with advanced filtering, search, pagination, and custom field support.

#### **Query Parameters**

**Basic Parameters:**

- `page?: number` — Page number (default: 1)
- `limit?: number` — Items per page (default: 50, max: 100)
- `search?: string` — Search across email, first_name, last_name, mobile
- `include_custom_fields?: boolean` — Include custom fields in response

**Tag Filtering:**

- `include_tags?: string[]` — Filter contacts that have ALL of these tags (AND logic)
- `exclude_tags?: string[]` — Filter contacts that have NONE of these tags

**Country Filtering:**

- `exclude_countries?: string[]` — Filter contacts that are NOT from these countries (lowercase ISO codes)

#### **Filtering Logic**

**1. Tag Filtering (include_tags)**

- For each tag in `include_tags`, fetch contacts that have it
- Find intersection of all tag sets (contacts must have ALL tags)
- Applied before main query for efficiency

**2. Tag Filtering (exclude_tags)**

- Fetch contacts that have ANY of the exclude_tags
- Remove them from the result set
- Works with include_tags (applies include first, then excludes)

**3. Country Exclusion**

- Applied at database level using Supabase `.not("country", "in", ...)`
- Country codes normalized to lowercase
- Efficient indexed query

**4. Search**

- Case-insensitive partial match
- Searches across: `email`, `first_name`, `last_name`, `mobile`
- Uses PostgreSQL `ILIKE` operator

#### **Response Format**

```typescript
{
  contacts: Array<{
    id: string;
    organization_id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    mobile: string | null;
    country: string | null; // ISO country code (lowercase)
    source: string;
    is_active: boolean;
    is_subscribed: boolean;
    created_at: string;
    updated_at: string;
    custom_fields?: Array<{
      field_name: string;
      field_value: string;
    }>;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  }
}
```

#### **API Endpoint**

```
GET /api/contacts?page=1&limit=50&search=john&include_tags[]=tag1&include_tags[]=tag2&exclude_countries=us,gb
```

---

### **1.3 Contact Tags System**

#### **Overview**

A complete tag management system for organizing and filtering contacts.

#### **Features**

**1. Tag Creation**

- Create tags with name and optional color
- Tags are scoped by `organization_id`
- Unique constraint: `(organization_id, name)`
- Validation: name length 1-100 characters

**2. Tag Assignment**

- Assign multiple tags to a contact
- Bulk assignment support
- Duplicate assignments are skipped (unique constraint: `(contact_id, tag_id)`)
- Returns counts: `assigned_count`, `skipped_count`, `total_tags`

**3. Tag Listing**

- Paginated tag list
- Optional search by tag name
- Scoped by `organization_id`

#### **API Endpoints**

**Create Tag:**

```
POST /api/tags
{
  "name": "VIP Customer",
  "color": "#FF5733"
}
```

**List Tags:**

```
GET /api/tags?page=1&limit=50&search=vip
```

**Assign Tags:**

```
POST /api/tags/assign
{
  "contact_id": "contact-uuid",
  "tag_ids": ["tag-uuid-1", "tag-uuid-2"]
}
```

**Response:**

```json
{
  "contact_id": "contact-uuid",
  "assigned_count": 2,
  "skipped_count": 0,
  "total_tags": 2
}
```

---

## **2. CAMPAIGNS MODULE**

### **2.1 Campaign Management**

#### **Overview**

Complete campaign lifecycle management with scheduling, recipient generation, and status tracking.

#### **Campaign Status Flow**

```
draft → scheduled → sending → sent
         ↓
       paused
```

#### **Campaign Creation**

**Payload:**

```typescript
{
  name: string;                    // Required, 1-255 characters
  status?: CampaignStatus;         // Optional, defaults to "draft"
  scheduled_at?: string | null;    // Optional ISO timestamp (null = immediate)
}
```

**Validation:**

- Campaign name required and within length limits
- If `scheduled_at` provided:
  - Must be valid ISO timestamp
  - Must be in the future
  - Status automatically set to `"scheduled"`
- If `status = "scheduled"`, `scheduled_at` is required

**Response:**

```typescript
{
  id: string;
  organization_id: string;
  name: string;
  status: CampaignStatus;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  recipient_count?: number;        // Included when fetching campaign details
}
```

#### **API Endpoints**

**Create Campaign:**

```
POST /api/campaigns
{
  "name": "Weekly Newsletter",
  "scheduled_at": "2026-01-25T10:00:00Z"
}
```

**List Campaigns:**

```
GET /api/campaigns?page=1&limit=50&status=scheduled
```

**Get Campaign:**

```
GET /api/campaigns/:id
```

---

### **2.2 Campaign Recipient Generation**

#### **Overview**

Automated recipient generation system that applies sophisticated filtering rules based on campaign target rules.

#### **Recipient Generation Logic**

**1. Campaign Target Rules**
Campaigns can have optional target rules that define inclusion/exclusion criteria:

```typescript
{
  exclude_countries?: string[];      // ISO country codes to exclude
  exclude_bounced?: boolean;         // Exclude contacts that bounced in any campaign
  exclude_unsubscribed?: boolean;   // Exclude unsubscribed contacts (default: true)
  exclude_inactive?: boolean;        // Exclude inactive contacts (default: true)
  include_tags?: string[];          // Include contacts with ALL these tags
  exclude_tags?: string[];           // Exclude contacts with ANY these tags
}
```

**2. Eligible Contact Criteria**

Base criteria (always applied):

- `organization_id` matches
- `is_active = true` (unless `exclude_inactive = false`)
- `is_subscribed = true` (unless `exclude_unsubscribed = false`)

Additional filters (if specified in target rules):

- Country exclusion: `country NOT IN (exclude_countries)`
- Bounce exclusion: Exclude contacts that have `status = "bounced"` in any campaign
- Tag inclusion: Contacts must have ALL tags in `include_tags`
- Tag exclusion: Contacts must NOT have ANY tags in `exclude_tags`

**3. Recipient Generation Process**

```
1. Load campaign and target rules
2. Query eligible contacts (applying all filters)
3. Filter out contacts already in campaign_recipients
4. Bulk insert new recipients (batch size: 500)
5. Return generation result
```

**4. Generation Result**

```typescript
{
  total_recipients: number; // Total recipients for campaign
  added_count: number; // New recipients added
  skipped_count: number; // Recipients already existed
}
```

#### **API Endpoint**

```
POST /api/campaigns/:id/recipients
```

**Response:**

```json
{
  "total_recipients": 150,
  "added_count": 150,
  "skipped_count": 0
}
```

---

### **2.3 Campaign Scheduling**

#### **Overview**

Automated campaign scheduling system that detects ready campaigns and prepares them for sending.

#### **Scheduling Model**

**Immediate Send:**

- `scheduled_at = null`
- Campaign can be sent immediately
- Status can be `"draft"` or other non-scheduled statuses

**Scheduled Send:**

- `scheduled_at = "2026-01-25T10:00:00Z"` (ISO timestamp)
- Status automatically set to `"scheduled"`
- Campaign will be processed when `scheduled_at <= now()`

#### **Scheduler Service (`scheduler.service.ts`)**

**Function: `processScheduledCampaigns(organizationId?)`**

**Logic:**

1. Find campaigns where `status = "scheduled"` AND `scheduled_at <= now()`
2. Update status to `"sending"`
3. Return processing results

**Response:**

```typescript
{
  processed_count: number;
  campaigns: Array<{
    campaign_id: string;
    organization_id: string;
    name: string;
    previous_status: "scheduled";
    new_status: "sending";
  }>;
  errors: Array<{
    campaign_id: string;
    error: string;
  }>;
}
```

---

### **2.4 Campaign Runner Service**

#### **Overview**

Background automation service that orchestrates scheduled campaign execution, recipient generation, and status updates.

#### **Runner Service (`runner.service.ts`)**

**Function: `runCampaignAutomation(organizationId?)`**

**Complete Automation Flow:**

```
1. Find scheduled campaigns (status = "scheduled", scheduled_at <= now())
   ↓
2. For each campaign:
   ├─ Check if recipients exist
   ├─ If no recipients:
   │  └─ Generate recipients (applying all target rules)
   ├─ Update status to "sending"
   └─ Return processing result
```

**Idempotency Guarantees:**

- ✅ If recipients already exist, generation is skipped
- ✅ If status is already `"sending"`, update is skipped
- ✅ Errors in one campaign don't stop processing of others
- ✅ Safe to run multiple times concurrently

**System User:**

- Uses `SYSTEM_USER_ID` environment variable
- Should be a real user in `profiles` table
- Should have appropriate permissions in `organization_members`

**Response:**

```typescript
{
  processed_count: number;
  campaigns: Array<{
    campaign_id: string;
    organization_id: string;
    name: string;
    previous_status: "scheduled";
    new_status: "sending";
    recipients_generated: boolean;
    recipient_count: number;
  }>;
  errors: Array<{
    campaign_id: string;
    error: string;
  }>;
}
```

#### **API Endpoint**

```
POST /api/campaigns/run-automation?organization_id=org-id
```

**Usage:**

- **Cron Jobs:** Call every minute
- **Supabase Edge Functions:** Schedule via Supabase cron
- **Manual Testing:** Call on-demand

---

### **2.5 Bounce Tracking**

#### **Overview**

Comprehensive bounce tracking system that marks recipients as bounced and excludes them from future campaigns.

#### **Bounce Marking**

**Single Recipient:**

```typescript
markRecipientBounced(campaignId, contactId, context);
```

- Updates `status = "bounced"`
- Sets `bounced_at = current timestamp`
- Returns updated recipient

**Bulk Bounce Marking:**

```typescript
bulkMarkRecipientsBounced(campaignId, contactIds, context);
```

- Marks multiple recipients as bounced
- Processes in batches of 500
- Returns count of successfully updated recipients

#### **Bounce Exclusion in Recipient Generation**

When `campaign_target_rules.exclude_bounced = true`:

- Queries all contacts that have `status = "bounced"` in any campaign
- Excludes them from eligible contacts list
- Applied before recipient insertion

#### **Cross-Campaign Bounce Tracking**

- Bounces are tracked across ALL campaigns
- If a contact bounces in any campaign, they can be excluded from future campaigns
- Efficient query using indexed `status = "bounced"` filter

---

## **3. DATABASE SCHEMA**

### **3.1 Contacts Tables**

#### **`contacts` Table**

```sql
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    mobile TEXT,
    country TEXT,                    -- ISO country code (lowercase, normalized)
    source TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_subscribed BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    CONSTRAINT contacts_email_or_mobile_check
        CHECK (email IS NOT NULL OR mobile IS NOT NULL)
);

-- Indexes
CREATE INDEX idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX idx_contacts_mobile ON contacts(mobile) WHERE mobile IS NOT NULL;
CREATE INDEX idx_contacts_is_active ON contacts(organization_id, is_active) WHERE is_active = true;
CREATE INDEX idx_contacts_country ON contacts(organization_id, country) WHERE country IS NOT NULL;
CREATE INDEX idx_contacts_country_filter ON contacts(country) WHERE country IS NOT NULL;

-- Unique constraint: case-insensitive email per organization (active only)
CREATE UNIQUE INDEX idx_contacts_org_email_unique
    ON contacts(organization_id, LOWER(email))
    WHERE email IS NOT NULL AND is_active = true;
```

#### **`contact_tags` Table**

```sql
CREATE TABLE contact_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    UNIQUE(organization_id, name)
);
```

#### **`contact_tag_assignments` Table**

```sql
CREATE TABLE contact_tag_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES contact_tags(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    UNIQUE(contact_id, tag_id)
);
```

#### **`contact_custom_field_definitions` Table**

```sql
CREATE TABLE contact_custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    field_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(organization_id, field_name)
);
```

#### **`contact_custom_field_values` Table**

```sql
CREATE TABLE contact_custom_field_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    field_definition_id UUID NOT NULL REFERENCES contact_custom_field_definitions(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    value_text TEXT,
    value_number NUMERIC,
    value_boolean BOOLEAN,
    value_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(contact_id, field_definition_id)
);
```

---

### **3.2 Campaigns Tables**

#### **`campaigns` Table**

```sql
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL,              -- 'draft', 'scheduled', 'sending', 'sent', 'paused'
    scheduled_at TIMESTAMPTZ NULL,     -- ISO timestamp for scheduled send (NULL = immediate)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_campaigns_organization_id ON campaigns(organization_id);
CREATE INDEX idx_campaigns_status ON campaigns(organization_id, status);
CREATE INDEX idx_campaigns_scheduled_at ON campaigns(status, scheduled_at)
    WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;
```

#### **`campaign_target_rules` Table**

```sql
CREATE TABLE campaign_target_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    include_emails TEXT[] NULL,
    include_tags TEXT[] NULL,
    exclude_tags TEXT[] NULL,
    exclude_countries TEXT[] NULL,     -- ISO country codes (lowercase)
    exclude_unsubscribed BOOLEAN NULL DEFAULT true,
    exclude_inactive BOOLEAN NULL DEFAULT true,
    exclude_bounced BOOLEAN NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(campaign_id)
);
```

#### **`campaign_recipients` Table**

```sql
CREATE TABLE campaign_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status TEXT NOT NULL,              -- 'pending', 'sent', 'delivered', 'bounced', 'opened', 'clicked'
    sent_at TIMESTAMPTZ NULL,
    delivered_at TIMESTAMPTZ NULL,
    opened_at TIMESTAMPTZ NULL,
    clicked_at TIMESTAMPTZ NULL,
    bounced_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(campaign_id, contact_id)
);

-- Indexes
CREATE INDEX idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_contact_id ON campaign_recipients(contact_id);
CREATE INDEX idx_campaign_recipients_status ON campaign_recipients(organization_id, status)
    WHERE status = 'bounced';
```

---

## **4. API ENDPOINTS**

### **4.1 Contacts API**

#### **Import Contacts**

```
POST /api/contacts/import
Authorization: Bearer <token>
Content-Type: application/json

{
  "source": "excel_copy_paste",
  "rows": [
    { "email": "john@example.com", "first_name": "John", "country": "US" },
    { "email": "jane@example.com", "first_name": "Jane", "country": "GB" }
  ]
}
```

#### **List Contacts**

```
GET /api/contacts?page=1&limit=50&search=john&include_tags[]=tag1&exclude_countries=us,gb
Authorization: Bearer <token>
```

#### **Get Contact** (if implemented)

```
GET /api/contacts/:id
Authorization: Bearer <token>
```

---

### **4.2 Tags API**

#### **Create Tag**

```
POST /api/tags
Authorization: Bearer <token>
{
  "name": "VIP Customer",
  "color": "#FF5733"
}
```

#### **List Tags**

```
GET /api/tags?page=1&limit=50&search=vip
Authorization: Bearer <token>
```

#### **Assign Tags**

```
POST /api/tags/assign
Authorization: Bearer <token>
{
  "contact_id": "contact-uuid",
  "tag_ids": ["tag-uuid-1", "tag-uuid-2"]
}
```

---

### **4.3 Campaigns API**

#### **Create Campaign**

```
POST /api/campaigns
Authorization: Bearer <token>
{
  "name": "Weekly Newsletter",
  "scheduled_at": "2026-01-25T10:00:00Z"
}
```

#### **List Campaigns**

```
GET /api/campaigns?page=1&limit=50&status=scheduled
Authorization: Bearer <token>
```

#### **Get Campaign**

```
GET /api/campaigns/:id
Authorization: Bearer <token>
```

#### **Generate Recipients**

```
POST /api/campaigns/:id/recipients
Authorization: Bearer <token>
```

#### **Run Campaign Automation** (Background Service)

```
POST /api/campaigns/run-automation?organization_id=org-id
Authorization: Bearer <token> (optional for system calls)
```

---

## **5. ARCHITECTURE PATTERNS**

### **5.1 Layered Architecture**

All modules follow a consistent layered architecture:

```
API/Controller Layer
    ↓
Service Layer (Business Logic)
    ↓
Repository Layer (Data Access)
    ↓
Supabase (Database + RLS)
```

**Responsibilities:**

**Controller Layer:**

- Parse request/query parameters
- Authenticate user and get organization context
- Call service layer
- Transform errors to HTTP responses
- Return JSON responses

**Service Layer:**

- Validate business rules
- Enforce organization context
- Orchestrate repository calls
- Return normalized responses
- Throw errors for invalid operations

**Repository Layer:**

- Direct database interactions
- All queries scoped by `organization_id`
- Handle database errors
- Return domain objects

### **5.2 Multi-Tenancy**

**Organization Scoping:**

- All queries include `organization_id` filter
- `organization_id` always from auth context, never from client input
- RLS policies enforce organization boundaries
- Cross-organization data access prevented

**Context Pattern:**

```typescript
interface Context {
  organization_id: string; // From auth, not client
  user_id: string; // From auth, not client
}
```

### **5.3 Error Handling**

**Error Types:**

- `unauthorized` — Missing or invalid authentication
- `forbidden` — User not member of organization
- `validation_error` — Invalid input data
- `not_found` — Resource doesn't exist
- `internal_server_error` — Unexpected errors

**Error Response Format:**

```json
{
  "error": "validation_error",
  "message": "Campaign name is required"
}
```

### **5.4 Type Safety**

**Type Definitions:**

- Entity types (aligned with database schema)
- DTO types (for API responses)
- Payload types (for API requests, NO `organization_id`)
- Context types (for internal operations)

**Example:**

```typescript
// Entity (database)
interface Campaign {
  organization_id: string;
  // ...
}

// Payload (client input)
interface CreateCampaignPayload {
  // NO organization_id
  name: string;
  scheduled_at?: string | null;
}

// Context (internal)
interface CampaignContext {
  organization_id: string; // Enforced from auth
  user_id: string; // Enforced from auth
}
```

### **5.5 Pagination**

**Offset-Based Pagination:**

- `page`: Page number (1-based)
- `limit`: Items per page (1-100, default: 50)
- Returns: `total`, `total_pages`, `page`, `limit`

**Example:**

```typescript
{
  pagination: {
    page: 1,
    limit: 50,
    total: 150,
    total_pages: 3
  }
}
```

### **5.6 Bulk Operations**

**Batching Strategy:**

- Batch size: 500 items
- Handles partial failures gracefully
- Continues processing on errors
- Returns success count

**Example:**

```typescript
// Insert 1500 contacts in batches of 500
// If batch 2 fails, batches 1 and 3 still succeed
// Returns total successfully inserted count
```

---

## **6. KEY FEATURES SUMMARY**

### **6.1 Contact Management**

**Import System (to be implemented):**

- Multi-source import (Excel, CSV, XLSX, Mailchimp)
- Automatic field detection and normalization
- Email deduplication (case-insensitive)
- Soft-delete restoration
- Custom field auto-creation
- Bulk insert with error handling

**List & Filtering (to be implemented):**

- Paginated contact list
- Full-text search (email, name, mobile)
- Tag filtering (include/exclude)
- Country exclusion
- Custom field inclusion
- Efficient database queries

**Tag Management (to be implemented):**

- Create and list tags
- Assign tags to contacts
- Bulk tag assignment
- Tag-based filtering

### **6.2 Campaign Management**

**Campaign Lifecycle (to be implemented):**

- Create campaigns (draft/scheduled)
- List campaigns with filters
- Get campaign details with recipient count
- Campaign scheduling support

**Recipient Generation (to be implemented):**

- Automatic recipient generation
- Sophisticated filtering rules:
  - Country exclusion
  - Bounce exclusion
  - Unsubscribed exclusion
  - Inactive exclusion
  - Tag inclusion/exclusion
- Bulk recipient insertion
- Duplicate handling

**Scheduling & Automation (to be implemented):**

- Scheduled campaign support (`scheduled_at`)
- Background runner service
- Automatic recipient generation
- Status updates (scheduled → sending)
- Idempotent execution
- Cron/Edge Function compatible

**Bounce Tracking (to be implemented):**

- Mark recipients as bounced
- Bulk bounce marking
- Cross-campaign bounce exclusion
- Bounce timestamp tracking

---

## **7. DATABASE MIGRATIONS**

### **7.1 Add Country to Contacts**

**File:** `migrations/add_country_to_contacts.sql`

```sql
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS country TEXT;

CREATE INDEX IF NOT EXISTS idx_contacts_country
    ON contacts(organization_id, country)
    WHERE country IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_country_filter
    ON contacts(country)
    WHERE country IS NOT NULL;
```

### **7.2 Add Scheduled At to Campaigns**

**File:** `migrations/add_scheduled_at_to_campaigns.sql`

```sql
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at
    ON campaigns(status, scheduled_at)
    WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;
```

---

## **8. CONFIGURATION**

### **8.1 Environment Variables**

```bash
# System user for automated operations
SYSTEM_USER_ID=your-system-user-uuid

# Supabase configuration (in your Supabase client setup)
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### **8.2 System User Setup**

1. Create a system user in `profiles` table
2. Add user to `organization_members` for each organization
3. Set `SYSTEM_USER_ID` environment variable
4. This user will be used for automated campaign operations

---

## **9. PERFORMANCE CONSIDERATIONS**

### **9.1 Indexing Strategy**

**Contacts:**

- `(organization_id, is_active)` — For active contact queries
- `(organization_id, country)` — For country filtering
- `LOWER(email)` — For case-insensitive email uniqueness
- `(organization_id, LOWER(email))` — For deduplication

**Campaigns:**

- `(status, scheduled_at)` — For scheduler queries
- `(organization_id, status)` — For campaign filtering

**Campaign Recipients:**

- `(organization_id, status)` — For bounce queries
- `(campaign_id, contact_id)` — Unique constraint

**Tags:**

- `(organization_id, name)` — Unique constraint
- `(contact_id, tag_id)` — Unique constraint

### **9.2 Query Optimization**

**Tag Filtering:**

- Applied before main query (reduces dataset)
- Uses Set operations for intersection/exclusion
- Efficient for large contact lists

**Country Filtering:**

- Applied at database level (indexed)
- Uses `.not("country", "in", ...)` for exclusion
- Normalized to lowercase for consistency

**Bounce Exclusion:**

- Single query to fetch all bounced contact IDs
- Filtered in memory after main query
- Efficient for large datasets

### **9.3 Bulk Operations**

**Batch Size:** 500 items per batch

- Balances performance and memory usage
- Handles partial failures gracefully
- Continues processing on errors

---

## **10. SECURITY**

### **10.1 Authentication**

- All endpoints require `Authorization: Bearer <token>` header
- Token validated via Supabase Auth
- User must be member of organization

### **10.2 Authorization**

- `organization_id` always from auth context
- Never accepted from client input
- RLS policies enforce organization boundaries
- All queries scoped by `organization_id`

### **10.3 Input Validation**

- All payloads validated in service layer
- Type checking for all inputs
- Length limits enforced
- Format validation (ISO timestamps, etc.)

---

## **11. TESTING & MONITORING**

### **11.1 Error Tracking**

All errors are:

- Logged with context
- Returned in structured format
- Include campaign/contact IDs for debugging

### **11.2 Idempotency**

All operations are idempotent:

- Safe to retry
- Safe for concurrent execution
- Status checks prevent duplicate operations

### **11.3 Monitoring Points**

**Key Metrics to Monitor:**

- Campaign automation execution time
- Recipient generation counts
- Import success/failure rates
- Bounce rates
- Query performance

---

## **12. FUTURE EXTENSIONS**

### **12.1 Planned Features**

- Segment-based targeting
- Advanced custom field filtering
- Campaign analytics
- Email template integration
- Webhook support for campaign events

### **12.2 Scalability Considerations**

- Consider materialized views for complex queries
- Implement cursor-based pagination for very large datasets
- Add caching layer for frequently accessed data
- Consider event-driven architecture for campaign processing

---

## **13. USAGE EXAMPLES**

### **13.1 Complete Campaign Workflow**

```typescript
// 1. Create campaign
POST /api/campaigns
{
  "name": "Product Launch",
  "scheduled_at": "2026-01-25T10:00:00Z"
}

// 2. Create target rules (via database or future API)
INSERT INTO campaign_target_rules (campaign_id, organization_id, exclude_countries, exclude_bounced)
VALUES ('campaign-id', 'org-id', ARRAY['us', 'gb'], true);

// 3. Generate recipients (manual or automatic)
POST /api/campaigns/:id/recipients

// 4. Runner automatically processes when scheduled_at arrives
// (via cron or edge function calling POST /api/campaigns/run-automation)

// 5. Campaign status changes: scheduled → sending
```

### **13.2 Contact Import Workflow**

```typescript
// 1. Import contacts
POST /api/contacts/import
{
  "source": "csv_upload",
  "rows": [
    { "email": "user@example.com", "first_name": "User", "country": "US" },
    // ... more rows
  ]
}

// 2. List contacts with filters
GET /api/contacts?include_tags[]=vip&exclude_countries=us

// 3. Assign tags
POST /api/tags/assign
{
  "contact_id": "contact-id",
  "tag_ids": ["tag-id-1", "tag-id-2"]
}
```

---

## **14. FILE STRUCTURE**

```
apps/api/src/modules/
├── contacts/
│   ├── import/
│   │   ├── import.controller.ts
│   │   ├── import.service.ts
│   │   ├── import.normalizer.ts
│   │   ├── import.deduplicator.ts
│   │   ├── import.repository.ts
│   │   └── import.types.ts
│   └── list/
│       ├── list.controller.ts
│       ├── list.service.ts
│       ├── list.repository.ts
│       └── list.types.ts
├── campaigns/
│   ├── campaigns.controller.ts
│   ├── campaigns.service.ts
│   ├── campaigns.repository.ts
│   ├── campaigns.types.ts
│   ├── recipients.service.ts
│   ├── recipients.repository.ts
│   ├── scheduler.service.ts
│   ├── runner.service.ts
│   ├── runner.controller.ts
│   └── README-runner.md
└── tags/
    ├── tags.controller.ts
    ├── tags.service.ts
    ├── tags.repository.ts
    └── tags.types.ts

apps/web/app/api/
├── contacts/
│   ├── route.ts
│   └── import/
│       └── route.ts
├── campaigns/
│   ├── route.ts
│   ├── [id]/
│   │   ├── route.ts
│   │   └── recipients/
│   │       └── route.ts
│   └── run-automation/
│       └── route.ts
└── tags/
    ├── route.ts
    └── assign/
        └── route.ts

migrations/
├── add_country_to_contacts.sql
└── add_scheduled_at_to_campaigns.sql
```

---

## **15. CONCLUSION (REFERENCE)**

This document describes the **target** behavior for Contact and Campaign modules. In the fresh start, none of this is considered done; use it as a specification when implementing Phase 2+.

**Contact Management (to be implemented):**

- Multi-source import with normalization
- Advanced filtering and search
- Tag management
- Custom fields support

**Campaign Management (to be implemented):**

- Campaign lifecycle management
- Sophisticated recipient generation
- Automated scheduling
- Bounce tracking

**Architecture goals:**

- Layered, maintainable codebase
- Multi-tenant security
- Type-safe implementation
- Scalable design patterns
