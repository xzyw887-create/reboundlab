from __future__ import annotations

import time
from datetime import datetime, timezone
from decimal import Decimal

import httpx

from exchange_sdk.errors import ExchangeAPIError, ExchangeRateLimitError
from exchange_sdk.interfaces import ExchangeConnector
from exchange_sdk.types import Candle, Timeframe, TradingPair


class BinanceConnector(ExchangeConnector):
    """Binance USDT-M Futures connector (official API)."""

    def __init__(
        self,
        base_url: str = "https://fapi.binance.com",
        client: httpx.Client | None = None,
        max_retries: int = 3,
    ):
        self._base_url = base_url.rstrip("/")
        self._client = client or httpx.Client(timeout=30.0)
        self._max_retries = max_retries

    @property
    def code(self) -> str:
        return "binance"

    def get_usdt_pairs(self) -> list[TradingPair]:
        data = self._request("GET", "/fapi/v1/exchangeInfo")
        pairs: list[TradingPair] = []

        for item in data.get("symbols", []):
            if item.get("quoteAsset") != "USDT":
                continue
            if item.get("status") != "TRADING":
                continue
            if item.get("contractType") != "PERPETUAL":
                continue

            pairs.append(
                TradingPair(
                    symbol=item["symbol"],
                    base_asset=item["baseAsset"],
                    quote_asset=item["quoteAsset"],
                    is_active=True,
                )
            )

        return sorted(pairs, key=lambda p: p.symbol)

    def get_klines(
        self,
        symbol: str,
        timeframe: Timeframe,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        limit: int = 1000,
    ) -> list[Candle]:
        params: dict[str, str | int] = {
            "symbol": symbol,
            "interval": timeframe.binance_interval,
            "limit": min(limit, 1500),
        }
        if start_time:
            params["startTime"] = int(start_time.timestamp() * 1000)
        if end_time:
            params["endTime"] = int(end_time.timestamp() * 1000)

        raw = self._request("GET", "/fapi/v1/klines", params=params)
        return [self._parse_kline(row) for row in raw]

    def get_earliest_kline_time(
        self, symbol: str, timeframe: Timeframe
    ) -> datetime | None:
        raw = self._request(
            "GET",
            "/fapi/v1/klines",
            params={
                "symbol": symbol,
                "interval": timeframe.binance_interval,
                "limit": 1,
                "startTime": 0,
            },
        )
        if not raw:
            return None
        return self._parse_kline(raw[0]).open_time

    def get_funding_rates(
        self,
        symbol: str,
        start_time: datetime,
        end_time: datetime,
        limit: int = 1000,
    ) -> list[tuple[datetime, Decimal]]:
        """Historical funding rates from Binance USDT-M Futures."""
        events: list[tuple[datetime, Decimal]] = []
        cursor_ms = int(start_time.timestamp() * 1000)
        end_ms = int(end_time.timestamp() * 1000)

        while cursor_ms < end_ms:
            raw = self._request(
                "GET",
                "/fapi/v1/fundingRate",
                params={
                    "symbol": symbol,
                    "startTime": cursor_ms,
                    "endTime": end_ms,
                    "limit": min(limit, 1000),
                },
            )
            if not raw:
                break
            for row in raw:
                ft = datetime.fromtimestamp(row["fundingTime"] / 1000, tz=timezone.utc)
                events.append((ft, Decimal(str(row["fundingRate"]))))
            last_ms = raw[-1]["fundingTime"]
            if last_ms <= cursor_ms:
                break
            cursor_ms = last_ms + 1

        return events

    def _request(
        self, method: str, path: str, params: dict | None = None
    ) -> list | dict:
        url = f"{self._base_url}{path}"
        last_error: Exception | None = None

        for attempt in range(self._max_retries):
            try:
                response = self._client.request(method, url, params=params)

                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", 2**attempt))
                    time.sleep(retry_after)
                    raise ExchangeRateLimitError(
                        "Binance rate limit", status_code=429
                    )

                if response.status_code >= 400:
                    raise ExchangeAPIError(
                        f"Binance API error: {response.text}",
                        status_code=response.status_code,
                    )

                return response.json()

            except (httpx.TimeoutException, httpx.NetworkError, ExchangeRateLimitError) as exc:
                last_error = exc
                time.sleep(2**attempt)

        raise ExchangeAPIError(f"Request failed after retries: {last_error}")

    @staticmethod
    def _parse_kline(row: list) -> Candle:
        return Candle(
            open_time=datetime.fromtimestamp(row[0] / 1000, tz=timezone.utc),
            open=Decimal(str(row[1])),
            high=Decimal(str(row[2])),
            low=Decimal(str(row[3])),
            close=Decimal(str(row[4])),
            volume=Decimal(str(row[5])),
        )

    def close(self) -> None:
        self._client.close()
