# **TECH STACK DOCUMENT (LOCKED)**

---

## **1. Purpose of This Document**

This document defines the **official, locked technology stack** for the Campaign & Growth Management SaaS platform.

Once finalized, this stack will be treated as **non-negotiable** for the scope of this project to avoid rework, confusion, and architectural inconsistency.

---

## **2. Frontend Stack**

### **2.1 Framework**

- **Vite + React** (SPA)

**Reasoning:**

- Fast dev experience and builds; current app is Vite 7 + React 19 (see `Docs/Tasks/Dev/frontend-state.md`).
- Routing is handled via React Router (SPA), not Next.js App Router.
- Strong ecosystem; suitable for SaaS dashboards and builders.

---

### **2.2 Language**

- **JavaScript (JSX)** or **TypeScript** (optional)

**Reasoning:**

- Frontend is currently JSX; TypeScript can be adopted incrementally.
- TypeScript preferred for larger modules and shared types.

---

### **2.3 Styling & UI**

- **Tailwind CSS** — utility-first styling
- **Framer Motion** — animations and transitions

**Reasoning:**

- Rapid UI development
- Consistent design system
- Smooth, modern interactions for builders and dashboards

---

## **3. Backend Stack**

### **3.1 Backend Platform**

- **Supabase**

Includes:

- PostgreSQL database
- Authentication & authorization
- Storage (files & assets)
- Realtime subscriptions
- Edge Functions

**Reasoning:**

- Faster development
- Built-in auth and realtime
- PostgreSQL reliability
- Ideal for SaaS MVP-to-scale journey

---

### **3.2 Database**

- **PostgreSQL (via Supabase)**

**Reasoning:**

- Relational structure fits SaaS data well
- Strong support for analytics and reporting
- Mature ecosystem

---

### **3.3 Server Logic (Custom API)**

- **FastAPI (Python)** — primary custom API layer (see Decision D-017)

Used for:

- REST APIs for contacts, campaigns, templates, etc.
- Email sending logic (via Amazon SES)
- Automation execution
- Third-party API integrations (Razorpay, WhatsApp, Telegram, etc.)
- Webhooks and secure server-side operations

**Deployment:** FastAPI app hosted separately (e.g. Railway, Render, Fly.io). Supabase Edge Functions may still be used for Supabase-triggered logic (e.g. DB webhooks) in Deno if desired.

---

## **4. Email & Communication Stack**

### **4.1 Email Delivery**

- **Amazon SES (Simple Email Service)**

Used for:

- Bulk email campaigns
- Transactional emails
- Automation-triggered emails

**Reasoning:**

- High deliverability
- Extremely cost-effective
- Scales to millions of emails

---

### **4.2 Messaging Channels (APIs)**

- WhatsApp Business API (Meta)
- Telegram Bot API
- Twitter/X API
- In-App Chat (custom, realtime)

**Reasoning:**

- Enables unified multi-channel inbox
- Real-time customer communication

---

## **5. File & Asset Storage**

- **Supabase Storage**

Used for:

- Logos
- Brand assets
- Images
- Media used in emails and websites

**Reasoning:**

- Tight integration with backend
- Secure access controls
- Easy reuse across modules

---

## **6. Automation & Workflow Engine**

- Custom-built workflow engine
- JSON-based workflow definitions
- Trigger–Condition–Action model

Execution handled via:

- Supabase Edge Functions

**Reasoning:**

- Full control over automation logic
- No dependency on third-party automation tools
- Highly extensible

---

## **7. Analytics & Visualization**

- **Recharts / Chart.js** (Frontend)
- **PostgreSQL aggregations** (Backend)

Used for:

- Campaign analytics
- Automation performance
- Website analytics
- User engagement metrics

---

## **8. Payments & Billing**

- **Razorpay**

Used for:

- Subscription plans
- Monthly / yearly billing
- Secure payment processing

**Reasoning:**

- India-friendly
- Reliable APIs
- Easy subscription handling

---

## **9. Hosting & Deployment**

### **9.1 Frontend Hosting**

- **Vercel**

### **9.2 Backend Hosting**

- **Supabase Cloud**

**Reasoning:**

- Seamless CI/CD
- High availability
- Minimal DevOps overhead

---

## **10. Development Tools**

- **Cursor Pro** — AI-assisted development
- **GitHub** — version control
- **Notion / Markdown Docs** — documentation

---

## **11. Security & Access Control**

- Supabase Row Level Security (RLS)
- Role-based access control
- Secure API key handling

---

## **12. Stack Status**

✅ **This tech stack is locked and approved for development.**

Any changes will require explicit review due to potential architectural impact.

---
