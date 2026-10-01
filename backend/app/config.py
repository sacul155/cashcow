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