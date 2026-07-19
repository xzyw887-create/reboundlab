"""Tests for entry drop-from-peak strategy."""
from __future__ import annotations

from decimal import Decimal

from backtester.optimizers.grid_config import refine_tp_values


def test_refine_tp_respects_bounds():
    low = refine_tp_values(2.0)
    assert min(low) >= 2.0
    high = refine_tp_values(14.0)
    assert max(high) <= 15.0
