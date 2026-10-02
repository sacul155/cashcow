from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.access import get_visible_report, get_visible_service_call, visible_reports
from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models import Report, User
from app.models.enums import UserRole
from app.schemas.report import ReportCreate, ReportRead

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
def create_report(
    data: ReportCreate,
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.TECHNICIAN)),
    db: Session = Depends(get_db),
):
    # A technician can only attach reports to their own service calls (else 404)
    get_visible_service_call(db, user, data.service_call_id)
    report = Report(**data.model_dump())
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("", response_model=list[ReportRead])
def list_reports(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(visible_reports(select(Report).order_by(Report.id), user)).all()


@router.get("/{report_id}", response_model=ReportRead)
def get_report(report_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_visible_report(db, user, report_id)