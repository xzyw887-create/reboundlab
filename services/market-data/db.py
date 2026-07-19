from __future__ import annotations

import uuid
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone

import psycopg2
import psycopg2.extras

from config import Config


@contextmanager
def get_connection(database_url: str):
    conn = psycopg2.connect(database_url)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def get_exchange_id(conn, code: str) -> uuid.UUID:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM market.exchanges WHERE code = %s",
            (code,),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError(f"Exchange not found: {code}")
        return row[0]


def upsert_trading_pair(
    conn,
    exchange_id: uuid.UUID,
    symbol: str,
    base_asset: str,
    quote_asset: str,
    history_from: date | None,
    min_history_days: int,
) -> uuid.UUID:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO market.trading_pairs
                (exchange_id, symbol, base_asset, quote_asset, is_active,
                 history_from, min_history_days)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (exchange_id, symbol) DO UPDATE SET
                base_asset = EXCLUDED.base_asset,
                quote_asset = EXCLUDED.quote_asset,
                is_active = EXCLUDED.is_active,
                history_from = EXCLUDED.history_from,
                min_history_days = EXCLUDED.min_history_days
            RETURNING id
            """,
            (
                exchange_id,
                symbol,
                base_asset,
                quote_asset,
                True,
                history_from,
                min_history_days,
            ),
        )
        return cur.fetchone()[0]


def deactivate_missing_pairs(
    conn, exchange_id: uuid.UUID, active_symbols: set[str]
) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE market.trading_pairs
            SET is_active = FALSE
            WHERE exchange_id = %s
              AND is_active = TRUE
              AND NOT (symbol = ANY(%s))
            """,
            (exchange_id, list(active_symbols)),
        )
        return cur.rowcount


def insert_candles(
    conn, pair_id: uuid.UUID, timeframe: str, candles: list
) -> int:
    if not candles:
        return 0

    rows = [
        (
            pair_id,
            timeframe,
            c.open_time,
            c.open,
            c.high,
            c.low,
            c.close,
            c.volume,
        )
        for c in candles
    ]

    with conn.cursor() as cur:
        psycopg2.extras.execute_values(
            cur,
            """
            INSERT INTO market.candles
                (pair_id, timeframe, open_time, open, high, low, close, volume)
            VALUES %s
            ON CONFLICT (pair_id, timeframe, open_time) DO NOTHING
            """,
            rows,
            template="(%s, %s, %s, %s, %s, %s, %s, %s)",
        )
        return cur.rowcount


def get_sync_state(conn, pair_id: uuid.UUID, timeframe: str) -> datetime | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT last_candle_time FROM market.sync_state
            WHERE pair_id = %s AND timeframe = %s
            """,
            (pair_id, timeframe),
        )
        row = cur.fetchone()
        return row[0] if row else None


def update_sync_state(
    conn, pair_id: uuid.UUID, timeframe: str, last_candle_time: datetime
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO market.sync_state
                (pair_id, timeframe, last_candle_time, last_sync_at, status)
            VALUES (%s, %s, %s, NOW(), 'completed')
            ON CONFLICT (pair_id, timeframe) DO UPDATE SET
                last_candle_time = EXCLUDED.last_candle_time,
                last_sync_at = NOW(),
                status = 'completed'
            """,
            (pair_id, timeframe, last_candle_time),
        )


def get_checkpoint(
    conn, pair_id: uuid.UUID, timeframe: str
) -> datetime | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT last_loaded_time FROM market.load_checkpoints
            WHERE pair_id = %s AND timeframe = %s
            """,
            (pair_id, timeframe),
        )
        row = cur.fetchone()
        return row[0] if row else None


def upsert_checkpoint(
    conn, pair_id: uuid.UUID, timeframe: str, last_loaded_time: datetime
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO market.load_checkpoints
                (pair_id, timeframe, last_loaded_time, status, updated_at)
            VALUES (%s, %s, %s, 'running', NOW())
            ON CONFLICT (pair_id, timeframe) DO UPDATE SET
                last_loaded_time = EXCLUDED.last_loaded_time,
                status = 'running',
                updated_at = NOW()
            """,
            (pair_id, timeframe, last_loaded_time),
        )


def complete_checkpoint(conn, pair_id: uuid.UUID, timeframe: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE market.load_checkpoints
            SET status = 'completed', updated_at = NOW()
            WHERE pair_id = %s AND timeframe = %s
            """,
            (pair_id, timeframe),
        )


def get_pair_id_by_symbol(conn, exchange_code: str, symbol: str) -> uuid.UUID | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT tp.id
            FROM market.trading_pairs tp
            JOIN market.exchanges e ON e.id = tp.exchange_id
            WHERE e.code = %s AND tp.symbol = %s AND tp.is_active = TRUE
            """,
            (exchange_code, symbol),
        )
        row = cur.fetchone()
        return row[0] if row else None


def get_earliest_candle_time(
    conn, pair_id: uuid.UUID, timeframe: str
) -> datetime | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT MIN(open_time) FROM market.candles
            WHERE pair_id = %s AND timeframe = %s
            """,
            (pair_id, timeframe),
        )
        row = cur.fetchone()
        return row[0] if row and row[0] else None


def get_latest_candle_time(
    conn, pair_id: uuid.UUID, timeframe: str
) -> datetime | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT MAX(open_time) FROM market.candles
            WHERE pair_id = %s AND timeframe = %s
            """,
            (pair_id, timeframe),
        )
        row = cur.fetchone()
        return row[0] if row and row[0] else None


def get_candle_count(
    conn, pair_id: uuid.UUID, timeframe: str
) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*) FROM market.candles
            WHERE pair_id = %s AND timeframe = %s
            """,
            (pair_id, timeframe),
        )
        row = cur.fetchone()
        return int(row[0] or 0) if row else 0


def get_active_pairs(conn, exchange_code: str) -> list[tuple[uuid.UUID, str]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT tp.id, tp.symbol
            FROM market.trading_pairs tp
            JOIN market.exchanges e ON e.id = tp.exchange_id
            WHERE e.code = %s AND tp.is_active = TRUE
            ORDER BY tp.symbol
            """,
            (exchange_code,),
        )
        return cur.fetchall()


def log_sync(
    conn,
    exchange_id: uuid.UUID,
    pair_id: uuid.UUID | None,
    level: str,
    message: str,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO market.sync_logs (exchange_id, pair_id, level, message)
            VALUES (%s, %s, %s, %s)
            """,
            (exchange_id, pair_id, level, message),
        )


def days_between(start: datetime, end: datetime) -> int:
    return (end.date() - start.date()).days
