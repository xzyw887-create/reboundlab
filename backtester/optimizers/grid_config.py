"""Shared search grids and combo builder for Automatic mode."""
from __future__ import annotations

import random
from dataclasses import dataclass, field
from decimal import Decimal
from itertools import product
from typing import Any

from backtester.core.params import AverageLevel

DEFAULT_DROP_GRID = [2, 3, 5, 8]
DEFAULT_TP_GRID = [2, 3, 4, 5, 6, 8, 10]
DEFAULT_TRAIL_ACT_GRID = [3, 5, 8]
DEFAULT_TRAIL_CB_GRID = [Decimal("0.5"), Decimal("1")]

TP_REFINE_OFFSETS = [-1.0, -0.5, 0.0, 0.5, 1.0]
TP_MIN = Decimal("2")
TP_MAX = Decimal("15")

AVG_DROP_PRESETS: dict[int, list[list[int]]] = {
    1: [[3], [5], [8], [10], [15]],
    2: [[5, 10], [5, 15], [8, 15], [10, 15], [3, 10]],
    3: [[5, 10, 15], [3, 8, 15], [5, 10, 20], [8, 12, 18]],
}
AVG_MARGIN_MULTIPLIERS = [Decimal("0.5"), Decimal("1"), Decimal("1.5")]


@dataclass
class GridConfig:
    drop_grid: list[int] = field(default_factory=lambda: list(DEFAULT_DROP_GRID))
    tp_grid: list[float] = field(default_factory=lambda: list(DEFAULT_TP_GRID))
    trail_act_grid: list[int] = field(
        default_factory=lambda: list(DEFAULT_TRAIL_ACT_GRID)
    )
    trail_cb_grid: list[Decimal] = field(
        default_factory=lambda: list(DEFAULT_TRAIL_CB_GRID)
    )

    @classmethod
    def from_payload(cls, data: dict | None) -> GridConfig:
        if not data:
            return cls()
        cfg = cls()
        if data.get("drop_grid"):
            cfg.drop_grid = [int(x) for x in data["drop_grid"]]
        if data.get("tp_grid"):
            cfg.tp_grid = [float(x) for x in data["tp_grid"]]
        if data.get("trail_act_grid"):
            cfg.trail_act_grid = [int(x) for x in data["trail_act_grid"]]
        if data.get("trail_cb_grid"):
            cfg.trail_cb_grid = [Decimal(str(x)) for x in data["trail_cb_grid"]]
        return cfg


def refine_tp_values(best_tp: float) -> list[float]:
    """Stage-2 TP values around the stage-1 winner."""
    out: list[float] = []
    for off in TP_REFINE_OFFSETS:
        v = round(best_tp + off, 1)
        if TP_MIN <= Decimal(str(v)) <= TP_MAX:
            out.append(v)
    return sorted(set(out))


def _averaging_combos(
    base_fields: dict,
    *,
    averaging_enabled: bool,
    extra_legs: int,
) -> list[list[AverageLevel] | None]:
    if not averaging_enabled or extra_legs < 1:
        return [None]

    entry_pct = base_fields.get("entry_pct_of_deposit", Decimal("10"))
    if not isinstance(entry_pct, Decimal):
        entry_pct = Decimal(str(entry_pct))

    presets = AVG_DROP_PRESETS.get(extra_legs, AVG_DROP_PRESETS[1])
    combos: list[list[AverageLevel] | None] = []
    for drops in presets:
        for mult in AVG_MARGIN_MULTIPLIERS:
            levels = [
                AverageLevel(Decimal(str(d)), entry_pct * mult) for d in drops
            ]
            combos.append(levels)
    return combos


def _core_param_combos(trailing_on: bool, grids: GridConfig) -> list[dict[str, Any]]:
    if trailing_on:
        return [
            {
                "drop": drop,
                "tp": tp,
                "trail": True,
                "act": act,
                "cb": cb,
            }
            for drop, tp, act, cb in product(
                grids.drop_grid,
                grids.tp_grid,
                grids.trail_act_grid,
                grids.trail_cb_grid,
            )
        ]
    return [
        {
            "drop": drop,
            "tp": tp,
            "trail": False,
            "act": 2,
            "cb": Decimal("1"),
        }
        for drop, tp in product(grids.drop_grid, grids.tp_grid)
    ]


def build_grid_combos(
    base_fields: dict,
    *,
    averaging_enabled: bool | None = None,
    extra_legs: int | None = None,
    max_trials: int = 10**9,
    grids: GridConfig | None = None,
    tp_grid_override: list[float] | None = None,
) -> tuple[list[dict[str, Any]], int]:
    """Return trial combos and total count before max_trials cap."""
    grids = grids or GridConfig()
    if tp_grid_override is not None:
        grids = GridConfig(
            drop_grid=grids.drop_grid,
            tp_grid=tp_grid_override,
            trail_act_grid=grids.trail_act_grid,
            trail_cb_grid=grids.trail_cb_grid,
        )

    if averaging_enabled is None:
        averaging_enabled = bool(base_fields.get("averaging_levels"))
    if extra_legs is None:
        levels = base_fields.get("averaging_levels") or []
        if averaging_enabled:
            extra_legs = len(levels) if levels else max(
                0, min(int(base_fields.get("entry_prices_total", 3)) - 1, 3)
            )
        else:
            extra_legs = 0

    trailing_on = bool(base_fields.get("trailing_enabled", False))
    core = _core_param_combos(trailing_on, grids)
    avg = _averaging_combos(
        base_fields, averaging_enabled=averaging_enabled, extra_legs=extra_legs
    )

    combos: list[dict[str, Any]] = []
    for c in core:
        for avg_levels in avg:
            combos.append({**c, "averaging_levels": avg_levels})

    total = len(combos)
    if max_trials > 0 and len(combos) > max_trials:
        random.shuffle(combos)
        combos = combos[:max_trials]
    return combos, total


def count_grid_total(
    *,
    trailing_on: bool,
    averaging_enabled: bool,
    entry_prices_total: int,
    grids: GridConfig | None = None,
) -> int:
    grids = grids or GridConfig()
    core = len(_core_param_combos(trailing_on, grids))
    if not averaging_enabled:
        return core
    legs = max(0, min(entry_prices_total - 1, 3))
    if legs < 1:
        return core
    presets = AVG_DROP_PRESETS.get(legs, AVG_DROP_PRESETS[1])
    avg_count = len(presets) * len(AVG_MARGIN_MULTIPLIERS)
    return core * avg_count
