"""Unit tests for GameEngine — play_card and trick resolution.

Tests Requirements: 8.2, 8.3, 8.4, 8.5, 8.6
"""

import pytest

from backend.app.engine.game_engine import GameEngine, PlayResult
from backend.app.engine.models import Card, GameState
from backend.app.schemas.tables import RuleConfig

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_DEFAULT_RULE_CONFIG = RuleConfig(
    passing_direction="keep",
    jack_of_diamonds=False,
    shoot_the_moon="add_to_others",
    breaking_hearts=True,
    first_trick_points=False,
)

_PLAYERS = [
    {"player_id": "p0", "username": "Alice", "avatar_url": None},
    {"player_id": "p1", "username": "Bob", "avatar_url": None},
    {"player_id": "p2", "username": "Carol", "avatar_url": None},
    {"player_id": "p3", "username": "Dave", "avatar_url": None},
]

# Seat order: p0=0, p1=1, p2=2, p3=3


def _make_engine_with_hands(
    hands: dict[str, list[Card]],
    rule_config: RuleConfig = _DEFAULT_RULE_CONFIG,
    hearts_broken: bool = False,
    trick_number: int = 1,
    led_suit: str | None = None,
    cards_played: dict[str, Card] | None = None,
    current_player_id: str = "p0",
) -> tuple[GameEngine, str]:
    """Create a GameEngine with a game already in 'playing' phase with given hands."""
    from backend.app.engine.models import TrickState

    engine = GameEngine()
    state = engine.start_game("table-1", _PLAYERS, rule_config)
    game_id = state.game_id

    # Manually set up the game state
    new_players = []
    for p in state.players:
        hand = hands.get(p.player_id, [])
        new_players.append(
            p.model_copy(update={"hand": hand, "hand_size": len(hand)})
        )

    trick = TrickState(
        trick_number=trick_number,
        led_suit=led_suit,
        cards_played=cards_played or {},
        current_player_id=current_player_id,
    )

    new_state = state.model_copy(
        update={
            "phase": "playing",
            "players": new_players,
            "current_trick": trick,
            "hearts_broken": hearts_broken,
        }
    )
    engine._states[game_id] = new_state
    return engine, game_id


# ---------------------------------------------------------------------------
# play_card — validation
# ---------------------------------------------------------------------------


def test_play_card_wrong_turn_raises():
    hands = {
        "p0": [Card(suit="clubs", rank="2")],
        "p1": [Card(suit="clubs", rank="3")],
        "p2": [Card(suit="clubs", rank="4")],
        "p3": [Card(suit="clubs", rank="5")],
    }
    engine, game_id = _make_engine_with_hands(hands, current_player_id="p0")
    with pytest.raises(ValueError, match="not.*turn"):
        engine.play_card(game_id, "p1", Card(suit="clubs", rank="3"))


def test_play_card_not_in_hand_raises():
    hands = {
        "p0": [Card(suit="clubs", rank="2")],
        "p1": [Card(suit="clubs", rank="3")],
        "p2": [Card(suit="clubs", rank="4")],
        "p3": [Card(suit="clubs", rank="5")],
    }
    engine, game_id = _make_engine_with_hands(hands, current_player_id="p0")
    with pytest.raises(ValueError, match="not in"):
        engine.play_card(game_id, "p0", Card(suit="spades", rank="A"))


def test_play_card_illegal_play_raises():
    """Player must follow suit — playing off-suit when holding led suit is illegal."""
    hands = {
        "p0": [Card(suit="clubs", rank="3"), Card(suit="clubs", rank="4")],
        "p1": [Card(suit="clubs", rank="5"), Card(suit="hearts", rank="2")],
        "p2": [Card(suit="clubs", rank="6")],
        "p3": [Card(suit="clubs", rank="7")],
    }
    # p1 must follow clubs but tries to play hearts
    engine, game_id = _make_engine_with_hands(
        hands,
        trick_number=2,
        led_suit="clubs",
        cards_played={"p0": Card(suit="clubs", rank="3")},
        current_player_id="p1",
        hearts_broken=True,
    )
    with pytest.raises(ValueError, match="not a legal play"):
        engine.play_card(game_id, "p1", Card(suit="hearts", rank="2"))


def test_play_card_wrong_phase_raises():
    engine = GameEngine()
    state = engine.start_game("table-1", _PLAYERS, _DEFAULT_RULE_CONFIG)
    game_id = state.game_id
    # Phase is "waiting" — should raise
    with pytest.raises(ValueError, match="phase"):
        engine.play_card(game_id, "p0", Card(suit="clubs", rank="2"))


# ---------------------------------------------------------------------------
# play_card — mid-trick (not yet complete)
# ---------------------------------------------------------------------------


def test_play_card_advances_current_player():
    """After p0 plays, current_player_id should advance to p1."""
    hands = {
        "p0": [Card(suit="clubs", rank="2"), Card(suit="clubs", rank="3")],
        "p1": [Card(suit="clubs", rank="4")],
        "p2": [Card(suit="clubs", rank="5")],
        "p3": [Card(suit="clubs", rank="6")],
    }
    engine, game_id = _make_engine_with_hands(hands, current_player_id="p0")
    result = engine.play_card(game_id, "p0", Card(suit="clubs", rank="2"))

    assert result.trick_complete is False
    assert result.trick_winner_id is None
    assert result.trick_points == 0
    assert result.game_state.current_trick.current_player_id == "p1"
    assert result.game_state.current_trick.led_suit == "clubs"


def test_play_card_removes_card_from_hand():
    hands = {
        "p0": [Card(suit="clubs", rank="2"), Card(suit="clubs", rank="3")],
        "p1": [Card(suit="clubs", rank="4")],
        "p2": [Card(suit="clubs", rank="5")],
        "p3": [Card(suit="clubs", rank="6")],
    }
    engine, game_id = _make_engine_with_hands(hands, current_player_id="p0")
    result = engine.play_card(game_id, "p0", Card(suit="clubs", rank="2"))

    p0_state = next(p for p in result.game_state.players if p.player_id == "p0")
    assert Card(suit="clubs", rank="2") not in p0_state.hand
    assert p0_state.hand_size == 1


def test_play_card_sets_led_suit():
    hands = {
        "p0": [Card(suit="spades", rank="A")],
        "p1": [Card(suit="spades", rank="K")],
        "p2": [Card(suit="spades", rank="Q")],
        "p3": [Card(suit="spades", rank="J")],
    }
    engine, game_id = _make_engine_with_hands(
        hands, trick_number=2, hearts_broken=True, current_player_id="p0"
    )
    result = engine.play_card(game_id, "p0", Card(suit="spades", rank="A"))
    assert result.game_state.current_trick.led_suit == "spades"


def test_play_card_breaks_hearts():
    """Playing a heart should set hearts_broken = True."""
    hands = {
        "p0": [Card(suit="clubs", rank="3")],
        "p1": [Card(suit="hearts", rank="2")],  # p1 has no clubs, can play heart
        "p2": [Card(suit="clubs", rank="5")],
        "p3": [Card(suit="clubs", rank="6")],
    }
    engine, game_id = _make_engine_with_hands(
        hands,
        trick_number=2,
        led_suit="clubs",
        cards_played={"p0": Card(suit="clubs", rank="3")},
        current_player_id="p1",
        hearts_broken=False,
    )
    result = engine.play_card(game_id, "p1", Card(suit="hearts", rank="2"))
    assert result.game_state.hearts_broken is True


# ---------------------------------------------------------------------------
# play_card — trick completion
# ---------------------------------------------------------------------------


def test_trick_complete_winner_highest_led_suit():
    """Trick winner is the player with the highest card of the led suit."""
    hands = {
        "p0": [],
        "p1": [],
        "p2": [],
        "p3": [Card(suit="clubs", rank="K")],
    }
    engine, game_id = _make_engine_with_hands(
        hands,
        trick_number=2,
        led_suit="clubs",
        cards_played={
            "p0": Card(suit="clubs", rank="2"),
            "p1": Card(suit="clubs", rank="A"),
            "p2": Card(suit="clubs", rank="3"),
        },
        current_player_id="p3",
        hearts_broken=True,
    )
    result = engine.play_card(game_id, "p3", Card(suit="clubs", rank="K"))

    assert result.trick_complete is True
    assert result.trick_winner_id == "p1"  # A is highest


def test_trick_complete_off_suit_discards_ignored():
    """Off-suit cards don't win even if they're high rank."""
    hands = {
        "p0": [],
        "p1": [],
        "p2": [],
        "p3": [Card(suit="spades", rank="A")],  # off-suit
    }
    engine, game_id = _make_engine_with_hands(
        hands,
        trick_number=2,
        led_suit="clubs",
        cards_played={
            "p0": Card(suit="clubs", rank="5"),
            "p1": Card(suit="hearts", rank="A"),  # off-suit
            "p2": Card(suit="clubs", rank="3"),
        },
        current_player_id="p3",
        hearts_broken=True,
    )
    result = engine.play_card(game_id, "p3", Card(suit="spades", rank="A"))

    assert result.trick_complete is True
    assert result.trick_winner_id == "p0"  # 5♣ is highest of led suit


def test_trick_complete_winner_gets_round_score():
    """Trick winner's round_score is incremented by trick points."""
    # p1 wins with A♣, trick has 2 hearts = 2 points
    hands = {
        "p0": [],
        "p1": [],
        "p2": [],
        "p3": [Card(suit="clubs", rank="K")],
    }
    engine, game_id = _make_engine_with_hands(
        hands,
        trick_number=2,
        led_suit="clubs",
        cards_played={
            "p0": Card(suit="clubs", rank="2"),
            "p1": Card(suit="clubs", rank="A"),
            "p2": Card(suit="hearts", rank="3"),  # 1 point
        },
        current_player_id="p3",
        hearts_broken=True,
    )
    result = engine.play_card(game_id, "p3", Card(suit="clubs", rank="K"))

    p1_state = next(p for p in result.game_state.players if p.player_id == "p1")
    assert result.trick_winner_id == "p1"
    assert result.trick_points == 1
    assert p1_state.round_score == 1


def test_trick_complete_queen_spades_13_points():
    """Queen of Spades is worth 13 points."""
    hands = {
        "p0": [],
        "p1": [],
        "p2": [],
        "p3": [Card(suit="spades", rank="2")],
    }
    engine, game_id = _make_engine_with_hands(
        hands,
        trick_number=2,
        led_suit="spades",
        cards_played={
            "p0": Card(suit="spades", rank="A"),  # winner
            "p1": Card(suit="spades", rank="Q"),  # 13 pts
            "p2": Card(suit="spades", rank="3"),
        },
        current_player_id="p3",
        hearts_broken=True,
    )
    result = engine.play_card(game_id, "p3", Card(suit="spades", rank="2"))

    assert result.trick_winner_id == "p0"
    assert result.trick_points == 13
    p0_state = next(p for p in result.game_state.players if p.player_id == "p0")
    assert p0_state.round_score == 13


def test_trick_complete_next_trick_winner_leads():
    """After trick completion, the winner leads the next trick."""
    hands = {
        "p0": [Card(suit="clubs", rank="5")],
        "p1": [Card(suit="clubs", rank="6")],
        "p2": [Card(suit="clubs", rank="7")],
        "p3": [Card(suit="clubs", rank="K")],
    }
    engine, game_id = _make_engine_with_hands(
        hands,
        trick_number=2,
        led_suit="clubs",
        cards_played={
            "p0": Card(suit="clubs", rank="2"),
            "p1": Card(suit="clubs", rank="A"),  # winner
            "p2": Card(suit="clubs", rank="3"),
        },
        current_player_id="p3",
        hearts_broken=True,
    )
    result = engine.play_card(game_id, "p3", Card(suit="clubs", rank="K"))

    assert result.trick_complete is True
    assert result.game_state.current_trick is not None
    assert result.game_state.current_trick.current_player_id == "p1"
    assert result.game_state.current_trick.trick_number == 3
    assert result.game_state.current_trick.led_suit is None
    assert result.game_state.current_trick.cards_played == {}


def test_trick_13_sets_round_end_phase():
    """After the 13th trick, phase transitions to 'round_end'."""
    hands = {
        "p0": [],
        "p1": [],
        "p2": [],
        "p3": [Card(suit="clubs", rank="K")],
    }
    engine, game_id = _make_engine_with_hands(
        hands,
        trick_number=13,
        led_suit="clubs",
        cards_played={
            "p0": Card(suit="clubs", rank="2"),
            "p1": Card(suit="clubs", rank="A"),
            "p2": Card(suit="clubs", rank="3"),
        },
        current_player_id="p3",
        hearts_broken=True,
    )
    result = engine.play_card(game_id, "p3", Card(suit="clubs", rank="K"))

    assert result.trick_complete is True
    assert result.game_state.phase == "round_end"
    assert result.game_state.current_trick is None


# ---------------------------------------------------------------------------
# get_legal_plays
# ---------------------------------------------------------------------------


def test_get_legal_plays_first_trick_must_lead_2c():
    hands = {
        "p0": [Card(suit="clubs", rank="2"), Card(suit="spades", rank="A")],
        "p1": [Card(suit="clubs", rank="3")],
        "p2": [Card(suit="clubs", rank="4")],
        "p3": [Card(suit="clubs", rank="5")],
    }
    engine, game_id = _make_engine_with_hands(hands, current_player_id="p0")
    legal = engine.get_legal_plays(game_id, "p0")
    assert legal == [Card(suit="clubs", rank="2")]


def test_get_legal_plays_must_follow_suit():
    hands = {
        "p0": [],
        "p1": [Card(suit="clubs", rank="5"), Card(suit="hearts", rank="A")],
        "p2": [Card(suit="clubs", rank="6")],
        "p3": [Card(suit="clubs", rank="7")],
    }
    engine, game_id = _make_engine_with_hands(
        hands,
        trick_number=2,
        led_suit="clubs",
        cards_played={"p0": Card(suit="clubs", rank="3")},
        current_player_id="p1",
        hearts_broken=True,
    )
    legal = engine.get_legal_plays(game_id, "p1")
    assert legal == [Card(suit="clubs", rank="5")]


# ---------------------------------------------------------------------------
# apply_round_scores
# ---------------------------------------------------------------------------


def test_apply_round_scores_accumulates_to_cumulative():
    engine = GameEngine()
    state = engine.start_game("table-1", _PLAYERS, _DEFAULT_RULE_CONFIG)
    game_id = state.game_id

    # Manually set round scores
    new_players = []
    for i, p in enumerate(state.players):
        new_players.append(p.model_copy(update={"round_score": i * 5}))
    new_state = state.model_copy(update={"players": new_players, "phase": "round_end"})
    engine._states[game_id] = new_state

    scores = engine.apply_round_scores(game_id)

    updated = engine._states[game_id]
    for p in updated.players:
        assert p.cumulative_score == scores[p.player_id]


# ---------------------------------------------------------------------------
# check_game_over
# ---------------------------------------------------------------------------


def test_check_game_over_false_when_all_below_100():
    engine = GameEngine()
    state = engine.start_game("table-1", _PLAYERS, _DEFAULT_RULE_CONFIG)
    game_id = state.game_id
    assert engine.check_game_over(game_id) is False


def test_check_game_over_true_when_player_reaches_100():
    engine = GameEngine()
    state = engine.start_game("table-1", _PLAYERS, _DEFAULT_RULE_CONFIG)
    game_id = state.game_id

    new_players = list(state.players)
    new_players[0] = new_players[0].model_copy(update={"cumulative_score": 100})
    engine._states[game_id] = state.model_copy(update={"players": new_players})

    assert engine.check_game_over(game_id) is True


def test_check_game_over_true_when_player_exceeds_100():
    engine = GameEngine()
    state = engine.start_game("table-1", _PLAYERS, _DEFAULT_RULE_CONFIG)
    game_id = state.game_id

    new_players = list(state.players)
    new_players[2] = new_players[2].model_copy(update={"cumulative_score": 115})
    engine._states[game_id] = state.model_copy(update={"players": new_players})

    assert engine.check_game_over(game_id) is True


# ---------------------------------------------------------------------------
# Jack of Diamonds variant
# ---------------------------------------------------------------------------


def test_jack_of_diamonds_subtracts_10_points():
    rule_config = RuleConfig(
        passing_direction="keep",
        jack_of_diamonds=True,
        shoot_the_moon="add_to_others",
        breaking_hearts=True,
        first_trick_points=False,
    )
    hands = {
        "p0": [],
        "p1": [],
        "p2": [],
        "p3": [Card(suit="diamonds", rank="2")],
    }
    engine, game_id = _make_engine_with_hands(
        hands,
        rule_config=rule_config,
        trick_number=2,
        led_suit="diamonds",
        cards_played={
            "p0": Card(suit="diamonds", rank="A"),  # winner
            "p1": Card(suit="diamonds", rank="J"),  # -10 pts
            "p2": Card(suit="hearts", rank="3"),    # +1 pt
        },
        current_player_id="p3",
        hearts_broken=True,
    )
    result = engine.play_card(game_id, "p3", Card(suit="diamonds", rank="2"))

    # 1 heart - 10 jack of diamonds = -9
    assert result.trick_points == -9
    p0_state = next(p for p in result.game_state.players if p.player_id == "p0")
    assert p0_state.round_score == -9


# ---------------------------------------------------------------------------
# Shoot the Moon — Requirements 9.4, 9.5, 9.6
# ---------------------------------------------------------------------------

def _setup_shoot_the_moon_game(
    shooter_id: str = "p0",
    rule_config: RuleConfig = _DEFAULT_RULE_CONFIG,
) -> tuple[GameEngine, str]:
    """Set up a game where shooter_id took all 13 hearts and Q♠."""
    engine = GameEngine()
    state = engine.start_game("table-1", _PLAYERS, rule_config)
    game_id = state.game_id

    # Build 13 tricks: shooter wins all of them
    # Trick 1-12: shooter takes 1 heart each trick
    # Trick 13: shooter takes 1 heart + Q♠
    hearts = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
    other_players = [pid for pid in ["p0", "p1", "p2", "p3"] if pid != shooter_id]

    round_tricks = []
    trick_winners = []

    for i, rank in enumerate(hearts):
        trick_cards: dict[str, Card] = {shooter_id: Card(suit="hearts", rank=rank)}
        for j, pid in enumerate(other_players):
            trick_cards[pid] = Card(suit="clubs", rank=["3", "4", "5"][j])
        if i == 12:
            # Last trick: also include Q♠ (shooter wins it)
            trick_cards[shooter_id] = Card(suit="hearts", rank=rank)
            trick_cards["_qs"] = Card(suit="spades", rank="Q")
            # Replace one other player's card with Q♠
            trick_cards[other_players[0]] = Card(suit="spades", rank="Q")
        round_tricks.append(trick_cards)
        trick_winners.append(shooter_id)

    engine._round_tricks[game_id] = round_tricks
    engine._trick_winners[game_id] = trick_winners

    # Set round scores as if shooter took all 26 points normally
    new_players = []
    for p in state.players:
        score = 26 if p.player_id == shooter_id else 0
        new_players.append(p.model_copy(update={"round_score": score}))
    engine._states[game_id] = state.model_copy(
        update={"players": new_players, "phase": "round_end"}
    )

    return engine, game_id


def test_shoot_the_moon_detection_returns_shooter():
    """_check_shoot_the_moon_internal returns the shooter's player_id."""
    engine, game_id = _setup_shoot_the_moon_game(shooter_id="p0")
    shooter = engine._check_shoot_the_moon_internal(game_id)
    assert shooter == "p0"


def test_shoot_the_moon_add_to_others_shooter_gets_zero_others_get_26():
    """add_to_others: shooter gets 0 for the round, each other player gets +26.

    Validates: Requirements 9.4, 9.5
    """
    rule_config = RuleConfig(
        passing_direction="keep",
        jack_of_diamonds=False,
        shoot_the_moon="add_to_others",
        breaking_hearts=True,
        first_trick_points=False,
    )
    engine, game_id = _setup_shoot_the_moon_game(shooter_id="p1", rule_config=rule_config)

    scores = engine.apply_round_scores(game_id)

    assert scores["p1"] == 0, "Shooter should get 0 for the round"
    for pid in ["p0", "p2", "p3"]:
        assert scores[pid] == 26, f"{pid} should get +26"

    updated = engine._states[game_id]
    shooter_state = next(p for p in updated.players if p.player_id == "p1")
    assert shooter_state.cumulative_score == 0
    for p in updated.players:
        if p.player_id != "p1":
            assert p.cumulative_score == 26


def test_shoot_the_moon_subtract_from_self_shooter_gets_minus_26_others_get_zero():
    """subtract_from_self: shooter gets -26 cumulative, others get 0 for the round.

    Validates: Requirements 9.4, 9.6
    """
    rule_config = RuleConfig(
        passing_direction="keep",
        jack_of_diamonds=False,
        shoot_the_moon="subtract_from_self",
        breaking_hearts=True,
        first_trick_points=False,
    )
    engine, game_id = _setup_shoot_the_moon_game(shooter_id="p2", rule_config=rule_config)

    scores = engine.apply_round_scores(game_id)

    assert scores["p2"] == -26, "Shooter should get -26"
    for pid in ["p0", "p1", "p3"]:
        assert scores[pid] == 0, f"{pid} should get 0"

    updated = engine._states[game_id]
    shooter_state = next(p for p in updated.players if p.player_id == "p2")
    assert shooter_state.cumulative_score == -26
    for p in updated.players:
        if p.player_id != "p2":
            assert p.cumulative_score == 0


def test_partial_moon_12_hearts_and_queen_spades_does_not_trigger():
    """p0 wins 12 tricks (each with 1 heart), p1 wins the 13th trick (A♥ + Q♠).
    p0 has 12 hearts, p1 has 1 heart + Q♠ — neither has all 13, so no moon.

    Validates: Requirements 9.4
    """
    engine = GameEngine()
    state = engine.start_game("table-1", _PLAYERS, _DEFAULT_RULE_CONFIG)
    game_id = state.game_id

    hearts_12 = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
    round_tricks = []
    trick_winners = []

    # p0 wins 12 tricks, each containing one heart
    for rank in hearts_12:
        trick_cards = {
            "p0": Card(suit="hearts", rank=rank),
            "p1": Card(suit="clubs", rank="3"),
            "p2": Card(suit="clubs", rank="4"),
            "p3": Card(suit="clubs", rank="5"),
        }
        round_tricks.append(trick_cards)
        trick_winners.append("p0")

    # 13th trick: p1 wins and takes A♥ + Q♠ (p0 misses the last heart)
    round_tricks.append({
        "p0": Card(suit="clubs", rank="6"),
        "p1": Card(suit="hearts", rank="A"),
        "p2": Card(suit="spades", rank="Q"),
        "p3": Card(suit="clubs", rank="7"),
    })
    trick_winners.append("p1")  # p1 wins this trick

    engine._round_tricks[game_id] = round_tricks
    engine._trick_winners[game_id] = trick_winners

    shooter = engine._check_shoot_the_moon_internal(game_id)
    assert shooter is None, "Partial moon (p0 has 12 hearts, p1 has 1 heart + Q♠) should not trigger"


# ---------------------------------------------------------------------------
# get_winners — Requirements 10.2, 10.3
# ---------------------------------------------------------------------------


def test_get_winners_single_winner_lowest_score():
    """get_winners returns the single player with the lowest cumulative score."""
    engine = GameEngine()
    state = engine.start_game("table-1", _PLAYERS, _DEFAULT_RULE_CONFIG)
    game_id = state.game_id

    scores = {"p0": 110, "p1": 80, "p2": 95, "p3": 70}
    new_players = [
        p.model_copy(update={"cumulative_score": scores[p.player_id]})
        for p in state.players
    ]
    engine._states[game_id] = state.model_copy(update={"players": new_players})

    winners = engine.get_winners(game_id)
    assert winners == ["p3"]


def test_get_winners_tie_returns_all_tied_players():
    """get_winners returns all players tied for the lowest cumulative score."""
    engine = GameEngine()
    state = engine.start_game("table-1", _PLAYERS, _DEFAULT_RULE_CONFIG)
    game_id = state.game_id

    scores = {"p0": 110, "p1": 60, "p2": 95, "p3": 60}
    new_players = [
        p.model_copy(update={"cumulative_score": scores[p.player_id]})
        for p in state.players
    ]
    engine._states[game_id] = state.model_copy(update={"players": new_players})

    winners = engine.get_winners(game_id)
    assert set(winners) == {"p1", "p3"}


# ---------------------------------------------------------------------------
# apply_round_scores — game_end transition — Requirements 10.2, 10.3, 10.4
# ---------------------------------------------------------------------------


def test_apply_round_scores_sets_game_end_phase_when_threshold_reached():
    """apply_round_scores transitions to 'game_end' when a player hits >= 100."""
    engine = GameEngine()
    state = engine.start_game("table-1", _PLAYERS, _DEFAULT_RULE_CONFIG)
    game_id = state.game_id

    # p0 already has 90, round score of 15 will push them to 105
    new_players = []
    for p in state.players:
        cs = 90 if p.player_id == "p0" else 20
        rs = 15 if p.player_id == "p0" else 5
        new_players.append(p.model_copy(update={"cumulative_score": cs, "round_score": rs}))
    engine._states[game_id] = state.model_copy(
        update={"players": new_players, "phase": "round_end"}
    )

    engine.apply_round_scores(game_id)

    updated = engine._states[game_id]
    assert updated.phase == "game_end"


def test_apply_round_scores_sets_winners_when_game_ends():
    """apply_round_scores sets state.winners to the player(s) with the lowest score."""
    engine = GameEngine()
    state = engine.start_game("table-1", _PLAYERS, _DEFAULT_RULE_CONFIG)
    game_id = state.game_id

    # p0 hits 105, p3 has the lowest score (10)
    scores = {"p0": (90, 15), "p1": (50, 5), "p2": (60, 5), "p3": (10, 5)}
    new_players = [
        p.model_copy(update={"cumulative_score": scores[p.player_id][0], "round_score": scores[p.player_id][1]})
        for p in state.players
    ]
    engine._states[game_id] = state.model_copy(
        update={"players": new_players, "phase": "round_end"}
    )

    engine.apply_round_scores(game_id)

    updated = engine._states[game_id]
    assert updated.winners == ["p3"]


def test_apply_round_scores_no_game_end_when_below_threshold():
    """apply_round_scores does NOT set game_end when all scores stay below 100."""
    engine = GameEngine()
    state = engine.start_game("table-1", _PLAYERS, _DEFAULT_RULE_CONFIG)
    game_id = state.game_id

    new_players = [p.model_copy(update={"round_score": 10}) for p in state.players]
    engine._states[game_id] = state.model_copy(
        update={"players": new_players, "phase": "round_end"}
    )

    engine.apply_round_scores(game_id)

    updated = engine._states[game_id]
    assert updated.phase != "game_end"
    assert updated.winners is None
