import uuid
from datetime import datetime

from sqlalchemy import BigInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    coin_balance: Mapped[int] = mapped_column(BigInteger, nullable=False, default=25000)
    created_at: Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow)
