# Phase 2 — Core Growth Systems (Weeks 4–6)

Goal: contacts + assets + campaigns + SES sending + baseline analytics.

## Epic P2-A: Contacts & Audience (CRM)

### TASK: P2-CRM-001 — Contacts schema + RLS

- **Owner:** Backend
- **Estimate:** 1–2d
- **Priority:** P0
- **Depends on:** P1-DB-003
- **Acceptance Criteria:**
  - [x] `contacts` table scoped to org.
  - [x] RLS policies prevent cross-org access.
  - [x] Contacts + tags API routes (list/create/update/delete, tag CRUD, assignments).

### TASK: P2-CRM-002 — Contacts list + detail UI

- **Owner:** Frontend
- **Estimate:** 2d
- **Priority:** P0
- **Depends on:** P2-CRM-001
- **Acceptance Criteria:**
  - [ ] List contacts with pagination/search.
  - [ ] View contact detail.

### TASK: P2-CRM-003 — Add/edit contact (single)

- **Owner:** Frontend
- **Estimate:** 1–2d
- **Priority:** P0
- **Depends on:** P2-CRM-001
- **Acceptance Criteria:**
  - [ ] Create + update contact forms.
  - [ ] Validation (email format, required fields).

### TASK: P2-CRM-004 — CSV import pipeline (MVP)

- **Owner:** Backend (with FE support)
- **Estimate:** 2–3d
- **Priority:** P1
- **Depends on:** P2-CRM-001
- **Acceptance Criteria:**
  - [x] Upload CSV, map columns to standard fields (auto-detect or optional column_mapping JSON).
  - [x] Import creates contacts under current org. (API: `POST /organizations/{org_id}/contacts/import`; UI wiring pending.)
  - [x] Import report shows successes/failures. (API returns `created`, `failed`, `total`, `errors`; UI pending.)

### TASK: P2-CRM-005 — Custom fields framework (schema + UI)

- **Owner:** Fullstack
- **Estimate:** 3–4d
- **Priority:** P1
- **Depends on:** P2-CRM-001
- **Acceptance Criteria:**
  - [ ] Org defines custom fields.
  - [ ] Contact record stores values.
  - [ ] UI supports viewing/editing custom values.

### TASK: P2-CRM-006 — Segments v1 (rules-based)

- **Owner:** Backend
- **Estimate:** 2–3d
- **Priority:** P2
- **Depends on:** P2-CRM-005
- **Acceptance Criteria:**
  - [ ] Segment definition stored (JSON rules).
  - [ ] Query to resolve matching contacts.

## Epic P2-B: File & Brand Asset Manager

### TASK: P2-ASSET-001 — Supabase Storage buckets + policies

- **Owner:** Backend
- **Estimate:** 1–2d
- **Priority:** P0
- **Depends on:** P1-DB-003
- **Acceptance Criteria:**
  - [x] Bucket(s) created for org assets (doc + migration for `org-assets` + RLS).
  - [x] Access controlled by org membership (path = `{organization_id}/...`).

### TASK: P2-ASSET-002 — Upload UI + asset listing

- **Owner:** Frontend
- **Estimate:** 2d
- **Priority:** P0
- **Depends on:** P2-ASSET-001
- **Acceptance Criteria:**
  - [ ] Upload images/files.
  - [ ] Show list/grid of assets with preview.

### TASK: P2-ASSET-003 — Foldering + tagging (MVP)

- **Owner:** Fullstack
- **Estimate:** 2–3d
- **Priority:** P2
- **Depends on:** P2-ASSET-002
- **Acceptance Criteria:**
  - [ ] Asset folders exist (DB metadata).
  - [ ] Assets can be moved/filtered.

## Epic P2-C: Templates (prebuilt) + Campaign creation

### TASK: P2-TPL-001 — Template schema + types

- **Owner:** Backend
- **Estimate:** 1–2d
- **Priority:** P0
- **Depends on:** P1-DB-003
- **Acceptance Criteria:**
  - [x] Tables for templates with `admin_provided` vs `user_created`.
  - [x] Template content stored in a renderable format (HTML + metadata OR JSON → renderer).
  - [x] Templates API (list/get/create/update/delete).

### TASK: P2-TPL-002 — Template gallery UI

- **Owner:** Frontend
- **Estimate:** 1–2d
- **Priority:** P0
- **Depends on:** P2-TPL-001
- **Acceptance Criteria:**
  - [ ] Gallery shows prebuilt templates.
  - [ ] Select template for campaign.

### TASK: P2-CAMP-001 — Campaign schema + statuses

- **Owner:** Backend
- **Estimate:** 1–2d
- **Priority:** P0
- **Depends on:** P1-DB-003
- **Acceptance Criteria:**
  - [x] `campaigns` table with status workflow: draft → scheduled → sending → sent/failed.
  - [x] Audience selector references segments or explicit contact lists (target_rules + recipients tables + API).
  - [x] Campaigns API (list/get/create/update, target-rules GET/PUT, recipients list).

### TASK: P2-CAMP-002 — Campaign creation wizard (MVP)

- **Owner:** Frontend
- **Estimate:** 3–4d
- **Priority:** P0
- **Depends on:** P2-CAMP-001, P2-TPL-002, P2-CRM-002
- **Acceptance Criteria:**
  - [ ] Steps: name → audience → template → content → schedule/send.
  - [ ] Draft saved and resumable.

## Epic P2-D: Amazon SES integration (sending)

### TASK: P2-SES-001 — SES account + domain verification checklist

- **Owner:** Integrations
- **Estimate:** 0.5–1d
- **Priority:** P0
- **Depends on:** External access (AWS credentials, domain DNS)
- **Acceptance Criteria:**
  - [x] Steps documented: domain verify, DKIM, SPF, sandbox exit. (**`Docs/Integrations/ses-setup.md`**)
  - [x] Sender identities defined (verified domain/email in checklist).

### TASK: P2-SES-002 — Edge Function: send campaign batch

- **Owner:** Backend
- **Estimate:** 2–3d
- **Priority:** P0
- **Depends on:** P2-SES-001, P2-CAMP-001
- **Acceptance Criteria:**
  - [x] Server-only function sends via SES (FastAPI + boto3; `POST .../campaigns/{id}/send`).
  - [x] Rate limiting/batching strategy documented (Docs/Integrations/ses-setup.md §7; `rate_per_sec` param).
  - [x] Email content assembled from template + variables (`{{first_name}}`, `{{email}}`, etc.).

### TASK: P2-SES-003 — Scheduling worker (MVP)

- **Owner:** Backend
- **Estimate:** 2–3d
- **Priority:** P1
- **Depends on:** P2-SES-002
- **Acceptance Criteria:**
  - [ ] Scheduled campaigns transition to sending at correct time.
  - [ ] Retries for transient failures.

### TASK: P2-SES-004 — Delivery events + tracking pixels (baseline)

- **Owner:** Backend
- **Estimate:** 2–3d
- **Priority:** P1
- **Depends on:** P2-SES-002
- **Acceptance Criteria:**
  - [ ] Track opens/clicks at least at campaign level.
  - [ ] Store events for analytics.

## Epic P2-E: Basic Analytics

### TASK: P2-AN-001 — Analytics tables + aggregates (campaign)

- **Owner:** Backend
- **Estimate:** 1–2d
- **Priority:** P1
- **Depends on:** P2-SES-004
- **Acceptance Criteria:**
  - [ ] Aggregate query for open/click rates.
  - [ ] Data scoped to org.

### TASK: P2-AN-002 — Campaign analytics UI (charts)

- **Owner:** Frontend
- **Estimate:** 1–2d
- **Priority:** P1
- **Depends on:** P2-AN-001
- **Acceptance Criteria:**
  - [ ] Show per-campaign metrics + trend chart.

## Phase 2 Exit Criteria

- [ ] Contacts can be imported/managed.
- [ ] Assets can be uploaded and reused.
- [ ] Campaigns can be created and sent via SES.
- [ ] Baseline analytics visible.
