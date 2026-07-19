"""
M12 — Live Updater
Fetches only new 1m candles since last sync. Runs every 60 seconds.
"""

from __future__ import annotations

import sys
import time
from datetime import timedelta, timezone
from pathlib import Path

SDK_PATH = Path(__file__).resolve().parents[3] / "packages" / "exchange-sdk"
sys.path.insert(0, str(SDK_PATH))

from exchange_sdk.binance import BinanceConnector  # noqa: E402
from exchange_sdk.types import Timeframe  # noqa: E402

from config import Config  # noqa: E402
from db import (  # noqa: E402
    get_active_pairs,
    get_connection,
    get_exchange_id,
    get_sync_state,
    insert_candles,
    log_sync,
    update_sync_state,
)

TIMEFRAME = Timeframe.M1


def sync_new_candles(config: Config | None = None) -> dict:
    config = config or Config.from_env()
    connector = BinanceConnector(base_url=config.binance_api_url)

    stats = {"pairs": 0, "candles": 0, "errors": 0}

    try:
        with get_connection(config.database_url) as conn:
            exchange_id = get_exchange_id(conn, "binance")
            pairs = get_active_pairs(conn, "binance")

            for pair_id, symbol in pairs:
                try:
                    last_time = get_sync_state(conn, pair_id, TIMEFRAME.value)
                    start_time = (
                        last_time + timedelta(minutes=1) if last_time else None
                    )

                    candles = connector.get_klines(
                        symbol,
                        TIMEFRAME,
                        start_time=start_time,
                        limit=1000,
                    )

                    if not candles:
                        continue

                    inserted = insert_candles(
                        conn, pair_id, TIMEFRAME.value, candles
                    )
                    update_sync_state(
                        conn, pair_id, TIMEFRAME.value, candles[-1].open_time
                    )
                    stats["pairs"] += 1
                    stats["candles"] += inserted

                except Exception as exc:
                    stats["errors"] += 1
                    log_sync(
                        conn,
                        exchange_id,
                        pair_id,
                        "ERROR",
                        f"Live sync {symbol} failed: {exc}",
                    )
    finally:
        connector.close()

    return stats


def run_loop(config: Config | None = None, interval_sec: int = 60) -> None:
    config = config or Config.from_env()
    print(f"Live updater started (interval={interval_sec}s)")

    while True:
        result = sync_new_candles(config)
        print(f"Live sync: {result}")
        time.sleep(interval_sec)


if __name__ == "__main__":
    if "--once" in sys.argv:
        print(sync_new_candles())
    else:
        run_loop()
