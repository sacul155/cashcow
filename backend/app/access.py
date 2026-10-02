from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ATM, Report, ServiceCall, User
from app.models.enums import ACTIVE_CALL_STATUSES, UserRole

# Row-level rules. Admins and Auditors see every row. A Field Technician sees only:
#   - service calls assigned to them,
#   - reports on those calls,
#   - ATMs that have an active (Pending / In-Progress) call assigned to them.
# Anything outside that is reported as "not found", so its existence isn't revealed.


def visible_atms(statement, user: User):
    if user.role == UserRole.TECHNICIAN:
        assigned = select(ServiceCall.atm_id).where(
            ServiceCall.technician_id == user.technician_id,
            ServiceCall.status.in_(ACTIVE_CALL_STATUSES),
        )
        return statement.where(ATM.id.in_(assigned))
    return statement


def visible_service_calls(statement, user: User):
    if user.role == UserRole.TECHNICIAN:
        return statement.where(ServiceCall.technician_id == user.technician_id)
    return statement


def visible_reports(statement, user: User):
    if user.role == UserRole.TECHNICIAN:
        own_calls = select(ServiceCall.id).where(ServiceCall.technician_id == user.technician_id)
        return statement.where(Report.service_call_id.in_(own_calls))
    return statement


def get_visible_atm(db: Session, user: User, atm_id: int) -> ATM:
    atm = db.scalar(visible_atms(select(ATM).where(ATM.id == atm_id), user))
    if atm is None:
        raise HTTPException(status_code=404, detail="ATM not found")
    return atm


def get_visible_service_call(db: Session, user: User, service_call_id: int) -> ServiceCall:
    service_call = db.scalar(
        visible_service_calls(select(ServiceCall).where(ServiceCall.id == service_call_id), user)
    )
    if service_call is None:
        raise HTTPException(status_code=404, detail="Service call not found")
    return service_call


def get_visible_report(db: Session, user: User, report_id: int) -> Report:
    report = db.scalar(visible_reports(select(Report).where(Report.id == report_id), user))
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report