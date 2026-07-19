from __future__ import annotations

from decimal import Decimal

from backtester.core.margin import calc_liquidation_display
from backtester.core.params import PortfolioParams
from backtester.simulators.multi_coin import MultiCoinSimulator
from backtester.tests.helpers import make_candles


def test_multi_coin_liq_uses_full_wallet_balance():
    """With 2 positions, liq must not show near-entry price from partial WB."""
    flat = [100.0] * 30
    btc = make_candles(flat + [99.0, 98.0])
    eth = make_candles(flat + [50.0, 49.0])

    p = PortfolioParams(
        symbols=["BTCUSDT", "ETHUSDT"],
        initial_deposit=Decimal("100"),
        entry_pct_of_deposit=Decimal("10"),
        leverage=Decimal("5"),
        drop_pct=Decimal("1"),
        take_profit_pct=Decimal("50"),
        fee_rate=Decimal("0"),
        funding_rate_8h=Decimal("0"),
        use_real_funding=False,
    )
    sim = MultiCoinSimulator(p)
    result = sim.run({"BTCUSDT": btc, "ETHUSDT": eth})

    for trade in result.trades:
        # Cross margin with full bank — liq should be far (0) or very low
        assert trade.liq_price == Decimal("0") or trade.liq_price < trade.avg_price * Decimal(
            "0.5"
        ), f"unexpected liq {trade.liq_price} for {trade.symbol}"


def test_refresh_liq_display_with_two_positions():
    cash = Decimal("70")
    margin_btc = Decimal("10")
    margin_eth = Decimal("10")
    qty_btc = Decimal("0.001")
    qty_eth = Decimal("0.02")
    wallet = cash + margin_btc + margin_eth

    liq_btc = calc_liquidation_display(
        cash,
        margin_btc,
        qty_btc,
        Decimal("100000"),
        None,
        wallet_balance=wallet,
    )
    liq_partial = calc_liquidation_display(
        cash, margin_btc, qty_btc, Decimal("100000"), None
    )
    # Partial WB (only this leg's margin) → liq closer to entry (misleading ~$38 bug)
    assert liq_partial > liq_btc
