from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.tables import router as tables_router
from app.config import settings
from app.ws.lobby import router as lobby_ws_router
from app.ws.table import router as table_ws_router

app = FastAPI(
    title="Trump Hearts API",
    description="Real-time multiplayer Hearts card game with a Trump theme.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth")
app.include_router(tables_router, prefix="/tables")
app.include_router(lobby_ws_router)
app.include_router(table_ws_router)


@app.get("/health", tags=["health"])
async def health_check() -> dict:
    return {"status": "ok"}
