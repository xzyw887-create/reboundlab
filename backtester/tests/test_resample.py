from __future__ import annotations

from decimal import Decimal

from backtester.data.resample import build_chart_peak_series, build_entry_slots, resample_candles
from backtester.tests.helpers import make_candles


def test_resample_15m_aggregates_high_low():
    prices = [100.0 + (i % 5) for i in range(30)]
    candles_1m = make_candles(prices)
    tf = resample_candles(candles_1m, "15m")

    assert len(tf) == 2
    assert tf[0].high >= tf[0].low


def test_entry_on_1m_drop():
    candles_1m = make_candles([100.0] * 5 + [99.0])
    slots = build_entry_slots(candles_1m, "1m", Decimal("1"))
    assert len(slots) >= 1


def test_chart_peak_series_still_available():
    peaks = build_chart_peak_series(make_candles([100.0, 110.0]), "1m")
    assert peaks[-1] == Decimal("110")
