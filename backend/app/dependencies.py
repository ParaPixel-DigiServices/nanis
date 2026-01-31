"""Auth and RBAC dependencies — validate Supabase JWT, require org membership/role.

P1-RBAC-001: Permission checks run server-side here. RLS enforces tenant boundaries in DB.
Supabase can issue JWTs with HS256 (JWT Secret) or ES256 (JWKS). We support both.
"""

from typing import Sequence

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from app.config import get_settings

security = HTTPBearer(auto_error=False)


def _decode_header_only(token: str) -> dict | None:
    """Decode JWT header without verification to get alg/kid."""
    try:
        return jwt.get_unverified_header(token)
    except jwt.PyJWTError:
        return None


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str | None:
    """Return current user id if valid Supabase Bearer token; else None."""
    if not credentials or not credentials.credentials:
        return None
    token = credentials.credentials
    settings = get_settings()
    header = _decode_header_only(token)
    if not header:
        return None
    alg = header.get("alg") or "HS256"

    try:
        if alg == "ES256" and settings.supabase_url:
            # Supabase ES256: verify with public key from JWKS
            jwks_uri = settings.supabase_url.rstrip(
                "/") + "/auth/v1/.well-known/jwks.json"
            jwks_client = PyJWKClient(jwks_uri)
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                audience="authenticated",
                algorithms=["ES256"],
            )
        else:
            # HS256 (legacy): verify with JWT Secret from Dashboard
            if not settings.supabase_jwt_secret:
                return None
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                audience="authenticated",
                algorithms=["HS256"],
            )
        return payload.get("sub")
    except jwt.PyJWTError:
        return None


async def require_current_user(
    user_id: str | None = Depends(get_current_user_id),
) -> str:
    """Require authenticated user; 401 if missing."""
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return user_id


def require_org_member(min_roles: Sequence[str] = ("member",)):
    """Dependency factory: require user to be member of org with at least one of min_roles.
    Use as: Depends(require_org_member(('owner', 'admin'))).
    TODO: Resolve organization_id from path/query; query organization_members for user_id + org_id; check role in min_roles.
    """

    async def _require(
        user_id: str = Depends(require_current_user),
        # organization_id: from path in route
    ) -> dict:
        # TODO: fetch membership row for (organization_id, user_id); if not found or role not in min_roles -> 403
        return {"user_id": user_id, "role": "member"}

    return _require
