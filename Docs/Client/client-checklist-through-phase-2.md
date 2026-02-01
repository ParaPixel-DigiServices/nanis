# Client Checklist — Everything You Need to Do Through Phase 2

This document lists **every step you (the client) need to complete** so the Nanis app can go live through **Phase 2**: login/signup, Google & Apple Sign-In, and **email campaigns via Amazon SES** (domain verification, DNS, production access).  
Do these in order. Your developer will use the credentials and URLs you provide.

---

## Part A — Phase 1: Auth & Foundation

### A1. Supabase (database + auth)

1. **Create a Supabase account** (if you don’t have one)  
   - Go to [supabase.com](https://supabase.com) → **Start your project** → sign in with GitHub or email.

2. **Create a new project**  
   - In the [Supabase Dashboard](https://supabase.com/dashboard): click **New project**.  
   - Choose your **organization** (or create one).  
   - Enter a **name** and **database password** (store the password securely).  
   - Select a **region** close to your users.  
   - Click **Create new project** and wait until the project is ready.

3. **Get project credentials**  
   - In the left sidebar: **Project Settings** (gear) → **API**.  
   - Note:
     - **Project URL** (e.g. `https://xxxx.supabase.co`)
     - **anon public** key (under “Project API keys”)
     - **service_role** key (under “Project API keys” — keep this secret; only for backend)
   - In **Project Settings** → **API** → scroll to **JWT Settings** → copy **JWT Secret**.

4. **Share with your developer**  
   - Send securely: **Project URL**, **anon key**, **service_role key**, **JWT Secret**, and **database password**.  
   - The developer will run database migrations and configure the app.

5. **Auth URL configuration (redirects)**  
   - In Supabase: **Authentication** → **URL Configuration**.  
   - **Site URL:** your app’s public URL (e.g. `https://app.yourdomain.com` or for testing `http://localhost:5173`).  
   - **Redirect URLs:** add (one per line):
     - For local testing: `http://localhost:5173/**`
     - For production: `https://your-app-domain.com/**`  
   - Save.  
   - **Callback URL** shown on the Google/Apple provider pages (e.g. `https://xxxx.supabase.co/auth/v1/callback`) — you will use this in the next sections.

---

### A2. Google Sign-In (optional but recommended)

1. **Open Google Cloud Console**  
   - Go to [console.cloud.google.com](https://console.cloud.google.com). Sign in with the Google account that will own the project.

2. **Create or select a project**  
   - Top bar: click the **project** dropdown → **New project** → name it (e.g. “Nanis Auth”) → **Create**.  
   - Select that project.

3. **Configure OAuth consent screen**  
   - Left menu: **APIs & Services** → **OAuth consent screen**.  
   - Choose **External** (unless you use Google Workspace) → **Create**.  
   - Fill **App name**, **User support email**, **Developer contact email** → **Save and Continue**.  
   - **Scopes:** Save and Continue (default is fine).  
   - **Test users** (if app is in “Testing”): add test emails if needed → **Save and Continue**.

4. **Create OAuth 2.0 credentials**  
   - Left menu: **APIs & Services** → **Credentials**.  
   - **+ Create Credentials** → **OAuth client ID**.  
   - **Application type:** **Web application**.  
   - **Name:** e.g. “Nanis Web”.  
   - **Authorized redirect URIs** → **+ Add URI** → paste your **Supabase callback URL** (from A1.5), e.g. `https://xxxxxxxx.supabase.co/auth/v1/callback`.  
   - **Authorized JavaScript origins** (if required): add your app’s origin(s), e.g. `https://app.yourdomain.com` and for dev `http://localhost:5173`.  
   - Click **Create**.  
   - Copy the **Client ID** and **Client secret** (you only see the secret once — store it securely).

5. **Add Google provider in Supabase**  
   - In Supabase: **Authentication** → **Providers** → **Google**.  
   - **Enable Sign in with Google** → ON.  
   - **Client IDs:** paste your Google **Client ID** (Web application).  
   - **Client Secret (for OAuth):** paste your **Client secret**.  
   - **Callback URL (for OAuth)** is shown here — it must match what you added in Google Cloud (step 4).  
   - **Save**.

---

### A3. Apple Sign-In (optional)

**Requirement:** Paid [Apple Developer Program](https://developer.apple.com/programs/) membership ($99/year).

1. **Create an App ID (if you don’t have one)**  
   - Go to [developer.apple.com/account](https://developer.apple.com/account) → **Certificates, Identifiers & Profiles** → **Identifiers** → **+** (Add).  
   - Select **App IDs** → **Continue** → **App** → **Continue**.  
   - **Description:** e.g. “Nanis”. **Bundle ID:** Explicit, e.g. `com.yourcompany.nanis`.  
   - Under **Capabilities**, enable **Sign in with Apple** → **Continue** → **Register**.

2. **Create a Services ID (for web)**  
   - **Identifiers** → **+** (Add) → **Services IDs** → **Continue**.  
   - **Description:** e.g. “Nanis Web”. **Identifier:** e.g. `com.yourcompany.nanis.web` (unique).  
   - **Register** → then select this **Services ID** from the list.

3. **Configure Sign in with Apple for the Services ID**  
   - Enable **Sign in with Apple** → **Configure**.  
   - **Primary App ID:** select the App ID from step 1.  
   - **Domains and Subdomains:** your app domain, e.g. `app.yourdomain.com` (and for dev you can add a placeholder or skip).  
   - **Return URLs:** add your **Supabase callback URL**, e.g. `https://xxxxxxxx.supabase.co/auth/v1/callback`.  
   - **Save** → **Continue** → **Save**.

4. **Create a Sign in with Apple private key**  
   - **Keys** (in sidebar) → **+** (Add).  
   - **Key name:** e.g. “Nanis Sign in with Apple”.  
   - Enable **Sign in with Apple** → **Configure** → select your **Primary App ID** → **Save** → **Continue** → **Register**.  
   - **Download the .p8 file** once (Apple does not show it again). Store it securely.  
   - Note: **Key ID**, **Services ID** (from step 2), **Team ID** (top right or Membership), **Bundle ID** (App ID from step 1).  
   - You need to generate a **Client secret** (JWT) from the private key; Apple’s docs or your developer can do this. **Apple OAuth secret keys expire every 6 months** — set a reminder to generate a new one and update it in Supabase.

5. **Add Apple provider in Supabase**  
   - In Supabase: **Authentication** → **Providers** → **Apple**.  
   - **Enable Sign in with Apple** → ON.  
   - **Client IDs (Services ID):** your Services ID, e.g. `com.yourcompany.nanis.web`.  
   - **Secret Key (for OAuth):** the client secret (JWT) generated from your .p8 key.  
   - **Callback URL (for OAuth)** is shown — must match the Return URL in Apple (step 3).  
   - **Save**.

---

## Part B — Phase 2: Email (Amazon SES) & DNS

So the app can send **campaign emails** (Phase 2), you need: an AWS account, a **verified sending identity** (domain or email), **DNS records** for that domain, and (for production) **SES production access**.  
**Recommended:** You create the AWS account and billing; the developer uses IAM credentials you provide and does not need your root login or payment details.

### B1. AWS account and billing

1. **Create an AWS account** (if needed)  
   - Go to [aws.amazon.com](https://aws.amazon.com) → **Create an AWS Account**.  
   - Use email, password, account name.  
   - **Contact information:** choose **Personal** or **Business** and fill the form.  
   - **Payment method:** add a valid card. You will be charged only for usage (SES has a free tier; beyond that, cost is per email).  
   - **Identity verification:** complete phone/email verification.  
   - **Support plan:** choose **Basic** (free) unless you need higher support.

2. **Sign in to the AWS Management Console**  
   - [console.aws.amazon.com](https://console.aws.amazon.com) → sign in with root or an IAM user.

---

### B2. IAM user for the app (recommended: let developer send only via SES)

1. **Open IAM**  
   - In the AWS console search bar, type **IAM** → open **IAM** (Identity and Access Management).

2. **Create a user for the application**  
   - **Users** → **Create user**.  
   - **User name:** e.g. `nanis-ses-app`.  
   - **Provide user access to the AWS Management Console** — optional; the app only needs **programmatic** access.  
   - **Next**.

3. **Attach a policy (SES send only)**  
   - **Attach policies directly** → **Create policy** (opens new tab).  
   - **JSON** tab → paste:

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

   - **Next** → **Policy name:** e.g. `NanisSESSendOnly` → **Create policy**.  
   - Back in the **Create user** tab: refresh the policy list → select **NanisSESSendOnly** → **Next** → **Create user**.

4. **Create access key for this user**  
   - Open the new user → **Security credentials** tab → **Access keys** → **Create access key**.  
   - Use case: **Application running outside AWS** → **Next** → **Create access key**.  
   - **Copy Access Key ID and Secret access key** and store them securely. You will not see the secret again.  
   - **Share with your developer** (via a secure channel): **Access Key ID**, **Secret access key**, and the **AWS region** you will use for SES (e.g. `us-east-1`).  
   - The developer will set these in the app as `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`.

---

### B3. Amazon SES — region and verified identity

1. **Open Amazon SES**  
   - In the AWS console search bar, type **SES** → open **Amazon Simple Email Service**.  
   - **Region** (top right): choose the region you will use (e.g. **us-east-1**). All SES steps below are in this region.

2. **Verify a sending identity (domain — recommended for campaigns)**  
   - Left menu: **Configuration** → **Identities** → **Create identity**.  
   - **Identity type:** **Domain**.  
   - **Domain:** the domain you will send from (e.g. `mail.yourdomain.com` or `yourdomain.com`).  
   - **Advanced** (optional): enable **Easy DKIM** (default).  
   - **Create identity**.  
   - SES will show **3 CNAME records** for DKIM. Keep this page open for B4.

3. **If you prefer to test with one email first**  
   - **Identities** → **Create identity** → **Email address** → enter one address (e.g. `noreply@yourdomain.com`) → **Create identity**.  
   - Open the verification email and click the link. Once verified, you can use this address as **From** in the app (developer sets `SES_FROM_EMAIL`).

---

### B4. DNS records (at your domain registrar or DNS provider)

You must add the records SES shows so that your domain is **verified** and **DKIM/SPF** work. Use your DNS host (e.g. Cloudflare, GoDaddy, Route 53, Namecheap).

1. **DKIM (3 CNAME records)**  
   - In SES: **Identities** → your domain → **Authentication** tab → **DKIM** → **View DNS records** (or **Edit** → **Easy DKIM** → **View DNS records**).  
   - You will see **3 CNAME records** (name and value).  
   - In your DNS provider: add each as **CNAME**:
     - **Name/host:** the “name” from SES (often something like `xxxx._domainkey.yourdomain.com` or just the subdomain part SES shows).  
     - **Value/target:** the value SES gives (e.g. `xxxx.dkim.amazonses.com`).  
   - Save. Verification can take from a few minutes up to **72 hours**.

2. **SPF (1 TXT record)**  
   - In SES, for your domain, check **Authentication** for **SPF** or the recommended TXT record.  
   - Common SPF value: `v=spf1 include:amazonses.com ~all`  
   - In DNS: add a **TXT** record for your domain (or the subdomain you send from):
     - **Name:** `@` (or your sending subdomain, e.g. `mail`).  
     - **Value:** `v=spf1 include:amazonses.com ~all`  
   - If you already have an SPF record, merge the two (e.g. `v=spf1 include:amazonses.com include:_spf.google.com ~all`) — do **not** add two separate SPF records for the same name.

3. **Check verification in SES**  
   - In SES → **Identities** → your domain.  
   - **Verification status** should become **Verified** once DNS has propagated.  
   - **DKIM** status should become **Successful** (may take up to 72 hours).

---

### B5. Request production access (exit SES sandbox)

In **sandbox**, SES only lets you send to **verified** addresses and has low limits (e.g. 200 messages/24 hours). For real campaigns you need **production access**.

1. In SES: left menu **Account dashboard** (or **Get set up**).  
2. Find **Production access** → **Request production access** (or **Edit your account details**).  
3. Fill the form:
   - **Mail type:** e.g. **Transactional** and/or **Marketing**.  
   - **Website URL:** your app/product URL.  
   - **Use case description:** e.g. “We send marketing and transactional emails to users who signed up; we process bounces and complaints.”  
   - **Compliance:** confirm you handle bounces/complaints (e.g. unsubscribe, list hygiene).  
4. Submit. Approval often takes **24–48 hours**.  
5. Once approved, you can send to any recipient and higher sending limits apply.

---

### B6. What to give your developer (Phase 2)

After completing B1–B5, provide (via a secure channel):

| Item | Where to get it |
|------|------------------|
| **Access Key ID** | IAM user → Security credentials → Access keys (B2.4) |
| **Secret Access Key** | Same place (only visible at creation) |
| **AWS Region** | e.g. `us-east-1` (the region where you use SES) |
| **From email address** | A verified identity in SES (e.g. `noreply@yourdomain.com`) |

The developer will set these in the app’s backend as `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `SES_FROM_EMAIL`. They do **not** need your AWS root login or billing access.

---

## Summary checklist

| # | Task | Done |
|---|------|------|
| A1 | Supabase: create project, get URL/keys/JWT Secret, share with dev, set Site URL + Redirect URLs | [ ] |
| A2 | Google: Cloud Console project, OAuth consent, Web client ID, redirect URI = Supabase callback, add Client ID + Secret in Supabase | [ ] |
| A3 | Apple: Developer account, App ID, Services ID, Sign in with Apple key, Return URL = Supabase callback, add in Supabase (remember 6‑month key expiry) | [ ] |
| B1 | AWS: create account, add billing | [ ] |
| B2 | IAM: create user, SES send policy, create access key, share key + secret + region with dev | [ ] |
| B3 | SES: choose region, create domain (or email) identity | [ ] |
| B4 | DNS: add DKIM CNAMEs + SPF TXT for sending domain, wait for Verified + DKIM Successful | [ ] |
| B5 | SES: request production access, wait for approval | [ ] |
| B6 | Send developer: Access Key ID, Secret, Region, From email | [ ] |

When all are done, the app can use **Supabase for auth** (including Google/Apple) and **SES for sending campaign emails** through Phase 2.

---

**References (current as of 2024–2025)**  
- [Supabase Dashboard](https://supabase.com/dashboard) — project and API settings, Auth → URL Configuration, Auth → Providers.  
- [Google Cloud Console](https://console.cloud.google.com) — APIs & Services → Credentials, OAuth consent screen.  
- [Apple Developer](https://developer.apple.com/account) — Certificates, Identifiers & Profiles → Identifiers (App ID, Services ID), Keys (Sign in with Apple).  
- [AWS SES Console](https://console.aws.amazon.com/ses/) — Identities, DKIM/SPF, Account dashboard (production access).  
- [AWS IAM](https://console.aws.amazon.com/iam/) — Users, access keys, policies.
