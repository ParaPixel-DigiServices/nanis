# **CONTACTS MODULE — SERVICE LAYER ARCHITECTURE**

---

## **1. Purpose of This Document**

This document defines the **service-layer architecture** for the Contacts module in a multi-tenant SaaS using Supabase with Row Level Security (RLS).

The architecture covers:

* Layer separation and responsibilities
* Function responsibilities per layer
* Data flow between layers
* Error handling model
* Boundaries between API and database layers
* Integration with custom fields and imports

**Note:** This document describes **conceptual architecture and behavior**, not implementation code.

---

## **2. Architecture Overview**

### **2.1 Enterprise Multi-Layer Architecture**

The Contacts module follows an **enterprise multi-layer architecture** designed for scalability, maintainability, and multi-tenancy:

```
┌─────────────────────────────────────┐
│  1. API/Controller Layer           │
│     (Next.js API Routes)           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. Policy/Guard Layer              │
│     (Authorization & Org Rules)     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  3. Service Layer                   │
│     - ContactCommandService (write) │
│     - ContactQueryService (read)    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  4. Domain Model Layer              │
│     (Business Rules & Invariants)    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  5. Repository/Data Layer            │
│     (Supabase Client)                │
└──────────────┬──────────────────────┘
               │
               ▼
         Supabase Database
         (with RLS)
               │
               ▼
┌─────────────────────────────────────┐
│  6. Event Layer (Async Future)      │
│     (System Events & Integrations)  │
└─────────────────────────────────────┘
```

### **2.2 Layer Responsibilities**

**API/Controller Layer:**
* HTTP request/response handling
* Request validation (format, required fields)
* Authentication (verify user session)
* Response formatting
* Error response mapping

**Policy/Guard Layer:**
* Authorization checks (can user perform action?)
* Organization membership verification
* Role-based access control (future: owner, admin, member, viewer)
* Multi-tenant isolation enforcement
* Centralized permission logic

**Service Layer:**
* Business logic orchestration
* Command/Query separation (CQRS-lite)
* Custom field processing coordination
* Import integration
* Transaction coordination
* Event emission (after successful operations)

**Domain Model Layer:**
* Business rule encapsulation
* Data normalization (email, mobile)
* State validation (canBeCreated, canBeUpdated)
* Invariant enforcement
* Deduplication rules
* Merge logic
* Single source of truth for contact behavior

**Repository/Data Layer:**
* Database queries (Supabase client)
* RLS enforcement (via Supabase)
* Data transformation (DB ↔ Domain)
* Error handling
* Query optimization

**Event Layer (Future):**
* System event emission (ContactCreated, ContactUpdated, etc.)
* Async event processing
* Integration with automations, analytics, webhooks
* Audit logging
* Search indexing triggers

---

## **3. API/Controller Layer**

### **3.1 Purpose**

Handles HTTP requests and responses, validates input, and delegates to service layer.

### **3.2 Responsibilities**

* **Request Parsing**: Extract and validate request body, query params, route params
* **Authentication**: Verify user is authenticated (via Supabase Auth)
* **Authorization**: Verify user has access to organization (via AuthContext)
* **Input Validation**: Validate request data format and required fields
* **Error Mapping**: Map service errors to HTTP status codes
* **Response Formatting**: Format service responses as JSON

### **3.3 Functions**

#### **3.3.1 `POST /api/contacts` - Create Contact**

**Responsibilities:**
1. Extract request body
2. Validate required fields (`organization_id`, at least one of `email` or `mobile`)
3. Get authenticated user from session
4. Verify user is member of `organization_id`
5. Call `ContactService.createContact()`
6. Map service errors to HTTP responses
7. Return created contact or error

**Error Mapping:**
* Service error: `DuplicateEmailError` → `409 Conflict`
* Service error: `OrganizationAccessDeniedError` → `403 Forbidden`
* Service error: `ValidationError` → `400 Bad Request`
* Service error: `DatabaseError` → `500 Internal Server Error`

---

#### **3.3.2 `GET /api/contacts` - List Contacts**

**Responsibilities:**
1. Extract query parameters (`organization_id`, `page`, `limit`, filters)
2. Validate `organization_id` is provided
3. Get authenticated user from session
4. Verify user is member of `organization_id`
5. Call `ContactService.listContacts()`
6. Format paginated response
7. Return contact list or error

---

#### **3.3.3 `GET /api/contacts/:id` - Get Contact**

**Responsibilities:**
1. Extract route parameter (`id`)
2. Extract query parameter (`organization_id`)
3. Get authenticated user from session
4. Verify user is member of `organization_id`
5. Call `ContactService.getContactById()`
6. Return contact or error

---

#### **3.3.4 `PATCH /api/contacts/:id` - Update Contact**

**Responsibilities:**
1. Extract route parameter (`id`)
2. Extract request body (partial update)
3. Extract query parameter (`organization_id`)
4. Get authenticated user from session
5. Verify user is member of `organization_id`
6. Call `ContactService.updateContact()`
7. Return updated contact or error

---

#### **3.3.5 `DELETE /api/contacts/:id` - Delete Contact**

**Responsibilities:**
1. Extract route parameter (`id`)
2. Extract query parameter (`organization_id`)
3. Get authenticated user from session
4. Verify user is member of `organization_id`
5. Call `ContactService.deleteContact()` (soft delete)
6. Return success or error

---

### **3.4 Error Response Format**

**Standard Error Response:**
```
{
  error: "error_code",
  message: "Human-readable error message",
  details?: { ... } // Optional additional context
}
```

**Examples:**
```
409 Conflict:
{
  error: "duplicate_email",
  message: "A contact with this email already exists",
  details: { existing_contact_id: "uuid" }
}

403 Forbidden:
{
  error: "organization_access_denied",
  message: "You do not have access to this organization"
}
```

---

## **4. Policy/Guard Layer**

### **4.1 Purpose**

Centralizes authorization logic and multi-tenant access control. Prevents authorization logic from scattering across API and Service layers.

### **4.2 Responsibilities**

* **Authorization Checks**: Verify user can perform specific actions on contacts
* **Organization Access**: Verify user membership in organization
* **Role-Based Access**: Enforce role-based permissions (owner, admin, member, viewer, etc.)
* **Multi-Tenant Isolation**: Ensure users can only access their organization's data
* **Permission Centralization**: Single source of truth for access rules

### **4.3 Core Policy: `ContactPolicy`**

#### **4.3.1 `canCreate(user, organization)`**

**Input:**
* `user`: Authenticated user object
* `organization`: Organization object

**Behavior:**
1. Check user is authenticated
2. Check user is member of organization
3. Check user role allows contact creation (future: exclude `viewer` role)
4. Return: `true` if allowed, `false` otherwise

**Error Cases:**
* `OrganizationAccessDeniedError` - User not member of organization
* `InsufficientPermissionsError` - User role doesn't allow creation (future)

---

#### **4.3.2 `canRead(user, contact)`**

**Input:**
* `user`: Authenticated user object
* `contact`: Contact object (with organization_id)

**Behavior:**
1. Check user is authenticated
2. Check user is member of contact's organization
3. Check user role allows contact reading (future: all roles except blocked)
4. Return: `true` if allowed, `false` otherwise

**Error Cases:**
* `OrganizationAccessDeniedError` - User not member of contact's organization

---

#### **4.3.3 `canUpdate(user, contact)`**

**Input:**
* `user`: Authenticated user object
* `contact`: Contact object (with organization_id)

**Behavior:**
1. Check user is authenticated
2. Check user is member of contact's organization
3. Check user role allows contact updates (future: exclude `viewer` role)
4. Check contact is not deleted (optional: prevent updates to deleted contacts)
5. Return: `true` if allowed, `false` otherwise

**Error Cases:**
* `OrganizationAccessDeniedError` - User not member of contact's organization
* `InsufficientPermissionsError` - User role doesn't allow updates (future)
* `ContactDeletedError` - Contact is soft-deleted (optional)

---

#### **4.3.4 `canDelete(user, contact)`**

**Input:**
* `user`: Authenticated user object
* `contact`: Contact object (with organization_id)

**Behavior:**
1. Check user is authenticated
2. Check user is member of contact's organization
3. Check user role allows contact deletion (future: only `owner`, `admin` roles)
4. Return: `true` if allowed, `false` otherwise

**Error Cases:**
* `OrganizationAccessDeniedError` - User not member of contact's organization
* `InsufficientPermissionsError` - User role doesn't allow deletion (future)

---

#### **4.3.5 `canList(user, organization)`**

**Input:**
* `user`: Authenticated user object
* `organization`: Organization object

**Behavior:**
1. Check user is authenticated
2. Check user is member of organization
3. Check user role allows contact listing (future: all roles except blocked)
4. Return: `true` if allowed, `false` otherwise

**Error Cases:**
* `OrganizationAccessDeniedError` - User not member of organization

---

### **4.4 Future Role Support**

**Role Hierarchy (Conceptual):**
* `owner` - Full access (create, read, update, delete)
* `admin` - Full access (create, read, update, delete)
* `member` - Create, read, update (no delete)
* `viewer` - Read only
* `billing` - No contact access (future)
* `support` - Read only (future)
* `automation_bot` - System-level access (future)

**Policy Extension Pattern:**
```
ContactPolicy.canCreate(user, organization)
  → Check role in [owner, admin, member]
  → Return true/false

ContactPolicy.canDelete(user, contact)
  → Check role in [owner, admin]
  → Return true/false
```

---

### **4.5 Integration with API Layer**

**API Controller Pattern:**
```
API Controller
  │
  ├─► Authenticate user
  ├─► Get organization from context
  │
  └─► ContactPolicy.canCreate(user, organization)
      │
      ├─► If false: Return 403 Forbidden
      └─► If true: Proceed to Service Layer
```

**Benefits:**
* Authorization logic centralized
* Easy to add new roles
* Consistent permission checks
* Testable in isolation

---

## **5. Service Layer**

### **5.1 Purpose**

Orchestrates business logic, coordinates between domain models and repositories, handles custom fields and imports, emits system events.

### **5.2 CQRS-Lite Separation**

The Service Layer is conceptually split into **Command** (write) and **Query** (read) services:

**ContactCommandService** (Write Operations):
* `createContact()` - Create new contact
* `updateContact()` - Update existing contact
* `deleteContact()` - Soft delete contact
* `mergeContacts()` - Merge duplicate contacts (future)

**ContactQueryService** (Read Operations):
* `getContactById()` - Get single contact
* `listContacts()` - List contacts with filters
* `searchContacts()` - Search contacts (future)
* `getContactStats()` - Get contact statistics (future)

**Why CQRS-Lite?**
* Reads scale differently than writes
* Custom fields & filters explode query logic
* Imports hammer write paths
* Future: Separate read/write databases possible

**Note:** For MVP, these can be implemented as separate methods in a single `ContactService` class. The separation is architectural, not necessarily requiring separate classes initially.

---

### **5.3 Core Service: `ContactCommandService`**

### **4.1 Purpose**

Orchestrates business logic, coordinates between repository and external services, handles deduplication and normalization.

### **4.2 Responsibilities**

* **Business Logic**: Contact creation, update, deletion rules
* **Data Normalization**: Email lowercase, mobile formatting
* **Deduplication**: Check for duplicates, apply strategies
* **Custom Fields**: Coordinate custom field value creation/updates
* **Import Integration**: Handle import-specific logic
* **Transaction Coordination**: Coordinate multiple database operations
* **Error Handling**: Catch repository errors, transform to service errors

#### **5.3.1 `createContact(data, context)`**

**Input:**
* `data`: Contact data (email, first_name, last_name, mobile, etc.)
* `context`: Request context (user_id, organization_id, source, import_job_id)

**Responsibilities:**
1. **Create domain model**: Call `ContactDomain.create(data)` to normalize and validate
2. **Check duplicate**: Call `ContactDomain.checkDuplicate()` via repository
3. **Apply deduplication**:
   - If duplicate found and `source = 'manual'`: Throw `DuplicateEmailError`
   - If duplicate found and `source = 'import'`: Apply import strategy (skip/merge)
4. **Prepare contact data**: Use domain model's `toDatabase()` method
5. **Create contact**: Call `ContactRepository.create()`
6. **Handle custom fields**: If custom field values provided, call `CustomFieldService.setValues()`
7. **Emit event**: Emit `ContactCreated` event (async)
8. **Return**: Created contact with custom fields

**Error Cases:**
* `DuplicateEmailError` - Active contact with same email exists
* `ValidationError` - Missing required fields or invalid data
* `OrganizationAccessDeniedError` - User not member of organization

---

#### **5.3.2 `updateContact(id, data, context)`**

**Input:**
* `id`: Contact ID
* `data`: Partial contact data to update
* `context`: Request context (user_id, organization_id)

**Responsibilities:**
1. **Get existing contact**: Call `ContactRepository.findById()` with organization_id
2. **Load domain model**: Create `ContactDomain` from existing contact
3. **Update domain model**: Call `ContactDomain.update(data)` to normalize and validate
4. **If email changed**: Call `ContactDomain.checkDuplicate()` (excluding current contact)
5. **Validate state**: Call `ContactDomain.canBeUpdated()` to check invariants
6. **Update contact**: Call `ContactRepository.update()` with domain model's `toDatabase()`
7. **Handle custom fields**: If custom field values provided, update via `CustomFieldService`
8. **Emit event**: Emit `ContactUpdated` event (async)
9. **Return**: Updated contact with custom fields

**Error Cases:**
* `ContactNotFoundError` - Contact doesn't exist or not accessible
* `DuplicateEmailError` - New email conflicts with existing active contact
* `ValidationError` - Invalid data format

---

#### **5.3.3 `deleteContact(id, context)`**

**Input:**
* `id`: Contact ID
* `context`: Request context (user_id, organization_id)

**Responsibilities:**
1. **Get existing contact**: Call `ContactRepository.findById()` with organization_id
2. **Load domain model**: Create `ContactDomain` from existing contact
3. **Validate state**: Call `ContactDomain.canBeDeleted()` to check invariants
4. **Soft delete**: Call `ContactRepository.softDelete()` (sets `is_active = false`, `deleted_at = NOW()`)
5. **Emit event**: Emit `ContactDeleted` event (async)
6. **Return**: Success confirmation

**Error Cases:**
* `ContactNotFoundError` - Contact doesn't exist or not accessible
* `ContactAlreadyDeletedError` - Contact already soft-deleted (optional)

---

### **5.4 Core Service: `ContactQueryService`**

#### **5.4.1 `getContactById(id, context)`**

**Input:**
* `id`: Contact ID
* `context`: Request context (user_id, organization_id, includeCustomFields?)

**Responsibilities:**
1. **Get contact**: Call `ContactRepository.findById()` with organization_id
2. **Validate access**: Verify contact belongs to organization
3. **Get custom fields**: If `includeCustomFields = true`, call `CustomFieldService.getValues()`
4. **Return**: Contact with optional custom fields

**Error Cases:**
* `ContactNotFoundError` - Contact doesn't exist or not accessible

---

#### **5.4.2 `listContacts(filters, pagination, context)`**

**Input:**
* `filters`: Filter criteria (is_active, is_subscribed, source, search, etc.)
* `pagination`: Page number, limit, cursor
* `context`: Request context (user_id, organization_id)

**Responsibilities:**
1. **Validate organization access**: Verify user is member of organization
2. **Apply default filters**: `is_active = true`, `deleted_at IS NULL` (unless `include_deleted = true`)
3. **Build query**: Combine filters with organization_id
4. **Get contacts**: Call `ContactRepository.findMany()`
5. **Get custom fields**: If requested, batch fetch custom fields for all contacts
6. **Return**: Paginated list of contacts with optional custom fields

**Error Cases:**
* `OrganizationAccessDeniedError` - User not member of organization

---

### **5.5 Supporting Services**

#### **5.5.1 `CustomFieldService`**

**Purpose:** Handles custom field value operations

**Functions:**
* `setValues(contactId, fieldValues)` - Set custom field values for contact
* `getValues(contactId)` - Get all custom field values for contact
* `updateValue(contactId, fieldDefinitionId, value)` - Update single custom field value
* `deleteValue(contactId, fieldDefinitionId)` - Delete custom field value

**Integration:**
* Called by `ContactService` during create/update operations
* Uses `CustomFieldRepository` for data access

---

#### **5.5.2 `ImportService` (Future)**

**Purpose:** Handles import-specific contact creation

**Functions:**
* `createContactFromImport(importRecord, importJob)` - Create contact from import record
* `applyDeduplicationStrategy(contactData, strategy)` - Apply import deduplication strategy

**Integration:**
* Called during import processing
* Uses `ContactService.createContact()` with import context
* Handles batch processing and error aggregation

---

### **5.6 Event Emission**

**System Events (Conceptual):**

After successful operations, services emit events:

* `ContactCreated` - Emitted after contact creation
* `ContactUpdated` - Emitted after contact update
* `ContactDeleted` - Emitted after contact soft delete
* `ContactMerged` - Emitted after contact merge (future)
* `ContactImported` - Emitted after import creation (future)

**Event Payload Structure:**
```
ContactCreated {
  contact_id: UUID,
  organization_id: UUID,
  created_by: UUID,
  source: 'manual' | 'csv' | 'excel' | 'mailchimp',
  timestamp: ISO8601
}
```

**Event Integration (Future):**
* Automations: Trigger workflows on contact events
* Analytics: Track contact lifecycle metrics
* Webhooks: Notify external systems
* Audit Logs: Record all contact changes
* Search Indexing: Update search indices
* AI Enrichment: Trigger enrichment processes

**Implementation Note:**
* MVP: Events can be simple function calls or in-memory event bus
* Future: Move to dedicated event system (Kafka, Supabase Realtime, etc.)

---

---

## **6. Domain Model Layer**

### **6.1 Purpose**

Encapsulates business rules, prevents invalid states, and provides a single source of truth for contact behavior. Prevents business logic from leaking into services, imports, and automations.

### **6.2 Responsibilities**

* **Business Rule Encapsulation**: All contact-related business rules live here
* **State Validation**: Ensure contact can be created, updated, or deleted
* **Data Normalization**: Email and mobile normalization
* **Invariant Enforcement**: Prevent invalid contact states
* **Deduplication Logic**: Centralized duplicate checking rules
* **Merge Logic**: Contact merging rules (future)

### **6.3 Core Domain Model: `ContactDomain`**

#### **6.3.1 `create(data)` - Static Factory Method**

**Input:** Raw contact data

**Behavior:**
1. **Normalize email**: `LOWER(TRIM(email))` if provided
2. **Normalize mobile**: `TRIM(mobile)` if provided
3. **Validate required fields**: At least email OR mobile required
4. **Set defaults**: `is_active = true`, `is_subscribed = true`
5. **Create domain object**: Return `ContactDomain` instance

**Validation Rules:**
* Email must be valid format (if provided)
* Mobile must be valid format (if provided)
* At least one of email or mobile required
* First name and last name can be null

**Error Cases:**
* `ValidationError` - Invalid data format or missing required fields

---

#### **6.3.2 `update(data)` - Instance Method**

**Input:** Partial contact data to update

**Behavior:**
1. **Normalize email**: If email changed, normalize it
2. **Normalize mobile**: If mobile changed, normalize it
3. **Validate changes**: Ensure updated data is valid
4. **Update domain object**: Modify internal state
5. **Return**: Updated `ContactDomain` instance

**Validation Rules:**
* Email format must be valid (if changed)
* Mobile format must be valid (if changed)
* Cannot update to invalid state

**Error Cases:**
* `ValidationError` - Invalid data format

---

#### **6.3.3 `canBeCreated()` - Instance Method**

**Behavior:**
1. Check email is normalized
2. Check mobile is normalized (if provided)
3. Check at least one of email or mobile exists
4. Check no invalid state combinations
5. Return: `true` if valid, `false` otherwise

**Invariants:**
* Email must be unique (checked externally via repository)
* Contact must belong to organization (enforced by RLS)
* Contact must have at least email or mobile

---

#### **6.3.4 `canBeUpdated()` - Instance Method**

**Behavior:**
1. Check contact is not deleted (`is_active = true`, `deleted_at IS NULL`)
2. Check updated fields are valid
3. Check no invalid state transitions
4. Return: `true` if valid, `false` otherwise

**Invariants:**
* Cannot update deleted contact (optional rule)
* Email uniqueness must be maintained (checked externally)
* State transitions must be valid

---

#### **6.3.5 `canBeDeleted()` - Instance Method**

**Behavior:**
1. Check contact exists
2. Check contact is not already deleted (optional)
3. Return: `true` if valid, `false` otherwise

**Invariants:**
* Contact must exist
* Contact should not be already deleted (optional)

---

#### **6.3.6 `isActive()` - Instance Method**

**Behavior:**
* Return: `true` if `is_active = true AND deleted_at IS NULL`, `false` otherwise

---

#### **6.3.7 `checkDuplicate(email, organizationId, repository, excludeContactId?)` - Static Method**

**Input:** Email, organization ID, repository instance, optional exclude contact ID

**Behavior:**
1. Normalize email
2. Call `repository.findByEmail()` with:
   - `organization_id = organizationId`
   - `email = normalizedEmail`
   - `is_active = true`
   - `deleted_at IS NULL`
   - `id != excludeContactId` (if provided)
3. Return: Contact if found, null if not found

**Purpose:** Centralize duplicate checking logic

---

#### **6.3.8 `applyMerge(sourceContact, targetContact)` - Static Method (Future)**

**Input:** Source contact (to merge), target contact (to keep)

**Behavior:**
1. Merge fields: Prefer non-null values, prefer target for conflicts
2. Merge custom fields: Combine custom field values
3. Return: Merged contact domain object

**Purpose:** Centralize merge logic for deduplication

---

#### **6.3.9 `toDatabase()` - Instance Method**

**Behavior:**
* Convert domain object to database row format
* Return: Plain object suitable for repository insertion/update

**Purpose:** Transform domain model to database representation

---

#### **6.3.10 `fromDatabase(row)` - Static Factory Method**

**Input:** Database row

**Behavior:**
* Create domain object from database row
* Return: `ContactDomain` instance

**Purpose:** Transform database representation to domain model

---

### **6.4 Supporting Domain Models**

#### **6.4.1 `DeduplicationRules` (Conceptual)**

**Purpose:** Encapsulate deduplication strategy logic

**Methods:**
* `applyStrategy(contactData, existingContact, strategy)` - Apply skip/merge/create/error strategy
* `shouldSkip(contactData, existingContact)` - Determine if contact should be skipped
* `shouldMerge(contactData, existingContact)` - Determine if contact should be merged

**Integration:**
* Used by `ContactCommandService` during import processing
* Centralizes deduplication decision logic

---

### **6.5 Benefits of Domain Model Layer**

**Without Domain Models:**
* Business rules leak into services
* Imports, automations, API duplicate normalization logic
* Refactors become difficult
* Inconsistent behavior across entry points

**With Domain Models:**
* Single source of truth for contact behavior
* Business rules centralized and testable
* Easy to extend (new rules added to domain model)
* Consistent behavior across all entry points (API, imports, automations)

---

## **7. Repository/Data Layer**

### **7.1 Purpose**

Handles all database interactions via Supabase client, enforces RLS through Supabase, transforms data between database and domain models.

### **7.2 Responsibilities**

* **Database Queries**: All SELECT, INSERT, UPDATE operations
* **RLS Enforcement**: Supabase RLS policies automatically enforce organization access
* **Data Transformation**: Convert between database rows and domain models
* **Error Handling**: Catch Supabase errors, transform to repository errors
* **Query Building**: Construct Supabase queries with filters, pagination

### **7.3 Core Repository: `ContactRepository`**

#### **7.3.1 `create(contactData)`**

**Input:** Contact data object

**Behavior:**
1. Build Supabase insert query
2. Execute: `supabase.from('contacts').insert(contactData)`
3. RLS automatically enforces organization access
4. Return: Created contact row

**Error Handling:**
* Supabase unique constraint violation → Transform to `DuplicateEmailError`
* Supabase RLS violation → Transform to `OrganizationAccessDeniedError`
* Other Supabase errors → Transform to `DatabaseError`

---

#### **7.3.2 `findById(id, organizationId)`**

**Input:** Contact ID, organization ID

**Behavior:**
1. Build Supabase select query:
   ```
   supabase.from('contacts')
     .select('*')
     .eq('id', id)
     .eq('organization_id', organizationId)
     .eq('is_active', true)
     .is('deleted_at', null)
     .single()
   ```
2. RLS automatically filters by organization
3. Return: Contact row or null

**Error Handling:**
* Supabase "not found" → Return null (service layer handles as `ContactNotFoundError`)
* RLS violation → Return null (treated as not found)

---

#### **7.3.3 `findByEmail(email, organizationId, excludeContactId?)`**

**Input:** Email, organization ID, optional exclude contact ID

**Behavior:**
1. Normalize email: `LOWER(TRIM(email))`
2. Build Supabase select query:
   ```
   supabase.from('contacts')
     .select('*')
     .eq('organization_id', organizationId)
     .eq('email', normalizedEmail) // Supabase handles case-insensitive via index
     .eq('is_active', true)
     .is('deleted_at', null)
     .neq('id', excludeContactId) // If provided
     .maybeSingle()
   ```
3. Return: Contact row or null

**Note:** Email comparison uses unique index which is case-insensitive

---

#### **7.3.4 `update(id, organizationId, updateData)`**

**Input:** Contact ID, organization ID, partial update data

**Behavior:**
1. Build Supabase update query:
   ```
   supabase.from('contacts')
     .update(updateData)
     .eq('id', id)
     .eq('organization_id', organizationId)
     .select()
     .single()
   ```
2. RLS automatically enforces organization access
3. Return: Updated contact row

**Error Handling:**
* Supabase unique constraint violation → Transform to `DuplicateEmailError`
* Supabase "not found" → Transform to `ContactNotFoundError`

---

#### **7.3.5 `softDelete(id, organizationId)`**

**Input:** Contact ID, organization ID

**Behavior:**
1. Build Supabase update query:
   ```
   supabase.from('contacts')
     .update({ 
       is_active: false, 
       deleted_at: new Date().toISOString() 
     })
     .eq('id', id)
     .eq('organization_id', organizationId)
     .select()
     .single()
   ```
2. RLS automatically enforces organization access
3. Return: Updated contact row

---

#### **7.3.6 `findMany(filters, pagination, organizationId)`**

**Input:** Filters, pagination, organization ID

**Behavior:**
1. Build Supabase select query:
   ```
   let query = supabase.from('contacts')
     .select('*')
     .eq('organization_id', organizationId)
   ```
2. Apply filters:
   - `is_active`: `.eq('is_active', filter.is_active)`
   - `is_subscribed`: `.eq('is_subscribed', filter.is_subscribed)`
   - `source`: `.eq('source', filter.source)`
   - `search`: `.or('email.ilike.%term%,first_name.ilike.%term%,last_name.ilike.%term%')`
3. Apply pagination:
   - `.range((page - 1) * limit, page * limit - 1)`
   - Or cursor-based: `.gt('created_at', cursor)`
4. Apply sorting: `.order('created_at', { ascending: false })`
5. Execute query
6. Return: Array of contact rows + total count

---

### **7.4 Supporting Repositories**

#### **7.4.1 `CustomFieldRepository`**

**Functions:**
* `createValue(contactId, fieldDefinitionId, value)` - Insert custom field value
* `getValues(contactId)` - Get all custom field values for contact
* `updateValue(contactId, fieldDefinitionId, value)` - Update custom field value
* `deleteValue(contactId, fieldDefinitionId)` - Delete custom field value

---

#### **7.4.2 `ImportJobRepository` (Future)**

**Functions:**
* `getById(id, organizationId)` - Get import job
* `updateProgress(id, progress)` - Update import job progress

---

## **8. Event Layer (Future)**

### **8.1 Purpose**

Handles asynchronous system events emitted after successful contact operations. Enables event-driven integrations with automations, analytics, webhooks, and other systems.

### **8.2 Event Types**

**Contact Lifecycle Events:**
* `ContactCreated` - Emitted after contact creation
* `ContactUpdated` - Emitted after contact update
* `ContactDeleted` - Emitted after contact soft delete
* `ContactMerged` - Emitted after contact merge (future)
* `ContactImported` - Emitted after import creation (future)

**Event Payload Structure:**
```
ContactCreated {
  contact_id: UUID,
  organization_id: UUID,
  created_by: UUID,
  source: 'manual' | 'csv' | 'excel' | 'mailchimp',
  timestamp: ISO8601,
  contact_data: { ... } // Snapshot of contact at creation
}
```

### **8.3 Event Integration Points**

**Future Integrations:**
* **Automations**: Trigger workflows on contact events
* **Analytics**: Track contact lifecycle metrics
* **Webhooks**: Notify external systems
* **Audit Logs**: Record all contact changes
* **Search Indexing**: Update search indices
* **AI Enrichment**: Trigger enrichment processes
* **Notifications**: Notify users of contact changes

### **8.4 Implementation Strategy**

**MVP Approach:**
* Events emitted as simple function calls
* In-memory event bus (if needed)
* Synchronous event handlers

**Future Approach:**
* Dedicated event system (Kafka, Supabase Realtime, etc.)
* Async event processing
* Event replay capability
* Event sourcing (optional)

---

## **9. Data Flow Diagrams**

### **9.1 Create Contact Flow (Upgraded Architecture)**

```
Client Request
    │
    ▼
API Controller (POST /api/contacts)
    │
    ├─► Validate request body
    ├─► Get authenticated user
    │
    ▼
ContactPolicy.canCreate(user, organization)
    │
    ├─► Check user membership
    ├─► Check user role permissions
    │
    ├─► If false: Return 403 Forbidden
    └─► If true: Continue
    │
    ▼
ContactCommandService.createContact()
    │
    ├─► ContactDomain.create(data)
    │   ├─► Normalize email (lowercase, trim)
    │   ├─► Normalize mobile (trim)
    │   ├─► Validate required fields
    │   └─► Return domain object
    │
    ├─► ContactDomain.checkDuplicate()
    │   │
    │   └─► ContactRepository.findByEmail()
    │       └─► Supabase Query (with RLS)
    │           └─► Database (RLS enforced)
    │
    ├─► Apply deduplication strategy
    │   ├─► If duplicate + manual: Throw DuplicateEmailError
    │   └─► If duplicate + import: Apply strategy
    │
    ├─► ContactDomain.canBeCreated()
    │   └─► Validate invariants
    │
    ├─► ContactRepository.create()
    │   │
    │   └─► Supabase Insert (with RLS)
    │       └─► Database (RLS enforced)
    │
    ├─► CustomFieldService.setValues() (if custom fields provided)
    │   │
    │   └─► CustomFieldRepository.createValue()
    │       └─► Supabase Insert
    │
    ├─► Emit ContactCreated event (async)
    │   │
    │   └─► Event Layer
    │       ├─► Automation triggers
    │       ├─► Analytics tracking
    │       └─► Webhook notifications
    │
    ▼
Return Contact
    │
    ▼
API Controller
    │
    ▼
HTTP Response (201 Created)
```

---

### **9.2 Update Contact Flow (Upgraded Architecture)**

```
Client Request
    │
    ▼
API Controller (PATCH /api/contacts/:id)
    │
    ├─► Validate request body
    ├─► Get authenticated user
    │
    ▼
ContactRepository.findById()
    │
    └─► Supabase Query (with RLS)
        └─► Database (RLS enforced)
    │
    ▼
ContactPolicy.canUpdate(user, contact)
    │
    ├─► Check user membership
    ├─► Check user role permissions
    ├─► Check contact not deleted
    │
    ├─► If false: Return 403 Forbidden
    └─► If true: Continue
    │
    ▼
ContactCommandService.updateContact()
    │
    ├─► ContactDomain.fromDatabase(existingContact)
    │   └─► Create domain object
    │
    ├─► ContactDomain.update(data)
    │   ├─► Normalize email (if changed)
    │   ├─► Normalize mobile (if changed)
    │   └─► Validate changes
    │
    ├─► If email changed:
    │   ├─► ContactDomain.checkDuplicate() (exclude current)
    │   └─► If duplicate: Throw DuplicateEmailError
    │
    ├─► ContactDomain.canBeUpdated()
    │   └─► Validate invariants
    │
    ├─► ContactRepository.update()
    │   │
    │   └─► Supabase Update (with RLS)
    │       └─► Database (RLS enforced)
    │
    ├─► CustomFieldService.setValues() (if custom fields changed)
    │
    ├─► Emit ContactUpdated event (async)
    │   │
    │   └─► Event Layer
    │
    ▼
Return Updated Contact
    │
    ▼
API Controller
    │
    ▼
HTTP Response (200 OK)
```

---

### **9.3 List Contacts Flow (Upgraded Architecture)**

```
Client Request
    │
    ▼
API Controller (GET /api/contacts)
    │
    ├─► Extract query parameters
    ├─► Get authenticated user
    │
    ▼
ContactPolicy.canList(user, organization)
    │
    ├─► Check user membership
    ├─► Check user role permissions
    │
    ├─► If false: Return 403 Forbidden
    └─► If true: Continue
    │
    ▼
ContactQueryService.listContacts()
    │
    ├─► Build filters (default: is_active = true)
    ├─► Apply pagination
    │
    ├─► ContactRepository.findMany()
    │   │
    │   └─► Supabase Query (with RLS, filters, pagination)
    │       └─► Database (RLS enforced)
    │
    ├─► Transform to domain models
    │   └─► ContactDomain.fromDatabase() for each row
    │
    ├─► CustomFieldService.getValuesBatch() (if requested)
    │   │
    │   └─► CustomFieldRepository.getValuesForContacts()
    │
    ▼
Return Paginated List
    │
    ▼
API Controller
    │
    ▼
HTTP Response (200 OK)
```

---

### **9.4 Delete Contact Flow (Soft Delete - Upgraded Architecture)**

```
Client Request
    │
    ▼
API Controller (DELETE /api/contacts/:id)
    │
    ├─► Get authenticated user
    │
    ▼
ContactRepository.findById()
    │
    └─► Supabase Query (with RLS)
        └─► Database (RLS enforced)
    │
    ▼
ContactPolicy.canDelete(user, contact)
    │
    ├─► Check user membership
    ├─► Check user role permissions (owner/admin only)
    │
    ├─► If false: Return 403 Forbidden
    └─► If true: Continue
    │
    ▼
ContactCommandService.deleteContact()
    │
    ├─► ContactDomain.fromDatabase(existingContact)
    │   └─► Create domain object
    │
    ├─► ContactDomain.canBeDeleted()
    │   └─► Validate invariants
    │
    ├─► ContactRepository.softDelete()
    │   │
    │   └─► Supabase Update (is_active = false, deleted_at = NOW)
    │       └─► Database (RLS enforced)
    │
    ├─► Emit ContactDeleted event (async)
    │   │
    │   └─► Event Layer
    │
    ▼
Return Success
    │
    ▼
API Controller
    │
    ▼
HTTP Response (204 No Content)
```

---

## **10. Error Handling Model**

### **10.1 Error Hierarchy**

```
BaseError
├── ValidationError
│   ├── RequiredFieldError
│   ├── InvalidFormatError
│   └── InvalidValueError
├── BusinessLogicError
│   ├── DuplicateEmailError
│   ├── ContactNotFoundError
│   └── ContactAlreadyDeletedError
├── AuthorizationError
│   └── OrganizationAccessDeniedError
└── DatabaseError
    ├── ConnectionError
    ├── ConstraintViolationError
    └── QueryError
```

### **10.2 Error Flow**

```
Repository Layer
    │
    ├─► Supabase Error
    │   │
    │   ├─► Unique Constraint Violation
    │   │   └─► Transform to: DuplicateEmailError
    │   │
    │   ├─► RLS Policy Violation
    │   │   └─► Transform to: OrganizationAccessDeniedError
    │   │
    │   ├─► Not Found (PGRST116)
    │   │   └─► Transform to: ContactNotFoundError
    │   │
    │   └─► Other Database Error
    │       └─► Transform to: DatabaseError
    │
    ▼
Service Layer
    │
    ├─► Catch Repository Errors
    ├─► Add Business Context
    ├─► Re-throw or Transform
    │
    ▼
API Controller
    │
    ├─► Catch Service Errors
    ├─► Map to HTTP Status Codes
    ├─► Format Error Response
    │
    ▼
HTTP Error Response
```

### **10.3 Error Mapping Table**

| Service Error | HTTP Status | Response Body |
|--------------|-------------|---------------|
| `ValidationError` | `400 Bad Request` | `{ error: "validation_error", message: "...", details: {...} }` |
| `DuplicateEmailError` | `409 Conflict` | `{ error: "duplicate_email", message: "...", details: { existing_contact_id } }` |
| `ContactNotFoundError` | `404 Not Found` | `{ error: "contact_not_found", message: "..." }` |
| `OrganizationAccessDeniedError` | `403 Forbidden` | `{ error: "organization_access_denied", message: "..." }` |
| `DatabaseError` | `500 Internal Server Error` | `{ error: "database_error", message: "..." }` |

---

## **11. Layer Boundaries**

### **11.1 API Layer → Policy Layer Boundary**

**What API Layer Provides:**
* Authenticated user object
* Organization object
* Request context

**What Policy Layer Returns:**
* Boolean (can perform action?)
* Policy errors (typed exceptions)

**What API Layer Does NOT Do:**
* Authorization logic
* Role checking
* Permission evaluation

---

### **11.2 Policy Layer → Service Layer Boundary**

**What Policy Layer Provides:**
* Authorization confirmation (implicit, via passing through)

**What Service Layer Returns:**
* Domain objects
* Service errors

**What Policy Layer Does NOT Do:**
* Business logic
* Data normalization
* Database operations

---

### **11.3 Service Layer → Domain Model Boundary**

**What Service Layer Provides:**
* Raw data or database rows
* Business context

**What Domain Model Returns:**
* Domain objects (ContactDomain)
* Validation results
* Normalized data

**What Service Layer Does NOT Do:**
* Data normalization (delegated to domain model)
* Business rule enforcement (delegated to domain model)

---

### **11.4 Domain Model → Repository Boundary**

**What Domain Model Provides:**
* Normalized data (via `toDatabase()`)
* Query criteria

**What Repository Returns:**
* Database rows
* Repository errors

**What Domain Model Does NOT Do:**
* Direct database queries
* SQL construction

---

### **11.5 API Layer → Service Layer Boundary (Legacy - Kept for Reference)**

**What API Layer Provides:**
* Validated request data
* Authenticated user context
* Organization ID

**What Service Layer Returns:**
* Domain objects (Contact, ContactList)
* Service errors (typed exceptions)

**What API Layer Does NOT Do:**
* Business logic
* Data normalization
* Deduplication
* Custom field processing

---

### **11.6 Service Layer → Repository Layer Boundary (Legacy - Kept for Reference)**

**What Service Layer Provides:**
* Normalized data
* Organization context
* Query filters

**What Repository Layer Returns:**
* Database rows (raw or transformed)
* Repository errors (typed exceptions)

**What Service Layer Does NOT Do:**
* Direct database queries
* SQL construction
* RLS policy management (handled by Supabase)

---

### **11.7 Repository Layer → Database Boundary**

**What Repository Layer Provides:**
* Supabase client queries
* Organization-scoped filters

**What Database Returns:**
* Query results (via Supabase)
* Database errors

**What Repository Layer Does NOT Do:**
* Bypass RLS (RLS enforced automatically by Supabase)
* Direct SQL execution (uses Supabase client)

---

## **12. Integration Points**

### **12.1 Custom Fields Integration**

**Service Layer Integration:**
* `ContactService.createContact()` calls `CustomFieldService.setValues()` after contact creation
* `ContactService.updateContact()` calls `CustomFieldService.setValues()` after contact update
* `ContactService.getContactById()` optionally calls `CustomFieldService.getValues()`

**Data Flow:**
```
ContactService
    │
    ├─► Create/Update Contact
    │   └─► ContactRepository
    │
    └─► Set Custom Field Values
        └─► CustomFieldService
            └─► CustomFieldRepository
```

---

### **12.2 Import System Integration**

**Service Layer Integration:**
* Import processing calls `ContactService.createContact()` with import context
* `source = 'csv'/'excel'/'mailchimp'`
* `source_import_job_id` and `source_import_record_id` set
* Deduplication strategy from `import_jobs.settings`

**Data Flow:**
```
ImportService (Future)
    │
    ├─► Process Import Record
    │   ├─► Get Deduplication Strategy
    │   └─► ContactService.createContact()
    │       │
    │       ├─► Apply Strategy (skip/merge/create)
    │       └─► Set Import Source Tracking
    │
    └─► Update Import Job Progress
```

---

### **12.3 Authentication Integration**

**Context Flow:**
```
Next.js API Route
    │
    ├─► Get Supabase Session
    │   └─► Supabase Auth
    │
    ├─► Extract User ID
    ├─► Get Organization from AuthContext
    │
    └─► Pass to Service Layer:
        {
          user_id: "uuid",
          organization_id: "uuid"
        }
```

**Service Layer Usage:**
* `created_by` set from `context.user_id`
* `organization_id` validated against user's memberships
* RLS automatically enforces organization access

---

## **10. Transaction Handling**

### **10.1 Contact Creation with Custom Fields**

**Transaction Scope:**
* Create contact
* Create custom field values (multiple)

**Current Approach (Supabase):**
* Each operation is separate (no explicit transactions in Supabase client)
* If custom field creation fails, contact remains (acceptable for MVP)
* Future: Use database transactions or Supabase Edge Functions for atomicity

**Error Handling:**
* If contact creation succeeds but custom fields fail:
  * Option A: Return contact without custom fields (with warning)
  * Option B: Rollback contact creation (requires transaction support)

---

### **10.2 Contact Update with Custom Fields**

**Transaction Scope:**
* Update contact
* Update/create/delete custom field values

**Current Approach:**
* Sequential operations
* If custom field update fails, contact update remains
* Future: Use transactions for atomicity

---

## **13. Future Extensibility**

### **13.1 Campaign Integration**

**Service Layer Extension:**
* Campaign service will query contacts via `ContactQueryService.listContacts()`
* No changes needed to core contact services
* Uses domain models for consistent behavior

**Integration Pattern:**
```
CampaignService
    │
    └─► ContactQueryService.listContacts()
        │
        └─► Filter by is_subscribed = true
        └─► Return contacts for campaign targeting
```

---

### **13.2 Automation Integration**

**Service Layer Extension:**
* Automation triggers can query contacts via `ContactQueryService`
* Custom field conditions handled via `CustomFieldService`
* Events from Event Layer trigger automations
* No changes needed to core contact services

**Integration Pattern:**
```
AutomationService
    │
    ├─► ContactQueryService.listContacts()
    │   └─► Filter by automation conditions
    │
    ├─► CustomFieldService.getValues()
    │   └─► Evaluate custom field conditions
    │
    └─► Event Layer (ContactCreated, ContactUpdated)
        └─► Trigger automation workflows
```

---

### **13.3 Event System Integration**

**Event Layer Extension:**
* Contact events emitted by Command Service
* Events consumed by multiple systems (automations, analytics, webhooks)
* Contact services remain unchanged
* Events reference contacts via `contact_id`

**Integration Pattern:**
```
ContactCommandService
    │
    └─► Emit ContactCreated event
        │
        └─► Event Layer
            ├─► AutomationService (trigger workflows)
            ├─► AnalyticsService (track metrics)
            ├─► WebhookService (notify external)
            └─► AuditService (log changes)
```

---

## **14. Performance Considerations**

### **14.1 Query Optimization**

**Repository Layer:**
* Always filter by `organization_id` first (indexed)
* Use Supabase query builder efficiently
* Limit custom field JOINs (fetch separately if needed)

**Service Layer:**
* Batch custom field fetches for list operations
* Cache custom field definitions per organization
* Use pagination for large result sets

---

### **14.2 Caching Strategy**

**Cacheable Data:**
* Custom field definitions (per organization)
* Organization membership checks (per user)
* Contact counts (with TTL)

**Cache Invalidation:**
* On custom field definition changes
* On organization membership changes
* On contact create/update/delete

---

## **15. Testing Strategy**

### **15.1 Unit Testing**

**Domain Model Layer:**
* Test business rules (normalization, validation)
* Test invariant enforcement
* Test state transitions
* No dependencies (pure logic)

**Policy Layer:**
* Test authorization logic
* Test role-based permissions
* Mock user and organization objects
* Test multi-tenant isolation

**Service Layer:**
* Test business logic orchestration
* Mock domain models and repositories
* Test error handling
* Test event emission

**Repository Layer:**
* Test query construction
* Mock Supabase client
* Test data transformation (DB ↔ Domain)

---

### **15.2 Integration Testing**

**API Layer:**
* Test HTTP endpoints
* Test authentication/authorization
* Test policy enforcement
* Test error responses

**End-to-End:**
* Test full flow: API → Policy → Service → Domain → Repository → Database
* Test RLS enforcement
* Test custom field integration
* Test event emission

---

## **16. Status**

✅ **Enterprise service-layer architecture is complete and ready for implementation.**

This upgraded architecture provides:

**Core Layers:**
* Clear separation of concerns (6 layers)
* Policy/Guard layer for centralized authorization
* Domain Model layer for business rule encapsulation
* CQRS-lite service separation (Command/Query)
* Event-driven architecture foundation

**Enterprise Patterns:**
* Multi-tenant authorization (Policy layer)
* Business rule centralization (Domain Model)
* Scalable read/write separation (CQRS-lite)
* Event-driven integrations (Event Layer)
* Consistent behavior across entry points

**Future-Ready:**
* Role-based access control (Policy layer extensible)
* Event-driven automations (Event Layer)
* Campaign integration (via Query Service)
* Import system compatibility (via Command Service)
* Custom fields support (integrated throughout)

---

## **15. Related Documents**

* `Docs/Contacts/contacts-table-implementation-plan.md` - Table design and data rules
* `Docs/Contacts/contacts-schema-mvp.md` - MVP schema design
* `Docs/Overview/architecture-overview.md` - High-level system architecture
* `Docs/Database/rls.md` - RLS strategy documentation

---
