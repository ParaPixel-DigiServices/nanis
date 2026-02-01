# Frontend — Current State

Actual stack and what’s implemented. Use for onboarding and planning.

## Stack

| Layer     | Choice         | Notes                     |
| --------- | -------------- | ------------------------- |
| Build     | Vite 7         | `frontend/vite.config.js` |
| Framework | React 19 (JSX) | TypeScript optional       |
| Styling   | Tailwind CSS   | Custom theme              |
| Animation | Framer Motion  | SignUpScreen steps        |
| Routing   | React Router   | BrowserRouter, Routes     |
| Auth      | Supabase Auth  | AuthContext, session      |
| API       | FastAPI client | `src/lib/api.js` + token  |

## Done

- **App shell:** `App.jsx` — Router, AuthProvider, public routes (`/signup`, `/signin`, `/login`, `/onboarding`), protected routes under AppLayout (`/`, `/campaigns/email`, `/dashboard`).
- **Auth:** Supabase client (`src/lib/supabase.js`), AuthContext (user, org, signUp, signInWithPassword, signInWithOAuth, signOut). API client with Bearer token (`src/lib/api.js`).
- **Sign up:** SignUpScreen — step 1 calls `supabase.auth.signUp`; steps 2–3 collect business name + slug; step 4 or “Get Started” calls `POST /api/v1/onboard`, then navigates to `/campaigns/email`.
- **Sign in:** SignInScreen — email/password via `signInWithPassword`; redirect to app.
- **Onboarding:** OnboardingScreen — for users with no org (e.g. after OAuth); create workspace via `POST /api/v1/onboard`.
- **Protected layout:** AppLayout — loading → org check → redirect to `/signin` or `/onboarding` or render outlet.

## Gaps (optional / later)

- Reset-password screen; TypeScript migration; full campaign/contacts UI polish.
