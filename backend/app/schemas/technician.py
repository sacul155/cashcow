from pydantic import BaseModel, ConfigDict, Field


class TechnicianCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    branch_id: int


class TechnicianRead(TechnicianCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


class TechnicianUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    branch_id: int | None = None