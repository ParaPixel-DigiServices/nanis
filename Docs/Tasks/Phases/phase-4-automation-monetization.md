# Phase 4 — Automation, Monetization & Optimization (Weeks 10–12)

Goal: automation builder + runtime, billing (Razorpay), A/B testing, publishing system, advanced analytics polish.

## Epic P4-A: Automation builder + execution engine

### TASK: P4-AUTO-001 — Event log foundation (tracked events)

- **Owner:** Backend
- **Estimate:** 1–2d
- **Priority:** P0
- **Depends on:** P1-DB-003
- **Acceptance Criteria:**
  - [ ] `events_log` table with org scope.
  - [ ] Helper to write events (campaign, inbox, website, etc.).

### TASK: P4-AUTO-002 — Workflow schema (trigger/condition/action)

- **Owner:** Backend
- **Estimate:** 2–3d
- **Priority:** P0
- **Depends on:** P4-AUTO-001
- **Acceptance Criteria:**
  - [ ] `automations` table stores workflow JSON.
  - [ ] Validations ensure schema correctness.

### TASK: P4-AUTO-003 — Automation builder UI (drag-and-drop MVP)

- **Owner:** Frontend
- **Estimate:** 5–7d
- **Priority:** P0
- **Depends on:** P4-AUTO-002
- **Acceptance Criteria:**
  - [ ] Build workflow with trigger + actions.
  - [ ] Save/load workflows.

### TASK: P4-AUTO-004 — Execution worker (event-driven)

- **Owner:** Backend
- **Estimate:** 4–6d
- **Priority:** P0
- **Depends on:** P4-AUTO-002
- **Acceptance Criteria:**
  - [ ] Inbound event triggers workflow evaluation.
  - [ ] Supported actions (MVP): send email, add tag, delay.

### TASK: P4-AUTO-005 — Delay/scheduling support

- **Owner:** Backend
- **Estimate:** 2–3d
- **Priority:** P1
- **Depends on:** P4-AUTO-004
- **Acceptance Criteria:**
  - [ ] Delay node schedules future execution.
  - [ ] Retries + dead-letter strategy documented.

## Epic P4-B: Billing & subscriptions (Razorpay)

### TASK: P4-BILL-001 — Plans/subscriptions schema + RLS

- **Owner:** Backend
- **Estimate:** 1–2d
- **Priority:** P0
- **Depends on:** P1-DB-003
- **Acceptance Criteria:**
  - [ ] Tables for plans, subscriptions, payments.
  - [ ] Org-scoped access enforced.

### TASK: P4-BILL-002 — Razorpay integration (create subscription)

- **Owner:** Integrations
- **Estimate:** 2–3d
- **Priority:** P0
- **Depends on:** P4-BILL-001, Razorpay creds
- **Acceptance Criteria:**
  - [ ] Server endpoint creates Razorpay subscription.
  - [ ] Subscription status stored in DB.

### TASK: P4-BILL-003 — Webhooks handling (payment/subscription updates)

- **Owner:** Integrations
- **Estimate:** 2–3d
- **Priority:** P0
- **Depends on:** P4-BILL-002
- **Acceptance Criteria:**
  - [ ] Webhooks verified (signature check).
  - [ ] DB updated for paid/failed/canceled events.

### TASK: P4-BILL-004 — Gating (feature access based on plan)

- **Owner:** Backend + Frontend
- **Estimate:** 2–3d
- **Priority:** P1
- **Depends on:** P4-BILL-003
- **Acceptance Criteria:**
  - [ ] Backend enforces quotas/feature flags.
  - [ ] UI displays upgrade prompts.

## Epic P4-C: A/B Testing

### TASK: P4-AB-001 — A/B schema and campaign variants

- **Owner:** Backend
- **Estimate:** 2–3d
- **Priority:** P2
- **Depends on:** P2-CAMP-001
- **Acceptance Criteria:**
  - [ ] Store variants and allocation.
  - [ ] Track metrics per variant.

### TASK: P4-AB-002 — A/B UI (configure + results)

- **Owner:** Frontend
- **Estimate:** 2–3d
- **Priority:** P2
- **Depends on:** P4-AB-001
- **Acceptance Criteria:**
  - [ ] Configure subject/content variants.
  - [ ] Show winner selection logic.

## Epic P4-D: Publishing (newsletter/blog/RSS)

### TASK: P4-PUB-001 — Blog/newsletter schema + subscription management

- **Owner:** Backend
- **Estimate:** 2–3d
- **Priority:** P2
- **Depends on:** P1-DB-003
- **Acceptance Criteria:**
  - [ ] Posts table + subscribers table.
  - [ ] Unsubscribe flow supported.

### TASK: P4-PUB-002 — Publishing UI (create posts + list)

- **Owner:** Frontend
- **Estimate:** 2–3d
- **Priority:** P2
- **Depends on:** P4-PUB-001
- **Acceptance Criteria:**
  - [ ] Create/edit post.
  - [ ] Publish/unpublish.

## Epic P4-E: Advanced analytics polishing

### TASK: P4-AN-001 — Unified analytics dashboard (cross-module)

- **Owner:** Frontend
- **Estimate:** 2–3d
- **Priority:** P1
- **Depends on:** P2-AN-001, P4-AUTO-001
- **Acceptance Criteria:**
  - [ ] Dashboard combines campaign + inbox + website metrics.

### TASK: P4-AN-002 — Performance pass (indexes + query tuning)

- **Owner:** Backend
- **Estimate:** 1–2d
- **Priority:** P1
- **Depends on:** Prior analytics tables
- **Acceptance Criteria:**
  - [ ] Key queries reviewed and indexed.

## Phase 4 Exit Criteria

- [ ] Automations work end-to-end.
- [ ] Billing works end-to-end.
- [ ] Key optimization features (A/B, analytics polish) are usable.
