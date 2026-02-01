# Frontend — Current State & Gaps

This document reflects the **actual frontend stack and what’s implemented** as of the last review. Use it for onboarding and planning.

---

## 1. Stack (Actual)

| Layer     | Choice                       | Notes                                      |
| --------- | ---------------------------- | ------------------------------------------ |
| Build     | **Vite 7**                   | `frontend/vite.config.js`, `npm run dev`   |
| Framework | **React 19**                 | JSX (TypeScript optional, not yet used)    |
| Styling   | **Tailwind CSS 3**           | `tailwind.config.js`, custom brand/surface |
| Animation | **Framer Motion 12**         | Used in SignUpScreen steps                 |
| Icons     | **Lucide React**             | Eye, EyeOff, Globe, Check, X, Loader2      |
| Utilities | **clsx**, **tailwind-merge** | Conditional classes                        |

**Not present yet:** React Router, Supabase client, FastAPI API client, global auth state.

---

## 2. What’s Done

### 2.1 App shell

- **Entry:** `index.html` → `main.jsx` → `App.jsx`.
- **App.jsx:** Full-viewport layout with background image; renders `SignUpScreen` only (no routing).

### 2.2 Sign-up flow (UI only)

**Location:** `frontend/src/features/auth/SignUpScreen.tsx`

- **Step 1 — Sign up:** Full name, email, password (with validation pills: 8 chars, number, special), Terms & Privacy checkbox, “Sign up” button, “Or” divider, Google/Apple buttons.
  - **No backend:** Form does not call Supabase (or any API). “Sign up” only advances to step 2.
- **Step 2 — Business name:** Single input, Back/Continue. No state persistence or API.
- **Step 3 — Custom domain:** `DomainInput` with mock availability (taken: `taken`, `test`, `admin`). Back/Continue.
- **Step 4 — Welcome:** Video + “Get Started” button. No navigation or post-signup redirect.

**Shared UI:** Logo + “MailApp” branding, gradient capsules, footer “Go back to MailApp.app” link.

**Components (local to SignUpScreen):** `StepOneForm`, `DiamondInput` (password with show/hide), `DomainInput`, `CustomCheckbox`, `ValidationPill`.

### 2.3 Styling

- **Tailwind:** Content paths include `index.html`, `src/**/*.{js,ts,jsx,tsx}`. Custom theme: `screens.mbp`, `fontFamily.sans`/`brand`, `colors.brand`/`surface`, `boxShadow.signup-btn`.
- **index.css:** Tailwind directives only; `body` background and antialiasing.

---

## 3. Gaps (What’s Not Done)

- **Routing:** No React Router. Single view only; “Sign in”, “Get Started”, and “Go back to MailApp.app” do not change routes.
- **Auth:** No Supabase Auth (no `signUp`, `signInWithOAuth`, session, or token handling).
- **API client:** No shared client for FastAPI (e.g. base URL, auth header from Supabase session).
- **State:** No global auth/org context; no persistence of sign-up steps (e.g. org name, domain) to backend.
- **Sign-in / reset:** “Sign in” is a placeholder link; no login or password-reset screens.
- **Protected shell:** No layout for logged-in app (nav, org switcher, dashboard route).
- **TypeScript:** Project is JSX; TypeScript is optional and not configured in frontend yet.

---

## 4. Doc / Phase Alignment

- **Tech stack:** Docs previously said “Next.js”; actual app is **Vite + React**. See `Docs/Overview/techstack-locked.md` (updated to Vite + React).
- **Phase 1:** P1-SETUP-001 is satisfied by “Vite + React app boots, Tailwind + layout” (see `phase-1-foundation.md`). P1-AUTH-001 / P1-AUTH-002 are **not** done (auth screens and session/protected routes still needed).
- **Routing:** App is a SPA; routing will be implemented with **React Router**, not Next.js App Router. See `Docs/Platform/routing.md` for the intended structure.

---

## 5. Suggested Next Steps (Frontend)

1. Add **React Router** and define routes (e.g. `/`, `/signin`, `/reset-password`, `/app/*`).
2. Add **Supabase** client; wire Sign up (email/password) and “Sign in with Google/Apple” to Supabase Auth.
3. Implement **session handling** and a simple auth context; redirect unauthenticated users from `/app/*` to `/signin`.
4. Wire **post-signup steps** (business name, domain) to backend (e.g. create org + membership after email signup or OAuth).
5. Add **Sign in** and **Reset password** screens and wire to Supabase.
6. Build **app shell** for authenticated users (layout, nav, org switcher placeholder, dashboard route).

Once these are in place, Phase 1 auth and routing acceptance criteria can be marked complete and work can continue on P1-UI-001, P1-DASH-001, and P1-RBAC-003.
