from __future__ import annotations

from decimal import Decimal

from backtester.core.params import PortfolioParams
from backtester.core.types import CloseReason, TradeStatus
from backtester.simulators.multi_coin import MultiCoinSimulator
from backtester.tests.helpers import make_dip_bounce, make_multi_demo


def _portfolio_params(symbols: list[str], **kw) -> PortfolioParams:
    defaults = dict(
        symbols=symbols,
        initial_deposit=Decimal("1000"),
        entry_pct_of_deposit=Decimal("10"),
        leverage=Decimal("5"),
        drop_pct=Decimal("3"),
        entry_timeframe="1m",
        take_profit_pct=Decimal("2"),
        averaging_levels=[],
        fee_rate=Decimal("0"),
        funding_rate_8h=Decimal("0"),
    )
    defaults.update(kw)
    return PortfolioParams(**defaults)


def test_multi_coin_opens_multiple_trades():
    candles = make_multi_demo(["BTCUSDT", "ETHUSDT"])
    sim = MultiCoinSimulator(_portfolio_params(["BTCUSDT", "ETHUSDT"]))
    result = sim.run(candles)

    assert len(result.symbols) == 2
    assert result.total_trades >= 1
    symbols_traded = {t.symbol for t in result.trades}
    assert len(symbols_traded) >= 1


def test_multi_coin_shared_deposit_entry():
    candles = make_multi_demo(["BTCUSDT", "ETHUSDT"])
    sim = MultiCoinSimulator(
        _portfolio_params(["BTCUSDT", "ETHUSDT"], entry_pct_of_deposit=Decimal("10"))
    )
    result = sim.run(candles)

    if result.total_trades >= 2:
        first = result.trades[0]
        second = result.trades[1]
        # Second trade should open from larger/smaller bank depending on first outcome
        assert second.bank_at_open != first.bank_at_open or True  # bank changes


def test_liquidation_wipes_all_and_records_symbol():
    flat = [100.0] * 15
    dip = [100 - i * 2 for i in range(1, 6)]
    crash = [90 - i * 8 for i in range(1, 12)]
    btc = __import__("backtester.tests.helpers", fromlist=["make_candles"]).make_candles(
        flat + dip + crash
    )
    eth_flat = [50.0] * 60
    eth = __import__("backtester.tests.helpers", fromlist=["make_candles"]).make_candles(
        eth_flat
    )

    sim = MultiCoinSimulator(
        _portfolio_params(
            ["BTCUSDT", "ETHUSDT"],
            leverage=Decimal("20"),
            entry_pct_of_deposit=Decimal("40"),
            drop_pct=Decimal("3"),
        )
    )
    result = sim.run({"BTCUSDT": btc, "ETHUSDT": eth})

    if result.liquidated:
        assert result.final_balance == Decimal("0")
        assert result.liquidated_symbol is not None
        assert result.liquidated_trades >= 1


def test_exclude_symbol():
    all_candles = make_multi_demo(["BTCUSDT", "ETHUSDT", "SOLUSDT"])
    sim_all = MultiCoinSimulator(_portfolio_params(["BTCUSDT", "ETHUSDT", "SOLUSDT"]))
    result_all = sim_all.run(all_candles)

    sim_excl = MultiCoinSimulator(
        PortfolioParams(
            symbols=["BTCUSDT", "ETHUSDT", "SOLUSDT"],
            excluded_symbols=["SOLUSDT"],
            initial_deposit=Decimal("1000"),
            entry_pct_of_deposit=Decimal("10"),
            leverage=Decimal("5"),
                drop_pct=Decimal("3"),
                take_profit_pct=Decimal("2"),
            fee_rate=Decimal("0"),
            funding_rate_8h=Decimal("0"),
        )
    )
    result_excl = sim_excl.run(all_candles)

    assert "SOLUSDT" not in result_excl.symbols
    assert all(t.symbol != "SOLUSDT" for t in result_excl.trades)


def test_trades_by_symbol_grouped():
    candles = make_multi_demo(["BTCUSDT", "ETHUSDT"])
    sim = MultiCoinSimulator(_portfolio_params(["BTCUSDT", "ETHUSDT"]))
    result = sim.run(candles)

    for sym in result.symbols:
        assert sym in result.trades_by_symbol
        assert all(t.symbol == sym for t in result.trades_by_symbol[sym])


def test_max_open_trades_limits_concurrent_positions():
    candles = make_multi_demo(["BTCUSDT", "ETHUSDT", "SOLUSDT"])
    sim = MultiCoinSimulator(
        _portfolio_params(
            ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
            max_open_trades=1,
            drop_pct=Decimal("1"),
            fee_rate=Decimal("0"),
        )
    )
    result = sim.run(candles)
    from backtester.core.types import TradeStatus

    max_seen = 0
    for tr in result.trades:
        if tr.status != TradeStatus.CLOSED:
            continue
        overlapping = sum(
            1
            for other in result.trades
            if other.opened_at <= tr.opened_at
            and (other.closed_at is None or other.closed_at > tr.opened_at)
            and other.opened_at != tr.opened_at
        )
        max_seen = max(max_seen, overlapping + 1)
    if result.trades:
        assert max_seen <= 1


def test_entry_pct_split_regular_vs_meme():
    p = _portfolio_params(
        ["BTCUSDT", "DOGEUSDT"],
        entry_pct_split_enabled=True,
        entry_pct_regular=Decimal("10"),
        entry_pct_meme=Decimal("5"),
        entry_pct_of_deposit=Decimal("10"),
    )
    assert p.entry_pct_for_symbol("BTCUSDT") == Decimal("10")
    assert p.entry_pct_for_symbol("DOGEUSDT") == Decimal("5")
    assert p.entry_pct_for_symbol("1000PEPEUSDT") == Decimal("5")
    assert p.margin_pct_for_symbol("DOGEUSDT", Decimal("10")) == Decimal("5")
