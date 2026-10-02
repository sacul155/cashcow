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
│       ├── RequireRole.jsx    # Redirects users whose role may not see a page
│       ├── roles.js       # Role names, each role's home page and navigation links
│       ├── constants.js   # Allowed values for dropdowns (statuses, priorities)
│       ├── format.js      # Currency and percent formatting
│       ├── hooks/
│       │   └── useApi.js  # Load data from the API (loading/error/reload/skip)
│       ├── components/
│       │   ├── Layout.jsx     # Top bar + role badge + role-specific navigation
│       │   ├── StatCard.jsx   # One headline number
│       │   ├── StatusChip.jsx # Colored status/priority badge
│       │   ├── DataTable.jsx  # Searchable, sortable, paginated DataGrid
│       │   ├── CrudPage.jsx   # Reusable list page: grid + Add/Edit/Delete
│       │   ├── FormDialog.jsx # Pop-up form built from a list of field descriptions
│       │   ├── ConfirmDialog.jsx # "Are you sure?" pop-up for deletes
│       │   ├── ServiceCallActions.jsx # Technician's Start/Complete/Fail/Reports buttons
│       │   └── ReportDialog.jsx # List and attach reports for a service call
│       └── pages/
│           ├── LoginPage.jsx
│           ├── DashboardPage.jsx
│           ├── AtmsPage.jsx
│           ├── ServiceCallsPage.jsx            # Admin/Auditor view
│           ├── TechnicianServiceCallsPage.jsx  # Field Technician view
│           ├── BranchesPage.jsx
│           ├── TechniciansPage.jsx
│           └── UsersPage.jsx
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
        ├── metrics.py     # Metric calculations (SQL queries)
        ├── dependencies.py # get_current_user + role checks (require_roles, admin_only, read_all)
        ├── access.py      # Row-level rules: what a Field Technician may see
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
        │   ├── reports.py
        │   ├── metrics.py # /metrics/... endpoints
        │   └── users.py   # User account management (Admin only)
        ├── schemas/       # Pydantic request/response shapes
        │   ├── auth.py
        │   ├── branch.py
        │   ├── technician.py
        │   ├── atm.py
        │   ├── service_call.py
        │   ├── report.py
        │   ├── user.py    # Create/update shapes for user accounts
        │   └── metrics.py # Shapes of the metric results
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
- **Authorization** – Deciding what a logged-in user may do (as opposed to authentication, which is proving who they are).
- **Role** – A named set of permissions (Operations Admin, Field Technician, Auditor) assigned to each user.
- **Row-level rule** – A rule that limits *which records* a user sees, not just which endpoints they may call (a technician sees only their own calls).
- **403 vs 404** – `403 Forbidden`: you may not do this. `404 Not Found`: it doesn't exist *for you*; we use it for other people's records so their existence isn't revealed.
- **Alias (SQL)** – A second name for the same table within one query, so it can be joined to itself or used twice.
- **Check constraint** – A rule the database itself enforces on a column (for example, "exactly 5 digits"), even if the API is bypassed.
- **Primary key** (`primary_key=True`) – the column that uniquely identifies each row. SQLAlchemy makes an integer `id` that counts up automatically.
- **Props** – Inputs passed to a React component, like function arguments.
- **Context** – A React feature that shares a value (like the logged-in user) with every component below a provider, without passing props through each layer.
- **Props as configuration** – Passing settings (columns, form fields, callbacks) to a reusable component so one component serves many cases.
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

> **Updated in Step 20:** `create_user.py` now requires `--role` (and `--technician-id` for technicians), and `UserRead`/the `users` table gain a role. The version in Step 20 replaces the one above.

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

> **Updated in Step 20:** the wipe at the top of `seed()` no longer uses `TRUNCATE ... CASCADE`, because the `users` table now references technicians and `CASCADE` would erase it. The seed now deletes in dependency order, keeps Admin and Auditor logins, and removes Field Technician logins. The version in Step 20 replaces the one above.

---

### Step 16 ✅ — Build the metrics API (alerts and reports computed in the backend)

**Why:** The dashboard must answer five business questions. Each one needs data from several tables at once (ATMs, branches, technicians, service calls), grouped and counted. A database is built for exactly that, so we compute the answers in the backend with SQL and send the frontend finished results. This keeps one source of truth, avoids shipping every row to the browser, and lets us verify each answer against the seed data we designed. The alerts are computed **live on each request**, so they always reflect the current data. (Saving alerts with a history, or letting users acknowledge them, would be a bigger feature for later.)

**The five metrics** (definitions agreed in Step 15):

| # | Question | Endpoint |
|---|---|---|
| 1 | Which active ATMs are below 20% cash ($2,000 of a $10,000 reserve), across all branches? | `GET /metrics/low-cash-atms` |
| 2 | Which technicians are assigned to an active call at an ATM outside their own branch? | `GET /metrics/technician-mismatches` |
| 3 | What percentage of finished service calls were completed vs failed, per ATM model? | `GET /metrics/completion-by-model` |
| 4 | Which branches have more than 30% of their ATMs in maintenance? | `GET /metrics/maintenance-alerts` |
| 5 | How many technicians have active calls, per supervisor? | `GET /metrics/technicians-by-supervisor` |
| | Everything above plus headline counts for dashboard cards, in one request | `GET /metrics/dashboard` |

**How the code is organized:**

- `config.py`: the business rules ($10,000, 20%, 30%) as **named settings**, never numbers buried in code. They can be overridden in `.env` (for example `LOW_CASH_THRESHOLD=0.25`) without touching code. We use `Decimal` (exact decimal arithmetic) so `10000 × 0.20` is exactly `2000.00`, with no floating-point surprises.
- `schemas/metrics.py`: the JSON shape of each result.
- `metrics.py`: the logic, one function per metric, each taking a database session.
- `routers/metrics.py`: thin URL handlers that just call those functions. Keeping logic out of the router means other code (tests, a future simulation) can reuse the same functions.

**SQL ideas used in `metrics.py`:**

- **`aliased(Branch)`.** The mismatch query needs the `branches` table twice: once for the technician's branch and once for the ATM's branch. An alias is a second nickname for the same table.
- **`count(...).filter(...)`.** Counts only rows matching a condition, so one query can produce "completed" and "failed" counts side by side.
- **Outer join** (`completion_by_model`). Keeps ATM models that have no service calls, so they show up with 0 instead of vanishing. Their percentages are `null` ("no data"), which also avoids dividing by zero.
- **`count(distinct ...)`.** A technician with two active calls counts once as a technician, while `active_calls` still counts both calls.
- **The maintenance threshold comparison** (`in_maintenance > threshold * total`) is done in Python because there are only as many rows as branches. It is strictly "more than 30%".
- **Every status is listed** in the dashboard summary, even with a count of 0, so the frontend can rely on the keys always existing.

**16a. Add the settings.** Replace `backend/app/config.py`:

**`backend/app/config.py`**

```python
from decimal import Decimal
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    cors_origins: list[str] = ["http://localhost:5173"]

    # Business rules used by the metrics
    atm_cash_capacity: Decimal = Decimal("10000")  # a full cash reserve, in dollars
    low_cash_threshold: Decimal = Decimal("0.20")  # below 20% of capacity is "low"
    maintenance_alert_threshold: Decimal = Decimal("0.30")  # over 30% of a branch's ATMs

    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env")


settings = Settings()
```

> **Troubleshooting:** If `low-cash-atms`, `maintenance-alerts` and `dashboard` return `500 Internal Server Error` while the other three work, this file wasn't updated. Those three read the new settings, and the traceback in the server terminal ends with `AttributeError: 'Settings' object has no attribute 'atm_cash_capacity'`. When any endpoint fails, read the **last lines** of the traceback in the terminal running uvicorn: they name the cause.

Check that the settings load (from `backend/`, venv active). Expected output: `10000 0.20 0.30`.

```bash
python -c "from app.config import settings; print(settings.atm_cash_capacity, settings.low_cash_threshold, settings.maintenance_alert_threshold)"
```

**16b. Schemas.**

**`backend/app/schemas/metrics.py`**

```python
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
```

**16c. The metric logic.**

**`backend/app/metrics.py`**

```python
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
```

**16d. The routes.**

**`backend/app/routers/metrics.py`**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import metrics
from app.database import get_db
from app.schemas.metrics import (
    Dashboard,
    LowCashReport,
    MaintenanceAlert,
    ModelCompletion,
    SupervisorWorkload,
    TechnicianMismatch,
)

router = APIRouter(prefix="/metrics", tags=["metrics"])


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
```

**16e. Register the router** in `backend/app/main.py`: add `metrics` to the router import line and add `app.include_router(metrics.router, dependencies=protected)` after the other protected routers. It is protected like the other data routes. No migration is needed because the database structure didn't change.

**`backend/app/main.py`**

```python
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.dependencies import get_current_user
from app.routers import atms, auth, branches, metrics, reports, service_calls, technicians

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
app.include_router(metrics.router, dependencies=protected)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
```

**16f. Verify.** The server reloads itself. In `/docs` (log in and Authorize first) you'll see a new **metrics** group. With the seed data from Step 15, expect:

| Endpoint | Expected |
|---|---|
| `GET /metrics/low-cash-atms` | `total` 5 and `threshold_amount` `"2000.00"`, with one ATM in each branch. Serials `10017`, `10006`, `10003`, `10015`, `10011` at 8%, 9.5%, 12%, 15%, 17.5% full. ATM `10008` (exactly $2,000) is **not** listed |
| `GET /metrics/technician-mismatches` | 3 items: Marcus Lee (Harbor) on a Downtown ATM, Daniel Kim (Lakeside) on a Harbor ATM, Tomas Silva (Riverside) on a Summit ATM |
| `GET /metrics/completion-by-model` | Diebold Nixdorf 50% / 50%, Hyosung 0% / 100%, NCR 100% / 0% |
| `GET /metrics/maintenance-alerts` | Downtown and Lakeside at 50.0%. Harbor (25%) is **absent** |
| `GET /metrics/technicians-by-supervisor` | 101 → 1 technician, 102 → 2, 103 → 2 |
| `GET /metrics/dashboard` | All of the above plus `summary`: 20 ATMs, 6 open service calls, 3 of them critical |

Try the metrics responding to changes: `PATCH /atms/4` with `{"status": "Maintenance"}` makes Downtown 3 of 4 (75%), and ATM 4 stops counting as active. Set it back to `Operational` afterward (or re-run `python -m app.seed`).

---

### Step 17 ✅ — Build the app layout and dashboard

**Why:** The metrics API returns the answers; this step puts them on screen. We add a shared layout (top bar and navigation) that every logged-in page uses, and a dashboard page that shows the headline numbers, status badges, alerts and reports from a single call to `GET /metrics/dashboard`. The dashboard loads when the page opens, and a **Refresh** button reloads it on demand (no automatic polling for now; that is easy to add later if the data starts changing over time).

**Concepts:**

- **Props.** Components receive inputs as props, like `<StatCard label="Total ATMs" value={20} />`, so one component can be reused with different data.
- **Rendering lists.** `array.map(item => <Thing key={item.id} />)` turns data into elements. The `key` lets React track which item is which.
- **Conditional rendering.** `{condition && <Alert />}` shows the element only when the condition is true. That is how alerts appear only when they apply.
- **MUI `Grid`.** `<Grid container>` holds the layout and each `<Grid size={{ xs: 12, md: 6 }}>` is a column. The numbers are out of 12 and change per screen size: `xs` is phones and `md` is medium screens and up, so cards stack on a phone and sit side by side on a laptop.
- **Custom hook.** `useApi` packages "load data, track loading and errors, allow reload" so every page can reuse it.
- **Layout route.** `<Route element={<Layout />}>` wraps its child pages with the top bar. `<Outlet />` inside `Layout` is where each page appears.
- **StrictMode in development.** In dev you'll see two `/metrics/dashboard` requests on first load. React deliberately runs effects twice to catch bugs. It doesn't happen in a production build. The `ignore` flag in `useApi` makes sure only the latest request's result is used.

**17a. Helpers.** Money arrives from the API as text such as `"800.00"`, so `formatCurrency` converts it to a number before formatting. `formatPercent` handles the `null` the API sends when a model has no finished service calls.

**`frontend/src/format.js`**

```js
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

// The API sends money as text such as "1200.00", so convert it to a number first
export const formatCurrency = (amount) => currency.format(Number(amount))

export const formatPercent = (value) => (value === null ? 'No data' : `${value}%`)
```

The `useApi` hook loads data when a component first appears and offers a `reload()` function. Its `loading` flag lets the page show a spinner, and `error` holds a readable message if the request fails:

**`frontend/src/hooks/useApi.js`**

```js
import { useCallback, useEffect, useState } from 'react'

import { apiFetch } from '../api.js'

// Loads data from the API when the component first appears, and offers reload()
export function useApi(path) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    // If the component goes away (or a newer request starts), ignore this request's result
    let ignore = false
    apiFetch(path)
      .then((result) => {
        if (ignore) return
        setData(result)
        setError('')
      })
      .catch((err) => {
        if (!ignore) setError(err.message)
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [path, reloadCount])

  const reload = useCallback(() => {
    setLoading(true)
    setReloadCount((count) => count + 1)
  }, [])

  return { data, loading, error, reload }
}
```

**17b. Reusable components** (create the `components` folder). `StatCard` is one headline number; `StatusChip` is a colored badge whose color comes from a lookup table of statuses and priorities. It already knows the service call priorities, so we'll reuse it for the data grid pages.

**`frontend/src/components/StatCard.jsx`**

```jsx
import { Card, CardContent, Typography } from '@mui/material'

export default function StatCard({ label, value, color = 'text.primary' }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography color="text.secondary" gutterBottom>
          {label}
        </Typography>
        <Typography variant="h3" sx={{ color }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  )
}
```

**`frontend/src/components/StatusChip.jsx`**

```jsx
import { Chip } from '@mui/material'

// Which MUI color each status or priority gets
const COLORS = {
  Operational: 'success',
  'In-Transport': 'info',
  Maintenance: 'warning',
  Offline: 'error',
  Pending: 'default',
  'In-Progress': 'info',
  Completed: 'success',
  Failed: 'error',
  Low: 'default',
  Medium: 'warning',
  Critical: 'error',
}

export default function StatusChip({ status, count }) {
  const label = count === undefined ? status : `${status}: ${count}`
  return <Chip label={label} color={COLORS[status] ?? 'default'} size="small" />
}
```

**17c. The layout.** `component={NavLink}` makes an MUI button behave as a router link, and React Router automatically adds an `active` class to the link for the current page, which the `sx` rule highlights. `end` stops `/` from counting as "active" on every page. Navigation lists only the Dashboard for now; we add entries to `NAV_ITEMS` as new pages are built, so there are never dead links.

**`frontend/src/components/Layout.jsx`**

```jsx
import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material'
import { NavLink, Outlet } from 'react-router'

import { useAuth } from '../AuthContext.jsx'

// Add an entry here whenever we build a new page
const NAV_ITEMS = [{ label: 'Dashboard', to: '/' }]

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ mr: 4 }}>
            CashCow
          </Typography>
          <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
            {NAV_ITEMS.map((item) => (
              <Button
                key={item.to}
                color="inherit"
                component={NavLink}
                to={item.to}
                end
                sx={{ '&.active': { bgcolor: 'rgba(255, 255, 255, 0.18)' } }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user.full_name}
          </Typography>
          <Button color="inherit" onClick={logout}>
            Log out
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Outlet />
      </Container>
    </Box>
  )
}
```

**17d. The dashboard page.** The spinner shows only on the first load (`loading && !data`). On a later Refresh the old data stays visible while the new data loads, so the page doesn't flash empty. Errors appear above the content.

**`frontend/src/pages/DashboardPage.jsx`**

```jsx
import RefreshIcon from '@mui/icons-material/Refresh'
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  List,
  ListItem,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'

import StatCard from '../components/StatCard.jsx'
import StatusChip from '../components/StatusChip.jsx'
import { formatCurrency, formatPercent } from '../format.js'
import { useApi } from '../hooks/useApi.js'

export default function DashboardPage() {
  const { data, loading, error, reload } = useApi('/metrics/dashboard')

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Dashboard</Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={reload} disabled={loading}>
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      {loading && !data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      )}
      {data && <DashboardContent data={data} />}
    </Box>
  )
}

function DashboardContent({ data }) {
  const {
    summary,
    low_cash,
    technician_mismatches,
    completion_by_model,
    maintenance_alerts,
    technicians_by_supervisor,
  } = data

  const hasAlerts =
    low_cash.total > 0 || technician_mismatches.length > 0 || maintenance_alerts.length > 0

  return (
    <Grid container spacing={3}>
      {/* Headline numbers */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard label="Total ATMs" value={summary.total_atms} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard label="Open service calls" value={summary.open_service_calls} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard
          label="Critical open calls"
          value={summary.critical_open_service_calls}
          color={summary.critical_open_service_calls > 0 ? 'error.main' : undefined}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard
          label="Low-cash ATMs"
          value={low_cash.total}
          color={low_cash.total > 0 ? 'warning.main' : undefined}
        />
      </Grid>

      {/* Status badges */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              ATMs by status
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.entries(summary.atms_by_status).map(([status, count]) => (
                <StatusChip key={status} status={status} count={count} />
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Service calls by status
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.entries(summary.service_calls_by_status).map(([status, count]) => (
                <StatusChip key={status} status={status} count={count} />
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Alerts: only the ones that currently apply */}
      <Grid size={12}>
        <Typography variant="h6" gutterBottom>
          Alerts
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {!hasAlerts && <Alert severity="success">No alerts right now.</Alert>}

          {technician_mismatches.length > 0 && (
            <Alert severity="error">
              <AlertTitle>
                {technician_mismatches.length} technician(s) assigned outside their branch
              </AlertTitle>
              <List dense disablePadding>
                {technician_mismatches.map((item) => (
                  <ListItem key={item.service_call_id} disableGutters>
                    <ListItemText
                      primary={`${item.technician_name} (${item.technician_branch_name}) is assigned to "${item.service_call_title}" at ATM ${item.atm_serial_number} (${item.atm_branch_name})`}
                    />
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}

          {low_cash.total > 0 && (
            <Alert severity="warning">
              <AlertTitle>
                {low_cash.total} active ATM(s) below {formatCurrency(low_cash.threshold_amount)}
              </AlertTitle>
              <List dense disablePadding>
                {low_cash.atms.map((atm) => (
                  <ListItem key={atm.id} disableGutters>
                    <ListItemText
                      primary={`ATM ${atm.serial_number} at ${atm.branch_name}: ${formatCurrency(atm.cash_level)} (${atm.percent_full}% full)`}
                    />
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}

          {maintenance_alerts.length > 0 && (
            <Alert severity="warning">
              <AlertTitle>{maintenance_alerts.length} branch(es) with many ATMs in maintenance</AlertTitle>
              <List dense disablePadding>
                {maintenance_alerts.map((branch) => (
                  <ListItem key={branch.branch_id} disableGutters>
                    <ListItemText
                      primary={`${branch.branch_name}: ${branch.maintenance_atms} of ${branch.total_atms} ATMs in maintenance (${branch.percent_in_maintenance}%)`}
                    />
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}
        </Box>
      </Grid>

      {/* Reports */}
      <Grid size={{ xs: 12, md: 7 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Completed vs failed service calls, by ATM model
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Model</TableCell>
                  <TableCell align="right">Completed</TableCell>
                  <TableCell align="right">Failed</TableCell>
                  <TableCell align="right">Completed %</TableCell>
                  <TableCell align="right">Failed %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {completion_by_model.map((row) => (
                  <TableRow key={row.model}>
                    <TableCell>{row.model}</TableCell>
                    <TableCell align="right">{row.completed}</TableCell>
                    <TableCell align="right">{row.failed}</TableCell>
                    <TableCell align="right">{formatPercent(row.completed_percent)}</TableCell>
                    <TableCell align="right">{formatPercent(row.failed_percent)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Technicians on active calls, by supervisor
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Supervisor</TableCell>
                  <TableCell align="right">Technicians</TableCell>
                  <TableCell align="right">Active calls</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {technicians_by_supervisor.map((row) => (
                  <TableRow key={row.supervisor_id}>
                    <TableCell>Supervisor {row.supervisor_id}</TableCell>
                    <TableCell align="right">{row.technicians}</TableCell>
                    <TableCell align="right">{row.active_calls}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
```

**17e. Wire it into the router.** Replace `App.jsx`, and **delete `src/pages/HomePage.jsx`** (the dashboard replaces the old placeholder):

**`frontend/src/App.jsx`**

```jsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AuthProvider } from './AuthContext.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import Layout from './components/Layout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import LoginPage from './pages/LoginPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

**17f. Try it.** With both servers running and the seed data loaded (Step 15), open `http://localhost:5173` and log in. You should see:

- A green top bar with the app name, a Dashboard link, your name and a Log out button.
- Four stat cards: **20** total ATMs, **6** open service calls, **3** critical open calls (red), **5** low-cash ATMs (orange).
- Status badges: ATMs (Operational 13, In-Transport 1, Maintenance 5, Offline 1) and service calls (Pending 3, In-Progress 3, Completed 2, Failed 2).
- Alerts: a red one listing the 3 technician mismatches, an orange one listing the 5 low-cash ATMs below $2,000.00, and an orange one for Downtown and Lakeside (2 of 4 ATMs, 50%). If no alert applies, a single green "No alerts right now." message appears instead.
- Two tables: completed vs failed percentages by ATM model (Diebold 50/50, Hyosung 0/100, NCR 100/0) and technicians by supervisor (101 → 1, 102 → 2, 103 → 2).

Then check that it is live data:

1. Click **Refresh**: the button disables briefly and the page keeps its content.
2. In `/docs`, `PATCH /atms/4` with `{"status": "Maintenance"}`, then **Refresh**. Downtown moves to 3 of 4 (75%) and ATM `10004` is no longer counted as an active ATM. Set it back to `Operational` afterwards (or re-run `python -m app.seed`).
3. Narrow the browser window: the cards stack into a single column.

---

### Step 18 ✅ — Return readable names from the ATM and service call endpoints

**Why:** The upcoming data grids should show names ("Riverside", "Alex Rivera"), but `GET /atms` and `GET /service-calls` return raw ids (`branch_id`, `atm_id`, `technician_id`). We could make the browser fetch several lists and look names up itself, but that means more requests and duplicated join logic on the client. Instead the backend adds the display fields, so each page needs a single request and the join logic lives in one place. This is the same approach the metrics endpoints already take.

**What changes:** only the *responses*. Creating and updating work exactly as before, and **no migration is needed** because nothing changes in the database.

| Endpoint | New fields |
|---|---|
| `GET/POST/PATCH /atms` | `branch_name` |
| `GET/POST/PATCH /service-calls` | `atm_serial_number`, `atm_model`, `branch_name` (the ATM's branch), `technician_name` (`null` when unassigned) |

**Concepts:**

- **Python `@property`.** The models already link to each other (`atm.branch`, `service_call.atm`, `service_call.technician`). A `@property` is a read-only attribute computed on the fly, so `atm.branch_name` simply returns `self.branch.name`. Because Pydantic reads fields off the ORM object (`from_attributes=True`), adding a matching field to the response schema is all it takes to include it.
- **Lazy loading.** By default SQLAlchemy fetches a related object the first time you touch it, with its own query.
- **The N+1 query problem.** If a list of N rows each lazily loads its related rows, you run 1 query for the list plus N more for the relations. It is invisible with 10 rows and painful with 10,000. We measured it on the seed data:

  | List | Without `joinedload` | With `joinedload` |
  |---|---|---|
  | 20 ATMs | 6 queries | 1 |
  | 10 service calls | 23 queries | 1 |

- **`joinedload`.** Tells SQLAlchemy to fetch the related rows in the same query using a SQL `JOIN`. We use it on the **list** endpoints. Single-record endpoints (get, create, patch) don't need it, since one extra lookup is fine.

**18a. Add read-only properties to the models.**

**`backend/app/models/atm.py`**: add `branch_name` at the end of the `ATM` class:

```python
    service_calls: Mapped[list["ServiceCall"]] = relationship(back_populates="atm")

    @property
    def branch_name(self) -> str:
        return self.branch.name
```

**`backend/app/models/service_call.py`**: add the four properties at the end of the `ServiceCall` class:

```python
    reports: Mapped[list["Report"]] = relationship(back_populates="service_call")

    @property
    def atm_serial_number(self) -> str:
        return self.atm.serial_number

    @property
    def atm_model(self) -> str:
        return self.atm.model

    @property
    def branch_name(self) -> str:
        return self.atm.branch.name

    @property
    def technician_name(self) -> str | None:
        return self.technician.name if self.technician else None
```

A service call's `branch_name` is the branch of its ATM. `technician_name` is `None` when no technician is assigned.

**18b. Add the fields to the response schemas.** Only the `Read` schemas change; the create and update schemas stay as they are.

**`backend/app/schemas/atm.py`**

```python
class ATMRead(ATMCreate):
    id: int
    branch_name: str

    model_config = ConfigDict(from_attributes=True)
```

**`backend/app/schemas/service_call.py`**

```python
class ServiceCallRead(ServiceCallCreate):
    id: int
    status: ServiceStatus
    atm_serial_number: str
    atm_model: str
    branch_name: str  # the branch the ATM belongs to
    technician_name: str | None

    model_config = ConfigDict(from_attributes=True)
```

**18c. Load the related rows efficiently in the list endpoints.**

**`backend/app/routers/atms.py`**: import `joinedload` and use it in `list_atms`:

```python
from sqlalchemy.orm import Session, joinedload

@router.get("", response_model=list[ATMRead])
def list_atms(db: Session = Depends(get_db)):
    return db.scalars(select(ATM).options(joinedload(ATM.branch)).order_by(ATM.id)).all()
```

**`backend/app/routers/service_calls.py`**: import `joinedload` and use it in `list_service_calls`:

```python
from sqlalchemy.orm import Session, joinedload

@router.get("", response_model=list[ServiceCallRead])
def list_service_calls(db: Session = Depends(get_db)):
    return db.scalars(
        select(ServiceCall)
        .options(
            joinedload(ServiceCall.atm).joinedload(ATM.branch),
            joinedload(ServiceCall.technician),
        )
        .order_by(ServiceCall.id)
    ).all()
```

**18d. Verify.** The server reloads itself. In `/docs` (log in and Authorize first):

| Request | Expected |
|---|---|
| `GET /atms` | Each ATM now has `"branch_name"`, for example serial `10001` → `Downtown` |
| `GET /service-calls` | Each call has `atm_serial_number`, `atm_model`, `branch_name` and `technician_name`. Call 1: `10004`, `NCR SelfServ 84`, `Downtown`, `Marcus Lee`. Call 6: `technician_name` is `null` |
| `PATCH /service-calls/6` with `{"technician_id": 2}` | `technician_name` becomes `Priya Nair` |
| Same call with `{"technician_id": null}` | `technician_name` is `null` again |
| `PATCH /atms/1` with `{"status": "Maintenance"}` | Still works, and the response includes `branch_name` |

Set anything you changed back, or re-run `python -m app.seed`.

---

### Step 19 ✅ — Build the ATMs and Service Calls data grid pages

**Why:** The dashboard summarizes; these pages let a user browse every record. Each page shows a table that can be **sorted** by any column, **searched** live, and **paginated**, using the Material UI DataGrid. Thanks to Step 18, the API already returns readable names, so each page needs a single request.

**Concepts:**

- **DataGrid** takes two things: `rows` (an array of objects, our API data) and `columns` (a list describing each column). Sorting and pagination are built in.
- **Column options.**
  - `field` names the property to show; `flex` and `width` size the column.
  - `renderCell` draws custom content, such as our colored `StatusChip`.
  - `valueGetter` changes the underlying value. Cash arrives as text (`"950.00"`), and sorting text puts `$10,000` before `$950`, so we convert to a number for correct sorting.
  - `valueFormatter` changes only the display, turning the number back into `$950.00`.
  - A missing technician (`null`) gets `valueGetter: value ?? 'Unassigned'`, so it shows readable text *and* is searchable.
- **Search ("quick filter").** DataGrid can filter rows by a list of words, matching each against all columns; every word must match somewhere in the row (so `lakeside maintenance` narrows to Lakeside ATMs in maintenance). We supply `quickFilterValues` from our own text box rather than the grid's built-in toolbar, which keeps the search box in our page layout.
- **`autoHeight`** makes the grid as tall as its rows, so the page scrolls instead of the grid.
- **One shared `DataTable` component** holds the search box, error message and grid, so each page only describes its columns.
- **MIT edition limits.** The free DataGrid supports the sorting, filtering and pagination used here, with at most 100 rows per page. Features such as row grouping or Excel export need the paid Pro tier.

**Choices made:** there is no "percent full" column, because it would hardcode the $10,000 capacity in the frontend and duplicate a rule that lives in the backend settings. If we want it later, the API should return it (as the metrics do). Mismatched technicians are not highlighted on the service calls grid, since that would need the technician's branch in the response; the dashboard already covers that alert.

**19a. The shared table component.** No new packages are needed: DataGrid, the search icon and React Router were installed earlier.

**`frontend/src/components/DataTable.jsx`**

```jsx
import SearchIcon from '@mui/icons-material/Search'
import { Alert, Box, Card, InputAdornment, TextField } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import { useState } from 'react'

// A table with live search, column sorting and pagination.
// Sorting and pagination are built into DataGrid; searching works by giving it "quick filter" words.
export default function DataTable({ rows, columns, loading, error, searchLabel, pageSize = 10 }) {
  const [search, setSearch] = useState('')

  return (
    <Box>
      <TextField
        label={searchLabel}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        size="small"
        sx={{ mb: 2, width: { xs: '100%', sm: 360 } }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Card>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          autoHeight
          disableRowSelectionOnClick
          pageSizeOptions={[5, 10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize } } }}
          filterModel={{ items: [], quickFilterValues: search.split(' ').filter(Boolean) }}
        />
      </Card>
    </Box>
  )
}
```

**19b. The ATMs page.** The `COLUMNS` list is defined *outside* the component so it isn't rebuilt on every render.

**`frontend/src/pages/AtmsPage.jsx`**

```jsx
import RefreshIcon from '@mui/icons-material/Refresh'
import { Box, Button, Typography } from '@mui/material'

import DataTable from '../components/DataTable.jsx'
import StatusChip from '../components/StatusChip.jsx'
import { formatCurrency } from '../format.js'
import { useApi } from '../hooks/useApi.js'

const COLUMNS = [
  { field: 'serial_number', headerName: 'Serial', width: 110 },
  { field: 'model', headerName: 'Model', flex: 1, minWidth: 180 },
  { field: 'branch_name', headerName: 'Branch', flex: 1, minWidth: 130 },
  {
    field: 'status',
    headerName: 'Status',
    width: 150,
    renderCell: (params) => <StatusChip status={params.value} />,
  },
  {
    field: 'cash_level',
    headerName: 'Cash level',
    type: 'number',
    width: 130,
    // The API sends money as text, so convert to a number to sort numerically
    valueGetter: (value) => Number(value),
    valueFormatter: (value) => formatCurrency(value),
  },
]

export default function AtmsPage() {
  const { data, loading, error, reload } = useApi('/atms')

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">ATMs</Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={reload} disabled={loading}>
          Refresh
        </Button>
      </Box>
      <DataTable
        rows={data ?? []}
        columns={COLUMNS}
        loading={loading}
        error={error}
        searchLabel="Search ATMs"
      />
    </Box>
  )
}
```

**19c. The Service Calls page.** It shows 5 rows per page (`pageSize={5}`) so pagination is visible with only 10 sample calls.

**`frontend/src/pages/ServiceCallsPage.jsx`**

```jsx
import RefreshIcon from '@mui/icons-material/Refresh'
import { Box, Button, Typography } from '@mui/material'

import DataTable from '../components/DataTable.jsx'
import StatusChip from '../components/StatusChip.jsx'
import { useApi } from '../hooks/useApi.js'

const COLUMNS = [
  { field: 'title', headerName: 'Title', flex: 1.5, minWidth: 220 },
  {
    field: 'priority',
    headerName: 'Priority',
    width: 120,
    renderCell: (params) => <StatusChip status={params.value} />,
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 140,
    renderCell: (params) => <StatusChip status={params.value} />,
  },
  { field: 'atm_serial_number', headerName: 'ATM', width: 100 },
  { field: 'atm_model', headerName: 'ATM model', flex: 1, minWidth: 170 },
  { field: 'branch_name', headerName: 'Branch', flex: 1, minWidth: 120 },
  {
    field: 'technician_name',
    headerName: 'Technician',
    flex: 1,
    minWidth: 140,
    valueGetter: (value) => value ?? 'Unassigned',
  },
]

export default function ServiceCallsPage() {
  const { data, loading, error, reload } = useApi('/service-calls')

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Service calls</Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={reload} disabled={loading}>
          Refresh
        </Button>
      </Box>
      <DataTable
        rows={data ?? []}
        columns={COLUMNS}
        loading={loading}
        error={error}
        searchLabel="Search service calls"
        pageSize={5}
      />
    </Box>
  )
}
```

**19d. Add the navigation links and routes.** In `components/Layout.jsx` the `NAV_ITEMS` list grows:

```jsx
const NAV_ITEMS = [
  { label: 'Dashboard', to: '/' },
  { label: 'ATMs', to: '/atms' },
  { label: 'Service Calls', to: '/service-calls' },
]
```

In `App.jsx`, import the two pages and add their routes inside the `<Route element={<Layout />}>` block, so they get the login check and the top bar:

**`frontend/src/App.jsx`**

```jsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AuthProvider } from './AuthContext.jsx'
import AtmsPage from './pages/AtmsPage.jsx'
import ServiceCallsPage from './pages/ServiceCallsPage.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import Layout from './components/Layout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import LoginPage from './pages/LoginPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/atms" element={<AtmsPage />} />
              <Route path="/service-calls" element={<ServiceCallsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

**19e. Try it.** With both servers running and the seed data loaded:

1. Click **ATMs**: 10 rows per page (1-10 of 20), colored status chips, dollar amounts. The current page is highlighted in the top bar.
2. Type `maintenance` in the search box and the rows narrow immediately. Try `lakeside maintenance` too (2 rows).
3. Click the **Cash level** header: lowest first ($800, $950, $1,200...), click again for highest first ($10,000 on top). It sorts by number, not text.
4. Use the page arrows at the bottom, or change **Rows per page**.
5. Click **Service Calls**: 5 per page (1-5 of 10), with priority and status chips. Search `unassigned` to find the call with no technician.
6. Change data in `/docs` (for example `PATCH /atms/4` to `Maintenance`), then click **Refresh** to see it update.

---

### Step 20 ✅ — Role-based access control: the backend

**Why:** Until now every logged-in user could do everything. Real systems give different people different powers. We add three **roles** and make the API enforce them:

| Role | Can do |
|---|---|
| **Operations Admin** | Everything: create, read, update and delete branches, technicians, ATMs, service calls and user accounts |
| **Field Technician** | See only their own ATMs and service calls; move their calls forward (`Pending → In-Progress → Completed/Failed`); attach diagnostic reports to their own calls |
| **Auditor** | View the dashboard and every list (read-only). Cannot change anything |

**The permission matrix** (what the API enforces on every endpoint):

| | Operations Admin | Field Technician | Auditor |
|---|---|---|---|
| Dashboard and `/metrics/*` | yes | no | yes |
| Branches and technicians: view | yes | no | yes |
| Branches and technicians: create, edit, delete | yes | no | no |
| ATMs: view | all | only ATMs with an *active* call assigned to them | all |
| ATMs: create, edit, delete | yes | no | no |
| Service calls: view | all | only their own | all |
| Service calls: create, edit, delete | yes | no | no |
| Service calls: change status | any status | own calls, forward steps only | no |
| Reports: view | all | reports on their own calls | all |
| Reports: create | yes | on their own calls | no |
| User accounts: view, create, edit, delete | yes | no | no |

**Concepts:**

- **Authentication vs authorization.** Authentication (Step 12) answers "who are you?". **Authorization** answers "what may you do?". Roles are authorization.
- **Role stored on the user, read from the database on every request.** We do *not* put the role in the JWT. If we did, demoting or deleting someone would not take effect until their token expired. Our `get_current_user` already looks the user up on every request, so changes apply immediately.
- **Two layers of rules.**
  1. **Role rules:** `require_roles(...)` on a route. The wrong role gets `403 Forbidden`.
  2. **Row rules (technicians):** a technician's queries are *filtered* to their own data (`access.py`). Anything outside it is reported as `404 Not Found`, so its existence isn't even revealed.
- **Hiding is not security.** The API is the authority. The frontend (Steps 21-22) only decides what to *show*.
- **A dependency factory.** `require_roles(UserRole.ADMIN, ...)` is a function that *builds* a FastAPI dependency. `admin_only` and `read_all` are ready-made ones.
- **Database check constraint.** A Field Technician login must be linked to a technician, and other roles must not be. We enforce that in the database itself, not only in the API.
- **Why not `TRUNCATE ... CASCADE` any more.** Users now reference technicians. `TRUNCATE ... CASCADE` would wipe the `users` table, so the seed script deletes in dependency order instead.

**Rules around deleting** (agreed up front, enforced with `409 Conflict`):

- A branch with ATMs or technicians, an ATM with service calls, and a technician with service calls or a login can't be deleted.
- Deleting a **service call** also deletes its reports.
- An Admin can't delete their own account or change their own role. Only Admins can manage users, so this also means the last Admin can never be removed.

**20a. The role enum and a shared constant.** Append to `backend/app/models/enums.py`, and change `metrics.py` to import `ACTIVE_CALL_STATUSES` from there instead of defining it locally:

```python
class UserRole(str, Enum):
    ADMIN = "Operations Admin"
    TECHNICIAN = "Field Technician"
    AUDITOR = "Auditor"

# A service call that is still open
ACTIVE_CALL_STATUSES = (ServiceStatus.PENDING, ServiceStatus.IN_PROGRESS)
```


**20b. The `User` model gets a role and a technician link.**

**`backend/app/models/user.py`**

```python
from sqlalchemy import CheckConstraint, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import UserRole


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        # One login per technician
        UniqueConstraint("technician_id", name="uq_users_technician_id"),
        # Field Technician accounts must be linked to a technician; other roles must not be
        CheckConstraint(
            "(role = 'Field Technician') = (technician_id IS NOT NULL)",
            name="ck_users_technician_role",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(100))
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", values_callable=lambda e: [m.value for m in e])
    )
    technician_id: Mapped[int | None] = mapped_column(
        ForeignKey("technicians.id", name="fk_users_technician_id")
    )

    technician: Mapped["Technician | None"] = relationship()
```

In `backend/app/models/service_call.py`, the `reports` relationship gets a cascade so deleting a call deletes its reports:

```python
    reports: Mapped[list["Report"]] = relationship(
        back_populates="service_call", cascade="all, delete-orphan"
    )
```

**20c. The migration (written by hand).**

```bash
cd backend
source .venv/bin/activate
alembic revision -m "add user roles"
```

We write this one by hand (no `--autogenerate`) for two reasons: autogenerate would add a `NOT NULL` column to a table that already has rows, which fails, and it can't see check constraints. The temporary `server_default` below gives existing users a role; **every existing account becomes an Operations Admin**. Replace the two functions in the new file with:

```python
def upgrade() -> None:
    """Upgrade schema."""
    user_role = sa.Enum("Operations Admin", "Field Technician", "Auditor", name="user_role")
    user_role.create(op.get_bind())

    # Existing accounts were all created as full users, so they become Operations Admins.
    # The temporary server_default fills in existing rows; we remove it right after.
    op.add_column(
        "users",
        sa.Column("role", user_role, nullable=False, server_default="Operations Admin"),
    )
    op.alter_column("users", "role", server_default=None)

    op.add_column("users", sa.Column("technician_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_users_technician_id", "users", "technicians", ["technician_id"], ["id"])
    op.create_unique_constraint("uq_users_technician_id", "users", ["technician_id"])
    op.create_check_constraint(
        "ck_users_technician_role",
        "users",
        "(role = 'Field Technician') = (technician_id IS NOT NULL)",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("ck_users_technician_role", "users", type_="check")
    op.drop_constraint("uq_users_technician_id", "users", type_="unique")
    op.drop_constraint("fk_users_technician_id", "users", type_="foreignkey")
    op.drop_column("users", "technician_id")
    op.drop_column("users", "role")
    sa.Enum(name="user_role").drop(op.get_bind())
```

```bash
alembic upgrade head
alembic check
```

Expected: `No new upgrade operations detected.`

**20d. Permission helpers.** Add `from app.models.enums import UserRole` to `dependencies.py`'s imports and append the role helpers:

```python
def require_roles(*roles: UserRole):
    """Build a dependency that only lets users with one of the given roles through."""

    def check_role(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="You do not have permission to do this")
        return user

    return check_role


admin_only = require_roles(UserRole.ADMIN)
# Roles that may see everything (but only the Admin may change anything)
read_all = require_roles(UserRole.ADMIN, UserRole.AUDITOR)
```

Create `backend/app/access.py` for the technician row rules:

**`backend/app/access.py`**

```python
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
```

**20e. Schemas.** `UserRead` now includes the role and technician link (never the password hash). New `schemas/user.py`, plus small additions to the other schema files:

```python
class UserRead(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: UserRole
    technician_id: int | None

    model_config = ConfigDict(from_attributes=True)
```

**`backend/app/schemas/user.py`**

```python
from pydantic import BaseModel, EmailStr, Field

from app.models.enums import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=72)
    role: UserRole
    technician_id: int | None = None  # required for Field Technicians, not allowed otherwise


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=100)
    password: str | None = Field(default=None, min_length=8, max_length=72)
    role: UserRole | None = None
    technician_id: int | None = None
```

Append `BranchUpdate` to `schemas/branch.py`, `TechnicianUpdate` to `schemas/technician.py`, `ServiceCallStatusUpdate` to `schemas/service_call.py`, and add `branch_id: int | None = None` to the end of `ATMUpdate` in `schemas/atm.py` so an ATM can be relocated:

```python
class BranchUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    region: str | None = Field(default=None, min_length=1, max_length=100)
    capacity: int | None = Field(default=None, gt=0)
    supervisor_id: int | None = None
```

```python
class TechnicianUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    branch_id: int | None = None
```

```python
class ServiceCallStatusUpdate(BaseModel):
    status: ServiceStatus
```

```python
class ATMUpdate(BaseModel):
    model: str | None = Field(default=None, min_length=1, max_length=100)
    status: ATMStatus | None = None
    cash_level: Decimal | None = Field(default=None, ge=0, le=10000, max_digits=12, decimal_places=2)
    branch_id: int | None = None
```

**20f. The routers.** Each route now declares who may use it. Replace these files:

**`backend/app/routers/branches.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import admin_only, read_all
from app.models import ATM, Branch, Technician
from app.routers.utils import get_or_404
from app.schemas.branch import BranchCreate, BranchRead, BranchUpdate

router = APIRouter(prefix="/branches", tags=["branches"])


@router.post(
    "",
    response_model=BranchRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(admin_only)],
)
def create_branch(data: BranchCreate, db: Session = Depends(get_db)):
    branch = Branch(**data.model_dump())
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch


@router.get("", response_model=list[BranchRead], dependencies=[Depends(read_all)])
def list_branches(db: Session = Depends(get_db)):
    return db.scalars(select(Branch).order_by(Branch.id)).all()


@router.get("/{branch_id}", response_model=BranchRead, dependencies=[Depends(read_all)])
def get_branch(branch_id: int, db: Session = Depends(get_db)):
    return get_or_404(db, Branch, branch_id, "Branch")


@router.patch("/{branch_id}", response_model=BranchRead, dependencies=[Depends(admin_only)])
def update_branch(branch_id: int, data: BranchUpdate, db: Session = Depends(get_db)):
    branch = get_or_404(db, Branch, branch_id, "Branch")
    # Only fields the client sent; explicit nulls are ignored (no branch column is optional)
    for field, value in data.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(branch, field, value)
    db.commit()
    db.refresh(branch)
    return branch


@router.delete(
    "/{branch_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(admin_only)]
)
def delete_branch(branch_id: int, db: Session = Depends(get_db)):
    branch = get_or_404(db, Branch, branch_id, "Branch")
    has_atms = db.scalar(select(exists().where(ATM.branch_id == branch_id)))
    has_technicians = db.scalar(select(exists().where(Technician.branch_id == branch_id)))
    if has_atms or has_technicians:
        raise HTTPException(
            status_code=409,
            detail="Branch still has ATMs or technicians; move or delete them first",
        )
    db.delete(branch)
    db.commit()
```

**`backend/app/routers/technicians.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import admin_only, read_all
from app.models import Branch, ServiceCall, Technician, User
from app.routers.utils import get_or_404
from app.schemas.technician import TechnicianCreate, TechnicianRead, TechnicianUpdate

router = APIRouter(prefix="/technicians", tags=["technicians"])


@router.post(
    "",
    response_model=TechnicianRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(admin_only)],
)
def create_technician(data: TechnicianCreate, db: Session = Depends(get_db)):
    get_or_404(db, Branch, data.branch_id, "Branch")
    technician = Technician(**data.model_dump())
    db.add(technician)
    db.commit()
    db.refresh(technician)
    return technician


@router.get("", response_model=list[TechnicianRead], dependencies=[Depends(read_all)])
def list_technicians(db: Session = Depends(get_db)):
    return db.scalars(select(Technician).order_by(Technician.id)).all()


@router.get("/{technician_id}", response_model=TechnicianRead, dependencies=[Depends(read_all)])
def get_technician(technician_id: int, db: Session = Depends(get_db)):
    return get_or_404(db, Technician, technician_id, "Technician")


@router.patch(
    "/{technician_id}", response_model=TechnicianRead, dependencies=[Depends(admin_only)]
)
def update_technician(technician_id: int, data: TechnicianUpdate, db: Session = Depends(get_db)):
    technician = get_or_404(db, Technician, technician_id, "Technician")
    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    if "branch_id" in changes:
        get_or_404(db, Branch, changes["branch_id"], "Branch")
    for field, value in changes.items():
        setattr(technician, field, value)
    db.commit()
    db.refresh(technician)
    return technician


@router.delete(
    "/{technician_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(admin_only)]
)
def delete_technician(technician_id: int, db: Session = Depends(get_db)):
    technician = get_or_404(db, Technician, technician_id, "Technician")
    has_calls = db.scalar(select(exists().where(ServiceCall.technician_id == technician_id)))
    has_login = db.scalar(select(exists().where(User.technician_id == technician_id)))
    if has_calls or has_login:
        raise HTTPException(
            status_code=409,
            detail="Technician still has service calls or a login account; remove those first",
        )
    db.delete(technician)
    db.commit()
```

**`backend/app/routers/atms.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import exists, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.access import get_visible_atm, visible_atms
from app.database import get_db
from app.dependencies import admin_only, get_current_user
from app.models import ATM, Branch, ServiceCall, User
from app.routers.utils import get_or_404
from app.schemas.atm import ATMCreate, ATMRead, ATMUpdate

router = APIRouter(prefix="/atms", tags=["atms"])


@router.post(
    "", response_model=ATMRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(admin_only)]
)
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
def list_atms(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    statement = select(ATM).options(joinedload(ATM.branch)).order_by(ATM.id)
    return db.scalars(visible_atms(statement, user)).all()


@router.get("/{atm_id}", response_model=ATMRead)
def get_atm(atm_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_visible_atm(db, user, atm_id)


@router.patch("/{atm_id}", response_model=ATMRead, dependencies=[Depends(admin_only)])
def update_atm(atm_id: int, data: ATMUpdate, db: Session = Depends(get_db)):
    atm = get_or_404(db, ATM, atm_id, "ATM")
    # Only fields the client sent; explicit nulls are ignored (no ATM column is optional)
    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    if "branch_id" in changes:
        get_or_404(db, Branch, changes["branch_id"], "Branch")
    for field, value in changes.items():
        setattr(atm, field, value)
    db.commit()
    db.refresh(atm)
    return atm


@router.delete("/{atm_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(admin_only)])
def delete_atm(atm_id: int, db: Session = Depends(get_db)):
    atm = get_or_404(db, ATM, atm_id, "ATM")
    if db.scalar(select(exists().where(ServiceCall.atm_id == atm_id))):
        raise HTTPException(
            status_code=409, detail="ATM still has service calls; delete those first"
        )
    db.delete(atm)
    db.commit()
```

**`backend/app/routers/service_calls.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.access import get_visible_service_call, visible_service_calls
from app.database import get_db
from app.dependencies import admin_only, get_current_user, require_roles
from app.models import ATM, ServiceCall, Technician, User
from app.models.enums import ServiceStatus, UserRole
from app.routers.utils import get_or_404
from app.schemas.service_call import (
    ServiceCallCreate,
    ServiceCallRead,
    ServiceCallStatusUpdate,
    ServiceCallUpdate,
)

router = APIRouter(prefix="/service-calls", tags=["service calls"])

# The only status changes a Field Technician may make (Admins may set any status)
TECHNICIAN_TRANSITIONS = {
    ServiceStatus.PENDING: {ServiceStatus.IN_PROGRESS},
    ServiceStatus.IN_PROGRESS: {ServiceStatus.COMPLETED, ServiceStatus.FAILED},
}


@router.post(
    "",
    response_model=ServiceCallRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(admin_only)],
)
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
def list_service_calls(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    statement = (
        select(ServiceCall)
        .options(
            joinedload(ServiceCall.atm).joinedload(ATM.branch),
            joinedload(ServiceCall.technician),
        )
        .order_by(ServiceCall.id)
    )
    return db.scalars(visible_service_calls(statement, user)).all()


@router.get("/{service_call_id}", response_model=ServiceCallRead)
def get_service_call(
    service_call_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return get_visible_service_call(db, user, service_call_id)


@router.patch(
    "/{service_call_id}", response_model=ServiceCallRead, dependencies=[Depends(admin_only)]
)
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


@router.patch("/{service_call_id}/status", response_model=ServiceCallRead)
def change_service_call_status(
    service_call_id: int,
    data: ServiceCallStatusUpdate,
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.TECHNICIAN)),
    db: Session = Depends(get_db),
):
    # For a technician this only finds calls assigned to them (anything else is a 404)
    service_call = get_visible_service_call(db, user, service_call_id)
    if user.role == UserRole.TECHNICIAN:
        allowed = TECHNICIAN_TRANSITIONS.get(service_call.status, set())
        if data.status not in allowed:
            raise HTTPException(
                status_code=409,
                detail=f"A technician cannot change a call from "
                f"{service_call.status.value} to {data.status.value}",
            )
    service_call.status = data.status
    db.commit()
    db.refresh(service_call)
    return service_call


@router.delete(
    "/{service_call_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(admin_only)],
)
def delete_service_call(service_call_id: int, db: Session = Depends(get_db)):
    service_call = get_or_404(db, ServiceCall, service_call_id, "Service call")
    db.delete(service_call)  # its reports are deleted with it (see the model's cascade)
    db.commit()
```

**`backend/app/routers/reports.py`**

```python
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.access import get_visible_report, get_visible_service_call, visible_reports
from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models import Report, User
from app.models.enums import UserRole
from app.schemas.report import ReportCreate, ReportRead

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
def create_report(
    data: ReportCreate,
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.TECHNICIAN)),
    db: Session = Depends(get_db),
):
    # A technician can only attach reports to their own service calls (else 404)
    get_visible_service_call(db, user, data.service_call_id)
    report = Report(**data.model_dump())
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("", response_model=list[ReportRead])
def list_reports(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(visible_reports(select(Report).order_by(Report.id), user)).all()


@router.get("/{report_id}", response_model=ReportRead)
def get_report(report_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_visible_report(db, user, report_id)
```

The new routes for managing user accounts (Admin only):

**`backend/app/routers/users.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import admin_only
from app.models import Technician, User
from app.models.enums import UserRole
from app.routers.utils import get_or_404
from app.schemas.auth import UserRead
from app.schemas.user import UserCreate, UserUpdate
from app.security import hash_password

# Every route here is for Operations Admins only
router = APIRouter(prefix="/users", tags=["users"])


def check_role_link(db: Session, role: UserRole, technician_id: int | None, user_id: int | None = None):
    """A Field Technician login must be linked to exactly one technician; other roles must not."""
    if role == UserRole.TECHNICIAN:
        if technician_id is None:
            raise HTTPException(
                status_code=422, detail="A Field Technician account must be linked to a technician"
            )
        get_or_404(db, Technician, technician_id, "Technician")
        already_linked = db.scalar(
            select(User).where(User.technician_id == technician_id, User.id != user_id)
        )
        if already_linked:
            raise HTTPException(status_code=409, detail="That technician already has a login")
    elif technician_id is not None:
        raise HTTPException(
            status_code=422, detail="Only Field Technician accounts can be linked to a technician"
        )


def hash_or_422(password: str) -> str:
    try:
        return hash_password(password)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error))


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreate, db: Session = Depends(get_db), _: User = Depends(admin_only)):
    email = data.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="A user with that email already exists")
    check_role_link(db, data.role, data.technician_id)
    user = User(
        email=email,
        full_name=data.full_name,
        hashed_password=hash_or_422(data.password),
        role=data.role,
        technician_id=data.technician_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("", response_model=list[UserRead], dependencies=[Depends(admin_only)])
def list_users(db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.id)).all()


@router.get("/{user_id}", response_model=UserRead, dependencies=[Depends(admin_only)])
def get_user(user_id: int, db: Session = Depends(get_db)):
    return get_or_404(db, User, user_id, "User")


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    user = get_or_404(db, User, user_id, "User")
    # Only fields the client sent. technician_id may be null (unlink); the rest may not.
    changes = {
        field: value
        for field, value in data.model_dump(exclude_unset=True).items()
        if value is not None or field == "technician_id"
    }

    new_role = changes.get("role", user.role)
    if "technician_id" in changes:
        new_technician_id = changes["technician_id"]
    elif new_role == UserRole.TECHNICIAN:
        new_technician_id = user.technician_id
    else:
        new_technician_id = None  # moving away from Field Technician unlinks the technician

    if new_role != user.role and user.id == current_user.id:
        raise HTTPException(status_code=409, detail="You cannot change your own role")
    check_role_link(db, new_role, new_technician_id, user_id=user.id)

    user.role = new_role
    user.technician_id = new_technician_id
    if "full_name" in changes:
        user.full_name = changes["full_name"]
    if "password" in changes:
        user.hashed_password = hash_or_422(changes["password"])
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int, db: Session = Depends(get_db), current_user: User = Depends(admin_only)
):
    user = get_or_404(db, User, user_id, "User")
    if user.id == current_user.id:
        raise HTTPException(status_code=409, detail="You cannot delete your own account")
    db.delete(user)
    db.commit()
```

The metrics router becomes Admin/Auditor only: add `from app.dependencies import read_all` to its imports and change its first lines to:

```python
router = APIRouter(prefix="/metrics", tags=["metrics"], dependencies=[Depends(read_all)])
```

**20g. Wire it together.**

**`backend/app/main.py`**

```python
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.dependencies import get_current_user
from app.routers import atms, auth, branches, metrics, reports, service_calls, technicians, users

app = FastAPI(title="CashCow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public: login
app.include_router(auth.router)

# Everything else requires a login. Each route then adds its own role rules
# (see require_roles in dependencies.py), so this is the safety net underneath them.
protected = [Depends(get_current_user)]
app.include_router(branches.router, dependencies=protected)
app.include_router(technicians.router, dependencies=protected)
app.include_router(atms.router, dependencies=protected)
app.include_router(service_calls.router, dependencies=protected)
app.include_router(reports.router, dependencies=protected)
app.include_router(metrics.router, dependencies=protected)
app.include_router(users.router, dependencies=protected)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
```

**20h. The `create_user` script now needs a role.** It replaces the version from Step 12:

**`backend/app/create_user.py`**

```python
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
```

Examples (the technician login is linked to technician 3, who has an active call in the sample data):

```bash
python -m app.create_user auditor@cashcow.com "Test Auditor" --role auditor
python -m app.create_user tech@cashcow.com "Marcus Lee" --role technician --technician-id 3
```

**20i. The seed script keeps Admin and Auditor logins.** In `seed.py`, import `delete` from `sqlalchemy` and `User` from the models, and replace the old `TRUNCATE ... CASCADE` statement at the top of `seed()`:

```python
    # Field Technician logins point at technician rows that are about to be replaced, so they
    # are removed too. Admin and Auditor accounts are left alone.
    db.execute(delete(User).where(User.technician_id.is_not(None)))
    # Delete children before parents, then restart the id counters so ids begin at 1 again.
    # (TRUNCATE ... CASCADE would also wipe the users table, which references technicians.)
    for model in (Report, ServiceCall, ATM, Technician, Branch):
        db.execute(delete(model))
    for table in ("reports", "service_calls", "atms", "technicians", "branches"):
        db.execute(text(f"ALTER SEQUENCE {table}_id_seq RESTART WITH 1"))
```

Re-seeding removes Field Technician logins (their technician rows are replaced); recreate them with `create_user`.

**20j. Verify.** Restart the backend, reload the sample data, and sign in at `/docs` as each role (Authorize with each token):

| As | Request | Expected |
|---|---|---|
| Auditor | `GET /metrics/dashboard`, `GET /atms` | `200` |
| Auditor | `PATCH /atms/1`, `POST /branches`, `GET /users` | `403` |
| Technician | `GET /atms` | one ATM only |
| Technician | `GET /service-calls` | only their calls |
| Technician | `GET /metrics/dashboard`, `GET /branches` | `403` |
| Technician | `GET /atms/1` (not theirs) | `404` |
| Technician | `PATCH /service-calls/1/status` `{"status":"Completed"}` | `200` |
| Technician | same call, `{"status":"Pending"}` | `409` (can't move backward) |
| Technician | `POST /reports` on their call | `201`; on someone else's call `404` |
| Admin | `DELETE /branches/1` | `409` (still has ATMs) |
| Admin | `DELETE /users/<your own id>` | `409` |
| Admin | `GET /auth/me` | includes `"role": "Operations Admin"` |

> **Automated tests (optional, not built here).** This project did not add an automated test suite for these rules. The permission matrix above is exactly what such a suite would encode: one test per (endpoint, role) pair, each expecting `200`, `403`, `404` or `409`, run against a separate test database. If you build one, use `pytest` with FastAPI's `TestClient`, point it at a database whose name ends in `test` so it can never touch real data, and check that the suite *fails* if you deliberately weaken a rule (for example by letting Technicians read branches).

---

### Step 21 ✅ — Role-aware frontend

**Why:** The API now enforces roles (Step 20), so the frontend should stop showing people things they can't use. A Field Technician gets their own work screens; an Auditor sees everything read-only. (The Admin's create/edit/delete screens come in Step 22.)

**Concepts:**

- **Hiding is not security.** Everything here only controls what is *shown*. A technician who typed `/branches` into the API directly would still get `403`, because Step 20 enforces the rules on the server. The frontend just avoids showing buttons that can't work.
- **`RequireRole`** is a route guard like `ProtectedRoute`, but for roles: `<Route element={<RequireRole roles={[...]} />}>`. A role that isn't listed is sent to its own home page.
- **One place for role knowledge** (`roles.js`): the role names, each role's home page and each role's navigation links. Pages ask it instead of repeating `if (role === ...)` everywhere.
- **Reused pages.** Technicians use the same ATMs and Service Calls pages. The API already returns only their data, so the pages change titles and add an Actions column. There is no second copy of the code.
- **MUI `Dialog` and `Snackbar`.** A Dialog is a pop-up window over the page. A Snackbar is a brief notice at the bottom of the screen ("Report attached").
- **Mirrored rules.** The Start / Complete / Fail buttons follow the same step rules as the backend. If they ever disagree, the server wins and the page shows its `409` message.

**21a. Roles in one place.** Create `frontend/src/roles.js`:

```js
// The three roles, spelled exactly as the API sends them
export const ROLES = {
  ADMIN: 'Operations Admin',
  TECHNICIAN: 'Field Technician',
  AUDITOR: 'Auditor',
}

// Where each role lands after logging in
export function homePathFor(role) {
  return role === ROLES.TECHNICIAN ? '/service-calls' : '/'
}

// The navigation links each role sees. This only controls what is SHOWN: the API enforces
// the real rules, so hiding a link here never replaces a check on the server.
export function navItemsFor(role) {
  if (role === ROLES.TECHNICIAN) {
    return [
      { label: 'My service calls', to: '/service-calls' },
      { label: 'My ATMs', to: '/atms' },
    ]
  }
  return [
    { label: 'Dashboard', to: '/' },
    { label: 'ATMs', to: '/atms' },
    { label: 'Service Calls', to: '/service-calls' },
  ]
}
```

**21b. The route guard** `frontend/src/RequireRole.jsx`:

**`frontend/src/RequireRole.jsx`**

```jsx
import { Navigate, Outlet } from 'react-router'

import { useAuth } from './AuthContext.jsx'
import { homePathFor } from './roles.js'

// Place inside ProtectedRoute. Lets only the listed roles see the nested pages;
// everyone else is sent to their own home page.
export default function RequireRole({ roles }) {
  const { user } = useAuth()
  if (!roles.includes(user.role)) {
    return <Navigate to={homePathFor(user.role)} replace />
  }
  return <Outlet />
}
```

**21c. Technician actions.** The buttons offered on a service call depend on its status:

**`frontend/src/components/ServiceCallActions.jsx`**

```jsx
import { Box, Button } from '@mui/material'

// The next steps a Field Technician may take. The API enforces this too (409 otherwise).
const NEXT_STEPS = {
  Pending: [{ label: 'Start', status: 'In-Progress' }],
  'In-Progress': [
    { label: 'Complete', status: 'Completed' },
    { label: 'Fail', status: 'Failed', color: 'error' },
  ],
}

export default function ServiceCallActions({ call, onChangeStatus, onOpenReports }) {
  const steps = NEXT_STEPS[call.status] ?? []

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
      {steps.map((step) => (
        <Button
          key={step.status}
          size="small"
          variant="contained"
          color={step.color ?? 'primary'}
          onClick={() => onChangeStatus(call, step.status)}
        >
          {step.label}
        </Button>
      ))}
      <Button size="small" variant="outlined" onClick={() => onOpenReports(call)}>
        Reports
      </Button>
    </Box>
  )
}
```

**21d. Reports dialog.** A report stores a **link** to the diagnostic file (we have no file upload). The `type="url"` input makes the browser check the format before submitting:

**`frontend/src/components/ReportDialog.jsx`**

```jsx
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Link,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'

import { apiFetch } from '../api.js'
import { useApi } from '../hooks/useApi.js'

// Lists the reports attached to one service call and lets a technician attach another.
// A report stores a link to the diagnostic file (we don't upload files).
export default function ReportDialog({ serviceCall, onClose, onNotice }) {
  const { data, loading, error, reload } = useApi('/reports')
  const [fileUrl, setFileUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // The API already limits this list to the technician's own reports; keep this call's
  const reports = (data ?? []).filter((report) => report.service_call_id === serviceCall.id)

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    setSubmitting(true)
    try {
      await apiFetch('/reports', {
        method: 'POST',
        body: JSON.stringify({
          file_url: fileUrl,
          notes: notes.trim() || null,
          service_call_id: serviceCall.id,
        }),
      })
      setFileUrl('')
      setNotes('')
      reload()
      onNotice({ severity: 'success', message: 'Report attached' })
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Reports: {serviceCall.title}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error">{error}</Alert>}
        {loading && !data && <CircularProgress size={24} />}
        {data && reports.length === 0 && (
          <Typography color="text.secondary">No reports attached yet.</Typography>
        )}
        <List dense>
          {reports.map((report) => (
            <ListItem key={report.id} disableGutters>
              <ListItemText
                primary={
                  <Link href={report.file_url} target="_blank" rel="noopener noreferrer">
                    {report.file_url}
                  </Link>
                }
                secondary={`${new Date(report.timestamp).toLocaleString()}${report.notes ? ` · ${report.notes}` : ''}`}
              />
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" gutterBottom>
          Attach a report
        </Typography>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField
            label="Link to diagnostic file"
            type="url"
            value={fileUrl}
            onChange={(event) => setFileUrl(event.target.value)}
            placeholder="https://..."
            required
            size="small"
          />
          <TextField
            label="Notes (optional)"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            multiline
            minRows={2}
            size="small"
          />
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Attaching...' : 'Attach report'}
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
```

**21e. Layout and routes.** The top bar shows the links for the user's role and a badge with the role name. The dashboard is the only page behind `RequireRole`; ATMs and Service Calls are open to every role because the API already limits what each one gets back.

**`frontend/src/components/Layout.jsx`**

```jsx
import { AppBar, Box, Button, Chip, Container, Toolbar, Typography } from '@mui/material'
import { NavLink, Outlet } from 'react-router'

import { useAuth } from '../AuthContext.jsx'
import { navItemsFor } from '../roles.js'

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ mr: 4 }}>
            CashCow
          </Typography>
          <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
            {navItemsFor(user.role).map((item) => (
              <Button
                key={item.to}
                color="inherit"
                component={NavLink}
                to={item.to}
                end
                sx={{ '&.active': { bgcolor: 'rgba(255, 255, 255, 0.18)' } }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
          <Chip
            label={user.role}
            size="small"
            variant="outlined"
            sx={{ mr: 2, color: 'inherit', borderColor: 'rgba(255, 255, 255, 0.6)' }}
          />
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user.full_name}
          </Typography>
          <Button color="inherit" onClick={logout}>
            Log out
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Outlet />
      </Container>
    </Box>
  )
}
```

```jsx
// frontend/src/App.jsx (as of this step; Step 22 extends it)
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AuthProvider } from './AuthContext.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import RequireRole from './RequireRole.jsx'
import Layout from './components/Layout.jsx'
import AtmsPage from './pages/AtmsPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ServiceCallsPage from './pages/ServiceCallsPage.jsx'
import { ROLES } from './roles.js'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route element={<RequireRole roles={[ROLES.ADMIN, ROLES.AUDITOR]} />}>
                <Route path="/" element={<DashboardPage />} />
              </Route>
              <Route path="/atms" element={<AtmsPage />} />
              <Route path="/service-calls" element={<ServiceCallsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

**21f. Titles and technician actions on the two pages.** In `AtmsPage.jsx`, the heading and search label depend on the role (`isTechnician ? 'My ATMs' : 'ATMs'`). In `ServiceCallsPage.jsx`, a Field Technician gets an extra **Actions** column (Start, Complete, Fail, Reports) and a notice (Snackbar) after each action, while the Technician column is dropped because every row would repeat their own name. In Step 22 these two pages are rewritten, so the final versions are shown there.

**21g. Try it.** Create one login per role (Step 20h), re-seed if needed, and sign in as each:

1. **Technician:** you land on **My service calls** with only your own calls. Click **Reports**, paste any link such as `https://example.com/diag.pdf`, and attach it. Click **Complete** on an In-Progress call: a notice confirms it and the Complete/Fail buttons disappear. **My ATMs** is then empty if you have no active calls left (by design, a technician sees only ATMs with an *active* call).
2. **Auditor:** Dashboard, ATMs and Service Calls, with no Actions column and no buttons.
3. Typing `/` as a technician sends you back to your own page.

---

### Step 22 ✅ — Admin management screens (create, edit, delete)

**Why:** The Admin needs to manage branches, technicians, ATMs, service calls and user accounts from the UI, not only through `/docs`. The Auditor gets read-only Branches and Technicians pages.

**Design: one reusable page, many entities.** Writing five separate pages with their own grids, forms and delete confirmations would repeat almost everything. Instead:

- **`CrudPage`** is a complete "list of records" page: a searchable grid and, for Admins, Add / Edit / Delete with a form and a confirmation, plus notices. Each entity just *describes itself*: its columns, its form fields, and how to turn form values into the JSON the API wants.
- **Props as configuration.** A component receives settings as props (`columns`, `getFields`, `toPayload`, `canManage`, ...) instead of hardcoding one entity. Adding another entity later is ~40 lines.
- **`FormDialog`** builds a form from a list of field descriptions (`{ name, label, type, required, options, visible, ... }`). `visible(values)` is how a field can appear only when another field has a certain value (the Technician dropdown on the Users form appears only for the Field Technician role).
- **Two layers of validation.** The form checks the easy things (required, the 5-digit pattern, number ranges) for instant feedback. The API checks again and is the real authority; its error messages (such as "Branch still has ATMs") appear inside the dialog.
- **`canManage` only hides buttons.** The API decides what is allowed, so even forced buttons would get `403`.
- **Dropdowns load only when needed.** `useApi` gained a `{ skip: true }` option so only Admins (who have forms) fetch the branch, ATM and technician lists.
- **Stable identities.** `columns` and `describeRow` passed to `CrudPage` are defined at module level or in `useMemo`, so the grid doesn't rebuild its columns on every keystroke.

No backend changes and no new packages are needed in this step.

**22a. Constants and two small fixes.** `frontend/src/constants.js`:

**`frontend/src/constants.js`**

```js
// The allowed values for fields with a fixed set of choices (the same ones the API accepts)
export const ATM_STATUSES = ['Operational', 'In-Transport', 'Maintenance', 'Offline']
export const PRIORITIES = ['Low', 'Medium', 'Critical']
export const SERVICE_STATUSES = ['Pending', 'In-Progress', 'Completed', 'Failed']

// Turn a list of plain values into the { value, label } options a form dropdown needs
export const toOptions = (values) => values.map((value) => ({ value, label: value }))
```

In `frontend/src/api.js`, a successful delete answers `204` with no body, which `response.json()` cannot parse. Change the last line of `apiFetch`:

```js
  // A successful DELETE answers 204 with no body
  if (response.status === 204) return null
  return response.json()}
```

`useApi` gains the `skip` option:

**`frontend/src/hooks/useApi.js`**

```js
import { useCallback, useEffect, useState } from 'react'

import { apiFetch } from '../api.js'

// Loads data from the API when the component first appears, and offers reload().
// Pass { skip: true } to not load anything (for data this user has no use for).
export function useApi(path, { skip = false } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(!skip)
  const [error, setError] = useState('')
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    if (skip) return undefined
    // If the component goes away (or a newer request starts), ignore this request's result
    let ignore = false
    apiFetch(path)
      .then((result) => {
        if (ignore) return
        setData(result)
        setError('')
      })
      .catch((err) => {
        if (!ignore) setError(err.message)
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [path, reloadCount, skip])

  const reload = useCallback(() => {
    setLoading(true)
    setReloadCount((count) => count + 1)
  }, [])

  return { data, loading, error, reload }
}
```

`roles.js` now offers more navigation links: the Auditor and Admin also see Branches and Technicians, and the Admin sees Users:

**`frontend/src/roles.js`**

```js
// The three roles, spelled exactly as the API sends them
export const ROLES = {
  ADMIN: 'Operations Admin',
  TECHNICIAN: 'Field Technician',
  AUDITOR: 'Auditor',
}

// Where each role lands after logging in
export function homePathFor(role) {
  return role === ROLES.TECHNICIAN ? '/service-calls' : '/'
}

// The navigation links each role sees. This only controls what is SHOWN: the API enforces
// the real rules, so hiding a link here never replaces a check on the server.
export function navItemsFor(role) {
  if (role === ROLES.TECHNICIAN) {
    return [
      { label: 'My service calls', to: '/service-calls' },
      { label: 'My ATMs', to: '/atms' },
    ]
  }
  const items = [
    { label: 'Dashboard', to: '/' },
    { label: 'ATMs', to: '/atms' },
    { label: 'Service Calls', to: '/service-calls' },
    { label: 'Branches', to: '/branches' },
    { label: 'Technicians', to: '/technicians' },
  ]
  if (role === ROLES.ADMIN) items.push({ label: 'Users', to: '/users' })
  return items
}
```

**22b. The shared building blocks.**

**`frontend/src/components/FormDialog.jsx`**

```jsx
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material'
import { useState } from 'react'

// A dropdown that has an "Unassigned"-style option whose value is '' must still show that
// option's text, instead of looking empty
const hasEmptyOption = (field) =>
  field.type === 'select' && field.options.some((option) => option.value === '')

function FormField({ field, value, onChange }) {
  const showsEmptyOption = hasEmptyOption(field)
  return (
    <TextField
      label={field.label}
      value={value}
      onChange={(event) => onChange(field.name, event.target.value)}
      select={field.type === 'select'}
      type={field.type === 'select' ? undefined : (field.type ?? 'text')}
      required={field.required}
      disabled={field.disabled}
      helperText={field.helperText}
      size="small"
      fullWidth
      slotProps={{
        htmlInput: { min: field.min, max: field.max, step: field.step, pattern: field.pattern },
        select: { displayEmpty: showsEmptyOption },
        inputLabel: { shrink: showsEmptyOption || undefined },
      }}
    >
      {field.type === 'select' &&
        field.options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
    </TextField>
  )
}

// A pop-up form built from a list of field descriptions. Each field looks like:
//   { name, label, type, required, disabled, helperText, options, visible, defaultValue,
//     min, max, step, pattern }
// type is 'text' (default), 'number', 'email', 'password' or 'select' (give it options).
// visible(values) can hide a field depending on what is typed in the others.
// onSubmit(values) should throw an Error if the save fails; its message is shown in the form.
export default function FormDialog({ title, fields, initialValues, submitLabel = 'Save', onSubmit, onClose }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      fields.map((field) => [field.name, initialValues[field.name] ?? field.defaultValue ?? '']),
    ),
  )
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const setValue = (name, value) => setValues((current) => ({ ...current, [name]: value }))

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await onSubmit(values) // on success the page closes this dialog
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { component: 'form', onSubmit: handleSubmit } }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        {fields
          .filter((field) => !field.visible || field.visible(values))
          .map((field) => (
            <FormField key={field.name} field={field} value={values[field.name]} onChange={setValue} />
          ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
```

**`frontend/src/components/ConfirmDialog.jsx`**

```jsx
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'
import { useState } from 'react'

// "Are you sure?" pop-up. onConfirm() may throw an Error; its message is shown here
// (for example "Branch still has ATMs"). On success the page closes this dialog.
export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onClose }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    setError('')
    setBusy(true)
    try {
      await onConfirm()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} color="error" variant="contained" disabled={busy}>
          {busy ? 'Working...' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
```

**`frontend/src/components/CrudPage.jsx`**

```jsx
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Alert, Box, Button, IconButton, Snackbar, Tooltip, Typography } from '@mui/material'
import { useMemo, useState } from 'react'

import { apiFetch } from '../api.js'
import { useApi } from '../hooks/useApi.js'
import ConfirmDialog from './ConfirmDialog.jsx'
import DataTable from './DataTable.jsx'
import FormDialog from './FormDialog.jsx'

// A complete "list of records" page: a searchable grid and, when canManage is true,
// Add / Edit / Delete with a form and a confirmation. The API enforces who may really
// change things; canManage only decides whether the buttons are shown.
//
//   title, singular   "Branches", "branch"
//   path              the API address, e.g. '/branches'
//   columns           the grid columns (an Actions column is added when canManage)
//   getFields(row)    the form fields; row is the record being edited, or null when adding
//   toFormValues(row) turn a record into starting form values (default: use the record as is)
//   toPayload(values, row) turn the form values into the JSON the API expects;
//                     row is the record being edited, or null when adding
//   describeRow(row)  a short name for a record, used in messages
//   ready             set false while data the form needs (dropdown options) is still loading
export default function CrudPage({
  title,
  singular,
  path,
  columns,
  getFields,
  toFormValues = (row) => row,
  toPayload,
  describeRow,
  canManage,
  ready = true,
  searchLabel,
  pageSize,
}) {
  const { data, loading, error, reload } = useApi(path)
  const [dialog, setDialog] = useState(null) // { mode: 'create' | 'edit' | 'delete', row }
  const [notice, setNotice] = useState(null)

  const allColumns = useMemo(() => {
    if (!canManage) return columns
    return [
      ...columns,
      {
        field: 'actions',
        headerName: '',
        width: 110,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Tooltip title="Edit">
              <IconButton
                size="small"
                aria-label={`Edit ${describeRow(params.row)}`}
                onClick={() => setDialog({ mode: 'edit', row: params.row })}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                color="error"
                aria-label={`Delete ${describeRow(params.row)}`}
                onClick={() => setDialog({ mode: 'delete', row: params.row })}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ]
  }, [canManage, columns, describeRow])

  async function save(values) {
    const body = JSON.stringify(toPayload(values, dialog.mode === 'edit' ? dialog.row : null))
    if (dialog.mode === 'create') {
      await apiFetch(path, { method: 'POST', body })
      setNotice({ severity: 'success', message: `Added ${singular}` })
    } else {
      await apiFetch(`${path}/${dialog.row.id}`, { method: 'PATCH', body })
      setNotice({ severity: 'success', message: `Saved ${describeRow(dialog.row)}` })
    }
    setDialog(null)
    reload()
  }

  async function remove() {
    await apiFetch(`${path}/${dialog.row.id}`, { method: 'DELETE' })
    setNotice({ severity: 'success', message: `Deleted ${describeRow(dialog.row)}` })
    setDialog(null)
    reload()
  }

  const editing = dialog?.mode === 'edit' ? dialog.row : null

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">{title}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {canManage && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              disabled={!ready}
              onClick={() => setDialog({ mode: 'create', row: null })}
            >
              Add {singular}
            </Button>
          )}
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={reload} disabled={loading}>
            Refresh
          </Button>
        </Box>
      </Box>

      <DataTable
        rows={data ?? []}
        columns={allColumns}
        loading={loading}
        error={error}
        searchLabel={searchLabel}
        pageSize={pageSize}
      />

      {(dialog?.mode === 'create' || dialog?.mode === 'edit') && (
        <FormDialog
          title={dialog.mode === 'create' ? `Add ${singular}` : `Edit ${describeRow(dialog.row)}`}
          fields={getFields(editing)}
          initialValues={editing ? toFormValues(editing) : {}}
          onSubmit={save}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.mode === 'delete' && (
        <ConfirmDialog
          title={`Delete ${singular}?`}
          message={`This permanently deletes ${describeRow(dialog.row)}.`}
          onConfirm={remove}
          onClose={() => setDialog(null)}
        />
      )}
      <Snackbar
        open={notice !== null}
        autoHideDuration={4000}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {notice ? (
          <Alert severity={notice.severity} onClose={() => setNotice(null)} variant="filled">
            {notice.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  )
}
```

**22c. The entity pages.** Each one only describes its data.

**`frontend/src/pages/BranchesPage.jsx`**

```jsx
import CrudPage from '../components/CrudPage.jsx'
import { useAuth } from '../AuthContext.jsx'
import { ROLES } from '../roles.js'

const COLUMNS = [
  { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
  { field: 'region', headerName: 'Region', flex: 1, minWidth: 140 },
  { field: 'capacity', headerName: 'Capacity', type: 'number', width: 110 },
  { field: 'supervisor_id', headerName: 'Supervisor ID', type: 'number', width: 140 },
]

const getFields = () => [
  { name: 'name', label: 'Name', required: true },
  { name: 'region', label: 'Region', required: true },
  { name: 'capacity', label: 'Capacity', type: 'number', required: true, min: 1 },
  { name: 'supervisor_id', label: 'Supervisor ID', type: 'number', required: true },
]

const toPayload = (values) => ({
  name: values.name,
  region: values.region,
  capacity: Number(values.capacity),
  supervisor_id: Number(values.supervisor_id),
})

const describeRow = (row) => `branch ${row.name}`

export default function BranchesPage() {
  const { user } = useAuth()
  return (
    <CrudPage
      title="Branches"
      singular="branch"
      path="/branches"
      columns={COLUMNS}
      getFields={getFields}
      toPayload={toPayload}
      describeRow={describeRow}
      canManage={user.role === ROLES.ADMIN}
      searchLabel="Search branches"
    />
  )
}
```

The API returns only a `branch_id` for technicians, so the grid looks the branch name up in the branches list that the form dropdown needs anyway:

**`frontend/src/pages/TechniciansPage.jsx`**

```jsx
import { useMemo } from 'react'

import { useAuth } from '../AuthContext.jsx'
import CrudPage from '../components/CrudPage.jsx'
import { useApi } from '../hooks/useApi.js'
import { ROLES } from '../roles.js'

const toPayload = (values) => ({ name: values.name, branch_id: Number(values.branch_id) })
const describeRow = (row) => `technician ${row.name}`

export default function TechniciansPage() {
  const { user } = useAuth()
  const { data: branches, loading: branchesLoading } = useApi('/branches')

  // The API returns branch_id only, so look the branch name up in the branches list
  const columns = useMemo(() => {
    const branchNames = Object.fromEntries((branches ?? []).map((branch) => [branch.id, branch.name]))
    return [
      { field: 'name', headerName: 'Name', flex: 1, minWidth: 180 },
      {
        field: 'branch_id',
        headerName: 'Branch',
        flex: 1,
        minWidth: 160,
        valueGetter: (value) => branchNames[value] ?? '',
      },
    ]
  }, [branches])

  const getFields = () => [
    { name: 'name', label: 'Name', required: true },
    {
      name: 'branch_id',
      label: 'Branch',
      type: 'select',
      required: true,
      options: (branches ?? []).map((branch) => ({ value: branch.id, label: branch.name })),
    },
  ]

  return (
    <CrudPage
      title="Technicians"
      singular="technician"
      path="/technicians"
      columns={columns}
      getFields={getFields}
      toPayload={toPayload}
      describeRow={describeRow}
      canManage={user.role === ROLES.ADMIN}
      ready={!branchesLoading}
      searchLabel="Search technicians"
    />
  )
}
```

On the Users form the role decides whether the technician link applies, and the password is optional when editing:

**`frontend/src/pages/UsersPage.jsx`**

```jsx
import { useMemo } from 'react'

import { useAuth } from '../AuthContext.jsx'
import CrudPage from '../components/CrudPage.jsx'
import { useApi } from '../hooks/useApi.js'
import { ROLES } from '../roles.js'

const ROLE_OPTIONS = Object.values(ROLES).map((role) => ({ value: role, label: role }))
const describeRow = (row) => `user ${row.email}`

// Only a Field Technician login is linked to a technician; other roles are not
const technicianIdFor = (values) =>
  values.role === ROLES.TECHNICIAN ? Number(values.technician_id) : null

// row is the user being edited, or null when adding one
function toPayload(values, row) {
  if (row === null) {
    return {
      email: values.email,
      full_name: values.full_name,
      password: values.password,
      role: values.role,
      technician_id: technicianIdFor(values),
    }
  }
  return {
    full_name: values.full_name,
    role: values.role,
    technician_id: technicianIdFor(values),
    // Leave the password out entirely unless a new one was typed
    ...(values.password ? { password: values.password } : {}),
  }
}

export default function UsersPage() {
  const { user } = useAuth()
  const { data: technicians, loading: techniciansLoading } = useApi('/technicians')

  const columns = useMemo(() => {
    const technicianNames = Object.fromEntries((technicians ?? []).map((t) => [t.id, t.name]))
    return [
      { field: 'email', headerName: 'Email', flex: 1.2, minWidth: 220 },
      { field: 'full_name', headerName: 'Name', flex: 1, minWidth: 160 },
      { field: 'role', headerName: 'Role', width: 170 },
      {
        field: 'technician_id',
        headerName: 'Linked technician',
        flex: 1,
        minWidth: 160,
        valueGetter: (value) => (value === null ? '' : (technicianNames[value] ?? '')),
      },
    ]
  }, [technicians])

  const getFields = (row) => [
    { name: 'email', label: 'Email', type: 'email', required: true, disabled: row !== null },
    { name: 'full_name', label: 'Full name', required: true },
    { name: 'role', label: 'Role', type: 'select', required: true, options: ROLE_OPTIONS },
    {
      name: 'technician_id',
      label: 'Technician this login belongs to',
      type: 'select',
      required: true,
      options: (technicians ?? []).map((t) => ({ value: t.id, label: t.name })),
      visible: (values) => values.role === ROLES.TECHNICIAN,
    },
    {
      name: 'password',
      label: row === null ? 'Password' : 'New password',
      type: 'password',
      required: row === null,
      helperText: row === null ? 'At least 8 characters' : 'Leave blank to keep the current password',
    },
  ]

  return (
    <CrudPage
      title="Users"
      singular="user"
      path="/users"
      columns={columns}
      getFields={getFields}
      toPayload={toPayload}
      describeRow={describeRow}
      canManage={user.role === ROLES.ADMIN}
      ready={!techniciansLoading}
      searchLabel="Search users"
    />
  )
}
```

The ATMs page now uses `CrudPage` for every role. Admins get the forms; Auditors and Technicians get the same read-only grid. A serial number is chosen once and never changes, and the cash field enforces the $0 to $10,000 range:

**`frontend/src/pages/AtmsPage.jsx`**

```jsx
import { useAuth } from '../AuthContext.jsx'
import CrudPage from '../components/CrudPage.jsx'
import StatusChip from '../components/StatusChip.jsx'
import { ATM_STATUSES, toOptions } from '../constants.js'
import { formatCurrency } from '../format.js'
import { useApi } from '../hooks/useApi.js'
import { ROLES } from '../roles.js'

const COLUMNS = [
  { field: 'serial_number', headerName: 'Serial', width: 110 },
  { field: 'model', headerName: 'Model', flex: 1, minWidth: 180 },
  { field: 'branch_name', headerName: 'Branch', flex: 1, minWidth: 130 },
  {
    field: 'status',
    headerName: 'Status',
    width: 150,
    renderCell: (params) => <StatusChip status={params.value} />,
  },
  {
    field: 'cash_level',
    headerName: 'Cash level',
    type: 'number',
    width: 130,
    // The API sends money as text, so convert to a number to sort numerically
    valueGetter: (value) => Number(value),
    valueFormatter: (value) => formatCurrency(value),
  },
]

const describeRow = (row) => `ATM ${row.serial_number}`

// row is the ATM being edited, or null when adding one
function toPayload(values, row) {
  const changeable = {
    model: values.model,
    status: values.status,
    cash_level: values.cash_level,
    branch_id: Number(values.branch_id),
  }
  // A serial number is chosen when the ATM is created and never changes
  return row === null ? { serial_number: values.serial_number, ...changeable } : changeable
}

export default function AtmsPage() {
  const { user } = useAuth()
  const isTechnician = user.role === ROLES.TECHNICIAN
  // Only the Admin's Add/Edit form needs the list of branches
  const { data: branches, loading: branchesLoading } = useApi('/branches', {
    skip: user.role !== ROLES.ADMIN,
  })

  const getFields = (row) => [
    {
      name: 'serial_number',
      label: 'Serial number',
      required: true,
      disabled: row !== null,
      pattern: '[0-9]{5}',
      helperText: 'Exactly 5 digits',
    },
    { name: 'model', label: 'Model', required: true },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'Operational',
      options: toOptions(ATM_STATUSES),
    },
    {
      name: 'cash_level',
      label: 'Cash level ($)',
      type: 'number',
      required: true,
      defaultValue: '0',
      min: 0,
      max: 10000,
      step: 0.01,
      helperText: 'Between $0 and $10,000 (a full reserve)',
    },
    {
      name: 'branch_id',
      label: 'Branch',
      type: 'select',
      required: true,
      options: (branches ?? []).map((branch) => ({ value: branch.id, label: branch.name })),
    },
  ]

  return (
    <CrudPage
      title={isTechnician ? 'My ATMs' : 'ATMs'}
      singular="ATM"
      path="/atms"
      columns={COLUMNS}
      getFields={getFields}
      toPayload={toPayload}
      describeRow={describeRow}
      canManage={user.role === ROLES.ADMIN}
      ready={!branchesLoading}
      searchLabel={isTechnician ? 'Search my ATMs' : 'Search ATMs'}
    />
  )
}
```

The technician's service calls page from Step 21 moves to its own file (it is only used by technicians now):

**`frontend/src/pages/TechnicianServiceCallsPage.jsx`**

```jsx
import RefreshIcon from '@mui/icons-material/Refresh'
import { Alert, Box, Button, Snackbar, Typography } from '@mui/material'
import { useCallback, useMemo, useState } from 'react'

import { apiFetch } from '../api.js'
import DataTable from '../components/DataTable.jsx'
import ReportDialog from '../components/ReportDialog.jsx'
import ServiceCallActions from '../components/ServiceCallActions.jsx'
import StatusChip from '../components/StatusChip.jsx'
import { useApi } from '../hooks/useApi.js'

const COLUMNS = [
  { field: 'title', headerName: 'Title', flex: 1.5, minWidth: 220 },
  {
    field: 'priority',
    headerName: 'Priority',
    width: 120,
    renderCell: (params) => <StatusChip status={params.value} />,
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 140,
    renderCell: (params) => <StatusChip status={params.value} />,
  },
  { field: 'atm_serial_number', headerName: 'ATM', width: 100 },
  { field: 'atm_model', headerName: 'ATM model', flex: 1, minWidth: 170 },
  { field: 'branch_name', headerName: 'Branch', flex: 1, minWidth: 120 },
]

export default function TechnicianServiceCallsPage() {
  const { data, loading, error, reload } = useApi('/service-calls')
  const [notice, setNotice] = useState(null)
  const [reportCall, setReportCall] = useState(null)

  const changeStatus = useCallback(
    async (call, status) => {
      try {
        await apiFetch(`/service-calls/${call.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        })
        setNotice({ severity: 'success', message: `"${call.title}" is now ${status}` })
        reload()
      } catch (err) {
        setNotice({ severity: 'error', message: err.message })
      }
    },
    [reload],
  )

  const columns = useMemo(
    () => [
      ...COLUMNS,
      {
        field: 'actions',
        headerName: 'Actions',
        width: 280,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => (
          <ServiceCallActions
            call={params.row}
            onChangeStatus={changeStatus}
            onOpenReports={setReportCall}
          />
        ),
      },
    ],
    [changeStatus],
  )

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">My service calls</Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={reload} disabled={loading}>
          Refresh
        </Button>
      </Box>
      <DataTable
        rows={data ?? []}
        columns={columns}
        loading={loading}
        error={error}
        searchLabel="Search my service calls"
        pageSize={5}
      />

      {reportCall && (
        <ReportDialog
          serviceCall={reportCall}
          onClose={() => setReportCall(null)}
          onNotice={setNotice}
        />
      )}
      <Snackbar
        open={notice !== null}
        autoHideDuration={4000}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {notice ? (
          <Alert severity={notice.severity} onClose={() => setNotice(null)} variant="filled">
            {notice.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  )
}
```

`ServiceCallsPage` picks the right experience for the role. For Admins and Auditors it is a `CrudPage`. A new call always starts as Pending, so Status is only editable later; the ATM is chosen at creation and then locked; "Unassigned" is sent to the API as `null`:

**`frontend/src/pages/ServiceCallsPage.jsx`**

```jsx
import { useAuth } from '../AuthContext.jsx'
import CrudPage from '../components/CrudPage.jsx'
import StatusChip from '../components/StatusChip.jsx'
import { PRIORITIES, SERVICE_STATUSES, toOptions } from '../constants.js'
import { useApi } from '../hooks/useApi.js'
import { ROLES } from '../roles.js'
import TechnicianServiceCallsPage from './TechnicianServiceCallsPage.jsx'

const COLUMNS = [
  { field: 'title', headerName: 'Title', flex: 1.5, minWidth: 220 },
  {
    field: 'priority',
    headerName: 'Priority',
    width: 120,
    renderCell: (params) => <StatusChip status={params.value} />,
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 140,
    renderCell: (params) => <StatusChip status={params.value} />,
  },
  { field: 'atm_serial_number', headerName: 'ATM', width: 100 },
  { field: 'atm_model', headerName: 'ATM model', flex: 1, minWidth: 170 },
  { field: 'branch_name', headerName: 'Branch', flex: 1, minWidth: 120 },
  {
    field: 'technician_name',
    headerName: 'Technician',
    flex: 1,
    minWidth: 140,
    valueGetter: (value) => value ?? 'Unassigned',
  },
]

const describeRow = (row) => `service call "${row.title}"`

// '' means "no technician" in the form; the API wants null for that
const technicianIdFor = (values) => (values.technician_id === '' ? null : Number(values.technician_id))

// row is the call being edited, or null when adding one
function toPayload(values, row) {
  const shared = {
    title: values.title,
    priority: values.priority,
    technician_id: technicianIdFor(values),
  }
  if (row === null) return { ...shared, atm_id: Number(values.atm_id) }
  return { ...shared, status: values.status }
}

export default function ServiceCallsPage() {
  const { user } = useAuth()
  // A Field Technician gets their own page, with status buttons and reports
  if (user.role === ROLES.TECHNICIAN) return <TechnicianServiceCallsPage />
  return <ServiceCallsManager canManage={user.role === ROLES.ADMIN} />
}

function ServiceCallsManager({ canManage }) {
  // Only the Admin's Add/Edit form needs these dropdown lists
  const { data: atms, loading: atmsLoading } = useApi('/atms', { skip: !canManage })
  const { data: technicians, loading: techniciansLoading } = useApi('/technicians', {
    skip: !canManage,
  })

  const getFields = (row) => [
    { name: 'title', label: 'Title', required: true },
    {
      name: 'priority',
      label: 'Priority',
      type: 'select',
      required: true,
      defaultValue: 'Medium',
      options: toOptions(PRIORITIES),
    },
    // The ATM is chosen when a call is created; it cannot be changed afterwards
    {
      name: 'atm_id',
      label: 'ATM',
      type: 'select',
      required: true,
      disabled: row !== null,
      options: (atms ?? []).map((atm) => ({
        value: atm.id,
        label: `${atm.serial_number} · ${atm.branch_name}`,
      })),
    },
    // A new call always starts as Pending, so status is only editable later
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: toOptions(SERVICE_STATUSES),
      visible: () => row !== null,
    },
    {
      name: 'technician_id',
      label: 'Technician',
      type: 'select',
      options: [
        { value: '', label: 'Unassigned' },
        ...(technicians ?? []).map((t) => ({ value: t.id, label: t.name })),
      ],
    },
  ]

  return (
    <CrudPage
      title="Service calls"
      singular="service call"
      path="/service-calls"
      columns={COLUMNS}
      getFields={getFields}
      toFormValues={(row) => ({ ...row, technician_id: row.technician_id ?? '' })}
      toPayload={toPayload}
      describeRow={describeRow}
      canManage={canManage}
      ready={!atmsLoading && !techniciansLoading}
      searchLabel="Search service calls"
      pageSize={5}
    />
  )
}
```

**22d. Routes.** Branches and Technicians for Admin and Auditor, Users for Admin only:

**`frontend/src/App.jsx`**

```jsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AuthProvider } from './AuthContext.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import RequireRole from './RequireRole.jsx'
import Layout from './components/Layout.jsx'
import AtmsPage from './pages/AtmsPage.jsx'
import BranchesPage from './pages/BranchesPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ServiceCallsPage from './pages/ServiceCallsPage.jsx'
import TechniciansPage from './pages/TechniciansPage.jsx'
import UsersPage from './pages/UsersPage.jsx'
import { ROLES } from './roles.js'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              {/* Every role */}
              <Route path="/atms" element={<AtmsPage />} />
              <Route path="/service-calls" element={<ServiceCallsPage />} />

              {/* Admin and Auditor (the Auditor sees these read-only) */}
              <Route element={<RequireRole roles={[ROLES.ADMIN, ROLES.AUDITOR]} />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/branches" element={<BranchesPage />} />
                <Route path="/technicians" element={<TechniciansPage />} />
              </Route>

              {/* Admin only */}
              <Route element={<RequireRole roles={[ROLES.ADMIN]} />}>
                <Route path="/users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

**22e. Try it.** Signed in as the Admin:

1. **Branches:** **Add branch**, fill in the four fields and save. Try deleting a branch that has ATMs and read the refusal message inside the dialog. Delete the branch you just added; that works.
2. **ATMs:** click the pencil on an ATM. The serial number is locked. The cash field refuses anything above 10,000.
3. **Service calls:** **Add service call** with an ATM and a technician. Edit it, set the status to In-Progress and choose Unassigned.
4. **Technicians:** add one, then edit it and move it to another branch.
5. **Users:** **Add user**, pick **Field Technician** and notice the Technician dropdown appears; pick **Auditor** and it disappears. Try deleting your own account (refused).
6. Sign in as the **Auditor**: every page is read-only (no Add button, no Edit/Delete buttons), and typing `/users` sends you away.

> **Troubleshooting a blank page.** A blank browser page almost always means a compile or import error. Run `npm run build` in `frontend/`: it prints a clear message such as `"default" is not exported by "src/components/FormDialog.jsx"` and fails (a successful run ends with `built in ...`). The usual cause is a file that was pasted but not **saved**, leaving it empty on disk. The browser's developer console (`Cmd+Option+J` in Chrome) shows the same error in red.

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
- [x] Backend metrics endpoints (low cash, technician mismatches, completion ratio by model, maintenance alerts, technicians per supervisor)
- [x] Frontend: app layout (top bar, navigation) and dashboard with metric cards, alerts and status badges
- [x] Frontend: DataGrid pages for ATMs and service calls (sorting, search, pagination)
- [x] Role-based access control, backend (Operations Admin, Field Technician, Auditor)
- [x] Role-aware frontend (per-role navigation, technician work screens, read-only Auditor)
- [x] Admin management screens (create, edit, delete)
- [ ] Simulation logic (ATM cash levels, service dispatch) *(optional)*
- [x] Frontend: React + Material UI project setup
- [x] Connect frontend to backend (API calls, CORS) — API helper and login done
- [ ] Automated tests *(optional; see the note at the end of Step 20)*
- [ ] Deployment notes

---

## 7. Glossary

- **API** – A set of URLs a program can call to get or change data.
- **CORS** – A browser security rule that blocks a frontend on one address from calling a backend on another unless the backend allows it.
- **Bearer token** – A token sent in the `Authorization: Bearer <token>` header to prove who you are.
- **Aggregation** – Combining many rows into a summary value, such as a count or percentage, usually with `GROUP BY`.
- **DataGrid** – A Material UI table component with built-in sorting, filtering and pagination.
- **Dependency** – A library your project relies on.
- **Foreign key** – A column holding the `id` of a row in another table, linking the two.
- **Enum** – A type limited to a fixed list of named values.
- **Salt** – Random data mixed into a password before hashing so identical passwords produce different hashes.
- **localStorage** – A small key-value store in the browser that survives page reloads; we keep the login token there.
- **N+1 query problem** – Running one query for a list plus one more per row to load related data; fixed by loading the related rows in the same query (`joinedload`).
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
