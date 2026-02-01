# Setup Checklist — What to Do Outside of Code

Use this checklist to get **login, signup, and backend↔frontend** working. Everything here is configuration or one-time setup; no code changes required once done.

---

## 1. Supabase project

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (or use an existing one).
2. **Run migrations** in the Supabase SQL Editor (in order):
   - `backend/migrations/001_core_tables.sql`
   - `backend/migrations/002_rls_policies.sql`
   - `backend/migrations/003_handle_new_user.sql`
   - (and any later migrations you need)
3. **Get credentials** from **Project Settings → API**:
   - **Project URL** (e.g. `https://xxxx.supabase.co`)
   - **anon/public key** (safe for frontend)
   - **service_role key** (server-only; never expose)
   - **JWT Secret** (Project Settings → API → JWT Settings → JWT Secret) — backend uses this to verify tokens

---

## 2. Backend environment

1. In `backend/`, copy `.env.example` to `.env`.
2. Fill in:
   - `SUPABASE_URL` = your Project URL
   - `SUPABASE_ANON_KEY` = anon key (optional for some flows; backend mainly uses service_role)
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role key
   - `SUPABASE_JWT_SECRET` = JWT Secret from Dashboard
3. Run the backend: `cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000`
4. Check: `curl http://localhost:8000/api/v1/health` → `{"status":"ok"}`

---

## 3. Frontend environment

1. In `frontend/`, copy `.env.example` to `.env`.
2. Fill in:
   - `VITE_SUPABASE_URL` = same Project URL as backend
   - `VITE_SUPABASE_ANON_KEY` = anon key
   - `VITE_API_URL` = `http://localhost:8000` (dev)
3. Run the frontend: `cd frontend && npm install && npm run dev`
4. Open `http://localhost:5173` — you should see the signup screen.

---

## 4. Supabase Auth (email/password)

1. In **Supabase Dashboard → Authentication → Providers**:
   - **Email** provider is enabled by default.
   - (Optional) Under **Email Auth**, disable **Confirm email** for faster local testing; re-enable for production.
2. No extra config needed for email signup/signin — the frontend uses Supabase client with anon key and will get a session.

---

## 5. Supabase Auth — OAuth (Google / Apple)

If you use “Sign in with Google” or “Sign in with Apple” in the app:

1. **Redirect URLs** (Authentication → URL Configuration):

   - **Site URL:** `http://localhost:5173` (dev) or your production URL.
   - **Redirect URLs:** add `http://localhost:5173/**` (dev) and your production URL + `/**`.

2. **Google** (Authentication → Providers → Google):

   - **Enable Sign in with Google** — turn it on.
   - **Callback URL (for OAuth):** Supabase shows yours, e.g. `https://<your-project-ref>.supabase.co/auth/v1/callback`. **Register this exact URL** in Google Cloud Console as an authorized redirect URI for your OAuth 2.0 Web client.
   - In **Google Cloud Console:** create OAuth 2.0 credentials (Web application), add the Supabase callback URL above as “Authorized redirect URIs”.
   - Back in Supabase:
     - **Client IDs** — comma-separated list (use your Web/OAuth client ID from Google).
     - **Client Secret (for OAuth)** — the client secret from your Google OAuth Web client.
   - (Optional) **Skip nonce checks** / **Allow users without an email** — only if your use case needs them.

3. **Apple** (Authentication → Providers → Apple):
   - **Enable Sign in with Apple** — turn it on.
   - **Callback URL (for OAuth):** same style, e.g. `https://<your-project-ref>.supabase.co/auth/v1/callback`. **Register this URL** in the Apple Developer Center for your Sign in with Apple (web) Service ID.
   - In **Apple Developer Center:** create a Service ID for “Sign in with Apple JS” (web), set the redirect URL to the Supabase callback above.
   - Back in Supabase:
     - **Client IDs** — comma-separated list of allowed Apple app bundle IDs or **Service IDs** for Sign in with Apple on the web.
     - **Secret Key (for OAuth)** — the secret key from Apple used in the OAuth flow.
   - **Note:** Apple OAuth secret keys expire every 6 months; generate a new secret in Apple Developer and update it in Supabase before it expires, or web sign-in will stop working.
   - (Optional) **Allow users without an email** — if your use case needs it.

After OAuth, Supabase redirects back to your **Site URL** with the session in the URL (fragment). The frontend Supabase client will pick it up; then the user can go to **Create workspace** (`/onboarding`) if they have no org yet.

---

## 6. CORS

- The backend already allows origins: `http://localhost:5173`, `http://127.0.0.1:5173`, and port 3000.
- For production, add your frontend origin to `backend/app/main.py` (or via env) in `allow_origins`.

---

## 7. Quick test flow

1. **Sign up (email):** Open `/signup` → enter name, email, password → agree to terms → Sign up. You should move to step 2 (business name).
2. **Complete onboarding:** Enter business name → Continue → enter domain slug (e.g. `mycompany`) → Continue or Get Started. You should land on `/app/dashboard`.
3. **Sign out:** Click Sign out on the dashboard.
4. **Sign in:** Open `/signin` → same email/password → Sign in. You should land on `/app/dashboard` again.
5. **Backend auth:** From the browser console or a REST client, call `GET http://localhost:8000/api/v1/onboard/me` with header `Authorization: Bearer <your_supabase_access_token>`. You can get the token from the frontend (e.g. `supabase.auth.getSession()`) for testing.

---

## 8. If something fails

- **“Invalid API key” / 401 from backend:** Check `SUPABASE_JWT_SECRET` and that the frontend is sending the Supabase **access_token** (not the anon key) in `Authorization: Bearer ...`.
- **CORS errors:** Ensure the frontend runs on 5173 (or add its origin in backend CORS) and that you’re calling `VITE_API_URL` (e.g. `http://localhost:8000`).
- **Sign up fails (Supabase):** Check Supabase Auth logs (Authentication → Logs) and that migrations 001–003 are applied (profile trigger runs on signup).
- **Onboard returns 409:** Slug is already taken; choose another slug.
- **OAuth redirects to wrong URL:** Fix **Site URL** and **Redirect URLs** in Supabase (Authentication → URL Configuration).

---

**Summary:** Create Supabase project → run migrations → set backend `.env` and frontend `.env` → configure Auth (email + optional OAuth) and redirect URLs → run backend and frontend → test signup → signin → onboarding → dashboard.

---

**Client-facing checklist (everything the client must do through Phase 2):** [Docs/Client/client-checklist-through-phase-2.md](../Client/client-checklist-through-phase-2.md) — Supabase, Google Cloud, Apple Developer, AWS/SES, DNS, production access, and what to share with the developer.
