from sqlalchemy import CheckConstraint, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import UserRole


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        # One login per technician
        UniqueConstraint("technician_id", name="uq_users_technician_id"),
        # Field Technician accounts must be linked to a technician; other roles must not be
        CheckConstraint(
            "(role = 'Field Technician') = (technician_id IS NOT NULL)",
            name="ck_users_technician_role",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(100))
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", values_callable=lambda e: [m.value for m in e])
    )
    technician_id: Mapped[int | None] = mapped_column(
        ForeignKey("technicians.id", name="fk_users_technician_id")
    )

    technician: Mapped["Technician | None"] = relationship()