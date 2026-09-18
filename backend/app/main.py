from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio

from app.config import get_settings
from app.database import engine, Base
from app.routers import health, entities, metrics, topology, traces

settings = get_settings()

# Socket.IO server (async)
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    namespace="/dashboard",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables if they don't exist (Alembic handles migrations in prod)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title="NorthStar API",
        version="0.1.0",
        docs_url="/docs",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, tags=["health"])
    app.include_router(entities.router)
    app.include_router(metrics.router)
    app.include_router(topology.router)
    app.include_router(traces.router)

    return app


fastapi_app = create_app()

# Mount Socket.IO alongside FastAPI
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)


# --- Socket.IO events ---

@sio.event(namespace="/dashboard")
async def connect(sid, environ, auth):
    await sio.emit("connected", {"status": "ok"}, to=sid, namespace="/dashboard")


@sio.event(namespace="/dashboard")
async def disconnect(sid):
    pass
