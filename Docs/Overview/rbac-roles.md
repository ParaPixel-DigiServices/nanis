# RBAC — Roles & Permissions (P1-RBAC-001)

## 1. Roles

All org-scoped access is governed by **organization_members.role**:

| Role       | Description                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| **owner**  | Full control: update/delete org, manage all members, delete org. Exactly one per org.                       |
| **admin**  | Manage members (invite, change role except owner), update org settings. Cannot delete org or remove owner.  |
| **member** | Read org and members; use org resources (contacts, campaigns, etc.). Cannot manage members or org settings. |

- Every org has exactly one **owner** (set when org is created).
- **owner** and **admin** can invite new members and assign role `admin` or `member` (not `owner`).
- **owner** can transfer ownership or delete the org; **admin** cannot.

## 2. Where checks run

- **Database:** RLS policies enforce “user can only see orgs they belong to” and “only owner/admin can update org / manage members.” See `backend/migrations/002_rls_policies.sql`.
- **Backend (FastAPI):** For actions that RLS does not cover (e.g. “only admin can call this endpoint”), use server-side checks:
  - Resolve current user from `Authorization: Bearer <supabase_access_token>` (validate JWT, get `user_id`).
  - Query `organization_members` for `(organization_id, user_id)` and enforce minimum role (e.g. require `role IN ('owner', 'admin')` for invite).
- **Frontend:** Hide or disable UI based on role; never rely on frontend alone for security.

## 3. Backend implementation

- **Auth dependency:** `get_current_user(request)` — validate Supabase JWT, return `user_id` (and optional profile).
- **Org dependency:** `require_org_member(organization_id, min_roles=('member',))` — ensure user is in org with at least one of the given roles; return membership row (including role).
- Use `require_org_member(..., min_roles=('owner', 'admin'))` for admin-only endpoints (e.g. invite member, update org).

See `backend/app/dependencies.py` for the dependency stubs; implement with Supabase client and JWT verification when auth is wired.
