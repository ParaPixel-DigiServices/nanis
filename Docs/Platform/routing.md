# **ROUTING ARCHITECTURE**

---

## **1. Purpose**

This document describes the **React Router (SPA) routing architecture** for the multi-tenant SaaS platform: public auth routes, protected app routes, and where authentication checks occur.

---

## **2. Overview**

The frontend is a **single-page application** using **React Router**. Routes are organized into:

- **Public routes** — no auth required (signup, login, reset password).
- **Protected routes** — require user + organization; unauthenticated users are redirected to login.

Auth checks are done in a **protected layout** (or route wrapper), not in every page.

**Key principles:**

- Public and protected route trees are clearly separated.
- Auth context is provided at the app root.
- Protected layout performs auth + org checks and redirects when needed.

---

## **3. Intended Route Structure (React Router)**

### 3.1 Route list

| Path              | Access    | Description                              |
| ----------------- | --------- | ---------------------------------------- |
| `/`               | Public    | Landing or redirect to signup/login      |
| `/signup`         | Public    | Sign-up flow (current `SignUpScreen` UI) |
| `/signin`         | Public    | Login                                    |
| `/reset-password` | Public    | Password reset request                   |
| `/app`            | Protected | App shell (layout with nav)              |
| `/app/dashboard`  | Protected | Dashboard                                |
| `/app/campaigns`  | Protected | Campaigns (future)                       |
| `/app/contacts`   | Protected | Contacts (future)                        |
| …                 | Protected | Other modules under `/app/*`             |

### 3.2 Suggested file structure

```
frontend/src/
├── main.jsx
├── App.jsx                    # Router + AuthProvider
├── features/
│   ├── auth/
│   │   ├── SignUpScreen.tsx   # /signup
│   │   ├── SignInScreen.tsx   # /signin (to add)
│   │   └── ResetPasswordScreen.tsx  # /reset-password (to add)
│   └── app/
│       ├── AppLayout.tsx      # Protected layout (nav, org switcher)
│       ├── DashboardPage.tsx # /app/dashboard
│       └── ...
├── context/
│   └── AuthContext.jsx       # Session + org (to add)
└── ...
```

**Note:** React Router is not yet added; current app has no routes and only renders `SignUpScreen`. See `Docs/Tasks/Dev/frontend-state.md`.

---

## **4. Layout Hierarchy**

### 4.1 Root (`App.jsx`)

- Renders **Router** (e.g. `BrowserRouter`) and **AuthProvider**.
- No auth checks; only provides auth state to the tree.

### 4.2 Public routes

- No layout requirement beyond root.
- Signup, signin, reset-password are plain pages.
- Accessible to everyone (logged in or not).

### 4.3 Protected layout (`AppLayout` or equivalent)

- Wraps all routes under `/app/*`.
- Uses auth context: loading, user, organization.
- **If loading:** show loading UI.
- **If not loading and no user:** redirect to `/signin`.
- **If user but no organization:** show “Setting up your workspace…” (onboarding).
- **If user and organization:** render outlet (child routes).

---

## **5. Auth Check Flow**

```
User navigates to /app/* (e.g. /app/dashboard)
    ↓
Protected layout reads AuthContext
    ↓
Loading? → Show "Loading..."
    ↓
No user? → Redirect to /signin
    ↓
No organization? → Show "Setting up workspace..."
    ↓
User + org → Render child route
```

---

## **6. Navigation Patterns**

- **Sign in:** User visits `/signin` → signs in → AuthContext updates → navigate to `/app/dashboard` (or default).
- **Sign out:** Clear session in AuthContext → navigate to `/signin`.
- **Direct link:** User opens `/app/dashboard` while unauthenticated → protected layout redirects to `/signin`.

---

## **7. Implementation Notes**

- **React Router:** Use `createBrowserRouter` + `RouterProvider`, or `BrowserRouter` + `Routes`/`Route`. Nest protected routes under a route that renders `AppLayout` with an `Outlet`.
- **Auth context:** Provide `user`, `organization`, `loading`, and methods like `signIn`, `signOut`. Source of truth is Supabase Auth + your backend for org membership.
- **Redirects:** Use React Router’s `Navigate` or `useNavigate()` inside the protected layout when user is missing (after loading).
- **API:** All authenticated requests to FastAPI must send the Supabase JWT (e.g. in `Authorization` header). Backend validates JWT and enforces RLS.

---

## **8. Security**

- Protection is enforced **client-side** in the protected layout; for production, APIs and (if any) server-rendered or server-verified routes must enforce auth server-side.
- RLS and FastAPI dependency on JWT provide server-side security for data and APIs.

---

## **9. Status**

- [ ] **Routing not yet implemented.** App currently has a single view (SignUpScreen) and no React Router. See `Docs/Tasks/Dev/frontend-state.md` for current state and next steps.
