# **CONTACTS QUERY ENGINE — ARCHITECTURE DESIGN**

---

## **1. Purpose of This Document**

This document defines the **query engine architecture** for the Contacts module in a multi-tenant SaaS CRM using Supabase with Row Level Security (RLS).

The query engine covers:

* Conceptual query model and DSL
* Filter taxonomy (basic vs advanced)
* Search strategy (email, name, mobile, custom fields)
* Sorting strategy
* Pagination strategy (offset vs cursor)
* API query contract
* Service-layer responsibilities
* Performance optimizations for large datasets (100k+ contacts per org)
* Future extensibility (segments, advanced custom field queries)

**Note:** This document describes **conceptual architecture and behavior**, not implementation code.

---

## **2. Query Engine Overview**

### **2.1 Purpose**

The Contact Query Engine provides a flexible, performant system for querying contacts in a multi-tenant SaaS CRM. It supports:

* Simple filters (standard fields)
* Advanced filters (custom fields, complex conditions)
* Full-text search across multiple fields
* Flexible sorting
* Efficient pagination for large datasets
* Future segment-based queries

### **2.2 Architecture Integration**

The Query Engine integrates with the service-layer architecture:

```
API Controller
    │
    ▼
ContactQueryService (Service Layer)
    │
    ├─► Query Validator
    ├─► Query Classifier (lookup / list / search / segment)
    ├─► Filter Optimizer (execution order)
    ├─► Cost Analyzer (query budget)
    ├─► Query Builder
    ├─► Filter Parser
    ├─► Search Engine
    ├─► Pagination Handler
    └─► Result Mapper
    │
    ▼
ContactRepository (Data Layer)
    │
    └─► Supabase Query Builder
        └─► Database (with RLS)
```

### **2.3 Design Principles**

* **Multi-tenant First**: All queries automatically scoped to organization
* **Performance**: Optimized for 100k+ contacts per organization
* **Flexibility**: Support simple and complex query patterns
* **Extensibility**: Easy to add new filter types and search fields
* **Type Safety**: Clear query DSL with validation

---

## **3. Query Model & DSL**

### **3.1 Query Structure**

A contact query consists of:

```
ContactQuery {
  organization_id: UUID (required, from context)
  filters: FilterSet (optional)
  search: SearchQuery (optional)
  sort: SortSpec (optional)
  pagination: PaginationSpec (required)
}
```

### **3.2 FilterSet Structure**

```
FilterSet {
  basic: BasicFilters (optional)
  advanced: AdvancedFilters (optional)
  logic: FilterLogic (optional, default: "AND")
}
```

**Filter Logic:**
* `AND` - All filters must match (default)
* `OR` - Any filter can match
* `NOT` - Negate filter set

### **3.3 Basic Filters**

Basic filters operate on **standard contact table fields** (indexed, fast):

```
BasicFilters {
  is_active?: BooleanFilter
  is_subscribed?: BooleanFilter
  source?: EnumFilter<"manual" | "csv" | "excel" | "mailchimp">
  created_at?: DateRangeFilter
  updated_at?: DateRangeFilter
  created_by?: UUIDFilter
}
```

**Filter Types:**
* `BooleanFilter`: `{ eq: true | false }`
* `EnumFilter<T>`: `{ eq: T }` or `{ in: T[] }`
* `DateRangeFilter`: `{ gte?: ISO8601, lte?: ISO8601 }`
* `UUIDFilter`: `{ eq: UUID }` or `{ in: UUID[] }`

**Example:**
```
basic: {
  is_active: { eq: true },
  is_subscribed: { eq: true },
  source: { in: ["manual", "csv"] },
  created_at: { gte: "2024-01-01T00:00:00Z" }
}
```

### **3.4 Advanced Filters**

Advanced filters operate on **custom fields** (EAV pattern, requires JOINs):

```
AdvancedFilters {
  custom_fields: CustomFieldFilter[] (optional)
  segments: SegmentFilter[] (optional, future)
}
```

**Custom Field Filter:**
```
CustomFieldFilter {
  field_name: string (required)
  operator: FilterOperator (required)
  value: FilterValue (required)
}
```

**Filter Operators:**
* `eq` - Equals
* `ne` - Not equals
* `gt` - Greater than
* `gte` - Greater than or equal
* `lt` - Less than
* `lte` - Less than or equal
* `in` - In array
* `nin` - Not in array
* `contains` - String contains (text fields)
* `starts_with` - String starts with (text fields)
* `ends_with` - String ends with (text fields)
* `is_null` - Is null
* `is_not_null` - Is not null

**Filter Value:**
* Type depends on custom field type:
  * Text: `string`
  * Number: `number`
  * Date: `ISO8601 string`
  * Boolean: `boolean`
  * Select/Multiselect: `string` or `string[]`

**Example:**
```
advanced: {
  custom_fields: [
    {
      field_name: "company_size",
      operator: "gte",
      value: 50
    },
    {
      field_name: "industry",
      operator: "in",
      value: ["tech", "finance"]
    },
    {
      field_name: "notes",
      operator: "contains",
      value: "vip"
    }
  ]
}
```

### **3.5 Search Query**

Full-text search across multiple standard fields:

```
SearchQuery {
  query: string (required, min 1 char, max 500 chars)
  fields?: SearchField[] (optional, default: all)
  operator?: "AND" | "OR" (optional, default: "OR")
}
```

**Search Fields:**
* `email` - Email address
* `first_name` - First name
* `last_name` - Last name
* `full_name` - Combined first_name + last_name
* `mobile` - Mobile number

**Default Behavior:**
* If `fields` not specified: Search all fields
* If `operator` not specified: Use "OR" (match any field)

**Example:**
```
search: {
  query: "john@example.com",
  fields: ["email", "full_name"],
  operator: "OR"
}
```

**Search Strategy:**
* Case-insensitive matching
* Partial matching (LIKE/ILIKE)
* Email: Exact match preferred, then partial
* Name: Partial match on first_name, last_name, or full_name
* Mobile: Exact match preferred, then partial

### **3.6 Sort Specification**

```
SortSpec {
  field: SortField (required)
  direction: "asc" | "desc" (required, default: "desc")
  nulls_first?: boolean (optional, default: false)
}
```

**Sort Fields:**
* Standard fields: `created_at`, `updated_at`, `email`, `first_name`, `last_name`, `mobile`
* Custom fields: `custom_field:<field_name>` (future)

**Default Sort:**
* If not specified: `{ field: "created_at", direction: "desc" }`

**Example:**
```
sort: {
  field: "first_name",
  direction: "asc",
  nulls_first: true
}
```

### **3.7 Pagination Specification**

Supports both **offset-based** and **cursor-based** pagination:

```
PaginationSpec {
  type: "offset" | "cursor" (required)
  limit: number (required, min: 1, max: 1000, default: 50)
  
  // Offset-based
  offset?: number (required if type="offset", min: 0)
  
  // Cursor-based
  cursor?: string (optional if type="cursor", base64-encoded cursor)
}
```

**Pagination Strategy:**
* **Offset-based**: Simple, works for small datasets (< 10k contacts)
  * Use for: UI pagination, predictable page numbers
  * Performance: Degrades with large offsets
  
* **Cursor-based**: Efficient for large datasets (100k+ contacts)
  * Use for: Infinite scroll, large result sets
  * Performance: Constant time regardless of position

**Recommendation:**
* Default to **cursor-based** for better performance
* Support **offset-based** for backward compatibility and simple UIs

**Example:**
```
// Offset-based
pagination: {
  type: "offset",
  limit: 50,
  offset: 0
}

// Cursor-based
pagination: {
  type: "cursor",
  limit: 50,
  cursor: "eyJpZCI6InV1aWQiLCJjcmVhdGVkX2F0IjoiMjAyNC0wMS0wMVQwMDowMDowMFoifQ=="
}
```

---

## **4. Filter Taxonomy**

### **4.1 Basic Filters (Standard Fields)**

**Characteristics:**
* Operate on indexed columns in `contacts` table
* Fast execution (single table query)
* No JOINs required
* Suitable for common filtering needs

**Supported Fields:**
* `is_active` (boolean)
* `is_subscribed` (boolean)
* `source` (enum: manual, csv, excel, mailchimp)
* `created_at` (timestamp)
* `updated_at` (timestamp)
* `created_by` (UUID)

**Performance:**
* Indexed queries
* Execution time: O(log n) with proper indexes
* Suitable for real-time filtering

**Example Query:**
```
GET /api/contacts?filters[basic][is_active][eq]=true&filters[basic][source][in]=manual,csv
```

---

### **4.2 Advanced Filters (Custom Fields)**

**Characteristics:**
* Operate on `contact_custom_field_values` table (EAV pattern)
* Requires JOINs with `contact_custom_field_definitions`
* Slower execution (multi-table query)
* Suitable for complex filtering needs

**Supported Operations:**
* All filter operators (eq, ne, gt, gte, lt, lte, in, nin, contains, etc.)
* Type-aware filtering (text, number, date, boolean, select)

**Performance:**
* JOIN-based queries
* Execution time: O(n) in worst case
* May require query optimization for large datasets
* Consider materialized views or denormalization for frequently queried custom fields

**Example Query:**
```
POST /api/contacts/query
{
  "filters": {
    "advanced": {
      "custom_fields": [
        {
          "field_name": "company_size",
          "operator": "gte",
          "value": 50
        }
      ]
    }
  }
}
```

---

### **4.3 Filter Combination Logic**

**AND Logic (Default):**
* All filters must match
* Most restrictive, fastest execution
* Use for: Precise filtering

**OR Logic:**
* Any filter can match
* More permissive, may be slower
* Use for: Broad filtering

**NOT Logic:**
* Negate entire filter set
* Useful for exclusion filters
* Use for: "Not in segment" queries

**Example:**
```
filters: {
  logic: "AND",
  basic: {
    is_active: { eq: true }
  },
  advanced: {
    custom_fields: [
      { field_name: "vip", operator: "eq", value: true }
    ]
  }
}
// Result: Active contacts AND VIP contacts
```

---

## **5. Filter Execution Strategy**

### **5.1 Purpose**

Not all filters are equal. Filter execution order significantly impacts query performance. The Query Engine uses a **priority-based execution pipeline** to ensure optimal performance.

### **5.2 Filter Priority Classes**

Filters are classified into three tiers based on performance characteristics:

#### **5.2.1 Tier 1: Fast, Indexed, Narrowing Filters**

**Characteristics:**
* Fast execution (O(log n) with indexes)
* High selectivity (narrow result set quickly)
* Single-table queries (no JOINs)
* Always executed first

**Tier 1 Filters:**
* `organization_id` (always first, mandatory)
* `id` (exact match, unique)
* `email` (exact match, indexed, unique)
* `is_active` (indexed, high selectivity)
* `created_at` (range queries, indexed)
* `source` (indexed, moderate selectivity)

**Execution Priority:**
1. `organization_id` - Always first (mandatory scope)
2. `id` - Exact match (if present)
3. `email` - Exact match (if present)
4. `created_at` - Range queries (if present)
5. `is_active` - Boolean filter (if present)
6. `source` - Enum filter (if present)

**Example:**
```
Query: { organization_id, email: "john@example.com", is_active: true }

Execution Order:
1. .eq('organization_id', orgId)      // Mandatory scope
2. .eq('email', 'john@example.com')  // Exact match, indexed
3. .eq('is_active', true)             // Indexed boolean
```

---

#### **5.2.2 Tier 2: Moderate Performance Filters**

**Characteristics:**
* Moderate execution time
* May require partial matching (ILIKE)
* Indexed but less selective
* Executed after Tier 1 filters

**Tier 2 Filters:**
* `first_name` (partial match, indexed)
* `last_name` (partial match, indexed)
* `mobile` (exact or partial match, indexed)
* `is_subscribed` (boolean, indexed)
* `updated_at` (range queries, indexed)
* `created_by` (UUID filter, indexed)

**Execution Priority:**
1. `is_subscribed` - Boolean filter
2. `updated_at` - Range queries
3. `created_by` - UUID filter
4. `mobile` - Exact match preferred, then partial
5. `first_name` - Partial match
6. `last_name` - Partial match

**Example:**
```
Query: { organization_id, is_active: true, is_subscribed: true, mobile: "+123" }

Execution Order:
1. .eq('organization_id', orgId)      // Tier 1
2. .eq('is_active', true)             // Tier 1
3. .eq('is_subscribed', true)         // Tier 2
4. .ilike('mobile', '%+123%')          // Tier 2 (partial match)
```

---

#### **5.2.3 Tier 3: Slow, JOIN-Based Filters**

**Characteristics:**
* Slow execution (O(n) in worst case)
* Requires JOINs with other tables
* Low selectivity (may not narrow result set much)
* Executed last (after result set is narrowed)

**Tier 3 Filters:**
* Custom field filters (EAV pattern, requires JOIN)
* Segment filters (future, requires JOIN)
* OR-heavy conditions (multiple OR clauses)
* Complex nested filters

**Execution Priority:**
1. Custom field filters (if present)
2. Segment filters (if present, future)
3. OR conditions (if present)

**Example:**
```
Query: { organization_id, is_active: true, custom_fields: [{ field_name: "vip", operator: "eq", value: true }] }

Execution Order:
1. .eq('organization_id', orgId)      // Tier 1
2. .eq('is_active', true)             // Tier 1
3. .select('*, contact_custom_field_values(*)')  // Tier 3 (JOIN)
4. .eq('contact_custom_field_values.field_definition_id', vipFieldId)
5. .eq('contact_custom_field_values.value_boolean', true)
```

---

### **5.3 Filter Execution Pipeline**

**Conceptual Execution Order:**

```
1. Mandatory Scope Filter
   → organization_id (always first, cannot be skipped)

2. High-Selectivity Filters (Tier 1)
   → id (if exact match)
   → email (if exact match)
   → created_at (if range)
   → is_active
   → source

3. Basic Filters (Tier 2)
   → is_subscribed
   → updated_at (if range)
   → created_by
   → mobile (exact or partial)
   → first_name (partial)
   → last_name (partial)

4. Search Filters (Tier 2)
   → email (partial match, if not already exact)
   → name search (first_name, last_name, full_name)
   → mobile (partial match, if not already exact)

5. Advanced Filters (Tier 3)
   → custom fields (JOIN with contact_custom_field_values)
   → segments (JOIN with segment_members, future)

6. Sorting
   → Apply sort order

7. Pagination
   → Apply limit/offset or cursor
```

**Why This Order Matters:**

**Bad Order (Performance Killer):**
```
1. Custom field JOIN (Tier 3) - Slow, scans all contacts
2. organization_id filter (Tier 1) - Fast but too late
```
Result: JOINs millions of rows before filtering → 💀 performance

**Good Order (Optimized):**
```
1. organization_id filter (Tier 1) - Narrow to org's contacts
2. is_active filter (Tier 1) - Narrow to active contacts
3. Custom field JOIN (Tier 3) - Now only JOINs narrowed set
```
Result: JOINs only relevant contacts → ✅ fast

---

### **5.4 Filter Optimizer (Internal Component)**

**Purpose:** Automatically reorder filters for optimal performance

**Responsibilities:**
* Classify filters into priority tiers
* Reorder filters by priority (Tier 1 → Tier 2 → Tier 3)
* Ensure `organization_id` is always first
* Optimize filter combinations
* Detect and warn about expensive filter combinations

**Optimization Rules:**
* Always execute `organization_id` first
* Execute exact matches before partial matches
* Execute indexed filters before non-indexed
* Execute high-selectivity filters before low-selectivity
* Execute single-table filters before JOIN-based filters

---

## **6. Query Plan Types**

### **6.1 Purpose**

Not all queries should run the same way. Different query patterns require different optimization strategies. The Query Engine classifies queries into **modes** and applies mode-specific optimizations.

### **6.2 Query Modes**

#### **6.2.1 Lookup Mode**

**Characteristics:**
* Single contact retrieval
* Exact match on unique identifier
* Fastest execution

**Query Patterns:**
* `id` filter with exact match
* `email` filter with exact match (within organization)
* `organization_id + id` combination

**Optimization Strategy:**
* Direct index lookup
* Skip pagination, sorting, complex filters
* Return single result immediately

**Example:**
```
Query: { organization_id, id: "uuid" }
Mode: lookup
Strategy: Direct index lookup by id
```

---

#### **6.2.2 List Mode**

**Characteristics:**
* Simple filtering on standard fields
* No custom fields or complex conditions
* Moderate complexity

**Query Patterns:**
* Only basic filters (is_active, source, is_subscribed, etc.)
* No search query
* No advanced filters (custom fields)
* No OR conditions

**Optimization Strategy:**
* Index scan on filtered columns
* Simple WHERE clauses
* Efficient pagination (cursor or offset)
* No JOINs required

**Example:**
```
Query: { organization_id, is_active: true, source: "manual", sort: { field: "created_at" } }
Mode: list
Strategy: Index scan with WHERE clauses
```

---

#### **6.2.3 Search Mode**

**Characteristics:**
* Text search heavy
* Partial matching across multiple fields
* May include OR conditions

**Query Patterns:**
* Search query present
* ILIKE queries on email, name, mobile
* May combine with basic filters

**Optimization Strategy:**
* Partial match queries (ILIKE)
* Search across indexed columns
* Ranking and relevance (future)
* May require full-text search indexes

**Example:**
```
Query: { organization_id, search: { query: "john", fields: ["email", "full_name"] } }
Mode: search
Strategy: ILIKE queries on indexed columns, combine with OR
```

---

#### **6.2.4 Segment Evaluation Mode**

**Characteristics:**
* Complex filtering with custom fields
* OR conditions
* Multiple advanced filters
* Segment-based queries (future)

**Query Patterns:**
* Advanced filters (custom fields) present
* OR logic in filters
* Multiple custom field filters
* Segment filters (future)

**Optimization Strategy:**
* Pre-filter with basic filters first
* Then apply JOINs for custom fields
* Use materialized views if available
* Consider query result caching

**Example:**
```
Query: { organization_id, is_active: true, advanced: { custom_fields: [{ field_name: "vip", operator: "eq", value: true }, { field_name: "company_size", operator: "gte", value: 50 }] } }
Mode: segment_eval
Strategy: Pre-filter by org + active, then JOIN for custom fields
```

---

#### **6.2.5 Analytics Mode**

**Characteristics:**
* Aggregation queries
* Counts, sums, averages
* Group by operations
* No individual contact data needed

**Query Patterns:**
* COUNT queries
* Aggregation functions
* Group by operations
* Statistics queries

**Optimization Strategy:**
* Aggregate-optimized queries
* Use database aggregation functions
* Avoid fetching individual records
* Cache results when possible

**Example:**
```
Query: { organization_id, is_active: true, aggregate: "count" }
Mode: analytics
Strategy: COUNT query with WHERE clauses, no data fetch
```

---

### **6.3 Query Classification Logic**

**Classification Rules:**

```
If query contains:
  - id exact match OR email exact match
    → Mode: lookup

Else if query contains:
  - Only basic filters (no search, no advanced filters, no OR)
    → Mode: list

Else if query contains:
  - Search query (text search)
    → Mode: search

Else if query contains:
  - Advanced filters (custom fields) OR OR conditions OR segments
    → Mode: segment_eval

Else if query contains:
  - Aggregate operations
    → Mode: analytics

Default:
  → Mode: list
```

---

### **6.4 Mode-Specific Optimizations**

**Lookup Mode:**
* Skip filter optimizer (direct lookup)
* Skip pagination
* Skip sorting
* Return immediately

**List Mode:**
* Use filter optimizer (Tier 1 → Tier 2)
* Efficient pagination (cursor preferred)
* Indexed sorting
* No JOINs

**Search Mode:**
* Prioritize search filters
* Use indexed columns for search
* Combine search with basic filters efficiently
* Consider full-text search (future)

**Segment Evaluation Mode:**
* Pre-filter with Tier 1 and Tier 2 filters
* Then apply Tier 3 filters (JOINs)
* Use materialized views if available
* Cache results when possible

**Analytics Mode:**
* Use aggregation functions
* Skip individual record fetching
* Optimize for COUNT/SUM/AVG operations
* Cache results aggressively

---

### **6.5 Query Classifier (Internal Component)**

**Purpose:** Automatically classify queries into modes

**Responsibilities:**
* Analyze query structure
* Detect query patterns
* Classify into appropriate mode
* Apply mode-specific optimizations
* Log query mode for analytics

---

## **7. Query Cost Limiting**

### **7.1 Purpose**

The Query Engine DSL is powerful, which makes it dangerous. Without cost limits, users can send expensive queries that degrade database performance or cause denial-of-service. The Query Engine uses a **cost model** to prevent expensive queries.

### **7.2 Query Cost Model**

**Concept:** Every query component has a "cost score". The total cost determines if the query is allowed, rejected, or degraded.

**Cost Rules:**

| Component | Cost Score | Notes |
|-----------|-----------|-------|
| Basic filter | 1 | Each basic filter |
| Search field | 2 | Each field searched |
| OR condition | 3 | Each OR clause |
| Custom field filter | 5 | Each custom field filter |
| Segment filter | 8 | Each segment filter (future) |
| Limit > 100 | +5 | Penalty for large limits |
| Limit > 500 | +10 | Additional penalty |
| Offset > 1000 | +5 | Penalty for deep pagination |
| Multiple custom fields | +2 per field | Additional penalty for multiple |

**Cost Calculation:**
```
Total Cost = 
  (Basic Filters × 1) +
  (Search Fields × 2) +
  (OR Conditions × 3) +
  (Custom Field Filters × 5) +
  (Segment Filters × 8) +
  (Limit Penalties) +
  (Offset Penalties)
```

**Example Cost Calculations:**

**Simple Query:**
```
Query: { organization_id, is_active: true, limit: 50 }
Cost: 1 (basic filter) + 0 (no penalties) = 1
Status: ✅ Allowed
```

**Moderate Query:**
```
Query: { organization_id, is_active: true, search: { query: "john", fields: ["email", "full_name"] }, limit: 100 }
Cost: 1 (basic) + 4 (2 search fields × 2) + 5 (limit > 100) = 10
Status: ✅ Allowed
```

**Complex Query:**
```
Query: { organization_id, is_active: true, advanced: { custom_fields: [{ field_name: "vip" }, { field_name: "company_size" }] }, limit: 200 }
Cost: 1 (basic) + 10 (2 custom fields × 5) + 5 (limit > 100) = 16
Status: ✅ Allowed (but may be slow)
```

**Expensive Query:**
```
Query: { organization_id, advanced: { custom_fields: [10 custom field filters] }, limit: 1000, offset: 5000 }
Cost: 50 (10 custom fields × 5) + 10 (limit > 500) + 5 (offset > 1000) = 65
Status: ❌ Rejected (cost > 50)
```

---

### **7.3 Cost Thresholds**

**Cost Thresholds:**

| Cost Range | Action | Response |
|------------|--------|----------|
| 0-20 | ✅ Allow | Execute normally |
| 21-40 | ⚠️ Degrade | Apply optimizations, may be slow |
| 41-50 | ⚠️ Warn | Execute but log warning |
| 51+ | ❌ Reject | Return error, do not execute |

**Degradation Strategies:**
* Force cursor pagination (if offset-based)
* Reduce limit to maximum 100
* Skip expensive filters (with warning)
* Use cached results if available
* Apply query timeout

**Rejection Response:**
```json
{
  "error": "query_too_expensive",
  "message": "Query cost (65) exceeds maximum allowed (50). Please simplify your query.",
  "details": {
    "cost": 65,
    "max_cost": 50,
    "suggestions": [
      "Reduce number of custom field filters (currently 10)",
      "Reduce limit (currently 1000, max recommended 100)",
      "Use cursor pagination instead of offset"
    ]
  }
}
```

---

### **7.4 Cost Optimization**

**Automatic Optimizations:**
* Reorder filters (Tier 1 → Tier 2 → Tier 3)
* Force cursor pagination for expensive queries
* Reduce limit for expensive queries
* Skip non-essential filters (with warning)

**User Suggestions:**
* Provide cost breakdown in error response
* Suggest query simplifications
* Recommend alternative query patterns

---

### **7.5 Cost Analyzer (Internal Component)**

**Purpose:** Calculate query cost and enforce limits

**Responsibilities:**
* Analyze query structure
* Calculate total cost score
* Compare against thresholds
* Apply degradation strategies
* Reject expensive queries
* Provide cost feedback to users

**Cost Analysis Flow:**
```
Query
    │
    ├─► Count basic filters → cost += count × 1
    ├─► Count search fields → cost += count × 2
    ├─► Count OR conditions → cost += count × 3
    ├─► Count custom field filters → cost += count × 5
    ├─► Count segment filters → cost += count × 8
    ├─► Check limit → cost += penalties
    ├─► Check offset → cost += penalties
    │
    ├─► If cost <= 20: ✅ Allow
    ├─► If cost 21-40: ⚠️ Degrade
    ├─► If cost 41-50: ⚠️ Warn
    └─► If cost > 50: ❌ Reject
```

---

## **8. Search Strategy**

### **5.1 Search Architecture**

**Multi-Field Search:**
* Search across email, first_name, last_name, full_name, mobile
* Case-insensitive matching
* Partial matching (LIKE/ILIKE)

**Search Flow:**
```
Search Query
    │
    ├─► Parse query string
    ├─► Determine search fields
    │
    ├─► Email Search (if email field included)
    │   ├─► Try exact match first (LOWER(email) = LOWER(query))
    │   └─► Fallback to partial match (LOWER(email) LIKE LOWER(%query%))
    │
    ├─► Name Search (if name fields included)
    │   ├─► Search first_name (LOWER(first_name) LIKE LOWER(%query%))
    │   ├─► Search last_name (LOWER(last_name) LIKE LOWER(%query%))
    │   └─► Search full_name (LOWER(first_name || ' ' || last_name) LIKE LOWER(%query%))
    │
    ├─► Mobile Search (if mobile field included)
    │   ├─► Try exact match first
    │   └─► Fallback to partial match
    │
    └─► Combine results (AND/OR operator)
```

### **5.2 Search Field Prioritization**

**Email Search:**
* Highest priority (most specific)
* Exact match preferred
* Partial match as fallback

**Name Search:**
* Medium priority
* Search first_name, last_name, full_name
* Partial matching

**Mobile Search:**
* Lower priority (less specific)
* Exact match preferred
* Partial match as fallback

### **5.3 Search Performance**

**Optimization Strategies:**
* Use indexed columns (email, mobile have indexes)
* Limit search to specific fields when possible
* Use full-text search indexes (future: PostgreSQL full-text search)
* Consider search index (future: Elasticsearch, Algolia)

**Current Approach:**
* ILIKE queries on indexed columns
* Performance acceptable for < 100k contacts
* May require optimization for larger datasets

**Future Enhancements:**
* PostgreSQL full-text search (tsvector/tsquery)
* Dedicated search index (Elasticsearch, Algolia)
* Search result ranking

### **5.4 Custom Field Search (Future)**

**Conceptual Design:**
* Search across custom field values
* Requires JOIN with `contact_custom_field_values`
* Slower than standard field search
* Use for: Advanced search scenarios

**Example:**
```
search: {
  query: "tech",
  fields: ["email", "full_name", "custom_field:company_name"],
  operator: "OR"
}
```

---

## **9. Sorting Strategy**

### **6.1 Sortable Fields**

**Standard Fields:**
* `created_at` - Contact creation date (default)
* `updated_at` - Last update date
* `email` - Email address (alphabetical)
* `first_name` - First name (alphabetical)
* `last_name` - Last name (alphabetical)
* `mobile` - Mobile number

**Custom Fields (Future):**
* `custom_field:<field_name>` - Sort by custom field value
* Requires JOIN with `contact_custom_field_values`
* Performance impact for large datasets

### **6.2 Sort Performance**

**Indexed Sorts:**
* Standard fields with indexes: Fast (O(log n))
* `created_at`, `updated_at`: Very fast (indexed)
* `email`: Fast (indexed, unique)

**Non-Indexed Sorts:**
* `first_name`, `last_name`: Slower (may require table scan)
* Custom fields: Slowest (requires JOIN)

**Optimization:**
* Prefer indexed fields for sorting
* Add composite indexes for common sort combinations
* Consider materialized views for complex sorts

### **6.3 Null Handling**

**Nulls First:**
* NULL values appear first in results
* Use for: Showing incomplete contacts first

**Nulls Last (Default):**
* NULL values appear last in results
* Use for: Showing complete contacts first

**Example:**
```
sort: {
  field: "first_name",
  direction: "asc",
  nulls_first: false  // NULLs last
}
```

### **6.4 Multi-Field Sorting (Future)**

**Conceptual Design:**
* Sort by multiple fields (primary, secondary, etc.)
* Example: Sort by last_name, then first_name

**Example:**
```
sort: [
  { field: "last_name", direction: "asc" },
  { field: "first_name", direction: "asc" }
]
```

---

## **10. Pagination Strategy**

### **7.1 Offset-Based Pagination**

**Structure:**
```
{
  type: "offset",
  limit: 50,
  offset: 0
}
```

**Characteristics:**
* Simple to implement
* Predictable page numbers
* Works well for small datasets (< 10k contacts)
* Performance degrades with large offsets

**Performance:**
* Small offset (0-1000): Fast
* Medium offset (1000-10000): Acceptable
* Large offset (> 10000): Slow (requires scanning skipped rows)

**Use Cases:**
* UI pagination with page numbers
* Small to medium datasets
* Backward compatibility

**Example:**
```
GET /api/contacts?pagination[type]=offset&pagination[limit]=50&pagination[offset]=0
```

---

### **7.2 Cursor-Based Pagination**

**Structure:**
```
{
  type: "cursor",
  limit: 50,
  cursor: "eyJpZCI6InV1aWQiLCJjcmVhdGVkX2F0IjoiMjAyNC0wMS0wMVQwMDowMDowMFoifQ=="
}
```

**Cursor Format:**
* Base64-encoded JSON
* Contains: `{ id: UUID, sort_field_value: value }`
* Example: `{ id: "uuid", created_at: "2024-01-01T00:00:00Z" }`

**Characteristics:**
* Efficient for large datasets
* Constant time regardless of position
* No page numbers (use "next" and "previous" cursors)
* Works well for infinite scroll

**Performance:**
* Always fast (O(log n) with index)
* No performance degradation with position
* Suitable for 100k+ contacts

**Use Cases:**
* Infinite scroll UI
* Large datasets (100k+ contacts)
* Real-time data (handles new records gracefully)

**Example:**
```
GET /api/contacts?pagination[type]=cursor&pagination[limit]=50&pagination[cursor]=eyJ...
```

---

### **7.3 Pagination Response**

**Response Structure:**
```
{
  data: Contact[],
  pagination: {
    type: "offset" | "cursor",
    limit: number,
    
    // Offset-based
    offset?: number,
    total?: number,  // Total count (expensive, optional)
    has_more?: boolean,
    
    // Cursor-based
    next_cursor?: string,
    previous_cursor?: string,
    has_next?: boolean,
    has_previous?: boolean
  }
}
```

**Total Count:**
* Expensive for large datasets (requires COUNT query)
* Optional for offset-based pagination
* Not provided for cursor-based pagination (by design)

**Cursor Generation:**
* Generate from last result's `id` and sort field value
* Encode as base64 JSON
* Include in response for next page

---

### **7.4 Pagination Recommendations**

**For Small Datasets (< 10k contacts):**
* Use offset-based pagination
* Provide total count
* Show page numbers

**For Large Datasets (100k+ contacts):**
* Use cursor-based pagination
* Don't provide total count (too expensive)
* Use "Load More" or infinite scroll UI

**Hybrid Approach:**
* Default to cursor-based
* Support offset-based for backward compatibility
* Let client choose pagination type

---

## **11. API Query Contract**

### **11.1 Query Endpoint**

**Endpoint:**
```
GET /api/contacts
POST /api/contacts/query
```

**GET Endpoint (Simple Queries):**
* Query parameters for simple filters
* Suitable for basic filtering and search
* Limited to URL-safe parameters

**POST Endpoint (Complex Queries):**
* Request body for complex filters
* Suitable for advanced filters and complex queries
* No URL length limitations

---

### **11.2 GET /api/contacts (Simple Queries)**

**Query Parameters:**
```
GET /api/contacts?
  filters[basic][is_active][eq]=true
  &filters[basic][source][in]=manual,csv
  &search[query]=john@example.com
  &search[fields]=email,full_name
  &sort[field]=created_at
  &sort[direction]=desc
  &pagination[type]=cursor
  &pagination[limit]=50
  &pagination[cursor]=eyJ...
```

**Parameter Structure:**
* Nested object notation (bracket notation)
* Arrays: Comma-separated values
* Boolean: `true` or `false`
* Dates: ISO8601 strings

**Limitations:**
* URL length limits (2048 chars typical)
* Complex filters may exceed limits
* Use POST endpoint for complex queries

---

### **11.3 POST /api/contacts/query (Complex Queries)**

**Request Body:**
```json
{
  "filters": {
    "logic": "AND",
    "basic": {
      "is_active": { "eq": true },
      "is_subscribed": { "eq": true },
      "source": { "in": ["manual", "csv"] },
      "created_at": {
        "gte": "2024-01-01T00:00:00Z",
        "lte": "2024-12-31T23:59:59Z"
      }
    },
    "advanced": {
      "custom_fields": [
        {
          "field_name": "company_size",
          "operator": "gte",
          "value": 50
        },
        {
          "field_name": "industry",
          "operator": "in",
          "value": ["tech", "finance"]
        }
      ]
    }
  },
  "search": {
    "query": "john@example.com",
    "fields": ["email", "full_name"],
    "operator": "OR"
  },
  "sort": {
    "field": "created_at",
    "direction": "desc",
    "nulls_first": false
  },
  "pagination": {
    "type": "cursor",
    "limit": 50,
    "cursor": "eyJpZCI6InV1aWQiLCJjcmVhdGVkX2F0IjoiMjAyNC0wMS0wMVQwMDowMDowMFoifQ=="
  }
}
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "organization_id": "uuid",
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "mobile": "+1234567890",
      "source": "manual",
      "is_active": true,
      "is_subscribed": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-02T00:00:00Z",
      "custom_fields": {
        "company_size": 100,
        "industry": "tech"
      }
    }
  ],
  "pagination": {
    "type": "cursor",
    "limit": 50,
    "next_cursor": "eyJpZCI6InV1aWQiLCJjcmVhdGVkX2F0IjoiMjAyNC0wMS0wMlQwMDowMDowMFoifQ==",
    "has_next": true,
    "has_previous": false
  }
}
```

---

### **11.4 Query Validation**

**Required Fields:**
* `organization_id` (from context, not in request)
* `pagination.type`
* `pagination.limit`

**Validation Rules:**
* `pagination.limit`: 1-1000 (default: 50)
* `pagination.offset`: >= 0 (if type="offset")
* `search.query`: 1-500 characters
* `sort.field`: Must be valid sortable field
* `sort.direction`: "asc" or "desc"
* `filters.advanced.custom_fields[].field_name`: Must exist in organization
* `filters.advanced.custom_fields[].operator`: Must be valid operator
* `filters.advanced.custom_fields[].value`: Must match field type

**Error Responses:**
```json
{
  "error": "validation_error",
  "message": "Invalid query parameters",
  "details": {
    "pagination.limit": "Must be between 1 and 1000",
    "sort.field": "Invalid sort field: 'invalid_field'"
  }
}
```

---

## **12. Service Layer Responsibilities**

### **12.1 ContactQueryService**

**Responsibilities:**
* Parse and validate query parameters
* Classify query into mode (lookup/list/search/segment/analytics)
* Calculate query cost and enforce limits
* Optimize filter execution order
* Build query from filters, search, sort, pagination
* Execute query via repository
* Transform results to domain models
* Handle pagination cursor generation
* Return paginated results

**Methods:**

#### **12.1.1 `listContacts(query, context)`**

**Input:**
* `query`: ContactQuery object
* `context`: Request context (user_id, organization_id)

**Responsibilities:**
1. **Validate query**: Check required fields, validate filters, search, sort, pagination
2. **Check authorization**: Verify user can list contacts (via Policy layer)
3. **Classify query**: Determine query mode (lookup/list/search/segment/analytics)
4. **Calculate cost**: Analyze query cost and enforce limits
5. **Optimize filters**: Reorder filters by priority (Tier 1 → Tier 2 → Tier 3)
6. **Build basic filters**: Convert basic filters to repository query (Tier 1, Tier 2)
7. **Build search query**: Convert search to repository query (Tier 2)
8. **Build advanced filters**: Convert advanced filters to repository query (Tier 3, with JOINs)
9. **Build sort query**: Convert sort to repository query
10. **Build pagination query**: Convert pagination to repository query
11. **Execute query**: Call `ContactRepository.findMany()` with optimized query
12. **Transform results**: Convert database rows to domain models
13. **Fetch custom fields**: If requested, batch fetch custom field values
14. **Generate pagination metadata**: Generate next/previous cursors
15. **Return**: Paginated contact list

**Error Cases:**
* `ValidationError` - Invalid query parameters
* `OrganizationAccessDeniedError` - User not member of organization
* `CustomFieldNotFoundError` - Custom field doesn't exist (for advanced filters)

---

#### **9.1.2 `searchContacts(searchQuery, context)`**

**Input:**
* `searchQuery`: SearchQuery object
* `context`: Request context

**Responsibilities:**
1. **Validate search query**: Check query string length, fields
2. **Check authorization**: Verify user can search contacts
3. **Build search query**: Convert search to repository query
4. **Execute search**: Call `ContactRepository.search()`
5. **Transform results**: Convert to domain models
6. **Return**: Search results

**Note:** This is a convenience method that calls `listContacts()` with search-only query.

---

### **12.2 Query Validator (Internal)**

**Purpose:** Validate query structure and parameters

**Responsibilities:**
* Validate required fields
* Validate filter syntax
* Validate search query format
* Validate sort specifications
* Validate pagination parameters
* Return validation errors

---

### **12.3 Query Classifier (Internal)**

**Purpose:** Classify queries into modes for optimization

**Responsibilities:**
* Analyze query structure
* Detect query patterns
* Classify into mode (lookup/list/search/segment/analytics)
* Apply mode-specific optimizations
* Log query mode for analytics

---

### **12.4 Filter Optimizer (Internal)**

**Purpose:** Reorder filters for optimal execution

**Responsibilities:**
* Classify filters into priority tiers
* Reorder filters (Tier 1 → Tier 2 → Tier 3)
* Ensure `organization_id` is always first
* Optimize filter combinations
* Detect expensive filter combinations

---

### **12.5 Cost Analyzer (Internal)**

**Purpose:** Calculate query cost and enforce limits

**Responsibilities:**
* Analyze query structure
* Calculate total cost score
* Compare against thresholds
* Apply degradation strategies
* Reject expensive queries
* Provide cost feedback to users

---

### **12.6 Query Builder (Internal)**

**Purpose:** Build Supabase queries from query DSL

**Responsibilities:**
* Convert FilterSet to Supabase query filters
* Convert SearchQuery to Supabase ILIKE queries
* Convert SortSpec to Supabase order clauses
* Convert PaginationSpec to Supabase limit/offset or cursor logic
* Handle custom field JOINs for advanced filters

**Query Building Flow (Optimized):**
```
Query Builder
    │
    ├─► Start with base query: supabase.from('contacts')
    │
    ├─► Tier 1: Mandatory Scope (always first)
    │   └─► .eq('organization_id', orgId)
    │
    ├─► Tier 1: High-Selectivity Filters
    │   ├─► .eq('id', id) (if exact match)
    │   ├─► .eq('email', email) (if exact match)
    │   ├─► .gte('created_at', startDate).lte('created_at', endDate) (if range)
    │   ├─► .eq('is_active', true)
    │   └─► .in('source', ['manual', 'csv'])
    │
    ├─► Tier 2: Basic Filters
    │   ├─► .eq('is_subscribed', true)
    │   ├─► .gte('updated_at', date)
    │   ├─► .eq('created_by', userId)
    │   └─► .ilike('mobile', '%query%')
    │
    ├─► Tier 2: Search Filters
    │   ├─► .or('email.ilike.%query%,first_name.ilike.%query%')
    │   └─► .or('last_name.ilike.%query%')
    │
    ├─► Tier 3: Advanced Filters (if present, after narrowing)
    │   ├─► .select('*, contact_custom_field_values(*)')
    │   ├─► .eq('contact_custom_field_values.field_definition_id', defId)
    │   └─► .gte('contact_custom_field_values.value_number', 50)
    │
    ├─► Apply Sort
    │   ├─► .order('created_at', { ascending: false })
    │   └─► .nullsLast()
    │
    └─► Apply Pagination
        ├─► If offset: .range(offset, offset + limit - 1)
        └─► If cursor: .gt('created_at', cursorValue).limit(limit)
```

---

### **12.7 Filter Parser (Internal)**

**Purpose:** Parse and validate filter structures

**Responsibilities:**
* Validate filter syntax
* Validate filter values against field types
* Check custom field existence (for advanced filters)
* Transform filter DSL to query builder format

---

### **12.8 Search Engine (Internal)**

**Purpose:** Build search queries from search DSL

**Responsibilities:**
* Parse search query string
* Determine search fields
* Build ILIKE queries for each field
* Combine queries with AND/OR logic
* Optimize search query performance

---

### **12.9 Pagination Handler (Internal)**

**Purpose:** Handle pagination logic

**Responsibilities:**
* Generate pagination cursors from results
* Parse pagination cursors from requests
* Calculate offset-based pagination metadata
* Handle cursor-based pagination logic

**Cursor Generation:**
```
Last Result: { id: "uuid", created_at: "2024-01-02T00:00:00Z" }
Sort Field: "created_at"

Cursor = base64({
  id: "uuid",
  created_at: "2024-01-02T00:00:00Z"
})
```

**Cursor Parsing:**
```
Cursor = "eyJpZCI6InV1aWQiLCJjcmVhdGVkX2F0IjoiMjAyNC0wMS0wMlQwMDowMDowMFoifQ=="

Parsed = {
  id: "uuid",
  created_at: "2024-01-02T00:00:00Z"
}

Query: .gt('created_at', '2024-01-02T00:00:00Z').limit(50)
```

---

### **12.10 Result Mapper (Internal)**

**Purpose:** Transform database results to domain models

**Responsibilities:**
* Convert database rows to domain models
* Handle custom field value aggregation
* Format response data
* Generate pagination metadata

---

## **13. Performance Considerations**

### **13.1 Query Optimization**

**Basic Filters:**
* Always filter by `organization_id` first (indexed)
* Use indexed columns for filtering
* Combine multiple basic filters efficiently

**Advanced Filters (Custom Fields):**
* JOIN performance: O(n) in worst case
* Consider materialized views for frequently queried custom fields
* Limit number of custom field filters per query
* Cache custom field definitions

**Search:**
* Use indexed columns (email, mobile)
* Limit search to specific fields when possible
* Consider full-text search indexes (future)

**Sorting:**
* Prefer indexed fields (created_at, updated_at, email)
* Add composite indexes for common sort combinations
* Avoid sorting on non-indexed fields for large datasets

**Pagination:**
* Use cursor-based pagination for large datasets
* Avoid offset-based pagination with large offsets
* Don't provide total count for large datasets

---

### **13.2 Indexing Strategy**

**Required Indexes:**
* `(organization_id, is_active, deleted_at)` - Active contacts query
* `(organization_id, email)` - Email lookups and search
* `(organization_id, mobile)` - Mobile lookups and search
* `(organization_id, created_at)` - Chronological queries and sorting
* `(organization_id, source)` - Source filtering
* `(organization_id, is_subscribed)` - Subscription filtering

**Custom Field Indexes (Future):**
* `(contact_id, field_definition_id)` - Custom field value lookups
* Consider partial indexes for frequently queried custom fields

---

### **13.3 Query Limits**

**Maximum Limits:**
* `pagination.limit`: 1000 (prevent excessive data transfer)
* `search.query`: 500 characters (prevent abuse)
* `filters.advanced.custom_fields`: 10 filters per query (prevent complex queries)

**Performance Thresholds:**
* Query timeout: 30 seconds
* Large dataset threshold: 100k contacts
* Switch to cursor pagination automatically for large datasets

---

### **13.4 Caching Strategy**

**Cacheable Data:**
* Custom field definitions (per organization)
* Frequently used filter combinations
* Search results (with TTL, invalidate on contact changes)

**Cache Invalidation:**
* On contact create/update/delete
* On custom field definition changes
* On organization membership changes

---

## **14. Future Extensibility**

### **14.1 Segment-Based Queries**

**Conceptual Design:**
* Query contacts by segment membership
* Segments defined separately (future module)
* Filter: `filters.advanced.segments: [{ segment_id: "uuid" }]`

**Integration:**
* Add segment filter to AdvancedFilters
* Query segment membership table
* Combine with other filters

---

### **14.2 Custom Field Sorting**

**Conceptual Design:**
* Sort by custom field values
* Sort field: `custom_field:<field_name>`
* Requires JOIN with `contact_custom_field_values`

**Performance:**
* Slower than standard field sorting
* Consider materialized views for frequently sorted custom fields

---

### **14.3 Full-Text Search**

**Conceptual Design:**
* PostgreSQL full-text search (tsvector/tsquery)
* Search across all text fields (standard + custom)
* Ranking and relevance scoring

**Implementation:**
* Add full-text search index
* Use `to_tsvector()` and `to_tsquery()` functions
* Return ranked results

---

### **14.4 Advanced Search Features**

**Conceptual Design:**
* Fuzzy matching (typo tolerance)
* Phrase matching
* Boolean search operators (AND, OR, NOT)
* Field-specific search syntax

**Example:**
```
search: {
  query: "email:john@example.com OR name:John Doe",
  operator: "AND"
}
```

---

### **14.5 Query Analytics**

**Conceptual Design:**
* Track query performance
* Identify slow queries
* Optimize frequently used queries
* Query usage analytics

---

## **15. Status**

✅ **Enterprise Contact Query Engine architecture is complete and ready for implementation.**

This upgraded architecture provides:

**Core Features:**
* Flexible query DSL (basic and advanced filters)
* Multi-field search (email, name, mobile)
* Flexible sorting
* Efficient pagination (offset and cursor-based)
* Clear API contract

**Enterprise Patterns:**
* Filter execution strategy (priority-based pipeline)
* Query plan types (lookup/list/search/segment/analytics)
* Query cost limiting (prevent expensive queries)
* Automatic filter optimization
* Mode-specific query strategies

**Performance:**
* Optimized for 100k+ contacts per organization
* Indexed queries for standard fields
* Efficient pagination strategies
* Filter execution order optimization
* Query cost enforcement

**Security & Reliability:**
* Query cost limiting (prevent DDoS)
* Query validation and classification
* Automatic query optimization
* Performance degradation strategies

**Extensibility:**
* Custom field filtering support
* Future segment-based queries
* Full-text search ready
* Advanced search features ready

---

## **16. Related Documents**

* `Docs/Contacts/contacts-service-architecture.md` - Service layer architecture
* `Docs/Contacts/contacts-table-implementation-plan.md` - Table design and data rules
* `Docs/Contacts/contacts-schema-mvp.md` - MVP schema design
* `Docs/Overview/architecture-overview.md` - High-level system architecture

---
