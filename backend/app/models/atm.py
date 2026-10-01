from decimal import Decimal

from sqlalchemy import Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import ATMStatus


class ATM(Base):
    __tablename__ = "atms"

    id: Mapped[int] = mapped_column(primary_key=True)
    serial_number: Mapped[str] = mapped_column(String(50), unique=True)
    model: Mapped[str] = mapped_column(String(100))
    status: Mapped[ATMStatus] = mapped_column(
        Enum(ATMStatus, name="atm_status", values_callable=lambda e: [m.value for m in e]),
        default=ATMStatus.OPERATIONAL,
    )
    cash_level: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.id"))

    branch: Mapped["Branch"] = relationship(back_populates="atms")
    service_calls: Mapped[list["ServiceCall"]] = relationship(back_populates="atm")