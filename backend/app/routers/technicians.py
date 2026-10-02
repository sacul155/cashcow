from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import admin_only, read_all
from app.models import Branch, ServiceCall, Technician, User
from app.routers.utils import get_or_404
from app.schemas.technician import TechnicianCreate, TechnicianRead, TechnicianUpdate

router = APIRouter(prefix="/technicians", tags=["technicians"])


@router.post(
    "",
    response_model=TechnicianRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(admin_only)],
)
def create_technician(data: TechnicianCreate, db: Session = Depends(get_db)):
    get_or_404(db, Branch, data.branch_id, "Branch")
    technician = Technician(**data.model_dump())
    db.add(technician)
    db.commit()
    db.refresh(technician)
    return technician


@router.get("", response_model=list[TechnicianRead], dependencies=[Depends(read_all)])
def list_technicians(db: Session = Depends(get_db)):
    return db.scalars(select(Technician).order_by(Technician.id)).all()


@router.get("/{technician_id}", response_model=TechnicianRead, dependencies=[Depends(read_all)])
def get_technician(technician_id: int, db: Session = Depends(get_db)):
    return get_or_404(db, Technician, technician_id, "Technician")


@router.patch(
    "/{technician_id}", response_model=TechnicianRead, dependencies=[Depends(admin_only)]
)
def update_technician(technician_id: int, data: TechnicianUpdate, db: Session = Depends(get_db)):
    technician = get_or_404(db, Technician, technician_id, "Technician")
    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    if "branch_id" in changes:
        get_or_404(db, Branch, changes["branch_id"], "Branch")
    for field, value in changes.items():
        setattr(technician, field, value)
    db.commit()
    db.refresh(technician)
    return technician


@router.delete(
    "/{technician_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(admin_only)]
)
def delete_technician(technician_id: int, db: Session = Depends(get_db)):
    technician = get_or_404(db, Technician, technician_id, "Technician")
    has_calls = db.scalar(select(exists().where(ServiceCall.technician_id == technician_id)))
    has_login = db.scalar(select(exists().where(User.technician_id == technician_id)))
    if has_calls or has_login:
        raise HTTPException(
            status_code=409,
            detail="Technician still has service calls or a login account; remove those first",
        )
    db.delete(technician)
    db.commit()