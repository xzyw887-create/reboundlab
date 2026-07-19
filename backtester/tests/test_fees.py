"""Commission model vs exchange taker fee (0.05% per fill)."""

from __future__ import annotations

from decimal import Decimal

from backtester.core.margin import calc_fee
from backtester.core.params import StrategyParams
from backtester.simulators.single_coin import SingleCoinSimulator
from backtester.tests.helpers import make_dip_bounce

TAKER = Decimal("0.0005")


def test_default_fee_rate_is_binance_taker():
    p = StrategyParams(
        symbol="BTCUSDT",
        initial_deposit=Decimal("100"),
        entry_pct_of_deposit=Decimal("10"),
        leverage=Decimal("5"),
        drop_pct=Decimal("1"),
        take_profit_pct=Decimal("2"),
    )
    assert p.fee_rate == TAKER


def test_calc_fee_on_notional():
    notional = Decimal("1000")
    assert calc_fee(notional, TAKER) == Decimal("0.5")


def test_open_and_close_fees_on_simple_trade():
    """One entry + one exit → 2 × taker on notional at each leg."""
    candles = make_dip_bounce(dip_pct=5, bounce_pct=3)
    result = SingleCoinSimulator(
        StrategyParams(
            symbol="BTCUSDT",
            initial_deposit=Decimal("100"),
            entry_pct_of_deposit=Decimal("10"),
            leverage=Decimal("10"),
            drop_pct=Decimal("5"),
            take_profit_pct=Decimal("2"),
            fee_rate=TAKER,
            funding_rate_8h=Decimal("0"),
        )
    ).run(candles)

    assert result.total_trades >= 1
    trade = result.trades[0]
    open_notional = trade.total_margin * trade.leverage
    expected_min = calc_fee(open_notional, TAKER)
    assert trade.fees_paid >= expected_min
