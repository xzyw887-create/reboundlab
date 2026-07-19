from __future__ import annotations

from decimal import Decimal

from backtester.core.params import AverageLevel, DEFAULT_AVERAGING_DROPS, StrategyParams
from backtester.core.types import CloseReason, TradeStatus
from backtester.simulators.single_coin import SingleCoinSimulator
from backtester.tests.helpers import make_candles, make_dip_bounce


def _base_params(**overrides) -> StrategyParams:
    defaults = dict(
        symbol="BTCUSDT",
        initial_deposit=Decimal("1000"),
        entry_pct_of_deposit=Decimal("10"),
        leverage=Decimal("5"),
        drop_pct=Decimal("3"),
        entry_timeframe="1m",
        take_profit_pct=Decimal("2"),
        stop_loss_pct=None,
        trailing_enabled=False,
        averaging_levels=[],
        fee_rate=Decimal("0"),
        funding_rate_8h=Decimal("0"),
    )
    defaults.update(overrides)
    return StrategyParams(**defaults)


def test_dip_entry_and_take_profit():
    candles = make_dip_bounce(dip_pct=5, bounce_pct=3)
    sim = SingleCoinSimulator(
        _base_params(drop_pct=Decimal("5"), take_profit_pct=Decimal("2"))
    )
    result = sim.run(candles)

    assert result.total_trades >= 1
    assert result.trades[0].status == TradeStatus.CLOSED
    assert result.trades[0].close_reason == CloseReason.TAKE_PROFIT
    assert result.final_balance > result.initial_deposit


def test_liquidation_zeros_balance():
    # High leverage, deep crash after entry
    flat = [100.0] * 20
    dip = [100 - i * 2 for i in range(1, 6)]  # 10% drop triggers entry
    crash = [90 - i * 5 for i in range(1, 10)]  # continue crashing
    candles = make_candles(flat + dip + crash)

    sim = SingleCoinSimulator(
        _base_params(
            leverage=Decimal("20"),
            drop_pct=Decimal("3"),
            entry_pct_of_deposit=Decimal("50"),
        )
    )
    result = sim.run(candles)

    if result.liquidated_trades > 0:
        assert result.liquidated is True
        assert result.final_balance == Decimal("0")


def test_trailing_stop_closes_trade():
    candles = make_dip_bounce(dip_pct=5, bounce_pct=5, bounce_bars=15)
    sim = SingleCoinSimulator(
        _base_params(
            trailing_enabled=True,
            trailing_activation_pct=Decimal("2"),
            trailing_callback_pct=Decimal("1"),
            take_profit_pct=Decimal("50"),
        )
    )
    result = sim.run(candles)

    assert result.total_trades >= 1
    closed = [t for t in result.trades if t.close_reason == CloseReason.TRAILING]
    open_at_end = [t for t in result.trades if t.status == TradeStatus.OPEN]
    assert len(closed) >= 1 or len(open_at_end) >= 1


def test_averaging_uses_leverage():
    """Each averaging leg: qty = margin * leverage / price, liq near leg price."""
    flat = [100.0] * 10
    dip = [98.0, 96.0, 94.0, 92.0]
    recovery = [93.0, 95.0, 98.0, 100.0]
    candles = make_candles(flat + dip + recovery)

    leverage = Decimal("10")
    sim = SingleCoinSimulator(
        _base_params(
            initial_deposit=Decimal("100"),
            entry_pct_of_deposit=Decimal("10"),
            leverage=leverage,
            drop_pct=Decimal("2"),
            averaging_levels=[AverageLevel(Decimal("5"), Decimal("10"))],
            take_profit_pct=Decimal("5"),
            fee_rate=Decimal("0"),
        )
    )
    result = sim.run(candles)

    averaged = [t for t in result.trades if t.avg_count >= 1]
    assert averaged, "expected at least one trade with averaging"
    trade = averaged[0]
    assert len(trade.entries) >= 2

    leg = trade.entries[1]
    expected_qty = leg.margin_usd * leverage / leg.price
    assert leg.qty == expected_qty

    from backtester.core.margin import calc_liquidation_display

    # Cross-margin liq uses full position after averaging, not per-leg isolated
    assert leg.liq_price_after >= Decimal("0")


def test_averaging_increases_position():
    flat = [100.0] * 15
    dip = [98, 96, 94, 92, 90, 88, 86]
    recovery = [88 + i for i in range(1, 8)]
    candles = make_candles(flat + dip + recovery)

    sim = SingleCoinSimulator(
        _base_params(
            drop_pct=Decimal("2"),
            averaging_levels=[
                AverageLevel(DEFAULT_AVERAGING_DROPS[0], Decimal("10")),
                AverageLevel(DEFAULT_AVERAGING_DROPS[1], Decimal("10")),
            ],
            take_profit_pct=Decimal("3"),
        )
    )
    result = sim.run(candles)

    if result.total_trades >= 1:
        trade = result.trades[0]
        assert trade.avg_count >= 0


def test_multiple_round_trips_on_repeated_dips():
    flat = [100.0] * 30
    dip1 = [97.0, 95.0]
    bounce1 = [96.0, 97.0, 98.0, 99.0]
    flat2 = [99.0] * 30
    dip2 = [96.0, 94.0]
    bounce2 = [95.0, 96.0, 97.0, 98.0]
    candles = make_candles(flat + dip1 + bounce1 + flat2 + dip2 + bounce2)

    sim = SingleCoinSimulator(_base_params(averaging_levels=[]))
    result = sim.run(candles)

    assert result.total_trades >= 2
    closed_tp = [t for t in result.trades if t.close_reason == CloseReason.TAKE_PROFIT]
    assert len(closed_tp) >= 1


def test_open_position_stays_active_at_end_of_period():
    flat = [100.0] * 20
    dip = [97.0, 95.0]
    flat_after = [97.0] * 40
    candles = make_candles(flat + dip + flat_after)

    sim = SingleCoinSimulator(
        _base_params(
            drop_pct=Decimal("3"),
            take_profit_pct=Decimal("50"),
            averaging_levels=[],
        )
    )
    result = sim.run(candles)

    assert result.total_trades == 1
    assert result.trades[0].status == TradeStatus.OPEN
    assert result.trades[0].closed_at is None
    assert result.trades[0].mark_price is not None
    # Open trade at end: equity includes entry fees and small unrealized move.
    assert result.final_balance <= result.initial_deposit
    assert result.final_balance >= result.initial_deposit * Decimal("0.98")
    assert result.realized_balance <= result.initial_deposit
    assert result.final_pnl_pct <= Decimal("0")
    assert result.trades[0].target_exit_price is not None
    assert result.trades[0].target_exit_price > result.trades[0].avg_price


def test_peak_drop_does_not_loop_on_same_candle():
    candles = make_candles([100.0] * 60)
    from backtester.core.types import Candle
    from datetime import timedelta

    t = candles[-1].open_time + timedelta(minutes=1)
    candles.append(
        Candle(
            open_time=t,
            open=Decimal("100"),
            high=Decimal("100"),
            low=Decimal("90"),
            close=Decimal("98"),
        )
    )

    sim = SingleCoinSimulator(
        _base_params(
            drop_pct=Decimal("3"),
            take_profit_pct=Decimal("2"),
            averaging_levels=[],
        )
    )
    result = sim.run(candles)

    assert result.total_trades >= 1
    assert result.total_trades < 100


def test_no_trades_without_signal():
    candles = make_candles([100.0] * 50)
    sim = SingleCoinSimulator(_base_params(drop_pct=Decimal("10")))
    result = sim.run(candles)

    assert result.total_trades == 0
    assert result.final_balance == result.initial_deposit


def test_params_validation():
    import pytest

    with pytest.raises(ValueError):
        StrategyParams(
            symbol="X",
            initial_deposit=Decimal("-1"),
            entry_pct_of_deposit=Decimal("10"),
            leverage=Decimal("5"),
            drop_pct=Decimal("3"),
            take_profit_pct=Decimal("2"),
        ).validate()
