"""Load historical funding rates from DB or Binance API."""
from __future__ import annotations

import os
from datetime import date, datetime, time, timezone
from decimal import Decimal


def _parse_date(value: str | None, default: date) -> date:
    if not value:
        return default
    return date.fromisoformat(value[:10])


def _fetch_binance_funding(
    symbol: str, start_dt: datetime, end_dt: datetime
) -> list[tuple[datetime, Decimal]]:
    from exchange_sdk.binance import BinanceConnector

    conn = BinanceConnector()
    try:
        return conn.get_funding_rates(symbol, start_dt, end_dt)
    finally:
        conn.close()


def _upsert_funding_rates(
    symbol: str, events: list[tuple[datetime, Decimal]]
) -> None:
    if not events:
        return
    import psycopg2

    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql://reboundlab:reboundlab@localhost:5432/reboundlab",
    )
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute(
        """
        SELECT tp.id FROM market.trading_pairs tp
        JOIN market.exchanges e ON e.id = tp.exchange_id
        WHERE e.code = 'binance' AND tp.symbol = %s
        """,
        (symbol,),
    )
    row = cur.fetchone()
    if not row:
        conn.close()
        return
    pair_id = row[0]
    for ft, rate in events:
        cur.execute(
            """
            INSERT INTO market.funding_rates (pair_id, funding_time, rate)
            VALUES (%s, %s, %s)
            ON CONFLICT (pair_id, funding_time) DO NOTHING
            """,
            (pair_id, ft, str(rate)),
        )
    conn.commit()
    conn.close()


def load_funding_from_db(
    symbol: str,
    start_date: str | None = None,
    end_date: str | None = None,
) -> list[tuple[datetime, Decimal]]:
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
    try:
        cur.execute(
            """
            SELECT fr.funding_time, fr.rate
            FROM market.funding_rates fr
            JOIN market.trading_pairs tp ON tp.id = fr.pair_id
            JOIN market.exchanges e ON e.id = tp.exchange_id
            WHERE e.code = 'binance' AND tp.symbol = %s
              AND fr.funding_time >= %s AND fr.funding_time <= %s
            ORDER BY fr.funding_time ASC
            """,
            (symbol, start_dt, end_dt),
        )
        rows = cur.fetchall()
    except Exception:
        rows = []
    conn.close()
    return [(row[0], Decimal(str(row[1]))) for row in rows]


def load_funding_map(
    symbols: list[str],
    start_date: str | None = None,
    end_date: str | None = None,
    *,
    use_real: bool = True,
) -> dict[str, list[tuple[datetime, Decimal]]]:
    """Load funding schedules; fetch from Binance and cache if missing in DB."""
    if not use_real:
        return {}

    today = datetime.now(timezone.utc).date()
    start = _parse_date(start_date, today.replace(day=1))
    end = _parse_date(end_date, today)
    start_dt = datetime.combine(start, time.min, tzinfo=timezone.utc)
    end_dt = datetime.combine(end, time.max.replace(microsecond=0), tzinfo=timezone.utc)

    result: dict[str, list[tuple[datetime, Decimal]]] = {}
    for symbol in symbols:
        events = load_funding_from_db(symbol, start_date, end_date)
        if not events:
            try:
                events = _fetch_binance_funding(symbol, start_dt, end_dt)
                _upsert_funding_rates(symbol, events)
            except Exception:
                events = []
        result[symbol] = events
    return result
