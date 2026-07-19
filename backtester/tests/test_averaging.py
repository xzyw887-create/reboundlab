from __future__ import annotations

from decimal import Decimal

from backtester.core.params import AverageLevel
from backtester.strategies.averaging import should_average


def test_averaging_drop_from_first_entry_not_average():
    first = Decimal("100")
    level = AverageLevel(Decimal("5"), Decimal("10"))

    assert should_average(Decimal("96"), first, 0, [level]) is None
    assert should_average(Decimal("94"), first, 0, [level]) is not None

    # 94 is 6% below first entry, but only ~3% below a lower average — must use first entry
    assert should_average(Decimal("94"), first, 0, [level]) is not None


def test_averaging_levels_are_sequential():
    levels = [
        AverageLevel(Decimal("5"), Decimal("10")),
        AverageLevel(Decimal("10"), Decimal("10")),
    ]
    first = Decimal("100")

    assert should_average(Decimal("94"), first, 0, levels) is not None
    assert should_average(Decimal("94"), first, 1, levels) is None
    assert should_average(Decimal("89"), first, 1, levels) is not None
