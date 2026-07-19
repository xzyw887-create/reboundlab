"""Resample 1m candles into higher timeframes."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from backtester.core.types import Candle
from backtester.data.timeframe import timeframe_minutes


def _bucket_start(ts: datetime, period_min: int) -> datetime:
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    if period_min == 1:
        return ts.replace(second=0, microsecond=0)
    if period_min == 1440:
        return ts.replace(hour=0, minute=0, second=0, microsecond=0)
    if period_min == 60:
        return ts.replace(minute=0, second=0, microsecond=0)
    if period_min == 240:
        hour = (ts.hour // 4) * 4
        return ts.replace(hour=hour, minute=0, second=0, microsecond=0)
    # 15m, 30m
    minute = (ts.minute // period_min) * period_min
    return ts.replace(minute=minute, second=0, microsecond=0)


def resample_candles(candles_1m: list[Candle], timeframe: str) -> list[Candle]:
    period = timeframe_minutes(timeframe)
    if period == 1:
        return list(candles_1m)
    if not candles_1m:
        return []

    buckets: dict[datetime, list[Candle]] = {}
    for c in candles_1m:
        start = _bucket_start(c.open_time, period)
        buckets.setdefault(start, []).append(c)

    result: list[Candle] = []
    for start in sorted(buckets.keys()):
        chunk = buckets[start]
        result.append(
            Candle(
                open_time=start,
                open=chunk[0].open,
                high=max(x.high for x in chunk),
                low=min(x.low for x in chunk),
                close=chunk[-1].close,
                volume=sum((x.volume for x in chunk), Decimal("0")),
            )
        )
    return result


def bar_close_time(bar: Candle, timeframe: str) -> datetime:
    """Last 1m timestamp inside this aggregated bar."""
    period = timeframe_minutes(timeframe)
    if period == 1:
        return bar.open_time
    return bar.open_time + timedelta(minutes=period - 1)


def build_close_time_index(
    candles_1m: list[Candle], timeframe: str
) -> dict[datetime, int]:
    """Map each 1m open_time -> index in candles_1m."""
    return {c.open_time: i for i, c in enumerate(candles_1m)}


def tf_close_to_1m_index(
    tf_candle: Candle, timeframe: str, candles_1m: list[Candle]
) -> int | None:
    close_t = bar_close_time(tf_candle, timeframe)
    for i, c in enumerate(candles_1m):
        if c.open_time == close_t:
            return i
    period = timeframe_minutes(timeframe)
    end = tf_candle.open_time + timedelta(minutes=period)
    best = None
    for i, c in enumerate(candles_1m):
        if tf_candle.open_time <= c.open_time < end:
            best = i
    return best


def build_chart_peak_series(
    candles_1m: list[Candle], timeframe: str
) -> list[Decimal]:
    """
    Peak high at each 1m index: max of all TF candle highs visible on the chart
    up to that minute (completed bars + current bar in progress).
    Never resets — covers the full selected test period.
    """
    from backtester.data.timeframe import normalize_timeframe

    if not candles_1m:
        return []

    tf = normalize_timeframe(timeframe)
    period = timeframe_minutes(tf)
    tf_candles = resample_candles(candles_1m, tf)
    if not tf_candles:
        return [Decimal("0")] * len(candles_1m)

    # Map TF bar open_time -> bar index
    tf_by_start = {bar.open_time: ti for ti, bar in enumerate(tf_candles)}

    completed_peak = Decimal("0")
    current_bucket_start: datetime | None = None
    current_bucket_high = Decimal("0")
    series: list[Decimal] = []

    for c in candles_1m:
        bucket = _bucket_start(c.open_time, period)

        if current_bucket_start is None:
            current_bucket_start = bucket
            current_bucket_high = c.high
        elif bucket != current_bucket_start:
            # Previous TF bar finished — lock its high into completed peak
            if current_bucket_start in tf_by_start:
                bar = tf_candles[tf_by_start[current_bucket_start]]
                completed_peak = max(completed_peak, bar.high)
            current_bucket_start = bucket
            current_bucket_high = c.high
        else:
            current_bucket_high = max(current_bucket_high, c.high)

        visible_peak = max(completed_peak, current_bucket_high)
        series.append(visible_peak)

    return series


def exit_allowed_after(entry_time: datetime, timeframe: str) -> datetime:
    """First 1m when TP/SL may fire — next TF candle after entry (no buy+sell same bar)."""
    period = timeframe_minutes(timeframe)
    bar_start = _bucket_start(entry_time, period)
    return bar_start + timedelta(minutes=period)


def build_tf_close_map(
    candles_1m: list[Candle], timeframe: str
) -> tuple[list[Candle], dict[int, int]]:
    """Return TF candles and map: 1m index at TF close -> TF bar index."""
    from backtester.data.timeframe import normalize_timeframe

    tf = normalize_timeframe(timeframe)
    tf_candles = resample_candles(candles_1m, tf)
    close_map: dict[int, int] = {}
    for ti, bar in enumerate(tf_candles):
        m1_idx = tf_close_to_1m_index(bar, tf, candles_1m)
        if m1_idx is not None:
            close_map[m1_idx] = ti
    return tf_candles, close_map


def build_entry_slots(
    candles_1m: list[Candle],
    timeframe: str,
    drop_pct,
) -> dict[int, Decimal]:
    """Diagnostic: 1m entry slots with peak-from-last-close logic (TF ignored)."""
    from backtester.strategies.entry import DropFromPeakTracker

    tracker = DropFromPeakTracker()
    slots: dict[int, Decimal] = {}
    for i, c in enumerate(candles_1m):
        price = tracker.check_entry(c, drop_pct)
        if price is not None:
            slots[i] = price
    return slots
