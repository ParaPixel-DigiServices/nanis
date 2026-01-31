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

    # Optional — Phase 2+ (SES)
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    ses_from_email: str = ""
    # razorpay_key_id: str | None = None
    # razorpay_key_secret: str | None = None
    # razorpay_webhook_secret: str | None = None

    @property
    def is_development(self) -> bool:
        return self.environment == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
