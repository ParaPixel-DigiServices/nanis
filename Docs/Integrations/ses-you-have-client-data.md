# You Have the Client's AWS Data — What to Do Next

Use this checklist after the client has created their AWS account and shared the **IAM sign-in link**, **username**, and **password** (from _CLIENT-SES-SETUP.md_).

---

## 1. Log in to the client's AWS

1. Open the **IAM sign-in link** they sent (e.g. `https://XXXXXXXX.signin.aws.amazon.com/console`).
2. Enter the **IAM username** and **password** they gave you.
3. You are now in their AWS console (with the permissions that IAM user has).

---

## 2. Choose the SES region

1. In the top-right of the AWS console, click the **region** dropdown (e.g. "N. Virginia (ap-south-1)").
2. Pick the region where you will use SES (e.g. **ap-south-1**). Remember it — you'll need it for `AWS_REGION` in `.env`.
3. Open **Amazon SES**: in the top search bar, type **SES** and open **Amazon Simple Email Service**.

---

## 3. Verify a sending identity (domain or email)

You must verify at least one **domain** or **email** so the app can send from it.

### Option A — Verify a domain (recommended for production)

1. In SES: **Verified identities** → **Create identity**.
2. Select **Domain**.
3. Enter the client's sending domain (e.g. `mail.clientdomain.com` or their root domain).
4. Click **Create identity**.
5. SES will show **3 DKIM CNAME records**. Copy them (name and value).
6. **Send the client** (or their DNS person) the exact records and ask them to add these CNAMEs to their DNS. Wait for verification (can take up to 72 hours). In SES, status will change to **Verified** when DNS is correct.
7. The **From address** for the app will be something like `noreply@that-domain.com` (any address at that domain). Write it down for step 6.

### Option B — Verify a single email (quick for testing)

1. In SES: **Verified identities** → **Create identity**.
2. Select **Email address**.
3. Enter one address (e.g. `noreply@clientdomain.com`).
4. Click **Create identity**.
5. The client (or you) must click the **verification link** sent to that inbox.
6. Once verified, that exact email is your **From address** for the app. Write it down for step 6.

---

## 4. (Optional) Request production access

- In SES: **Account dashboard** (or **Get set up**) → **Request production access**.
- Fill the form (use case, volume, bounce/complaint handling). Approval often takes 24–48 hours.
- Until approved, the account is in **sandbox**: you can only send to **verified** recipient addresses and limits are low (e.g. 1 msg/s, 200/day). After approval, you can send to any address and higher limits apply.

---

## 5. Create an access key for the app (programmatic send)

The app needs **Access Key ID** and **Secret Access Key** to call SES — not the console password.

1. In the top search bar, open **IAM** (Identity and Access Management).
2. **Users** → open the user they created for you (e.g. `nanis-developer`).
   - If that user already has **AdministratorAccess**, you can create a key on it.
   - Or create a **new** IAM user (e.g. `nanis-ses-app`) with **only** SES send permissions (see below).
3. Open the user → **Security credentials** tab → **Create access key**.
4. Use case: **Application running outside AWS** → Next → Create access key.
5. **Copy the Access Key ID and Secret access key** and store them securely. You won't see the secret again.
6. If you created a new user, attach an inline policy or custom policy with:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "*"
    }
  ]
}
```

---

## 6. Put the values in the backend `.env`

Open **`backend/.env`** and set (or add) these. Use the **exact** values from the client's account.

```env
# --- Email (Amazon SES) ---
AWS_ACCESS_KEY_ID=AKIA...          # From step 5
AWS_SECRET_ACCESS_KEY=...          # From step 5 (secret key)
AWS_REGION=us-east-1               # Region you used in step 2 (e.g. us-east-1)
SES_FROM_EMAIL=noreply@clientdomain.com   # Verified From address from step 3
```

- **AWS_ACCESS_KEY_ID** / **AWS_SECRET_ACCESS_KEY** — from the access key you created in step 5.
- **AWS_REGION** — the SES region (e.g. `us-east-1`, `eu-west-1`).
- **SES_FROM_EMAIL** — the verified domain identity (e.g. `noreply@clientdomain.com`) or the verified single email.

Save the file. **Do not commit `.env`.**

---

## 7. (Optional) Tracking and scheduler

If you want **open/click tracking** and **scheduled campaigns**:

1. **TRACKING_SECRET** — generate a long random string (e.g. `openssl rand -hex 32`) and set it in `.env`. Same value is used to sign track URLs in emails.
2. **TRACKING_BASE_URL** — set to the public base URL of your API (e.g. `https://api.clientdomain.com`), no trailing slash. The app will build track links like `https://api.clientdomain.com/api/v1/track/open?r=...`.
3. **CRON_SECRET** — another random string for the cron endpoint that processes scheduled campaigns. Set it in `.env` and use the same value in your cron job (e.g. `X-Cron-Secret: your-cron-secret`).

Example:

```env
TRACKING_SECRET=your-32-char-hex-or-long-random-string
TRACKING_BASE_URL=https://api.clientdomain.com
CRON_SECRET=another-random-secret-for-cron
```

---

## 8. Test sending

1. Restart the backend if it’s running (`uvicorn app.main:app --reload --port 8000`).
2. Call **POST** `.../organizations/{org_id}/campaigns/{campaign_id}/send` with `dry_run=true` first (only prepares recipients).
3. If the account is still in **sandbox**, ensure the **recipient email** is verified in SES (SES → Verified identities → verify that address). Then call send without `dry_run` to send one campaign.
4. If you get **503** and a message about AWS or SES, double-check `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, and `SES_FROM_EMAIL` in `.env`.

---

## Quick checklist

- [ ] Logged in to client AWS (IAM sign-in link + username + password).
- [ ] Opened SES in the chosen region; noted **AWS_REGION**.
- [ ] Verified at least one identity (domain or email); noted **SES_FROM_EMAIL**.
- [ ] (Optional) Requested production access.
- [ ] Created **access key** for the app; saved Access Key ID and Secret.
- [ ] Set **AWS_ACCESS_KEY_ID**, **AWS_SECRET_ACCESS_KEY**, **AWS_REGION**, **SES_FROM_EMAIL** in `backend/.env`.
- [ ] (Optional) Set **TRACKING_SECRET**, **TRACKING_BASE_URL**, **CRON_SECRET** in `.env`.
- [ ] Restarted backend and tested send (dry_run then real send; sandbox = verified recipient only).

If the client gave you **Access Key ID + Secret** directly (no console login), skip steps 1–5 and do **only step 6** (and 7–8 if needed). You still need **AWS_REGION** and **SES_FROM_EMAIL** from them (the region they use for SES and the verified From address).
