from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from enum import Enum


class Timeframe(str, Enum):
    M1 = "1m"
    M5 = "5m"
    M15 = "15m"
    H1 = "1h"
    H4 = "4h"
    D1 = "1d"

    @property
    def binance_interval(self) -> str:
        return self.value

    @property
    def milliseconds(self) -> int:
        return {
            Timeframe.M1: 60_000,
            Timeframe.M5: 300_000,
            Timeframe.M15: 900_000,
            Timeframe.H1: 3_600_000,
            Timeframe.H4: 14_400_000,
            Timeframe.D1: 86_400_000,
        }[self]


@dataclass(frozen=True)
class TradingPair:
    symbol: str
    base_asset: str
    quote_asset: str
    is_active: bool = True


@dataclass(frozen=True)
class Candle:
    open_time: datetime
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal
