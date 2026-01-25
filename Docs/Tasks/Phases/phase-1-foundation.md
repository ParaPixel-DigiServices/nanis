# Phase 1 — Foundation & Core Platform (Weeks 1–3)

Goal: secure multi-tenant SaaS foundation (auth, orgs, RBAC, base UI shell, core DB + RLS).

## Epic P1-A: Repo, environments, deployment skeleton

### TASK: P1-SETUP-001 — Initialize Next.js app structure

- **Owner:** Frontend
- **Estimate:** 1d
- **Priority:** P0
- **Depends on:** None
- **Acceptance Criteria:**
  - [x] Next.js + TypeScript app boots locally.
  - [x] Tailwind configured; baseline layout renders.
  - [x] ESLint/formatting conventions documented.

### TASK: P1-SETUP-002 — Environment configuration + secrets strategy

- **Owner:** Backend
- **Estimate:** 0.5d
- **Priority:** P0
- **Depends on:** P1-SETUP-001
- **Acceptance Criteria:**
  - [ ] `.env.example` created for required vars (Supabase URL/keys, SES placeholders, Razorpay placeholders).
  - [ ] Document which keys are client-safe vs server-only.

### TASK: P1-SETUP-003 — CI baseline (lint/typecheck/build)

- **Owner:** Any
- **Estimate:** 0.5–1d
- **Priority:** P1
- **Depends on:** P1-SETUP-001
- **Acceptance Criteria:**
  - [ ] CI runs on PR: install → lint → typecheck → build.

## Epic P1-B: Supabase initialization + schema skeleton + RLS

### TASK: P1-DB-001 — Create Supabase project + local dev workflow

- **Owner:** Backend
- **Estimate:** 1d
- **Priority:** P0
- **Depends on:** None
- **Acceptance Criteria:**
  - [ ] Supabase project created.
  - [ ] Local workflow documented (migrations, seed, resetting).
  - [x] Service-role key usage restricted to server contexts.

### TASK: P1-DB-002 — Define core tables (orgs, members, profiles)

- **Owner:** Backend
- **Estimate:** 1–2d
- **Priority:** P0
- **Depends on:** P1-DB-001
- **Acceptance Criteria:**
  - [x] Tables exist for: `profiles`, `organizations`, `organization_members`.
  - [x] Foreign keys and tenant boundaries are present.
  - [x] Created/updated timestamps included.

### TASK: P1-DB-003 — Add RLS policies for multi-tenancy

- **Owner:** Backend
- **Estimate:** 1–2d
- **Priority:** P0
- **Depends on:** P1-DB-002
- **Acceptance Criteria:**
  - [x] RLS enabled for tenant-owned tables.
  - [x] Policies enforce: user can only access orgs they belong to.
  - [ ] Policies reviewed for least privilege.

### TASK: P1-DB-004 — Seed script for dev org + admin user

- **Owner:** Backend
- **Estimate:** 0.5d
- **Priority:** P1
- **Depends on:** P1-DB-003
- **Acceptance Criteria:**
  - [ ] One command creates a dev org + membership for local testing.

## Epic P1-C: Auth + onboarding flows

### TASK: P1-AUTH-001 — Implement auth screens (signup/login/reset)

- **Owner:** Frontend
- **Estimate:** 2d
- **Priority:** P0
- **Depends on:** P1-SETUP-001, P1-DB-001
- **Acceptance Criteria:**
  - [ ] Users can sign up, log in, and request password reset.
  - [x] Error states handled (invalid password, existing email, etc.).

### TASK: P1-AUTH-002 — Session handling + protected routes

- **Owner:** Frontend
- **Estimate:** 1–2d
- **Priority:** P0
- **Depends on:** P1-AUTH-001
- **Acceptance Criteria:**
  - [x] Unauthed users redirected to login.
  - [x] Authed users land on dashboard.
  - [ ] Logout clears session.

### TASK: P1-AUTH-003 — Create org/workspace onboarding flow

- **Owner:** Fullstack (FE + BE)
- **Estimate:** 2d
- **Priority:** P0
- **Depends on:** P1-DB-003, P1-AUTH-002
- **Acceptance Criteria:**
  - [ ] First login prompts “Create workspace” or “Join workspace”.
  - [x] Workspace creation writes correct org + membership rows.

## Epic P1-D: RBAC + Team management (minimum viable)

### TASK: P1-RBAC-001 — Define roles + permissions model

- **Owner:** Backend
- **Estimate:** 1d
- **Priority:** P0
- **Depends on:** P1-DB-002
- **Acceptance Criteria:**
  - [x] Roles documented (e.g., Owner/Admin/Member).
  - [x] Permission checks implemented server-side (Edge Function helpers or DB functions).

### TASK: P1-RBAC-002 — Invite team member (email invite stub)

- **Owner:** Backend
- **Estimate:** 1–2d
- **Priority:** P1
- **Depends on:** P1-RBAC-001, P1-AUTH-001
- **Acceptance Criteria:**
  - [ ] Admin can invite member via email.
  - [ ] Invite creates pending membership record.
  - [ ] (MVP) Invitation email can be a simple transactional email (provider TBD in Phase 2).

### TASK: P1-RBAC-003 — Team management UI

- **Owner:** Frontend
- **Estimate:** 1–2d
- **Priority:** P1
- **Depends on:** P1-RBAC-002
- **Acceptance Criteria:**
  - [ ] List members, roles, statuses.
  - [ ] Update role (admin-only).

## Epic P1-E: App shell + dashboard skeleton

### TASK: P1-UI-001 — Global layout + navigation scaffold

- **Owner:** Frontend
- **Estimate:** 1–2d
- **Priority:** P0
- **Depends on:** P1-AUTH-002
- **Acceptance Criteria:**
  - [ ] Left nav (modules), top bar (org switcher placeholder), responsive layout.
  - [ ] Route placeholders for major modules.

### TASK: P1-DASH-001 — Dashboard widgets (static data)

- **Owner:** Frontend
- **Estimate:** 1d
- **Priority:** P1
- **Depends on:** P1-UI-001
- **Acceptance Criteria:**
  - [ ] Dashboard shows cards for campaigns/inbox/contacts placeholders.
  - [ ] Layout matches product overview intent.

### TASK: P1-DASH-002 — Activity feed (backend stub)

- **Owner:** Backend
- **Estimate:** 1d
- **Priority:** P2
- **Depends on:** P1-DB-003
- **Acceptance Criteria:**
  - [ ] Simple `activity_events` table and insert helper.
  - [ ] Dashboard can read recent events for current org.

## Phase 1 Exit Criteria (must be true)

- [ ] Auth works end-to-end.
- [ ] Multi-tenant org boundary is enforced with RLS.
- [x] App shell exists with protected routes.
- [ ] Team basics exist (roles + members list).
