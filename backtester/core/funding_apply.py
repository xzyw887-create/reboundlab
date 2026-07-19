"""Apply Binance funding events to open positions."""
from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal


def apply_funding_for_candle(
    total_qty: Decimal,
    candle_time: datetime,
    mark_price: Decimal,
    schedule: list[tuple[datetime, Decimal]] | None,
    flat_rate_8h: Decimal,
    last_funding_time: datetime | None,
    funding_event_idx: int,
) -> tuple[Decimal, datetime | None, int]:
    """
    Returns (payment, new_last_funding_time, new_event_idx).
    payment > 0: long pays (deduct from cash). payment < 0: long receives.
    """
    if total_qty <= 0:
        return Decimal("0"), last_funding_time, funding_event_idx

    if schedule:
        total = Decimal("0")
        idx = funding_event_idx
        new_last = last_funding_time
        while idx < len(schedule):
            event_time, rate = schedule[idx]
            if event_time > candle_time:
                break
            notional = total_qty * mark_price
            total += notional * rate
            new_last = event_time
            idx += 1
        return total, new_last, idx

    if last_funding_time is None:
        return Decimal("0"), candle_time, 0

    if candle_time - last_funding_time < timedelta(hours=8):
        return Decimal("0"), last_funding_time, 0

    notional = total_qty * mark_price
    payment = notional * flat_rate_8h
    return payment, candle_time, 0
