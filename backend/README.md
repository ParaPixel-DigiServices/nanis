# Nanis Backend — FastAPI + Supabase

Backend API for the Nanis Campaign & Growth Management SaaS. FastAPI (Python) with Supabase (Postgres, Auth, Storage).

## Quick start

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
cp .env.example .env      # fill in Supabase URL/keys
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API: http://localhost:8000
- OpenAPI docs: http://localhost:8000/docs (development only)

## Environment variables

Copy `.env.example` to `.env` and set values. **Never commit `.env`.**

### Client-safe vs server-only

| Variable                                              | Client-safe? | Notes                                                                                   |
| ----------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------- |
| `SUPABASE_URL`                                        | **Yes**      | Frontend needs this to connect to Supabase (Auth, Realtime).                            |
| `SUPABASE_ANON_KEY`                                   | **Yes**      | Public anon key; safe in browser. RLS enforces security.                                |
| `SUPABASE_SERVICE_ROLE_KEY`                           | **No**       | **Server-only.** Bypasses RLS. Use only in backend (FastAPI). Never expose to frontend. |
| `SUPABASE_JWT_SECRET`                                 | **No**       | **Server-only.** Used to verify Supabase access tokens (Dashboard → Settings → API).    |
| `AWS_*`, `RAZORPAY_*`, `*_SECRET`, `*_WEBHOOK_SECRET` | **No**       | **Server-only.** All third-party secrets stay in backend.                               |

**Rule:** If it bypasses RLS or is a secret/API key for a third party, it is **server-only**. Only `SUPABASE_URL` and `SUPABASE_ANON_KEY` are safe for the frontend.

## Local workflow (migrations & seed)

- **Migrations:** SQL for schema changes. Apply via Supabase Dashboard (SQL Editor) or [Supabase CLI](https://supabase.com/docs/guides/cli). Migration files in `migrations/` (see `migrations/README.md`). Run **001**, **002**, then **003** in order.
- **Seed:** After migrations, create a dev org and add yourself as owner:  
  `python scripts/seed_dev_org.py --email you@example.com`  
  Or with user id: `python scripts/seed_dev_org.py --user-id <uuid>`.  
  Requires `.env` with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- **Resetting:** Use Supabase Dashboard to reset DB or re-run migrations on a fresh project.

## Supabase at this stage (Phase 1)

After running **001**, **002**, and **003** in the SQL Editor:

- **Done:** Core tables, RLS, profile-on-signup trigger. No further Supabase SQL is required for Phase 1.
- **Optional:** In Dashboard → Authentication → Providers, enable Email and (later) Google/Apple if needed.
- **Optional:** In Authentication → URL Configuration, set Site URL and Redirect URLs when you have a frontend URL.
- **Edge Function** `on-signup-create-org` is **not** required for Phase 1: org creation is done in the app when the user clicks “Create workspace” (P1-AUTH-003). The trigger **003** only creates the profile row on signup.

## Project structure

```
backend/
├── app/
│   ├── main.py          # FastAPI app
│   ├── config.py        # Settings from env (server-only)
│   ├── dependencies.py  # Auth dependencies (later)
│   └── api/
│       └── v1/          # API v1 routes
├── migrations/          # SQL migrations (Supabase)
├── scripts/             # Seed and one-off scripts
├── requirements.txt
├── .env.example
└── README.md
```

## Quality (optional)

```bash
ruff check app
ruff format app
mypy app
```

## API contract

Backend documents all endpoints in **Docs/API/README.md**. Update it when you add or change APIs so the frontend can integrate. Phase 2: contacts, tags, templates, campaigns, CSV import (`POST .../contacts/import`), storage — see that doc.
