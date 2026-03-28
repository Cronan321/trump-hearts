from typing import Literal

from pydantic import BaseModel, Field


class RuleConfig(BaseModel):
    passing_direction: Literal["left", "right", "across", "keep"] = "left"
    jack_of_diamonds: bool = False
    shoot_the_moon: Literal["add_to_others", "subtract_from_self"] = "add_to_others"
    breaking_hearts: bool = True
    first_trick_points: bool = True


class TableCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    rule_config: RuleConfig = Field(default_factory=RuleConfig)


class TableResponse(BaseModel):
    table_id: str
    name: str
    player_count: int
    max_players: int = 4
    rule_config: RuleConfig
    status: str


class JoinResponse(BaseModel):
    table_id: str
    seat_index: int
