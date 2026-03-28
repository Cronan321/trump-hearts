"""Card passing phase logic for Trump Hearts.

Implements Requirements 7.4 and 7.5:
- Prompt each player to select exactly 3 cards to pass (7.4)
- Simultaneously exchange cards in the configured direction (7.5)
"""

from app.engine.models import Card


def should_pass(direction: str) -> bool:
    """Return False when direction is 'keep' (no passing round)."""
    return direction != "keep"


class PassingPhase:
    """Manages the card-passing phase before play begins in a round."""

    def __init__(self, hands: list[list[Card]], direction: str, num_players: int = 4) -> None:
        self._hands = [list(hand) for hand in hands]  # defensive copy
        self._direction = direction
        self._num_players = num_players
        # seat_index -> list of cards the player wants to pass
        self._submissions: dict[int, list[Card]] = {}

    def submit_pass(self, seat_index: int, cards: list[Card]) -> bool:
        """Record the 3 cards that the player at seat_index wants to pass.

        Validates:
        - Exactly 3 cards must be submitted
        - All cards must be in the player's hand
        - Player hasn't already submitted

        Returns True if all players have now submitted (passing is complete).
        Raises ValueError on invalid input.
        """
        if seat_index < 0 or seat_index >= self._num_players:
            raise ValueError(f"Invalid seat_index: {seat_index}")

        if seat_index in self._submissions:
            raise ValueError(f"Player at seat {seat_index} has already submitted pass cards")

        if len(cards) != 3:
            raise ValueError(f"Exactly 3 cards must be submitted, got {len(cards)}")

        hand = self._hands[seat_index]
        hand_set = list(hand)  # we need to check for duplicates carefully

        # Verify each submitted card is in the player's hand (handle duplicates)
        remaining = list(hand_set)
        for card in cards:
            try:
                remaining.remove(card)
            except ValueError:
                raise ValueError(f"Card {card} is not in player {seat_index}'s hand")

        self._submissions[seat_index] = list(cards)
        return self.is_complete()

    def is_complete(self) -> bool:
        """Return True when all players have submitted their pass cards."""
        return len(self._submissions) == self._num_players

    def apply_passes(self) -> list[list[Card]]:
        """Exchange cards in the configured direction and return the new hands.

        Direction mapping:
        - "left":   player 0 → 1 → 2 → 3 → 0
        - "right":  player 0 → 3 → 2 → 1 → 0
        - "across": player 0 ↔ 2, player 1 ↔ 3
        - "keep":   no passing (returns hands unchanged)

        Must be called only after is_complete() is True.
        """
        if not self.is_complete():
            raise RuntimeError("Cannot apply passes before all players have submitted")

        new_hands = [list(hand) for hand in self._hands]

        if self._direction == "keep":
            return new_hands

        # Build a mapping: receiver_seat -> giver_seat
        if self._direction == "left":
            # player passes to the next seat (0→1, 1→2, 2→3, 3→0)
            receiver_of = {(i + 1) % self._num_players: i for i in range(self._num_players)}
        elif self._direction == "right":
            # player passes to the previous seat (0→3, 1→0, 2→1, 3→2)
            receiver_of = {(i - 1) % self._num_players: i for i in range(self._num_players)}
        elif self._direction == "across":
            # player 0 ↔ 2, player 1 ↔ 3
            receiver_of = {
                0: 2,
                1: 3,
                2: 0,
                3: 1,
            }
        else:
            raise ValueError(f"Unknown passing direction: {self._direction!r}")

        # Remove passed cards from each giver's hand, then add to receiver
        for receiver, giver in receiver_of.items():
            passed_cards = self._submissions[giver]
            for card in passed_cards:
                new_hands[giver].remove(card)
            new_hands[receiver].extend(passed_cards)

        return new_hands
