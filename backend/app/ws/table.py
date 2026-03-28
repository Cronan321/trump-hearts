"""Table WebSocket handler for Trump Hearts.

Manages real-time game communication for a single table room.

Requirements: 12.1, 12.3, 12.4
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.engine.game_engine import GameEngine
from app.engine.models import Card
from app.models.chat import ChatMessage
from app.models.table import GameTable, TableSeat
from app.models.user import User
from app.services.auth import decode_access_token

router = APIRouter(tags=["table-ws"])

# ---------------------------------------------------------------------------
# Quick-chat preset messages (Trump-themed)
# ---------------------------------------------------------------------------

QUICK_CHAT_PRESETS: dict[int, str] = {
    1: "Wrong! Totally wrong!",
    2: "That's a beautiful card, believe me.",
    3: "Nobody plays Hearts better than me.",
    4: "You're fired!",
    5: "Sad! Very sad play.",
    6: "Make this table great again!",
    7: "That's what I call a deal!",
    8: "Tremendous! Just tremendous.",
}

# ---------------------------------------------------------------------------
# TableConnectionManager
# ---------------------------------------------------------------------------


class TableConnectionManager:
    """Tracks WebSocket connections per table room.

    Internal structure: {table_id: {player_id: WebSocket}}
    """

    def __init__(self) -> None:
        self._rooms: dict[str, dict[str, WebSocket]] = {}

    async def connect(self, table_id: str, player_id: str, websocket: WebSocket) -> None:
        """Accept the WebSocket and register it in the table room."""
        await websocket.accept()
        if table_id not in self._rooms:
            self._rooms[table_id] = {}
        self._rooms[table_id][player_id] = websocket

    def disconnect(self, table_id: str, player_id: str) -> None:
        """Remove a player's connection from the table room."""
        room = self._rooms.get(table_id)
        if room is not None:
            room.pop(player_id, None)
            if not room:
                del self._rooms[table_id]

    async def broadcast_to_table(self, table_id: str, message: dict) -> None:
        """Send a JSON message to all connections in a table room."""
        room = self._rooms.get(table_id, {})
        dead: list[str] = []
        for pid, ws in list(room.items()):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(pid)
        for pid in dead:
            room.pop(pid, None)

    async def send_to_player(self, table_id: str, player_id: str, message: dict) -> None:
        """Send a JSON message to a specific player in a table room."""
        room = self._rooms.get(table_id, {})
        ws = room.get(player_id)
        if ws is not None:
            try:
                await ws.send_json(message)
            except Exception:
                room.pop(player_id, None)


# Singleton instances
table_manager = TableConnectionManager()
engine = GameEngine()

# ---------------------------------------------------------------------------
# Disconnection tracking (in-memory)
# ---------------------------------------------------------------------------

# table_id → set of player_ids that are currently disconnected
_disconnected_players: dict[str, set[str]] = {}

# ---------------------------------------------------------------------------
# Turn timer tracking (in-memory)
# ---------------------------------------------------------------------------

TURN_TIMER_SECONDS = 30

# game_id → asyncio.Task for the active turn timer
_turn_timers: dict[str, asyncio.Task] = {}


async def _run_turn_timer(game_id: str, table_id: str, player_id: str) -> None:
    """Sleep for TURN_TIMER_SECONDS then auto-play or skip the player's turn."""
    try:
        await asyncio.sleep(TURN_TIMER_SECONDS)
        # Timer expired — broadcast a timeout notification (game logic can be extended here)
        await table_manager.broadcast_to_table(
            table_id,
            {"type": "turn_timeout", "player_id": player_id},
        )
    except asyncio.CancelledError:
        pass  # Timer was cancelled (player reconnected or turn changed)
    finally:
        _turn_timers.pop(game_id, None)


def _start_turn_timer(game_id: str, table_id: str, player_id: str) -> None:
    """Start (or restart) the turn timer for the given player."""
    _cancel_turn_timer(game_id)
    task = asyncio.create_task(_run_turn_timer(game_id, table_id, player_id))
    _turn_timers[game_id] = task


def _cancel_turn_timer(game_id: str) -> None:
    """Cancel the active turn timer for a game, if any."""
    task = _turn_timers.pop(game_id, None)
    if task is not None and not task.done():
        task.cancel()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _sanitize_game_state(state, for_player_id: str) -> dict:
    """Return a game state dict with hands hidden for other players."""
    data = state.model_dump()
    for player in data["players"]:
        if player["player_id"] != for_player_id:
            player["hand"] = []
    return data


async def _get_seat(db: AsyncSession, table_id: str, player_id: str) -> TableSeat | None:
    result = await db.execute(
        select(TableSeat).where(
            TableSeat.table_id == uuid.UUID(table_id),
            TableSeat.player_id == uuid.UUID(player_id),
        )
    )
    return result.scalar_one_or_none()


async def _get_username(db: AsyncSession, player_id: str) -> str:
    result = await db.execute(select(User).where(User.id == uuid.UUID(player_id)))
    user = result.scalar_one_or_none()
    return user.username if user else player_id


# ---------------------------------------------------------------------------
# Rematch vote tracking (in-memory, keyed by table_id)
# ---------------------------------------------------------------------------

_rematch_votes: dict[str, set[str]] = {}

# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------


@router.websocket("/ws/table/{table_id}")
async def table_ws(websocket: WebSocket, table_id: str, token: str | None = None) -> None:
    # 1. Authenticate via JWT query param
    if token is None:
        await websocket.close(code=1008)
        return

    payload = decode_access_token(token)
    if payload is None:
        await websocket.close(code=1008)
        return

    player_id: str | None = payload.get("sub")
    if player_id is None:
        await websocket.close(code=1008)
        return

    # 2. Look up the player's seat in table_seats
    async with AsyncSessionLocal() as db:
        seat = await _get_seat(db, table_id, player_id)
        if seat is None:
            await websocket.close(code=1008)
            return
        username = await _get_username(db, player_id)

    # 3. Register connection in the table room
    await table_manager.connect(table_id, player_id, websocket)

    # Handle reconnection: remove from disconnected set if present
    is_reconnect = player_id in _disconnected_players.get(table_id, set())
    if is_reconnect:
        _disconnected_players[table_id].discard(player_id)
        if not _disconnected_players[table_id]:
            del _disconnected_players[table_id]

    # Broadcast player_joined to the rest of the table
    await table_manager.broadcast_to_table(
        table_id,
        {"type": "player_joined", "player": {"player_id": player_id, "username": username}},
    )

    # 4. Send initial game_state to the connecting player (if game is active)
    # This handles both first-time joins and reconnections (Req 12.3)
    try:
        game_state = engine._states.get(_find_game_id_for_table(table_id))
        if game_state is not None:
            await websocket.send_json(
                {
                    "type": "game_state",
                    "state": _sanitize_game_state(game_state, player_id),
                }
            )

            # On reconnect: if it's this player's turn, restart the turn timer (Req 12.4)
            if is_reconnect:
                game_id = _find_game_id_for_table(table_id)
                if game_id is not None and game_state.current_trick is not None:
                    current_pid = game_state.current_trick.current_player_id
                    if current_pid == player_id:
                        _start_turn_timer(game_id, table_id, player_id)
    except Exception:
        pass

    # 5. Message loop
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "play_card":
                await _handle_play_card(table_id, player_id, data)

            elif msg_type == "pass_cards":
                await _handle_pass_cards(table_id, player_id, data)

            elif msg_type == "chat_message":
                await _handle_chat_message(table_id, player_id, username, data)

            elif msg_type == "quick_chat":
                await _handle_quick_chat(table_id, player_id, username, data)

            elif msg_type == "rematch_vote":
                await _handle_rematch_vote(table_id, player_id)

            elif msg_type == "rtc_signal":
                await _handle_rtc_signal(table_id, player_id, data)

            else:
                await websocket.send_json(
                    {"type": "error", "code": "unknown_message_type", "message": f"Unknown type: {msg_type}"}
                )

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        table_manager.disconnect(table_id, player_id)

        # Track the disconnected player (Req 12.3)
        if table_id not in _disconnected_players:
            _disconnected_players[table_id] = set()
        _disconnected_players[table_id].add(player_id)

        # Pause turn timer if it's this player's turn (Req 12.4)
        game_id = _find_game_id_for_table(table_id)
        if game_id is not None:
            game_state = engine._states.get(game_id)
            if game_state is not None and game_state.current_trick is not None:
                if game_state.current_trick.current_player_id == player_id:
                    _cancel_turn_timer(game_id)

        # If there are pending rematch votes, cancel the rematch
        if _rematch_votes.get(table_id):
            _rematch_votes[table_id] = set()
            await table_manager.broadcast_to_table(
                table_id,
                {"type": "rematch_cancelled", "reason": "player_left"},
            )

        await table_manager.broadcast_to_table(
            table_id,
            {"type": "player_left", "player_id": player_id},
        )


# ---------------------------------------------------------------------------
# Message handlers
# ---------------------------------------------------------------------------


def _find_game_id_for_table(table_id: str) -> str | None:
    """Find the active game_id for a given table_id from the engine's state store."""
    for game_id, state in engine._states.items():
        if state.table_id == table_id:
            return game_id
    return None


async def _update_coin_balances(
    table_id: str, final_scores: dict[str, int], winners: list[str]
) -> None:
    """Update each player's coin_balance after a game ends.

    Winners receive +500 coins; non-winners lose 100 coins (minimum 0).

    Requirements: 3.2
    """
    try:
        async with AsyncSessionLocal() as db:
            for player_id_str, _ in final_scores.items():
                delta = 500 if player_id_str in winners else -100
                # Use MAX(0, coin_balance + delta) to clamp at zero
                result = await db.execute(
                    select(User).where(User.id == uuid.UUID(player_id_str))
                )
                user = result.scalar_one_or_none()
                if user is not None:
                    user.coin_balance = max(0, user.coin_balance + delta)
            await db.commit()
    except Exception:
        pass  # Never crash the game on DB errors


async def _handle_play_card(table_id: str, player_id: str, data: dict) -> None:
    game_id = _find_game_id_for_table(table_id)
    if game_id is None:
        await table_manager.send_to_player(
            table_id, player_id, {"type": "error", "code": "no_active_game", "message": "No active game"}
        )
        return

    try:
        card_data = data.get("card", {})
        card = Card(suit=card_data["suit"], rank=card_data["rank"])
        result = engine.play_card(game_id, player_id, card)
    except Exception as exc:
        await table_manager.send_to_player(
            table_id, player_id, {"type": "error", "code": "play_card_error", "message": str(exc)}
        )
        return

    # Broadcast updated game_state (with hands hidden per player)
    for p in result.game_state.players:
        await table_manager.send_to_player(
            table_id,
            p.player_id,
            {"type": "game_state", "state": _sanitize_game_state(result.game_state, p.player_id)},
        )

    if result.trick_complete:
        # Cancel the current turn timer since the trick is done
        _cancel_turn_timer(game_id)

        trick_result_msg = {
            "type": "trick_result",
            "trick": {pid: {"suit": c.suit, "rank": c.rank} for pid, c in (result.completed_trick_cards or {}).items()},
            "winner": result.trick_winner_id,
        }
        await table_manager.broadcast_to_table(table_id, trick_result_msg)

        # Check for round end / game end
        if result.game_state.phase == "round_end":
            round_scores = engine.apply_round_scores(game_id)
            updated_state = engine._states.get(game_id)

            shoot_the_moon = engine._check_shoot_the_moon_internal(game_id) is not None

            await table_manager.broadcast_to_table(
                table_id,
                {
                    "type": "round_end",
                    "scores": round_scores,
                    "shoot_the_moon": shoot_the_moon,
                },
            )

            if updated_state and updated_state.phase == "game_end":
                final_scores = {p.player_id: p.cumulative_score for p in updated_state.players}
                winners = updated_state.winners or []
                await table_manager.broadcast_to_table(
                    table_id,
                    {
                        "type": "game_end",
                        "final_scores": final_scores,
                        "winners": winners,
                    },
                )
                await _update_coin_balances(table_id, final_scores, winners)
        else:
            # Broadcast turn_change
            if result.game_state.current_trick:
                current_pid = result.game_state.current_trick.current_player_id
                await table_manager.broadcast_to_table(
                    table_id,
                    {"type": "turn_change", "current_player_id": current_pid},
                )
                # Start turn timer for the new current player
                if game_id is not None:
                    _start_turn_timer(game_id, table_id, current_pid)

async def _handle_pass_cards(table_id: str, player_id: str, data: dict) -> None:
    game_id = _find_game_id_for_table(table_id)
    if game_id is None:
        await table_manager.send_to_player(
            table_id, player_id, {"type": "error", "code": "no_active_game", "message": "No active game"}
        )
        return

    try:
        cards_data = data.get("cards", [])
        cards = [Card(suit=c["suit"], rank=c["rank"]) for c in cards_data]
        new_state = engine.submit_pass(game_id, player_id, cards)
    except Exception as exc:
        await table_manager.send_to_player(
            table_id, player_id, {"type": "error", "code": "pass_cards_error", "message": str(exc)}
        )
        return

    # Broadcast updated game_state (hands hidden per player)
    for p in new_state.players:
        await table_manager.send_to_player(
            table_id,
            p.player_id,
            {"type": "game_state", "state": _sanitize_game_state(new_state, p.player_id)},
        )


async def _handle_chat_message(
    table_id: str, player_id: str, username: str, data: dict
) -> None:
    text: str = data.get("text", "")
    if len(text) > 280:
        await table_manager.send_to_player(
            table_id,
            player_id,
            {"type": "error", "code": "message_too_long", "message": "Message must be ≤280 characters"},
        )
        return

    timestamp = datetime.now(tz=timezone.utc).isoformat()

    # Persist to DB
    try:
        async with AsyncSessionLocal() as db:
            msg = ChatMessage(
                table_id=uuid.UUID(table_id),
                sender_id=uuid.UUID(player_id),
                message_text=text,
                is_preset=False,
            )
            db.add(msg)
            await db.commit()
    except Exception:
        pass

    await table_manager.broadcast_to_table(
        table_id,
        {"type": "chat_message", "sender": username, "text": text, "timestamp": timestamp},
    )


async def _handle_quick_chat(
    table_id: str, player_id: str, username: str, data: dict
) -> None:
    message_id = data.get("message_id")
    text = QUICK_CHAT_PRESETS.get(message_id)
    if text is None:
        await table_manager.send_to_player(
            table_id,
            player_id,
            {"type": "error", "code": "invalid_quick_chat", "message": f"Unknown quick_chat id: {message_id}"},
        )
        return

    timestamp = datetime.now(tz=timezone.utc).isoformat()

    # Persist to DB
    try:
        async with AsyncSessionLocal() as db:
            msg = ChatMessage(
                table_id=uuid.UUID(table_id),
                sender_id=uuid.UUID(player_id),
                message_text=text,
                is_preset=True,
            )
            db.add(msg)
            await db.commit()
    except Exception:
        pass

    await table_manager.broadcast_to_table(
        table_id,
        {"type": "chat_message", "sender": username, "text": text, "timestamp": timestamp},
    )


async def _handle_rematch_vote(table_id: str, player_id: str) -> None:
    if table_id not in _rematch_votes:
        _rematch_votes[table_id] = set()
    _rematch_votes[table_id].add(player_id)

    ready_count = len(_rematch_votes[table_id])
    total = 4  # Always 4 players at a table

    await table_manager.broadcast_to_table(
        table_id,
        {"type": "rematch_status", "ready_count": ready_count, "total": total},
    )

    if ready_count == 4:
        # All 4 players voted — start a new game
        _rematch_votes[table_id] = set()

        # Find the current game and retrieve players + rule config
        game_id = _find_game_id_for_table(table_id)
        if game_id is None:
            return

        old_state = engine._states.get(game_id)
        rule_config = engine._configs.get(game_id)
        if old_state is None or rule_config is None:
            return

        players = [
            {
                "player_id": p.player_id,
                "username": p.username,
                "avatar_url": p.avatar_url,
            }
            for p in old_state.players
        ]

        # Start a fresh game with the same players and rule config
        new_state = engine.start_game(table_id, players, rule_config)
        new_state = engine.deal_round(new_state.game_id)

        # Broadcast rematch_started first
        await table_manager.broadcast_to_table(
            table_id,
            {"type": "rematch_started"},
        )

        # Send each player their personalised game_state (hands hidden for others)
        for p in new_state.players:
            await table_manager.send_to_player(
                table_id,
                p.player_id,
                {"type": "game_state", "state": _sanitize_game_state(new_state, p.player_id)},
            )


async def _handle_rtc_signal(table_id: str, player_id: str, data: dict) -> None:
    to_player = data.get("to")
    signal = data.get("signal")
    if to_player is None or signal is None:
        await table_manager.send_to_player(
            table_id,
            player_id,
            {"type": "error", "code": "invalid_rtc_signal", "message": "Missing 'to' or 'signal' field"},
        )
        return

    await table_manager.send_to_player(
        table_id,
        to_player,
        {"type": "rtc_signal", "from": player_id, "signal": signal},
    )
