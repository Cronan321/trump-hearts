from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import func, select

from app.database import AsyncSessionLocal
from app.models.table import GameTable, TableSeat
from app.schemas.tables import RuleConfig, TableResponse
from app.services.auth import decode_access_token
from app.ws.connection_manager import lobby_manager

router = APIRouter(tags=["lobby-ws"])


async def _get_all_tables() -> list[dict]:
    async with AsyncSessionLocal() as db:
        seat_counts = await db.execute(
            select(TableSeat.table_id, func.count(TableSeat.seat_index).label("cnt"))
            .group_by(TableSeat.table_id)
        )
        counts_map: dict = {str(row.table_id): row.cnt for row in seat_counts}

        result = await db.execute(
            select(GameTable).where(GameTable.status.in_(["waiting", "in_progress"]))
        )
        tables = result.scalars().all()

        def sort_key(t: GameTable) -> int:
            return 0 if counts_map.get(str(t.id), 0) < 4 else 1

        sorted_tables = sorted(tables, key=sort_key)

        return [
            TableResponse(
                table_id=str(t.id),
                name=t.name,
                player_count=counts_map.get(str(t.id), 0),
                max_players=4,
                rule_config=RuleConfig(**t.rule_config),
                status=t.status,
            ).model_dump()
            for t in sorted_tables
        ]


async def broadcast_table_event(event: dict) -> None:
    """Called from REST endpoints to push table events to all lobby clients."""
    await lobby_manager.broadcast(event)


@router.websocket("/ws/lobby")
async def lobby_ws(websocket: WebSocket, token: str | None = None) -> None:
    if token is None or decode_access_token(token) is None:
        await websocket.close(code=1008)
        return

    await lobby_manager.connect(websocket)
    try:
        # Send initial full table list on connect
        tables = await _get_all_tables()
        await websocket.send_json({"type": "table_update", "tables": tables})

        # Keep connection alive, listening for disconnect
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        lobby_manager.disconnect(websocket)
