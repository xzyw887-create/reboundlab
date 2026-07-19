"""Maintenance margin rate (MMR) tiers — Binance USDT-M starter brackets."""
from __future__ import annotations

from decimal import Decimal

# Notional USD ceiling → MMR (fraction). Starter account, first brackets.
MMR_BRACKETS: list[tuple[Decimal, Decimal]] = [
    (Decimal("50000"), Decimal("0.004")),      # 0.40%
    (Decimal("250000"), Decimal("0.005")),     # 0.50%
    (Decimal("1000000"), Decimal("0.01")),     # 1.00%
    (Decimal("5000000"), Decimal("0.025")),    # 2.50%
    (Decimal("20000000"), Decimal("0.05")),    # 5.00%
    (Decimal("50000000"), Decimal("0.10")),    # 10.00%
    (Decimal("100000000"), Decimal("0.125")),  # 12.50%
    (Decimal("200000000"), Decimal("0.15")),   # 15.00%
]


def mmr_for_notional(notional_usd: Decimal) -> Decimal:
    """MMR by position notional — Binance USDT-M tier 1 brackets."""
    if notional_usd <= 0:
        return MMR_BRACKETS[0][1]
    for cap, rate in MMR_BRACKETS:
        if notional_usd <= cap:
            return rate
    return MMR_BRACKETS[-1][1]


def maintenance_margin_usd(qty: Decimal, mark_price: Decimal) -> Decimal:
    notional = qty * mark_price
    return notional * mmr_for_notional(notional)
