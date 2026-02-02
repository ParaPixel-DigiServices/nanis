"""Load configuration from environment. Server-only: never expose service-role or secrets to client."""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Backend settings. All secrets are SERVER-ONLY — never send to frontend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    # JWT Secret from Dashboard → Settings → API (for verifying access tokens)
    supabase_jwt_secret: str = ""

    # Server
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    environment: Literal["development",
                         "staging", "production"] = "development"
    # CORS: comma-separated origins for production (e.g. https://yourapp.vercel.app)
    allowed_origins_extra: str = ""
    # Optional CORS: regex for matching origins (e.g. ^https://.*\\.vercel\\.app$)
    allowed_origins_regex: str = ""
    # TEMP/DEBUG: allow requests from any Origin (not recommended for production).
    cors_allow_all: bool = False

    # Optional — Phase 2+ (SES)
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    ses_from_email: str = ""
    # Cron/scheduler: secret for POST /internal/process-scheduled-campaigns (P2-SES-003)
    cron_secret: str = ""
    # P2-SES-004: tracking pixel/click — secret for signing tokens; base URL for track links in emails
    tracking_secret: str = ""
    # e.g. https://api.yourdomain.com (no trailing slash)
    tracking_base_url: str = ""
    # razorpay_key_id: str | None = None
    # razorpay_key_secret: str | None = None
    # razorpay_webhook_secret: str | None = None

    @property
    def is_development(self) -> bool:
        return self.environment == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
