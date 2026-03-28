import secrets
from typing import Literal

from app.engine.models import Card

_SUITS: list[Literal["spades", "hearts", "diamonds", "clubs"]] = [
    "spades",
    "hearts",
    "diamonds",
    "clubs",
]
_RANKS: list[Literal["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]] = [
    "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A",
]

FULL_DECK: list[Card] = [Card(suit=suit, rank=rank) for suit in _SUITS for rank in _RANKS]


def deal_round(num_players: int = 4) -> list[list[Card]]:
    """Shuffle a fresh 52-card deck and deal round-robin to num_players players.

    Returns a list of num_players hands. For 4 players each hand has 13 cards.
    """
    deck = list(FULL_DECK)  # fresh copy
    secrets.SystemRandom().shuffle(deck)

    hands: list[list[Card]] = [[] for _ in range(num_players)]
    for i, card in enumerate(deck):
        hands[i % num_players].append(card)

    return hands
