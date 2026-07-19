from decimal import Decimal

from backtester.optimizers.grid_config import (
    GridConfig,
    build_grid_combos,
    count_grid_total,
    refine_tp_values,
)
from backtester.optimizers.grid_search import count_grid_trials, estimate_grid_seconds


def test_averaging_expands_combos():
    base = {
        "trailing_enabled": False,
        "entry_pct_of_deposit": Decimal("10"),
    }
    combos, total = build_grid_combos(
        base,
        averaging_enabled=True,
        extra_legs=2,
        max_trials=5000,
    )
    assert total == 4 * 7 * 5 * 3
    assert len(combos) == total


def test_no_averaging_when_disabled():
    base = {"trailing_enabled": False, "entry_pct_of_deposit": Decimal("10")}
    combos, total = build_grid_combos(
        base, averaging_enabled=False, extra_legs=0, max_trials=5000
    )
    assert total == 4 * 7


def test_count_grid_trials_caps():
    base = {"trailing_enabled": True, "entry_pct_of_deposit": Decimal("10")}
    info = count_grid_trials(
        base, averaging_enabled=True, entry_prices_total=4, max_trials=50
    )
    assert info["total_combos"] > 50
    assert info["trials"] == 50
    assert info["capped"] is True


def test_refine_tp_around_winner():
    vals = refine_tp_values(6.0)
    assert 5.0 in vals
    assert 6.0 in vals
    assert 7.0 in vals
    assert 1.0 not in vals


def test_custom_tp_grid_from_payload():
    cfg = GridConfig.from_payload({"tp_grid": [3, 6, 9]})
    assert cfg.tp_grid == [3.0, 6.0, 9.0]
    total = count_grid_total(
        trailing_on=False,
        averaging_enabled=False,
        entry_prices_total=2,
        grids=cfg,
    )
    assert total == 4 * 3


def test_estimate_seconds_positive():
    sec = estimate_grid_seconds(100, symbol_count=3, day_count=60, two_stage=True)
    assert sec > 10
