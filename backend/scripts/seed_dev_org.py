#!/usr/bin/env python3
"""
P1-DB-004: Create a dev org and add a user as owner for local testing.

Usage:
  From backend/:  python scripts/seed_dev_org.py --email you@example.com
  Or:            python scripts/seed_dev_org.py --user-id <uuid>
  Optional:      --org-name "My Dev Org"  (default: "Dev Org")
                  --slug dev-org          (default: from org_name, lower, hyphenated)

Requires: .env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
"""
from __future__ import annotations
from dotenv import load_dotenv

import argparse
import os
import re
import sys
from pathlib import Path

# Add backend root so app.config is importable
backend_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_root))

# Load .env from backend root (so script works from repo root or backend/)
load_dotenv(backend_root / ".env")
if not os.getenv("SUPABASE_URL") and not os.getenv("NEXT_PUBLIC_SUPABASE_URL"):
    load_dotenv(backend_root.parent / ".env")  # repo root .env


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "org"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Create dev org + add user as owner")
    parser.add_argument("--email", type=str,
                        help="User email (look up in auth.users)")
    parser.add_argument("--user-id", type=str,
                        help="User UUID (from auth.users)")
    parser.add_argument("--org-name", type=str,
                        default="Dev Org", help="Organization name")
    parser.add_argument("--slug", type=str, default=None,
                        help="Org slug (default: from org_name)")
    args = parser.parse_args()

    if not args.user_id and not args.email:
        parser.error("Provide --email or --user-id")
    if args.user_id and args.email:
        parser.error("Provide only one of --email or --user-id")

    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print(
            "Error: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env", file=sys.stderr)
        return 1
    if "your-project" in url or not url.strip().startswith("https://"):
        print(
            "Error: SUPABASE_URL must be your real project URL (e.g. https://xxxx.supabase.co), not a placeholder.", file=sys.stderr)
        return 1

    try:
        from supabase import create_client
    except ImportError:
        print("Error: pip install supabase python-dotenv", file=sys.stderr)
        return 1

    client = create_client(url, key)
    user_id: str | None = args.user_id

    if args.email:
        # Resolve user_id from email via Admin API (list_users + filter)
        try:
            resp = client.auth.admin.list_users()
            users = getattr(resp, "users", None) or getattr(
                resp, "data", None) or (resp if isinstance(resp, list) else [])
            for u in users:
                email = getattr(u, "email", None) or (
                    u.get("email") if isinstance(u, dict) else None)
                if email == args.email:
                    user_id = getattr(u, "id", None) or (
                        u.get("id") if isinstance(u, dict) else None)
                    break
            else:
                user_id = None
            if not user_id:
                print(
                    f"No user found with email {args.email}. Create the user in Supabase Auth first, or use --user-id <uuid>.", file=sys.stderr)
                return 1
        except Exception as e:
            err = str(e).lower()
            if "getaddrinfo" in err or "connection" in err or "resolve" in err:
                print(
                    "Could not reach Supabase (check SUPABASE_URL in backend/.env and network).", file=sys.stderr)
                print("Use --user-id instead: get your user UUID from Supabase Dashboard → Authentication → Users → click test@dev.com → copy 'User UID'.", file=sys.stderr)
                print(
                    "Then run: python scripts/seed_dev_org.py --user-id <paste-uuid-here>", file=sys.stderr)
            else:
                print(f"Failed to list users: {e}", file=sys.stderr)
            return 1

    org_slug = args.slug or slugify(args.org_name)

    # Insert organization
    org_res = client.table("organizations").insert({
        "name": args.org_name,
        "slug": org_slug,
    }).execute()

    if not org_res.data or len(org_res.data) == 0:
        print("Failed to create organization", file=sys.stderr)
        if hasattr(org_res, "errors") and org_res.errors:
            print(org_res.errors, file=sys.stderr)
        return 1

    org_id = org_res.data[0]["id"]
    print(f"Created organization: {args.org_name} ({org_slug}) id={org_id}")

    # Insert membership (user as owner)
    mem_res = client.table("organization_members").insert({
        "organization_id": org_id,
        "user_id": user_id,
        "role": "owner",
    }).execute()

    if not mem_res.data or len(mem_res.data) == 0:
        print("Failed to add membership", file=sys.stderr)
        if hasattr(mem_res, "errors") and mem_res.errors:
            print(mem_res.errors, file=sys.stderr)
        return 1

    print(f"Added user {user_id} as owner. Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
