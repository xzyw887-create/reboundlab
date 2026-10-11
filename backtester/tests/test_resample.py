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


def test_15m_no_entry_before_first_tf_close_despite_wick():
    from datetime import timedelta

    from backtester.core.params import StrategyParams
    from backtester.core.types import Candle
    from backtester.simulators.single_coin import SingleCoinSimulator

    candles = make_candles([100.0] * 14)
    start = candles[0].open_time
    candles[5] = Candle(
        open_time=start + timedelta(minutes=5),
        open=Decimal("100"),
        high=Decimal("100"),
        low=Decimal("98"),
        close=Decimal("99.5"),
    )

    result = SingleCoinSimulator(
        StrategyParams(
            symbol="BTCUSDT",
            initial_deposit=Decimal("1000"),
            entry_pct_of_deposit=Decimal("10"),
            leverage=Decimal("5"),
            drop_pct=Decimal("1"),
            take_profit_pct=Decimal("2"),
            entry_timeframe="15m",
            fee_rate=Decimal("0"),
            funding_rate_8h=Decimal("0"),
        )
    ).run(candles)

    assert result.total_trades == 0


def test_15m_first_trade_waits_until_tf_bar_close():
    from backtester.core.params import StrategyParams
    from backtester.simulators.single_coin import SingleCoinSimulator
    from backtester.tests.helpers import make_dip_bounce

    candles = make_dip_bounce(flat_bars=30, dip_pct=5, bounce_pct=2)
    result = SingleCoinSimulator(
        StrategyParams(
            symbol="BTCUSDT",
            initial_deposit=Decimal("1000"),
            entry_pct_of_deposit=Decimal("10"),
            leverage=Decimal("5"),
            drop_pct=Decimal("5"),
            take_profit_pct=Decimal("2"),
            entry_timeframe="15m",
            fee_rate=Decimal("0"),
            funding_rate_8h=Decimal("0"),
        )
    ).run(candles)

    assert result.total_trades >= 1
    first_idx = next(
        i for i, c in enumerate(candles) if c.open_time == result.trades[0].opened_at
    )
    assert first_idx >= 14


def test_chart_peak_series_still_available():
    peaks = build_chart_peak_series(make_candles([100.0, 110.0]), "1m")
    assert peaks[-1] == Decimal("110")
