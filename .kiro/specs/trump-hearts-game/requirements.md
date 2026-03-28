# Requirements Document

## Introduction

Trump Hearts is a production-ready, real-time multiplayer web game based on the classic Hearts card game. It features a Donald J. Trump theme with custom card artwork, a gold-trimmed black marble aesthetic, an integrated coin/betting system, real-time WebSocket-based game state synchronization, in-game text chat, preset quick-chat messages, and WebRTC push-to-talk voice communication. The system supports user authentication, persistent coin balances, configurable game rules per table, and a lobby/matchmaking system.

## Glossary

- **System**: The Trump Hearts web application as a whole
- **Auth_Service**: The component responsible for user registration, login, and session management
- **Lobby**: The dashboard screen displayed after login showing all active game tables
- **Table**: A single game room hosting up to 4 players with a specific rule configuration
- **Game_Engine**: The server-side component that enforces Hearts card game rules and manages game state
- **Chat_Service**: The WebSocket-based component handling text messages and preset quick-chat
- **Voice_Service**: The WebRTC-based component handling push-to-talk audio between players at a table
- **Coin_Wallet**: The persistent record of a user's coin balance stored in the database
- **Player**: An authenticated user who has joined a Table
- **Trick**: A single round of card play where each of the 4 players plays one card
- **Round**: A complete sequence of 13 tricks after cards are dealt
- **Game**: A sequence of Rounds that ends when any player's cumulative score reaches or exceeds 100 points
- **Shoot_the_Moon**: A special condition where one player takes all 13 Hearts and the Queen of Spades in a single Round
- **Queen_of_Spades**: The Queen of Spades card, worth 13 penalty points by default
- **Jack_of_Diamonds**: The Jack of Diamonds card, optionally worth -10 points when the rule variant is enabled
- **Passing_Direction**: The direction in which players pass 3 cards before each Round (Left, Right, Across, or Keep)

---

## Requirements

### Requirement 1: User Registration

**User Story:** As a new visitor, I want to create an account, so that I can access the game and receive my starting coins.

#### Acceptance Criteria

1. THE Auth_Service SHALL provide a registration endpoint that accepts a unique username, a valid email address, and a password of at least 8 characters.
2. WHEN a user submits a registration form with valid credentials, THE Auth_Service SHALL create a new user account and return a session token.
3. WHEN a new user account is successfully created, THE Coin_Wallet SHALL be credited with exactly 25,000 coins.
4. IF a registration request is submitted with a username or email that already exists in the database, THEN THE Auth_Service SHALL return a descriptive error message identifying the conflicting field.
5. IF a registration request is submitted with a password shorter than 8 characters, THEN THE Auth_Service SHALL return a validation error before creating the account.

---

### Requirement 2: User Login

**User Story:** As a registered user, I want to log in to my account, so that I can access the lobby and my coin balance.

#### Acceptance Criteria

1. THE Auth_Service SHALL provide a login endpoint that accepts a username or email and a password.
2. WHEN a user submits valid login credentials, THE Auth_Service SHALL return a session token and the user's current coin balance.
3. IF a login request is submitted with credentials that do not match any account, THEN THE Auth_Service SHALL return a generic authentication failure message without specifying which field is incorrect.
4. WHEN a session token expires, THE System SHALL redirect the user to the login screen.

---

### Requirement 3: User Profile and Coin Balance

**User Story:** As a logged-in user, I want to view my profile and coin balance, so that I can track my in-game wealth.

#### Acceptance Criteria

1. THE System SHALL provide an endpoint that returns the authenticated user's username, email, coin balance, and game history summary.
2. WHEN a game concludes, THE Coin_Wallet SHALL update each player's coin balance according to the game outcome before the final scoreboard is displayed.
3. THE System SHALL persist coin balances in the database so that balances are retained across sessions.

---

### Requirement 4: Lobby Dashboard

**User Story:** As a logged-in user, I want to see all active game tables in a live lobby, so that I can find and join a game quickly.

#### Acceptance Criteria

1. WHEN a user successfully authenticates, THE System SHALL display the Lobby dashboard.
2. THE Lobby SHALL display a list of all active Tables, showing each table's name, current player count, maximum player count (4), and configured rule variants.
3. WHILE the Lobby is displayed, THE System SHALL update the table list in real time via WebSocket so that changes are reflected without a page refresh.
4. THE Lobby SHALL sort Tables so that Tables with available seats (player count less than 4) appear before Tables that are full.
5. WHEN a Table reaches 4 players and a game is in progress, THE Lobby SHALL move that Table to the bottom of the list or hide it from the available-to-join section.

---

### Requirement 5: Table Creation

**User Story:** As a logged-in user, I want to create a new game table with custom rules, so that I can play with my preferred rule variants.

#### Acceptance Criteria

1. WHEN a user selects "Create New Table," THE System SHALL present a configuration screen with toggles for all supported rule variants before creating the Table.
2. THE System SHALL support a Passing_Direction rule variant with the options: Left, Right, Across, and Keep (no passing).
3. THE System SHALL support a Jack_of_Diamonds rule variant toggle that, when enabled, makes the Jack of Diamonds worth -10 points.
4. THE System SHALL support a Shoot_the_Moon rule variant with two options: add 26 points to all other players, or subtract 26 points from the shooting player's score.
5. THE System SHALL support a Breaking_Hearts rule variant toggle that, when disabled, prevents a player from leading with a Heart until Hearts have been broken in the current Round.
6. THE System SHALL support a First_Trick_Points rule variant toggle that, when disabled, prevents point-value cards from being played on the first Trick of a Round.
7. WHEN a user confirms the table configuration, THE System SHALL create the Table, add the creator as the first Player, and display the Table in the Lobby.

---

### Requirement 6: Table Joining

**User Story:** As a lobby user, I want to join an existing table, so that I can play with other players.

#### Acceptance Criteria

1. WHEN a user selects a Table with fewer than 4 players, THE System SHALL add the user as a Player at that Table and navigate them to the game waiting room.
2. IF a user attempts to join a Table that already has 4 players, THEN THE System SHALL display an error and keep the user in the Lobby.
3. WHEN a Table reaches exactly 4 players, THE Game_Engine SHALL automatically start the game.

---

### Requirement 7: Card Deck and Dealing

**User Story:** As a player, I want cards to be dealt fairly and randomly, so that each game starts with an unpredictable hand.

#### Acceptance Criteria

1. THE Game_Engine SHALL use a standard 52-card deck with 4 suits (Spades, Hearts, Diamonds, Clubs) and 13 ranks (2 through Ace).
2. WHEN a new Round begins, THE Game_Engine SHALL shuffle the deck using a cryptographically random algorithm and deal exactly 13 cards to each of the 4 Players.
3. THE Game_Engine SHALL ensure no card is dealt to more than one Player in the same Round.
4. WHEN the Passing_Direction rule is not set to Keep, THE Game_Engine SHALL prompt each Player to select exactly 3 cards to pass before play begins.
5. WHEN all Players have selected their pass cards, THE Game_Engine SHALL simultaneously exchange the selected cards in the configured Passing_Direction before revealing hands.

---

### Requirement 8: Core Hearts Game Rules

**User Story:** As a player, I want the game to enforce standard Hearts rules, so that the game is fair and consistent.

#### Acceptance Criteria

1. THE Game_Engine SHALL require the Player holding the 2 of Clubs to lead the first Trick of each Round.
2. WHEN a Trick is led, THE Game_Engine SHALL require each subsequent Player to play a card of the led suit if they hold one.
3. IF a Player has no cards of the led suit, THEN THE Game_Engine SHALL allow that Player to play any card from their hand.
4. WHEN all 4 Players have played a card in a Trick, THE Game_Engine SHALL award the Trick to the Player who played the highest card of the led suit.
5. THE Game_Engine SHALL assign 1 penalty point per Heart card and 13 penalty points for the Queen of Spades.
6. WHEN a Trick is completed, THE Game_Engine SHALL update each Player's running point total for the current Round and display the result before the next Trick begins.

---

### Requirement 9: Rule Variant Enforcement

**User Story:** As a player, I want the configured rule variants to be enforced during play, so that the game matches the table's settings.

#### Acceptance Criteria

1. WHERE the Jack_of_Diamonds variant is enabled, THE Game_Engine SHALL subtract 10 points from the Trick winner's Round score when the Jack of Diamonds is in the Trick.
2. WHERE the Breaking_Hearts variant is enabled, THE Game_Engine SHALL prevent a Player from leading a Heart until at least one Heart has been played on a previous Trick in the current Round.
3. WHERE the First_Trick_Points variant is disabled, THE Game_Engine SHALL reject any attempt to play a Heart or the Queen of Spades on the first Trick of a Round.
4. WHEN a Player takes all 13 Hearts and the Queen of Spades in a single Round, THE Game_Engine SHALL apply the Shoot_the_Moon outcome configured for the Table.
5. WHERE the Shoot_the_Moon variant is set to "add to others," THE Game_Engine SHALL add 26 points to each other Player's cumulative score when Shoot_the_Moon occurs.
6. WHERE the Shoot_the_Moon variant is set to "subtract from self," THE Game_Engine SHALL subtract 26 points from the shooting Player's cumulative score when Shoot_the_Moon occurs.

---

### Requirement 10: Game Progression and Win Condition

**User Story:** As a player, I want the game to track scores across rounds and declare a winner correctly, so that the game has a clear and fair conclusion.

#### Acceptance Criteria

1. THE Game_Engine SHALL accumulate each Player's Round scores into a cumulative game score after each Round completes.
2. WHEN any Player's cumulative score reaches or exceeds 100 points after a Round, THE Game_Engine SHALL immediately end the Game.
3. WHEN the Game ends, THE Game_Engine SHALL declare the Player with the lowest cumulative score as the winner.
4. IF two or more Players are tied for the lowest cumulative score when the Game ends, THEN THE Game_Engine SHALL declare all tied Players as co-winners.
5. WHEN the Game ends, THE System SHALL display a final scoreboard showing each Player's name and cumulative score before presenting post-game options.

---

### Requirement 11: Rematch

**User Story:** As a player, I want to request a rematch after a game ends, so that I can play again with the same group without returning to the lobby.

#### Acceptance Criteria

1. WHEN the final scoreboard is displayed, THE System SHALL present a "Rematch" button to each Player.
2. WHEN all 4 Players at the Table click the Rematch button, THE Game_Engine SHALL start a new Game with the same Players and the same rule configuration.
3. WHILE waiting for all Players to confirm a Rematch, THE System SHALL display how many Players have accepted out of the total (e.g., "2/4 ready").
4. IF a Player leaves the Table before all Players confirm a Rematch, THEN THE System SHALL cancel the Rematch and return remaining Players to the Lobby.

---

### Requirement 12: Real-Time Game State Synchronization

**User Story:** As a player, I want the game state to update instantly for all players, so that the game feels seamless and fair.

#### Acceptance Criteria

1. THE System SHALL use WebSocket connections to synchronize game state events (card plays, trick results, score updates, turn changes) to all Players at a Table in real time.
2. WHEN a Player plays a card, THE Game_Engine SHALL broadcast the updated game state to all Players at the Table within 500 milliseconds.
3. IF a Player's WebSocket connection is interrupted, THEN THE System SHALL attempt to reconnect the Player and restore their current game state upon reconnection.
4. WHILE a Player is disconnected, THE System SHALL pause that Player's turn timer if a turn timer is active.

---

### Requirement 13: Text Chat

**User Story:** As a player, I want to send text messages to other players at my table, so that I can communicate during the game.

#### Acceptance Criteria

1. THE Chat_Service SHALL provide a chat box visible to all Players at the same Table during a game.
2. WHEN a Player submits a text message, THE Chat_Service SHALL broadcast the message to all Players at the Table within 300 milliseconds.
3. THE Chat_Service SHALL display each message with the sender's username and a timestamp.
4. THE Chat_Service SHALL reject messages exceeding 280 characters and notify the sender.

---

### Requirement 14: Preset Quick-Chat Messages

**User Story:** As a player, I want to send thematic preset messages with one click, so that I can communicate quickly without typing.

#### Acceptance Criteria

1. THE Chat_Service SHALL provide a quick-chat menu containing at least 8 thematic preset messages styled to the Trump theme.
2. WHEN a Player selects a preset message, THE Chat_Service SHALL send it to the Table chat as if the Player had typed it, within 300 milliseconds.
3. THE System SHALL display preset messages in the chat with the same username and timestamp format as typed messages.

---

### Requirement 15: Voice Chat (Push-to-Talk)

**User Story:** As a player, I want to speak to other players using push-to-talk, so that I can communicate verbally without background noise.

#### Acceptance Criteria

1. THE Voice_Service SHALL use WebRTC to establish peer audio connections between all Players at the same Table.
2. THE System SHALL provide an on-screen push-to-talk button that activates the Player's microphone only while the button is held down.
3. THE System SHALL support a configurable keyboard hotkey that activates push-to-talk while held, in addition to the on-screen button.
4. WHEN a Player releases the push-to-talk button or hotkey, THE Voice_Service SHALL immediately mute that Player's microphone transmission.
5. IF a Player's browser does not grant microphone permission, THEN THE System SHALL display a notification explaining that voice chat is unavailable and allow the Player to continue without it.

---

### Requirement 16: Trump Theme and UI Aesthetics

**User Story:** As a player, I want the game to have a consistent Trump-themed visual and audio experience, so that the game feels immersive and entertaining.

#### Acceptance Criteria

1. THE System SHALL render the primary game background as a gold-trimmed black marble design.
2. THE System SHALL use a custom card deck where card face designs incorporate Trump-themed artwork and branding.
3. THE System SHALL play thematic sound effects for key game events including card plays, trick wins, and game-end outcomes.
4. THE System SHALL display Trump-themed iconography and typography throughout the UI consistent with the established aesthetic.

---

### Requirement 17: Responsive UI

**User Story:** As a player, I want the game to work on both desktop and mobile browsers, so that I can play from any device.

#### Acceptance Criteria

1. THE System SHALL render all game screens, including the Lobby, game table, chat, and scoreboard, correctly on viewport widths from 375px to 2560px.
2. THE System SHALL adapt the card table layout so that all 4 Players' card areas and the central play area are visible without horizontal scrolling on mobile viewports.
3. THE System SHALL scale touch targets (buttons, cards, quick-chat items) to a minimum of 44x44 CSS pixels on mobile viewports.

---

### Requirement 18: Player HUD Widget

**User Story:** As a player, I want to see my name, total game score, and current round score in a persistent HUD widget, so that I can track my standing at a glance without interrupting gameplay.

#### Acceptance Criteria

1. THE System SHALL render a HUD_Widget in the top-left corner of the game table screen for the local Player.
2. THE HUD_Widget SHALL display the Player's avatar or picture, username, cumulative game score, and current Round score simultaneously.
3. THE HUD_Widget SHALL use a transparent or semi-transparent background so that it does not obscure the game table beneath it.
4. WHEN a Trick is completed and scores are updated, THE HUD_Widget SHALL reflect the updated cumulative game score and current Round score within 500 milliseconds.
5. THE HUD_Widget SHALL remain visible and legible on viewport widths from 375px to 2560px without overlapping interactive game elements.

---

### Requirement 19: Game History Panel (Peekaboo)

**User Story:** As a player, I want to expand a history panel from the HUD widget to review all tricks played so far in the current game, so that I can recall what cards have been played across all rounds.

#### Acceptance Criteria

1. THE HUD_Widget SHALL be interactive so that clicking or tapping it toggles the History_Panel open or closed.
2. WHEN the History_Panel is opened, THE System SHALL display a scrollable list of every Trick played in the current Game, grouped by Round, showing the four cards played and the Trick winner for each Trick.
3. WHILE the History_Panel is open, THE System SHALL continue to update it in real time as new Tricks are completed.
4. WHEN the History_Panel is closed, THE System SHALL return the display to the normal game table view without altering game state.
5. THE System SHALL render the History_Panel as an overlay or slide-out panel that does not navigate away from the game table screen.
6. IF no Tricks have been played yet in the current Game, THEN THE History_Panel SHALL display a message indicating that no history is available.

---

### Requirement 20: Legal and Informational Pages

**User Story:** As a user, I want access to standard legal and informational pages, so that I can understand the terms governing my use of the platform and find help when needed.

#### Acceptance Criteria

1. THE System SHALL provide a Privacy Policy page describing what user data is collected, how it is used, and how it is protected.
2. THE System SHALL provide a Terms of Use page describing the rules and conditions governing use of the platform.
3. THE System SHALL provide a Help/FAQ page containing answers to common questions about gameplay, account management, and coin mechanics.
4. THE System SHALL provide an About page describing the purpose and background of the Trump Hearts platform.
5. THE System SHALL provide a Contact page with a mechanism for users to submit inquiries or support requests.
6. THE System SHALL provide a Cookie Policy page describing the cookies and tracking technologies used by the platform.
7. THE System SHALL include persistent links to all legal and informational pages in the site footer so that they are accessible from every screen.
8. WHEN a user navigates to any legal or informational page, THE System SHALL display the page without requiring authentication.
