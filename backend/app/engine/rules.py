from app.engine.models import Card, RuleConfig

RANK_ORDER: dict[str, int] = {
    "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8,
    "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13, "A": 14,
}

def _is_point_card(card: Card) -> bool:
    return card.suit == "hearts" or (card.suit == "spades" and card.rank == "Q")


def get_legal_plays(
    hand: list[Card],
    led_suit: str | None,
    trick_number: int,
    hearts_broken: bool,
    is_leading: bool,
    rule_config: RuleConfig,
) -> list[Card]:
    """Return the list of cards the player is legally allowed to play."""

    # --- Leading the trick ---
    if is_leading:
        # Rule 1: First trick — must lead 2♣ if held
        two_of_clubs = Card(suit="clubs", rank="2")
        if trick_number == 1:
            if two_of_clubs in hand:
                return [two_of_clubs]
            # Edge case: player doesn't hold 2♣ (shouldn't happen in normal play,
            # but if so fall through to first-trick lead restrictions below)

        # First trick lead restrictions (trick_number == 1, no 2♣)
        if trick_number == 1:
            non_point = [c for c in hand if not _is_point_card(c)]
            if non_point:
                return non_point
            # All cards are Hearts/Q♠ — allow all
            return list(hand)

        # Breaking hearts restriction (trick_number > 1)
        if rule_config.breaking_hearts and not hearts_broken:
            non_hearts = [c for c in hand if c.suit != "hearts"]
            if non_hearts:
                return non_hearts
            # Entire hand is Hearts — may lead a Heart
            return list(hand)

        # No restrictions — can lead anything
        return list(hand)

    # --- Following the trick ---
    if led_suit is not None:
        same_suit = [c for c in hand if c.suit == led_suit]
        if same_suit:
            # Must follow suit
            return same_suit

    # No cards of led suit (or no led suit) — can play anything with restrictions
    if not rule_config.first_trick_points and trick_number == 1:
        non_point = [c for c in hand if not _is_point_card(c)]
        if non_point:
            return non_point
        # All remaining cards are Hearts/Q♠ — allow all
        return list(hand)

    return list(hand)


def trick_winner(cards_played: dict[str, Card], led_suit: str) -> str:
    """Return the player_id who wins the trick (highest card of led suit)."""
    winner_id: str | None = None
    winner_rank: int = -1

    for player_id, card in cards_played.items():
        if card.suit == led_suit:
            rank_val = RANK_ORDER[card.rank]
            if rank_val > winner_rank:
                winner_rank = rank_val
                winner_id = player_id

    if winner_id is None:
        raise ValueError(f"No card of led suit '{led_suit}' found in trick")

    return winner_id
