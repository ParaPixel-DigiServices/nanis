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

- **App shell:** `App.jsx` — Router, AuthProvider, public routes (`/signup`, `/signin`, `/login`), protected routes under AppLayout (`/`, `/campaigns/email`, `/dashboard`).
- **Auth:** Supabase client (`src/lib/supabase.js`), AuthContext (user, org, signUp, signInWithPassword, signInWithOAuth, signOut). API client with Bearer token (`src/lib/api.js`).
- **Sign up:** SignUpScreen — step 1 calls `supabase.auth.signUp`; steps 2–3 collect business name + slug; step 4 or “Get Started” calls `POST /api/v1/onboard`. Same steps for email signup after step 1; then navigates to `/campaigns/email`.
- **Sign in:** SignInScreen — email/password via `signInWithPassword`; redirect to app.
- **Protected layout:** AppLayout — loading → no user → redirect `/signin`; user but no org → redirect `/signup` (questionnaire there); user + org → render outlet.

## Gaps (optional / later)

- Reset-password screen; TypeScript migration; full campaign/contacts UI polish.
