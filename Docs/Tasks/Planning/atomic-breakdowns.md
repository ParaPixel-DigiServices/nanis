# Atomic Task Breakdowns (Deep WBS)

Use this file when you need “smallest assignable units” for planning. Each atomic task should take ~0.5–2 days.

Conventions:

- Keep IDs consistent with phase/area.
- If an atomic task is discovered during implementation, add it here (and optionally back-link into the phase file).

---

## A) Email Campaign Sending (SES) — atomic breakdown

### Feature: Send pipeline (draft → scheduled → sending → sent)

#### TASK: P2-SES-010 — Define sending limits + batching strategy

- **Owner:** Backend
- **Estimate:** 0.5d
- **Depends on:** P2-SES-001
- **Acceptance Criteria:**
  - [ ] Document max recipients per batch, max concurrent batches, retry policy.

#### TASK: P2-SES-011 — Implement sender identity selection (From/Reply-To)

- **Owner:** Backend
- **Estimate:** 0.5–1d
- **Depends on:** P2-SES-001, P2-CAMP-001
- **Acceptance Criteria:**
  - [ ] Campaign can choose sender identity.
  - [ ] Server enforces allowed identities.

#### TASK: P2-SES-012 — Compile campaign audience (resolve contacts)

- **Owner:** Backend
- **Estimate:** 1–2d
- **Depends on:** P2-CAMP-001, P2-CRM-001
- **Acceptance Criteria:**
  - [ ] Deterministic recipient list generated for a campaign send.
  - [ ] Unsubscribed/invalid emails excluded.

#### TASK: P2-SES-013 — HTML generation from template

- **Owner:** Backend
- **Estimate:** 1–2d
- **Depends on:** P2-TPL-001 (and/or P3-BUILDER-001 later)
- **Acceptance Criteria:**
  - [ ] Server produces final HTML for SES send.
  - [ ] Basic variable substitution supported (e.g., firstName).

#### TASK: P2-SES-014 — SES send wrapper (single email)

- **Owner:** Integrations
- **Estimate:** 1d
- **Depends on:** P2-SES-001
- **Acceptance Criteria:**
  - [ ] Server-only function can send one email to one recipient.
  - [ ] Errors mapped to actionable categories (auth, throttling, invalid).

#### TASK: P2-SES-015 — SES batch sender (N recipients)

- **Owner:** Backend
- **Estimate:** 1–2d
- **Depends on:** P2-SES-010, P2-SES-014
- **Acceptance Criteria:**
  - [ ] Sends emails in batches and records send attempts.
  - [ ] Idempotency key prevents double-sends.

#### TASK: P2-SES-016 — Campaign scheduler tick (poll scheduled campaigns)

- **Owner:** Backend
- **Estimate:** 1d
- **Depends on:** P2-CAMP-001
- **Acceptance Criteria:**
  - [ ] Scheduled campaigns due “now” are picked up and marked sending.

#### TASK: P2-SES-017 — Campaign send orchestrator

- **Owner:** Backend
- **Estimate:** 1–2d
- **Depends on:** P2-SES-012, P2-SES-015, P2-SES-016
- **Acceptance Criteria:**
  - [ ] Orchestrates: compile recipients → generate HTML → send batches → finalize status.

#### TASK: P2-SES-018 — Suppression/unsubscribe checks

- **Owner:** Backend
- **Estimate:** 1–2d
- **Depends on:** P2-CRM-001
- **Acceptance Criteria:**
  - [ ] Global unsubscribe and per-org suppression lists supported.

### Feature: Tracking (opens/clicks)

#### TASK: P2-SES-020 — Tracking pixel endpoint

- **Owner:** Backend
- **Estimate:** 1d
- **Depends on:** P2-SES-017
- **Acceptance Criteria:**
  - [ ] Pixel request records open event.
  - [ ] Pixel is cache-busted safely.

#### TASK: P2-SES-021 — Link redirect tracking

- **Owner:** Backend
- **Estimate:** 1–2d
- **Depends on:** P2-SES-017
- **Acceptance Criteria:**
  - [ ] Links are rewritten to redirect endpoint.
  - [ ] Click event recorded before redirect.

#### TASK: P2-SES-022 — Metrics aggregation job

- **Owner:** Backend
- **Estimate:** 1d
- **Depends on:** P2-SES-020, P2-SES-021
- **Acceptance Criteria:**
  - [ ] Campaign metrics computed and queryable fast.

---

## B) Canva-like Email Builder (MVP) — atomic breakdown

### Feature: Block schema + renderer

#### TASK: P3-BUILDER-010 — Define base block types + TS types

- **Owner:** Backend
- **Estimate:** 1d
- **Depends on:** P2-TPL-001
- **Acceptance Criteria:**
  - [ ] TS types for blocks exist.
  - [ ] Schema supports versioning.

#### TASK: P3-BUILDER-011 — HTML renderer for Text block

- **Owner:** Backend
- **Estimate:** 0.5–1d
- **Depends on:** P3-BUILDER-010
- **Acceptance Criteria:**
  - [ ] Text block renders with safe HTML (sanitized).

#### TASK: P3-BUILDER-012 — HTML renderer for Image block

- **Owner:** Backend
- **Estimate:** 0.5–1d
- **Depends on:** P3-BUILDER-010
- **Acceptance Criteria:**
  - [ ] Image block supports alignment + width + alt.

#### TASK: P3-BUILDER-013 — HTML renderer for Button block

- **Owner:** Backend
- **Estimate:** 0.5–1d
- **Depends on:** P3-BUILDER-010
- **Acceptance Criteria:**
  - [ ] Button supports URL + style.

#### TASK: P3-BUILDER-014 — Section/layout block renderer

- **Owner:** Backend
- **Estimate:** 1–2d
- **Depends on:** P3-BUILDER-010
- **Acceptance Criteria:**
  - [ ] Section contains child blocks.
  - [ ] Mobile-friendly output.

### Feature: Editor UI

#### TASK: P3-BUILDER-020 — Editor canvas shell + state store

- **Owner:** Frontend
- **Estimate:** 1–2d
- **Depends on:** P3-BUILDER-010
- **Acceptance Criteria:**
  - [ ] Local state holds JSON doc.
  - [ ] Undo/redo scaffold exists (even if minimal).

#### TASK: P3-BUILDER-021 — Block palette + insert action

- **Owner:** Frontend
- **Estimate:** 1d
- **Depends on:** P3-BUILDER-020
- **Acceptance Criteria:**
  - [ ] User can add blocks from palette.

#### TASK: P3-BUILDER-022 — Block reorder (drag) + delete

- **Owner:** Frontend
- **Estimate:** 1–2d
- **Depends on:** P3-BUILDER-021
- **Acceptance Criteria:**
  - [ ] Drag reorder works reliably.
  - [ ] Delete confirms or is undoable.

#### TASK: P3-BUILDER-023 — Properties panel: Text

- **Owner:** Frontend
- **Estimate:** 1d
- **Depends on:** P3-BUILDER-021
- **Acceptance Criteria:**
  - [ ] Edit font size/color/alignment and content.

#### TASK: P3-BUILDER-024 — Properties panel: Image (asset picker)

- **Owner:** Frontend
- **Estimate:** 1–2d
- **Depends on:** P2-ASSET-002, P3-BUILDER-021
- **Acceptance Criteria:**
  - [ ] Choose uploaded asset.
  - [ ] Edit alt + sizing.

#### TASK: P3-BUILDER-025 — Properties panel: Button

- **Owner:** Frontend
- **Estimate:** 1d
- **Depends on:** P3-BUILDER-021
- **Acceptance Criteria:**
  - [ ] Edit text + URL + style.

#### TASK: P3-BUILDER-026 — Desktop/mobile preview toggle

- **Owner:** Frontend
- **Estimate:** 0.5–1d
- **Depends on:** P3-BUILDER-020
- **Acceptance Criteria:**
  - [ ] Preview changes layout constraints.

#### TASK: P3-BUILDER-027 — Save/load template to DB

- **Owner:** Fullstack
- **Estimate:** 1–2d
- **Depends on:** P2-TPL-001
- **Acceptance Criteria:**
  - [ ] Save creates/updates template row.
  - [ ] Load hydrates editor state.

#### TASK: P3-BUILDER-028 — Send test email flow

- **Owner:** Fullstack
- **Estimate:** 1d
- **Depends on:** P2-SES-014, P3-BUILDER-011..014
- **Acceptance Criteria:**
  - [ ] User enters email address.
  - [ ] Server sends rendered HTML.

---

## C) Automation Engine — atomic breakdown

### Feature: Workflow definition + validation

#### TASK: P4-AUTO-010 — Define workflow node types (trigger/condition/action/delay)

- **Owner:** Backend
- **Estimate:** 1d
- **Depends on:** P4-AUTO-001
- **Acceptance Criteria:**
  - [ ] Node types documented + TS types.

#### TASK: P4-AUTO-011 — Workflow validator (server-side)

- **Owner:** Backend
- **Estimate:** 1–2d
- **Depends on:** P4-AUTO-010
- **Acceptance Criteria:**
  - [ ] Rejects invalid graphs (cycles if unsupported, missing fields).
  - [ ] Produces useful error messages.

### Feature: Runtime execution

#### TASK: P4-AUTO-020 — Event ingestion endpoint

- **Owner:** Backend
- **Estimate:** 1d
- **Depends on:** P4-AUTO-001
- **Acceptance Criteria:**
  - [ ] Accepts event payloads and records them.

#### TASK: P4-AUTO-021 — Match events to automations

- **Owner:** Backend
- **Estimate:** 1–2d
- **Depends on:** P4-AUTO-020, P4-AUTO-002
- **Acceptance Criteria:**
  - [ ] Finds active automations for event type.
  - [ ] Enforces org scope.

#### TASK: P4-AUTO-022 — Execute action: send email

- **Owner:** Backend
- **Estimate:** 1–2d
- **Depends on:** P2-SES-014, P4-AUTO-021
- **Acceptance Criteria:**
  - [ ] Automation can send an email action.

#### TASK: P4-AUTO-023 — Execute action: add tag / update contact

- **Owner:** Backend
- **Estimate:** 1–2d
- **Depends on:** P2-CRM-001, P4-AUTO-021
- **Acceptance Criteria:**
  - [ ] Contact record updated deterministically.

#### TASK: P4-AUTO-024 — Delay node scheduling

- **Owner:** Backend
- **Estimate:** 1–2d
- **Depends on:** P4-AUTO-021
- **Acceptance Criteria:**
  - [ ] Delay schedules next step with a run_at timestamp.

#### TASK: P4-AUTO-025 — Scheduled execution runner

- **Owner:** Backend
- **Estimate:** 1–2d
- **Depends on:** P4-AUTO-024
- **Acceptance Criteria:**
  - [ ] Runner picks due jobs and executes next node.

### Feature: Builder UI split

#### TASK: P4-AUTO-030 — Builder canvas + node palette

- **Owner:** Frontend
- **Estimate:** 1–2d
- **Depends on:** P4-AUTO-010
- **Acceptance Criteria:**
  - [ ] Create nodes and connect edges.

#### TASK: P4-AUTO-031 — Node config panels (trigger + email action)

- **Owner:** Frontend
- **Estimate:** 1–2d
- **Depends on:** P4-AUTO-030
- **Acceptance Criteria:**
  - [ ] Configure trigger type.
  - [ ] Configure email action (template + subject).

#### TASK: P4-AUTO-032 — Save/publish workflow

- **Owner:** Fullstack
- **Estimate:** 1–2d
- **Depends on:** P4-AUTO-011
- **Acceptance Criteria:**
  - [ ] Publish runs validator and activates automation.

---

## D) Unified Inbox Channels — atomic breakdown

### Feature: Core inbox UX

#### TASK: P3-INBOX-010 — Conversation list query (filters + pagination)

- **Owner:** Backend
- **Estimate:** 1d
- **Depends on:** P3-INBOX-001
- **Acceptance Criteria:**
  - [ ] Filter by channel, tag, unread.

#### TASK: P3-INBOX-011 — Message send endpoint (in-app)

- **Owner:** Backend
- **Estimate:** 1d
- **Depends on:** P3-INBOX-001
- **Acceptance Criteria:**
  - [ ] Insert message with correct conversation linkage.

#### TASK: P3-INBOX-012 — Read receipts/unread counters (MVP)

- **Owner:** Fullstack
- **Estimate:** 1–2d
- **Depends on:** P3-INBOX-003
- **Acceptance Criteria:**
  - [ ] Unread count updates when thread viewed.

### Feature: WhatsApp integration (when access is granted)

#### TASK: P3-WA-001 — Webhook verification + secure endpoint

- **Owner:** Integrations
- **Estimate:** 1d
- **Depends on:** WhatsApp API access
- **Acceptance Criteria:**
  - [ ] Verification handshake works.
  - [ ] Requests are authenticated/validated.

#### TASK: P3-WA-002 — Inbound message mapping → DB

- **Owner:** Integrations
- **Estimate:** 1–2d
- **Depends on:** P3-WA-001, P3-INBOX-001
- **Acceptance Criteria:**
  - [ ] Inbound WhatsApp message creates/updates conversation.

#### TASK: P3-WA-003 — Outbound message send

- **Owner:** Integrations
- **Estimate:** 1–2d
- **Depends on:** P3-WA-002
- **Acceptance Criteria:**
  - [ ] Reply from UI sends message via WhatsApp API.

---

## E) CSV Import — atomic breakdown

#### TASK: P2-CRM-010 — CSV parsing + header detection

- **Owner:** Backend
- **Estimate:** 1d
- **Depends on:** P2-CRM-001
- **Acceptance Criteria:**
  - [ ] Handles UTF-8, commas/quotes, empty rows.

#### TASK: P2-CRM-011 — Column mapping UI (preview 10 rows)

- **Owner:** Frontend
- **Estimate:** 1–2d
- **Depends on:** P2-CRM-010
- **Acceptance Criteria:**
  - [ ] Map CSV columns to known/custom fields.

#### TASK: P2-CRM-012 — Import job table + progress

- **Owner:** Backend
- **Estimate:** 1d
- **Depends on:** P2-CRM-010
- **Acceptance Criteria:**
  - [ ] Import runs asynchronously and reports progress.

#### TASK: P2-CRM-013 — Deduplication strategy (email-based)

- **Owner:** Backend
- **Estimate:** 1d
- **Depends on:** P2-CRM-001
- **Acceptance Criteria:**
  - [ ] Import updates existing contacts or skips duplicates predictably.

#### TASK: P2-CRM-014 — Error report (downloadable)

- **Owner:** Fullstack
- **Estimate:** 1d
- **Depends on:** P2-CRM-012
- **Acceptance Criteria:**
  - [ ] Failures include row number + reason.
