# Scripts

Run from `backend/` (or repo root with `PYTHONPATH` or `python backend/scripts/...`).

- **seed_dev_org.py** (P1-DB-004) — Creates a dev org and adds a user as owner.  
  `python scripts/seed_dev_org.py --email you@example.com` or `--user-id <uuid>`.  
  Requires `.env` with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
