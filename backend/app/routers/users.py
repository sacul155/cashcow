from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import admin_only
from app.models import Technician, User
from app.models.enums import UserRole
from app.routers.utils import get_or_404
from app.schemas.auth import UserRead
from app.schemas.user import UserCreate, UserUpdate
from app.security import hash_password

# Every route here is for Operations Admins only
router = APIRouter(prefix="/users", tags=["users"])


def check_role_link(db: Session, role: UserRole, technician_id: int | None, user_id: int | None = None):
    """A Field Technician login must be linked to exactly one technician; other roles must not."""
    if role == UserRole.TECHNICIAN:
        if technician_id is None:
            raise HTTPException(
                status_code=422, detail="A Field Technician account must be linked to a technician"
            )
        get_or_404(db, Technician, technician_id, "Technician")
        already_linked = db.scalar(
            select(User).where(User.technician_id == technician_id, User.id != user_id)
        )
        if already_linked:
            raise HTTPException(status_code=409, detail="That technician already has a login")
    elif technician_id is not None:
        raise HTTPException(
            status_code=422, detail="Only Field Technician accounts can be linked to a technician"
        )


def hash_or_422(password: str) -> str:
    try:
        return hash_password(password)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error))


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreate, db: Session = Depends(get_db), _: User = Depends(admin_only)):
    email = data.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="A user with that email already exists")
    check_role_link(db, data.role, data.technician_id)
    user = User(
        email=email,
        full_name=data.full_name,
        hashed_password=hash_or_422(data.password),
        role=data.role,
        technician_id=data.technician_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("", response_model=list[UserRead], dependencies=[Depends(admin_only)])
def list_users(db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.id)).all()


@router.get("/{user_id}", response_model=UserRead, dependencies=[Depends(admin_only)])
def get_user(user_id: int, db: Session = Depends(get_db)):
    return get_or_404(db, User, user_id, "User")


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    user = get_or_404(db, User, user_id, "User")
    # Only fields the client sent. technician_id may be null (unlink); the rest may not.
    changes = {
        field: value
        for field, value in data.model_dump(exclude_unset=True).items()
        if value is not None or field == "technician_id"
    }

    new_role = changes.get("role", user.role)
    if "technician_id" in changes:
        new_technician_id = changes["technician_id"]
    elif new_role == UserRole.TECHNICIAN:
        new_technician_id = user.technician_id
    else:
        new_technician_id = None  # moving away from Field Technician unlinks the technician

    if new_role != user.role and user.id == current_user.id:
        raise HTTPException(status_code=409, detail="You cannot change your own role")
    check_role_link(db, new_role, new_technician_id, user_id=user.id)

    user.role = new_role
    user.technician_id = new_technician_id
    if "full_name" in changes:
        user.full_name = changes["full_name"]
    if "password" in changes:
        user.hashed_password = hash_or_422(changes["password"])
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int, db: Session = Depends(get_db), current_user: User = Depends(admin_only)
):
    user = get_or_404(db, User, user_id, "User")
    if user.id == current_user.id:
        raise HTTPException(status_code=409, detail="You cannot delete your own account")
    db.delete(user)
    db.commit()