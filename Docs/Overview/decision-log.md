# **DECISION LOG**

---

## **Purpose of This Document**

This document records **key product, technical, and delivery decisions** made during the planning phase of the Campaign & Growth Management SaaS.

The goal is to:

- Preserve reasoning behind decisions
- Avoid repeated debates and second-guessing
- Maintain alignment across development
- Provide long-term clarity for future contributors

This log should be **updated whenever a major decision is made**.

---

## **Product Decisions**

### **D-001: Product Scope — Full-Scale Platform**

- **Decision:** Build a full-scale product (not MVP-only)
- **Reason:** Vision requires deep integrations, automation, and builders that cannot be meaningfully validated with a shallow MVP
- **Impact:** Requires phased delivery and strong documentation

---

### **D-002: Unified All-in-One Platform**

- **Decision:** Combine campaigns, design, automation, inbox, websites, and analytics into a single platform
- **Reason:** Reduce tool sprawl and context switching for businesses
- **Impact:** Higher architectural complexity, higher long-term value

---

## **Technology Decisions**

### **D-003: Frontend Framework — Vite + React (SPA)**

- **Decision:** Use Vite + React for the frontend (SPA; React Router for routing)
- **Reason:** Fast dev experience, simple build, suitability for SaaS dashboards; current app is Vite 7 + React 19
- **Impact:** SPA structure; routing and auth patterns documented in `Docs/Platform/routing.md` and `Docs/Tasks/Dev/frontend-state.md`

---

### **D-004: Backend Platform — Supabase**

- **Decision:** Use Supabase as the primary backend
- **Reason:** Auth, PostgreSQL, Storage, Realtime, and Edge Functions in one platform
- **Impact:** Faster development with strong security and scalability

---

### **D-005: Email Delivery — Amazon SES**

- **Decision:** Use Amazon SES for email delivery
- **Reason:** Cost efficiency, deliverability, and scale
- **Impact:** Requires domain verification and webhook handling

---

### **D-006: Payments — Razorpay**

- **Decision:** Use Razorpay for subscriptions and billing
- **Reason:** India-friendly, reliable APIs, easy subscription management
- **Impact:** Subscription logic tied to Razorpay events

---

### **D-007: Visual Email Builder — Built from Scratch**

- **Decision:** Build the email template editor internally
- **Reason:** Differentiation, customization control, no third-party dependency
- **Impact:** Higher initial effort, long-term flexibility

---

### **D-008: Automation Engine — Custom Workflow System**

- **Decision:** Build a custom automation engine using JSON workflows
- **Reason:** Full control over triggers, conditions, and actions
- **Impact:** Enables complex automations across product modules

---

## **Architecture Decisions**

### **D-009: Multi-Tenant Organization Model**

- **Decision:** All data scoped to organizations/workspaces
- **Reason:** Support teams, agencies, and multiple projects per account
- **Impact:** RLS required across all core tables

---

### **D-010: Backend-Only Third-Party Integrations**

- **Decision:** All third-party APIs accessed only from backend
- **Reason:** Security, secret protection, and centralized control
- **Impact:** Requires robust server-side integration layer

---

### **D-011: Signup Side Effects via Edge Function**

- **Decision:** Signup side effects (profile + organization + membership creation) are handled via a Supabase Edge Function called immediately after user signup
- **Reason:**
  - Atomic operations ensure data consistency
  - Service role access bypasses RLS for organization creation (no INSERT policy exists)
  - Idempotent design handles duplicate retries safely
  - Keeps frontend logic simple and secure
- **Impact:**
  - Requires Edge Function deployment and database webhook configuration
  - All signup-related data creation happens server-side
  - Frontend only handles authentication UI, not data creation

---

### **D-017: Frontend Authentication via useAuth Hook and Context**

- **Decision:** Frontend authentication state is managed through a `useAuth` React hook wrapped in an `AuthContext` provider, providing app-wide access to user, profile, organization, and session data
- **Reason:**
  - Centralized authentication state management
  - RLS-compatible data fetching (uses authenticated user's session)
  - Automatic session refresh and auth state change handling
  - Clean separation of concerns (no routing/redirect logic in hook)
  - Context pattern enables easy access throughout component tree
- **Impact:**
  - All components can access auth state via `useAuthContext()` hook
  - Single source of truth for authentication data
  - Automatic refetching on session changes
  - Works seamlessly with Day-1 RLS policies (users can only access their own data)
  - Requires `AuthProvider` wrapper in app root

---

### **D-018: Vercel Deployment with OAuth for Client Preview**

- **Decision:** Deploy the application to Vercel after authentication completion, with Google and Apple sign-in enabled, so the client can track progress via a live preview
- **Reason:**
  - Enables real-time progress tracking and feedback
  - Provides live preview environment for client review
  - OAuth providers (Google, Apple) offer better user experience than email/password
  - Vercel (or similar) provides deployment and preview URLs for the frontend SPA
  - Allows client to test authentication flow and see actual implementation
- **Impact:**
  - Requires Vercel project setup and deployment configuration
  - Requires Supabase OAuth provider configuration (Google, Apple)
  - Environment variables must be configured in Vercel
  - Client can access live preview URL to test and provide feedback
  - Deployment happens after core authentication implementation is complete
- **Deployment Strategy:**
  - **Phase 1**: Deploy with email/password authentication first
  - **Phase 2**: Add Google OAuth integration
  - **Phase 3**: Add Apple OAuth integration
  - This phased approach ensures stability and allows incremental testing
  - See `Docs/Deploy/deployment-flow.md` for detailed deployment steps

---

## **Delivery & Process Decisions**

### **D-012: Documentation-First Development**

- **Decision:** Complete core documentation before writing code
- **Reason:** Prevent scope drift, context loss, and architectural mistakes
- **Impact:** Faster and cleaner execution during development

---

### **D-013: Phased 12-Week Roadmap**

- **Decision:** Deliver in 4 phases over 12 weeks
- **Reason:** Manage complexity while delivering usable milestones
- **Impact:** Allows validation and refinement at each phase

---

### **D-014: AI-Assisted Development (Cursor Pro)**

- **Decision:** Use Cursor Pro as the primary AI development assistant
- **Reason:** Strong repo-level context and multi-file understanding
- **Impact:** Requires clean repo structure and modular development

---

### **D-017: Custom API Layer — FastAPI (Python)**

- **Decision:** Use **FastAPI (Python)** for the custom API layer instead of Supabase Edge Functions + frontend API routes
- **Reason:** Backend developer is more familiar with Python (Flask/FastAPI); FastAPI is async, well-suited for REST APIs, and can handle all planned features (contacts, campaigns, SES, Razorpay, webhooks, workers)
- **Impact:**
  - Backend lives in `backend/` as a FastAPI app; deploy separately (e.g. Railway, Render, Fly.io)
  - Supabase remains for: PostgreSQL, Auth, Storage, Realtime (frontend and/or FastAPI talk to Supabase)
  - FastAPI validates Supabase JWT for auth; RLS in Postgres still applies
  - Frontend (Vite + React) calls FastAPI for business logic; document all endpoints in `Docs/API/README.md`
  - Supabase Edge Functions can still be used for Supabase-triggered logic (e.g. `on-signup-create-org` in Deno) if desired, or that logic can live in FastAPI

---

## **Commercial & Legal Decisions**

### **D-015: Code Ownership**

- **Decision:** Full source code ownership transferred to client
- **Reason:** Client requirement and trust building
- **Impact:** No reuse of proprietary code

---

### **D-016: Pricing & Payment Structure**

- **Decision:** Total project cost set at ₹2.4 Lakhs with 30/30/40 payment split
- **Reason:** Balanced risk and commitment for both parties
- **Impact:** Final 40% tied to client satisfaction

---

## **Decision Log Status**

✅ **Decision log initialized and active.**

All future major decisions must be recorded here.

---
