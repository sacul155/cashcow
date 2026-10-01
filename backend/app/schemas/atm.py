from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ATMStatus


class ATMCreate(BaseModel):
    serial_number: str = Field(pattern=r"^[0-9]{5}$")
    model: str = Field(min_length=1, max_length=100)
    status: ATMStatus = ATMStatus.OPERATIONAL
    cash_level: Decimal = Field(default=Decimal("0"), ge=0, le=10000, max_digits=12, decimal_places=2)
    branch_id: int


class ATMUpdate(BaseModel):
    model: str | None = Field(default=None, min_length=1, max_length=100)
    status: ATMStatus | None = None
    cash_level: Decimal | None = Field(default=None, ge=0, le=10000, max_digits=12, decimal_places=2)


class ATMRead(ATMCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)