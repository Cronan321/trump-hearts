from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.table import GameTable, TableSeat
from app.models.user import User
from app.schemas.tables import JoinResponse, RuleConfig, TableCreate, TableResponse
from app.services.auth import get_current_user
from app.ws.lobby import broadcast_table_event

router = APIRouter(tags=["tables"])
bearer_scheme = HTTPBearer()


async def _build_table_response(table: GameTable, player_count: int) -> TableResponse:
    return TableResponse(
        table_id=str(table.id),
        name=table.name,
        player_count=player_count,
        max_players=4,
        rule_config=RuleConfig(**table.rule_config),
        status=table.status,
    )


@router.get("", response_model=list[TableResponse])
async def list_tables(db: AsyncSession = Depends(get_db)) -> list[TableResponse]:
    """Return all active tables sorted: tables with available seats first, full/in-progress last."""
    # Count seats per table
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
        cnt = counts_map.get(str(t.id), 0)
        # Tables with available seats (< 4) come first (0), full/in-progress last (1)
        return 0 if cnt < 4 else 1

    sorted_tables = sorted(tables, key=sort_key)

    return [
        await _build_table_response(t, counts_map.get(str(t.id), 0))
        for t in sorted_tables
    ]


@router.post("", response_model=TableResponse, status_code=status.HTTP_201_CREATED)
async def create_table(
    body: TableCreate,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> TableResponse:
    """Create a new table and add the creator as the first seat."""
    user = await get_current_user(credentials.credentials, db)

    table = GameTable(
        name=body.name,
        creator_id=user.id,
        status="waiting",
        rule_config=body.rule_config.model_dump(),
    )
    db.add(table)
    await db.flush()  # get table.id before creating seat

    seat = TableSeat(
        table_id=table.id,
        player_id=user.id,
        seat_index=0,
    )
    db.add(seat)
    await db.commit()
    await db.refresh(table)

    response = await _build_table_response(table, 1)
    await broadcast_table_event({"type": "table_added", "table": response.model_dump()})
    return response


@router.post("/{table_id}/join", response_model=JoinResponse)
async def join_table(
    table_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> JoinResponse:
    """Join an existing table. Idempotent if already seated."""
    user = await get_current_user(credentials.credentials, db)

    # Fetch the table
    result = await db.execute(select(GameTable).where(GameTable.id == table_id))
    table = result.scalar_one_or_none()

    if table is None or table.status == "finished":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")

    # Fetch existing seats
    seats_result = await db.execute(
        select(TableSeat).where(TableSeat.table_id == table_id)
    )
    seats = seats_result.scalars().all()

    # Check if user is already seated (idempotent)
    for seat in seats:
        if seat.player_id == user.id:
            return JoinResponse(table_id=table_id, seat_index=seat.seat_index)

    # Check if table is full
    if len(seats) >= 4:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Table is full")

    # Find next available seat index
    occupied = {s.seat_index for s in seats}
    next_seat = next(i for i in range(4) if i not in occupied)

    new_seat = TableSeat(
        table_id=table.id,
        player_id=user.id,
        seat_index=next_seat,
    )
    db.add(new_seat)

    # If this is the 4th player, start the game
    game_started = False
    if len(seats) + 1 == 4:
        table.status = "in_progress"
        game_started = True

    await db.commit()

    # If game just started, initialize the engine and broadcast initial game_state
    if game_started:
        # Import here to avoid circular imports at module level
        from app.ws.table import _sanitize_game_state, engine, table_manager  # noqa: PLC0415

        # Fetch all 4 seats ordered by seat_index
        all_seats_result = await db.execute(
            select(TableSeat).where(TableSeat.table_id == table_id).order_by(TableSeat.seat_index)
        )
        all_seats = all_seats_result.scalars().all()

        # Fetch usernames for all players
        users_result = await db.execute(
            select(User).where(User.id.in_([s.player_id for s in all_seats]))
        )
        users_map = {str(u.id): u for u in users_result.scalars().all()}

        players = [
            {
                "player_id": str(s.player_id),
                "username": users_map[str(s.player_id)].username if str(s.player_id) in users_map else str(s.player_id),
                "avatar_url": None,
            }
            for s in all_seats
        ]

        rule_config = RuleConfig(**table.rule_config)
        initial_state = engine.start_game(str(table.id), players, rule_config)
        dealt_state = engine.deal_round(initial_state.game_id)

        # Broadcast initial game_state to all connected players (hands hidden per player)
        player_ids = [str(s.player_id) for s in all_seats]
        for pid in player_ids:
            await table_manager.send_to_player(
                str(table.id),
                pid,
                {"type": "game_state", "state": _sanitize_game_state(dealt_state, pid)},
            )

    # Broadcast updated table state to lobby clients
    new_player_count = len(seats) + 1
    seat_counts_result = await db.execute(
        select(func.count(TableSeat.seat_index)).where(TableSeat.table_id == table_id)
    )
    actual_count = seat_counts_result.scalar_one_or_none() or new_player_count
    table_response = await _build_table_response(table, actual_count)
    await broadcast_table_event({"type": "table_update", "tables": [table_response.model_dump()]})

    return JoinResponse(table_id=table_id, seat_index=next_seat)