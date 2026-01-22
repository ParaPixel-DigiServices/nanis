# 12-Week Schedule (Suggested)

This schedule is intentionally “lightweight but enforceable”: each week ends with a demo and a checklist.

Assumptions:

- 3 devs (Frontend, Backend, Integrations) working in parallel.
- UI/UX designs are available early (or a minimal internal design system is used).
- External credentials (AWS SES, Razorpay, WhatsApp, Telegram) are provisioned on time.

## Week-by-week plan

### Week 1 — Boot + Supabase base

- **Deliverable:** app boots, Supabase project ready, initial schema started.
- **Target tasks:** P1-SETUP-001, P1-DB-001, P1-DB-002.
- **Review checklist:** repo runs locally; migrations workflow documented.

### Week 2 — Auth + RLS hardening

- **Deliverable:** signup/login works; org boundary enforced.
- **Target tasks:** P1-AUTH-001, P1-DB-003.
- **Review checklist:** RLS prevents cross-org reads/writes; protected routes work.

### Week 3 — Onboarding + app shell + team basics

- **Deliverable:** workspace onboarding + navigation + team listing.
- **Target tasks:** P1-AUTH-002, P1-AUTH-003, P1-UI-001, P1-RBAC-001, P1-RBAC-003.
- **Review checklist:** user can create workspace; see dashboard shell.

### Week 4 — Contacts foundation

- **Deliverable:** contacts CRUD usable.
- **Target tasks:** P2-CRM-001, P2-CRM-002, P2-CRM-003.
- **Review checklist:** add/edit contacts; pagination/search baseline.

### Week 5 — Assets + templates base

- **Deliverable:** asset upload + template gallery.
- **Target tasks:** P2-ASSET-001, P2-ASSET-002, P2-TPL-001, P2-TPL-002.
- **Review checklist:** upload assets and pick them for templates/campaigns (even if stubbed).

### Week 6 — Campaign send MVP (SES) + basic analytics

- **Deliverable:** create campaign and send email via SES; view metrics.
- **Target tasks:** P2-CAMP-001, P2-CAMP-002, P2-SES-001, P2-SES-002, P2-AN-001, P2-AN-002.
- **Review checklist:** at least 1 campaign successfully sent to a test list.

### Week 7 — Email builder foundations

- **Deliverable:** block schema + minimal editor.
- **Target tasks:** P3-BUILDER-001, P3-BUILDER-002 (or atomic split P3-BUILDER-020..022).
- **Review checklist:** create template with blocks and save/load.

### Week 8 — Inbox core (realtime) + builder polish

- **Deliverable:** inbox UI with realtime; builder preview.
- **Target tasks:** P3-INBOX-001, P3-INBOX-002, P3-INBOX-003, P3-BUILDER-003.
- **Review checklist:** two browser sessions see live messages.

### Week 9 — Website builder skeleton

- **Deliverable:** site + pages framework; basic page editor.
- **Target tasks:** P3-WEB-001, P3-WEB-002 (optional P3-WEB-003).
- **Review checklist:** create website + page; preview render.

### Week 10 — Automation groundwork

- **Deliverable:** event log + workflow schema + publish.
- **Target tasks:** P4-AUTO-001, P4-AUTO-002 (atomic P4-AUTO-010..011).
- **Review checklist:** workflow JSON validates and saves.

### Week 11 — Automation execution + billing start

- **Deliverable:** automation runtime can act (send email); Razorpay wiring.
- **Target tasks:** P4-AUTO-004 (atomic P4-AUTO-020..024), P4-BILL-001, P4-BILL-002.
- **Review checklist:** event triggers email action in staging.

### Week 12 — Billing webhooks + polish + acceptance

- **Deliverable:** subscription status updates; final QA + analytics polish.
- **Target tasks:** P4-BILL-003, P4-BILL-004, P4-AN-001, P4-AN-002.
- **Review checklist:** end-to-end upgrade flow (test mode), release checklist complete.

## Weekly ceremonies (recommended)

- **Daily (10 min):** blockers + handoffs.
- **Twice weekly (30 min):** integration sync (FE/BE/INT).
- **Friday demo (30–45 min):** show completed work; adjust next week scope.

## Risk items to track from day 1

- WhatsApp Business API approval timelines.
- SES production access and domain verification.
- Razorpay webhook + subscription mode correctness.
