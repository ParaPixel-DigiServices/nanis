"""Supabase client (service role) — server-side only. Never expose to frontend."""

from functools import lru_cache
from typing import Any

from app.config import get_settings


@lru_cache
def get_supabase_client() -> Any:
    """Return Supabase client with service_role key. Use only in backend."""
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    from supabase import create_client
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
