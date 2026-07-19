from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal


@dataclass
class TrailingState:
    active: bool = False
    peak_price: Decimal = Decimal("0")
    stop_price: Decimal = Decimal("0")


class TrailingStop:
    """
    Trailing take-profit:
    - Activates when profit >= activation_pct
    - Tracks peak price
    - Closes when price pulls back callback_pct from peak
    """

    def __init__(self, activation_pct: Decimal, callback_pct: Decimal):
        self.activation_pct = activation_pct
        self.callback_pct = callback_pct
        self.state = TrailingState()

    def reset(self) -> None:
        self.state = TrailingState()

    def update(self, avg_entry: Decimal, current_high: Decimal, current_low: Decimal) -> bool:
        """
        Returns True if trailing stop triggered (close position).
        """
        if avg_entry <= 0:
            return False

        profit_pct = ((current_high - avg_entry) / avg_entry) * Decimal("100")

        if not self.state.active:
            if profit_pct >= self.activation_pct:
                self.state.active = True
                self.state.peak_price = current_high
                self.state.stop_price = current_high * (
                    Decimal("1") - self.callback_pct / Decimal("100")
                )
            return False

        if current_high > self.state.peak_price:
            self.state.peak_price = current_high
            self.state.stop_price = current_high * (
                Decimal("1") - self.callback_pct / Decimal("100")
            )

        return current_low <= self.state.stop_price

    @property
    def is_active(self) -> bool:
        return self.state.active
