from __future__ import annotations

from decimal import Decimal

from backtester.core.types import Candle


def drop_from_peak_pct(peak: Decimal, price: Decimal) -> Decimal:
    """Percent drop from reference peak to price."""
    if peak <= 0:
        return Decimal("0")
    return ((peak - price) / peak) * Decimal("100")


def entry_trigger_price(peak: Decimal, drop_pct: Decimal) -> Decimal:
    return peak * (Decimal("1") - drop_pct / Decimal("100"))


class DropFromPeakTracker:
    """
    Buy when price drops drop_pct from the running peak.

    Before the first trade: peak builds from highs on the chart (no special start buy).
    After each closed trade: peak resets to exit price, then rises with highs again.
    Entry fires on 1m when low reaches the drop threshold.
    """

    def __init__(self) -> None:
        self.peak = Decimal("0")

    def reset_to(self, price: Decimal) -> None:
        """Called after a trade closes — start counting from exit price."""
        self.peak = price

    def check_entry(self, candle: Candle, drop_pct: Decimal) -> Decimal | None:
        if self.peak <= 0:
            # First bar: only establish peak from high — no same-candle entry.
            self.peak = candle.high
            return None

        self.peak = max(self.peak, candle.high)

        if self.peak <= 0:
            return None

        trigger = entry_trigger_price(self.peak, drop_pct)
        if candle.low <= trigger:
            return trigger
        return None


def price_drop_from_avg(current_price: Decimal, avg_price: Decimal) -> Decimal:
    """Percent drop from average entry price."""
    if avg_price <= 0:
        return Decimal("0")
    return ((avg_price - current_price) / avg_price) * Decimal("100")
