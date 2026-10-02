from pydantic import BaseModel, ConfigDict, Field


class BranchCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    region: str = Field(min_length=1, max_length=100)
    capacity: int = Field(gt=0)
    supervisor_id: int


class BranchRead(BranchCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


class BranchUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    region: str | None = Field(default=None, min_length=1, max_length=100)
    capacity: int | None = Field(default=None, gt=0)
    supervisor_id: int | None = None