"""List trading pairs and candle coverage from PostgreSQL (JSON stdout)."""
from __future__ import annotations

import json
import os
import sys


def list_symbols() -> dict:
    import psycopg2

    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql://reboundlab:reboundlab@localhost:5432/reboundlab",
    )
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
            tp.symbol,
            tp.base_asset,
            tp.is_active,
            tp.history_from,
            tp.min_history_days,
            MIN(c.open_time) AS data_from,
            MAX(c.open_time) AS data_to,
            COUNT(c.open_time) AS candle_count
        FROM market.trading_pairs tp
        JOIN market.exchanges e ON e.id = tp.exchange_id
        LEFT JOIN market.candles c
            ON c.pair_id = tp.id AND c.timeframe = '1m'
        WHERE e.code = 'binance' AND tp.is_active = TRUE
        GROUP BY tp.id, tp.symbol, tp.base_asset, tp.is_active, tp.history_from, tp.min_history_days
        ORDER BY candle_count DESC NULLS LAST, tp.symbol ASC
        """
    )
    rows = cur.fetchall()
    conn.close()

    symbols = []
    loaded = []
    for row in rows:
        symbol, base, active, history_from, min_history_days, data_from, data_to, count = row
        item = {
            "symbol": symbol,
            "base": base,
            "active": active,
            "history_from": history_from.isoformat() if history_from else None,
            "min_history_days": int(min_history_days or 0),
            "data_from": data_from.date().isoformat() if data_from else None,
            "data_to": data_to.date().isoformat() if data_to else None,
            "candle_count": int(count or 0),
            "loaded": bool(count and count > 0),
        }
        symbols.append(item)
        if item["loaded"]:
            loaded.append(item)

    coverage = None
    if loaded:
        coverage = {
            "from": min(s["data_from"] for s in loaded if s["data_from"]),
            "to": max(s["data_to"] for s in loaded if s["data_to"]),
            "loaded_pairs": len(loaded),
        }

    return {
        "symbols": symbols,
        "coverage": coverage,
        "total_active": len(symbols),
        "total_loaded": len(loaded),
    }


if __name__ == "__main__":
    try:
        print(json.dumps(list_symbols()))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)
