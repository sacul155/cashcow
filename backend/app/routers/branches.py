from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import admin_only, read_all
from app.models import ATM, Branch, Technician
from app.routers.utils import get_or_404
from app.schemas.branch import BranchCreate, BranchRead, BranchUpdate

router = APIRouter(prefix="/branches", tags=["branches"])


@router.post(
    "",
    response_model=BranchRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(admin_only)],
)
def create_branch(data: BranchCreate, db: Session = Depends(get_db)):
    branch = Branch(**data.model_dump())
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch


@router.get("", response_model=list[BranchRead], dependencies=[Depends(read_all)])
def list_branches(db: Session = Depends(get_db)):
    return db.scalars(select(Branch).order_by(Branch.id)).all()


@router.get("/{branch_id}", response_model=BranchRead, dependencies=[Depends(read_all)])
def get_branch(branch_id: int, db: Session = Depends(get_db)):
    return get_or_404(db, Branch, branch_id, "Branch")


@router.patch("/{branch_id}", response_model=BranchRead, dependencies=[Depends(admin_only)])
def update_branch(branch_id: int, data: BranchUpdate, db: Session = Depends(get_db)):
    branch = get_or_404(db, Branch, branch_id, "Branch")
    # Only fields the client sent; explicit nulls are ignored (no branch column is optional)
    for field, value in data.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(branch, field, value)
    db.commit()
    db.refresh(branch)
    return branch


@router.delete(
    "/{branch_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(admin_only)]
)
def delete_branch(branch_id: int, db: Session = Depends(get_db)):
    branch = get_or_404(db, Branch, branch_id, "Branch")
    has_atms = db.scalar(select(exists().where(ATM.branch_id == branch_id)))
    has_technicians = db.scalar(select(exists().where(Technician.branch_id == branch_id)))
    if has_atms or has_technicians:
        raise HTTPException(
            status_code=409,
            detail="Branch still has ATMs or technicians; move or delete them first",
        )
    db.delete(branch)
    db.commit()