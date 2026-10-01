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
- **PyJWT** – Creates and verifies **JSON Web Tokens**, used for login sessions.
- **bcrypt** – Securely **hashes** passwords so we never store them in plain text.
- **email-validator** – Lets Pydantic check that email addresses are well-formed (used by `EmailStr`).

### Database

- **PostgreSQL** – A robust, free, open-source relational database. Chosen because bank-style data (accounts, transactions, relationships between records) fits tables and strict rules well.

### Frontend

- **React** – A JavaScript library for building user interfaces out of reusable components (written in JSX).
- **Vite** – The build tool and dev server that converts and bundles our React code and hot-reloads the browser as we edit.
- **React Router** – Handles navigation between pages without reloading the browser.
- **MUI DataGrid** – A ready-made table with sorting, filtering and pagination.
- **Material UI (MUI)** – A library of pre-built, good-looking React components (buttons, tables, forms) so we don't design everything from scratch.
- **Node.js and npm** – Node runs JavaScript tooling (dev server) on your computer; npm installs frontend packages (like `pip` for Python).

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
├── frontend/
│   ├── package.json       # Dependencies and scripts (like requirements.txt)
│   ├── index.html         # The single page the React app loads into
│   ├── .env               # API address (NOT committed to git)
│   ├── .env.example       # Template, safe to commit
│   └── src/
│       ├── main.jsx       # Starts React, applies the theme
│       ├── theme.js       # Colors/fonts/spacing for all MUI components
│       ├── App.jsx        # Router + AuthProvider + routes
│       ├── api.js         # apiFetch: attaches token, handles errors/401
│       ├── AuthContext.jsx # Login state shared across the app (useAuth hook)
│       ├── ProtectedRoute.jsx # Redirects logged-out users to /login
│       └── pages/
│           ├── LoginPage.jsx
│           └── HomePage.jsx   # Placeholder until the dashboard
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
        ├── main.py        # FastAPI app; run with uvicorn
        ├── security.py    # Password hashing + JWT creation/verification
        ├── dependencies.py # get_current_user (protects routes)
        ├── create_user.py # Command-line script to create a login
        ├── seed.py        # Loads sample data (python -m app.seed)
        ├── config.py      # Loads settings from .env
        ├── database.py    # SQLAlchemy engine, session factory, get_db dependency
        ├── routers/       # URL handlers, one file per resource
        │   ├── utils.py   # get_or_404 helper
        │   ├── auth.py    # /auth/login, /auth/me
        │   ├── branches.py
        │   ├── technicians.py
        │   ├── atms.py
        │   ├── service_calls.py
        │   └── reports.py
        ├── schemas/       # Pydantic request/response shapes
        │   ├── auth.py
        │   ├── branch.py
        │   ├── technician.py
        │   ├── atm.py
        │   ├── service_call.py
        │   └── report.py
        └── models/
            ├── __init__.py      # Imports every model (Alembic needs this)
            ├── base.py          # SQLAlchemy Base class all table models inherit from
            ├── enums.py         # Fixed sets of allowed values (statuses, priorities)
            ├── branch.py        # branches table
            ├── technician.py    # technicians table
            ├── atm.py           # atms table
            ├── service_call.py  # service_calls table
            ├── report.py        # reports table
            └── user.py          # users table (logins)
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

- **PATCH** – An HTTP request that updates only the fields you send (unlike replacing the whole record).
- **Check constraint** – A rule the database itself enforces on a column (for example, "exactly 5 digits"), even if the API is bypassed.
- **Primary key** (`primary_key=True`) – the column that uniquely identifies each row. SQLAlchemy makes an integer `id` that counts up automatically.
- **Context** – A React feature that shares a value (like the logged-in user) with every component below a provider, without passing props through each layer.
- **Component** – In React, a function that returns JSX describing part of the page.
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

### Step 10 ✅ — Build the first API: schemas, routes, and the FastAPI app

**Why:** So far we have a database but no way for anything outside Python to use it. The **API** is the doorway: a set of URLs a browser or frontend can call to create and read data. We build one complete "vertical slice" for `Branch` first (schema → route → app). Once it works, the other entities repeat the same pattern.

**Concepts:**

- **Schema** (Pydantic) – a class describing the JSON shape of a request or response. It is separate from the SQLAlchemy model (which describes a database table), so the API can hide or reshape fields. For example, a future `User` model could store a password hash that no response schema ever includes.
- **Router** – a group of related URLs (`/branches`, `/branches/{id}`) kept in its own file so `main.py` stays small.
- **Dependency** (`Depends`) – FastAPI's way of handing each request something it needs (here, a database session) and cleaning up afterward.
- **HTTP methods** – `POST` creates data, `GET` reads it. Status codes report the outcome: `201` created, `404` not found, `422` the data you sent was invalid.

**10a. Add a session dependency.** Add this to the end of `backend/app/database.py`:

```python

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

Each request gets its own session, and `finally` always closes it, even if the request fails.

**10b. Create the schemas.** Create the folder `backend/app/schemas/` with an empty `__init__.py`, then add `backend/app/schemas/branch.py`:

```python
from pydantic import BaseModel, ConfigDict, Field


class BranchCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    region: str = Field(min_length=1, max_length=100)
    capacity: int = Field(gt=0)
    supervisor_id: int


class BranchRead(BranchCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)
```

`BranchCreate` is what a client sends (no `id`, because the database assigns it). `BranchRead` is what we return, so it adds `id`. `from_attributes=True` lets Pydantic read values from a SQLAlchemy object instead of only from a dictionary. The `Field(...)` rules mean bad input, such as an empty name or a capacity of 0, is rejected automatically with a clear error.

**10c. Create the routes.** Create the folder `backend/app/routers/` with an empty `__init__.py`, then add `backend/app/routers/branches.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Branch
from app.schemas.branch import BranchCreate, BranchRead

router = APIRouter(prefix="/branches", tags=["branches"])


@router.post("", response_model=BranchRead, status_code=status.HTTP_201_CREATED)
def create_branch(data: BranchCreate, db: Session = Depends(get_db)):
    branch = Branch(**data.model_dump())
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch


@router.get("", response_model=list[BranchRead])
def list_branches(db: Session = Depends(get_db)):
    return db.scalars(select(Branch).order_by(Branch.id)).all()


@router.get("/{branch_id}", response_model=BranchRead)
def get_branch(branch_id: int, db: Session = Depends(get_db)):
    branch = db.get(Branch, branch_id)
    if branch is None:
        raise HTTPException(status_code=404, detail="Branch not found")
    return branch
```

- `@router.post("")` handles `POST /branches`; `@router.get(...)` handles reads.
- `data: BranchCreate` makes FastAPI parse and validate the JSON body for us.
- `db: Session = Depends(get_db)` supplies the session from 10a.
- `db.add` stages the new row, `db.commit` saves it, and `db.refresh` reloads it so the database-assigned `id` is available.
- `response_model` filters and validates what we send back.
- We use plain `def` instead of `async def` because our database driver is synchronous. FastAPI runs these functions in a thread pool, so requests don't block each other.

**10d. Create the app.** Add `backend/app/main.py`:

```python
from fastapi import FastAPI

from app.routers import branches

app = FastAPI(title="CashCow API")

app.include_router(branches.router)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
```

`app` is the application object that Uvicorn serves. `/health` is a trivial endpoint that confirms the server is up.

**10e. Run it.** From inside `backend/`, with the virtual environment active and PostgreSQL running:

```bash
uvicorn app.main:app --reload
```

- `app.main:app` means "the object named `app` in the file `app/main.py`".
- `--reload` restarts the server automatically when you save a file (development only).
- Press `Ctrl+C` to stop the server.

You should see `Uvicorn running on http://127.0.0.1:8000`.

**10f. Try it.** Open **http://127.0.0.1:8000/docs**. FastAPI generated this interactive page from your code.

1. Expand **POST /branches**, click **Try it out**, enter the following, and click **Execute**:
   ```json
   {"name": "Downtown", "region": "Northeast", "capacity": 10, "supervisor_id": 1}
   ```
   Expected: a `201` response with the same data plus an `id`.
2. Try **GET /branches** (a list) and **GET /branches/1** (one branch). **GET /branches/999** should return `404`.
3. Send a bad value, such as `"capacity": 0`. Expected: a `422` error explaining what was wrong.
4. Confirm the data is really in the database:
   ```bash
   psql cashcow -c "select * from branches;"
   ```

> **Troubleshooting:** `ModuleNotFoundError: No module named 'app'` means you are not inside `backend/`. A `connection refused` error means PostgreSQL isn't running (see [Starting and stopping PostgreSQL](#starting-and-stopping-postgresql)).

---

### Step 11 ✅ — Add the remaining resources: technicians, ATMs, service calls, reports

**Why:** Branches proved the pattern works. Now we repeat it for the other four entities so the API covers the whole data model. The pattern for each is the same: a schema file (what JSON looks like), a router file (the URLs), and one line in `main.py` to register it. A few new ideas appear along the way.

**What's new compared with Branch:**

- **Existence checks.** Creating a technician, ATM, service call or report first confirms that the record it points to exists (the branch, ATM, technician or service call), and returns a clear `404` such as "Branch not found" instead of a raw database error. A small shared helper, `get_or_404`, does this lookup.
- **`PATCH` for partial updates.** A `PATCH` request changes only the fields you send. We read the request with `model_dump(exclude_unset=True)`, which separates "the client didn't send this field" from "the client sent `null`". That is what lets you unassign a technician by sending `"technician_id": null`, while an omitted field is left alone.
- **`409 Conflict`.** An ATM's `serial_number` must be unique. If someone submits a duplicate, the database raises an `IntegrityError`; we catch it, undo the failed save with `db.rollback()`, and return a friendly `409`.
- **Rules built into the schemas.** New service calls always start as `Pending` (the create schema has no `status` field). ATM `cash_level` cannot be negative. An ATM's `serial_number` cannot be changed after creation (it is absent from the update schema).
- **Decimals as strings.** `cash_level` appears in JSON as `"5000.00"`. Pydantic does this with `Decimal` values to avoid rounding errors.

Create or change the files below, all inside `backend/app/`.

**11a. Shared helper**

**`routers/utils.py`**

```python
from fastapi import HTTPException
from sqlalchemy.orm import Session


def get_or_404(db: Session, model, obj_id: int, label: str):
    obj = db.get(model, obj_id)
    if obj is None:
        raise HTTPException(status_code=404, detail=f"{label} not found")
    return obj
```

**11b. Schemas** (in `schemas/`)

**`schemas/technician.py`**

```python
from pydantic import BaseModel, ConfigDict, Field


class TechnicianCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    branch_id: int


class TechnicianRead(TechnicianCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)
```

**`schemas/atm.py`**

```python
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ATMStatus


class ATMCreate(BaseModel):
    serial_number: str = Field(min_length=1, max_length=50)
    model: str = Field(min_length=1, max_length=100)
    status: ATMStatus = ATMStatus.OPERATIONAL
    cash_level: Decimal = Field(default=Decimal("0"), ge=0, max_digits=12, decimal_places=2)
    branch_id: int


class ATMUpdate(BaseModel):
    model: str | None = Field(default=None, min_length=1, max_length=100)
    status: ATMStatus | None = None
    cash_level: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)


class ATMRead(ATMCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)
```

**`schemas/service_call.py`**

```python
from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ServicePriority, ServiceStatus


class ServiceCallCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    priority: ServicePriority = ServicePriority.MEDIUM
    atm_id: int
    technician_id: int | None = None


class ServiceCallUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    priority: ServicePriority | None = None
    status: ServiceStatus | None = None
    technician_id: int | None = None


class ServiceCallRead(ServiceCallCreate):
    id: int
    status: ServiceStatus

    model_config = ConfigDict(from_attributes=True)
```

**`schemas/report.py`**

```python
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReportCreate(BaseModel):
    file_url: str = Field(min_length=1, max_length=500)
    notes: str | None = None
    service_call_id: int


class ReportRead(ReportCreate):
    id: int
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
```

**11c. Routers** (in `routers/`)

**`routers/technicians.py`**

```python
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Branch, Technician
from app.routers.utils import get_or_404
from app.schemas.technician import TechnicianCreate, TechnicianRead

router = APIRouter(prefix="/technicians", tags=["technicians"])


@router.post("", response_model=TechnicianRead, status_code=status.HTTP_201_CREATED)
def create_technician(data: TechnicianCreate, db: Session = Depends(get_db)):
    get_or_404(db, Branch, data.branch_id, "Branch")
    technician = Technician(**data.model_dump())
    db.add(technician)
    db.commit()
    db.refresh(technician)
    return technician


@router.get("", response_model=list[TechnicianRead])
def list_technicians(db: Session = Depends(get_db)):
    return db.scalars(select(Technician).order_by(Technician.id)).all()


@router.get("/{technician_id}", response_model=TechnicianRead)
def get_technician(technician_id: int, db: Session = Depends(get_db)):
    return get_or_404(db, Technician, technician_id, "Technician")
```

**`routers/atms.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ATM, Branch
from app.routers.utils import get_or_404
from app.schemas.atm import ATMCreate, ATMRead, ATMUpdate

router = APIRouter(prefix="/atms", tags=["atms"])


@router.post("", response_model=ATMRead, status_code=status.HTTP_201_CREATED)
def create_atm(data: ATMCreate, db: Session = Depends(get_db)):
    get_or_404(db, Branch, data.branch_id, "Branch")
    atm = ATM(**data.model_dump())
    db.add(atm)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="An ATM with that serial number already exists"
        )
    db.refresh(atm)
    return atm


@router.get("", response_model=list[ATMRead])
def list_atms(db: Session = Depends(get_db)):
    return db.scalars(select(ATM).order_by(ATM.id)).all()


@router.get("/{atm_id}", response_model=ATMRead)
def get_atm(atm_id: int, db: Session = Depends(get_db)):
    return get_or_404(db, ATM, atm_id, "ATM")


@router.patch("/{atm_id}", response_model=ATMRead)
def update_atm(atm_id: int, data: ATMUpdate, db: Session = Depends(get_db)):
    atm = get_or_404(db, ATM, atm_id, "ATM")
    # Only fields the client sent; explicit nulls are ignored (no ATM column is optional)
    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    for field, value in changes.items():
        setattr(atm, field, value)
    db.commit()
    db.refresh(atm)
    return atm
```

**`routers/service_calls.py`**

```python
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ATM, ServiceCall, Technician
from app.routers.utils import get_or_404
from app.schemas.service_call import ServiceCallCreate, ServiceCallRead, ServiceCallUpdate

router = APIRouter(prefix="/service-calls", tags=["service calls"])


@router.post("", response_model=ServiceCallRead, status_code=status.HTTP_201_CREATED)
def create_service_call(data: ServiceCallCreate, db: Session = Depends(get_db)):
    get_or_404(db, ATM, data.atm_id, "ATM")
    if data.technician_id is not None:
        get_or_404(db, Technician, data.technician_id, "Technician")
    service_call = ServiceCall(**data.model_dump())
    db.add(service_call)
    db.commit()
    db.refresh(service_call)
    return service_call


@router.get("", response_model=list[ServiceCallRead])
def list_service_calls(db: Session = Depends(get_db)):
    return db.scalars(select(ServiceCall).order_by(ServiceCall.id)).all()


@router.get("/{service_call_id}", response_model=ServiceCallRead)
def get_service_call(service_call_id: int, db: Session = Depends(get_db)):
    return get_or_404(db, ServiceCall, service_call_id, "Service call")


@router.patch("/{service_call_id}", response_model=ServiceCallRead)
def update_service_call(
    service_call_id: int, data: ServiceCallUpdate, db: Session = Depends(get_db)
):
    service_call = get_or_404(db, ServiceCall, service_call_id, "Service call")
    # Only fields the client sent. technician_id may be null (unassign); the rest may not.
    changes = {
        field: value
        for field, value in data.model_dump(exclude_unset=True).items()
        if value is not None or field == "technician_id"
    }
    if changes.get("technician_id") is not None:
        get_or_404(db, Technician, changes["technician_id"], "Technician")
    for field, value in changes.items():
        setattr(service_call, field, value)
    db.commit()
    db.refresh(service_call)
    return service_call
```

**`routers/reports.py`**

```python
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Report, ServiceCall
from app.routers.utils import get_or_404
from app.schemas.report import ReportCreate, ReportRead

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
def create_report(data: ReportCreate, db: Session = Depends(get_db)):
    get_or_404(db, ServiceCall, data.service_call_id, "Service call")
    report = Report(**data.model_dump())
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("", response_model=list[ReportRead])
def list_reports(db: Session = Depends(get_db)):
    return db.scalars(select(Report).order_by(Report.id)).all()


@router.get("/{report_id}", response_model=ReportRead)
def get_report(report_id: int, db: Session = Depends(get_db)):
    return get_or_404(db, Report, report_id, "Report")
```

**11d. Register the routers.** Replace `main.py` with:

**`main.py`**

```python
from fastapi import FastAPI

from app.routers import atms, branches, reports, service_calls, technicians

app = FastAPI(title="CashCow API")

app.include_router(branches.router)
app.include_router(technicians.router)
app.include_router(atms.router)
app.include_router(service_calls.router)
app.include_router(reports.router)

@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
```

**11e. Run and test.** From inside `backend/`, with the virtual environment active and PostgreSQL running:

```bash
uvicorn app.main:app --reload
```

Open **http://127.0.0.1:8000/docs**. You should see six groups (branches, technicians, atms, service calls, reports, health). Test in this order, because each item depends on the one before (the examples assume a branch with `id` 1 already exists from Step 10):

1. **POST /technicians** `{"name": "Alex Rivera", "branch_id": 1}` → `201`.
2. **POST /atms** `{"serial_number": "ATM-0001", "model": "NCR SelfServ", "cash_level": "5000.00", "branch_id": 1}` → `201`; status defaults to `Operational`.
3. **POST /service-calls** `{"title": "Card reader jammed", "priority": "Critical", "atm_id": 1}` → `201`; status is `Pending` and `technician_id` is `null`.
4. **PATCH /service-calls/1** `{"technician_id": 1, "status": "In-Progress"}` → the call is assigned. Then send `{"technician_id": null}` to confirm it unassigns.
5. **PATCH /atms/1** `{"status": "Maintenance"}` → only the status changes.
6. **POST /reports** `{"file_url": "https://example.com/report1.pdf", "notes": "Replaced reader", "service_call_id": 1}` → `201`, with a `timestamp` filled in by the database.

Then try the error cases:

| Request | Expected |
|---|---|
| POST a technician with `"branch_id": 999` | `404` "Branch not found" |
| POST the same ATM `serial_number` twice | `409` conflict message |
| PATCH an ATM with `"status": "Banana"` | `422` validation error listing the allowed values |

---

### Step 12 ✅ — Add authentication (login, JWT tokens, protected routes)

**Why:** Until now anyone who could reach the API could read and change everything. Authentication proves *who* is calling. We'll add a `User` table, secure password storage, a login endpoint that returns a token, and require that token on every data endpoint. The frontend login will be built on top of this.

**Concepts:**

- **Hashing, not encrypting.** We never store passwords. `bcrypt` turns a password into a one-way scrambled string (a **hash**) with a random **salt** mixed in. At login we hash the attempt and compare. Nobody, including us, can recover the original password, and a leaked database doesn't reveal passwords.
- **JWT (JSON Web Token).** After a successful login the server returns a signed token. The client sends it with every request in an `Authorization: Bearer <token>` header. The server verifies the signature, so it doesn't need to look anything up per session. A JWT is **signed, not encrypted**: anyone can read it, but nobody can alter it without the secret key. Never put secrets inside one.
- **Secret key.** The server-only value used to sign tokens. If it leaks, anyone can forge logins, so it lives in `.env`, never in Git.
- **401 vs 403.** `401 Unauthorized` means "you haven't proven who you are". `403 Forbidden` means "I know who you are, but you aren't allowed".
- **CORS.** Browsers block a page served from one address (our frontend, `localhost:5173`) from calling an API at another (`localhost:8000`) unless the API explicitly allows it. We add that permission now so the frontend works later.
- **No public registration.** If anyone could register themselves, the protection would mean nothing. We create users with a command-line script instead. An admin-only registration endpoint can come later.

**12a. Install one package.** Pydantic's email validation needs a helper:

```bash
pip install email-validator
pip freeze > requirements.txt
```

**12b. Add settings.** Generate a secret and copy the output:

```bash
openssl rand -hex 32
```

Add it to `backend/.env`:

```
JWT_SECRET=<paste the generated value here>
```

Add a placeholder (never the real value) to `backend/.env.example`:

```
JWT_SECRET=change-me
```

Replace `backend/app/config.py`:

```python
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env")


settings = Settings()
```

`jwt_secret` has no default, so the app refuses to start without one. Do this *before* running anything else, because Alembic loads the settings too. `cors_origins` is the address the Vite frontend will use.

**12c. Create the `User` model and migration.**

**`backend/app/models/user.py`**

```python
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(100))
    hashed_password: Mapped[str] = mapped_column(String(255))
```

Add it to `backend/app/models/__init__.py` so Alembic can see it:

```python
from app.models.user import User
```

(and add `"User"` to `__all__`).

Then generate, **read**, and apply the migration from `backend/`:

```bash
alembic revision --autogenerate -m "create users table"
alembic upgrade head
```

The new file should contain one `op.create_table('users', ...)` and a unique index on `email`, and nothing else.

**12d. Security helpers.** Password hashing and token creation/verification:

**`backend/app/security.py`**

```python
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.config import settings


def hash_password(password: str) -> str:
    password_bytes = password.encode()
    if len(password_bytes) > 72:  # bcrypt cannot handle longer passwords
        raise ValueError("Password must be at most 72 bytes")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode()


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed_password.encode())
    except ValueError:
        return False


def create_access_token(user_id: int) -> str:
    expires = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {"sub": str(user_id), "exp": expires}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> int | None:
    """Return the user id inside a valid token, or None if it is invalid or expired."""
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
```

`sub` ("subject") is the standard JWT field for who the token is about, and must be a string. `exp` is the expiry time; PyJWT automatically rejects expired tokens. bcrypt cannot handle passwords longer than 72 bytes, so we reject those rather than silently truncating.

**12e. Schemas, the "who is logged in" dependency, and the auth routes.**

**`backend/app/schemas/auth.py`**

```python
from pydantic import BaseModel, ConfigDict, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRead(BaseModel):
    id: int
    email: EmailStr
    full_name: str

    model_config = ConfigDict(from_attributes=True)
```

`UserRead` deliberately has no `hashed_password`, so it can never leak in a response.

**`backend/app/dependencies.py`**

```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=401,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise unauthorized
    user = db.get(User, user_id)
    if user is None:
        raise unauthorized
    return user
```

Any route that depends on `get_current_user` returns `401` unless the request has a valid token for an existing user. `HTTPBearer` also adds an **Authorize** button to `/docs`.

**`backend/app/routers/auth.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.auth import LoginRequest, Token, UserRead
from app.security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if user is None or not verify_password(data.password, user.hashed_password):
        # Same message for both cases so attackers can't discover which emails exist
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Token(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user
```

Wrong email and wrong password return the same message, so an attacker can't discover which emails have accounts. `/auth/me` lets the frontend ask "who am I?" when a page reloads and a token is still stored.

**12f. Protect the API and allow the frontend.** Replace `backend/app/main.py`:

**`backend/app/main.py`**

```python
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.dependencies import get_current_user
from app.routers import atms, auth, branches, reports, service_calls, technicians

app = FastAPI(title="CashCow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public: login
app.include_router(auth.router)

# Protected: every route in these routers requires a valid token
protected = [Depends(get_current_user)]
app.include_router(branches.router, dependencies=protected)
app.include_router(technicians.router, dependencies=protected)
app.include_router(atms.router, dependencies=protected)
app.include_router(service_calls.router, dependencies=protected)
app.include_router(reports.router, dependencies=protected)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
```

Passing `dependencies=protected` to `include_router` protects every route in a router without editing each one. `/auth/login` and `/health` stay public.

**12g. A script to create users.**

**`backend/app/create_user.py`**

```python
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
```

`getpass` hides what you type, so the password never appears on screen or in your shell history. Run it from `backend/` with the virtual environment active:

```bash
python -m app.create_user admin@cashcow.com "Admin User"
```

`-m app.create_user` runs the file as part of the `app` package so its imports work. It asks for a password twice (at least 8 characters).

> **Use a real-looking email domain.** Addresses ending in reserved names such as `.test` or `.local` are rejected by Pydantic's `EmailStr`. The script doesn't check this, so it will happily create an account that can never log in (you'd see a `422` at login). Use something like `admin@cashcow.com`. To fix a mistake: `psql cashcow -c "delete from users where email = 'wrong@address';"` and run the script again.

**12h. Test it.** Start the server (`uvicorn app.main:app --reload`) and open **http://127.0.0.1:8000/docs**:

1. **GET /branches** → `401 Not authenticated`. The API is locked. (Protected endpoints show a padlock.)
2. **POST /auth/login** with your email and password → a response containing `access_token`. A wrong password gives `401`.
3. Click **Authorize** (top right). Paste **only** the token string (it starts with `eyJ`), not the word `Bearer`, then click **Authorize** and **Close**. The padlocks should now look closed.
4. **GET /branches** → `200`.
5. **GET /auth/me** → your id, email, and name, with no password hash.
6. **GET /health** → still works with no token.

**Troubleshooting a `401` after logging in** (login alone doesn't apply the token; you must Authorize):

| Cause | Fix |
|---|---|
| Never clicked Authorize | Do step 3 above |
| Pasted `Bearer eyJ...` | The box adds `Bearer` itself; paste only the string starting with `eyJ` |
| Extra quotes/spaces or a cut-off copy | Use the **Copy** button next to the response body |
| Refreshed the page | `/docs` forgets the token on reload; authorize again |
| Token older than 60 minutes | Log in again |

---

### Step 13 ✅ — Scaffold the frontend (Vite + React + Material UI)

**Why:** The API works, but nobody wants to use it through a `/docs` page. The frontend is the real user interface. This step creates the project, installs the UI libraries, and proves the whole chain works: React renders a page, Material UI styles it, and the browser can call our backend.

**Concepts:**

- **Vite** – a build tool and development server. Browsers only understand plain HTML, CSS and JavaScript, but React code is written in **JSX** (HTML-like tags inside JavaScript) and split across many files and packages. Vite converts and bundles everything. `npm run dev` starts a local server that **hot-reloads** the browser whenever you save a file (like `--reload` on our backend). `npm run build` produces optimized static files for deployment.
- **JSX** – the HTML-like syntax React uses to describe what's on screen, such as `<Button>Save</Button>`, written inside JavaScript. Files that contain it end in `.jsx`.
- **JavaScript vs TypeScript** – we chose plain JavaScript (the `react` template). TypeScript adds type declarations that catch mistakes before you run the code; it is optional, and JSX works with both.
- **npm** – Node's package installer, the frontend equivalent of `pip`. Packages are listed in `package.json` (like `requirements.txt`) and downloaded into `node_modules/` (like `.venv`; regenerated, never committed).
- **React component** – a function that returns JSX. Components nest inside each other to build a page.
- **Hooks** – `useState` makes a component remember data and re-render when it changes; `useEffect` runs code after the component appears (such as calling the API).
- **Environment variables in Vite** – only variables starting with `VITE_` are exposed to browser code, read as `import.meta.env.VITE_NAME`. Anything in browser code is visible to every user, so **never put secrets in these**.

**13a. Create the Vite project.** From the project root (not `backend/`):

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install
```

- `npm create vite@latest` downloads and runs Vite's project generator.
- `frontend` is the folder name; `--template react` picks plain JavaScript React.
- If it asks about optional extras or "install and start now?", accept defaults for extras and choose **No** to starting now.
- `npm install` downloads everything listed in `package.json`.

Vite generates: `package.json` (dependencies and scripts), `index.html` (the single page the whole app loads into), `src/main.jsx` (starts React), and `vite.config.js` (Vite settings, unchanged by us).

**13b. Install the UI packages:**

```bash
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material @mui/x-data-grid react-router
```

| Package | Why |
|---|---|
| `@mui/material` | Core Material UI components: `Grid`, `Box`, `Card`, `Container`, buttons, etc. |
| `@emotion/react`, `@emotion/styled` | The styling engine MUI uses internally; MUI requires them |
| `@mui/icons-material` | Icon set for menus, status badges and buttons |
| `@mui/x-data-grid` | The DataGrid table with sorting, filtering and pagination |
| `react-router` | Navigation between pages (login, dashboard, ATMs, service calls) |

**13c. Remove the starter demo files:**

```bash
rm src/App.css src/index.css
rm -r src/assets
```

**13d. Add the API address.** Create `frontend/.env`:

```
VITE_API_URL=http://127.0.0.1:8000
```

Also create `frontend/.env.example` with the same line, to commit as a template. The root `.gitignore` already ignores `.env` files. Keeping the API address in one place means pointing at a deployed backend later needs no code change.

**13e. Theme and entry point.** The theme is one central place for colors, fonts and spacing:

**`frontend/src/theme.js`**

```js
import { createTheme } from '@mui/material/styles'

// One central place for colors, fonts, and spacing across the whole app
const theme = createTheme({
  palette: {
    primary: { main: '#1b5e20' },
  },
})

export default theme
```

Replace `src/main.jsx`. `ThemeProvider` makes our theme available to every MUI component, and `CssBaseline` resets inconsistent browser default styles so the page looks the same everywhere:

**`frontend/src/main.jsx`**

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider } from '@mui/material'

import App from './App.jsx'
import theme from './theme.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
```

**13f. A temporary test page** (`src/App.jsx`). It calls the backend's `/health` endpoint and shows the result, which proves React, MUI, the `.env` value and the browser-to-API connection all work:

**`frontend/src/App.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { Box, Card, CardContent, Chip, Container, Typography } from '@mui/material'

const API_URL = import.meta.env.VITE_API_URL

export default function App() {
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((response) => response.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('unreachable'))
  }, [])

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Card>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              CashCow
            </Typography>
            <Typography sx={{ mb: 2 }}>Backend API status:</Typography>
            <Chip
              label={status}
              color={status === 'ok' ? 'success' : 'error'}
            />
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}
```

Notes on the code: `Container` centers content and limits its width, `Box` is a general-purpose wrapper, and `Card`/`CardContent` draw a card. The `sx` prop is MUI's shortcut for styling (`mt: 8` is a top margin of 8 spacing units). The `[]` at the end of `useEffect` means "run once, when the component first appears".

Optionally change the `<title>` in `frontend/index.html` to `CashCow`; this is the text shown on the browser tab.

**13g. Run both servers** (two terminals):

```bash
# Terminal 1: backend, from backend/ with the venv active
uvicorn app.main:app --reload
```

```bash
# Terminal 2: frontend
cd frontend
npm run dev
```

Vite prints an address, usually `http://localhost:5173`. Open it.

**Expected:** a card titled "CashCow" with a **green** chip saying `ok`.

**If the chip is red and says `unreachable`:**
- Check the backend is running.
- Open the frontend at exactly `http://localhost:5173`. The backend's CORS setting (from Step 12) only allows that origin, so `http://127.0.0.1:5173` would be blocked.

---

### Step 14 ✅ — Frontend authentication: API helper, React Context, login page, protected routes

**Why:** The backend now requires a token, so the frontend needs a way to log in, remember who is logged in, send the token with every request, and keep logged-out users away from private pages.

**Concepts:**

- **React Context.** Normally data flows from parent to child through **props**. For something every page needs (like "who is logged in?"), passing it through every layer is tedious. **Context** lets a **provider** near the top of the app publish a value that any component below can read directly with a hook.
- **Provider + hook pattern.** `AuthProvider` holds the state; a small `useAuth()` hook reads it. Any component calls `const { user, login, logout } = useAuth()`.
- **Protected route.** A wrapper that shows a page only if someone is logged in, and otherwise redirects to `/login`.
- **`localStorage`.** A small key-value store inside the browser that survives page reloads. We keep the token there so a refresh doesn't log you out. *Trade-off:* any script injected into the page could read it (an attack called XSS). That is acceptable for a learning project. More secure options are an `httpOnly` cookie (needs backend changes and CSRF protection) or keeping the token in memory only (users are logged out on every refresh).
- **Session restore.** On page load, if a token is saved we ask `/auth/me` whether it is still valid. If the server answers `401` (expired or invalid), we log out.
- **Controlled form.** Each field's value lives in React state (`useState`) and updates on every keystroke through `onChange`.

**14a. API helper.** Every API call in the app goes through `apiFetch`, which attaches the token automatically, turns errors into readable messages, and logs the user out if the server rejects the token. `skipAuth` is for the login request itself, which has no token to send.

**`frontend/src/api.js`**

```js
const API_URL = import.meta.env.VITE_API_URL
const TOKEN_KEY = 'cashcow_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

// The auth context registers a function here to run when the server rejects our token
let onUnauthorized = () => {}
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export async function apiFetch(path, { skipAuth = false, headers: extraHeaders, ...options } = {}) {
  const token = skipAuth ? null : getToken()
  const headers = { 'Content-Type': 'application/json', ...extraHeaders }
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers })
  } catch {
    throw new ApiError(0, 'Cannot reach the server')
  }

  // A token was sent but rejected: it has expired or is invalid, so log out
  if (response.status === 401 && token) onUnauthorized()

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    // FastAPI sends a string for most errors, but a list for validation errors (422)
    const detail = Array.isArray(body?.detail) ? body.detail[0].msg : body?.detail
    throw new ApiError(response.status, detail || 'Request failed')
  }
  return response.json()
}
```

**14b. The auth context.** Note that `{children}` is everything wrapped inside the provider (the whole app). `useCallback` and `useMemo` keep function and object identities stable between renders so components reading the context don't re-render needlessly. If the backend is down on page load, the saved token is kept (only a real `401` clears it), so a refresh once the backend is back restores your session.

**`frontend/src/AuthContext.jsx`**

```jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { apiFetch, clearToken, getToken, setToken, setUnauthorizedHandler } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // True while we check whether a saved token is still valid
  const [loading, setLoading] = useState(Boolean(getToken()))

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  // If any request gets a 401 for our token, log out
  useEffect(() => {
    setUnauthorizedHandler(logout)
  }, [logout])

  // On first load, restore the session from a saved token
  useEffect(() => {
    if (!getToken()) return
    apiFetch('/auth/me')
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const { access_token } = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    })
    setToken(access_token)
    try {
      setUser(await apiFetch('/auth/me'))
    } catch (error) {
      clearToken()
      throw error
    }
  }, [])

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
```

**14c. The protected-route wrapper.** `Outlet` is where the nested page appears once the check passes. We remember the page the user tried to visit in `state={{ from: location }}` so that after logging in they land there instead of always on the home page.

**`frontend/src/ProtectedRoute.jsx`**

```jsx
import { Box, CircularProgress } from '@mui/material'
import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth } from './AuthContext.jsx'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    )
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <Outlet />
}
```

**14d. Pages.** Create the folder `frontend/src/pages/`. `event.preventDefault()` in the login form stops the browser's default behavior of reloading the page when a form is submitted.

**`frontend/src/pages/LoginPage.jsx`**

```jsx
import { useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Container, TextField, Typography } from '@mui/material'
import { Navigate, useLocation } from 'react-router'

import { useAuth } from '../AuthContext.jsx'

export default function LoginPage() {
  const { user, login } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const destination = location.state?.from?.pathname ?? '/'

  // Already logged in (including right after a successful login): leave this page
  if (user) return <Navigate to={destination} replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              CashCow
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Sign in to continue
            </Typography>
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                autoFocus
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <Button type="submit" variant="contained" size="large" disabled={submitting}>
                {submitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}
```

`HomePage.jsx` is a temporary placeholder until we build the dashboard:

**`frontend/src/pages/HomePage.jsx`**

```jsx
import { Box, Button, Card, CardContent, Container, Typography } from '@mui/material'

import { useAuth } from '../AuthContext.jsx'

export default function HomePage() {
  const { user, logout } = useAuth()

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Card>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              Welcome, {user.full_name}
            </Typography>
            <Typography sx={{ mb: 2 }}>You are logged in as {user.email}.</Typography>
            <Button variant="outlined" onClick={logout}>
              Log out
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}
```

**14e. Wire it together.** `BrowserRouter` enables URL-based navigation. `AuthProvider` sits inside it, so every route can read the session. Routes nested inside `<Route element={<ProtectedRoute />}>` all get the login check, so later pages go there. The `*` route sends unknown URLs to `/`.

**`frontend/src/App.jsx`**

```jsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AuthProvider } from './AuthContext.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

**14f. Try it.** With both servers running, open `http://localhost:5173`:

1. You land on the **login page** (you aren't logged in).
2. A wrong password shows a red alert: "Incorrect email or password".
3. Correct credentials take you to the welcome card with your name and email.
4. **Refresh the page**: you stay logged in (the brief spinner is the `/auth/me` check).
5. **Log out** returns you to the login page.
6. While logged out, visiting `http://localhost:5173/` redirects to `/login`.

To see the saved token, open your browser's dev tools: **Application → Local Storage → `http://localhost:5173`**. The `cashcow_token` key exists while logged in and disappears after logout.

---

### Step 15 ✅ — Seed sample data and enforce 5-digit serial numbers

**Why:** An empty database makes a dashboard hard to build and impossible to judge. A **seed script** loads a known set of realistic sample data on demand. We designed it to contain exactly the situations our upcoming metrics must detect, so we can check each metric against numbers we know are right. In the same step we add a rule we had missed: every ATM serial number must be **unique and exactly 5 digits**.

**What the seed data contains** (and which metric each part exercises):

| Item | Data |
|---|---|
| Branches | 5, with supervisors `101` (Downtown, Harbor), `102` (Lakeside, Summit), `103` (Riverside) |
| Technicians | 10 (2 per branch) |
| ATMs | 20 (4 per branch), serials `10001`-`10020`, three models |
| Low cash (below $2,000, status Operational) | exactly **5** ATMs. One more ATM sits at exactly $2,000.00 to prove the boundary is "strictly below" |
| Maintenance alert (over 30% of a branch's ATMs) | **2** branches: Downtown and Lakeside (2 of 4 = 50% each). Harbor has 1 of 4 (25%) as a deliberate near-miss |
| Service calls | 10: 3 active calls where the technician is at a *different branch* than the ATM, 2 active calls that match, 1 unassigned, 4 finished |
| Completion/failure by model | NCR 1 completed / 0 failed, Diebold 1 / 1, Hyosung 0 / 1 |
| Technicians on active calls by supervisor | 101 → 1, 102 → 2, 103 → 2 |

**Business definitions used by the metrics** (agreed before building):

- **Active ATM** – status `Operational` (not Maintenance, Offline or In-Transport).
- **Full cash reserve** – $10,000, so "below 20%" means below $2,000. Cash can never exceed $10,000 (enforced in the API).
- **Active service call** – status `Pending` or `In-Progress`.
- **Mismatch** – an active call whose technician's branch differs from the ATM's branch.
- **Completion/failure ratio** – completed % and failed % of *finished* calls (`Completed` + `Failed`) per ATM model.
- **Supervisor report** – distinct technicians with at least one active call, grouped by `supervisor_id` of the technician's own branch.

**15a. The seed script.** Notes on how it works:

- The data sits in tables at the top (`BRANCHES`, `ATMS`, `SERVICE_CALLS`, ...) and the code that inserts it is at the bottom. To change the sample data, edit the tables.
- Rows are inserted in dependency order: branches first, then technicians and ATMs (they need a `branch_id`), then service calls (they need ATM and technician ids), then reports. `db.flush()` sends pending inserts so PostgreSQL assigns ids the next group can use.
- Branch ids and serial numbers are *calculated*, not typed: the ATMs are numbered 1-20 by `enumerate`, the serial is `10000 + number`, and the branch is `(number - 1) // 4` (four ATMs per branch, `//` is division that drops the remainder). **Consequence:** the order of the rows matters. Keep each branch's four ATMs together, and add new ATMs at the end.
- `TRUNCATE ... RESTART IDENTITY` empties the five data tables and resets ids to 1, so the "ATM 3" and "technician 5" comments in the script always match the real ids. It never touches `users`, so your login survives. The script asks you to type `yes` first (`--yes` skips the prompt).
- `capacity` is a placeholder value (8) because we never defined what it measures.

**`backend/app/seed.py`**

```python
import argparse
import sys
from decimal import Decimal

from sqlalchemy import text

from app.database import SessionLocal
from app.models import ATM, Branch, Report, ServiceCall, Technician
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
    db.execute(
        text(
            "TRUNCATE TABLE reports, service_calls, atms, technicians, branches "
            "RESTART IDENTITY CASCADE"
        )
    )

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
            "then loads sample data.\n(Users are not touched.) Type 'yes' to continue: "
        )
        if answer.strip().lower() != "yes":
            sys.exit("Cancelled")

    with SessionLocal() as db:
        seed(db)
    print("Seeded 5 branches, 10 technicians, 20 ATMs, 10 service calls, 2 reports")


if __name__ == "__main__":
    main()
```

Run it from `backend/` with the virtual environment active (`-m app.seed` runs the file as part of the `app` package so its imports work):

```bash
python -m app.seed
```

Type `yes`. Expected output: `Seeded 5 branches, 10 technicians, 20 ATMs, 10 service calls, 2 reports`.

> **Do this before 15c.** Any ATM left over from earlier testing has an old-style serial (such as `ATM-0001`), and the migration in 15c would fail on it. Re-seeding wipes those rows.

Check the data:

```bash
psql cashcow -c "select status, count(*) from atms group by status order by status;"
psql cashcow -c "select count(*) from atms where status = 'Operational' and cash_level < 2000;"
```

Expected: In-Transport 1, Maintenance 5, Offline 1, Operational 13, then `5`.

**15b. Validate the serial number and cash ceiling in the API.** Edit `backend/app/schemas/atm.py` so the serial must match a regular expression (`^[0-9]{5}$` means "from start to end, exactly five characters from 0 to 9") and cash can't exceed $10,000 (`le=10000`, "less than or equal"). The `le` rule must be on **both** `ATMCreate` and `ATMUpdate`; otherwise a PATCH could push cash above the ceiling and skew every percentage:

**`backend/app/schemas/atm.py`**

```python
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ATMStatus


class ATMCreate(BaseModel):
    serial_number: str = Field(pattern=r"^[0-9]{5}$")
    model: str = Field(min_length=1, max_length=100)
    status: ATMStatus = ATMStatus.OPERATIONAL
    cash_level: Decimal = Field(default=Decimal("0"), ge=0, le=10000, max_digits=12, decimal_places=2)
    branch_id: int


class ATMUpdate(BaseModel):
    model: str | None = Field(default=None, min_length=1, max_length=100)
    status: ATMStatus | None = None
    cash_level: Decimal | None = Field(default=None, ge=0, le=10000, max_digits=12, decimal_places=2)


class ATMRead(ATMCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)
```

**15c. Enforce the rule in the database too.** The API check gives friendly `422` messages, but a script, the seed or manual SQL bypasses it. A database **check constraint** is the last line of defense. In `backend/app/models/atm.py`:

- import `CheckConstraint` from `sqlalchemy`,
- add `__table_args__` with the constraint (`~` is PostgreSQL's regular-expression match; naming the constraint makes it easy to find in error messages),
- change the column length from 50 to 5.

**`backend/app/models/atm.py`**

```python
from decimal import Decimal

from sqlalchemy import CheckConstraint, Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import ATMStatus


class ATM(Base):
    __tablename__ = "atms"
    __table_args__ = (
        CheckConstraint("serial_number ~ '^[0-9]{5}$'", name="ck_atms_serial_number_format"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    serial_number: Mapped[str] = mapped_column(String(5), unique=True)
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

Now create the migration. Note there is **no `--autogenerate`** this time:

```bash
alembic revision -m "require 5-digit atm serial numbers"
```

Autogenerate can notice the column length change but **cannot detect check constraints**, so it would silently omit the important part. Open the new file in `alembic/versions/` and replace the two empty functions with the following. Always write `downgrade()` as the exact reverse of `upgrade()` so the change can be undone:

**`backend/alembic/versions/79faa9356345_require_5_digit_atm_serial_numbers.py`** (the two functions)

```python
def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column(
        "atms",
        "serial_number",
        existing_type=sa.String(length=50),
        type_=sa.String(length=5),
        existing_nullable=False,
    )
    op.create_check_constraint(
        "ck_atms_serial_number_format", "atms", "serial_number ~ '^[0-9]{5}$'"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("ck_atms_serial_number_format", "atms", type_="check")
    op.alter_column(
        "atms",
        "serial_number",
        existing_type=sa.String(length=5),
        type_=sa.String(length=50),
        existing_nullable=False,
    )
```

Apply it:

```bash
alembic upgrade head
```

**15d. Verify.**

```bash
psql cashcow -c "\d atms"
alembic check
```

Expected: `serial_number` is `character varying(5)`, a **Check constraints** section lists `ck_atms_serial_number_format`, and `alembic check` prints `No new upgrade operations detected.` (the model and database agree).

Try to break it:

```bash
psql cashcow -c "insert into atms (serial_number, model, status, cash_level, branch_id) values ('ATM-1', 'x', 'Offline', 0, 1);"
```

Expected: `violates check constraint "ck_atms_serial_number_format"`.

Then in `/docs` (log in and Authorize first):

| Request | Expected |
|---|---|
| POST /atms with `"serial_number": "ATM-1"` | `422` (pattern mismatch) |
| POST /atms with `"serial_number": "10001"` | `409` (already exists from the seed) |
| PATCH /atms/1 with `"cash_level": "10000.01"` | `422` (over the ceiling) |

---

---

## 6. Roadmap

Planned steps. Each becomes a numbered step above once built.

- [x] Create the PostgreSQL database (dedicated user skipped for local development)
- [x] Configuration: `.env` file + `pydantic-settings` (database URL done; JWT secret added with authentication)
- [x] SQLAlchemy table models (branches, technicians, ATMs, service calls, reports)
- [x] Alembic setup and first migration
- [x] Pydantic schemas (request/response shapes) — Branch done
- [x] FastAPI app entry point (`main.py`) and first routes — Branch done
- [x] Schemas and routes for technicians, ATMs, service calls, and reports
- [x] Authentication (bcrypt password hashing + JWT login) — backend done; frontend login comes with the React app
- [x] Seed script with sample data covering every metric
- [ ] Backend metrics endpoints (low cash, technician mismatches, completion ratio by model, maintenance alerts, technicians per supervisor)
- [ ] Simulation logic (ATM cash levels, service dispatch)
- [x] Frontend: React + Material UI project setup
- [x] Connect frontend to backend (API calls, CORS) — API helper and login done
- [ ] Tests
- [ ] Deployment notes

---

## 7. Glossary

- **API** – A set of URLs a program can call to get or change data.
- **CORS** – A browser security rule that blocks a frontend on one address from calling a backend on another unless the backend allows it.
- **Bearer token** – A token sent in the `Authorization: Bearer <token>` header to prove who you are.
- **Dependency** – A library your project relies on.
- **Foreign key** – A column holding the `id` of a row in another table, linking the two.
- **Enum** – A type limited to a fixed list of named values.
- **Salt** – Random data mixed into a password before hashing so identical passwords produce different hashes.
- **localStorage** – A small key-value store in the browser that survives page reloads; we keep the login token there.
- **Hash** – A one-way scramble of data (used for passwords); you can check a match but can't reverse it.
- **Hook** – A React function like `useState` or `useEffect` that gives a component memory or side effects.
- **JWT** – A signed token proving who a user is, sent with each request.
- **Migration** – A versioned script that changes the database structure. Alembic runs them in order, so every copy of the database ends up identical.
- **PATCH** – An HTTP request that updates only the fields you send (unlike replacing the whole record).
- **Primary key** – The column that uniquely identifies each row in a table.
- **ORM** – Lets you work with database rows as Python objects.
- **Router** – A group of related URLs in FastAPI, kept in its own file.
- **Regular expression (regex)** – A compact pattern for matching text, such as `^[0-9]{5}$` for "exactly five digits".
- **Relationship** – A Python-side link between two models, such as `atm.branch`; it creates no database column.
- **Seed data** – Sample records loaded by a script so the app can be developed and tested against known data.
- **Schema** – A Pydantic class describing the JSON shape of a request or response (not a database table).
- **Virtual environment** – An isolated set of Python packages for one project.

---

## 8. How to update this document

When a new piece of the project is built:

1. Add a new `### Step N ✅ — Title` under [Build steps](#5-build-steps).
2. In each step include: **Why** (the reason, in plain language), the exact **commands** in code blocks, any **file contents**, and what the user should **expect to see**.
3. Explain any new tool in [Technology choices](#2-technology-choices-and-why) and any new jargon in the [Glossary](#7-glossary).
4. Update the [folder structure](#folder-structure-current) and tick off the [Roadmap](#6-roadmap).
