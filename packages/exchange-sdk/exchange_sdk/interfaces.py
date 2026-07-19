from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime

from exchange_sdk.types import Candle, Timeframe, TradingPair


class ExchangeConnector(ABC):
    """Abstract connector for official exchange APIs."""

    @property
    @abstractmethod
    def code(self) -> str:
        """Exchange code, e.g. 'binance'."""

    @abstractmethod
    def get_usdt_pairs(self) -> list[TradingPair]:
        """Return active USDT trading pairs."""

    @abstractmethod
    def get_klines(
        self,
        symbol: str,
        timeframe: Timeframe,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        limit: int = 1000,
    ) -> list[Candle]:
        """Fetch normalized OHLCV candles."""

    @abstractmethod
    def get_earliest_kline_time(
        self, symbol: str, timeframe: Timeframe
    ) -> datetime | None:
        """Return earliest available candle open time for a symbol."""
