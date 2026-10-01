from decimal import Decimal

from pydantic import BaseModel

from app.models.enums import ServiceStatus


class LowCashATM(BaseModel):
    id: int
    serial_number: str
    model: str
    cash_level: Decimal
    percent_full: float
    branch_id: int
    branch_name: str


class BranchCount(BaseModel):
    branch_id: int
    branch_name: str
    count: int


class LowCashReport(BaseModel):
    threshold_amount: Decimal
    total: int
    by_branch: list[BranchCount]
    atms: list[LowCashATM]


class TechnicianMismatch(BaseModel):
    service_call_id: int
    service_call_title: str
    service_call_status: ServiceStatus
    technician_id: int
    technician_name: str
    technician_branch_id: int
    technician_branch_name: str
    atm_id: int
    atm_serial_number: str
    atm_branch_id: int
    atm_branch_name: str


class ModelCompletion(BaseModel):
    model: str
    completed: int
    failed: int
    finished: int
    completed_percent: float | None  # None when the model has no finished calls
    failed_percent: float | None


class MaintenanceAlert(BaseModel):
    branch_id: int
    branch_name: str
    region: str
    maintenance_atms: int
    total_atms: int
    percent_in_maintenance: float


class SupervisorWorkload(BaseModel):
    supervisor_id: int
    technicians: int
    active_calls: int


class DashboardSummary(BaseModel):
    total_atms: int
    atms_by_status: dict[str, int]
    service_calls_by_status: dict[str, int]
    open_service_calls: int
    critical_open_service_calls: int


class Dashboard(BaseModel):
    summary: DashboardSummary
    low_cash: LowCashReport
    technician_mismatches: list[TechnicianMismatch]
    completion_by_model: list[ModelCompletion]
    maintenance_alerts: list[MaintenanceAlert]
    technicians_by_supervisor: list[SupervisorWorkload]