"""require 5-digit atm serial numbers

Revision ID: 79faa9356345
Revises: 3eed134ab386
Create Date: 2026-10-01 16:32:27.063101

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '79faa9356345'
down_revision: Union[str, Sequence[str], None] = '3eed134ab386'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column(
        "atms",
        "serial_number",
        existing_type=sa.String(length=50),
        type_=sa.String(length=5),
        existing_nullable=False,
    )
    op.create_check_constraint(
        "ck_atms_serial_number_format", "atms", "serial_number ~ '^[0-9]{5}$'"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("ck_atms_serial_number_format", "atms", type_="check")
    op.alter_column(
        "atms",
        "serial_number",
        existing_type=sa.String(length=5),
        type_=sa.String(length=50),
        existing_nullable=False,
    )