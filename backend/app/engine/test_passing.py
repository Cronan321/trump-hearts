"""Tests for passing.py — Requirements 7.4, 7.5"""
import pytest
from backend.app.engine.deck import deal_round
from backend.app.engine.models import Card
from backend.app.engine.passing import PassingPhase, should_pass


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_hands() -> list[list[Card]]:
    """Return a deterministic set of 4 hands (13 cards each)."""
    return deal_round()


def _first_three(hand: list[Card]) -> list[Card]:
    return hand[:3]


# ---------------------------------------------------------------------------
# should_pass
# ---------------------------------------------------------------------------

def test_should_pass_keep_returns_false():
    assert should_pass("keep") is False


def test_should_pass_left_returns_true():
    assert should_pass("left") is True


def test_should_pass_right_returns_true():
    assert should_pass("right") is True


def test_should_pass_across_returns_true():
    assert should_pass("across") is True


# ---------------------------------------------------------------------------
# PassingPhase.submit_pass — validation
# ---------------------------------------------------------------------------

def test_submit_pass_wrong_card_count_raises():
    hands = _make_hands()
    phase = PassingPhase(hands, "left")
    with pytest.raises(ValueError, match="3 cards"):
        phase.submit_pass(0, hands[0][:2])


def test_submit_pass_zero_cards_raises():
    hands = _make_hands()
    phase = PassingPhase(hands, "left")
    with pytest.raises(ValueError):
        phase.submit_pass(0, [])


def test_submit_pass_card_not_in_hand_raises():
    hands = _make_hands()
    phase = PassingPhase(hands, "left")
    # Build 3 cards that definitely don't belong to player 0
    foreign_cards = [c for c in hands[1] if c not in hands[0]][:3]
    with pytest.raises(ValueError, match="not in player"):
        phase.submit_pass(0, foreign_cards)


def test_submit_pass_duplicate_submission_raises():
    hands = _make_hands()
    phase = PassingPhase(hands, "left")
    phase.submit_pass(0, _first_three(hands[0]))
    with pytest.raises(ValueError, match="already submitted"):
        phase.submit_pass(0, _first_three(hands[0]))


def test_submit_pass_invalid_seat_raises():
    hands = _make_hands()
    phase = PassingPhase(hands, "left")
    with pytest.raises(ValueError, match="Invalid seat_index"):
        phase.submit_pass(4, _first_three(hands[0]))


# ---------------------------------------------------------------------------
# PassingPhase.is_complete
# ---------------------------------------------------------------------------

def test_is_complete_false_initially():
    hands = _make_hands()
    phase = PassingPhase(hands, "left")
    assert phase.is_complete() is False


def test_is_complete_true_after_all_submit():
    hands = _make_hands()
    phase = PassingPhase(hands, "left")
    for i in range(4):
        phase.submit_pass(i, _first_three(hands[i]))
    assert phase.is_complete() is True


def test_submit_pass_returns_true_when_last_player_submits():
    hands = _make_hands()
    phase = PassingPhase(hands, "left")
    for i in range(3):
        result = phase.submit_pass(i, _first_three(hands[i]))
        assert result is False
    result = phase.submit_pass(3, _first_three(hands[3]))
    assert result is True


# ---------------------------------------------------------------------------
# PassingPhase.apply_passes — direction: left
# ---------------------------------------------------------------------------

def test_apply_passes_left_hand_sizes_unchanged():
    hands = _make_hands()
    phase = PassingPhase(hands, "left")
    for i in range(4):
        phase.submit_pass(i, _first_three(hands[i]))
    new_hands = phase.apply_passes()
    for hand in new_hands:
        assert len(hand) == 13


def test_apply_passes_left_cards_moved_correctly():
    hands = _make_hands()
    passed = [_first_three(hands[i]) for i in range(4)]
    phase = PassingPhase(hands, "left")
    for i in range(4):
        phase.submit_pass(i, passed[i])
    new_hands = phase.apply_passes()

    # player 0 passes to player 1, player 1 passes to player 2, etc.
    for giver in range(4):
        receiver = (giver + 1) % 4
        for card in passed[giver]:
            assert card in new_hands[receiver]
            assert card not in new_hands[giver]


# ---------------------------------------------------------------------------
# PassingPhase.apply_passes — direction: right
# ---------------------------------------------------------------------------

def test_apply_passes_right_cards_moved_correctly():
    hands = _make_hands()
    passed = [_first_three(hands[i]) for i in range(4)]
    phase = PassingPhase(hands, "right")
    for i in range(4):
        phase.submit_pass(i, passed[i])
    new_hands = phase.apply_passes()

    # player 0 passes to player 3, player 1 passes to player 0, etc.
    for giver in range(4):
        receiver = (giver - 1) % 4
        for card in passed[giver]:
            assert card in new_hands[receiver]
            assert card not in new_hands[giver]


# ---------------------------------------------------------------------------
# PassingPhase.apply_passes — direction: across
# ---------------------------------------------------------------------------

def test_apply_passes_across_cards_moved_correctly():
    hands = _make_hands()
    passed = [_first_three(hands[i]) for i in range(4)]
    phase = PassingPhase(hands, "across")
    for i in range(4):
        phase.submit_pass(i, passed[i])
    new_hands = phase.apply_passes()

    # 0 ↔ 2, 1 ↔ 3
    pairs = [(0, 2), (1, 3)]
    for a, b in pairs:
        for card in passed[a]:
            assert card in new_hands[b]
            assert card not in new_hands[a]
        for card in passed[b]:
            assert card in new_hands[a]
            assert card not in new_hands[b]


# ---------------------------------------------------------------------------
# PassingPhase.apply_passes — direction: keep
# ---------------------------------------------------------------------------

def test_apply_passes_keep_returns_unchanged_hands():
    hands = _make_hands()
    phase = PassingPhase(hands, "keep")
    for i in range(4):
        phase.submit_pass(i, _first_three(hands[i]))
    new_hands = phase.apply_passes()
    for i in range(4):
        assert set((c.suit, c.rank) for c in new_hands[i]) == set((c.suit, c.rank) for c in hands[i])


# ---------------------------------------------------------------------------
# PassingPhase.apply_passes — called before complete
# ---------------------------------------------------------------------------

def test_apply_passes_before_complete_raises():
    hands = _make_hands()
    phase = PassingPhase(hands, "left")
    phase.submit_pass(0, _first_three(hands[0]))
    with pytest.raises(RuntimeError):
        phase.apply_passes()


# ---------------------------------------------------------------------------
# PassingPhase — original hands not mutated
# ---------------------------------------------------------------------------

def test_original_hands_not_mutated():
    hands = _make_hands()
    original_cards = [set((c.suit, c.rank) for c in hand) for hand in hands]
    phase = PassingPhase(hands, "left")
    for i in range(4):
        phase.submit_pass(i, _first_three(hands[i]))
    phase.apply_passes()
    for i in range(4):
        assert set((c.suit, c.rank) for c in hands[i]) == original_cards[i]
