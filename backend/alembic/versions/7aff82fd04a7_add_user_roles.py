"""add user roles

Revision ID: 7aff82fd04a7
Revises: 79faa9356345
Create Date: 2026-10-02 06:35:11.698278

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7aff82fd04a7'
down_revision: Union[str, Sequence[str], None] = '79faa9356345'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    user_role = sa.Enum("Operations Admin", "Field Technician", "Auditor", name="user_role")
    user_role.create(op.get_bind())

    # Existing accounts were all created as full users, so they become Operations Admins.
    # The temporary server_default fills in existing rows; we remove it right after.
    op.add_column(
        "users",
        sa.Column("role", user_role, nullable=False, server_default="Operations Admin"),
    )
    op.alter_column("users", "role", server_default=None)

    op.add_column("users", sa.Column("technician_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_users_technician_id", "users", "technicians", ["technician_id"], ["id"])
    op.create_unique_constraint("uq_users_technician_id", "users", ["technician_id"])
    op.create_check_constraint(
        "ck_users_technician_role",
        "users",
        "(role = 'Field Technician') = (technician_id IS NOT NULL)",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("ck_users_technician_role", "users", type_="check")
    op.drop_constraint("uq_users_technician_id", "users", type_="unique")
    op.drop_constraint("fk_users_technician_id", "users", type_="foreignkey")
    op.drop_column("users", "technician_id")
    op.drop_column("users", "role")
    sa.Enum(name="user_role").drop(op.get_bind())