# Amazon SES setup checklist (P2-SES-001)

**Owner:** Integrations. Prerequisite for P2-SES-002 (send campaign batch).

Use this checklist to get SES ready for sending campaign emails from Nanis.

---

## 0. Client projects: who owns AWS and billing

When building for a **client**, AWS requires a payment method (billing info). You have two main options.

### Recommended: Client owns the AWS account

**The client creates the AWS account and adds their own billing.** They own the account, pay AWS directly, and keep full control. You never see their billing or root login.

1. **Client** signs up at [aws.amazon.com](https://aws.amazon.com), completes account and payment method.
2. **Client** (or you with their permission) sets up SES in their account: verify domain/email, DKIM, SPF, request production access (see sections 1–5 below).
3. **Client** creates an **IAM user** for the application (e.g. name `nanis-ses` or `nanis-app`):
   - **Security credentials** → **Create access key** (Application running outside AWS).
   - Attach a policy that allows only SES send (e.g. custom policy with `ses:SendEmail`, `ses:SendRawEmail` for their region/account).
4. **Client** gives you the **Access key ID** and **Secret access key** (e.g. via a secure channel or by setting env in their deployment). You put these in the app’s `.env` as `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (and `AWS_REGION`, `SES_FROM_EMAIL`). You do **not** need their root password or billing access.
5. If they later change credentials or revoke the IAM user, they just create a new key and update the app env.

**Why this is better:** Client owns cost and compliance, no billing handoff, no need for you to touch their payment method. Standard approach for agency/client work.

### Alternative: You create the account, client pays you

- **You** create a new AWS account and add **your** billing (or a dedicated card for this client).
- You set up SES, verify the **client’s domain**, create IAM user, and give the client the app (with credentials in env that you control).
- You invoice the client for AWS usage (or absorb cost). Downsides: you own billing and account; transferring the account to the client later is not straightforward (AWS doesn’t really “transfer” accounts; they’d have to create a new account and you’d redo SES/domain verification there).

### Summary

| Approach        | Who creates AWS account | Who adds billing | Who gets IAM keys |
| --------------- | ----------------------- | ---------------- | ----------------- |
| **Recommended** | Client                  | Client           | You (for app env) |
| Alternative     | You                     | You              | You               |

For a clean handoff and clear ownership, **have the client create the AWS account, complete billing, then give you IAM access** (access key + secret) so you can configure SES and use it in the app. Use the rest of this doc for the technical SES steps (domain, DKIM, SPF, production access, backend config).

**What to ask the client for (after they complete steps 1–5 below):**

- **Access Key ID** and **Secret Access Key** for an IAM user that has only SES send permissions (e.g. `ses:SendEmail`, `ses:SendRawEmail` in the chosen region).
- **AWS region** they use for SES (e.g. `us-east-1`).
- **From address** they verified in SES (e.g. `noreply@their-domain.com`).

Deliver these to you via a secure channel (e.g. password manager, encrypted share). You put them in the app’s `.env` as `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `SES_FROM_EMAIL`. You do **not** need their AWS root login or billing access.

---

## 1. AWS account and SES

- Create or use an AWS account.
- Open [Amazon SES](https://console.aws.amazon.com/ses/) in the region you will use (e.g. `us-east-1`, `eu-west-1`).
- **Sandbox:** New accounts start in sandbox: you can only send to **verified** recipient addresses and have low limits (e.g. 200 messages/24h, 1 msg/s). Production access removes these limits.

---

## 2. Verified identities (sender identities)

You must verify every **domain** or **email address** you use as a sender (From/Return-Path).

### Domain verification

- In SES console: **Verified identities** → **Create identity** → **Domain**.
- Enter your sending domain (e.g. `mail.yourproduct.com` or your root domain).
- SES will show **DKIM** DNS records (CNAMEs). Add them to your DNS (at your registrar or DNS provider).
- Wait for verification (can take up to 72 hours). Status will show **Verified** when done.

### Email address verification (optional)

- For testing you can verify individual email addresses: **Create identity** → **Email address**.
- Only use for dev/test; for production use a **verified domain** and any address at that domain (e.g. `noreply@mail.yourproduct.com`).

**Checklist:**

- [ ] At least one **domain** identity verified (recommended for campaigns).
- [ ] Sender addresses (e.g. `noreply@...`, `campaigns@...`) use that domain.

---

## 3. DKIM

- For a **domain** identity, SES provides DKIM CNAME records. Adding them is part of domain verification.
- In **Verified identities** → your domain → **DKIM** tab: ensure DKIM is **Enabled** and status is **Successful** (or **Pending** if you just added DNS).
- **Easy DKIM:** SES gives you 3 CNAMEs; add all to DNS. SES signs outgoing mail with a 2048-bit key.
- Allow up to 72 hours for DNS propagation and DKIM to turn **Successful**.

**Checklist:**

- [ ] DKIM records added to DNS for the sending domain.
- [ ] DKIM status **Successful** in SES console.

---

## 4. SPF (recommended)

- SPF tells receivers which servers are allowed to send for your domain.
- Add a **TXT** record for your domain (or subdomain) with the value SES provides, or a standard SPF that includes Amazon SES (e.g. `v=spf1 include:amazonses.com ~all`).
- Exact record name and value: see [SES documentation](https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-spf.html) or your SES **Verified identity** → **SPF** section if shown.

**Checklist:**

- [ ] SPF TXT record added for the sending domain.
- [ ] No conflicting SPF records (only one SPF record per domain/subdomain).

---

## 5. Request production access (sandbox exit)

Until you have production access, you can only send to verified addresses and within sandbox limits.

- In SES console: **Account dashboard** (or **Get set up**) → **Request production access**.
- Fill the form: use case (e.g. **Transactional** and/or **Marketing**), expected volume, how you handle bounces/complaints.
- Approval can take 24–48 hours. Once approved:
  - You can send to any recipient (not only verified).
  - Higher sending limits (e.g. 50,000+ per 24h depending on account).

**Checklist:**

- [ ] Production access requested and approved (or continue in sandbox for dev with verified recipients only).

---

## 6. Backend configuration (for P2-SES-002)

After SES is ready, the backend will need:

- **AWS credentials** (access key + secret) with `ses:SendEmail` (and optionally `ses:SendRawEmail`) for the SES region.
- Store in server-only env (e.g. `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` or `SES_REGION`).
- **Sender identity:** Use a verified From address (e.g. `noreply@your-verified-domain.com`).

---

## Summary

| Step              | Done |
| ----------------- | ---- |
| SES region chosen | [ ]  |
| Domain verified   | [ ]  |
| DKIM enabled      | [ ]  |
| SPF configured    | [ ]  |
| Production access | [ ]  |
| Sender identity   | [ ]  |

Once all are done, P2-SES-002 (send campaign batch) can use SES to send emails.

---

## 7. Backend: batching and rate limiting (P2-SES-002)

The backend sends campaign emails in a single request with configurable rate limiting:

- **Rate:** `rate_per_sec` query param on `POST .../campaigns/{id}/send` (default **1** msg/s for sandbox; increase up to **14** after production access).
- **Flow:** Resolve recipients from target_rules → insert into `campaign_recipients` (pending) → for each pending, render template ({{first_name}}, {{email}}, etc.), call SES `send_email`, update recipient to `sent`, sleep `1/rate_per_sec` between sends.
- **Template:** Campaign uses `template_id`; subject from campaign or template; body from template `content_html`. Variables: `{{first_name}}`, `{{last_name}}`, `{{email}}`, `{{country}}`.
- **Production:** For large lists, use a job queue (e.g. Celery, Supabase Edge + queue) so the HTTP request does not block; this MVP runs synchronously with rate limiting.
