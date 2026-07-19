from __future__ import annotations

from decimal import Decimal

from backtester.core.mmr import mmr_for_notional


def test_starter_tier_mmr():
    assert mmr_for_notional(Decimal("1000")) == Decimal("0.004")
    assert mmr_for_notional(Decimal("49999")) == Decimal("0.004")


def test_higher_tier_mmr():
    assert mmr_for_notional(Decimal("100000")) == Decimal("0.005")
