import argparse
import getpass
import sys

from sqlalchemy import select

from app.database import SessionLocal
from app.models import Technician, User
from app.models.enums import UserRole
from app.security import hash_password

ROLES = {
    "admin": UserRole.ADMIN,
    "technician": UserRole.TECHNICIAN,
    "auditor": UserRole.AUDITOR,
}


def main():
    parser = argparse.ArgumentParser(description="Create a CashCow user")
    parser.add_argument("email")
    parser.add_argument("full_name")
    parser.add_argument("--role", required=True, choices=ROLES)
    parser.add_argument(
        "--technician-id",
        type=int,
        help="the technician this login belongs to (required for the technician role)",
    )
    args = parser.parse_args()

    role = ROLES[args.role]
    if role == UserRole.TECHNICIAN and args.technician_id is None:
        sys.exit("The technician role requires --technician-id")
    if role != UserRole.TECHNICIAN and args.technician_id is not None:
        sys.exit("--technician-id is only for the technician role")

    password = getpass.getpass("Password: ")
    if getpass.getpass("Confirm password: ") != password:
        sys.exit("Passwords do not match")
    if len(password) < 8:
        sys.exit("Password must be at least 8 characters")

    email = args.email.lower()
    try:
        hashed = hash_password(password)
    except ValueError as error:
        sys.exit(str(error))

    with SessionLocal() as db:
        if db.scalar(select(User).where(User.email == email)):
            sys.exit(f"A user with email {email} already exists")
        if args.technician_id is not None:
            if db.get(Technician, args.technician_id) is None:
                sys.exit(f"There is no technician with id {args.technician_id}")
            if db.scalar(select(User).where(User.technician_id == args.technician_id)):
                sys.exit(f"Technician {args.technician_id} already has a login")
        db.add(
            User(
                email=email,
                full_name=args.full_name,
                hashed_password=hashed,
                role=role,
                technician_id=args.technician_id,
            )
        )
        db.commit()
    print(f"Created {role.value} {email}")


if __name__ == "__main__":
    main()