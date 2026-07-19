"""Load candles from PostgreSQL for backtests."""
from __future__ import annotations

import os
from datetime import date, datetime, time, timezone
from decimal import Decimal

from backtester.core.types import Candle


def _parse_date(value: str | None, default: date) -> date:
    if not value:
        return default
    return date.fromisoformat(value[:10])


def load_candles_from_db(
    symbol: str,
    start_date: str | None = None,
    end_date: str | None = None,
) -> list[Candle]:
    import psycopg2

    today = datetime.now(timezone.utc).date()
    start = _parse_date(start_date, today.replace(day=1))
    end = _parse_date(end_date, today)

    start_dt = datetime.combine(start, time.min, tzinfo=timezone.utc)
    end_dt = datetime.combine(end, time.max.replace(microsecond=0), tzinfo=timezone.utc)

    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql://reboundlab:reboundlab@localhost:5432/reboundlab",
    )
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute(
        """
        SELECT c.open_time, c.open, c.high, c.low, c.close, c.volume
        FROM market.candles c
        JOIN market.trading_pairs tp ON tp.id = c.pair_id
        WHERE tp.symbol = %s
          AND c.timeframe = '1m'
          AND c.open_time >= %s
          AND c.open_time <= %s
        ORDER BY c.open_time ASC
        """,
        (symbol, start_dt, end_dt),
    )
    rows = cur.fetchall()
    conn.close()

    return [
        Candle(
            open_time=row[0],
            open=Decimal(str(row[1])),
            high=Decimal(str(row[2])),
            low=Decimal(str(row[3])),
            close=Decimal(str(row[4])),
            volume=Decimal(str(row[5])),
        )
        for row in rows
    ]


def load_candles_map_from_db(
    symbols: list[str],
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict[str, list[Candle]]:
    return {
        symbol: load_candles_from_db(symbol, start_date, end_date)
        for symbol in symbols
    }
