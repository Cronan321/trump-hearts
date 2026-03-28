"""Tests for get_legal_plays and trick_winner in rules.py."""
import pytest

from backend.app.engine.models import Card, RuleConfig
from backend.app.engine.rules import get_legal_plays, trick_winner, RANK_ORDER


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def card(suit: str, rank: str) -> Card:
    return Card(suit=suit, rank=rank)  # type: ignore[arg-type]


def same_cards(a: list[Card], b: list[Card]) -> bool:
    """Order-independent card list equality."""
    key = lambda c: (c.suit, c.rank)
    return sorted(a, key=key) == sorted(b, key=key)


DEFAULT_RULES = RuleConfig()  # breaking_hearts=True, first_trick_points=True
NO_BREAKING = RuleConfig(breaking_hearts=False)
NO_FIRST_TRICK_POINTS = RuleConfig(first_trick_points=False)


# ---------------------------------------------------------------------------
# RANK_ORDER sanity
# ---------------------------------------------------------------------------

def test_rank_order_bounds():
    assert RANK_ORDER["2"] == 2
    assert RANK_ORDER["A"] == 14
    assert RANK_ORDER["10"] == 10


# ---------------------------------------------------------------------------
# get_legal_plays — leading, trick 1
# ---------------------------------------------------------------------------

class TestLeadingTrick1:
    def test_must_lead_two_of_clubs(self):
        hand = [card("clubs", "2"), card("hearts", "A"), card("spades", "K")]
        result = get_legal_plays(hand, None, 1, False, True, DEFAULT_RULES)
        assert result == [card("clubs", "2")]

    def test_two_of_clubs_not_in_hand_leads_non_point(self):
        # Edge case: 2♣ not held — lead non-point cards
        hand = [card("diamonds", "5"), card("hearts", "A"), card("spades", "Q")]
        result = get_legal_plays(hand, None, 1, False, True, DEFAULT_RULES)
        assert result == [card("diamonds", "5")]

    def test_two_of_clubs_not_in_hand_all_points_allow_all(self):
        hand = [card("hearts", "A"), card("spades", "Q")]
        result = get_legal_plays(hand, None, 1, False, True, DEFAULT_RULES)
        assert same_cards(result, hand)


# ---------------------------------------------------------------------------
# get_legal_plays — leading, trick > 1
# ---------------------------------------------------------------------------

class TestLeadingLaterTricks:
    def test_can_lead_any_non_heart_when_hearts_not_broken(self):
        hand = [card("spades", "A"), card("diamonds", "3"), card("hearts", "K")]
        result = get_legal_plays(hand, None, 2, False, True, DEFAULT_RULES)
        assert card("hearts", "K") not in result
        assert card("spades", "A") in result
        assert card("diamonds", "3") in result

    def test_can_lead_heart_when_hearts_broken(self):
        hand = [card("hearts", "A"), card("spades", "3")]
        result = get_legal_plays(hand, None, 2, True, True, DEFAULT_RULES)
        assert same_cards(result, hand)

    def test_all_hearts_hand_may_lead_heart_even_not_broken(self):
        hand = [card("hearts", "2"), card("hearts", "K"), card("hearts", "A")]
        result = get_legal_plays(hand, None, 3, False, True, DEFAULT_RULES)
        assert same_cards(result, hand)

    def test_breaking_hearts_disabled_can_always_lead_heart(self):
        hand = [card("hearts", "A"), card("spades", "3")]
        result = get_legal_plays(hand, None, 2, False, True, NO_BREAKING)
        assert same_cards(result, hand)


# ---------------------------------------------------------------------------
# get_legal_plays — following suit
# ---------------------------------------------------------------------------

class TestFollowingSuit:
    def test_must_follow_suit_when_able(self):
        hand = [card("spades", "A"), card("spades", "3"), card("hearts", "K")]
        result = get_legal_plays(hand, "spades", 2, False, False, DEFAULT_RULES)
        assert same_cards(result, [card("spades", "A"), card("spades", "3")])

    def test_can_play_anything_when_void_in_led_suit(self):
        hand = [card("hearts", "A"), card("diamonds", "5"), card("spades", "Q")]
        result = get_legal_plays(hand, "clubs", 2, False, False, DEFAULT_RULES)
        assert same_cards(result, hand)

    def test_void_trick1_no_first_trick_points_blocks_hearts_and_qs(self):
        hand = [card("hearts", "A"), card("spades", "Q"), card("diamonds", "5")]
        result = get_legal_plays(hand, "clubs", 1, False, False, NO_FIRST_TRICK_POINTS)
        assert result == [card("diamonds", "5")]

    def test_void_trick1_no_first_trick_points_all_points_allow_all(self):
        hand = [card("hearts", "A"), card("spades", "Q")]
        result = get_legal_plays(hand, "clubs", 1, False, False, NO_FIRST_TRICK_POINTS)
        assert same_cards(result, hand)

    def test_void_trick1_first_trick_points_enabled_allows_all(self):
        hand = [card("hearts", "A"), card("spades", "Q"), card("diamonds", "5")]
        result = get_legal_plays(hand, "clubs", 1, False, False, DEFAULT_RULES)
        assert same_cards(result, hand)


# ---------------------------------------------------------------------------
# trick_winner
# ---------------------------------------------------------------------------

class TestTrickWinner:
    def test_highest_led_suit_wins(self):
        played = {
            "p1": card("spades", "A"),
            "p2": card("spades", "3"),
            "p3": card("hearts", "K"),  # off-suit, ignored
            "p4": card("spades", "Q"),
        }
        assert trick_winner(played, "spades") == "p1"

    def test_off_suit_cards_ignored(self):
        played = {
            "p1": card("clubs", "2"),
            "p2": card("hearts", "A"),  # off-suit
            "p3": card("clubs", "9"),
            "p4": card("diamonds", "K"),  # off-suit
        }
        assert trick_winner(played, "clubs") == "p3"

    def test_single_led_suit_card_wins(self):
        played = {
            "p1": card("hearts", "A"),
            "p2": card("spades", "K"),
            "p3": card("diamonds", "Q"),
            "p4": card("clubs", "2"),
        }
        assert trick_winner(played, "clubs") == "p4"

    def test_no_led_suit_raises(self):
        played = {
            "p1": card("hearts", "A"),
            "p2": card("spades", "K"),
        }
        with pytest.raises(ValueError):
            trick_winner(played, "clubs")

    def test_ten_beats_nine(self):
        played = {
            "p1": card("diamonds", "9"),
            "p2": card("diamonds", "10"),
        }
        assert trick_winner(played, "diamonds") == "p2"
