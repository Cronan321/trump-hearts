# Design Document: Trump Hearts Game

## Overview

Trump Hearts is a real-time multiplayer web card game built on the classic Hearts card game with a Donald J. Trump theme. The system supports up to 4 players per table, persistent coin wallets, configurable rule variants, in-game text and voice chat, and a rich themed UI.

The architecture follows a client-server model:
- React SPA frontend communicating over REST (auth, profile, lobby) and WebSocket (game state, chat, lobby updates)
- FastAPI backend with async WebSocket support
- PostgreSQL for persistent storage (users, coin balances, game history)
- WebRTC for peer-to-peer voice chat (signaling via the backend WebSocket)

### Key Design Decisions

- **Server-authoritative game engine**: All game state lives on the server. Clients are thin renderers. This prevents cheating and simplifies reconnection.
- **Single WebSocket per table**: Each player maintains one WebSocket connection to their table room. All game events, chat, and lobby updates flow through this channel.
- **WebRTC signaling via WebSocket**: The backend acts as a signaling relay for WebRTC offer/answer/ICE exchange; audio streams are peer-to-peer.
- **Stateless REST for auth**: JWT tokens for session management; WebSocket connections are authenticated via token on connect.

---

## Architecture

```mermaid
graph TB
    subgraph Client ["React SPA"]
        UI[Game UI / Lobby]
        WS_Client[WebSocket Client]
        RTC[WebRTC Audio]
    end

    subgraph Server ["FastAPI Backend"]
        REST[REST API\n/auth /profile /tables]
        WS_Server[WebSocket Manager\n/ws/lobby\n/ws/table/{id}]
        GE[Game Engine]
        CS[Chat Service]
        VS[Voice Signaling]
    end

    subgraph DB ["PostgreSQL"]
        Users[(users)]
        Tables[(tables)]
        Games[(games)]
        Tricks[(tricks)]
        ChatLog[(chat_messages)]
    end

    UI -- HTTP --> REST
    UI -- WS --> WS_Server
    RTC -- P2P Audio --> RTC
    WS_Client -- signaling --> VS
    REST --> DB
    GE --> DB
    CS --> DB
    WS_Server --> GE
    WS_Server --> CS
    WS_Server --> VS
```

### Request Flow

1. User authenticates via REST → receives JWT
2. Frontend connects to `/ws/lobby` with JWT → receives live table list updates
3. User creates/joins table → REST call → backend creates table record
4. Frontend connects to `/ws/table/{table_id}` → game events flow bidirectionally
5. Game engine runs server-side; state changes broadcast to all table connections
6. WebRTC signaling messages (offer/answer/ICE) relayed through the table WebSocket

---

## Components and Interfaces

### Auth Service

REST endpoints:

```
POST /auth/register
  Body: { username, email, password }
  Response: { user_id, username, token }

POST /auth/login
  Body: { credential, password }   # credential = username or email
  Response: { user_id, username, token, coin_balance }

GET /auth/me
  Headers: Authorization: Bearer <token>
  Response: { user_id, username, email, coin_balance, game_history_summary }
```

### Lobby Service

```
GET /tables
  Response: [{ table_id, name, player_count, max_players, rule_config, status }]

POST /tables
  Body: { name, rule_config }
  Response: { table_id, ... }

POST /tables/{table_id}/join
  Response: { table_id, seat_index }

WebSocket /ws/lobby
  Server → Client events:
    { type: "table_update", tables: [...] }
    { type: "table_added", table: {...} }
    { type: "table_removed", table_id }
```

### Game WebSocket Protocol

All messages are JSON with a `type` field.

Client → Server:
```
{ type: "play_card",    card: { suit, rank } }
{ type: "pass_cards",   cards: [{ suit, rank }, ...] }  # exactly 3
{ type: "chat_message", text: "..." }
{ type: "quick_chat",   message_id: 3 }
{ type: "rematch_vote" }
{ type: "rtc_signal",   to: player_id, signal: {...} }  # WebRTC signaling
```

Server → Client:
```
{ type: "game_state",       state: GameState }
{ type: "deal",             hand: [Card], passing_direction }
{ type: "pass_prompt" }
{ type: "trick_result",     trick: Trick, winner: player_id }
{ type: "round_end",        scores: {...}, shoot_the_moon: bool }
{ type: "game_end",         final_scores: {...}, winners: [player_id] }
{ type: "chat_message",     sender, text, timestamp }
{ type: "rematch_status",   ready_count, total }
{ type: "rtc_signal",       from: player_id, signal: {...} }
{ type: "player_joined",    player: {...} }
{ type: "player_left",      player_id }
{ type: "turn_change",      current_player_id }
{ type: "error",            code, message }
```

### Game Engine

The `GameEngine` class is instantiated per table and manages all game state transitions.

```python
class GameEngine:
    def start_game(table_id: str) -> GameState
    def deal_round(game_id: str) -> DealResult
    def submit_pass(game_id: str, player_id: str, cards: list[Card]) -> None
    def play_card(game_id: str, player_id: str, card: Card) -> PlayResult
    def get_legal_plays(game_id: str, player_id: str) -> list[Card]
    def check_shoot_the_moon(trick_history: list[Trick]) -> str | None
    def apply_round_scores(game_id: str) -> RoundScoreResult
    def check_game_over(game_id: str) -> bool
```

### Chat Service

Integrated into the table WebSocket handler. Messages are persisted to `chat_messages` and broadcast to all connections in the table room.

### Voice Service (WebRTC Signaling)

The backend relays WebRTC signaling messages between peers. No audio data passes through the server. The frontend uses the browser's `RTCPeerConnection` API.

---

## Data Models

### PostgreSQL Schema

```sql
-- Users
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username    VARCHAR(32) UNIQUE NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    coin_balance BIGINT NOT NULL DEFAULT 25000,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tables (game rooms)
CREATE TABLE tables (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(64) NOT NULL,
    creator_id  UUID REFERENCES users(id),
    status      VARCHAR(16) NOT NULL DEFAULT 'waiting',  -- waiting|in_progress|finished
    rule_config JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table seats
CREATE TABLE table_seats (
    table_id    UUID REFERENCES tables(id),
    player_id   UUID REFERENCES users(id),
    seat_index  SMALLINT NOT NULL CHECK (seat_index BETWEEN 0 AND 3),
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (table_id, seat_index)
);

-- Games
CREATE TABLE games (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id    UUID REFERENCES tables(id),
    status      VARCHAR(16) NOT NULL DEFAULT 'active',  -- active|finished
    started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at    TIMESTAMPTZ
);

-- Rounds
CREATE TABLE rounds (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id         UUID REFERENCES games(id),
    round_number    SMALLINT NOT NULL,
    passing_direction VARCHAR(8) NOT NULL,  -- left|right|across|keep
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tricks
CREATE TABLE tricks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id    UUID REFERENCES rounds(id),
    trick_number SMALLINT NOT NULL,
    winner_id   UUID REFERENCES users(id),
    cards_played JSONB NOT NULL,  -- [{ player_id, suit, rank }]
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Player scores per round
CREATE TABLE round_scores (
    round_id    UUID REFERENCES rounds(id),
    player_id   UUID REFERENCES users(id),
    points      SMALLINT NOT NULL,
    PRIMARY KEY (round_id, player_id)
);

-- Cumulative game scores
CREATE TABLE game_scores (
    game_id     UUID REFERENCES games(id),
    player_id   UUID REFERENCES users(id),
    cumulative_score SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (game_id, player_id)
);

-- Chat messages
CREATE TABLE chat_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id    UUID REFERENCES tables(id),
    sender_id   UUID REFERENCES users(id),
    message_text VARCHAR(280) NOT NULL,
    is_preset   BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Application-Level Models (Pydantic)

```python
class Card(BaseModel):
    suit: Literal["spades", "hearts", "diamonds", "clubs"]
    rank: Literal["2","3","4","5","6","7","8","9","10","J","Q","K","A"]

class RuleConfig(BaseModel):
    passing_direction: Literal["left", "right", "across", "keep"] = "left"
    jack_of_diamonds: bool = False
    shoot_the_moon: Literal["add_to_others", "subtract_from_self"] = "add_to_others"
    breaking_hearts: bool = True
    first_trick_points: bool = True

class PlayerState(BaseModel):
    player_id: str
    username: str
    seat_index: int
    hand: list[Card]          # only sent to the owning player
    hand_size: int            # sent to all players
    cumulative_score: int
    round_score: int
    avatar_url: str | None

class TrickState(BaseModel):
    trick_number: int
    led_suit: str | None
    cards_played: dict[str, Card]   # player_id -> Card
    current_player_id: str | None

class GameState(BaseModel):
    game_id: str
    table_id: str
    round_number: int
    passing_direction: str
    phase: Literal["waiting", "passing", "playing", "round_end", "game_end"]
    players: list[PlayerState]
    current_trick: TrickState | None
    hearts_broken: bool
    winners: list[str] | None
```

---
