# **ARCHITECTURE OVERVIEW DOCUMENT**

---

## **1. Purpose of This Document**

This document provides a **high-level architectural view** of the Campaign & Growth Management SaaS platform.

The goal is to clearly define:

* Major system components
* How data flows between them
* Where third-party services fit
* Clear separation of responsibilities

This is an **implementation-agnostic overview** meant for alignment, not low-level coding details.

---

## **2. High-Level System Components**

The platform is composed of the following core layers:

1. Frontend (User Interface)
2. Backend (Business Logic & Data)
3. Third-Party Services
4. Infrastructure & Hosting

---

## **3. Frontend Architecture**

### **3.1 User Application (Next.js)**

The frontend is a **single unified web application** responsible for:

* User interaction
* Visual builders (email editor, website builder)
* Dashboard and analytics views
* Real-time inbox experience

Key characteristics:

* Built with Next.js + TypeScript
* Modular component-based architecture
* Uses shared UI packages for consistency
* Communicates with backend via secured APIs

---

### **3.2 Frontend Responsibilities**

The frontend:

* Handles UI state and interactions
* Renders builders and dashboards
* Displays analytics and reports
* Sends authenticated requests to backend services

The frontend **does not**:

* Store sensitive secrets
* Execute business-critical logic
* Directly interact with third-party APIs

---

## **4. Backend Architecture**

### **4.1 Supabase Backend Core**

Supabase serves as the **central backend platform**, providing:

* PostgreSQL database
* Authentication & authorization
* File storage
* Realtime subscriptions

All persistent data flows through Supabase.

---

### **4.2 Backend Responsibilities**

The backend is responsible for:

* User authentication and session management
* Organization, team, and permission enforcement
* Campaign execution logic
* Automation workflow execution
* Analytics aggregation
* Secure interaction with third-party APIs

---

### **4.3 Server-Side Logic**

Server-side logic is implemented using:

* **FastAPI (Python)** — custom API layer for business logic (contacts, campaigns, SES, Razorpay, webhooks, workers)
* Supabase Edge Functions (optional) — for Supabase-triggered logic (e.g. DB webhooks) in Deno if desired

Used for:

* Sending emails via Amazon SES
* Processing automation triggers
* Handling inbound webhooks
* Executing scheduled tasks

---

## **5. Data Architecture**

### **5.1 Core Data Domains**

Major data domains include:

* Users & Authentication
* Organizations / Workspaces
* Contacts & Audiences
* Campaigns & Templates
* Automations & Workflows
* Messages & Conversations
* Websites & Content
* Analytics & Events

Each domain is logically isolated but relationally connected.

---

### **5.2 Data Flow Principles**

* All writes go through backend-controlled endpoints
* Frontend reads via secure APIs or realtime subscriptions
* Sensitive data is protected using Row Level Security (RLS)

---

## **6. Third-Party Services Integration Layer**

### **6.1 Email & Messaging Providers**

Integrated services:

* Amazon SES (email delivery)
* WhatsApp Business API
* Telegram Bot API
* Twitter/X API

These services:

* Are accessed only via backend services
* Communicate via secure API keys and webhooks

---

### **6.2 E-commerce Integrations**

* Shopify API
* WooCommerce REST API

Used for:

* Contact sync
* Event triggers
* Automation workflows

---

### **6.3 Payments**

* Razorpay API

Used for:

* Subscription management
* Billing enforcement
* Payment status tracking

---

## **7. Realtime & Event Handling**

Realtime capabilities are handled via:

* Supabase Realtime subscriptions

Used for:

* Unified inbox messages
* Live updates in dashboards
* In-app notifications

Event-driven logic:

* Automation triggers
* Webhook events
* Scheduled jobs

---

## **8. Security Architecture**

Security is enforced through:

* Supabase Authentication
* Role-Based Access Control (RBAC)
* Row Level Security (RLS)
* Secure API key storage

Principles:

* Least privilege access
* Backend-only access to third-party services
* No sensitive secrets exposed to frontend

---

## **9. Scalability & Extensibility Principles**

The architecture is designed to:

* Scale horizontally via cloud services
* Support additional integrations
* Allow new modules without breaking existing ones
* Enable future migration of services if required

---

## **10. Architecture Status**

✅ **Architecture is approved for implementation.**

Detailed technical designs and schemas will be created per module during development.

---
