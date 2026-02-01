# Nanis Frontend — Vite + React

Vite 7 + React 19 (JSX), Tailwind CSS, Framer Motion, React Router. Auth via Supabase; API via FastAPI (`VITE_API_URL`).

## Quick start

```bash
cd frontend
npm install
cp .env.example .env   # set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
npm run dev
```

Open http://localhost:5173. See [Docs/Tasks/Onboarding/setup-checklist.md](../Docs/Tasks/Onboarding/setup-checklist.md) for env and Supabase Auth.

## Structure

- **src/App.jsx** — Router, AuthProvider, routes (signup, signin, onboarding, protected app)
- **src/context/AuthContext.jsx** — Session, org, signUp, signIn, signOut
- **src/lib/supabase.js**, **api.js** — Supabase client, API client (Bearer token)
- **src/features/auth/** — SignUpScreen, SignInScreen, OnboardingScreen
- **src/features/app/** — AppLayout, DashboardPage

API contract: [Docs/API/README.md](../Docs/API/README.md).
