import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    database_url: str
    min_history_days: int
    binance_api_url: str

    @classmethod
    def from_env(cls) -> "Config":
        return cls(
            database_url=os.environ.get(
                "DATABASE_URL",
                "postgresql://reboundlab:reboundlab@localhost:5432/reboundlab",
            ),
            min_history_days=int(os.environ.get("MARKET_DATA_MIN_HISTORY_DAYS", "365")),
            binance_api_url=os.environ.get(
                "BINANCE_API_URL", "https://fapi.binance.com"
            ),
        )
