from __future__ import annotations

from decimal import Decimal

from backtester.core.types import Candle
from backtester.data.timeframe import normalize_timeframe


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

    1m: peak builds from 1m highs; entry on 1m low reaching threshold.
    Higher TF: peak builds from closed TF bar highs; entry only on TF bar close.

    After each closed trade: peak resets to exit price, then rises again.
    """

    def __init__(self, entry_timeframe: str = "1m") -> None:
        self.entry_timeframe = normalize_timeframe(entry_timeframe)
        self.peak = Decimal("0")

    def reset_to(self, price: Decimal) -> None:
        """Called after a trade closes — start counting from exit price."""
        self.peak = price

    def check_entry(
        self,
        candle: Candle,
        drop_pct: Decimal,
        tf_bar: Candle | None = None,
    ) -> Decimal | None:
        if self.entry_timeframe == "1m":
            return self._check_1m(candle, drop_pct)
        if tf_bar is None:
            return None
        return self._check_tf_close(tf_bar, drop_pct)

    def _check_1m(self, candle: Candle, drop_pct: Decimal) -> Decimal | None:
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

    def _check_tf_close(self, bar: Candle, drop_pct: Decimal) -> Decimal | None:
        if self.peak <= 0:
            self.peak = bar.high
            return None

        self.peak = max(self.peak, bar.high)
        trigger = entry_trigger_price(self.peak, drop_pct)
        if bar.low <= trigger:
            return trigger
        return None


def price_drop_from_avg(current_price: Decimal, avg_price: Decimal) -> Decimal:
    """Percent drop from average entry price."""
    if avg_price <= 0:
        return Decimal("0")
    return ((avg_price - current_price) / avg_price) * Decimal("100")
