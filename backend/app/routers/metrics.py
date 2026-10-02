from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import metrics
from app.database import get_db
from app.dependencies import read_all
from app.schemas.metrics import (
    Dashboard,
    LowCashReport,
    MaintenanceAlert,
    ModelCompletion,
    SupervisorWorkload,
    TechnicianMismatch,
)

router = APIRouter(prefix="/metrics", tags=["metrics"], dependencies=[Depends(read_all)])

@router.get("/low-cash-atms", response_model=LowCashReport)
def get_low_cash_atms(db: Session = Depends(get_db)):
    return metrics.low_cash_atms(db)


@router.get("/technician-mismatches", response_model=list[TechnicianMismatch])
def get_technician_mismatches(db: Session = Depends(get_db)):
    return metrics.technician_mismatches(db)


@router.get("/completion-by-model", response_model=list[ModelCompletion])
def get_completion_by_model(db: Session = Depends(get_db)):
    return metrics.completion_by_model(db)


@router.get("/maintenance-alerts", response_model=list[MaintenanceAlert])
def get_maintenance_alerts(db: Session = Depends(get_db)):
    return metrics.maintenance_alerts(db)


@router.get("/technicians-by-supervisor", response_model=list[SupervisorWorkload])
def get_technicians_by_supervisor(db: Session = Depends(get_db)):
    return metrics.technicians_by_supervisor(db)


@router.get("/dashboard", response_model=Dashboard)
def get_dashboard(db: Session = Depends(get_db)):
    return metrics.dashboard(db)