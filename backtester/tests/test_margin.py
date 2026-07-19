from __future__ import annotations

from decimal import Decimal

from backtester.core.margin import (
    calc_binance_cross_liq_long,
    calc_entry_margin,
    calc_notional_pct_of_bank,
    calc_position_qty,
    calc_pnl_pct,
    calc_wallet_balance,
    is_liquidated_long,
)
from backtester.core.params import StrategyParams
from backtester.simulators.single_coin import SingleCoinSimulator
from backtester.tests.helpers import make_candles, make_dip_bounce


def test_position_qty_uses_leverage():
    margin = Decimal("10")
    price = Decimal("100000")
    leverage = Decimal("10")
    qty = calc_position_qty(margin, price, leverage)
    assert qty == Decimal("0.001")
    assert qty * price == margin * leverage


def test_leverage_is_multiplication():
    """Binance: position = margin × leverage."""
    bank = Decimal("100")
    assert calc_notional_pct_of_bank(Decimal("10"), Decimal("10")) == Decimal("100")
    assert calc_notional_pct_of_bank(Decimal("100"), Decimal("1")) == Decimal("100")


def test_same_position_same_cross_liq():
    """10%×10x and 100%×1x: same WB, same qty → same cross liq (Binance)."""
    price = Decimal("82000")
    mmr = Decimal("0.004")
    notional = Decimal("100")

    m10 = Decimal("10")
    q10 = notional / price
    wb10 = Decimal("100")
    liq10 = calc_binance_cross_liq_long(wb10, q10, price, mmr)

    m1 = Decimal("100")
    q1 = notional / price
    wb1 = Decimal("100")
    liq1 = calc_binance_cross_liq_long(wb1, q1, price, mmr)

    assert liq10 == liq1 == Decimal("0")


def test_pnl_pct_on_notional():
    margin = Decimal("10")
    price = Decimal("100000")
    leverage = Decimal("10")
    qty = calc_position_qty(margin, price, leverage)
    new_price = price * Decimal("1.01")
    pnl = qty * (new_price - price)
    notional = margin * leverage
    assert calc_pnl_pct(pnl, notional) == Decimal("1")


def test_entry_100pct_1x_opens_like_10pct_10x():
    candles = make_dip_bounce(dip_pct=5, bounce_pct=3)
    base = dict(
        symbol="BTCUSDT",
        initial_deposit=Decimal("100"),
        drop_pct=Decimal("5"),
        take_profit_pct=Decimal("2"),
        fee_rate=Decimal("0.0004"),
        funding_rate_8h=Decimal("0"),
    )

    result_a = SingleCoinSimulator(
        StrategyParams(**base, entry_pct_of_deposit=Decimal("10"), leverage=Decimal("10"))
    ).run(candles)
    result_b = SingleCoinSimulator(
        StrategyParams(**base, entry_pct_of_deposit=Decimal("100"), leverage=Decimal("1"))
    ).run(candles)

    assert result_a.total_trades >= 1
    assert result_b.total_trades >= 1
    na = result_a.trades[0].total_margin * result_a.trades[0].leverage
    nb = result_b.trades[0].total_margin * result_b.trades[0].leverage
    assert abs(na - nb) < Decimal("1")


def test_liquidation_triggers_near_leverage_distance():
    cash = Decimal("0")
    margin = Decimal("100")
    price = Decimal("100000")
    qty = Decimal("0.01")
    mmr = Decimal("0.004")

    assert not is_liquidated_long(cash, margin, qty, price, Decimal("91000"), mmr)
    assert is_liquidated_long(cash, margin, qty, price, Decimal("90000"), mmr)


def test_liquidation_zeros_balance_and_stops_trading():
    flat = [100.0] * 15
    crash = [100.0 - i * 3 for i in range(1, 20)]
    candles = make_candles(flat + crash)

    sim = SingleCoinSimulator(
        StrategyParams(
            symbol="BTCUSDT",
            initial_deposit=Decimal("100"),
            entry_pct_of_deposit=Decimal("50"),
            leverage=Decimal("20"),
            drop_pct=Decimal("1"),
            take_profit_pct=Decimal("50"),
            fee_rate=Decimal("0"),
            funding_rate_8h=Decimal("0"),
        )
    )
    result = sim.run(candles)

    if result.liquidated:
        assert result.final_balance == Decimal("0")
        assert result.liquidated_trades >= 1
