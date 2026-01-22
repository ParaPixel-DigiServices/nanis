# **DECISION LOG**

---

## **Purpose of This Document**

This document records **key product, technical, and delivery decisions** made during the planning phase of the Campaign & Growth Management SaaS.

The goal is to:

* Preserve reasoning behind decisions
* Avoid repeated debates and second-guessing
* Maintain alignment across development
* Provide long-term clarity for future contributors

This log should be **updated whenever a major decision is made**.

---

## **Product Decisions**

### **D-001: Product Scope — Full-Scale Platform**

* **Decision:** Build a full-scale product (not MVP-only)
* **Reason:** Vision requires deep integrations, automation, and builders that cannot be meaningfully validated with a shallow MVP
* **Impact:** Requires phased delivery and strong documentation

---

### **D-002: Unified All-in-One Platform**

* **Decision:** Combine campaigns, design, automation, inbox, websites, and analytics into a single platform
* **Reason:** Reduce tool sprawl and context switching for businesses
* **Impact:** Higher architectural complexity, higher long-term value

---

## **Technology Decisions**

### **D-003: Frontend Framework — Next.js**

* **Decision:** Use Next.js with TypeScript
* **Reason:** Scalability, performance, and suitability for SaaS dashboards
* **Impact:** Strong structure for builders and analytics-heavy UI

---

### **D-004: Backend Platform — Supabase**

* **Decision:** Use Supabase as the primary backend
* **Reason:** Auth, PostgreSQL, Storage, Realtime, and Edge Functions in one platform
* **Impact:** Faster development with strong security and scalability

---

### **D-005: Email Delivery — Amazon SES**

* **Decision:** Use Amazon SES for email delivery
* **Reason:** Cost efficiency, deliverability, and scale
* **Impact:** Requires domain verification and webhook handling

---

### **D-006: Payments — Razorpay**

* **Decision:** Use Razorpay for subscriptions and billing
* **Reason:** India-friendly, reliable APIs, easy subscription management
* **Impact:** Subscription logic tied to Razorpay events

---

### **D-007: Visual Email Builder — Built from Scratch**

* **Decision:** Build the email template editor internally
* **Reason:** Differentiation, customization control, no third-party dependency
* **Impact:** Higher initial effort, long-term flexibility

---

### **D-008: Automation Engine — Custom Workflow System**

* **Decision:** Build a custom automation engine using JSON workflows
* **Reason:** Full control over triggers, conditions, and actions
* **Impact:** Enables complex automations across product modules

---

## **Architecture Decisions**

### **D-009: Multi-Tenant Organization Model**

* **Decision:** All data scoped to organizations/workspaces
* **Reason:** Support teams, agencies, and multiple projects per account
* **Impact:** RLS required across all core tables

---

### **D-010: Backend-Only Third-Party Integrations**

* **Decision:** All third-party APIs accessed only from backend
* **Reason:** Security, secret protection, and centralized control
* **Impact:** Requires robust server-side integration layer

---

## **Delivery & Process Decisions**

### **D-011: Documentation-First Development**

* **Decision:** Complete core documentation before writing code
* **Reason:** Prevent scope drift, context loss, and architectural mistakes
* **Impact:** Faster and cleaner execution during development

---

### **D-012: Phased 12-Week Roadmap**

* **Decision:** Deliver in 4 phases over 12 weeks
* **Reason:** Manage complexity while delivering usable milestones
* **Impact:** Allows validation and refinement at each phase

---

### **D-013: AI-Assisted Development (Cursor Pro)**

* **Decision:** Use Cursor Pro as the primary AI development assistant
* **Reason:** Strong repo-level context and multi-file understanding
* **Impact:** Requires clean repo structure and modular development

---

## **Commercial & Legal Decisions**

### **D-014: Code Ownership**

* **Decision:** Full source code ownership transferred to client
* **Reason:** Client requirement and trust building
* **Impact:** No reuse of proprietary code

---

### **D-015: Pricing & Payment Structure**

* **Decision:** Total project cost set at ₹2.4 Lakhs with 30/30/40 payment split
* **Reason:** Balanced risk and commitment for both parties
* **Impact:** Final 40% tied to client satisfaction

---

## **Decision Log Status**

✅ **Decision log initialized and active.**

All future major decisions must be recorded here.

---
