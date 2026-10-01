# CashCow Build Notes

A step-by-step, beginner-friendly log of how this project is built. Follow it top to bottom, starting from an empty folder, and you will end up with the same project.

> **Living document.** Each time we add something to the project, a new numbered step is appended here. Steps marked ✅ are done and verified in this repo. Steps under **Roadmap** are planned but not built yet.

---

## Table of Contents

1. [What we're building](#1-what-were-building)
2. [Technology choices and why](#2-technology-choices-and-why)
3. [Architecture](#3-architecture)
4. [Prerequisites](#4-prerequisites) (including [starting PostgreSQL](#starting-and-stopping-postgresql))
5. [Build steps](#5-build-steps)
6. [Roadmap](#6-roadmap)
7. [Glossary](#7-glossary)
8. [How to update this document](#8-how-to-update-this-document)

---

## 1. What we're building

**CashCow** is a full-stack web application that simulates the operations of a network of bank branches. Domain concepts we've modeled so far: ATMs (which can be idle, in transport, under maintenance, or offline) and service requests (which have a priority and a status).

"Full-stack" means we build all three layers of a typical web app:

| Layer | Job | Our tech |
|---|---|---|
| **Frontend** | What the user sees and clicks in the browser | React + Material UI |
| **Backend** | Business logic and rules; exposes an API | Python + FastAPI + Pydantic |
| **Database** | Stores data permanently | PostgreSQL (accessed via SQLAlchemy) |

---

## 2. Technology choices and why

If a term is unfamiliar, see the [Glossary](#7-glossary).

### Backend

- **Python 3.14** – A readable, beginner-friendly language with a huge ecosystem. Used for the whole backend.
- **FastAPI** – A web framework: it receives HTTP requests (e.g. "give me all ATMs") and returns responses. Chosen because it is fast, modern, and automatically generates interactive API documentation at `/docs`.
- **Uvicorn** – The server program that actually runs a FastAPI app and listens for network requests. (FastAPI defines *what* to do; Uvicorn *serves* it.)
- **Pydantic** – Validates data. If a request says `{"priority": "Banana"}`, Pydantic rejects it because it isn't a valid priority. It also converts data to and from JSON. FastAPI uses it under the hood.
- **pydantic-settings / python-dotenv** – Load configuration (like the database password) from a `.env` file so secrets never live in source code.
- **SQLAlchemy** – An **ORM** (Object-Relational Mapper). Lets us describe database tables as Python classes and query them with Python instead of hand-writing SQL.
- **Alembic** – Database **migrations**. As our models change (new column, new table), Alembic records each change as a versioned script so every developer's database stays in sync. Think "git for your database schema".
- **psycopg (v3)** – The driver that lets Python talk to PostgreSQL. SQLAlchemy uses it behind the scenes. `psycopg-binary` is a pre-compiled version so you don't need a C compiler.
- **PyJWT** – Creates and verifies **JSON Web Tokens**, used for login sessions (planned).
- **bcrypt** – Securely **hashes** passwords so we never store them in plain text (planned).

### Database

- **PostgreSQL** – A robust, free, open-source relational database. Chosen because bank-style data (accounts, transactions, relationships between records) fits tables and strict rules well.

### Frontend (planned)

- **React** – A JavaScript library for building user interfaces out of reusable components.
- **Material UI (MUI)** – A library of pre-built, good-looking React components (buttons, tables, forms) so we don't design everything from scratch.
- **Node.js** – Runs JavaScript tooling (dev server, package installs) on your computer.

### Tooling

- **Git** – Version control: tracks every change and lets you undo mistakes.
- **venv (virtual environment)** – A private folder of Python packages for this project only, so it can't conflict with other projects on your machine.
- **pip** – Python's package installer.

---

## 3. Architecture

```
┌────────────┐   HTTP/JSON    ┌──────────────────┐    SQL    ┌────────────┐
│  Browser   │ ─────────────► │  FastAPI backend │ ────────► │ PostgreSQL │
│ React + MUI│ ◄───────────── │  (Pydantic +     │ ◄──────── │            │
└────────────┘                │   SQLAlchemy)    │           └────────────┘
                              └──────────────────┘
```

1. The user does something in the browser (e.g. opens the ATM list).
2. React sends an HTTP request to the backend.
3. FastAPI receives it, Pydantic validates it.
4. SQLAlchemy translates Python operations into SQL and asks PostgreSQL.
5. The result travels back the same way as JSON, and React displays it.

### Folder structure (current)

```
cashcow/
├── .gitignore             # Files Git should not track
├── README.md              # One-paragraph project summary
├── BUILD_NOTES.md         # This document
└── backend/
    ├── requirements.txt   # Exact list of Python packages + versions
    ├── .env               # Real settings (NOT committed to git)
    ├── .env.example       # Template of the settings, safe to commit
    ├── .venv/             # Virtual environment (NOT committed to git)
    ├── alembic.ini        # Alembic settings
    ├── alembic/           # Migrations
    │   ├── env.py         # Connects Alembic to our database and models
    │   └── versions/      # One script per database change
    └── app/
        ├── config.py      # Loads settings from .env
        ├── database.py    # SQLAlchemy engine + session factory
        └── models/
            ├── __init__.py      # Imports every model (Alembic needs this)
            ├── base.py          # SQLAlchemy Base class all table models inherit from
            ├── enums.py         # Fixed sets of allowed values (statuses, priorities)
            ├── branch.py        # branches table
            ├── technician.py    # technicians table
            ├── atm.py           # atms table
            ├── service_call.py  # service_calls table
            └── report.py        # reports table
```

Why a separate `backend/` folder? The frontend will get its own `frontend/` folder later. Keeping them apart means each has its own dependencies and they can be developed and deployed independently.

---

## 4. Prerequisites

Install these once on your computer. Commands are for **macOS** with [Homebrew](https://brew.sh); on other systems use the official installers.

| Tool | Why | Install | Verify |
|---|---|---|---|
| Git | Version control | `xcode-select --install` (or `brew install git`) | `git --version` |
| Python 3.14 | Backend language | `brew install python@3.14` | `python3 --version` |
| PostgreSQL | Database | `brew install postgresql@17` then `brew services start postgresql@17` | `psql --version` |
| Node.js (via nvm) | Frontend tooling (used later) | See [nvm](https://github.com/nvm-sh/nvm) | `node --version` |

> "Verify" commands should print a version number. If you see `command not found`, the install didn't work or your terminal needs to be restarted.

### Starting and stopping PostgreSQL

PostgreSQL is a **server**: a program that must be running in the background before our backend can connect to it. Installing it doesn't always start it. If you installed with Homebrew, start it as a background service:

```bash
brew services start postgresql@17
```

This starts it now and automatically again at every login. Use your installed version in place of `17` if it differs (`brew list | grep postgres` shows it).

Check that it's running:

```bash
brew services list     # postgresql@17 should say "started"
pg_isready             # should print "accepting connections"
```

Other commands:

| Goal | Command |
|---|---|
| Stop it | `brew services stop postgresql@17` |
| Restart it | `brew services restart postgresql@17` |
| Start once, without auto-start at login | `/opt/homebrew/opt/postgresql@17/bin/pg_ctl -D /opt/homebrew/var/postgresql@17 start` |

**Troubleshooting**

- **`psql: command not found`** – Homebrew's versioned PostgreSQL isn't on your PATH by default. Add it, then open a new terminal:
  ```bash
  echo 'export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"' >> ~/.zshrc
  ```
- **`connection refused`, or an error mentioning a socket file** – the server isn't running. Start it with the command above. If it still fails, read the log at `/opt/homebrew/var/log/postgresql@17.log`.
- **Installed another way** – with Postgres.app, open the app and click Start. With the EDB installer, use its service controls.

---

## 5. Build steps

### Step 1 ✅ — Create the project folder and Git repository

**Why:** Git records the history of the project. We set it up first so every later change is tracked.

```bash
mkdir cashcow        # make a new folder
cd cashcow           # move into it
git init             # turn it into a Git repository
```

Create `README.md` with a short description of the project, then save your first snapshot (a "commit"):

```bash
git add README.md
git commit -m "Initial commit"
```

Optionally create an empty repository on GitHub and connect it so your work is backed up online (`git remote add origin <url>` then `git push -u origin main`).

---

### Step 2 ✅ — Create the backend folder and a virtual environment

**Why:** A virtual environment keeps this project's Python packages isolated from everything else on your computer. Without it, installing packages for one project can break another.

```bash
mkdir backend
cd backend
python3 -m venv .venv          # create the environment in a folder named .venv
source .venv/bin/activate      # "turn it on" for this terminal window
```

After activation your terminal prompt shows `(.venv)`. From now on, `python` and `pip` refer to the project's private copy.

> **Important:** You must re-run `source .venv/bin/activate` every time you open a new terminal to work on the backend. Run `deactivate` to turn it off.

---

### Step 3 ✅ — Install backend packages

**Why:** These are the libraries described in [Technology choices](#2-technology-choices-and-why).

With the virtual environment active (you see `(.venv)`), from `backend/`:

```bash
pip install fastapi "uvicorn[standard]" pydantic-settings \
            sqlalchemy alembic "psycopg[binary]" \
            pyjwt bcrypt python-dotenv
```

What the less obvious parts mean:

- `"uvicorn[standard]"` – the `[standard]` adds extras for speed and auto-reload during development (`uvloop`, `httptools`, `watchfiles`, `websockets`).
- `"psycopg[binary]"` – the database driver with pre-compiled components.
- Quotes stop the terminal from misreading the square brackets.

Now "freeze" the exact versions that were installed into a file:

```bash
pip freeze > requirements.txt
```

**Why:** `requirements.txt` lets anyone recreate the identical environment later with a single command:

```bash
pip install -r requirements.txt
```

---

### Step 4 ✅ — Create the application package and the SQLAlchemy `Base`

**Why:** SQLAlchemy needs one shared "base class". Every database table we define inherits from it, which is how SQLAlchemy discovers all of our tables (and how Alembic knows what to migrate later).

```bash
mkdir -p app/models
```

`backend/app/models/base.py`:

```python
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass
```

---

### Step 5 ✅ — Define enums (fixed sets of allowed values)

**Why:** Some fields should only ever hold a few specific values (an ATM's status, a request's priority). An **Enum** names those choices in one place, which prevents typos like `"Maintenence"` and makes the code self-documenting. Because each enum also inherits from `str`, values serialize cleanly to JSON and into database columns.

`backend/app/models/enums.py`:

```python
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
```

The left side (`OPERATIONAL`) is the name used in code; the right side (`"Operational"`) is the value stored in the database and shown to users.

> **Tip:** keep each member's name and stored value aligned (`OPERATIONAL` → `"Operational"`). Changing a stored value after real data exists requires a database migration, so settle these early.

---

### Step 6 ✅ — Keep generated files out of Git

**Why:** `.venv/` holds thousands of files that anyone can regenerate from `requirements.txt`. Committing it bloats the repo. Likewise `.env` files hold secrets and `__pycache__/` is auto-generated.

Create `.gitignore` in the project root with:

```
.venv/
__pycache__/
*.pyc
.env
.DS_Store
node_modules/
```

After saving, run `git status`: `.venv/`, `.DS_Store` and other ignored files no longer appear as untracked.

### Step 7 ✅ — Create the database and connect the backend to it

**Why:** Tables need a database to live in, and the backend needs to know where that database is. We keep that location in a `.env` file (so it is configuration, not code) and load it with `pydantic-settings`.

**7a. Make sure PostgreSQL is running** (see [Starting and stopping PostgreSQL](#starting-and-stopping-postgresql)), then create an empty database:

```bash
createdb cashcow
psql -l | grep cashcow      # the database should be listed
```

> **No dedicated database user (a deliberate shortcut).** Best practice is a separate PostgreSQL user that can only access this one database (so a bug or leaked password can't touch anything else), and you should create one before deploying anywhere real. For local development we skip it: PostgreSQL lets your own computer account connect through a local "socket" with no password, and the database is owned by that account.

**7b. Create `backend/.env`** with the connection string:

```
DATABASE_URL=postgresql+psycopg:///cashcow
```

Reading it left to right: `postgresql` is the database type, `+psycopg` is the driver from Step 3, and `///cashcow` means "no host or user given, connect locally to the database named `cashcow`". (With a dedicated user it would look like `postgresql+psycopg://cashcow_user:PASSWORD@localhost:5432/cashcow`.)

`.env` is listed in `.gitignore`, so it is never committed. Because a new developer won't have it, also commit a copy with no secrets, `.env.example`, that they can duplicate:

```bash
cp .env .env.example
```

**7c. Load the setting in `backend/app/config.py`:**

```python
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    database_url: str

    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env")


settings = Settings()
```

`Settings` is a Pydantic class: it reads `DATABASE_URL` from `.env` and refuses to start if it is missing. We build the path from the file's own location so it works no matter which folder you run commands from. Elsewhere in the app, `from app.config import settings` gives access to `settings.database_url`.

**7d. Create the database connection in `backend/app/database.py`:**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False)
```

- **Engine** – the object that manages connections to PostgreSQL.
- **Session** – a short "conversation" with the database (read some rows, change some, save). `SessionLocal` is a factory that makes a new one each time it is called.

**7e. Test it.** From the project root, with the virtual environment active:

```bash
cd backend
source .venv/bin/activate
python -c "
from sqlalchemy import text
from app.database import engine
with engine.connect() as c:
    print(c.execute(text('select current_database()')).one())
"
```

Expected output: `('cashcow',)`. If you get `connection refused`, PostgreSQL isn't running. If you get `database "cashcow" does not exist`, repeat 7a.

---

### Step 8 ✅ — Define the database table models

**Why:** A **model** is a Python class that describes one database table: each attribute becomes a column, and each instance of the class will be one row. Writing models first gives us a single, readable description of our data. In the next step Alembic will read them and build the real tables.

**What we're modeling:**

| Table | Columns | Notes |
|---|---|---|
| `branches` | id, name, region, capacity, supervisor_id | `supervisor_id` is a plain number with no link to another table |
| `technicians` | id, name, branch_id | Each technician works at one branch |
| `atms` | id, serial_number, model, status, cash_level, branch_id | `serial_number` must be unique; `status` uses `ATMStatus` |
| `service_calls` | id, title, priority, status, atm_id, technician_id | `technician_id` is optional: a new call isn't assigned yet |
| `reports` | id, file_url, notes, timestamp, service_call_id | Every report belongs to one service call; `notes` is optional |

**How the tables connect (one-to-many relationships):**

```
Branch ──< ATM ──< ServiceCall ──< Report
  └────< Technician ──< ServiceCall
```

Read `A ──< B` as "one A has many B". For example, one branch has many ATMs, and one ATM has many service calls.

**Concepts used in the code:**

- **Primary key** (`primary_key=True`) – the column that uniquely identifies each row. SQLAlchemy makes an integer `id` that counts up automatically.
- **Foreign key** (`ForeignKey("branches.id")`) – a column that stores the `id` of a row in another table. This is how tables are linked, and the database refuses a value that doesn't exist in the other table.
- **`relationship()`** – a Python-side shortcut that lets you write `atm.branch` or `branch.atms` instead of running a lookup yourself. It creates no column. `back_populates` links the two sides so they stay in sync.
- **`Mapped[int | None]`** – a type hint that also sets nullability. `Mapped[int]` means the column is required; `Mapped[int | None]` means it may be empty (`NULL`).
- **`Numeric(12, 2)`** – an exact decimal number (up to 12 digits, 2 after the decimal point). We use it for `cash_level` because ordinary floats can introduce rounding errors with money.
- **`values_callable`** – by default SQLAlchemy stores an enum's Python *name* (`OPERATIONAL`). This option makes it store the readable *value* (`Operational`) instead, which matches what we show users.
- **`server_default=func.now()`** – the database itself fills in the current time when a row is inserted.

Create one file per model in `backend/app/models/`.

**`branch.py`**

```python
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Branch(Base):
    __tablename__ = "branches"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    region: Mapped[str] = mapped_column(String(100))
    capacity: Mapped[int]
    supervisor_id: Mapped[int]

    atms: Mapped[list["ATM"]] = relationship(back_populates="branch")
    technicians: Mapped[list["Technician"]] = relationship(back_populates="branch")
```

**`technician.py`**

```python
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Technician(Base):
    __tablename__ = "technicians"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.id"))

    branch: Mapped["Branch"] = relationship(back_populates="technicians")
    service_calls: Mapped[list["ServiceCall"]] = relationship(back_populates="technician")
```

**`atm.py`**

```python
from decimal import Decimal

from sqlalchemy import Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import ATMStatus


class ATM(Base):
    __tablename__ = "atms"

    id: Mapped[int] = mapped_column(primary_key=True)
    serial_number: Mapped[str] = mapped_column(String(50), unique=True)
    model: Mapped[str] = mapped_column(String(100))
    status: Mapped[ATMStatus] = mapped_column(
        Enum(ATMStatus, name="atm_status", values_callable=lambda e: [m.value for m in e]),
        default=ATMStatus.OPERATIONAL,
    )
    cash_level: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.id"))

    branch: Mapped["Branch"] = relationship(back_populates="atms")
    service_calls: Mapped[list["ServiceCall"]] = relationship(back_populates="atm")
```

**`service_call.py`**

```python
from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import ServicePriority, ServiceStatus


class ServiceCall(Base):
    __tablename__ = "service_calls"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    priority: Mapped[ServicePriority] = mapped_column(
        Enum(ServicePriority, name="service_priority", values_callable=lambda e: [m.value for m in e]),
        default=ServicePriority.MEDIUM,
    )
    status: Mapped[ServiceStatus] = mapped_column(
        Enum(ServiceStatus, name="service_status", values_callable=lambda e: [m.value for m in e]),
        default=ServiceStatus.PENDING,
    )
    atm_id: Mapped[int] = mapped_column(ForeignKey("atms.id"))
    technician_id: Mapped[int | None] = mapped_column(ForeignKey("technicians.id"))

    atm: Mapped["ATM"] = relationship(back_populates="service_calls")
    technician: Mapped["Technician | None"] = relationship(back_populates="service_calls")
    reports: Mapped[list["Report"]] = relationship(back_populates="service_call")
```

**`report.py`**

```python
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    file_url: Mapped[str] = mapped_column(String(500))
    notes: Mapped[str | None] = mapped_column(Text)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    service_call_id: Mapped[int] = mapped_column(ForeignKey("service_calls.id"))

    service_call: Mapped["ServiceCall"] = relationship(back_populates="reports")
```

The models refer to each other by name in quotes (`"ATM"`, `"Branch"`). The quotes let a file mention a class defined in another file without importing it, which avoids circular-import errors.

**`__init__.py`** – imports every model in one place:

```python
from app.models.base import Base
from app.models.branch import Branch
from app.models.technician import Technician
from app.models.atm import ATM
from app.models.service_call import ServiceCall
from app.models.report import Report

__all__ = ["Base", "Branch", "Technician", "ATM", "ServiceCall", "Report"]
```

This file matters more than it looks. Alembic can only see tables whose classes have been imported, so every new model must be added here.

**Verify.** Always run backend commands from inside `backend/`. Python finds the `app` package relative to the folder you are in, so from anywhere else you will see `ModuleNotFoundError: No module named 'app'`. Check with `pwd`.

```bash
cd backend
source .venv/bin/activate
python -c "
from sqlalchemy.orm import configure_mappers
from app.models import Base
configure_mappers()
print(sorted(Base.metadata.tables))
"
```

Expected output:

```
['atms', 'branches', 'reports', 'service_calls', 'technicians']
```

`configure_mappers()` forces SQLAlchemy to check that every relationship lines up with a matching foreign key, so a typo shows up here as an error instead of later. The tables don't exist in PostgreSQL yet. They're created in the next step.

---

### Step 9 ✅ — Create the tables with Alembic migrations

**Why:** Our models only *describe* tables; PostgreSQL still has an empty database. **Alembic** closes the gap. It compares the models with the real database and writes a **migration**: a small, versioned Python script that creates or changes tables. Migrations are saved in the project, so every developer, and eventually the production server, can rebuild the exact same database structure by running them in order. When a model changes later (say, a new column), we generate a new migration instead of editing the database by hand.

**9a. Initialize Alembic.** Run from inside `backend/` with the virtual environment active:

```bash
cd backend
source .venv/bin/activate
alembic init alembic
```

This creates:

```
backend/
├── alembic.ini        # Alembic's settings file
└── alembic/
    ├── env.py         # Script Alembic runs to connect to the database
    ├── script.py.mako # Template for new migration files
    └── versions/      # Migration scripts will be stored here
```

**9b. Edit `backend/alembic/env.py`.** By default Alembic doesn't know where our database is or what our tables look like. Find this block near the top:

```python
# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = None
```

and replace it with:

```python
from app.config import settings
from app.models import Base

# Use the database URL from .env instead of the placeholder in alembic.ini
config.set_main_option("sqlalchemy.url", settings.database_url.replace("%", "%%"))

# Tells Alembic which tables our models describe, so it can compare
# them against the real database
target_metadata = Base.metadata
```

- `from app.models import Base` also imports every model through the `__init__.py` from Step 8. This is why that file lists them all.
- `target_metadata = Base.metadata` is the list of tables Alembic compares against the database.
- `set_main_option(...)` replaces the placeholder URL in `alembic.ini` (`driver://user:pass@localhost/dbname`) with our real one, so the database location stays in one place, `.env`. The `.replace("%", "%%")` is there because `alembic.ini` treats `%` as a special character; it changes nothing for our URL but prevents a confusing error if a password containing `%` is ever used.

Leave `alembic.ini` unchanged.

> **Troubleshooting:** If you see `Can't load plugin: sqlalchemy.dialects:driver`, Alembic is still using the placeholder URL from `alembic.ini`. Make sure `env.py` is **saved** with the edit above, then run the command again.

**9c. Generate the first migration:**

```bash
alembic revision --autogenerate -m "create initial tables"
```

Alembic compares the models with the empty database and prints a line such as `Detected added table 'branches'` for each of the five tables. A new file appears in `alembic/versions/`, named like `9a536b8f8939_create_initial_tables.py`. (The number is a unique ID Alembic picks, so yours will differ.)

**Always open the generated file and read it.** Autogenerate is a draft, not a guarantee. Check that `upgrade()` contains an `op.create_table(...)` for each of the five tables, and that enum columns list the readable values, for example:

```python
sa.Column('status', sa.Enum('Operational', 'In-Transport', 'Maintenance', 'Offline', name='atm_status'), nullable=False),
```

The file has two functions: `upgrade()` applies the change and `downgrade()` undoes it.

**9d. Apply the migration:**

```bash
alembic upgrade head
```

`head` means "the newest migration". Alembic runs `upgrade()`, creating the tables, and records the migration's ID in a small table named `alembic_version` so it knows what has already been applied.

**9e. Verify** in PostgreSQL:

```bash
psql cashcow -c "\dt"
```

Expected output:

```
 Schema |      Name       | Type  | Owner
--------+-----------------+-------+-------
 public | alembic_version | table | ...
 public | atms            | table | ...
 public | branches        | table | ...
 public | reports         | table | ...
 public | service_calls   | table | ...
 public | technicians     | table | ...
```

To see a table's columns and links, run `psql cashcow -c "\d atms"`.

**Everyday Alembic commands**

| Goal | Command |
|---|---|
| Create a migration after changing a model | `alembic revision --autogenerate -m "describe the change"` |
| Apply all unapplied migrations | `alembic upgrade head` |
| Undo the most recent migration | `alembic downgrade -1` |
| See which migration the database is on | `alembic current` |
| See migration history | `alembic history` |

> **Rule of thumb:** change the model, generate a migration, read it, then apply it. Never edit tables by hand with `psql`, or the models, migrations and database will drift apart.

---

---

## 6. Roadmap

Planned steps. Each becomes a numbered step above once built.

- [x] Create the PostgreSQL database (dedicated user skipped for local development)
- [x] Configuration: `.env` file + `pydantic-settings` (database URL done; JWT secret added with authentication)
- [x] SQLAlchemy table models (branches, technicians, ATMs, service calls, reports)
- [x] Alembic setup and first migration
- [ ] Pydantic schemas (request/response shapes)
- [ ] FastAPI app entry point (`main.py`) and first routes
- [ ] Authentication (bcrypt password hashing + JWT login)
- [ ] Simulation logic (ATM cash levels, service dispatch)
- [ ] Frontend: React + Material UI project setup
- [ ] Connect frontend to backend (API calls, CORS)
- [ ] Tests
- [ ] Deployment notes

---

## 7. Glossary

- **API** – A set of URLs a program can call to get or change data.
- **CORS** – A browser security rule that blocks a frontend on one address from calling a backend on another unless the backend allows it.
- **Dependency** – A library your project relies on.
- **Foreign key** – A column holding the `id` of a row in another table, linking the two.
- **Enum** – A type limited to a fixed list of named values.
- **Hash** – A one-way scramble of data (used for passwords); you can check a match but can't reverse it.
- **JWT** – A signed token proving who a user is, sent with each request.
- **Migration** – A versioned script that changes the database structure. Alembic runs them in order, so every copy of the database ends up identical.
- **Primary key** – The column that uniquely identifies each row in a table.
- **ORM** – Lets you work with database rows as Python objects.
- **Relationship** – A Python-side link between two models, such as `atm.branch`; it creates no database column.
- **Virtual environment** – An isolated set of Python packages for one project.

---

## 8. How to update this document

When a new piece of the project is built:

1. Add a new `### Step N ✅ — Title` under [Build steps](#5-build-steps).
2. In each step include: **Why** (the reason, in plain language), the exact **commands** in code blocks, any **file contents**, and what the user should **expect to see**.
3. Explain any new tool in [Technology choices](#2-technology-choices-and-why) and any new jargon in the [Glossary](#7-glossary).
4. Update the [folder structure](#folder-structure-current) and tick off the [Roadmap](#6-roadmap).
