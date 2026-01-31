"""Nanis backend — FastAPI application."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import router as api_v1_router
from app.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown: init Supabase client, etc. when needed."""
    yield
    # Teardown if needed (e.g. close pools)


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

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_v1_router, prefix="/api/v1", tags=["v1"])

    return app


app = create_app()
