"""
M11 — Historical Loader
Backfills 1m candles for all active pairs. Chunked, checkpointed, idempotent.
"""

from __future__ import annotations

import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import psycopg2

SDK_PATH = Path(__file__).resolve().parents[3] / "packages" / "exchange-sdk"
sys.path.insert(0, str(SDK_PATH))

from exchange_sdk.binance import BinanceConnector  # noqa: E402
from exchange_sdk.types import Timeframe  # noqa: E402

from config import Config  # noqa: E402
from db import (  # noqa: E402
    complete_checkpoint,
    get_active_pairs,
    get_candle_count,
    get_checkpoint,
    get_connection,
    get_earliest_candle_time,
    get_exchange_id,
    get_latest_candle_time,
    insert_candles,
    log_sync,
    update_sync_state,
    upsert_checkpoint,
)

TIMEFRAME = Timeframe.M1
CHUNK_SIZE = 1000
REQUEST_DELAY_SEC = 0.08
MAX_DEADLOCK_RETRIES = 5
FRESHNESS = timedelta(hours=3)


def _commit(conn) -> None:
    conn.commit()


def _rollback(conn) -> None:
    conn.rollback()


def pair_needs_backfill(
    conn, pair_id, days: int, now: datetime
) -> tuple[bool, str]:
    """True if pair still needs API fetch. Second value: skip reason or 'needs_data'."""
    target_start = now - timedelta(days=days)
    earliest = get_earliest_candle_time(conn, pair_id, TIMEFRAME.value)
    latest = get_latest_candle_time(conn, pair_id, TIMEFRAME.value)

    if latest is None:
        return True, "needs_data"
    if latest.tzinfo is None:
        latest = latest.replace(tzinfo=timezone.utc)
    if latest < now - FRESHNESS:
        return True, "needs_data"

    if earliest is None:
        return True, "needs_data"
    if earliest.tzinfo is None:
        earliest = earliest.replace(tzinfo=timezone.utc)

    # Дырка в начале окна (старше листинга — нормально)
    if earliest > target_start + timedelta(days=2):
        return True, "needs_data"

    count = get_candle_count(conn, pair_id, TIMEFRAME.value)
    span_minutes = int((latest - earliest).total_seconds() // 60) + 1
    if span_minutes > 0 and count >= int(span_minutes * 0.97):
        return False, "complete"

    if earliest <= target_start + timedelta(days=1):
        window_minutes = int((latest - max(earliest, target_start)).total_seconds() // 60) + 1
        if window_minutes > 0 and count >= int(window_minutes * 0.97):
            return False, "complete"

    return True, "needs_data"


def _fetch_range(
    connector: BinanceConnector,
    conn,
    pair_id,
    symbol: str,
    start: datetime,
    end: datetime,
) -> int:
    total_inserted = 0
    cursor = start

    while cursor < end:
        candles = connector.get_klines(
            symbol,
            TIMEFRAME,
            start_time=cursor,
            limit=CHUNK_SIZE,
        )

        if not candles:
            break

        for attempt in range(MAX_DEADLOCK_RETRIES):
            try:
                inserted = insert_candles(conn, pair_id, TIMEFRAME.value, candles)
                last_time = candles[-1].open_time
                upsert_checkpoint(conn, pair_id, TIMEFRAME.value, last_time)
                update_sync_state(conn, pair_id, TIMEFRAME.value, last_time)
                _commit(conn)
                total_inserted += inserted
                break
            except psycopg2.errors.DeadlockDetected:
                _rollback(conn)
                if attempt + 1 >= MAX_DEADLOCK_RETRIES:
                    raise
                time.sleep(0.5 * (attempt + 1))
            except Exception:
                _rollback(conn)
                raise

        last_time = candles[-1].open_time
        cursor = last_time + timedelta(minutes=1)
        time.sleep(REQUEST_DELAY_SEC)

        if len(candles) < CHUNK_SIZE:
            break

    return total_inserted


def backfill_pair(
    connector: BinanceConnector,
    conn,
    exchange_id,
    pair_id,
    symbol: str,
    days: int = 365,
) -> int:
    now = datetime.now(timezone.utc)
    target_start = now - timedelta(days=days)
    total_inserted = 0

    earliest = get_earliest_candle_time(conn, pair_id, TIMEFRAME.value)
    if earliest is None or earliest > target_start:
        backward_end = (
            earliest - timedelta(minutes=1) if earliest is not None else now
        )
        if backward_end >= target_start:
            total_inserted += _fetch_range(
                connector,
                conn,
                pair_id,
                symbol,
                target_start,
                backward_end,
            )

    checkpoint = get_checkpoint(conn, pair_id, TIMEFRAME.value)
    latest = get_latest_candle_time(conn, pair_id, TIMEFRAME.value)
    forward_start = target_start
    if latest is not None:
        if latest.tzinfo is None:
            latest = latest.replace(tzinfo=timezone.utc)
        forward_start = latest + timedelta(minutes=1)
    if checkpoint is not None:
        if checkpoint.tzinfo is None:
            checkpoint = checkpoint.replace(tzinfo=timezone.utc)
        cp_next = checkpoint + timedelta(minutes=1)
        if cp_next > forward_start:
            forward_start = cp_next
    if forward_start < now:
        total_inserted += _fetch_range(
            connector,
            conn,
            pair_id,
            symbol,
            forward_start,
            now,
        )

    complete_checkpoint(conn, pair_id, TIMEFRAME.value)
    _commit(conn)
    return total_inserted


def backfill_all(
    config: Config | None = None,
    days: int = 365,
    limit_pairs: int | None = None,
) -> dict:
    config = config or Config.from_env()
    connector = BinanceConnector(base_url=config.binance_api_url)

    stats = {"pairs": 0, "candles": 0, "errors": 0, "skipped": 0}

    try:
        with get_connection(config.database_url) as conn:
            exchange_id = get_exchange_id(conn, "binance")
            pairs = get_active_pairs(conn, "binance")

            if limit_pairs:
                pairs = pairs[:limit_pairs]

            total_pairs = len(pairs)
            skipped = 0
            for pair_id, symbol in pairs:
                try:
                    needs, reason = pair_needs_backfill(conn, pair_id, days, datetime.now(timezone.utc))
                    if not needs:
                        skipped += 1
                        stats["skipped"] += 1
                        stats["pairs"] += 1
                        print(
                            f"[{stats['pairs']}/{total_pairs}] {symbol}: skip ({reason})",
                            flush=True,
                        )
                        continue

                    inserted = backfill_pair(
                        connector, conn, exchange_id, pair_id, symbol, days
                    )
                    stats["pairs"] += 1
                    stats["candles"] += inserted
                    print(
                        f"[{stats['pairs']}/{total_pairs}] {symbol}: +{inserted} candles",
                        flush=True,
                    )
                    log_sync(
                        conn,
                        exchange_id,
                        pair_id,
                        "INFO",
                        f"Backfill {symbol}: {inserted} candles",
                    )
                    _commit(conn)
                except Exception as exc:
                    stats["errors"] += 1
                    _rollback(conn)
                    print(
                        f"[ERROR] {symbol}: {exc}",
                        flush=True,
                    )
                    log_sync(
                        conn,
                        exchange_id,
                        pair_id,
                        "ERROR",
                        f"Backfill {symbol} failed: {exc}",
                    )
                    _commit(conn)
    finally:
        connector.close()

    return stats


if __name__ == "__main__":
    limit = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1] else None
    days = int(sys.argv[2]) if len(sys.argv) > 2 else 7
    result = backfill_all(limit_pairs=limit, days=days)
    print(f"Backfill complete: {result}")
