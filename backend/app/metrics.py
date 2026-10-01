from collections import Counter

from sqlalchemy import func, select
from sqlalchemy.orm import Session, aliased

from app.config import settings
from app.models import ATM, Branch, ServiceCall, Technician
from app.models.enums import ATMStatus, ServicePriority, ServiceStatus
from app.schemas.metrics import (
    BranchCount,
    Dashboard,
    DashboardSummary,
    LowCashATM,
    LowCashReport,
    MaintenanceAlert,
    ModelCompletion,
    SupervisorWorkload,
    TechnicianMismatch,
)

ACTIVE_CALL_STATUSES = (ServiceStatus.PENDING, ServiceStatus.IN_PROGRESS)


def percent(part: int, whole: int) -> float:
    return round(part * 100 / whole, 1)


def low_cash_atms(db: Session) -> LowCashReport:
    """Operational ATMs holding less than the low-cash share of a full reserve."""
    threshold_amount = settings.atm_cash_capacity * settings.low_cash_threshold
    rows = db.execute(
        select(ATM, Branch.name)
        .join(Branch, Branch.id == ATM.branch_id)
        .where(ATM.status == ATMStatus.OPERATIONAL, ATM.cash_level < threshold_amount)
        .order_by(ATM.cash_level, ATM.id)
    ).all()

    atms = [
        LowCashATM(
            id=atm.id,
            serial_number=atm.serial_number,
            model=atm.model,
            cash_level=atm.cash_level,
            percent_full=percent(atm.cash_level, settings.atm_cash_capacity),
            branch_id=atm.branch_id,
            branch_name=branch_name,
        )
        for atm, branch_name in rows
    ]
    per_branch = Counter((atm.branch_id, atm.branch_name) for atm in atms)
    by_branch = [
        BranchCount(branch_id=branch_id, branch_name=branch_name, count=count)
        for (branch_id, branch_name), count in sorted(per_branch.items())
    ]
    return LowCashReport(
        threshold_amount=threshold_amount, total=len(atms), by_branch=by_branch, atms=atms
    )


def technician_mismatches(db: Session) -> list[TechnicianMismatch]:
    """Active service calls whose technician works at a different branch than the ATM."""
    technician_branch = aliased(Branch)
    atm_branch = aliased(Branch)
    rows = db.execute(
        select(ServiceCall, Technician, ATM, technician_branch.name, atm_branch.name)
        .select_from(ServiceCall)
        .join(Technician, Technician.id == ServiceCall.technician_id)
        .join(ATM, ATM.id == ServiceCall.atm_id)
        .join(technician_branch, technician_branch.id == Technician.branch_id)
        .join(atm_branch, atm_branch.id == ATM.branch_id)
        .where(
            ServiceCall.status.in_(ACTIVE_CALL_STATUSES),
            Technician.branch_id != ATM.branch_id,
        )
        .order_by(ServiceCall.id)
    ).all()

    return [
        TechnicianMismatch(
            service_call_id=call.id,
            service_call_title=call.title,
            service_call_status=call.status,
            technician_id=technician.id,
            technician_name=technician.name,
            technician_branch_id=technician.branch_id,
            technician_branch_name=technician_branch_name,
            atm_id=atm.id,
            atm_serial_number=atm.serial_number,
            atm_branch_id=atm.branch_id,
            atm_branch_name=atm_branch_name,
        )
        for call, technician, atm, technician_branch_name, atm_branch_name in rows
    ]


def completion_by_model(db: Session) -> list[ModelCompletion]:
    """Completed vs failed service calls (as a percentage of finished calls) per ATM model."""
    rows = db.execute(
        select(
            ATM.model,
            func.count(ServiceCall.id).filter(ServiceCall.status == ServiceStatus.COMPLETED),
            func.count(ServiceCall.id).filter(ServiceCall.status == ServiceStatus.FAILED),
        )
        .select_from(ATM)
        .outerjoin(ServiceCall, ServiceCall.atm_id == ATM.id)
        .group_by(ATM.model)
        .order_by(ATM.model)
    ).all()

    results = []
    for model, completed, failed in rows:
        finished = completed + failed
        results.append(
            ModelCompletion(
                model=model,
                completed=completed,
                failed=failed,
                finished=finished,
                completed_percent=percent(completed, finished) if finished else None,
                failed_percent=percent(failed, finished) if finished else None,
            )
        )
    return results


def maintenance_alerts(db: Session) -> list[MaintenanceAlert]:
    """Branches where more than the alert share of ATMs are in maintenance."""
    rows = db.execute(
        select(
            Branch.id,
            Branch.name,
            Branch.region,
            func.count(ATM.id).filter(ATM.status == ATMStatus.MAINTENANCE),
            func.count(ATM.id),
        )
        .join(ATM, ATM.branch_id == Branch.id)
        .group_by(Branch.id)
        .order_by(Branch.id)
    ).all()

    return [
        MaintenanceAlert(
            branch_id=branch_id,
            branch_name=name,
            region=region,
            maintenance_atms=in_maintenance,
            total_atms=total,
            percent_in_maintenance=percent(in_maintenance, total),
        )
        for branch_id, name, region, in_maintenance, total in rows
        if in_maintenance > settings.maintenance_alert_threshold * total
    ]


def technicians_by_supervisor(db: Session) -> list[SupervisorWorkload]:
    """Technicians with at least one active call, grouped by their branch's supervisor."""
    rows = db.execute(
        select(
            Branch.supervisor_id,
            func.count(func.distinct(Technician.id)),
            func.count(ServiceCall.id),
        )
        .select_from(ServiceCall)
        .join(Technician, Technician.id == ServiceCall.technician_id)
        .join(Branch, Branch.id == Technician.branch_id)
        .where(ServiceCall.status.in_(ACTIVE_CALL_STATUSES))
        .group_by(Branch.supervisor_id)
        .order_by(Branch.supervisor_id)
    ).all()

    return [
        SupervisorWorkload(supervisor_id=supervisor_id, technicians=technicians, active_calls=calls)
        for supervisor_id, technicians, calls in rows
    ]


def summary(db: Session) -> DashboardSummary:
    """Headline counts for the dashboard cards."""
    atm_counts = dict(db.execute(select(ATM.status, func.count()).group_by(ATM.status)).all())
    call_counts = dict(
        db.execute(select(ServiceCall.status, func.count()).group_by(ServiceCall.status)).all()
    )
    critical_open = db.scalar(
        select(func.count()).where(
            ServiceCall.status.in_(ACTIVE_CALL_STATUSES),
            ServiceCall.priority == ServicePriority.CRITICAL,
        )
    )
    return DashboardSummary(
        total_atms=sum(atm_counts.values()),
        # Every status is listed, even with a count of 0, so the frontend can rely on the keys
        atms_by_status={status.value: atm_counts.get(status, 0) for status in ATMStatus},
        service_calls_by_status={
            status.value: call_counts.get(status, 0) for status in ServiceStatus
        },
        open_service_calls=sum(call_counts.get(status, 0) for status in ACTIVE_CALL_STATUSES),
        critical_open_service_calls=critical_open,
    )


def dashboard(db: Session) -> Dashboard:
    return Dashboard(
        summary=summary(db),
        low_cash=low_cash_atms(db),
        technician_mismatches=technician_mismatches(db),
        completion_by_model=completion_by_model(db),
        maintenance_alerts=maintenance_alerts(db),
        technicians_by_supervisor=technicians_by_supervisor(db),
    )