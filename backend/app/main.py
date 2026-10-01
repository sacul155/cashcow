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