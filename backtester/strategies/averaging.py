from __future__ import annotations

from decimal import Decimal

from backtester.core.params import AverageLevel
from backtester.strategies.entry import price_drop_from_avg


def should_average(
    current_price: Decimal,
    first_entry_price: Decimal,
    levels_used: int,
    averaging_levels: list[AverageLevel],
) -> AverageLevel | None:
    """
    Returns the averaging level to trigger, or None.
    Drop % is always measured from the first entry price (not the running average).
    """
    if levels_used >= len(averaging_levels):
        return None

    level = averaging_levels[levels_used]
    drop = price_drop_from_avg(current_price, first_entry_price)

    if drop >= level.drop_pct:
        return level

    return None
