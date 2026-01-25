# **FEATURE GATING STRATEGY**

---

## **1. Purpose of This Document**

This document defines the **feature-gating strategy** for managing unfinished or in-development modules in the SaaS dashboard.

The strategy ensures that:

* Unfinished features are clearly marked and inaccessible to users
* Users receive clear, helpful messaging about upcoming features
* Development can proceed incrementally without exposing incomplete functionality
* The user experience remains professional and consistent
* Feature states can be easily toggled during development and deployment

---

## **2. Feature States**

Each feature/module can exist in one of the following states:

### **2.1 Available (`available`)**
* Feature is fully implemented and accessible
* No restrictions or warnings shown
* Standard user experience

### **2.2 Coming Soon (`coming-soon`)**
* Feature is planned but not yet implemented
* UI shows a "Coming Soon" placeholder or badge
* Navigation links may be disabled or show a tooltip
* Users cannot access the feature

### **2.3 In Development (`in-development`)**
* Feature is partially implemented
* Accessible only to developers/internal users (via feature flag)
* Shows a development banner or warning
* May have limited functionality

### **2.4 Beta (`beta`)**
* Feature is functional but may have bugs or incomplete functionality
* Accessible to users with a beta opt-in
* Shows a beta badge or warning
* Feedback collection enabled

### **2.5 Maintenance (`maintenance`)**
* Feature is temporarily unavailable due to maintenance
* Shows a maintenance message
* Users cannot access the feature

---

## **3. Implementation Approach**

### **3.1 Feature Configuration**

Features are configured in a centralized configuration file:

**File:** `apps/web/config/features.ts`

```typescript
export type FeatureState = 
  | "available" 
  | "coming-soon" 
  | "in-development" 
  | "beta" 
  | "maintenance";

export interface FeatureConfig {
  state: FeatureState;
  message?: string; // Custom message for the feature state
  availableToRoles?: string[]; // Optional: restrict to specific roles
  launchDate?: string; // Optional: ISO date for "coming-soon" features
}

export const FEATURES: Record<string, FeatureConfig> = {
  dashboard: {
    state: "available",
  },
  inbox: {
    state: "coming-soon",
    message: "Unified inbox for all your customer conversations",
    launchDate: "2026-03-01",
  },
  campaigns: {
    state: "in-development",
    message: "Campaign management is currently in development",
  },
  templates: {
    state: "coming-soon",
    message: "Visual email template builder coming soon",
  },
  contacts: {
    state: "coming-soon",
    message: "CRM and contact management",
  },
  automation: {
    state: "coming-soon",
    message: "Workflow automation builder",
  },
  websiteBuilder: {
    state: "coming-soon",
    message: "Website builder with drag-and-drop editor",
  },
  analytics: {
    state: "beta",
    message: "Analytics dashboard (beta)",
  },
  fileManager: {
    state: "coming-soon",
    message: "Cloud-based brand asset manager",
  },
  abTesting: {
    state: "coming-soon",
    message: "A/B testing for campaigns",
  },
  socialMessaging: {
    state: "coming-soon",
    message: "Bulk social messaging",
  },
  publishing: {
    state: "coming-soon",
    message: "Newsletter and blog publishing",
  },
};
```

---

### **3.2 Feature Check Hook**

Create a React hook to check feature availability:

**File:** `apps/web/hooks/useFeature.ts`

```typescript
import { FEATURES, type FeatureConfig } from "../../config/features";
import { useAuthContext } from "../context/AuthContext";

export function useFeature(featureName: string): {
  isAvailable: boolean;
  config: FeatureConfig | null;
  canAccess: boolean;
} {
  const { organizationMember } = useAuthContext();
  const config = FEATURES[featureName] || null;

  if (!config) {
    return { isAvailable: false, config: null, canAccess: false };
  }

  const isAvailable = config.state === "available";
  
  // Check role-based access if configured
  let canAccess = isAvailable;
  if (config.availableToRoles && organizationMember) {
    canAccess = config.availableToRoles.includes(organizationMember.role);
  }

  return {
    isAvailable,
    config,
    canAccess: canAccess || config.state === "beta", // Beta features are accessible
  };
}
```

---

### **3.3 Feature Gate Component**

Create a reusable component to gate feature access:

**File:** `apps/web/components/FeatureGate.tsx`

```typescript
"use client";

import { ReactNode } from "react";
import { useFeature } from "../hooks/useFeature";
import { motion } from "framer-motion";

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ 
  feature, 
  children, 
  fallback 
}: FeatureGateProps) {
  const { isAvailable, config } = useFeature(feature);

  if (isAvailable) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Default "Coming Soon" UI
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 mx-auto">
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-9 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Coming Soon
        </h2>
        {config?.message && (
          <p className="text-slate-600 mb-4">{config.message}</p>
        )}
        {config?.launchDate && (
          <p className="text-sm text-slate-500">
            Expected launch: {new Date(config.launchDate).toLocaleDateString()}
          </p>
        )}
      </motion.div>
    </div>
  );
}
```

---

### **3.4 Navigation Link Component**

Create a navigation link component that respects feature gates:

**File:** `apps/web/components/NavLink.tsx`

```typescript
"use client";

import Link from "next/link";
import { useFeature } from "../hooks/useFeature";
import { ReactNode } from "react";

interface NavLinkProps {
  href: string;
  feature: string;
  children: ReactNode;
  className?: string;
}

export function NavLink({ href, feature, children, className }: NavLinkProps) {
  const { isAvailable, config } = useFeature(feature);

  if (isAvailable) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  // Disabled link with tooltip
  return (
    <div className="relative group">
      <span className={`${className} opacity-50 cursor-not-allowed`}>
        {children}
      </span>
      {config?.state === "coming-soon" && (
        <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-50">
          <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
            {config.message || "Coming soon"}
            <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-900 rotate-45"></div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## **4. UI Patterns for Gated Features**

### **4.1 Navigation Menu**

In the navigation/sidebar, show features with appropriate indicators:

```tsx
<NavLink href="/inbox" feature="inbox">
  <InboxIcon />
  <span>Inbox</span>
  {!isAvailable && (
    <span className="ml-auto text-xs text-slate-400">Soon</span>
  )}
</NavLink>
```

### **4.2 Dashboard Widgets**

For dashboard widgets or cards linking to features:

```tsx
<FeatureGate feature="analytics" fallback={
  <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-[40px] p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-bold text-slate-900">Analytics</h3>
      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
        Beta
      </span>
    </div>
    <p className="text-sm text-slate-600">
      Analytics dashboard is in beta. Some features may be limited.
    </p>
  </div>
}>
  <AnalyticsWidget />
</FeatureGate>
```

### **4.3 Route Protection**

Protect entire routes using the feature gate:

```tsx
// apps/web/app/(app)/inbox/page.tsx
import { FeatureGate } from "../../../components/FeatureGate";

export default function InboxPage() {
  return (
    <FeatureGate feature="inbox">
      <InboxContent />
    </FeatureGate>
  );
}
```

### **4.4 Button/Link States**

For buttons or links that trigger feature access:

```tsx
const { isAvailable, config } = useFeature("automation");

<button
  disabled={!isAvailable}
  className={isAvailable 
    ? "bg-blue-600 hover:bg-blue-700" 
    : "bg-slate-300 cursor-not-allowed"
  }
>
  {isAvailable ? "Create Automation" : "Coming Soon"}
</button>
```

---

## **5. Feature State Messages**

### **5.1 Standard Messages**

Each feature state should have a consistent message pattern:

* **Coming Soon:** "This feature is coming soon. We're working hard to bring it to you."
* **In Development:** "This feature is currently in development and not yet available."
* **Beta:** "This feature is in beta. You may encounter bugs or incomplete functionality."
* **Maintenance:** "This feature is temporarily unavailable due to maintenance. Please check back soon."

### **5.2 Custom Messages**

Custom messages can be provided in the feature configuration for more specific context.

---

## **6. Development Workflow**

### **6.1 Adding a New Feature**

1. **Define the feature** in `config/features.ts` with initial state:
   ```typescript
   newFeature: {
     state: "coming-soon",
     message: "Description of the feature",
   },
   ```

2. **Create the route/page** with feature gate:
   ```tsx
   <FeatureGate feature="newFeature">
     <NewFeatureContent />
   </FeatureGate>
   ```

3. **Update navigation** to use `NavLink` component with feature check

4. **As development progresses**, update the state:
   - `coming-soon` → `in-development` (when starting work)
   - `in-development` → `beta` (when ready for testing)
   - `beta` → `available` (when fully ready)

### **6.2 Testing Feature States**

During development, you can temporarily change feature states to test different UI patterns:

```typescript
// Temporarily enable for testing
analytics: {
  state: "available", // Changed from "beta"
},
```

---

## **7. Environment-Based Configuration**

For different environments (development, staging, production), you can override feature states:

**File:** `apps/web/config/features.env.ts`

```typescript
import { FEATURES } from "./features";

// Override features based on environment
const envOverrides: Partial<typeof FEATURES> = 
  process.env.NODE_ENV === "development"
    ? {
        // Enable all features in development
        inbox: { ...FEATURES.inbox, state: "available" },
        campaigns: { ...FEATURES.campaigns, state: "available" },
      }
    : {};

export const FEATURES_CONFIG = { ...FEATURES, ...envOverrides };
```

---

## **8. Best Practices**

### **8.1 Consistency**
* Use the same feature gate components throughout the application
* Maintain consistent messaging for each feature state
* Keep feature configuration centralized

### **8.2 User Experience**
* Always provide clear feedback about why a feature is unavailable
* Use appropriate visual indicators (badges, disabled states, tooltips)
* Avoid dead-end pages; redirect or show helpful messages

### **8.3 Development**
* Update feature states as development progresses
* Document feature state changes in commit messages
* Use feature gates even for "available" features to maintain consistency

### **8.4 Performance**
* Feature checks are lightweight (simple object lookups)
* No API calls required for feature state checks
* Consider caching feature config if needed

---

## **9. Example: Complete Feature Implementation**

### **9.1 Feature Configuration**

```typescript
// config/features.ts
contacts: {
  state: "coming-soon",
  message: "Manage your contacts and build targeted audiences",
  launchDate: "2026-02-15",
},
```

### **9.2 Route Protection**

```tsx
// app/(app)/contacts/page.tsx
import { FeatureGate } from "../../../components/FeatureGate";

export default function ContactsPage() {
  return (
    <FeatureGate feature="contacts">
      <ContactsContent />
    </FeatureGate>
  );
}
```

### **9.3 Navigation Integration**

```tsx
// components/Sidebar.tsx
import { NavLink } from "./NavLink";

<NavLink href="/contacts" feature="contacts">
  <UsersIcon />
  <span>Contacts</span>
</NavLink>
```

### **9.4 Dashboard Widget**

```tsx
// components/DashboardWidgets.tsx
import { FeatureGate } from "./FeatureGate";

<FeatureGate feature="contacts">
  <ContactsWidget />
</FeatureGate>
```

---

## **10. Migration Path**

When a feature moves from one state to another:

1. **Update feature config** in `config/features.ts`
2. **Test the UI** to ensure appropriate messaging appears
3. **Update documentation** if the feature is now available
4. **Notify users** (if moving from coming-soon to available) via in-app notification or email

---

## **11. Status**

✅ **Feature gating strategy is defined and ready for implementation.**

This strategy provides a flexible, maintainable approach to managing feature availability throughout the development lifecycle.

---

## **12. Related Documents**

* `Docs/project-overview.md` - Complete list of planned features
* `Docs/feature-roadmap.md` - Feature development roadmap
* `Docs/architecture-overview.md` - System architecture

---
