import argparse
import getpass
import sys

from sqlalchemy import select

from app.database import SessionLocal
from app.models import User
from app.security import hash_password


def main():
    parser = argparse.ArgumentParser(description="Create a CashCow user")
    parser.add_argument("email")
    parser.add_argument("full_name")
    args = parser.parse_args()

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
        db.add(User(email=email, full_name=args.full_name, hashed_password=hashed))
        db.commit()
    print(f"Created user {email}")


if __name__ == "__main__":
    main()