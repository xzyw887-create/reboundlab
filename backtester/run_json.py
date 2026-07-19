#!/usr/bin/env python3
"""JSON API for web UI — reads params from stdin, outputs JSON result."""
from __future__ import annotations

import json
import sys
from datetime import datetime
from decimal import Decimal
from enum import Enum

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parents[1]))

from backtester.core.coin_categories import DEFAULT_MEME_SYMBOLS
from backtester.core.params import DEFAULT_AVERAGING_DROPS, AverageLevel, PortfolioParams, StrategyParams
from backtester.core.types import Candle, PortfolioSimulationResult, SimulationResult
from backtester.data.funding import load_funding_map
from backtester.data.loader import load_candles_from_db, load_candles_map_from_db
from backtester.simulators.multi_coin import MultiCoinSimulator
from backtester.simulators.single_coin import SingleCoinSimulator
from backtester.tests.helpers import make_dip_bounce, make_multi_demo


class JsonEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, Enum):
            return obj.value
        return super().default(obj)


def candles_to_dict(candles: list[Candle]) -> list[dict]:
    return [
        {
            "time": int(c.open_time.timestamp()),
            "open": float(c.open),
            "high": float(c.high),
            "low": float(c.low),
            "close": float(c.close),
        }
        for c in candles
    ]


def trades_to_list(trades) -> list[dict]:
    sorted_trades = sorted(trades, key=lambda t: t.opened_at)
    return [
        {
            "symbol": t.symbol,
            "opened_at": t.opened_at.isoformat(),
            "closed_at": t.closed_at.isoformat() if t.closed_at else None,
            "status": t.status.value,
            "close_reason": t.close_reason.value if t.close_reason else None,
            "entry_pct": float(t.entry_pct_of_deposit),
            "leverage": float(t.leverage),
            "avg_count": t.avg_count,
            "avg_price": float(t.avg_price),
            "entry_price": float(t.entries[0].price) if t.entries else float(t.avg_price),
            "entry_liq_price": float(t.entries[0].liq_price_after) if t.entries else float(t.liq_price),
            "final_liq_price": float(t.liq_price),
            "avg_entry_prices": [float(e.price) for e in t.entries[1:]],
            "total_margin": float(t.total_margin),
            "total_notional": float(t.total_margin * t.leverage),
            "exit_price": float(t.close_price) if t.close_price is not None else None,
            "mark_price": float(t.mark_price) if t.mark_price is not None else None,
            "target_exit_price": (
                float(t.target_exit_price) if t.target_exit_price is not None else None
            ),
            "is_open": t.status.value == "open",
            "liq_price": float(t.liq_price),
            "pnl_usd": float(t.pnl_usd),
            "pnl_pct": float(t.pnl_pct),
            "net_pnl_usd": float(t.pnl_usd - t.fees_paid - t.funding_paid),
            "fees_paid": float(t.fees_paid),
            "funding_paid": float(t.funding_paid),
            "mmr_pct": float(t.mmr_pct) if t.mmr_pct is not None else None,
            "maintenance_margin_usd": (
                float(t.maintenance_margin_usd)
                if t.maintenance_margin_usd is not None
                else None
            ),
            "bank_at_open": float(t.bank_at_open),
            "bank_at_close": float(t.bank_at_close),
            "entries": [
                {
                    "time": e.time.isoformat(),
                    "price": float(e.price),
                    "margin_usd": float(e.margin_usd),
                    "notional_usd": float(e.margin_usd * t.leverage),
                    "qty": float(e.qty),
                    "pct_of_deposit": float(e.pct_of_deposit),
                    "liq_price": float(e.liq_price_after),
                }
                for e in t.entries
            ],
        }
        for t in sorted_trades
    ]


def snap_to_tf_open(ts: datetime, tf_candles: list[Candle], timeframe: str) -> int | None:
    """Map a trade timestamp to the chart candle open time (unix seconds)."""
    from backtester.data.resample import bar_close_time

    for bar in tf_candles:
        if bar.open_time <= ts <= bar_close_time(bar, timeframe):
            return int(bar.open_time.timestamp())
    if not tf_candles:
        return None
    closest = min(
        tf_candles,
        key=lambda b: abs((b.open_time - ts).total_seconds()),
    )
    return int(closest.open_time.timestamp())


def build_markers(trades, tf_candles: list[Candle] | None = None, timeframe: str = "1m") -> list[dict]:
    markers = []
    for trade in trades:
        open_time = (
            snap_to_tf_open(trade.opened_at, tf_candles, timeframe)
            if tf_candles
            else int(trade.opened_at.timestamp())
        )
        if open_time is None:
            continue
        markers.append({
            "time": open_time,
            "position": "belowBar",
            "color": "#22c55e",
            "shape": "arrowUp",
            "text": f"BUY {trade.symbol[:3]}",
        })
        if trade.closed_at:
            close_time = (
                snap_to_tf_open(trade.closed_at, tf_candles, timeframe)
                if tf_candles
                else int(trade.closed_at.timestamp())
            )
            if close_time is not None:
                color = "#ef4444" if trade.status.value == "liquidated" else "#3b82f6"
                text = "LIQ" if trade.status.value == "liquidated" else (
                    "END" if trade.close_reason and trade.close_reason.value == "end_of_period"
                    else "CLOSE"
                )
                markers.append({
                    "time": close_time,
                    "position": "aboveBar",
                    "color": color,
                    "shape": "arrowDown",
                    "text": text,
                })
        for entry in trade.entries[1:]:
            avg_time = (
                snap_to_tf_open(entry.time, tf_candles, timeframe)
                if tf_candles
                else int(entry.time.timestamp())
            )
            if avg_time is not None:
                markers.append({
                    "time": avg_time,
                    "position": "belowBar",
                    "color": "#eab308",
                    "shape": "circle",
                    "text": "AVG",
                })
    return markers


def _trade_summary(trades) -> dict:
    from backtester.core.types import TradeStatus

    open_list = [t for t in trades if t.status == TradeStatus.OPEN]
    closed_list = [t for t in trades if t.status == TradeStatus.CLOSED]
    open_trades = len(open_list)
    closed_trades = len(trades) - open_trades
    closed_net_pnl = sum(
        t.pnl_usd - t.fees_paid - t.funding_paid for t in closed_list
    )
    open_unrealized_pnl = sum(t.pnl_usd for t in open_list)
    open_net_pnl = sum(
        t.pnl_usd - t.fees_paid - t.funding_paid for t in open_list
    )
    last_open = None
    if open_list:
        last = max(open_list, key=lambda t: t.opened_at)
        net = last.pnl_usd - last.fees_paid - last.funding_paid
        last_open = {
            "symbol": last.symbol,
            "opened_at": last.opened_at.isoformat(),
            "mark_price": float(last.mark_price) if last.mark_price is not None else None,
            "avg_price": float(last.avg_price),
            "target_exit_price": (
                float(last.target_exit_price) if last.target_exit_price is not None else None
            ),
            "unrealized_pnl_usd": float(last.pnl_usd),
            "net_pnl_usd": float(net),
            "fees_paid": float(last.fees_paid),
            "funding_paid": float(last.funding_paid),
            "margin_usd": float(last.total_margin),
            "avg_count": last.avg_count,
        }
    return {
        "open_trades": open_trades,
        "closed_trades": closed_trades,
        "excludes_open_trade": open_trades > 0,
        "last_open_trade": last_open,
        "closed_net_pnl_usd": float(closed_net_pnl),
        "open_unrealized_pnl_usd": float(open_unrealized_pnl),
        "open_net_pnl_usd": float(open_net_pnl),
    }


def single_result_to_dict(
    result: SimulationResult,
    candles_1m: list[Candle],
) -> dict:
    candles_dict = candles_to_dict(candles_1m)
    trade_meta = _trade_summary(result.trades)
    return {
        "mode": "single",
        "summary": {
            "symbol": result.symbol,
            "symbols": [result.symbol],
            "initial_deposit": float(result.initial_deposit),
            "final_balance": float(result.final_balance),
            "final_pnl_pct": float(result.final_pnl_pct),
            "realized_balance": float(result.realized_balance),
            "realized_pnl_pct": float(result.realized_pnl_pct),
            "closed_net_pnl_usd": trade_meta["closed_net_pnl_usd"],
            "open_unrealized_pnl_usd": trade_meta["open_unrealized_pnl_usd"],
            "open_net_pnl_usd": trade_meta["open_net_pnl_usd"],
            "total_trades": result.total_trades,
            "winning_trades": result.winning_trades,
            "open_trades": trade_meta["open_trades"],
            "closed_trades": trade_meta["closed_trades"],
            "excludes_open_trade": trade_meta["excludes_open_trade"],
            "last_open_trade": trade_meta["last_open_trade"],
            "liquidated": result.liquidated,
            "liquidated_at": result.liquidated_at.isoformat() if result.liquidated_at else None,
            "liquidated_symbol": getattr(result, "liquidated_symbol", None),
            "excluded_symbols": [],
        },
        "candles": candles_dict,
        "candles_by_symbol": {result.symbol: candles_dict},
        "candles_1m_by_symbol": {result.symbol: candles_dict},
        "pnl_curve": [
            {"time": int(s.time.timestamp()), "balance": float(s.balance), "pnl_pct": float(s.pnl_pct)}
            for s in result.pnl_curve
        ],
        "trades": trades_to_list(result.trades),
        "trades_by_symbol": {result.symbol: trades_to_list(result.trades)},
        "markers": build_markers(result.trades, candles_1m, "1m"),
    }


def portfolio_result_to_dict(result: PortfolioSimulationResult) -> dict:
    primary = result.symbols[0] if result.symbols else "PORTFOLIO"
    primary_1m = result.candles_by_symbol.get(primary, [])
    candles_1m_by_symbol = {
        sym: candles_to_dict(c) for sym, c in result.candles_by_symbol.items()
    }
    trade_meta = _trade_summary(result.trades)

    return {
        "mode": "multi",
        "summary": {
            "symbol": result.symbol,
            "symbols": result.symbols,
            "initial_deposit": float(result.initial_deposit),
            "final_balance": float(result.final_balance),
            "final_pnl_pct": float(result.final_pnl_pct),
            "realized_balance": float(result.realized_balance),
            "realized_pnl_pct": float(result.realized_pnl_pct),
            "closed_net_pnl_usd": trade_meta["closed_net_pnl_usd"],
            "open_unrealized_pnl_usd": trade_meta["open_unrealized_pnl_usd"],
            "open_net_pnl_usd": trade_meta["open_net_pnl_usd"],
            "total_trades": result.total_trades,
            "winning_trades": result.winning_trades,
            "open_trades": trade_meta["open_trades"],
            "closed_trades": trade_meta["closed_trades"],
            "excludes_open_trade": trade_meta["excludes_open_trade"],
            "last_open_trade": trade_meta["last_open_trade"],
            "liquidated": result.liquidated,
            "liquidated_at": result.liquidated_at.isoformat() if result.liquidated_at else None,
            "liquidated_symbol": result.liquidated_symbol,
            "excluded_symbols": result.excluded_symbols,
        },
        "candles": candles_1m_by_symbol.get(primary, []),
        "candles_by_symbol": candles_1m_by_symbol,
        "candles_1m_by_symbol": candles_1m_by_symbol,
        "pnl_curve": [
            {"time": int(s.time.timestamp()), "balance": float(s.balance), "pnl_pct": float(s.pnl_pct)}
            for s in result.pnl_curve
        ],
        "trades": trades_to_list(result.trades),
        "trades_by_symbol": {
            sym: trades_to_list(ts) for sym, ts in result.trades_by_symbol.items()
        },
        "markers": build_markers(
            [t for ts in result.trades_by_symbol.values() for t in ts if t.symbol == primary],
            primary_1m,
            "1m",
        ),
    }


def build_strategy_fields(data: dict) -> dict:
    levels: list[AverageLevel] = []
    entry_pct = Decimal(str(data.get("entry_pct", 10)))
    if data.get("averaging_enabled"):
        total_prices = int(data.get("entry_prices_total", 3))
        extra_legs = max(0, min(total_prices - 1, 3))
        raw_drops = data.get("averaging_drops") or []
        raw_margins = data.get("averaging_margins") or []
        for i in range(extra_legs):
            drop = raw_drops[i] if i < len(raw_drops) else DEFAULT_AVERAGING_DROPS[i]
            margin_pct = (
                raw_margins[i] if i < len(raw_margins) else entry_pct
            )
            levels.append(
                AverageLevel(
                    Decimal(str(drop)),
                    Decimal(str(margin_pct)),
                )
            )
    return {
        "initial_deposit": Decimal(str(data.get("deposit", 1000))),
        "entry_pct_of_deposit": Decimal(str(data.get("entry_pct", 10))),
        "leverage": Decimal(str(data.get("leverage", 5))),
        "drop_pct": Decimal(str(data.get("drop_pct", 3))),
        "entry_timeframe": "1m",
        "drop_window_minutes": int(data.get("window", 10)),
        "take_profit_pct": Decimal(str(data.get("tp", 2))),
        "stop_loss_pct": Decimal(str(data["sl"])) if data.get("sl") else None,
        "trailing_enabled": bool(data.get("trailing", False)),
        "trailing_activation_pct": Decimal(str(data.get("trailing_activation", 2))),
        "trailing_callback_pct": Decimal(str(data.get("trailing_callback", 2))),
        "averaging_levels": levels,
        "fee_rate": Decimal(str(data.get("fee_rate", "0.0005"))),
        "funding_rate_8h": Decimal(str(data.get("funding_rate", "0.0001"))),
        "use_real_funding": bool(
            data.get("use_real_funding", data.get("data_source", "db") == "db")
        ),
        "max_open_trades": (
            int(data["max_open_trades"]) if data.get("max_open_trades") else None
        ),
        "entry_pct_split_enabled": bool(data.get("entry_pct_split", False)),
        "entry_pct_regular": Decimal(
            str(
                data.get(
                    "entry_pct_regular",
                    data.get("entry_pct_major", data.get("entry_pct", 10)),
                )
            )
        ),
        "entry_pct_meme": Decimal(
            str(data.get("entry_pct_meme", data.get("entry_pct_alt", 5)))
        ),
        "meme_symbols": data.get("meme_symbols")
        or sorted(DEFAULT_MEME_SYMBOLS),
    }


def _optimization_output(opt) -> dict:
    return {
        "best_params": opt.best_params,
        "best_realized_balance": opt.best_realized_balance,
        "best_final_balance": opt.best_final_balance,
        "trials": opt.trials,
        "stage1_trials": opt.stage1_trials,
        "stage2_trials": opt.stage2_trials,
        "two_stage": opt.two_stage,
        "estimated_trials": opt.estimated_trials,
        "estimated_seconds": opt.estimated_seconds,
        "elapsed_seconds": opt.elapsed_seconds,
        "comparison": opt.comparison,
    }


def _run_automatic_search(
    data: dict,
    fields: dict,
    symbols: list[str],
    excluded: list[str],
    candles_map: dict,
    funding_map: dict,
    *,
    multi: bool,
    max_trials: int,
):
    from backtester.optimizers.grid_config import GridConfig
    from backtester.optimizers.grid_search import run_grid_search

    return run_grid_search(
        {k: v for k, v in fields.items() if k != "use_real_funding"},
        symbols,
        excluded,
        candles_map,
        funding_map,
        multi=multi,
        averaging_enabled=bool(data.get("averaging_enabled")),
        entry_prices_total=int(data.get("entry_prices_total", 3)),
        max_trials=max_trials,
        grids=GridConfig.from_payload(data.get("auto_grids")),
        two_stage=bool(data.get("auto_two_stage", True)),
    )


def main():
    data = json.load(sys.stdin)
    automatic = bool(data.get("automatic", False))
    fields = build_strategy_fields(data)
    symbols = data.get("symbols", [data.get("symbol", "BTCUSDT")])
    excluded = data.get("excluded_symbols", [])
    data_source = data.get("data_source", "db")
    start_date = data.get("start_date")
    end_date = data.get("end_date")
    use_real_funding = fields.pop("use_real_funding", True)
    if data.get("max_trials") or data.get("auto_trials"):
        max_trials = int(data.get("max_trials") or data.get("auto_trials"))
    else:
        from backtester.optimizers.grid_search import count_grid_trials

        info = count_grid_trials(
            fields,
            averaging_enabled=bool(data.get("averaging_enabled")),
            entry_prices_total=int(data.get("entry_prices_total", 3)),
            max_trials=10**9,
        )
        max_trials = max(1, int(info["total_combos"] * 0.1))

    if len(symbols) > 1 or data.get("mode") == "multi":
        fields["use_real_funding"] = use_real_funding
        params = PortfolioParams(symbols=symbols, excluded_symbols=excluded, **fields)
        params.validate()
        if data_source == "db":
            candles_map = load_candles_map_from_db(
                params.active_symbols, start_date, end_date
            )
            missing = [s for s, c in candles_map.items() if not c]
            if missing:
                print(
                    json.dumps(
                        {
                            "error": (
                                f"Нет свечей в БД для: {', '.join(missing)}. "
                                "Запустите: bash services/market-data/run.sh backfill 3"
                            )
                        },
                        cls=JsonEncoder,
                    )
                )
                return
            funding_map = (
                load_funding_map(
                    params.active_symbols, start_date, end_date, use_real=use_real_funding
                )
                if use_real_funding
                else {}
            )
        else:
            candles_map = make_multi_demo(params.active_symbols)
            funding_map = {}

        if automatic:
            opt = _run_automatic_search(
                data,
                fields,
                symbols,
                excluded,
                candles_map,
                funding_map,
                multi=True,
                max_trials=max_trials,
            )
            fields.update(
                {
                    "drop_pct": Decimal(str(opt.best_params["drop_pct"])),
                    "take_profit_pct": Decimal(str(opt.best_params["tp"])),
                    "trailing_enabled": opt.best_params["trailing"],
                    "trailing_activation_pct": Decimal(
                        str(opt.best_params["trailing_activation"])
                    ),
                    "trailing_callback_pct": Decimal(
                        str(opt.best_params["trailing_callback"])
                    ),
                }
            )
            if opt.best_params.get("averaging_drops"):
                fields["averaging_levels"] = [
                    AverageLevel(
                        Decimal(str(d)),
                        Decimal(str(m)),
                    )
                    for d, m in zip(
                        opt.best_params["averaging_drops"],
                        opt.best_params["averaging_margins"],
                    )
                ]
            else:
                fields["averaging_levels"] = []
            excluded = opt.best_params.get("excluded_symbols", excluded)
            params = PortfolioParams(
                symbols=symbols, excluded_symbols=excluded, **fields
            )
            params.validate()
            result = MultiCoinSimulator(params).run(candles_map, funding_map)
            output = portfolio_result_to_dict(result)
            output["optimization"] = _optimization_output(opt)
        else:
            result = MultiCoinSimulator(params).run(candles_map, funding_map)
            output = portfolio_result_to_dict(result)
    else:
        symbol = symbols[0]
        fields["use_real_funding"] = use_real_funding
        params = StrategyParams(symbol=symbol, **fields)
        params.validate()
        if data_source == "db":
            candles = load_candles_from_db(symbol, start_date, end_date)
            if not candles:
                print(
                    json.dumps(
                        {
                            "error": (
                                f"Нет свечей в БД для {symbol}. "
                                "Запустите: bash services/market-data/run.sh backfill 3"
                            )
                        },
                        cls=JsonEncoder,
                    )
                )
                return
            funding_map = (
                load_funding_map([symbol], start_date, end_date, use_real=use_real_funding)
                if use_real_funding
                else {}
            )
            funding_schedule = funding_map.get(symbol)
        else:
            candles = make_dip_bounce(
                dip_pct=float(data.get("demo_dip", 5)),
                bounce_pct=float(data.get("demo_bounce", 3)),
            )
            funding_schedule = None

        if automatic:
            opt = _run_automatic_search(
                data,
                fields,
                [symbol],
                excluded,
                {symbol: candles},
                {symbol: funding_schedule or []},
                multi=False,
                max_trials=max_trials,
            )
            fields.update(
                {
                    "drop_pct": Decimal(str(opt.best_params["drop_pct"])),
                    "take_profit_pct": Decimal(str(opt.best_params["tp"])),
                    "trailing_enabled": opt.best_params["trailing"],
                    "trailing_activation_pct": Decimal(
                        str(opt.best_params["trailing_activation"])
                    ),
                    "trailing_callback_pct": Decimal(
                        str(opt.best_params["trailing_callback"])
                    ),
                }
            )
            if opt.best_params.get("averaging_drops"):
                fields["averaging_levels"] = [
                    AverageLevel(
                        Decimal(str(d)),
                        Decimal(str(m)),
                    )
                    for d, m in zip(
                        opt.best_params["averaging_drops"],
                        opt.best_params["averaging_margins"],
                    )
                ]
            else:
                fields["averaging_levels"] = []
            params = StrategyParams(symbol=symbol, **fields)
            params.validate()
            result = SingleCoinSimulator(params).run(candles, funding_schedule)
            output = single_result_to_dict(result, candles)
            output["optimization"] = _optimization_output(opt)
        else:
            result = SingleCoinSimulator(params).run(candles, funding_schedule)
            output = single_result_to_dict(result, candles)

    output["meta"] = {
        "data_source": data_source,
        "start_date": start_date,
        "end_date": end_date,
        "fee_rate": float(fields.get("fee_rate", Decimal("0.0005"))),
        "use_real_funding": use_real_funding,
    }
    print(json.dumps(output, cls=JsonEncoder))


if __name__ == "__main__":
    main()
