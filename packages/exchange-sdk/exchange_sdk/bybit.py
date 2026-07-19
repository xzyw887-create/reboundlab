"""Bybit connector — Phase 2 placeholder."""

from datetime import datetime

from exchange_sdk.interfaces import ExchangeConnector
from exchange_sdk.types import Candle, Timeframe, TradingPair


class BybitConnector(ExchangeConnector):
    @property
    def code(self) -> str:
        return "bybit"

    def get_usdt_pairs(self) -> list[TradingPair]:
        raise NotImplementedError("Bybit connector — Phase 2")

    def get_klines(
        self,
        symbol: str,
        timeframe: Timeframe,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        limit: int = 1000,
    ) -> list[Candle]:
        raise NotImplementedError("Bybit connector — Phase 2")

    def get_earliest_kline_time(
        self, symbol: str, timeframe: Timeframe
    ) -> datetime | None:
        raise NotImplementedError("Bybit connector — Phase 2")
