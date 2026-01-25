# Tasks Index (Shareable)

This folder is meant to be shared with developers so they can:

1. Read project context,
2. Understand delivery phases,
3. Pick up tasks with clear acceptance criteria.

## 0) Required reading (in order)

- Docs/Overview/project-overview.md
- Docs/Overview/architecture-overview.md
- Docs/Database/database-overview.md
- Docs/Overview/techstack-locked.md
- Docs/Overview/roadmap-delivery.md
- Docs/Overview/decision-log.md
- Docs/Overview/feature-roadmap.md

## 1) How to use these task files

- The work is organized by **Phase (Week ranges)**, matching Docs/Overview/roadmap-delivery.md.
- Tasks are written at “atomic” level where possible (one person can complete in ~0.5–2 days).
- Each task includes **Acceptance Criteria**; treat them as “Definition of Done” for that task.

### Status convention

Use one of:

- `Backlog` (not scheduled)
- `Ready` (unblocked, can be picked up)
- `In Progress`
- `In Review`
- `Blocked` (state why)
- `Done`

### Task ID format

`PHASE-AREA-NNN` (example: `P1-AUTH-003`).

### Estimates

- Use `0.5d`, `1d`, `2d` etc. Assume 6–7 focused hours per day.

### Dependency convention

- “Depends on” lists upstream tasks that must be complete.
- When an external dependency exists (e.g., WhatsApp API access), the task explicitly calls it out.

## 2) Task breakdown files

- Docs/Tasks/Onboarding/developer-onboarding.md (start here for new devs)
- Docs/Tasks/Templates/task-template.md (copy/paste format)
- Docs/Tasks/Planning/atomic-breakdowns.md (deep breakdown into atomic tasks)
- Docs/Tasks/Planning/schedule-12-week.md (suggested weekly plan + milestones)
- Docs/Tasks/Phases/phase-1-foundation.md (Weeks 1–3)
- Docs/Tasks/Phases/phase-2-core-growth.md (Weeks 4–6)
- Docs/Tasks/Phases/phase-3-builders-comms.md (Weeks 7–9)
- Docs/Tasks/Phases/phase-4-automation-monetization.md (Weeks 10–12)

## 3) Suggested staffing (3 developers)

- Docs/Tasks/Dev/dev-frontend.md (Developer A)
- Docs/Tasks/Dev/dev-backend.md (Developer B)
- Docs/Tasks/Dev/dev-integrations.md (Developer C)

## 4) Recommended weekly cadence

- Mon: planning + task assignment + unblock check
- Tue–Thu: build
- Fri: QA pass + demo + roadmap adjustment

## 5) Immediate next action

Start with Phase 1 tasks; they unblock everything else.
