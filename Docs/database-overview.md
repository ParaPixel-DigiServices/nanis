# **DATABASE MODEL — HIGH-LEVEL DESIGN**

---

## **1. Purpose of This Document**

This document defines the **high-level data model** for the Campaign & Growth Management SaaS platform.

It focuses on:

* Core entities (tables)
* Ownership and relationships
* Data boundaries between organizations

⚠️ This document intentionally avoids column-level details. Those will be defined later during implementation.

---

## **2. Core Design Principles**

* **Multi-tenant by default** (organization/workspace based)
* **All data is owned by an organization**
* **Users belong to one or more organizations**
* **Row Level Security (RLS)** enforced on all tenant-owned tables
* **Event-driven data model** to support automation and analytics

---

## **3. Core Entities Overview**

The system is organized into the following major data domains:

1. Identity & Access
2. Organizations & Teams
3. Contacts & Audiences
4. Campaigns & Templates
5. Automations & Events
6. Messaging & Inbox
7. Websites & Content
8. Files & Assets
9. Analytics & Events
10. Billing & Subscriptions

---

## **4. Identity & Access**

### **4.1 Users**

* Represents individual user accounts
* Auth handled via Supabase Auth

### **4.2 User Profiles**

* Stores application-level user metadata
* Linked 1:1 with auth users

---

## **5. Organizations & Teams**

### **5.1 Organizations (Workspaces)**

* Represents a business or workspace
* Primary tenant boundary

### **5.2 Organization Members**

* Maps users to organizations
* Stores role and permission level

### **5.3 Roles & Permissions**

* Defines access control per organization
* Used for feature gating and admin actions

---

## **6. Contacts & Audience Management**

### **6.1 Contacts**

* Stores customer/contact records
* Owned by organization

### **6.2 Contact Fields (Custom Attributes)**

* Defines dynamic/custom fields per organization

### **6.3 Contact Segments**

* Logical groupings of contacts
* Used for campaigns and automation

---

## **7. Campaigns & Templates**

### **7.1 Campaigns**

* Represents email or messaging campaigns
* Stores configuration, status, and scheduling info

### **7.2 Templates**

* Visual templates for emails
* Can be admin-provided or user-created

### **7.3 Campaign Folders**

* Organizational grouping for campaigns

---

## **8. Automations & Event System**

### **8.1 Automations**

* Stores workflow definitions
* JSON-based structure

### **8.2 Automation Nodes / Steps**

* Individual steps within a workflow

### **8.3 Events**

* Represents system or user-triggered events
* Used to trigger automations

---

## **9. Messaging & Unified Inbox**

### **9.1 Conversations**

* Represents a conversation thread
* Linked to channel and contact

### **9.2 Messages**

* Individual messages within conversations

### **9.3 Channels**

* Defines messaging channels (Email, WhatsApp, Telegram, etc.)

---

## **10. Website Builder & Content**

### **10.1 Websites**

* Represents a website created by an organization

### **10.2 Pages**

* Individual pages within a website

### **10.3 Page Blocks / Sections**

* Visual content blocks for pages

---

## **11. Files & Brand Assets**

### **11.1 Files**

* Stores metadata for uploaded assets

### **11.2 Asset Folders**

* Organizes files within the asset manager

---

## **12. Analytics & Tracking**

### **12.1 Events Log**

* Stores user and system events
* Used for analytics and automation

### **12.2 Metrics / Aggregates**

* Precomputed analytics data for performance

---

## **13. Billing & Subscriptions**

### **13.1 Plans**

* Defines subscription plans

### **13.2 Subscriptions**

* Tracks active subscriptions per organization

### **13.3 Payments**

* Stores payment transaction records

---

## **14. Data Ownership & Relationships Summary**

* User → belongs to → Organization(s)
* Organization → owns → Contacts, Campaigns, Automations, Websites, Files
* Campaign → uses → Template → targets → Segment
* Automation → triggered by → Event → performs → Action
* Conversation → contains → Messages

---

## **15. Database Status**

✅ **High-level database model approved.**

Detailed schemas, indexes, and RLS rules will be defined per module during implementation.

---
