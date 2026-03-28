"""Tests for deck.py — Requirements 7.1, 7.2, 7.3"""
import pytest
from backend.app.engine.deck import FULL_DECK, deal_round
from backend.app.engine.models import Card


def test_full_deck_has_52_cards():
    assert len(FULL_DECK) == 52


def test_full_deck_no_duplicates():
    tuples = [(c.suit, c.rank) for c in FULL_DECK]
    assert len(set(tuples)) == 52


def test_full_deck_all_suits_and_ranks():
    suits = {c.suit for c in FULL_DECK}
    ranks = {c.rank for c in FULL_DECK}
    assert suits == {"spades", "hearts", "diamonds", "clubs"}
    assert ranks == {"2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"}


def test_deal_round_returns_four_hands():
    hands = deal_round()
    assert len(hands) == 4


def test_deal_round_each_hand_has_13_cards():
    hands = deal_round()
    for hand in hands:
        assert len(hand) == 13


def test_deal_round_no_duplicate_cards():
    hands = deal_round()
    all_cards = [(c.suit, c.rank) for hand in hands for c in hand]
    assert len(set(all_cards)) == 52


def test_deal_round_covers_full_deck():
    hands = deal_round()
    all_cards = {(c.suit, c.rank) for hand in hands for c in hand}
    expected = {(c.suit, c.rank) for c in FULL_DECK}
    assert all_cards == expected


def test_deal_round_returns_card_instances():
    hands = deal_round()
    for hand in hands:
        for card in hand:
            assert isinstance(card, Card)


def test_deal_round_does_not_mutate_full_deck():
    original = list(FULL_DECK)
    deal_round()
    assert FULL_DECK == original


def test_deal_round_shuffles_differently():
    """Two consecutive deals should (almost certainly) differ."""
    hands_a = deal_round()
    hands_b = deal_round()
    flat_a = [(c.suit, c.rank) for hand in hands_a for c in hand]
    flat_b = [(c.suit, c.rank) for hand in hands_b for c in hand]
    # Probability of identical shuffle is 1/52! ≈ 0
    assert flat_a != flat_b
