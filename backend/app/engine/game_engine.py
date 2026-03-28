"""Game engine for Trump Hearts.

Manages all game state transitions for a Hearts game:
- Starting a game and dealing rounds
- Card passing phase
- Card play and trick resolution
- Scoring and game-over detection

Requirements: 8.2, 8.3, 8.4, 8.5, 8.6
"""

import uuid
from typing import Optional

from pydantic import BaseModel

from app.engine.deck import deal_round as deck_deal_round
from app.engine.models import Card, GameState, PlayerState, RuleConfig, TrickState
from app.engine.passing import PassingPhase, should_pass
from app.engine.rules import RANK_ORDER, _is_point_card, get_legal_plays, trick_winner

# Passing direction cycle: left, right, across, keep, then repeat
_PASS_CYCLE = ["left", "right", "across", "keep"]


class PlayResult(BaseModel):
    game_state: GameState
    trick_complete: bool
    trick_winner_id: Optional[str]
    trick_points: int  # points scored in this trick
    completed_trick_cards: Optional[dict[str, Card]] = None  # cards from the completed trick


def _count_trick_points(cards: dict[str, Card], rule_config: RuleConfig) -> int:
    """Count the penalty (or bonus) points in a completed trick."""
    points = 0
    for card in cards.values():
        if card.suit == "hearts":
            points += 1
        elif card.suit == "spades" and card.rank == "Q":
            points += 13
        if rule_config.jack_of_diamonds and card.suit == "diamonds" and card.rank == "J":
            points -= 10
    return points


class GameEngine:
    """Server-authoritative Hearts game engine.

    Stores game state in-memory keyed by game_id.
    Persistence to the database is handled separately in the WebSocket handler.
    """

    def __init__(self) -> None:
        # game_id -> GameState
        self._states: dict[str, GameState] = {}
        # game_id -> RuleConfig
        self._configs: dict[str, RuleConfig] = {}
        # game_id -> {player_id: seat_index}
        self._seat_map: dict[str, dict[str, int]] = {}
        # game_id -> PassingPhase | None
        self._passing_phases: dict[str, Optional[PassingPhase]] = {}
        # game_id -> list of completed tricks [{player_id: Card, ...}]
        self._round_tricks: dict[str, list[dict[str, Card]]] = {}
        # game_id -> list of trick winner player_ids (one per completed trick)
        self._trick_winners: dict[str, list[str]] = {}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def start_game(
        self, table_id: str, players: list[dict], rule_config: RuleConfig
    ) -> GameState:
        """Initialise a new game and return the initial GameState.

        `players` is a list of dicts with keys: player_id, username, avatar_url.
        Seats are assigned in list order (index 0..3).
        """
        game_id = str(uuid.uuid4())

        player_states = [
            PlayerState(
                player_id=p["player_id"],
                username=p["username"],
                seat_index=i,
                hand=[],
                hand_size=0,
                cumulative_score=0,
                round_score=0,
                avatar_url=p.get("avatar_url"),
            )
            for i, p in enumerate(players)
        ]

        seat_map = {p.player_id: p.seat_index for p in player_states}

        state = GameState(
            game_id=game_id,
            table_id=table_id,
            round_number=0,
            passing_direction=rule_config.passing_direction,
            phase="waiting",
            players=player_states,
            current_trick=None,
            hearts_broken=False,
            winners=None,
        )

        self._states[game_id] = state
        self._configs[game_id] = rule_config
        self._seat_map[game_id] = seat_map
        self._passing_phases[game_id] = None
        self._round_tricks[game_id] = []

        return state

    def deal_round(self, game_id: str) -> GameState:
        """Deal cards for a new round and set up the passing phase if required.

        Increments round_number, deals 13 cards to each player, and transitions
        to "passing" phase (or "playing" if direction is "keep").
        """
        state = self._get_state(game_id)
        rule_config = self._configs[game_id]

        # Determine passing direction for this round using the cycle
        round_number = state.round_number + 1
        if rule_config.passing_direction == "keep":
            direction = "keep"
        else:
            # Cycle through left/right/across/keep based on round number (1-indexed)
            direction = _PASS_CYCLE[(round_number - 1) % len(_PASS_CYCLE)]

        hands = deck_deal_round(num_players=4)

        # Reset per-round state
        self._round_tricks[game_id] = []
        self._trick_winners[game_id] = []

        # Update player hands and reset round scores
        new_players = []
        for player in state.players:
            seat = self._seat_map[game_id][player.player_id]
            new_players.append(
                player.model_copy(
                    update={
                        "hand": hands[seat],
                        "hand_size": len(hands[seat]),
                        "round_score": 0,
                    }
                )
            )

        # Determine first player (holder of 2♣)
        two_of_clubs = Card(suit="clubs", rank="2")
        first_player_id = None
        for p in new_players:
            if two_of_clubs in p.hand:
                first_player_id = p.player_id
                break

        if should_pass(direction):
            # Set up passing phase
            seat_hands = [hands[self._seat_map[game_id][p.player_id]] for p in new_players]
            self._passing_phases[game_id] = PassingPhase(
                hands=seat_hands, direction=direction, num_players=4
            )
            phase = "passing"
            current_trick = None
        else:
            self._passing_phases[game_id] = None
            phase = "playing"
            current_trick = TrickState(
                trick_number=1,
                led_suit=None,
                cards_played={},
                current_player_id=first_player_id,
            )

        new_state = state.model_copy(
            update={
                "round_number": round_number,
                "passing_direction": direction,
                "phase": phase,
                "players": new_players,
                "current_trick": current_trick,
                "hearts_broken": False,
            }
        )
        self._states[game_id] = new_state
        return new_state

    def submit_pass(self, game_id: str, player_id: str, cards: list[Card]) -> GameState:
        """Record a player's 3 pass cards.

        When all 4 players have submitted, applies the exchange and transitions
        to the "playing" phase.
        """
        state = self._get_state(game_id)
        passing_phase = self._passing_phases.get(game_id)

        if passing_phase is None:
            raise ValueError("No passing phase active for this game")

        seat_index = self._seat_map[game_id][player_id]
        all_submitted = passing_phase.submit_pass(seat_index, cards)

        if all_submitted:
            new_hands = passing_phase.apply_passes()

            # Determine first player (holder of 2♣)
            two_of_clubs = Card(suit="clubs", rank="2")
            first_player_id = None

            new_players = []
            for player in state.players:
                seat = self._seat_map[game_id][player.player_id]
                hand = new_hands[seat]
                if two_of_clubs in hand and first_player_id is None:
                    first_player_id = player.player_id
                new_players.append(
                    player.model_copy(
                        update={"hand": hand, "hand_size": len(hand)}
                    )
                )

            current_trick = TrickState(
                trick_number=1,
                led_suit=None,
                cards_played={},
                current_player_id=first_player_id,
            )

            new_state = state.model_copy(
                update={
                    "phase": "playing",
                    "players": new_players,
                    "current_trick": current_trick,
                }
            )
            self._states[game_id] = new_state
            self._passing_phases[game_id] = None
            return new_state

        return state

    def play_card(self, game_id: str, player_id: str, card: Card) -> PlayResult:
        """Play a card for the given player.

        Steps:
        1. Validate it's the player's turn
        2. Validate the card is in the player's hand
        3. Validate the card is a legal play
        4. Remove card from player's hand
        5. Add card to current trick
        6. Update hearts_broken if a Heart was played
        7. If 4 cards played: determine trick winner, update round_score, advance trick
        8. Return PlayResult

        Requirements: 8.2, 8.3, 8.4, 8.5, 8.6
        """
        state = self._get_state(game_id)
        rule_config = self._configs[game_id]

        if state.phase != "playing":
            raise ValueError(f"Cannot play card in phase '{state.phase}'")

        trick = state.current_trick
        if trick is None:
            raise ValueError("No active trick")

        # 1. Validate it's the player's turn
        if trick.current_player_id != player_id:
            raise ValueError(
                f"It is not {player_id}'s turn (current: {trick.current_player_id})"
            )

        # Find the player state
        player_state = self._get_player(state, player_id)

        # 2. Validate the card is in the player's hand
        if card not in player_state.hand:
            raise ValueError(f"Card {card} is not in {player_id}'s hand")

        # 3. Validate the card is a legal play
        is_leading = len(trick.cards_played) == 0
        legal = get_legal_plays(
            hand=player_state.hand,
            led_suit=trick.led_suit,
            trick_number=trick.trick_number,
            hearts_broken=state.hearts_broken,
            is_leading=is_leading,
            rule_config=rule_config,
        )
        if card not in legal:
            raise ValueError(f"Card {card} is not a legal play")

        # 4. Remove card from player's hand
        new_hand = [c for c in player_state.hand if c != card]
        # Handle duplicates: remove only one occurrence
        removed = False
        new_hand = []
        for c in player_state.hand:
            if c == card and not removed:
                removed = True
                continue
            new_hand.append(c)

        # 5. Add card to current trick
        new_cards_played = dict(trick.cards_played)
        new_cards_played[player_id] = card

        # Determine led suit
        new_led_suit = trick.led_suit
        if is_leading:
            new_led_suit = card.suit

        # 6. Update hearts_broken
        new_hearts_broken = state.hearts_broken
        if card.suit == "hearts":
            new_hearts_broken = True

        # Update player states
        new_players = []
        for p in state.players:
            if p.player_id == player_id:
                new_players.append(
                    p.model_copy(update={"hand": new_hand, "hand_size": len(new_hand)})
                )
            else:
                new_players.append(p)

        trick_complete = len(new_cards_played) == 4
        trick_winner_id: Optional[str] = None
        trick_points = 0
        next_trick: Optional[TrickState] = None

        if trick_complete:
            # 7. Determine trick winner
            trick_winner_id = trick_winner(new_cards_played, new_led_suit)
            trick_points = _count_trick_points(new_cards_played, rule_config)

            # Record completed trick for shoot-the-moon detection
            self._round_tricks.setdefault(game_id, []).append(dict(new_cards_played))
            self._trick_winners.setdefault(game_id, []).append(trick_winner_id)

            # Update round_score for winner
            new_players = []
            for p in state.players:
                if p.player_id == player_id:
                    updated = p.model_copy(update={"hand": new_hand, "hand_size": len(new_hand)})
                else:
                    updated = p
                if updated.player_id == trick_winner_id:
                    updated = updated.model_copy(
                        update={"round_score": updated.round_score + trick_points}
                    )
                new_players.append(updated)

            # Check if round is over (all 13 tricks played)
            tricks_played = trick.trick_number
            if tricks_played == 13:
                phase = "round_end"
                next_trick = None
            else:
                phase = "playing"
                next_trick = TrickState(
                    trick_number=trick.trick_number + 1,
                    led_suit=None,
                    cards_played={},
                    current_player_id=trick_winner_id,
                )
        else:
            # Advance to next player in seat order
            next_player_id = self._next_player(state, player_id)
            next_trick = TrickState(
                trick_number=trick.trick_number,
                led_suit=new_led_suit,
                cards_played=new_cards_played,
                current_player_id=next_player_id,
            )
            phase = "playing"

        new_state = state.model_copy(
            update={
                "phase": phase,
                "players": new_players,
                "current_trick": next_trick,
                "hearts_broken": new_hearts_broken,
            }
        )
        self._states[game_id] = new_state

        return PlayResult(
            game_state=new_state,
            trick_complete=trick_complete,
            trick_winner_id=trick_winner_id,
            trick_points=trick_points,
            completed_trick_cards=dict(new_cards_played) if trick_complete else None,
        )

    def get_legal_plays(self, game_id: str, player_id: str) -> list[Card]:
        """Return the list of cards the player is legally allowed to play."""
        state = self._get_state(game_id)
        rule_config = self._configs[game_id]

        trick = state.current_trick
        if trick is None:
            return []

        player_state = self._get_player(state, player_id)
        is_leading = len(trick.cards_played) == 0

        return get_legal_plays(
            hand=player_state.hand,
            led_suit=trick.led_suit,
            trick_number=trick.trick_number,
            hearts_broken=state.hearts_broken,
            is_leading=is_leading,
            rule_config=rule_config,
        )

    def check_shoot_the_moon(self, round_tricks: list[dict]) -> Optional[str]:
        """Return the player_id who shot the moon, or None.

        Shoot the moon: one player took all 13 Hearts and the Queen of Spades.

        `round_tricks` is a list of dicts: each dict maps player_id -> Card for
        the cards played in that trick. The first key in each dict is treated as
        the trick winner (i.e., callers must order the dict with the winner first,
        or use `apply_round_scores` which calls `_check_shoot_the_moon_internal`).

        For internal use with a game_id, `_check_shoot_the_moon_internal` is preferred.
        """
        return None

    def _check_shoot_the_moon_internal(
        self, game_id: str
    ) -> Optional[str]:
        """Internal shoot-the-moon check using stored trick history."""
        trick_winners_list = self._trick_winners.get(game_id, [])
        round_tricks = self._round_tricks.get(game_id, [])

        hearts_per_player: dict[str, int] = {}
        queen_taker: Optional[str] = None

        for i, trick_cards in enumerate(round_tricks):
            if i >= len(trick_winners_list):
                break
            winner = trick_winners_list[i]
            for card in trick_cards.values():
                if card.suit == "hearts":
                    hearts_per_player[winner] = hearts_per_player.get(winner, 0) + 1
                if card.suit == "spades" and card.rank == "Q":
                    queen_taker = winner

        for player_id, count in hearts_per_player.items():
            if count == 13 and queen_taker == player_id:
                return player_id

        return None

    def apply_round_scores(self, game_id: str) -> dict:
        """Apply round scores to cumulative scores and return {player_id: round_score}.

        Checks for shoot-the-moon and adjusts scores accordingly.
        Returns the round scores dict.
        """
        state = self._get_state(game_id)
        rule_config = self._configs[game_id]

        round_scores = {p.player_id: p.round_score for p in state.players}

        # Check shoot the moon
        shooter = self._check_shoot_the_moon_internal(game_id)

        if shooter is not None:
            if rule_config.shoot_the_moon == "add_to_others":
                round_scores = {
                    pid: (0 if pid == shooter else 26)
                    for pid in round_scores
                }
            else:  # subtract_from_self
                round_scores = {pid: 0 for pid in round_scores}
                round_scores[shooter] = -26

        # Apply to cumulative scores
        new_players = []
        for p in state.players:
            delta = round_scores.get(p.player_id, 0)
            new_players.append(
                p.model_copy(
                    update={
                        "cumulative_score": p.cumulative_score + delta,
                        "round_score": round_scores.get(p.player_id, p.round_score),
                    }
                )
            )

        new_state = state.model_copy(update={"players": new_players})
        self._states[game_id] = new_state

        # Check if the game is over after updating scores
        if self.check_game_over(game_id):
            winners = self.get_winners(game_id)
            new_state = new_state.model_copy(
                update={"winners": winners, "phase": "game_end"}
            )
            self._states[game_id] = new_state

        return round_scores

    def check_game_over(self, game_id: str) -> bool:
        """Return True if any player's cumulative score is >= 100."""
        state = self._get_state(game_id)
        return any(p.cumulative_score >= 100 for p in state.players)

    def get_winners(self, game_id: str) -> list[str]:
        """Return a list of player_ids with the lowest cumulative score.

        Handles ties — all players sharing the lowest score are returned.
        Should be called after check_game_over returns True.
        """
        state = self._get_state(game_id)
        min_score = min(p.cumulative_score for p in state.players)
        return [p.player_id for p in state.players if p.cumulative_score == min_score]

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_state(self, game_id: str) -> GameState:
        state = self._states.get(game_id)
        if state is None:
            raise ValueError(f"No game found with id '{game_id}'")
        return state

    def _get_player(self, state: GameState, player_id: str) -> PlayerState:
        for p in state.players:
            if p.player_id == player_id:
                return p
        raise ValueError(f"Player '{player_id}' not found in game '{state.game_id}'")

    def _next_player(self, state: GameState, current_player_id: str) -> str:
        """Return the player_id of the next player in seat order."""
        seat_map = self._seat_map[state.game_id]
        current_seat = seat_map[current_player_id]
        next_seat = (current_seat + 1) % len(state.players)
        for p in state.players:
            if seat_map[p.player_id] == next_seat:
                return p.player_id
        raise ValueError("Could not determine next player")
