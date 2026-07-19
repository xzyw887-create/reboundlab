"""
M10 — Symbol Catalog
Syncs all active Binance USDT perpetual pairs into market.trading_pairs.
Filters pairs with history >= min_history_days.
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

# Add exchange-sdk to path
SDK_PATH = Path(__file__).resolve().parents[3] / "packages" / "exchange-sdk"
sys.path.insert(0, str(SDK_PATH))

from exchange_sdk.binance import BinanceConnector  # noqa: E402
from exchange_sdk.types import Timeframe  # noqa: E402

from config import Config  # noqa: E402
from db import (  # noqa: E402
    deactivate_missing_pairs,
    days_between,
    get_connection,
    get_exchange_id,
    log_sync,
    upsert_trading_pair,
)


def sync_catalog(config: Config | None = None) -> dict:
    config = config or Config.from_env()
    connector = BinanceConnector(base_url=config.binance_api_url)

    stats = {"total": 0, "active": 0, "skipped": 0, "deactivated": 0}

    try:
        pairs = connector.get_usdt_pairs()
        stats["total"] = len(pairs)
        now = datetime.now(timezone.utc)
        active_symbols: set[str] = set()

        with get_connection(config.database_url) as conn:
            exchange_id = get_exchange_id(conn, "binance")

            for pair in pairs:
                earliest = connector.get_earliest_kline_time(
                    pair.symbol, Timeframe.M1
                )
                if earliest is None:
                    stats["skipped"] += 1
                    log_sync(
                        conn,
                        exchange_id,
                        None,
                        "WARN",
                        f"No history for {pair.symbol}",
                    )
                    continue

                history_days = days_between(earliest, now)
                if history_days < config.min_history_days:
                    stats["skipped"] += 1
                    log_sync(
                        conn,
                        exchange_id,
                        None,
                        "INFO",
                        f"Skipped {pair.symbol}: {history_days}d < {config.min_history_days}d",
                    )
                    continue

                upsert_trading_pair(
                    conn,
                    exchange_id,
                    pair.symbol,
                    pair.base_asset,
                    pair.quote_asset,
                    earliest.date(),
                    history_days,
                )
                active_symbols.add(pair.symbol)
                stats["active"] += 1

            stats["deactivated"] = deactivate_missing_pairs(
                conn, exchange_id, active_symbols
            )
            log_sync(
                conn,
                exchange_id,
                None,
                "INFO",
                f"Catalog sync: {stats['active']} active, "
                f"{stats['skipped']} skipped, "
                f"{stats['deactivated']} deactivated",
            )

    finally:
        connector.close()

    return stats


if __name__ == "__main__":
    result = sync_catalog()
    print(f"Catalog sync complete: {result}")
