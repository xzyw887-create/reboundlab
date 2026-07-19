from __future__ import annotations

from decimal import Decimal

from backtester.core.types import Candle
from backtester.core.params import StrategyParams
from backtester.core.types import CloseReason
from backtester.simulators.single_coin import SingleCoinSimulator
from backtester.strategies.entry import DropFromPeakTracker, entry_trigger_price
from backtester.tests.helpers import make_candles


def test_reset_to_exit_price_and_wait_for_drop():
    tracker = DropFromPeakTracker()
    tracker.reset_to(Decimal("100"))
    c1 = make_candles([99.4])[0]  # 0.6% drop — no entry at 1%
    assert tracker.check_entry(c1, Decimal("1")) is None
    c2 = make_candles([99.0])[0]  # peak still 100, 1% drop
    assert tracker.check_entry(c2, Decimal("1")) is not None


def test_peak_rises_before_drop():
    tracker = DropFromPeakTracker()
    tracker.reset_to(Decimal("100"))
    for price in [101.0, 110.0]:
        tracker.check_entry(make_candles([price])[0], Decimal("1"))
    entry = tracker.check_entry(make_candles([108.9])[0], Decimal("1"))
    assert entry is not None


def test_first_trade_waits_for_drop_from_chart_peak():
    """First trade uses peak from highs — not instant buy on period start."""
    tracker = DropFromPeakTracker()
    # flat start, tiny move — no 1% drop from peak
    assert tracker.check_entry(make_candles([100.0])[0], Decimal("1")) is None
    assert tracker.check_entry(make_candles([100.5])[0], Decimal("1")) is None
    # peak now 100.5, need low <= 99.495
    entry = tracker.check_entry(make_candles([99.4])[0], Decimal("1"))
    assert entry is not None


def test_first_candle_intrabar_wick_no_instant_entry():
    """A large wick on the very first 1m bar must not open a trade."""
    tracker = DropFromPeakTracker()
    start = make_candles([100])[0].open_time
    wicky_first = Candle(
        open_time=start,
        open=Decimal("100"),
        high=Decimal("100"),
        low=Decimal("95"),
        close=Decimal("96"),
    )
    assert tracker.check_entry(wicky_first, Decimal("1")) is None
    entry = tracker.check_entry(make_candles([99.0])[0], Decimal("1"))
    assert entry is not None


def test_first_trade_uses_high_not_close_as_peak():
    """Peak from candle high — close-only dip must not trigger too early."""
    tracker = DropFromPeakTracker()
    start = make_candles([100])[0].open_time
    candle = Candle(
        open_time=start,
        open=Decimal("99.8"),
        high=Decimal("100"),
        low=Decimal("99.6"),
        close=Decimal("99.5"),
    )
    assert tracker.check_entry(candle, Decimal("1")) is None


def test_immediate_buy_after_close_on_drop():
    prices = [100.0, 110.0, 108.9, 110.0, 99.0]
    candles = make_candles(prices)
    sim = SingleCoinSimulator(
        StrategyParams(
            symbol="BTCUSDT",
            initial_deposit=Decimal("1000"),
            entry_pct_of_deposit=Decimal("10"),
            leverage=Decimal("5"),
            drop_pct=Decimal("1"),
            take_profit_pct=Decimal("1"),
            fee_rate=Decimal("0"),
            funding_rate_8h=Decimal("0"),
        )
    )
    result = sim.run(candles)
    assert result.total_trades >= 2
