# Email Sending Setup for Mailapp


This document explains why we need Amazon SES for your project, the options we have, and **exactly what you need to do** so we can get email sending working. Everything is written in plain language.

---

## 1. Why we need an email service (Amazon SES)

Your application will send **campaign emails** to your contacts. To do that, we need a **reliable email service** that:

- Delivers emails to your recipients’ inboxes (instead of spam)
- Handles large numbers of emails when you send to many contacts
- Keeps your domain and brand trusted (so “From: you@mailapp.app” is recognized)

**Amazon SES** (Simple Email Service) is that service. It’s run by Amazon, used by many companies, and is low-cost. We’re not building our own email system; we’re connecting your app to SES so it can send emails on your behalf.

---

## 2. What SES does (in simple terms)

- **You** (or we, with your permission) create an account with Amazon for email sending.
- **You** verify your domain or email address with Amazon (so they know you’re allowed to send from “@mailapp.app”).
- **Your app** then uses that account to send emails. When someone clicks “Send campaign” in your app, the app talks to Amazon SES, and SES delivers the email to your contacts.

So: **your app → Amazon SES → your contacts’ inbox.** You don’t see Amazon’s systems; you just use your app. We need to set up the link between your app and SES once, and then it runs in the background.

---

## 3. Two ways we can set this up

### Option A — **Recommended: You create the account, we do the rest**

- **You** create an AWS (Amazon Web Services) account and add your payment method.
- **You** give us **limited access** (see steps below) so we can log in and do all the technical setup: connect your domain, set up security (DKIM/SPF), and create the “keys” the app needs to send email.
- **You** own the account and pay Amazon directly. We never see your card or billing.
- **We** only get access to the part of the account that’s needed for email (SES). We cannot see or change your billing or other AWS services.

**Why we recommend this:** You stay in control, you pay only Amazon, and there’s no billing or “who owns the account” confusion. This is the usual way agencies and clients work together for email.

---

### Option B — We create the account, you pay us 

- **We** create an AWS account with our payment method.
- **We** set up SES and your domain there.
- **You** reimburse us for the email costs (or we absorb them).

**Why we don’t recommend this:** You don’t own the account, so if we part ways you’d need a new account and we’d have to move everything. Billing and invoicing also get more complicated. It’s simpler and cleaner for you to own the account from the start.

---

**If you decide to go with Option A.** You create the account and give us limited access; we do all the technical setup.

---

## 4. What you need to do (step-by-step)

Follow these steps **in order**. If anything is unclear, you can ask us before moving to the next step.

---

### Step 1: Create an AWS account

1. Open a browser and go to: **https://aws.amazon.com**
2. Click **“Create an AWS Account”** (top right).
3. Enter your **email address** and choose an **account name** (e.g. “My Company” or “Mailapp”). Click **Next**.
4. Choose **“Personal”** or **“Professional”** (either is fine). Fill in your details and click **Next**.
5. Enter your **payment information** (card details).
   - AWS requires this even though there is a **free tier** and email (SES) is very cheap (a few dollars for thousands of emails). You will only be charged if usage goes beyond the free tier. We can discuss expected volume if you want.
6. Complete **identity verification** (phone or other, as asked).
7. Choose the **Support plan**: **“Basic support – Free”** is enough. Click **Finish**.

You now have an AWS account. You do **not** need to understand the rest of the AWS website; we will use it for you once you give us access.

---

### Step 2: Add a payment method (if not already done)

- If you already added a card in Step 1, you can skip this.
- Otherwise: log in to AWS → click your **account name** (top right) → **“Billing and Cost Management”** (or **“Account”**) → **“Payment methods”** → add your card.

AWS needs a valid payment method on file. Again, SES is low-cost and you have free-tier allowance.

---

### Step 3: Give us access so we can set up email (IAM console access)

We need **one-time access** to your AWS account so we can:

- Turn on and configure the email service (SES)
- Verify your domain so emails come from “@mailapp.app”
- Create a **secure key** that only your app will use to send email (you will never need to touch this)

You will **not** give us your main AWS login password. Instead, you will create a **separate user** for us with limited permissions (only what’s needed for email). That way you stay in control.

**Do this:**

1. **Log in** to AWS: https://console.aws.amazon.com  
   (Use the same email and password you used to create the account.)

2. In the top search bar, type **IAM** and open **“IAM”** (Identity and Access Management).

3. In the left menu, click **“Users”** → then **“Create user”**.

4. **User name:** type something like **`nanis-developer`** or **`email-setup`**. Click **Next**.

5. **Permissions:**

   - Choose **“Attach policies directly”**.
   - In the search box, type **AdministratorAccess**.
   - Tick the box next to **“AdministratorAccess”**.
   - Click **Next**, then **Next** again, then **“Create user”**.  
     (We need broad access only to set everything up once; we will not use this for anything except SES and creating the app key.)

6. **Create a password for us to sign in:**

   - Click on the **user name** you just created (e.g. `nanis-developer`).
   - Open the **“Security credentials”** tab.
   - Scroll to **“Console sign-in”** → click **“Assign console password”**.
   - Choose **“Custom password”** and set a **temporary password** (e.g. a long random one; you can change it later).
   - **Uncheck** “User must create a new password at next sign-in” (so we can log in without being forced to change it).
   - Click **Save**.

7. **Get the sign-in link for this user:**

   - In IAM, click **“Dashboard”** (left) or **“IAM”** in the breadcrumb.
   - On the right, under **“IAM resources”**, you’ll see **“IAM users sign-in link”**. It looks like:  
     `https://XXXXXXXX.signin.aws.amazon.com/console`
   - Copy that link.

8. **Send us these three things securely**:

   - The **sign-in link** (e.g. `https://XXXXXXXX.signin.aws.amazon.com/console`)
   - The **IAM user name** (e.g. `nanis-developer`)
   - The **temporary password** you set for that user

---

### Step 4: Tell us your sending domain or email (for “From” address)

We need to know **what address or domain** should appear as the sender of your campaign emails, for example:

- **Domain:** “mycompany.com” or “mail.mycompany.com”  
  → We will then set up so you can send from addresses like `noreply@mycompany.com` or `campaigns@mycompany.com`.
- **Or a single email:** “info@mycompany.com” (we can verify one address for testing first).

Reply to us with either:

- “Our sending domain is: **…………**”  
  or
- “Use this email for testing: **…………**”

We will use this when we configure SES in your account.

---

### Step 5: (Optional) Give us access to your DNS (for domain verification)

If you want to send from **your own domain** (e.g. `noreply@mailapp.app`), Amazon will ask for a few **DNS records** to be added (to prove you own the domain).

- If **you** manage your domain (e.g. GoDaddy, Namecheap, Cloudflare): we can tell you **exactly** which records to add and where, in simple steps.
- If **we** or someone else manages DNS: you can give that person access to add the records we send, or ask them to add the records we provide.

We will send you the exact lines to add **after** we log in and start the domain verification. You don’t need to do anything for DNS until we ask.

---

## 6. What we will do after you complete the steps

Once we have:

- Your IAM sign-in link, username, and password, and
- Your sending domain or email,

we will:

1. Log in to your AWS account (using the IAM user you created).
2. Open the email service (SES) and verify your domain or email.
3. Add the security settings (DKIM/SPF) so your emails are trusted.
4. Request “production” access from Amazon so you can send to any recipient (not only test addresses).
5. Create a **key** for the app and put it in your app’s configuration so it can send email.
6. Optionally, we will guide you or your DNS manager to add the DNS records if we use a domain.

You won’t need to do anything else on AWS after that. Your app will then be able to send campaign emails.

---

## 7. Quick checklist for you

- [ ] Step 1: Create AWS account (aws.amazon.com → Create an AWS Account).
- [ ] Step 2: Payment method added (if not done in Step 1).
- [ ] Step 3: Create IAM user (e.g. `nanis-developer`), set console password, and send us: **sign-in link**, **username**, **password** (securely).
- [ ] Step 4: Tell us your **sending domain** or **test email address**.
- [ ] Step 5: (When we ask) Add DNS records for your domain, or give DNS access to whoever will add them.

If you have any questions, reply to us and we’ll clarify. Thank you.
