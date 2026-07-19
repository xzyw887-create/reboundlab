import json
from datetime import datetime, timezone
from decimal import Decimal

import pytest

from exchange_sdk.binance import BinanceConnector
from exchange_sdk.types import Timeframe


EXCHANGE_INFO_RESPONSE = {
    "symbols": [
        {
            "symbol": "BTCUSDT",
            "baseAsset": "BTC",
            "quoteAsset": "USDT",
            "status": "TRADING",
            "contractType": "PERPETUAL",
        },
        {
            "symbol": "ETHUSDT",
            "baseAsset": "ETH",
            "quoteAsset": "USDT",
            "status": "TRADING",
            "contractType": "PERPETUAL",
        },
        {
            "symbol": "ETHBTC",
            "baseAsset": "ETH",
            "quoteAsset": "BTC",
            "status": "TRADING",
            "contractType": "PERPETUAL",
        },
        {
            "symbol": "DOGEUSDT",
            "baseAsset": "DOGE",
            "quoteAsset": "USDT",
            "status": "BREAK",
            "contractType": "PERPETUAL",
        },
    ]
}

KLINES_RESPONSE = [
    [
        1_700_000_000_000,
        "42000.50",
        "42100.00",
        "41900.00",
        "42050.25",
        "123.456",
        1_700_000_059_999,
        "5180000.00",
        1000,
        "60.0",
        "2520000.00",
        "0",
    ]
]


class MockResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code
        self.headers = {}

    def json(self):
        return self._payload

    @property
    def text(self):
        return json.dumps(self._payload)


class MockClient:
    def __init__(self, routes: dict):
        self.routes = routes

    def request(self, method, url, params=None):
        if "exchangeInfo" in url:
            return MockResponse(self.routes["exchangeInfo"])
        if "klines" in url:
            return MockResponse(self.routes["klines"])
        return MockResponse({}, status_code=404)


def test_get_usdt_pairs_filters_correctly():
    connector = BinanceConnector(client=MockClient({"exchangeInfo": EXCHANGE_INFO_RESPONSE}))
    pairs = connector.get_usdt_pairs()

    assert len(pairs) == 2
    assert pairs[0].symbol == "BTCUSDT"
    assert pairs[1].symbol == "ETHUSDT"
    assert all(p.quote_asset == "USDT" for p in pairs)


def test_get_klines_parses_candle():
    connector = BinanceConnector(client=MockClient({"klines": KLINES_RESPONSE}))
    candles = connector.get_klines("BTCUSDT", Timeframe.M1)

    assert len(candles) == 1
    candle = candles[0]
    assert candle.open == Decimal("42000.50")
    assert candle.close == Decimal("42050.25")
    assert candle.open_time == datetime.fromtimestamp(1_700_000_000, tz=timezone.utc)


def test_get_earliest_kline_time():
    connector = BinanceConnector(client=MockClient({"klines": KLINES_RESPONSE}))
    earliest = connector.get_earliest_kline_time("BTCUSDT", Timeframe.M1)

    assert earliest == datetime.fromtimestamp(1_700_000_000, tz=timezone.utc)
