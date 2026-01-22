# Developer C — Integrations/Platform Focus (SES, Razorpay, Channels)

This developer focuses on third-party integrations + webhooks + operational readiness, while helping backend where needed.

## Weeks 1–3 (Phase 1)

- P1-SETUP-002: Environment configuration + secrets strategy
- (Support) P1-DB-001: Supabase setup if needed
- Define access requirements list for client: AWS, DNS, Razorpay, WhatsApp, Telegram, Twitter/X.

## Weeks 4–6 (Phase 2)

- P2-SES-001: SES domain verification checklist + sandbox exit
- Support P2-SES-002: SES sending implementation (review rate limits)
- Support P2-SES-004: SES feedback loops/webhooks strategy (as applicable)

## Weeks 7–9 (Phase 3)

- P3-INBOX-005: Email inbox integration (MVP placeholder)
- P3-INBOX-006: WhatsApp integration spike
- P3-INBOX-007: Telegram bot integration spike
- Spike: Twitter/X integration feasibility (access + rate limits + webhook options)

## Weeks 10–12 (Phase 4)

- P4-BILL-002: Razorpay create subscription
- P4-BILL-003: Razorpay webhooks + signature verification
- Support P4-BILL-004: gating rules/quotas

## Notes

- Track external dependency approvals early (WhatsApp Business API is often the longest).
- Produce short runbooks for each integration (setup steps + troubleshooting).
