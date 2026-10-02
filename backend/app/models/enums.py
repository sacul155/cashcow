from enum import Enum

class ATMStatus(str, Enum):
    OPERATIONAL = "Operational"
    IN_TRANSPORT = "In-Transport"
    MAINTENANCE = "Maintenance"
    OFFLINE = "Offline"

class ServicePriority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    CRITICAL = "Critical"

class ServiceStatus(str, Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In-Progress"
    COMPLETED = "Completed"
    FAILED = "Failed"

class UserRole(str, Enum):
    ADMIN = "Operations Admin"
    TECHNICIAN = "Field Technician"
    AUDITOR = "Auditor"

# A service call that is still open
ACTIVE_CALL_STATUSES = (ServiceStatus.PENDING, ServiceStatus.IN_PROGRESS)