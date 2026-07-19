from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from backtester.core.types import Candle


def make_candles(
    prices: list[float],
    start: datetime | None = None,
) -> list[Candle]:
    """Build 1m candles from close prices (high/low = close)."""
    start = start or datetime(2025, 1, 1, tzinfo=timezone.utc)
    candles = []
    for i, price in enumerate(prices):
        p = Decimal(str(price))
        candles.append(
            Candle(
                open_time=start + timedelta(minutes=i),
                open=p,
                high=p,
                low=p,
                close=p,
            )
        )
    return candles


def make_dip_bounce(
    base: float = 100.0,
    dip_pct: float = 5.0,
    bounce_pct: float = 3.0,
    flat_bars: int = 30,
    dip_bars: int = 3,
    bounce_bars: int = 10,
) -> list[Candle]:
    """Flat → sharp dip (within dip_bars) → bounce pattern for entry/TP tests."""
    prices: list[float] = [base] * flat_bars
    dip_target = base * (1 - dip_pct / 100)
    if dip_bars <= 1:
        prices.append(dip_target)
    else:
        mid = base - (base - dip_target) / 2
        prices.append(mid)
        prices.append(dip_target)
        for i in range(2, dip_bars):
            prices.append(dip_target)
    bounce_target = dip_target * (1 + bounce_pct / 100)
    step_up = (bounce_target - dip_target) / bounce_bars
    for i in range(bounce_bars):
        prices.append(dip_target + step_up * (i + 1))
    return make_candles(prices)


def make_multi_demo(symbols: list[str] | None = None) -> dict[str, list[Candle]]:
    """Demo candles for multi-coin: different dip timings per symbol."""
    symbols = symbols or ["BTCUSDT", "ETHUSDT", "SOLUSDT"]
    result = {}

    patterns = {
        "BTCUSDT": make_dip_bounce(base=100, dip_pct=5, bounce_pct=3),
        "ETHUSDT": make_dip_bounce(base=50, dip_pct=6, bounce_pct=2, flat_bars=40, dip_bars=6),
        "SOLUSDT": make_dip_bounce(base=20, dip_pct=4, bounce_pct=4, flat_bars=20, dip_bars=4),
    }

    for i, sym in enumerate(symbols):
        if sym in patterns:
            result[sym] = patterns[sym]
        else:
            result[sym] = make_dip_bounce(
                base=100 - i * 10, dip_pct=4 + i, bounce_pct=3, flat_bars=25 + i * 5
            )

    return result

