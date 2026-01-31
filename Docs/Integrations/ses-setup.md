# Amazon SES setup checklist (P2-SES-001)

**Owner:** Integrations. Prerequisite for P2-SES-002 (send campaign batch).

Use this checklist to get SES ready for sending campaign emails from Nanis.

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
