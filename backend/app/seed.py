import argparse
import sys
from decimal import Decimal

from sqlalchemy import delete, text

from app.database import SessionLocal
from app.models import ATM, Branch, Report, ServiceCall, Technician, User
from app.models.enums import ATMStatus, ServicePriority, ServiceStatus

OPERATIONAL = ATMStatus.OPERATIONAL
IN_TRANSPORT = ATMStatus.IN_TRANSPORT
MAINTENANCE = ATMStatus.MAINTENANCE
OFFLINE = ATMStatus.OFFLINE

LOW = ServicePriority.LOW
MEDIUM = ServicePriority.MEDIUM
CRITICAL = ServicePriority.CRITICAL

PENDING = ServiceStatus.PENDING
IN_PROGRESS = ServiceStatus.IN_PROGRESS
COMPLETED = ServiceStatus.COMPLETED
FAILED = ServiceStatus.FAILED

# name, region, capacity, supervisor_id
BRANCHES = [
    ("Downtown", "Northeast", 8, 101),
    ("Harbor", "Northeast", 8, 101),
    ("Lakeside", "Midwest", 8, 102),
    ("Summit", "Midwest", 8, 102),
    ("Riverside", "West", 8, 103),
]

# Two technicians per branch, in branch order: technicians 1-2 -> Downtown, 3-4 -> Harbor, ...
TECHNICIANS = [
    "Alex Rivera", "Priya Nair",
    "Marcus Lee", "Sofia Garcia",
    "Daniel Kim", "Hannah Brooks",
    "Omar Hassan", "Lena Fischer",
    "Tomas Silva", "Grace Okafor",
]

MODELS = ["NCR SelfServ 84", "Diebold Nixdorf DN 200", "Hyosung MX 8600"]

# model index, status, cash_level. Four ATMs per branch, in branch order:
# ATMs 1-4 -> Downtown, 5-8 -> Harbor, 9-12 -> Lakeside, 13-16 -> Summit, 17-20 -> Riverside
ATMS = [
    (0, MAINTENANCE, "6500.00"),   # 1  Downtown: 2 of 4 in maintenance (50%) -> alert
    (1, MAINTENANCE, "4200.00"),   # 2
    (2, OPERATIONAL, "1200.00"),   # 3  low cash
    (0, OPERATIONAL, "8800.00"),   # 4
    (1, MAINTENANCE, "3000.00"),   # 5  Harbor: 1 of 4 in maintenance (25%) -> no alert
    (2, OPERATIONAL, "950.00"),    # 6  low cash
    (0, OPERATIONAL, "7400.00"),   # 7
    (1, OPERATIONAL, "2000.00"),   # 8  exactly 20% -> NOT low cash (boundary case)
    (2, MAINTENANCE, "5100.00"),   # 9  Lakeside: 2 of 4 in maintenance (50%) -> alert
    (0, MAINTENANCE, "9000.00"),   # 10
    (1, OPERATIONAL, "1750.00"),   # 11 low cash
    (2, OPERATIONAL, "6300.00"),   # 12
    (0, OFFLINE, "4000.00"),       # 13 Summit
    (1, IN_TRANSPORT, "5000.00"),  # 14
    (2, OPERATIONAL, "1500.00"),   # 15 low cash
    (0, OPERATIONAL, "9500.00"),   # 16
    (1, OPERATIONAL, "800.00"),    # 17 Riverside, low cash
    (2, OPERATIONAL, "6000.00"),   # 18
    (0, OPERATIONAL, "10000.00"),  # 19 full reserve
    (1, OPERATIONAL, "4400.00"),   # 20
]

# title, priority, status, atm number, technician number (None = unassigned)
SERVICE_CALLS = [
    # Active calls where the technician is NOT at the ATM's branch (3 mismatches)
    ("Card reader jammed", CRITICAL, IN_PROGRESS, 4, 3),         # ATM Downtown, tech Harbor
    ("Cash dispenser fault", MEDIUM, IN_PROGRESS, 7, 5),         # ATM Harbor, tech Lakeside
    ("Screen unresponsive", LOW, PENDING, 16, 9),                # ATM Summit, tech Riverside
    # Active calls where the technician is at the right branch
    ("Receipt printer out of paper", LOW, IN_PROGRESS, 12, 6),   # Lakeside / Lakeside
    ("Network connectivity loss", CRITICAL, PENDING, 19, 10),    # Riverside / Riverside
    # Active call not yet assigned
    ("Cash refill needed", CRITICAL, PENDING, 3, None),
    # Finished calls (ATM models: 1 -> 100% completed, 2 -> 50/50, 3 -> 0% completed)
    ("Keypad replaced", MEDIUM, COMPLETED, 1, 1),                # NCR
    ("Cassette jam cleared", MEDIUM, COMPLETED, 5, 4),           # Diebold
    ("Card skimmer inspection", CRITICAL, FAILED, 8, 3),         # Diebold
    ("Software update", LOW, FAILED, 9, 5),                      # Hyosung
]

# service call number, file_url, notes
REPORTS = [
    (7, "https://example.com/reports/keypad-replacement.pdf", "Keypad replaced and tested."),
    (8, "https://example.com/reports/cassette-jam.pdf", "Cleared jam; no hardware damage."),
]


def seed(db):
    # Field Technician logins point at technician rows that are about to be replaced, so they
    # are removed too. Admin and Auditor accounts are left alone.
    db.execute(delete(User).where(User.technician_id.is_not(None)))
    # Delete children before parents, then restart the id counters so ids begin at 1 again.
    # (TRUNCATE ... CASCADE would also wipe the users table, which references technicians.)
    for model in (Report, ServiceCall, ATM, Technician, Branch):
        db.execute(delete(model))
    for table in ("reports", "service_calls", "atms", "technicians", "branches"):
        db.execute(text(f"ALTER SEQUENCE {table}_id_seq RESTART WITH 1"))

    branches = [
        Branch(name=name, region=region, capacity=capacity, supervisor_id=supervisor_id)
        for name, region, capacity, supervisor_id in BRANCHES
    ]
    db.add_all(branches)
    db.flush()  # sends the INSERTs so each row gets its id

    technicians = [
        Technician(name=name, branch_id=branches[index // 2].id)
        for index, name in enumerate(TECHNICIANS)
    ]
    atms = [
        ATM(
            serial_number=str(10000 + number),
            model=MODELS[model_index],
            status=status,
            cash_level=Decimal(cash_level),
            branch_id=branches[(number - 1) // 4].id,
        )
        for number, (model_index, status, cash_level) in enumerate(ATMS, start=1)
    ]
    db.add_all(technicians + atms)
    db.flush()

    service_calls = [
        ServiceCall(
            title=title,
            priority=priority,
            status=status,
            atm_id=atms[atm_number - 1].id,
            technician_id=None if tech_number is None else technicians[tech_number - 1].id,
        )
        for title, priority, status, atm_number, tech_number in SERVICE_CALLS
    ]
    db.add_all(service_calls)
    db.flush()

    db.add_all(
        Report(
            file_url=file_url,
            notes=notes,
            service_call_id=service_calls[call_number - 1].id,
        )
        for call_number, file_url, notes in REPORTS
    )
    db.commit()


def main():
    parser = argparse.ArgumentParser(description="Load sample data into the CashCow database")
    parser.add_argument("--yes", action="store_true", help="skip the confirmation prompt")
    args = parser.parse_args()

    if not args.yes:
        answer = input(
            "This DELETES all branches, technicians, ATMs, service calls and reports, "
            "then loads sample data.\n(Admin and Auditor logins are kept; Field Technician logins are removed.) "
            "Type 'yes' to continue: "
        )
        if answer.strip().lower() != "yes":
            sys.exit("Cancelled")

    with SessionLocal() as db:
        seed(db)
    print("Seeded 5 branches, 10 technicians, 20 ATMs, 10 service calls, 2 reports")


if __name__ == "__main__":
    main()