# Phase 3 — Builders & Communication Layer (Weeks 7–9)

Goal: Canva-like email builder MVP, prebuilt template system, unified inbox MVP, website builder framework.

## Epic P3-A: Visual email builder (MVP)

### TASK: P3-BUILDER-001 — Define email block schema (JSON) + renderer

- **Owner:** Backend (with FE alignment)
- **Estimate:** 2–3d
- **Priority:** P0
- **Depends on:** P2-TPL-001
- **Acceptance Criteria:**
  - [ ] JSON schema defined for blocks (text/image/button/section/spacer).
  - [ ] Renderer generates responsive HTML.
  - [ ] Schema versioning strategy documented.

### TASK: P3-BUILDER-002 — Drag-and-drop editor UI (core)

- **Owner:** Frontend
- **Estimate:** 4–5d
- **Priority:** P0
- **Depends on:** P3-BUILDER-001, P2-ASSET-002
- **Acceptance Criteria:**
  - [ ] Add/reorder blocks.
  - [ ] Edit block properties.
  - [ ] Save/load template JSON.

### TASK: P3-BUILDER-003 — Preview modes (desktop/mobile) + send test email

- **Owner:** Frontend + Backend
- **Estimate:** 2–3d
- **Priority:** P1
- **Depends on:** P3-BUILDER-002, P2-SES-002
- **Acceptance Criteria:**
  - [ ] Toggle previews.
  - [ ] Send a test email to a specified address.

### TASK: P3-BUILDER-004 — Template library (user templates)

- **Owner:** Fullstack
- **Estimate:** 2–3d
- **Priority:** P1
- **Depends on:** P3-BUILDER-002
- **Acceptance Criteria:**
  - [ ] Save template with name + tags.
  - [ ] Duplicate template.

## Epic P3-B: Unified inbox (MVP)

### TASK: P3-INBOX-001 — Conversations/messages schema + RLS

- **Owner:** Backend
- **Estimate:** 1–2d
- **Priority:** P0
- **Depends on:** P1-DB-003, P2-CRM-001
- **Acceptance Criteria:**
  - [ ] Tables: `channels`, `conversations`, `messages`.
  - [ ] RLS enforces org scoping.

### TASK: P3-INBOX-002 — Realtime subscriptions setup

- **Owner:** Backend
- **Estimate:** 1–2d
- **Priority:** P0
- **Depends on:** P3-INBOX-001
- **Acceptance Criteria:**
  - [ ] New messages appear live in UI for org members.

### TASK: P3-INBOX-003 — Inbox UI (list + thread view)

- **Owner:** Frontend
- **Estimate:** 3–4d
- **Priority:** P0
- **Depends on:** P3-INBOX-001
- **Acceptance Criteria:**
  - [ ] Conversation list with filters.
  - [ ] Thread view with message composer.

### TASK: P3-INBOX-004 — In-app chat channel (internal)

- **Owner:** Fullstack
- **Estimate:** 2–3d
- **Priority:** P1
- **Depends on:** P3-INBOX-002, P3-INBOX-003
- **Acceptance Criteria:**
  - [ ] Users can message “support” within platform.
  - [ ] Messages stored and streamed realtime.

### TASK: P3-INBOX-005 — Email inbox integration (MVP placeholder)

- **Owner:** Integrations
- **Estimate:** 3–5d
- **Priority:** P2
- **Depends on:** External access (email provider/webhooks), P3-INBOX-001
- **Acceptance Criteria:**
  - [ ] Documented inbound email strategy (webhook/service).
  - [ ] At least one working inbound path into `messages`.

### TASK: P3-INBOX-006 — WhatsApp integration spike

- **Owner:** Integrations
- **Estimate:** 2–3d
- **Priority:** P2
- **Depends on:** WhatsApp Business API access
- **Acceptance Criteria:**
  - [ ] Webhook receives inbound messages.
  - [ ] Message written into `messages` with `channel=whatsapp`.

### TASK: P3-INBOX-007 — Telegram bot integration spike

- **Owner:** Integrations
- **Estimate:** 1–2d
- **Priority:** P2
- **Depends on:** Telegram bot token
- **Acceptance Criteria:**
  - [ ] Bot receives inbound messages and stores them.

## Epic P3-C: Website builder framework (themes + pages)

### TASK: P3-WEB-001 — Websites/pages schema + RLS

- **Owner:** Backend
- **Estimate:** 1–2d
- **Priority:** P1
- **Depends on:** P1-DB-003
- **Acceptance Criteria:**
  - [ ] Tables for `websites`, `pages`, `page_blocks`.

### TASK: P3-WEB-002 — Website admin UI (create site, list pages)

- **Owner:** Frontend
- **Estimate:** 2–3d
- **Priority:** P1
- **Depends on:** P3-WEB-001
- **Acceptance Criteria:**
  - [ ] Create site, create page, edit page title/slug.

### TASK: P3-WEB-003 — Page editor MVP (block-based)

- **Owner:** Frontend
- **Estimate:** 4–5d
- **Priority:** P2
- **Depends on:** P3-WEB-002
- **Acceptance Criteria:**
  - [ ] Add/reorder basic blocks.
  - [ ] Preview page.

## Phase 3 Exit Criteria

- [ ] Email builder MVP produces usable email templates.
- [ ] Inbox UI + realtime works.
- [ ] Website builder skeleton exists.
