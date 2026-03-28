import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, SmallInteger, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Game(Base):
    __tablename__ = "games"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    table_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("tables.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active")
    started_at: Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(nullable=True)


class Round(Base):
    __tablename__ = "rounds"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    game_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("games.id"), nullable=True)
    round_number: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    passing_direction: Mapped[str] = mapped_column(String(8), nullable=False)
    started_at: Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow)


class Trick(Base):
    __tablename__ = "tricks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    round_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("rounds.id"), nullable=True)
    trick_number: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    winner_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    cards_played: Mapped[list] = mapped_column(JSONB, nullable=False)
    completed_at: Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow)


class RoundScore(Base):
    __tablename__ = "round_scores"

    round_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("rounds.id"), primary_key=True)
    player_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), primary_key=True)
    points: Mapped[int] = mapped_column(SmallInteger, nullable=False)


class GameScore(Base):
    __tablename__ = "game_scores"

    game_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("games.id"), primary_key=True)
    player_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), primary_key=True)
    cumulative_score: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
