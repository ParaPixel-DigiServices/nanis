"""Nanis backend — FastAPI application."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import router as api_v1_router
from app.config import get_settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown: init Supabase client, etc. when needed."""
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Nanis API",
        description="Campaign & Growth Management SaaS — Backend API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
    )

    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    extra_origins = []
    if settings.allowed_origins_extra:
        extra_origins = [
            s.strip() for s in settings.allowed_origins_extra.split(",") if s.strip()]
        origins.extend(extra_origins)

    if settings.cors_allow_all:
        origin_regex = ".*"
    else:
        origin_regex = (
            settings.allowed_origins_regex.strip() if settings.allowed_origins_regex else ""
        )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=origin_regex or None,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_v1_router, prefix="/api/v1", tags=["v1"])

    logger.info(
        "Nanis API config: environment=%s docs_enabled=%s cors_origins_total=%s cors_extra=%s",
        settings.environment,
        settings.is_development,
        len(origins),
        bool(extra_origins),
    )
    if extra_origins:
        logger.info("CORS extra origins: %s", ", ".join(extra_origins))

    return app


app = create_app()
