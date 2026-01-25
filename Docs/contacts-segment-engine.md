# **CONTACTS SEGMENT ENGINE — ARCHITECTURE DESIGN**

---

## **1. Purpose of This Document**

This document defines the **segment engine architecture** for the Contacts module in a multi-tenant SaaS CRM using Supabase with Row Level Security (RLS).

The segment engine covers:

* Conceptual segment model
* Segment types (static vs dynamic)
* Evaluation strategy (real-time vs batch)
* Storage architecture
* Integration with Contact Query Engine DSL
* Performance strategy for 100k+ contacts per organization
* Integration with campaigns and automations
* Segment lifecycle management

**Note:** This document describes **conceptual architecture and behavior**, not implementation code.

---

## **2. Segment Engine Overview**

### **2.1 Purpose**

Segments are **saved contact queries** that define logical groupings of contacts. They enable:

* Reusable contact filters for campaigns and automations
* Pre-computed contact lists (static segments)
* Dynamic contact queries (dynamic segments)
* Efficient targeting for marketing campaigns
* Automation trigger conditions
* Contact analytics and reporting

### **2.2 Core Concept**

A segment is a **named, saved ContactQuery** that can be:
* Evaluated on-demand (dynamic segments)
* Pre-computed and stored (static segments)
* Used in campaigns, automations, and other modules
* Shared across an organization

### **2.3 Architecture Integration**

The Segment Engine integrates with the Contact Query Engine and service-layer architecture:

```
API Controller
    │
    ▼
SegmentService (Service Layer)
    │
    ├─► Segment Validator
    ├─► Segment Evaluator
    ├─► Membership Manager
    └─► Lifecycle Manager
    │
    ▼
SegmentExecutionEngine (Orchestration Layer)
    │
    ├─► Query Planner
    ├─► Execution Strategy Selector
    ├─► Dependency Resolver (for composed segments)
    ├─► Cache Manager
    ├─► Incremental Update Engine
    └─► Event Dispatcher
    │
    ├─► ContactQueryService (reuse DSL)
    │   └─► Query Engine
    │
    ▼
SegmentRepository (Data Layer)
    │
    └─► Supabase (with RLS)
        ├─► segments table
        └─► segment_memberships table (static/materialized segments)
```

---

## **3. Segment Model**

### **3.1 Segment Structure**

A segment consists of:

```
Segment {
  id: UUID (Primary Key)
  organization_id: UUID (Foreign Key → organizations.id)
  name: string (required, max 255 chars)
  description: string (optional, max 1000 chars)
  type: "static" | "dynamic" | "dynamic_materialized" (required)
  composition: SegmentComposition (required)
  consistency: "strong" | "eventual" | "lazy" (required, default: "eventual")
  status: "active" | "archived" | "draft" (required)
  membership_count: number (cached, for static/materialized segments)
  last_evaluated_at: TIMESTAMPTZ (nullable)
  materialization_refresh_interval_minutes: number (nullable, for dynamic_materialized)
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
  created_by: UUID (Foreign Key → profiles.id)
}
```

### **3.2 Segment Composition**

Segments can be defined as queries or set operations (union, intersection, difference):

```
SegmentComposition {
  type: "query" | "union" | "intersection" | "difference" (required)
  
  // if type = "query"
  query?: ContactQuery (reuses Query Engine DSL)
  
  // if type = set operation
  segments?: UUID[] (array of segment IDs to combine)
}
```

**Composition Types:**

**Query Composition:**
* Direct ContactQuery DSL
* Same as original segment model
* Example: `{ type: "query", query: { filters: {...} } }`

**Union Composition (A ∪ B):**
* Contacts in segment A OR segment B
* Example: `{ type: "union", segments: ["seg_vip", "seg_newsletter"] }`
* Result: All contacts that are VIP OR newsletter subscribers

**Intersection Composition (A ∩ B):**
* Contacts in segment A AND segment B
* Example: `{ type: "intersection", segments: ["seg_vip", "seg_recent_buyers"] }`
* Result: Contacts that are VIP AND purchased in last 30 days

**Difference Composition (A − B):**
* Contacts in segment A but NOT in segment B
* Example: `{ type: "difference", segments: ["seg_all_customers", "seg_churned"] }`
* Result: All customers EXCEPT churned users

**Nested Compositions (Future):**
* Set operations can reference other composed segments
* Example: `(A ∪ B) ∩ C` - Union of A and B, then intersect with C

### **3.3 Segment Query (ContactQuery DSL)**

When `composition.type = "query"`, the segment's `query` field reuses the **Contact Query Engine DSL**:

```
composition: {
  type: "query",
  query: {
    filters: {
      basic: {
        is_active: { eq: true },
        is_subscribed: { eq: true },
        source: { in: ["manual", "csv"] }
      },
      advanced: {
        custom_fields: [
          {
            field_name: "vip",
            operator: "eq",
            value: true
          }
        ]
      }
    },
    search: {
      query: "john@example.com",
      fields: ["email", "full_name"]
    }
    // Note: sort and pagination are not stored in segment query
    // They are applied when segment is evaluated
  }
}
```

**Query Constraints:**
* `organization_id` is automatically added (from segment context)
* `sort` and `pagination` are not stored (applied during evaluation)
* All Contact Query Engine features are supported (basic filters, advanced filters, search)

### **3.4 Segment Consistency Model**

Segments define consistency guarantees based on use case:

**Consistency Levels:**

| Level | Meaning | Use Cases | Update Strategy |
|-------|---------|-----------|-----------------|
| `strong` | Always accurate, real-time | Automation triggers, real-time checks | Dynamic evaluation or incremental updates |
| `eventual` | Updated via batch/incremental | Campaign targeting, analytics | Batch jobs, scheduled refresh |
| `lazy` | Updated only when accessed | Infrequent segments, ad-hoc analysis | On-demand evaluation |

**Consistency Selection:**

**Choose Strong When:**
* Segment used in automation triggers
* Real-time membership checks required
* Accuracy is critical

**Choose Eventual When:**
* Segment used in campaigns (batch sending)
* Analytics and reporting
* Near-real-time is acceptable

**Choose Lazy When:**
* Segment used infrequently
* Ad-hoc analysis
* Performance over accuracy

---

## **4. Segment Types**

### **4.1 Static Segments**

**Characteristics:**
* Pre-computed contact membership
* Membership stored in `segment_memberships` table
* Fast to query (direct table lookup)
* Requires re-evaluation when contacts change

**Use Cases:**
* Frequently used segments
* Large segments (10k+ contacts)
* Campaign targeting (fast membership checks)
* Analytics and reporting

**Storage:**
* Segment definition in `segments` table
* Contact membership in `segment_memberships` table
* Membership count cached in `segments.membership_count`

**Evaluation:**
* **Initial**: Evaluate query, store all matching contact IDs
* **Updates**: Re-evaluate when contacts change (batch or real-time)
* **Query**: Direct lookup from `segment_memberships` table

**Performance:**
* Query time: O(1) for membership check (indexed lookup)
* Storage: O(n) where n = number of contacts in segment
* Update time: O(m) where m = number of contacts to re-evaluate

**Consistency:**
* Typically `eventual` (updated via batch)
* Can be `strong` with incremental updates

---

### **4.2 Dynamic Segments**

**Characteristics:**
* Evaluated on-demand (no pre-computation)
* No membership storage
* Always reflects current contact state
* Slower to query (runs query each time)

**Use Cases:**
* Infrequently used segments
* Segments that change frequently
* Complex queries that are hard to maintain
* Ad-hoc analysis

**Storage:**
* Segment definition in `segments` table only
* No `segment_memberships` entries
* `membership_count` is null or calculated on-demand

**Evaluation:**
* **On-Demand**: Execute ContactQuery each time segment is accessed
* **No Caching**: Always reflects current database state
* **Query**: Run full query via ContactQueryService

**Performance:**
* Query time: O(n) where n = number of contacts (query execution)
* Storage: O(1) (no membership storage)
* Update time: N/A (always current)

**Consistency:**
* Always `strong` (always current)

---

### **4.3 Materialized Dynamic Segments**

**Characteristics:**
* Query is dynamic (ContactQuery DSL)
* Results are cached periodically
* Membership stored in `segment_memberships` table (like static)
* Refreshed every N minutes (configurable)

**Use Cases:**
* Dynamic segments that become expensive at scale
* Segments used frequently but need near-real-time accuracy
* Balance between performance and freshness

**Storage:**
* Segment definition in `segments` table
* Contact membership in `segment_memberships` table (cached)
* Membership count cached in `segments.membership_count`
* `materialization_refresh_interval_minutes` defines refresh frequency

**Evaluation:**
* **Initial**: Evaluate query, store matching contact IDs
* **Refresh**: Re-evaluate periodically (every N minutes)
* **Query**: Direct lookup from `segment_memberships` table (fast)
* **Accuracy**: Near-real-time (within refresh interval)

**Performance:**
* Query time: O(1) for membership check (indexed lookup, like static)
* Storage: O(n) where n = number of contacts in segment
* Refresh time: O(m) where m = total contacts (periodic re-evaluation)

**Consistency:**
* Typically `eventual` (updated periodically)
* Refresh interval determines staleness (e.g., 5 minutes = max 5 min stale)

**Refresh Strategy:**
* Scheduled refresh (every N minutes)
* Manual refresh (user-triggered)
* Event-driven refresh (on significant contact changes, future)

---

### **4.4 Segment Type Selection**

**Choose Static When:**
* Segment is used frequently (campaigns, automations)
* Segment has 1k+ contacts (storage cost acceptable)
* Segment query is expensive (custom fields, complex filters)
* Eventual consistency is acceptable
* Query doesn't change frequently

**Choose Dynamic When:**
* Segment is used infrequently
* Segment has < 1k contacts (query is fast)
* Segment query is simple (basic filters only)
* Always-current data is critical (strong consistency)
* Query changes frequently

**Choose Materialized Dynamic When:**
* Dynamic segment becomes expensive at scale
* Segment is used frequently but needs near-real-time accuracy
* Balance between performance and freshness needed
* Refresh interval acceptable (e.g., 5-15 minutes)

**Auto-Conversion (Future):**
* Dynamic segments used frequently → convert to materialized dynamic
* Materialized dynamic segments unused → convert to dynamic
* Static segments unused → convert to dynamic

---

## **5. Evaluation Strategy**

### **5.1 Real-Time Evaluation**

**Purpose:** Evaluate segments immediately when needed

**Use Cases:**
* User views segment in UI
* Campaign targets segment (on-demand)
* Automation checks segment membership
* Segment preview/validation

**Process:**
```
1. User requests segment evaluation
2. SegmentService.getContacts(segmentId)
3. If static: Query segment_memberships table
4. If dynamic: Execute ContactQuery via ContactQueryService
5. Return contacts
```

**Performance:**
* Static: Fast (O(1) lookup)
* Dynamic: Slower (O(n) query execution)

---

### **5.2 Batch Evaluation**

**Purpose:** Pre-compute segment membership for static segments

**Use Cases:**
* Initial segment creation
* Segment query changes
* Contact data changes (bulk updates)
* Scheduled re-evaluation

**Process:**
```
1. Trigger batch evaluation (manual or scheduled)
2. SegmentService.evaluateSegment(segmentId)
3. Execute ContactQuery via ContactQueryService
4. Get all matching contact IDs
5. Store in segment_memberships table (replace existing)
6. Update segments.membership_count
7. Update segments.last_evaluated_at
```

**Triggers:**
* **Manual**: User clicks "Re-evaluate Segment"
* **On Change**: When segment query is updated
* **Scheduled**: Daily/weekly batch job
* **Event-Driven**: When contacts are created/updated/deleted (future)

**Performance:**
* Evaluation time: O(n) where n = total contacts
* Storage time: O(m) where m = matching contacts
* Can be slow for large datasets (100k+ contacts)

---

### **5.3 Incremental Evaluation (Future)**

**Purpose:** Update segment membership incrementally instead of full re-evaluation

**Use Cases:**
* Large segments (10k+ contacts)
* Frequent contact updates
* Real-time segment updates

**Process:**
```
1. Contact is created/updated/deleted
2. Check if contact matches segment query
3. If matches and not in segment: Add to segment_memberships
4. If doesn't match and in segment: Remove from segment_memberships
5. Update membership_count
```

**Performance:**
* Update time: O(1) per contact change
* Much faster than full re-evaluation for large segments

---

### **5.4 Evaluation Scheduling**

**Static Segment Evaluation:**
* **On Creation**: Full evaluation
* **On Query Change**: Full re-evaluation
* **Scheduled**: Daily batch job (e.g., 2 AM)
* **Manual**: User-triggered re-evaluation

**Dynamic Segment Evaluation:**
* **On-Demand**: Every time segment is accessed
* **No Scheduling**: Always current

---

## **6. Storage Architecture**

### **6.1 Segments Table**

**Purpose:** Store segment definitions

**Structure (Conceptual):**
```
segments
├── id (UUID, Primary Key)
├── organization_id (UUID, Foreign Key → organizations.id)
├── name (TEXT, required, max 255)
├── description (TEXT, nullable, max 1000)
├── type (ENUM: 'static', 'dynamic', 'dynamic_materialized', required)
├── composition (JSONB, required, stores SegmentComposition)
├── consistency (ENUM: 'strong', 'eventual', 'lazy', required, default: 'eventual')
├── materialization_refresh_interval_minutes (INTEGER, nullable, for dynamic_materialized)
├── status (ENUM: 'active', 'archived', 'draft', required)
├── membership_count (INTEGER, nullable, cached for static segments)
├── last_evaluated_at (TIMESTAMPTZ, nullable)
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ)
└── created_by (UUID, nullable, Foreign Key → profiles.id)
```

**Indexes:**
* `(organization_id, status)` - List active segments
* `(organization_id, type)` - Filter by type
* `(organization_id, created_at)` - Chronological queries

**RLS Policies:**
* Users can read segments in their organization
* Users can create segments in their organization
* Users can update/delete their own segments (or based on role)

---

### **6.2 Segment Memberships Table (Static Segments Only)**

**Purpose:** Store contact membership for static segments

**Structure (Conceptual):**
```
segment_memberships
├── id (UUID, Primary Key)
├── segment_id (UUID, Foreign Key → segments.id, ON DELETE CASCADE)
├── contact_id (UUID, Foreign Key → contacts.id, ON DELETE CASCADE)
├── added_at (TIMESTAMPTZ, when contact was added to segment)
└── UNIQUE(segment_id, contact_id) - Prevent duplicates
```

**Indexes:**
* `(segment_id, contact_id)` - Unique composite index
* `(contact_id, segment_id)` - Reverse lookup (which segments is contact in?)
* `(segment_id, added_at)` - Chronological membership queries

**RLS Policies:**
* Users can read memberships for segments in their organization
* System can create/delete memberships (via service role)
* Users cannot directly modify memberships (managed by SegmentService)

**Storage Considerations:**
* Only for static segments
* Can grow large (10k+ contacts per segment)
* Consider partitioning for very large segments (future)
* Archive old memberships when segment is archived

---

### **6.3 Query Storage (JSONB)**

**Purpose:** Store ContactQuery DSL in `segments.query` field

**Structure:**
```json
{
  "filters": {
    "basic": {
      "is_active": { "eq": true },
      "is_subscribed": { "eq": true }
    },
    "advanced": {
      "custom_fields": [
        {
          "field_name": "vip",
          "operator": "eq",
          "value": true
        }
      ]
    }
  },
  "search": {
    "query": "john@example.com",
    "fields": ["email", "full_name"]
  }
}
```

**Benefits:**
* Flexible schema (no need to normalize query structure)
* Easy to update (modify JSON)
* Compatible with Contact Query Engine DSL
* Can store complex nested queries

**Limitations:**
* Harder to query directly (requires JSONB operators)
* Validation must be done in application layer
* No referential integrity for custom field names

---

## **7. Segment Execution Engine**

### **7.1 Purpose**

The Segment Execution Engine is a dedicated orchestration layer that handles complex segment operations, including composed segments, materialization, incremental updates, and event dispatching.

### **7.2 Architecture**

```
SegmentExecutionEngine
    │
    ├─► Query Planner
    │   └─► Plans execution strategy for segments
    │
    ├─► Execution Strategy Selector
    │   └─► Chooses static/dynamic/materialized execution
    │
    ├─► Dependency Resolver
    │   └─► Resolves composed segment dependencies
    │
    ├─► Cache Manager
    │   └─► Manages membership caching and invalidation
    │
    ├─► Incremental Update Engine
    │   └─► Handles incremental membership updates
    │
    └─► Event Dispatcher
        └─► Emits segment events (SegmentContactAdded, etc.)
```

### **7.3 Query Planner**

**Purpose:** Plans execution strategy for segment evaluation

**Responsibilities:**
* Analyze segment composition type
* Determine execution order for composed segments
* Optimize query execution (avoid redundant evaluations)
* Plan batch vs incremental evaluation

**Planning Process:**
```
1. Analyze segment.composition.type
2. If "query": Plan direct query execution
3. If "union"/"intersection"/"difference":
   - Resolve dependent segments (via Dependency Resolver)
   - Plan execution order (evaluate dependencies first)
   - Plan set operation execution
4. Return execution plan
```

---

### **7.4 Execution Strategy Selector**

**Purpose:** Chooses optimal execution strategy based on segment type and consistency

**Strategy Selection:**

| Segment Type | Consistency | Strategy |
|--------------|-------------|----------|
| `static` | `eventual` | Batch evaluation, store memberships |
| `static` | `strong` | Incremental updates, store memberships |
| `dynamic` | `strong` | On-demand evaluation, no storage |
| `dynamic_materialized` | `eventual` | Periodic refresh, store memberships |

**Selection Logic:**
```
If type = "static":
  If consistency = "strong": Use incremental updates
  Else: Use batch evaluation

If type = "dynamic":
  Always: Use on-demand evaluation

If type = "dynamic_materialized":
  Use periodic refresh (scheduled or manual)
```

---

### **7.5 Dependency Resolver**

**Purpose:** Resolves dependencies for composed segments

**Responsibilities:**
* Load dependent segments (for union/intersection/difference)
* Detect circular dependencies
* Resolve nested compositions
* Ensure all dependencies are evaluated before composition

**Resolution Process:**
```
1. Load segment.composition.segments (array of segment IDs)
2. For each dependent segment:
   - Load segment definition
   - If composed: Recursively resolve dependencies
   - Check if segment is evaluated (for static/materialized)
   - If not evaluated: Trigger evaluation
3. Detect circular dependencies (A depends on B, B depends on A)
4. Return dependency graph
```

**Circular Dependency Detection:**
* Build dependency graph
* Detect cycles using DFS
* Reject segment creation if cycle detected
* Error: "Circular dependency detected in segment composition"

---

### **7.6 Cache Manager**

**Purpose:** Manages membership caching and invalidation

**Responsibilities:**
* Cache segment memberships (for static/materialized)
* Invalidate cache on contact changes
* Invalidate cache on segment query changes
* Manage cache TTL for materialized segments

**Cache Invalidation:**
* **On Contact Change**: Invalidate affected segments
* **On Segment Query Change**: Invalidate segment cache
* **On Dependent Segment Change**: Invalidate composed segments
* **On TTL Expiry**: Refresh materialized segments

**Cache Strategy:**
* Static segments: Cache until re-evaluation
* Materialized segments: Cache until refresh interval
* Dynamic segments: No cache (always current)

---

### **7.7 Incremental Update Engine**

**Purpose:** Handles incremental membership updates for strong consistency

**Responsibilities:**
* Detect contact changes (create/update/delete)
* Check if contact matches segment query
* Add/remove contact from segment membership
* Update membership count
* Emit events (SegmentContactAdded, SegmentContactRemoved)

**Update Process:**
```
1. Contact is created/updated/deleted
2. For each active segment:
   - If consistency = "strong":
     - Check if contact matches segment query
     - If matches and not in segment: Add membership
     - If doesn't match and in segment: Remove membership
     - Update membership_count
     - Emit event
```

**Performance:**
* O(1) per contact change per segment
* Much faster than full re-evaluation for large segments
* Suitable for real-time updates

---

### **7.8 Event Dispatcher**

**Purpose:** Emits segment events for integrations

**Events:**
* `SegmentContactAdded` - Contact added to segment
* `SegmentContactRemoved` - Contact removed from segment
* `SegmentEvaluated` - Segment re-evaluation completed
* `SegmentCompositionEvaluated` - Composed segment evaluated

**Event Payload:**
```
SegmentContactAdded {
  segment_id: UUID,
  contact_id: UUID,
  organization_id: UUID,
  timestamp: ISO8601
}
```

**Integration:**
* Automation triggers (on SegmentContactAdded)
* Analytics tracking
* Webhook notifications
* Audit logging

---

## **8. Segment Algebra (Set Operations)**

### **8.1 Union Segments (A ∪ B)**

**Purpose:** Contacts in segment A OR segment B

**Composition:**
```json
{
  "type": "union",
  "segments": ["seg_vip", "seg_newsletter"]
}
```

**Execution:**
```
1. Evaluate segment A (get contact IDs)
2. Evaluate segment B (get contact IDs)
3. Union: A ∪ B (combine, remove duplicates)
4. Return combined contact list
```

**Use Cases:**
* "VIP customers OR newsletter subscribers"
* "Active users OR trial users"
* "Multiple audience groups combined"

**Performance:**
* O(n + m) where n = size of A, m = size of B
* Efficient for static segments (direct membership lookup)
* Slower for dynamic segments (requires query execution)

---

### **8.2 Intersection Segments (A ∩ B)**

**Purpose:** Contacts in segment A AND segment B

**Composition:**
```json
{
  "type": "intersection",
  "segments": ["seg_vip", "seg_recent_buyers"]
}
```

**Execution:**
```
1. Evaluate segment A (get contact IDs)
2. Evaluate segment B (get contact IDs)
3. Intersection: A ∩ B (contacts in both)
4. Return intersecting contact list
```

**Use Cases:**
* "VIP customers AND purchased last 30 days"
* "Subscribed AND active users"
* "Multiple conditions combined"

**Performance:**
* O(min(n, m)) where n = size of A, m = size of B
* More efficient than union (smaller result set)
* Can optimize by evaluating smaller segment first

---

### **8.3 Difference Segments (A − B)**

**Purpose:** Contacts in segment A but NOT in segment B

**Composition:**
```json
{
  "type": "difference",
  "segments": ["seg_all_customers", "seg_churned"]
}
```

**Execution:**
```
1. Evaluate segment A (get contact IDs)
2. Evaluate segment B (get contact IDs)
3. Difference: A − B (contacts in A but not in B)
4. Return difference contact list
```

**Use Cases:**
* "All customers EXCEPT churned users"
* "Active users EXCEPT trial users"
* "Exclusion-based targeting"

**Performance:**
* O(n + m) where n = size of A, m = size of B
* Similar to union, but with exclusion logic

---

### **8.4 Composed Segment Evaluation**

**Evaluation Process:**
```
1. Dependency Resolver: Load all dependent segments
2. For each dependent segment:
   - If static/materialized: Load from segment_memberships
   - If dynamic: Evaluate via ContactQueryService
3. Execute set operation (union/intersection/difference)
4. If result segment is static/materialized: Store memberships
5. Return result
```

**Optimization:**
* Cache dependent segment results
* Evaluate smaller segments first (for intersection)
* Use database set operations when possible (future)

---

### **8.5 Nested Compositions (Future)**

**Conceptual Design:**
* Set operations can reference other composed segments
* Example: `(A ∪ B) ∩ C`
* Requires recursive dependency resolution

**Example:**
```json
{
  "type": "intersection",
  "segments": [
    "seg_union_ab",  // Composed segment: A ∪ B
    "seg_c"
  ]
}
```

---

### **9.1 Query Reuse**

**Segment Query = ContactQuery DSL**

Segments store queries using the exact same DSL as the Contact Query Engine:

```
Segment.query = ContactQuery (without sort and pagination)
```

**Benefits:**
* Single source of truth for query logic
* Reuse all Query Engine features (filters, search, etc.)
* Consistent behavior across segments and direct queries
* No duplicate query parsing/validation logic

---

### **9.2 Evaluation via ContactQueryService**

**Static Segment Evaluation:**
```
1. Load segment.query (ContactQuery DSL)
2. Add organization_id from segment context
3. Call ContactQueryService.listContacts(query)
4. Extract contact IDs from results
5. Store in segment_memberships table
```

**Dynamic Segment Evaluation:**
```
1. Load segment.query (ContactQuery DSL)
2. Add organization_id from segment context
3. Call ContactQueryService.listContacts(query)
4. Return results directly (no storage)
```

---

### **9.3 Query Validation**

**Validation Rules:**
* Segment query must be valid ContactQuery DSL
* `organization_id` is automatically added (not in stored query)
* `sort` and `pagination` are not stored (applied during evaluation)
* Custom field names must exist in organization
* Query cost must be within limits (reuse Cost Analyzer)

**Validation Process:**
```
1. Parse segment.query as ContactQuery
2. Validate using ContactQueryService validation
3. Check custom field existence (for advanced filters)
4. Calculate query cost (reuse Cost Analyzer)
5. Reject if cost > threshold
```

---

## **10. Performance Strategy**

### **10.1 Static Segment Optimization**

**Membership Caching:**
* Store membership in `segment_memberships` table
* Fast lookup: O(1) with indexed query
* No query execution needed for membership checks

**Membership Count Caching:**
* Cache count in `segments.membership_count`
* Update on re-evaluation
* Fast for UI display (no COUNT query needed)

**Batch Evaluation:**
* Re-evaluate during off-peak hours
* Use batch jobs for large segments
* Incremental updates for frequent changes (future)

---

### **10.2 Dynamic Segment Optimization**

**Query Optimization:**
* Reuse Contact Query Engine optimizations
* Filter execution order (Tier 1 → Tier 2 → Tier 3)
* Query cost limiting
* Index usage

**Caching (Future):**
* Cache query results with TTL
* Invalidate on contact changes
* Use for frequently accessed dynamic segments

---

### **10.3 Materialized Dynamic Segment Optimization**

**Membership Caching:**
* Store membership in `segment_memberships` table (like static)
* Fast lookup: O(1) with indexed query
* Periodic refresh maintains freshness

**Refresh Strategy:**
* Scheduled refresh (every N minutes)
* Manual refresh (user-triggered)
* Event-driven refresh (on significant changes, future)

**Performance:**
* Query time: O(1) for membership check (same as static)
* Refresh time: O(n) where n = total contacts (periodic)
* Balance between performance and freshness

---

### **10.4 Large Dataset Handling (100k+ Contacts)**

**Static Segments:**
* Batch evaluation in chunks (e.g., 10k contacts per batch)
* Use cursor pagination for evaluation
* Store memberships incrementally
* Consider materialized views for very large segments (future)

**Dynamic Segments:**
* Use cursor pagination for results
* Limit result set size (max 10k contacts per query)
* Warn users if segment is too large
* Suggest converting to static segment

**Performance Thresholds:**
* Static segment with > 50k contacts: Batch evaluation only
* Dynamic segment with > 10k results: Warn user, suggest static
* Query timeout: 30 seconds (same as Contact Query Engine)

---

### **10.5 Indexing Strategy**

**Segments Table:**
* `(organization_id, status)` - List active segments
* `(organization_id, type)` - Filter by type
* `(organization_id, created_at)` - Chronological queries

**Segment Memberships Table:**
* `(segment_id, contact_id)` - Unique, fast membership lookup
* `(contact_id, segment_id)` - Reverse lookup (contact's segments)
* `(segment_id, added_at)` - Chronological membership

**Query Performance:**
* Reuse Contact Query Engine indexes
* No additional indexes needed for segment queries

---

## **11. Segment Lifecycle**

### **11.1 Creation**

**Process:**
1. User defines segment (name, description, composition, type, consistency)
2. Validate segment composition:
   - If query: Validate ContactQuery DSL
   - If set operation: Validate dependent segments, check for circular dependencies
3. Determine segment type (static/dynamic/materialized, or user choice)
4. Set consistency level (strong/eventual/lazy, or default)
5. Create segment record in `segments` table
6. If static/materialized: Trigger initial evaluation (batch or incremental)
7. Return segment with status "active" or "draft"

**Validation:**
* Name must be unique per organization
* Composition must be valid (query DSL or set operation)
* If set operation: Dependent segments must exist and be active
* If set operation: No circular dependencies
* Query cost must be within limits (for query compositions)
* Custom fields must exist (for query compositions)

---

### **11.2 Update**

**Process:**
1. User updates segment (name, description, composition, type, consistency)
2. Validate updated composition
3. Update segment record
4. If composition changed:
   - If static/materialized: Trigger re-evaluation
   - If dynamic: No action needed (always current)
5. If consistency changed:
   - If changed to "strong": Enable incremental updates
   - If changed from "strong": Disable incremental updates

**Composition Changes:**
* Static segment: Full re-evaluation required
* Materialized segment: Trigger refresh
* Dynamic segment: No re-evaluation (always current)

---

### **11.3 Evaluation**

**Static Segment:**
1. Load segment.query
2. Execute via ContactQueryService.listContacts()
3. Get all matching contact IDs (use pagination to fetch all)
4. Delete existing memberships for segment
5. Insert new memberships in batches
6. Update segments.membership_count
7. Update segments.last_evaluated_at

**Dynamic Segment:**
1. Load segment.query
2. Execute via ContactQueryService.listContacts()
3. Return results directly (no storage)

---

### **11.4 Archival**

**Process:**
1. User archives segment
2. Update segments.status = "archived"
3. If static: Optionally delete segment_memberships (or keep for history)
4. Segment is hidden from active lists
5. Can be restored later

**Use Cases:**
* Segment no longer needed
* Segment query is outdated
* Cleanup old segments

---

### **11.5 Deletion**

**Process:**
1. User deletes segment
2. Check if segment is used in campaigns/automations
3. If used: Prevent deletion or warn user
4. Delete segment_memberships (CASCADE)
5. Delete segment record

**Safety Checks:**
* Prevent deletion if segment is referenced
* Warn user about impact
* Optionally archive instead of delete

---

## **12. Integration with Campaigns and Automations**

### **12.1 Campaign Integration**

**Use Case:** Target campaigns to specific segments

**Integration Pattern:**
```
CampaignService
    │
    ├─► SegmentService.getContacts(segmentId)
    │   │
    │   ├─► If static: Query segment_memberships
    │   └─► If dynamic: Execute ContactQuery
    │
    └─► Filter by is_subscribed = true
    └─► Send campaign to segment contacts
```

**Performance:**
* Static segments: Fast (direct membership lookup)
* Dynamic segments: Slower (query execution)

**API:**
```
POST /api/campaigns
{
  "segment_id": "uuid",
  "template_id": "uuid",
  ...
}
```

---

### **12.2 Automation Integration**

**Use Case:** Trigger automations based on segment membership

**Integration Patterns:**

**Pattern 1: Contact Enters Segment**
```
1. Contact is created/updated
2. Check if contact matches segment query
3. If matches and not in segment: Add to segment
4. Emit SegmentContactAdded event
5. Automation triggers on event
```

**Pattern 2: Segment Membership Check**
```
AutomationService
    │
    ├─► Check if contact is in segment
    │   │
    │   ├─► If static: Query segment_memberships
    │   └─► If dynamic: Execute ContactQuery
    │
    └─► If in segment: Trigger automation
```

**Events:**
* `SegmentContactAdded` - Contact added to segment
* `SegmentContactRemoved` - Contact removed from segment
* `SegmentEvaluated` - Segment re-evaluation completed

---

### **12.3 Analytics Integration**

**Use Case:** Analyze segment performance and contact behavior

**Integration Pattern:**
```
AnalyticsService
    │
    ├─► SegmentService.getContacts(segmentId)
    │
    ├─► Calculate segment metrics:
    │   ├─► Total contacts
    │   ├─► Active contacts
    │   ├─► Engagement rate
    │   └─► Conversion rate
    │
    └─► Compare segments
```

**Metrics:**
* Segment size (membership_count for static)
* Contact growth over time
* Engagement metrics (opens, clicks, conversions)
* Campaign performance per segment

---

## **13. Service Layer Responsibilities**

### **13.1 SegmentService**

**Responsibilities:**
* Create, update, delete segments
* Validate segment compositions (queries and set operations)
* Delegate to SegmentExecutionEngine for evaluation
* Manage segment lifecycle
* Handle segment API operations

**Methods:**

#### **13.1.1 `createSegment(data, context)`**

**Input:**
* `data`: Segment data (name, description, type, query)
* `context`: Request context (user_id, organization_id)

**Responsibilities:**
1. Validate segment composition (query or set operation)
2. If query: Validate ContactQuery DSL, check cost
3. If set operation: Validate dependent segments, check for circular dependencies
4. Create segment record
5. Delegate to SegmentExecutionEngine for initial evaluation (if static/materialized)
6. Return created segment

---

#### **13.1.2 `updateSegment(id, data, context)`**

**Input:**
* `id`: Segment ID
* `data`: Partial segment data
* `context`: Request context

**Responsibilities:**
1. Load existing segment
2. If composition changed: Validate new composition
3. Update segment record
4. Delegate to SegmentExecutionEngine for re-evaluation (if needed)
5. Return updated segment

---

#### **13.1.3 `evaluateSegment(id, context)`**

**Input:**
* `id`: Segment ID
* `context`: Request context

**Responsibilities:**
1. Load segment
2. Delegate to SegmentExecutionEngine.evaluateSegment()
3. SegmentExecutionEngine handles:
   - Query planning
   - Dependency resolution (for composed segments)
   - Execution strategy selection
   - Membership storage (for static/materialized)
   - Event dispatching
4. Update last_evaluated_at
5. Return evaluation result

---

#### **13.1.4 `getContacts(segmentId, pagination, context)`**

**Input:**
* `segmentId`: Segment ID
* `pagination`: Pagination spec
* `context`: Request context

**Responsibilities:**
1. Load segment
2. Delegate to SegmentExecutionEngine.getContacts()
3. SegmentExecutionEngine handles:
   - Query planning (for query compositions)
   - Dependency resolution (for set operations)
   - Execution strategy (static/dynamic/materialized)
   - Membership lookup or query execution
   - Pagination
4. Return paginated contacts

---

#### **13.1.5 `checkMembership(segmentId, contactId, context)`**

**Input:**
* `segmentId`: Segment ID
* `contactId`: Contact ID
* `context`: Request context

**Responsibilities:**
1. Load segment
2. If static:
   - Query segment_memberships table (O(1) lookup)
3. If dynamic:
   - Execute ContactQuery with contact filter
   - Check if contact matches
4. Return boolean (is member)

---

### **13.2 SegmentExecutionEngine**

**Responsibilities:**
* Plan segment evaluation (Query Planner)
* Select execution strategy (Execution Strategy Selector)
* Resolve dependencies (Dependency Resolver)
* Manage caching (Cache Manager)
* Handle incremental updates (Incremental Update Engine)
* Dispatch events (Event Dispatcher)
* Execute segment evaluations
* Handle composed segment operations

**Methods:**
* `evaluateSegment(segmentId, context)` - Evaluate segment (query or set operation)
* `getContacts(segmentId, pagination, context)` - Get segment contacts
* `checkMembership(segmentId, contactId, context)` - Check contact membership
* `evaluateComposition(composition, context)` - Evaluate set operations
* `resolveDependencies(segmentId)` - Resolve segment dependencies
* `incrementalUpdate(contactId, context)` - Handle contact change

---

### **13.3 SegmentRepository**

**Responsibilities:**
* Database queries for segments
* Database queries for segment_memberships
* RLS enforcement (via Supabase)

**Methods:**
* `create(segmentData)`
* `findById(id, organizationId)`
* `findMany(filters, pagination, organizationId)`
* `update(id, organizationId, updateData)`
* `delete(id, organizationId)`
* `getMemberships(segmentId, pagination)`
* `addMembership(segmentId, contactId)`
* `removeMembership(segmentId, contactId)`
* `replaceMemberships(segmentId, contactIds)`

---

## **14. API Contract**

### **14.1 Create Segment**

**Endpoint:** `POST /api/segments`

**Request (Query Segment):**
```json
{
  "name": "VIP Customers",
  "description": "High-value customers with VIP status",
  "type": "static",
  "consistency": "eventual",
  "composition": {
    "type": "query",
    "query": {
      "filters": {
        "basic": {
          "is_active": { "eq": true },
          "is_subscribed": { "eq": true }
        },
        "advanced": {
          "custom_fields": [
            {
              "field_name": "vip",
              "operator": "eq",
              "value": true
            }
          ]
        }
      }
    }
  }
}
```

**Request (Union Segment):**
```json
{
  "name": "VIP or Newsletter",
  "description": "VIP customers OR newsletter subscribers",
  "type": "static",
  "consistency": "eventual",
  "composition": {
    "type": "union",
    "segments": ["seg_vip", "seg_newsletter"]
  }
}
```

**Request (Materialized Dynamic Segment):**
```json
{
  "name": "Recent Buyers",
  "description": "Customers who purchased in last 30 days",
  "type": "dynamic_materialized",
  "consistency": "eventual",
  "materialization_refresh_interval_minutes": 15,
  "composition": {
    "type": "query",
    "query": {
      "filters": {
        "advanced": {
          "custom_fields": [
            {
              "field_name": "last_purchase_date",
              "operator": "gte",
              "value": "2024-01-01T00:00:00Z"
            }
          ]
        }
      }
    }
  }
}
```

**Response:**
```json
{
  "id": "uuid",
  "organization_id": "uuid",
  "name": "VIP Customers",
  "description": "High-value customers with VIP status",
  "type": "static",
  "consistency": "eventual",
  "composition": {
    "type": "query",
    "query": { ... }
  },
  "status": "active",
  "membership_count": null,
  "last_evaluated_at": null,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

---

### **14.2 Get Segment Contacts**

**Endpoint:** `GET /api/segments/:id/contacts`

**Query Parameters:**
* `pagination[type]`: "offset" | "cursor"
* `pagination[limit]`: number
* `pagination[offset]` or `pagination[cursor]`: pagination value

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe",
      ...
    }
  ],
  "pagination": {
    "type": "cursor",
    "limit": 50,
    "next_cursor": "...",
    "has_next": true
  }
}
```

---

### **14.3 Evaluate Segment**

**Endpoint:** `POST /api/segments/:id/evaluate`

**Response:**
```json
{
  "segment_id": "uuid",
  "status": "completed",
  "membership_count": 1250,
  "evaluated_at": "2024-01-01T12:00:00Z",
  "duration_ms": 1250
}
```

---

## **15. Status**

✅ **Enterprise Segment Engine architecture is complete and ready for implementation.**

This upgraded architecture provides:

**Core Features:**
* Three segment types (static, dynamic, materialized dynamic)
* Segment algebra (union, intersection, difference)
* Segment composition (queries and set operations)
* Consistency model (strong, eventual, lazy)
* Reuse of Contact Query Engine DSL
* Real-time and batch evaluation
* Efficient membership storage and lookup
* Clear API contract

**Enterprise Patterns:**
* Segment Execution Engine (dedicated orchestration)
* Query planning and dependency resolution
* Execution strategy selection
* Cache management and invalidation
* Incremental update engine
* Event-driven architecture

**Performance:**
* Optimized for 100k+ contacts per organization
* Fast membership checks for static/materialized segments
* Efficient batch evaluation strategies
* Materialized dynamic segments for performance/freshness balance
* Scalable storage architecture

**Integration:**
* Campaign targeting support (all segment types)
* Automation trigger support (with strong consistency)
* Analytics integration ready
* Event-driven updates (SegmentContactAdded/Removed events)

**Extensibility:**
* Nested compositions (future)
* Segment conversion (static ↔ dynamic ↔ materialized)
* Advanced segment operations
* Segment templates and sharing

---

## **16. Related Documents**

* `Docs/contacts-query-engine.md` - Contact Query Engine architecture
* `Docs/contacts-service-architecture.md` - Service layer architecture
* `Docs/contacts-table-implementation-plan.md` - Table design and data rules
* `Docs/contacts-schema-mvp.md` - MVP schema design

---
