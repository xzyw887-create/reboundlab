"""
Backfill 1m candles for a explicit symbol list (and extend history backward).
Usage: python3 sync/backfill_symbols.py BTCUSDT,ETHUSDT 30
"""

from __future__ import annotations

import sys
from pathlib import Path

SDK_PATH = Path(__file__).resolve().parents[3] / "packages" / "exchange-sdk"
sys.path.insert(0, str(SDK_PATH))

from historical import backfill_pair  # noqa: E402
from config import Config  # noqa: E402
from db import (  # noqa: E402
    days_between,
    get_connection,
    get_exchange_id,
    get_pair_id_by_symbol,
    log_sync,
    upsert_trading_pair,
)
from exchange_sdk.binance import BinanceConnector  # noqa: E402
from exchange_sdk.types import Timeframe  # noqa: E402


DEFAULT_SYMBOLS = [
    "BTCUSDT",
    "ETHUSDT",
    "SOLUSDT",
    "BNBUSDT",
    "XRPUSDT",
    "DOGEUSDT",
    "ADAUSDT",
    "AVAXUSDT",
    "LINKUSDT",
    "DOTUSDT",
    "LTCUSDT",
    "UNIUSDT",
    "ATOMUSDT",
    "NEARUSDT",
    "APTUSDT",
    "ARBUSDT",
    "OPUSDT",
    "SUIUSDT",
    "WIFUSDT",
    "1000PEPEUSDT",
]


def ensure_pairs_in_catalog(
    conn,
    exchange_id,
    connector: BinanceConnector,
    symbols: list[str],
) -> int:
    """Register requested symbols without full catalog sync (one exchangeInfo call)."""
    from datetime import datetime, timezone

    catalog = {p.symbol: p for p in connector.get_usdt_pairs()}
    now = datetime.now(timezone.utc)
    added = 0

    for symbol in symbols:
        if get_pair_id_by_symbol(conn, "binance", symbol):
            continue
        pair = catalog.get(symbol)
        if pair is None:
            log_sync(
                conn,
                exchange_id,
                None,
                "WARN",
                f"Unknown symbol on Binance Futures: {symbol}",
            )
            continue
        earliest = connector.get_earliest_kline_time(symbol, Timeframe.M1)
        history_days = days_between(earliest, now) if earliest else 0
        upsert_trading_pair(
            conn,
            exchange_id,
            pair.symbol,
            pair.base_asset,
            pair.quote_asset,
            earliest.date() if earliest else None,
            history_days,
        )
        added += 1

    return added


def backfill_symbols(
    symbols: list[str],
    days: int = 30,
    config: Config | None = None,
) -> dict:
    config = config or Config.from_env()
    connector = BinanceConnector(base_url=config.binance_api_url)
    stats = {"pairs": 0, "candles": 0, "errors": 0, "skipped": 0}

    try:
        with get_connection(config.database_url) as conn:
            exchange_id = get_exchange_id(conn, "binance")
            ensure_pairs_in_catalog(conn, exchange_id, connector, symbols)
            for symbol in symbols:
                pair_id = get_pair_id_by_symbol(conn, "binance", symbol)
                if pair_id is None:
                    stats["skipped"] += 1
                    log_sync(
                        conn,
                        exchange_id,
                        None,
                        "WARN",
                        f"Skip {symbol}: not in catalog — run catalog sync first",
                    )
                    continue
                try:
                    inserted = backfill_pair(
                        connector,
                        conn,
                        exchange_id,
                        pair_id,
                        symbol,
                        days,
                    )
                    stats["pairs"] += 1
                    stats["candles"] += inserted
                    log_sync(
                        conn,
                        exchange_id,
                        pair_id,
                        "INFO",
                        f"Backfill {symbol} ({days}d): {inserted} candles",
                    )
                except Exception as exc:
                    stats["errors"] += 1
                    log_sync(
                        conn,
                        exchange_id,
                        pair_id,
                        "ERROR",
                        f"Backfill {symbol} failed: {exc}",
                    )
    finally:
        connector.close()

    return stats


if __name__ == "__main__":
    raw_symbols = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] else ""
    days = int(sys.argv[2]) if len(sys.argv) > 2 else 30
    symbols = (
        [s.strip().upper() for s in raw_symbols.split(",") if s.strip()]
        if raw_symbols
        else DEFAULT_SYMBOLS
    )
    result = backfill_symbols(symbols, days)
    print(f"Backfill symbols complete: {result}")
