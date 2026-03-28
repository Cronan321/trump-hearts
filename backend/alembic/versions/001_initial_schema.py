"""initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("username", sa.String(32), unique=True, nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("coin_balance", sa.BigInteger(), nullable=False, server_default="25000"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )

    op.create_table(
        "tables",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("creator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="waiting"),
        sa.Column("rule_config", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )

    op.create_table(
        "table_seats",
        sa.Column("table_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tables.id"), primary_key=True),
        sa.Column("player_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("seat_index", sa.SmallInteger(), primary_key=True),
        sa.Column("joined_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("seat_index BETWEEN 0 AND 3", name="seat_index_range"),
    )

    op.create_table(
        "games",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("table_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tables.id"), nullable=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
        sa.Column("started_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("ended_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )

    op.create_table(
        "rounds",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("game_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("games.id"), nullable=True),
        sa.Column("round_number", sa.SmallInteger(), nullable=False),
        sa.Column("passing_direction", sa.String(8), nullable=False),
        sa.Column("started_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )

    op.create_table(
        "tricks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("round_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("rounds.id"), nullable=True),
        sa.Column("trick_number", sa.SmallInteger(), nullable=False),
        sa.Column("winner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("cards_played", postgresql.JSONB(), nullable=False),
        sa.Column("completed_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )

    op.create_table(
        "round_scores",
        sa.Column("round_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("rounds.id"), primary_key=True),
        sa.Column("player_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("points", sa.SmallInteger(), nullable=False),
    )

    op.create_table(
        "game_scores",
        sa.Column("game_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("games.id"), primary_key=True),
        sa.Column("player_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("cumulative_score", sa.SmallInteger(), nullable=False, server_default="0"),
    )

    op.create_table(
        "chat_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("table_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tables.id"), nullable=True),
        sa.Column("sender_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("message_text", sa.String(280), nullable=False),
        sa.Column("is_preset", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("sent_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )


def downgrade() -> None:
    op.drop_table("chat_messages")
    op.drop_table("game_scores")
    op.drop_table("round_scores")
    op.drop_table("tricks")
    op.drop_table("rounds")
    op.drop_table("games")
    op.drop_table("table_seats")
    op.drop_table("tables")
    op.drop_table("users")
