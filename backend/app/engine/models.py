from typing import Literal

from pydantic import BaseModel

from app.schemas.tables import RuleConfig  # re-export to avoid duplication

__all__ = ["Card", "RuleConfig", "PlayerState", "TrickState", "GameState"]


class Card(BaseModel):
    suit: Literal["spades", "hearts", "diamonds", "clubs"]
    rank: Literal["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]


class PlayerState(BaseModel):
    player_id: str
    username: str
    seat_index: int
    hand: list[Card]  # only sent to the owning player
    hand_size: int  # sent to all players
    cumulative_score: int
    round_score: int
    avatar_url: str | None


class TrickState(BaseModel):
    trick_number: int
    led_suit: str | None
    cards_played: dict[str, Card]  # player_id -> Card
    current_player_id: str | None


class GameState(BaseModel):
    game_id: str
    table_id: str
    round_number: int
    passing_direction: str
    phase: Literal["waiting", "passing", "playing", "round_end", "game_end"]
    players: list[PlayerState]
    current_trick: TrickState | None
    hearts_broken: bool
    winners: list[str] | None
