import uuid
from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    table_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("tables.id"), nullable=True)
    sender_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    message_text: Mapped[str] = mapped_column(String(280), nullable=False)
    is_preset: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sent_at: Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow)
