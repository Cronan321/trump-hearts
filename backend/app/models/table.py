import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, SmallInteger, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class GameTable(Base):
    __tablename__ = "tables"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    creator_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="waiting")
    rule_config: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow)


class TableSeat(Base):
    __tablename__ = "table_seats"
    __table_args__ = (
        CheckConstraint("seat_index BETWEEN 0 AND 3", name="seat_index_range"),
    )

    table_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tables.id"), primary_key=True)
    player_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    seat_index: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    joined_at: Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow)
