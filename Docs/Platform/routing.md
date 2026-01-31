# **ROUTING ARCHITECTURE**

---

## **1. Purpose of This Document**

This document describes the **Next.js App Router routing architecture** for the multi-tenant SaaS platform, including public authentication routes and protected application routes, and where authentication checks occur.

---

## **2. Overview**

The application uses Next.js App Router with **route groups** to organize public and protected routes. Authentication checks are performed at the layout level, ensuring all protected routes are secured automatically.

**Key Principles:**

- Route groups organize routes by access level
- Authentication checks happen in layouts, not individual pages
- Public routes have no authentication requirements
- Protected routes require both user authentication and organization membership

---

## **3. Route Structure**

### **3.1 Directory Structure**

```
apps/web/app/
├── layout.tsx              # Root layout (wraps all routes)
├── (auth)/                 # Public route group
│   ├── layout.tsx         # Public layout (pass-through)
│   └── login/
│       └── page.tsx       # Login page
└── (app)/                  # Protected route group
    ├── layout.tsx         # Protected layout (auth checks)
    └── dashboard/
        └── page.tsx       # Dashboard page
```

### **3.2 Route Groups**

**Route groups** (folders wrapped in parentheses) organize routes without affecting the URL structure:

- `(auth)` - Public authentication routes (no auth required)
- `(app)` - Protected application routes (auth required)

**Note:** Parentheses in folder names don't appear in URLs. `/login` is accessible at `http://localhost:3000/login`, not `/auth/login`.

---

## **4. Layout Hierarchy**

### **4.1 Root Layout**

**Location:** `apps/web/app/layout.tsx`

**Purpose:**

- Wraps the entire application
- Provides `AuthProvider` context to all routes
- Sets up global styles and fonts

**Implementation:**

```typescript
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

**Key Features:**

- `AuthProvider` wraps all routes, making auth context available everywhere
- No authentication checks (handled by child layouts)
- Server component (default in Next.js App Router)

---

### **4.2 Public Auth Layout**

**Location:** `apps/web/app/(auth)/layout.tsx`

**Purpose:**

- Wraps public authentication routes
- Provides pass-through layout (no checks, no styling)

**Implementation:**

```typescript
export default function AuthLayout({ children }) {
  return children;
}
```

**Key Features:**

- Minimal pass-through layout
- No authentication checks
- No redirects
- No UI styling
- Routes under this layout are accessible without authentication

**Routes:**

- `/login` - Login page

---

### **4.3 Protected App Layout**

**Location:** `apps/web/app/(app)/layout.tsx`

**Purpose:**

- Wraps protected application routes
- Performs authentication and organization checks
- Redirects unauthenticated users
- Shows loading states

**Implementation:**

```typescript
"use client";

export default function AppLayout({ children }) {
  const { user, organization, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null; // Redirecting...
  }

  if (!organization) {
    return <div>Setting up your workspace...</div>;
  }

  return children;
}
```

**Key Features:**

- **Client component** (uses hooks)
- Checks authentication state via `useAuthContext()`
- Redirects to `/login` if user is not authenticated
- Shows loading state while auth is resolving
- Shows setup message if user has no organization
- Only renders children when both user and organization exist

**Routes:**

- `/dashboard` - Dashboard page (and all future protected routes)

---

## **5. Authentication Checks**

### **5.1 Where Checks Occur**

Authentication checks happen at **two levels**:

1. **Root Layout** - Provides auth context (no checks)
2. **Protected Layout** - Performs authentication checks

### **5.2 Check Flow**

```
User navigates to protected route
    ↓
Root Layout (provides AuthProvider)
    ↓
Protected Layout (app/(app)/layout.tsx)
    ↓
Check loading state
    ├─ Loading → Show "Loading..."
    └─ Not Loading → Check user
        ├─ No user → Redirect to /login
        └─ Has user → Check organization
            ├─ No organization → Show "Setting up workspace..."
            └─ Has organization → Render children
```

### **5.3 Check Logic**

**Step 1: Loading State**

```typescript
if (loading) {
  return <div>Loading...</div>;
}
```

- Shows loading UI while auth state is being resolved
- Prevents flash of unauthenticated content

**Step 2: User Authentication**

```typescript
useEffect(() => {
  if (!loading && !user) {
    router.push("/login");
  }
}, [loading, user, router]);
```

- Redirects to `/login` if user is not authenticated
- Only runs after loading completes

**Step 3: Organization Check**

```typescript
if (!organization) {
  return <div>Setting up your workspace...</div>;
}
```

- Ensures user has an organization before accessing app
- Shows setup message if organization is missing

**Step 4: Render Children**

```typescript
return children;
```

- Only reached when user and organization both exist
- Protected content is now accessible

---

## **6. Public Routes**

### **6.1 Route Group: `(auth)`**

**Layout:** `apps/web/app/(auth)/layout.tsx`

**Routes:**

- `/login` - User login page

**Characteristics:**

- No authentication required
- Accessible to all users (authenticated or not)
- No redirects or checks
- Minimal pass-through layout

**Use Cases:**

- Login page
- Sign up page (future)
- Password reset page (future)
- Email verification page (future)

---

## **7. Protected Routes**

### **7.1 Route Group: `(app)`**

**Layout:** `apps/web/app/(app)/layout.tsx`

**Routes:**

- `/dashboard` - Main dashboard

**Characteristics:**

- Requires user authentication
- Requires organization membership
- Automatically redirects unauthenticated users
- Shows loading states during auth resolution

**Use Cases:**

- Dashboard
- Campaigns
- Contacts
- Analytics
- Settings
- All application features

---

## **8. Route Access Patterns**

### **8.1 Unauthenticated User**

**Accessing `/login`:**

```
/login → (auth) layout → Login page ✅
```

**Accessing `/dashboard`:**

```
/dashboard → (app) layout → Check auth → Redirect to /login ✅
```

### **8.2 Authenticated User (No Organization)**

**Accessing `/login`:**

```
/login → (auth) layout → Login page ✅
```

**Accessing `/dashboard`:**

```
/dashboard → (app) layout → Check auth → Check org → Show setup message ✅
```

### **8.3 Authenticated User (With Organization)**

**Accessing `/login`:**

```
/login → (auth) layout → Login page ✅
```

**Accessing `/dashboard`:**

```
/dashboard → (app) layout → Check auth → Check org → Render dashboard ✅
```

---

## **9. Navigation Flow**

### **9.1 Sign In Flow**

```
1. User visits /login (public route)
2. User signs in
3. AuthContext updates (user + organization loaded)
4. User navigates to /dashboard
5. Protected layout checks auth → ✅
6. Protected layout checks organization → ✅
7. Dashboard renders
```

### **9.2 Sign Out Flow**

```
1. User is on /dashboard (protected route)
2. User signs out
3. AuthContext updates (user = null)
4. Protected layout detects no user
5. Redirects to /login
```

### **9.3 Direct Navigation**

```
1. User directly visits /dashboard (not authenticated)
2. Protected layout checks auth → ❌
3. Redirects to /login
4. User signs in
5. Can now access /dashboard
```

---

## **10. Implementation Details**

### **10.1 Client vs Server Components**

**Root Layout:**

- Server component (default)
- Can't use hooks directly
- Wraps with `AuthProvider` (client component)

**Protected Layout:**

- Client component (`"use client"`)
- Uses `useAuthContext()` hook
- Uses `useRouter()` for navigation
- Uses `useEffect()` for redirects

**Public Layout:**

- Server component (default)
- Simple pass-through, no hooks needed

### **10.2 AuthContext Dependency**

All authentication checks depend on `AuthContext`:

- Provided by `AuthProvider` in root layout
- Available to all routes via context
- Updated automatically on auth state changes
- Single source of truth for auth state

### **10.3 Redirect Mechanism**

**Implementation:**

```typescript
useEffect(() => {
  if (!loading && !user) {
    router.push("/login");
  }
}, [loading, user, router]);
```

**Behavior:**

- Runs after loading completes
- Only redirects if user is missing
- Uses Next.js `useRouter()` for navigation
- Client-side redirect (no page reload)

---

## **11. Route Examples**

### **11.1 Adding a New Public Route**

**Create:** `apps/web/app/(auth)/signup/page.tsx`

**Result:** Accessible at `/signup` (no auth required)

### **11.2 Adding a New Protected Route**

**Create:** `apps/web/app/(app)/campaigns/page.tsx`

**Result:**

- Accessible at `/campaigns`
- Requires authentication
- Requires organization
- Automatically protected by `(app)` layout

### **11.3 Nested Protected Routes**

**Create:** `apps/web/app/(app)/campaigns/[id]/page.tsx`

**Result:**

- Accessible at `/campaigns/[id]`
- Inherits protection from parent `(app)` layout
- No additional auth checks needed

---

## **12. Security Considerations**

### **12.1 Layout-Level Protection**

**Advantage:**

- All routes under `(app)` are automatically protected
- No need to add auth checks to individual pages
- Consistent security across all protected routes

### **12.2 Client-Side Checks**

**Note:**

- Authentication checks happen client-side
- Server-side protection should be added for production
- API routes should verify authentication server-side
- RLS policies provide database-level security

### **12.3 Redirect Timing**

**Implementation:**

- Redirects happen after loading completes
- Prevents redirect loops
- Ensures auth state is resolved before checking

---

## **13. Future Enhancements**

Potential improvements:

1. **Server-Side Protection** - Add middleware for server-side auth checks
2. **Role-Based Routes** - Protect routes based on user roles
3. **Organization Switching** - Allow users to switch between organizations
4. **Route-Level Permissions** - Fine-grained permission checks per route
5. **Loading Skeletons** - Better loading UI for protected routes

---

## **14. Related Documentation**

- **Team & API:** `Docs/Team/collaboration.md` — how frontend and backend stay in sync; `Docs/API/README.md` — API contract
- **Auth/RLS/Signup:** To be added when auth and database are implemented (e.g. `Docs/Auth/`, `Docs/Database/`)

---

## **15. Status**

- [ ] **Routing architecture to be implemented.**

The routing structure (public vs protected routes, layout-level auth checks) is specified in this document and is to be implemented as part of the fresh start.

---
