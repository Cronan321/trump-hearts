# Implementation Plan: Trump Hearts Game

## Overview

Full-stack implementation of Trump Hearts using a FastAPI (Python) backend with PostgreSQL and a React + TypeScript frontend. Tasks are sequenced so each step builds on the previous, ending with all components wired together.

## Tasks

- [x] 1. Project scaffolding and database setup
  - [x] 1.1 Initialize backend project structure
    - Create FastAPI project with `pyproject.toml` / `requirements.txt` (fastapi, uvicorn, asyncpg, sqlalchemy[asyncio], alembic, passlib, python-jose, pydantic)
    - Set up directory layout: `app/api`, `app/engine`, `app/models`, `app/services`, `app/ws`
    - Configure environment variable loading (`.env` with `DATABASE_URL`, `SECRET_KEY`, `ALGORITHM`)
    - _Requirements: 1, 2, 3_

  - [x] 1.2 Initialize frontend project structure
    - Bootstrap React + TypeScript app (Vite), install dependencies: `react-router-dom`, `zustand`, `socket.io-client` or native WebSocket wrapper, `tailwindcss`
    - Set up directory layout: `src/api`, `src/components`, `src/pages`, `src/store`, `src/hooks`, `src/assets`
    - _Requirements: 16, 17_

  - [x] 1.3 Create PostgreSQL schema and Alembic migrations
    - Write initial migration creating all tables: `users`, `tables`, `table_seats`, `games`, `rounds`, `tricks`, `round_scores`, `game_scores`, `chat_messages`
    - Apply migration and verify schema matches design document
    - _Requirements: 1.3, 3.3, 7, 10_

  - [ ]* 1.4 Write property test for schema integrity
    - **Property 1: Every new user record has coin_balance = 25000**
    - **Validates: Requirements 1.3**

- [x] 2. Authentication — backend
  - [x] 2.1 Implement user registration endpoint `POST /auth/register`
    - Hash password with bcrypt, insert user row, return JWT token
    - Enforce unique username/email constraint; return descriptive error on conflict
    - Reject passwords shorter than 8 characters before DB insert
    - Credit new wallet with exactly 25,000 coins on creation
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 2.2 Implement user login endpoint `POST /auth/login`
    - Accept username or email + password, verify hash, return JWT + coin_balance
    - Return generic failure message on bad credentials (do not reveal which field failed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.3 Implement `GET /auth/me` profile endpoint
    - Require valid JWT (Bearer token); return username, email, coin_balance, game_history_summary
    - _Requirements: 3.1_

  - [ ]* 2.4 Write unit tests for auth endpoints
    - Test registration happy path, duplicate username, duplicate email, short password
    - Test login happy path, wrong password, unknown user (generic error)
    - Test `/auth/me` with valid and expired tokens
    - _Requirements: 1.1–1.5, 2.1–2.3_

- [x] 3. Authentication — frontend
  - [x] 3.1 Build registration and login pages
    - Create `RegisterPage` and `LoginPage` React components with controlled forms
    - Call `POST /auth/register` and `POST /auth/login`; store JWT in `localStorage` / Zustand auth store
    - Display field-level validation errors from API responses
    - _Requirements: 1.1, 1.5, 2.1, 2.3_

  - [x] 3.2 Implement auth guard and session expiry redirect
    - Create `PrivateRoute` wrapper that checks JWT validity; redirect to `/login` on expiry
    - _Requirements: 2.4_

- [ ] 4. Checkpoint — auth layer complete
  - Ensure all auth unit tests pass and manual login/register flow works end-to-end. Ask the user if questions arise.

- [x] 5. Lobby — backend
  - [x] 5.1 Implement `GET /tables` and `POST /tables` REST endpoints
    - `GET /tables` returns all active tables sorted: available seats first, full/in-progress last
    - `POST /tables` validates `name` and `rule_config` (RuleConfig Pydantic model), creates table + seat record for creator
    - _Requirements: 4.2, 4.4, 5.1–5.7_

  - [x] 5.2 Implement `POST /tables/{table_id}/join` endpoint
    - Add player to `table_seats`; reject if table already has 4 players
    - Trigger game start when seat count reaches 4
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 5.3 Implement lobby WebSocket `/ws/lobby`
    - Authenticate connection via JWT query param
    - Broadcast `table_update`, `table_added`, `table_removed` events to all lobby subscribers on any table change
    - _Requirements: 4.3_

  - [ ]* 5.4 Write unit tests for lobby endpoints
    - Test table creation with valid/invalid rule configs
    - Test join: success, table-full rejection, auto-start at 4 players
    - _Requirements: 5.1–5.7, 6.1–6.3_

- [x] 6. Lobby — frontend
  - [x] 6.1 Build `LobbyPage` component
    - Fetch initial table list via `GET /tables`; open `/ws/lobby` WebSocket and apply incremental updates
    - Display table name, player count, rule variant badges; sort available tables first
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 6.2 Build `CreateTableModal` component
    - Form with table name input and toggles for all rule variants (passing direction, jack of diamonds, shoot the moon, breaking hearts, first trick points)
    - Submit to `POST /tables` and navigate creator to waiting room
    - _Requirements: 5.1–5.7_

  - [x] 6.3 Implement join flow
    - "Join" button on each table card calls `POST /tables/{id}/join`; navigate to waiting room on success; show error toast on full table
    - _Requirements: 6.1, 6.2_

- [ ] 7. Checkpoint — lobby layer complete
  - Ensure lobby real-time updates work and table creation/join flows are functional. Ask the user if questions arise.

- [x] 8. Game Engine — core Hearts logic (backend)
  - [x] 8.1 Implement `Card`, `RuleConfig`, `PlayerState`, `TrickState`, `GameState` Pydantic models
    - Define all models exactly as specified in the design document
    - _Requirements: 7.1, 8_

  - [x] 8.2 Implement deck shuffle and deal
    - `deal_round`: generate 52-card deck, shuffle with `secrets.SystemRandom`, deal 13 cards to each of 4 players
    - Guarantee no duplicate cards per deal
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 8.3 Write property test for deck dealing
    - **Property 2: Every deal produces exactly 52 unique cards distributed 13 per player**
    - **Validates: Requirements 7.2, 7.3**

  - [x] 8.4 Implement card passing phase
    - `submit_pass`: collect 3-card selections from each player; when all 4 submitted, exchange cards in configured direction simultaneously
    - Skip passing phase when `passing_direction == "keep"`
    - _Requirements: 7.4, 7.5_

  - [ ]* 8.5 Write property test for card passing
    - **Property 3: After passing, total cards per player remains 13 and no card is duplicated across hands**
    - **Validates: Requirements 7.4, 7.5**

  - [x] 8.6 Implement `get_legal_plays`
    - Enforce: 2♣ leads first trick; must follow suit if able; hearts lead restriction (breaking_hearts variant); first trick points restriction
    - _Requirements: 8.1, 8.2, 8.3, 9.2, 9.3_

  - [ ]* 8.7 Write property test for legal plays
    - **Property 4: A player who holds cards of the led suit must always have at least one legal play**
    - **Validates: Requirements 8.2, 8.3**

  - [x] 8.8 Implement `play_card` and trick resolution
    - Validate card is in player's hand and is a legal play; add to current trick
    - When 4 cards played: determine winner (highest card of led suit), award trick, update `round_score`
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 8.9 Write unit tests for trick resolution
    - Test winner determination with same-suit cards, off-suit discards, ace-high scenarios
    - _Requirements: 8.4_

  - [x] 8.10 Implement scoring: Hearts, Queen of Spades, Jack of Diamonds
    - Assign 1 point per Heart, 13 for Q♠, -10 for J♦ (when variant enabled)
    - _Requirements: 8.5, 9.1_

  - [ ]* 8.11 Write property test for round scoring
    - **Property 5: Sum of all players' round scores equals 26 (or 16 when Jack of Diamonds variant is active and J♦ was played)**
    - **Validates: Requirements 8.5, 9.1**

  - [x] 8.12 Implement Shoot the Moon detection and application
    - `check_shoot_the_moon`: detect when one player took all 13 hearts + Q♠
    - Apply "add_to_others" (+26 to each other player) or "subtract_from_self" (-26 to shooter) per rule config
    - _Requirements: 9.4, 9.5, 9.6_

  - [ ]* 8.13 Write unit tests for Shoot the Moon
    - Test both variant modes; test partial moon (should not trigger)
    - _Requirements: 9.4, 9.5, 9.6_

  - [x] 8.14 Implement `apply_round_scores` and cumulative score accumulation
    - Persist `round_scores` and update `game_scores` after each round
    - _Requirements: 10.1_

  - [x] 8.15 Implement `check_game_over` and winner determination
    - End game when any player's cumulative score ≥ 100; declare lowest scorer(s) as winner(s); handle ties
    - _Requirements: 10.2, 10.3, 10.4_

  - [ ]* 8.16 Write property test for game-over condition
    - **Property 6: The game ends if and only if at least one player's cumulative score is ≥ 100 after a round**
    - **Validates: Requirements 10.2**

- [ ] 9. Checkpoint — game engine logic complete
  - Ensure all engine unit and property tests pass. Ask the user if questions arise.

- [x] 10. Game WebSocket handler (backend)
  - [x] 10.1 Implement table WebSocket `/ws/table/{table_id}`
    - Authenticate via JWT on connect; register connection in table room
    - Route incoming message types: `play_card`, `pass_cards`, `chat_message`, `quick_chat`, `rematch_vote`, `rtc_signal`
    - _Requirements: 12.1_

  - [x] 10.2 Wire game engine events to WebSocket broadcasts
    - On `play_card`: call `GameEngine.play_card`, broadcast `game_state` + `trick_result` to all table connections within 500ms
    - On `pass_cards`: call `GameEngine.submit_pass`; broadcast `game_state` when all passes received
    - Broadcast `round_end`, `game_end`, `turn_change` at appropriate transitions
    - _Requirements: 12.1, 12.2_

  - [x] 10.3 Implement disconnection handling and reconnection restore
    - On disconnect: pause turn timer if active; store disconnected state
    - On reconnect with valid JWT: restore full `game_state` to reconnecting player
    - _Requirements: 12.3, 12.4_

  - [x] 10.4 Implement rematch vote logic
    - Track `rematch_vote` messages per table; broadcast `rematch_status` with ready_count/total
    - When all 4 vote: start new game with same players and rule config
    - If a player leaves before all vote: cancel rematch, broadcast `player_left`, return others to lobby
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 10.5 Update coin balances on game end
    - After `game_end`: compute coin deltas per outcome, update `coin_balance` in `users` table
    - _Requirements: 3.2_

- [x] 11. Chat and quick-chat (backend + frontend)
  - [x] 11.1 Implement chat message handling in WebSocket handler
    - On `chat_message`: validate ≤ 280 chars, persist to `chat_messages`, broadcast to table room within 300ms
    - On `quick_chat`: resolve `message_id` to preset text, treat as typed message
    - Return error to sender if message exceeds 280 characters
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 14.1, 14.2, 14.3_

  - [x] 11.2 Build `ChatBox` React component
    - Display scrollable message list with sender username and timestamp
    - Text input with 280-char limit indicator; submit on Enter or button click
    - _Requirements: 13.1, 13.3_

  - [x] 11.3 Build `QuickChatMenu` React component
    - Render ≥ 8 Trump-themed preset messages as clickable buttons
    - On click: send `quick_chat` WebSocket message; display in chat with same format as typed messages
    - _Requirements: 14.1, 14.2, 14.3_

- [x] 12. Voice chat — WebRTC (frontend + backend signaling)
  - [x] 12.1 Implement WebRTC signaling relay in backend WebSocket handler
    - Forward `rtc_signal` messages (offer/answer/ICE) to the specified `to` player within the table room
    - _Requirements: 15.1_

  - [x] 12.2 Implement `useVoiceChat` React hook
    - Create `RTCPeerConnection` for each peer; handle offer/answer/ICE via table WebSocket
    - Request microphone permission; show notification if denied
    - _Requirements: 15.1, 15.5_

  - [x] 12.3 Build push-to-talk UI control
    - On-screen PTT button: `mousedown`/`touchstart` unmutes mic track; `mouseup`/`touchend` mutes
    - Configurable keyboard hotkey (default Space): `keydown` unmutes, `keyup` mutes
    - _Requirements: 15.2, 15.3, 15.4_

- [ ] 13. Checkpoint — real-time communication complete
  - Ensure WebSocket game events, chat, and PTT voice work end-to-end. Ask the user if questions arise.

- [x] 14. Game table UI — card rendering and play flow (frontend)
  - [x] 14.1 Build `GameTable` page layout
    - Render 4 player areas (top, left, right, bottom for local player), central trick area, and sidebar for chat
    - Responsive layout: all areas visible without horizontal scroll from 375px to 2560px
    - _Requirements: 17.1, 17.2_

  - [x] 14.2 Build `CardComponent` with Trump-themed artwork
    - Render card face using Trump-themed SVG/image assets; render card back
    - Scale touch targets to minimum 44×44 CSS pixels on mobile
    - _Requirements: 16.2, 17.3_

  - [x] 14.3 Implement hand display and card selection
    - Show local player's hand; highlight legal plays; dim illegal cards
    - On card click/tap: send `play_card` WebSocket message
    - During passing phase: allow selection of exactly 3 cards; send `pass_cards` on confirm
    - _Requirements: 7.4, 8.2, 8.3_

  - [x] 14.4 Implement trick area and trick result animation
    - Display cards played in current trick in center area
    - Show trick winner briefly before clearing for next trick
    - _Requirements: 8.6, 12.2_

  - [x] 14.5 Build `ScoreBoard` component (mid-game and end-game)
    - Mid-game: show all players' cumulative and round scores
    - End-game: final scoreboard with winner highlight and Rematch button
    - Display rematch ready count (e.g., "2/4 ready")
    - _Requirements: 10.5, 11.1, 11.3_

- [x] 15. Player HUD Widget (frontend)
  - [x] 15.1 Build `HUDWidget` component
    - Render in top-left corner: player avatar/picture, username, cumulative game score, current round score
    - Use semi-transparent background; ensure it does not overlap interactive game elements
    - Update scores within 500ms of receiving `trick_result` or `round_end` WebSocket events
    - Remain visible and legible from 375px to 2560px
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [x] 15.2 Build `HistoryPanel` (peekaboo) component
    - Clicking/tapping `HUDWidget` toggles `HistoryPanel` open/closed as an overlay or slide-out panel
    - Display scrollable list of all tricks grouped by round: 4 cards played + trick winner per trick
    - Update in real time as new tricks complete while panel is open
    - Show "No history available" message when no tricks have been played
    - Closing panel returns to normal game view without altering game state
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_

  - [ ]* 15.3 Write unit tests for HUDWidget and HistoryPanel
    - Test score update timing on trick_result event
    - Test toggle open/close behavior
    - Test empty state message
    - _Requirements: 18.4, 19.1, 19.6_

- [x] 16. Trump theme and UI aesthetics
  - [x] 16.1 Apply global Trump theme styles
    - Implement gold-trimmed black marble background using CSS/Tailwind custom theme tokens
    - Apply Trump-themed typography and iconography throughout all screens
    - _Requirements: 16.1, 16.4_

  - [x] 16.2 Integrate thematic sound effects
    - Add audio assets for card play, trick win, and game-end events
    - Trigger sounds via `AudioContext` / `<audio>` on corresponding WebSocket events
    - _Requirements: 16.3_

- [x] 17. Legal and informational pages (frontend)
  - [x] 17.1 Create static page components
    - Implement `PrivacyPolicyPage`, `TermsOfUsePage`, `HelpFAQPage`, `AboutPage`, `ContactPage`, `CookiePolicyPage`
    - All pages accessible without authentication (public routes)
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.8_

  - [x] 17.2 Build persistent site footer with legal links
    - Render footer on every screen (lobby, game table, auth pages) with links to all 6 legal/info pages
    - _Requirements: 20.7_

- [x] 18. Waiting room page (frontend)
  - [x] 18.1 Build `WaitingRoomPage` component
    - Show table name, rule config summary, and list of joined players (seats filled / empty)
    - Listen for `player_joined` and `player_left` WebSocket events to update seat list in real time
    - Auto-navigate to `GameTable` when `game_state` event with `phase: "passing"` or `"playing"` is received
    - _Requirements: 6.1, 6.3, 12.1_

- [x] 19. Final integration and wiring
  - [x] 19.1 Wire all frontend routes
    - Configure React Router: `/` → `LobbyPage`, `/table/:id/waiting` → `WaitingRoomPage`, `/table/:id` → `GameTable`, `/login` → `LoginPage`, `/register` → `RegisterPage`, plus all legal page routes
    - Wrap authenticated routes with `PrivateRoute`
    - _Requirements: 2.4, 4.1_

  - [x] 19.2 Wire Zustand stores to WebSocket events
    - `gameStore`: update `GameState` on all server → client game events
    - `chatStore`: append messages on `chat_message` events
    - `lobbyStore`: apply table list mutations on lobby WebSocket events
    - _Requirements: 12.1, 4.3_

  - [x] 19.3 Integrate coin balance display
    - Show coin balance in nav/header on all authenticated screens; refresh from `GET /auth/me` after game end
    - _Requirements: 3.1, 3.2_

  - [ ]* 19.4 Write end-to-end integration tests
    - Simulate full game flow: register → login → create table → 3 bots join → play all tricks → verify scores → rematch
    - _Requirements: 1–12_

- [x] 20. Final checkpoint — all systems integrated
  - Ensure all unit, property, and integration tests pass. Verify responsive layout at 375px and 1440px. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at each major phase boundary
- Property tests validate universal correctness invariants; unit tests cover specific examples and edge cases
- The game engine is server-authoritative — clients never compute game state independently
