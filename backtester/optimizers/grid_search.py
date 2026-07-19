"""M18 — Grid search optimizer for Automatic mode."""
from __future__ import annotations

import copy
import time
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from backtester.core.params import AverageLevel, PortfolioParams, StrategyParams
from backtester.core.types import Candle, PortfolioSimulationResult, SimulationResult
from backtester.optimizers.grid_config import (
    GridConfig,
    build_grid_combos,
    count_grid_total,
    refine_tp_values,
)
from backtester.simulators.multi_coin import MultiCoinSimulator
from backtester.simulators.single_coin import SingleCoinSimulator

DEFAULT_MAX_TRIALS = 200
SECONDS_PER_TRIAL_BASE = 1.35
STAGE2_TRIAL_ESTIMATE = 6


@dataclass
class OptimizationResult:
    best_params: dict[str, Any]
    best_score: float
    best_realized_balance: float
    best_final_balance: float
    excluded_symbols: list[str]
    liquidated: bool
    trials: int
    stage1_trials: int
    stage2_trials: int
    two_stage: bool
    estimated_trials: int
    estimated_seconds: float
    elapsed_seconds: float
    comparison: list[dict[str, Any]]


def _score(result: SimulationResult | PortfolioSimulationResult) -> float:
    if result.liquidated:
        return -1e9
    return float(result.realized_balance)


def _levels_to_params(levels: list[AverageLevel] | None) -> dict[str, Any]:
    if not levels:
        return {
            "averaging_drops": [],
            "averaging_margins": [],
            "entry_prices_total": 1,
        }
    return {
        "averaging_drops": [float(l.drop_pct) for l in levels],
        "averaging_margins": [float(l.margin_pct_of_deposit) for l in levels],
        "entry_prices_total": len(levels) + 1,
    }


def _run_trial(
    fields: dict,
    symbols: list[str],
    excluded: list[str],
    candles_map: dict[str, list[Candle]],
    funding_map: dict[str, list],
    multi: bool,
) -> SimulationResult | PortfolioSimulationResult:
    if multi:
        params = PortfolioParams(symbols=symbols, excluded_symbols=excluded, **fields)
        params.validate()
        return MultiCoinSimulator(params).run(candles_map, funding_map)
    symbol = symbols[0]
    params = StrategyParams(symbol=symbol, **fields)
    params.validate()
    schedule = funding_map.get(symbol)
    return SingleCoinSimulator(params).run(candles_map[symbol], schedule)


def _combo_to_fields(base_fields: dict, combo: dict[str, Any]) -> dict:
    fields = copy.deepcopy(base_fields)
    fields["drop_pct"] = Decimal(str(combo["drop"]))
    fields["take_profit_pct"] = Decimal(str(combo["tp"]))
    fields["trailing_enabled"] = combo["trail"]
    fields["trailing_activation_pct"] = Decimal(str(combo["act"]))
    cb = combo["cb"]
    fields["trailing_callback_pct"] = (
        cb if isinstance(cb, Decimal) else Decimal(str(cb))
    )
    if combo.get("averaging_levels") is not None:
        fields["averaging_levels"] = copy.deepcopy(combo["averaging_levels"])
    else:
        fields["averaging_levels"] = []
    return fields


def _comparison_row(
    combo: dict[str, Any],
    result: SimulationResult | PortfolioSimulationResult,
    sc: float,
    *,
    stage: str | None = None,
) -> dict[str, Any]:
    avg_meta = _levels_to_params(combo.get("averaging_levels"))
    row: dict[str, Any] = {
        "drop_pct": combo["drop"],
        "tp": combo["tp"],
        "trailing": combo["trail"],
        "score": sc,
        "realized_balance": float(result.realized_balance),
        "final_balance": float(result.final_balance),
        "liquidated": result.liquidated,
        "total_trades": result.total_trades,
        **avg_meta,
    }
    if stage:
        row["stage"] = stage
    if combo["trail"]:
        row["trailing_activation"] = float(combo["act"])
        row["trailing_callback"] = float(combo["cb"])
    return row


def estimate_grid_seconds(
    trials: int,
    *,
    symbol_count: int = 1,
    day_count: int = 30,
    two_stage: bool = False,
) -> float:
    load_overhead = 8 + symbol_count * 2.5 + day_count / 45
    per_trial = SECONDS_PER_TRIAL_BASE * (
        1 + symbol_count * 0.45 + day_count / 100 + (0.35 if symbol_count > 1 else 0)
    )
    extra = STAGE2_TRIAL_ESTIMATE if two_stage else 0
    return load_overhead + (trials + extra) * per_trial


def count_grid_trials(
    base_fields: dict,
    *,
    averaging_enabled: bool,
    entry_prices_total: int,
    max_trials: int = DEFAULT_MAX_TRIALS,
    grids: GridConfig | None = None,
    two_stage: bool = False,
) -> dict[str, float | int | bool]:
    _, total = build_grid_combos(
        base_fields,
        averaging_enabled=averaging_enabled,
        extra_legs=max(0, min(entry_prices_total - 1, 3)) if averaging_enabled else 0,
        max_trials=max_trials,
        grids=grids,
    )
    actual = min(total, max_trials)
    stage2 = refine_tp_values(5.0)  # typical refine count
    return {
        "total_combos": total,
        "trials": actual,
        "capped": total > max_trials,
        "stage2_trials_est": len(stage2) if two_stage else 0,
    }


def _run_search_loop(
    combos: list[dict[str, Any]],
    base_fields: dict,
    symbols: list[str],
    excluded: list[str],
    candles_map: dict[str, list[Candle]],
    funding_map: dict[str, list],
    multi: bool,
    *,
    stage_label: str | None = None,
) -> tuple[dict | None, SimulationResult | PortfolioSimulationResult | None, float, list[str], list[dict], int]:
    best_score = -1e18
    best_fields: dict | None = None
    best_result: SimulationResult | PortfolioSimulationResult | None = None
    best_excluded = list(excluded)
    comparison: list[dict[str, Any]] = []
    trials = 0

    for combo in combos:
        fields = _combo_to_fields(base_fields, combo)
        result = _run_trial(
            fields, symbols, best_excluded, candles_map, funding_map, multi
        )
        trials += 1
        sc = _score(result)
        comparison.append(_comparison_row(combo, result, sc, stage=stage_label))
        if sc > best_score:
            best_score = sc
            best_fields = fields
            best_result = result

    if (
        best_result
        and best_result.liquidated
        and multi
        and len(symbols) > 1
        and getattr(best_result, "liquidated_symbol", None)
    ):
        liq_sym = best_result.liquidated_symbol
        if liq_sym and liq_sym not in best_excluded:
            new_excluded = best_excluded + [liq_sym]
            result = _run_trial(
                best_fields or base_fields,
                symbols,
                new_excluded,
                candles_map,
                funding_map,
                multi,
            )
            trials += 1
            sc = _score(result)
            comparison.append(
                {
                    "note": f"exclude {liq_sym}",
                    "score": sc,
                    "realized_balance": float(result.realized_balance),
                    "final_balance": float(result.final_balance),
                    "liquidated": result.liquidated,
                    "stage": stage_label,
                }
            )
            if sc > best_score:
                best_score = sc
                best_fields = best_fields or base_fields
                best_result = result
                best_excluded = new_excluded

    return best_fields, best_result, best_score, best_excluded, comparison, trials


def run_grid_search(
    base_fields: dict,
    symbols: list[str],
    excluded: list[str],
    candles_map: dict[str, list[Candle]],
    funding_map: dict[str, list] | None = None,
    *,
    multi: bool = False,
    max_trials: int = DEFAULT_MAX_TRIALS,
    averaging_enabled: bool | None = None,
    entry_prices_total: int | None = None,
    grids: GridConfig | None = None,
    two_stage: bool = True,
) -> OptimizationResult:
    """
    Stage 1: coarse grid (drop, TP, trailing, averaging).
    Stage 2: refine TP ±0.5/1 around stage-1 winner (fixed other params).
    """
    funding_map = funding_map or {}
    started = time.monotonic()
    grids = grids or GridConfig()

    if averaging_enabled is None:
        averaging_enabled = bool(base_fields.get("averaging_levels"))
    extra_legs = (
        max(0, min((entry_prices_total or 3) - 1, 3))
        if averaging_enabled
        else 0
    )

    combos, estimated_trials = build_grid_combos(
        base_fields,
        averaging_enabled=averaging_enabled,
        extra_legs=extra_legs,
        max_trials=max_trials,
        grids=grids,
    )

    day_count = 30
    if candles_map:
        first = next(iter(candles_map.values()))
        if first:
            span = (first[-1].open_time - first[0].open_time).total_seconds() / 86400
            day_count = max(1, int(span))

    refine_count = (
        len(refine_tp_values(5.0)) if two_stage else 0
    )
    estimated_seconds = estimate_grid_seconds(
        len(combos),
        symbol_count=len(symbols),
        day_count=day_count,
        two_stage=two_stage,
    )

    best_fields, best_result, best_score, best_excluded, comparison, stage1_trials = (
        _run_search_loop(
            combos,
            base_fields,
            symbols,
            excluded,
            candles_map,
            funding_map,
            multi,
            stage_label="coarse",
        )
    )

    stage2_trials = 0
    if two_stage and best_fields and best_result and not best_result.liquidated:
        best_tp = float(best_fields["take_profit_pct"])
        refine_tps = refine_tp_values(best_tp)
        if len(refine_tps) > 1:
            refine_combo = {
                "drop": float(best_fields["drop_pct"]),
                "tp": best_tp,
                "trail": best_fields["trailing_enabled"],
                "act": float(best_fields["trailing_activation_pct"]),
                "cb": best_fields["trailing_callback_pct"],
                "averaging_levels": best_fields.get("averaging_levels"),
            }
            refine_combos = [
                {**refine_combo, "tp": tp} for tp in refine_tps
            ]
            r_fields, r_result, r_score, r_excluded, r_comp, r_trials = (
                _run_search_loop(
                    refine_combos,
                    base_fields,
                    symbols,
                    best_excluded,
                    candles_map,
                    funding_map,
                    multi,
                    stage_label="refine",
                )
            )
            stage2_trials = r_trials
            comparison.extend(r_comp)
            if r_fields and r_result and r_score > best_score:
                best_score = r_score
                best_fields = r_fields
                best_result = r_result
                best_excluded = r_excluded

    assert best_fields is not None and best_result is not None
    avg_best = _levels_to_params(best_fields.get("averaging_levels"))

    return OptimizationResult(
        best_params={
            "drop_pct": float(best_fields["drop_pct"]),
            "tp": float(best_fields["take_profit_pct"]),
            "trailing": best_fields["trailing_enabled"],
            "trailing_activation": float(best_fields["trailing_activation_pct"]),
            "trailing_callback": float(best_fields["trailing_callback_pct"]),
            "excluded_symbols": best_excluded,
            **avg_best,
        },
        best_score=best_score,
        best_realized_balance=float(best_result.realized_balance),
        best_final_balance=float(best_result.final_balance),
        excluded_symbols=best_excluded,
        liquidated=best_result.liquidated,
        trials=stage1_trials + stage2_trials,
        stage1_trials=stage1_trials,
        stage2_trials=stage2_trials,
        two_stage=two_stage,
        estimated_trials=estimated_trials,
        estimated_seconds=estimated_seconds,
        elapsed_seconds=time.monotonic() - started,
        comparison=sorted(
            comparison, key=lambda x: x.get("score", -1e18), reverse=True
        )[:12],
    )
