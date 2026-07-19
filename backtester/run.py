#!/usr/bin/env python3
"""
Run a single-coin backtest.

Usage:
  python run.py                          # synthetic demo
  python run.py --symbol BTCUSDT         # load from DB (requires docker)
"""
from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timezone
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backtester.core.params import AverageLevel, DEFAULT_AVERAGING_DROPS, StrategyParams
from backtester.core.types import Candle
from backtester.simulators.single_coin import SingleCoinSimulator
from backtester.tests.helpers import make_dip_bounce


def load_candles_from_db(symbol: str, days: int = 7) -> list[Candle]:
    import psycopg2

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
        WHERE tp.symbol = %s AND c.timeframe = '1m'
        ORDER BY c.open_time ASC
        LIMIT %s
        """,
        (symbol, days * 24 * 60),
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


def print_result(result) -> None:
    print("\n" + "=" * 60)
    print(f"Symbol:       {result.symbol}")
    print(f"Deposit:      ${result.initial_deposit}")
    print(f"Final:        ${result.final_balance:.2f}")
    print(f"PnL:          {result.final_pnl_pct:.2f}%")
    print(f"Trades:       {result.total_trades}")
    print(f"Winners:      {result.winning_trades}")
    print(f"Liquidated:   {result.liquidated}")
    print("=" * 60)

    for i, trade in enumerate(result.trades, 1):
        print(f"\n--- Trade #{i} ---")
        print(f"  Open:    {trade.opened_at}")
        print(f"  Close:   {trade.closed_at}")
        print(f"  Status:  {trade.status.value} ({trade.close_reason})")
        print(f"  Entry%:  {trade.entry_pct_of_deposit}% of deposit")
        print(f"  Avg #:   {trade.avg_count}")
        print(f"  Avg px:  {trade.avg_price:.4f}")
        print(f"  Liq px:  {trade.liq_price:.4f}")
        print(f"  PnL:     ${trade.pnl_usd:.2f} ({trade.pnl_pct:.2f}%)")
        print(f"  Fees:    ${trade.fees_paid:.4f}")
        print(f"  Bank:    ${trade.bank_at_open:.2f} → ${trade.bank_at_close:.2f}")
        for j, entry in enumerate(trade.entries, 1):
            print(
                f"    Entry {j}: {entry.time} @ {entry.price:.2f} "
                f"({entry.pct_of_deposit}% dep, liq={entry.liq_price_after:.2f})"
            )


def main():
    parser = argparse.ArgumentParser(description="ReboundLab single-coin backtest")
    parser.add_argument("--symbol", default=None, help="Load candles from DB")
    parser.add_argument("--deposit", type=float, default=1000)
    parser.add_argument("--entry-pct", type=float, default=10)
    parser.add_argument("--leverage", type=float, default=5)
    parser.add_argument("--drop-pct", type=float, default=3)
    parser.add_argument("--window", type=int, default=10, help="Drop window minutes")
    parser.add_argument("--tp", type=float, default=2, help="Take profit %")
    parser.add_argument("--trailing", action="store_true")
    args = parser.parse_args()

    params = StrategyParams(
        symbol=args.symbol or "BTCUSDT",
        initial_deposit=Decimal(str(args.deposit)),
        entry_pct_of_deposit=Decimal(str(args.entry_pct)),
        leverage=Decimal(str(args.leverage)),
        drop_pct=Decimal(str(args.drop_pct)),
        drop_window_minutes=args.window,
        take_profit_pct=Decimal(str(args.tp)),
        trailing_enabled=args.trailing,
        averaging_levels=[
            AverageLevel(d, Decimal(str(args.entry_pct)))
            for d in DEFAULT_AVERAGING_DROPS
        ],
        fee_rate=Decimal("0.0004"),
        funding_rate_8h=Decimal("0.0001"),
    )

    if args.symbol:
        print(f"Loading {args.symbol} from database...")
        candles = load_candles_from_db(args.symbol)
        if not candles:
            print("No candles found. Run market-data backfill first.")
            sys.exit(1)
    else:
        print("Running synthetic dip-bounce demo...")
        candles = make_dip_bounce()

    sim = SingleCoinSimulator(params)
    result = sim.run(candles)
    print_result(result)


if __name__ == "__main__":
    main()
