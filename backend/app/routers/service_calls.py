from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.access import get_visible_service_call, visible_service_calls
from app.database import get_db
from app.dependencies import admin_only, get_current_user, require_roles
from app.models import ATM, ServiceCall, Technician, User
from app.models.enums import ServiceStatus, UserRole
from app.routers.utils import get_or_404
from app.schemas.service_call import (
    ServiceCallCreate,
    ServiceCallRead,
    ServiceCallStatusUpdate,
    ServiceCallUpdate,
)

router = APIRouter(prefix="/service-calls", tags=["service calls"])

# The only status changes a Field Technician may make (Admins may set any status)
TECHNICIAN_TRANSITIONS = {
    ServiceStatus.PENDING: {ServiceStatus.IN_PROGRESS},
    ServiceStatus.IN_PROGRESS: {ServiceStatus.COMPLETED, ServiceStatus.FAILED},
}


@router.post(
    "",
    response_model=ServiceCallRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(admin_only)],
)
def create_service_call(data: ServiceCallCreate, db: Session = Depends(get_db)):
    get_or_404(db, ATM, data.atm_id, "ATM")
    if data.technician_id is not None:
        get_or_404(db, Technician, data.technician_id, "Technician")
    service_call = ServiceCall(**data.model_dump())
    db.add(service_call)
    db.commit()
    db.refresh(service_call)
    return service_call


@router.get("", response_model=list[ServiceCallRead])
def list_service_calls(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    statement = (
        select(ServiceCall)
        .options(
            joinedload(ServiceCall.atm).joinedload(ATM.branch),
            joinedload(ServiceCall.technician),
        )
        .order_by(ServiceCall.id)
    )
    return db.scalars(visible_service_calls(statement, user)).all()


@router.get("/{service_call_id}", response_model=ServiceCallRead)
def get_service_call(
    service_call_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return get_visible_service_call(db, user, service_call_id)


@router.patch(
    "/{service_call_id}", response_model=ServiceCallRead, dependencies=[Depends(admin_only)]
)
def update_service_call(
    service_call_id: int, data: ServiceCallUpdate, db: Session = Depends(get_db)
):
    service_call = get_or_404(db, ServiceCall, service_call_id, "Service call")
    # Only fields the client sent. technician_id may be null (unassign); the rest may not.
    changes = {
        field: value
        for field, value in data.model_dump(exclude_unset=True).items()
        if value is not None or field == "technician_id"
    }
    if changes.get("technician_id") is not None:
        get_or_404(db, Technician, changes["technician_id"], "Technician")
    for field, value in changes.items():
        setattr(service_call, field, value)
    db.commit()
    db.refresh(service_call)
    return service_call


@router.patch("/{service_call_id}/status", response_model=ServiceCallRead)
def change_service_call_status(
    service_call_id: int,
    data: ServiceCallStatusUpdate,
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.TECHNICIAN)),
    db: Session = Depends(get_db),
):
    # For a technician this only finds calls assigned to them (anything else is a 404)
    service_call = get_visible_service_call(db, user, service_call_id)
    if user.role == UserRole.TECHNICIAN:
        allowed = TECHNICIAN_TRANSITIONS.get(service_call.status, set())
        if data.status not in allowed:
            raise HTTPException(
                status_code=409,
                detail=f"A technician cannot change a call from "
                f"{service_call.status.value} to {data.status.value}",
            )
    service_call.status = data.status
    db.commit()
    db.refresh(service_call)
    return service_call


@router.delete(
    "/{service_call_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(admin_only)],
)
def delete_service_call(service_call_id: int, db: Session = Depends(get_db)):
    service_call = get_or_404(db, ServiceCall, service_call_id, "Service call")
    db.delete(service_call)  # its reports are deleted with it (see the model's cascade)
    db.commit()