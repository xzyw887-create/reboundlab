from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Optional

from backtester.core.coin_categories import DEFAULT_MEME_SYMBOLS, is_meme_symbol


@dataclass
class AverageLevel:
    """When to add the next entry leg and how much margin (% of bank) to use."""

    drop_pct: Decimal
    margin_pct_of_deposit: Decimal


@dataclass
class StrategyParams:
    """Validated strategy input parameters."""

    symbol: str
    initial_deposit: Decimal
    entry_pct_of_deposit: Decimal
    leverage: Decimal

    # Entry: drop on closed candles of entry_timeframe
    drop_pct: Decimal
    take_profit_pct: Decimal
    stop_loss_pct: Optional[Decimal] = None

    entry_timeframe: str = "1m"
    drop_window_minutes: int = 10  # legacy

    # Exit (trailing)
    trailing_enabled: bool = False
    trailing_activation_pct: Decimal = Decimal("2")
    trailing_callback_pct: Decimal = Decimal("2")

    # Averaging: up to 3 extra legs (2–4 total entry prices), margin % per leg
    averaging_levels: list[AverageLevel] = field(default_factory=list)

    # Portfolio limits (multi-coin)
    max_open_trades: Optional[int] = None

    # Per-symbol entry sizing: regular vs meme coins
    entry_pct_split_enabled: bool = False
    entry_pct_regular: Decimal = Decimal("10")
    entry_pct_meme: Decimal = Decimal("5")
    meme_symbols: list[str] = field(
        default_factory=lambda: sorted(DEFAULT_MEME_SYMBOLS)
    )

    # Costs — Binance USDT-M standard taker ~0.05% per side (open + close)
    fee_rate: Decimal = Decimal("0.0005")
    funding_rate_8h: Decimal = Decimal("0.0001")
    maintenance_margin_rate: Decimal | None = None  # None = tiered MMR by notional
    use_real_funding: bool = True

    def entry_pct_for_symbol(self, symbol: str) -> Decimal:
        if not self.entry_pct_split_enabled:
            return self.entry_pct_of_deposit
        if is_meme_symbol(symbol, set(self.meme_symbols)):
            return self.entry_pct_meme
        return self.entry_pct_regular

    def margin_pct_for_symbol(
        self, symbol: str, leg_margin_pct: Decimal
    ) -> Decimal:
        if not self.entry_pct_split_enabled:
            return leg_margin_pct
        base = self.entry_pct_of_deposit
        if base <= 0:
            return leg_margin_pct
        return leg_margin_pct * (self.entry_pct_for_symbol(symbol) / base)

    def validate(self) -> None:
        if self.initial_deposit <= 0:
            raise ValueError("initial_deposit must be positive")
        if not (Decimal("0") < self.entry_pct_of_deposit <= Decimal("100")):
            raise ValueError("entry_pct_of_deposit must be 0-100")
        if self.leverage < 1:
            raise ValueError("leverage must be >= 1")
        if self.drop_pct <= 0:
            raise ValueError("drop_pct must be positive")
        if self.take_profit_pct <= 0:
            raise ValueError("take_profit_pct must be positive")
        if len(self.averaging_levels) > 3:
            raise ValueError("max 3 averaging legs (4 entry prices total)")


@dataclass
class PortfolioParams:
    """Multi-coin strategy parameters (shared deposit, cross margin)."""

    symbols: list[str]
    initial_deposit: Decimal
    entry_pct_of_deposit: Decimal
    leverage: Decimal
    drop_pct: Decimal
    take_profit_pct: Decimal
    stop_loss_pct: Optional[Decimal] = None
    entry_timeframe: str = "1m"
    drop_window_minutes: int = 10
    trailing_enabled: bool = False
    trailing_activation_pct: Decimal = Decimal("2")
    trailing_callback_pct: Decimal = Decimal("2")
    averaging_levels: list[AverageLevel] = field(default_factory=list)
    fee_rate: Decimal = Decimal("0.0005")
    funding_rate_8h: Decimal = Decimal("0.0001")
    maintenance_margin_rate: Decimal | None = None
    use_real_funding: bool = True
    excluded_symbols: list[str] = field(default_factory=list)
    max_open_trades: Optional[int] = None
    entry_pct_split_enabled: bool = False
    entry_pct_regular: Decimal = Decimal("10")
    entry_pct_meme: Decimal = Decimal("5")
    meme_symbols: list[str] = field(
        default_factory=lambda: sorted(DEFAULT_MEME_SYMBOLS)
    )

    def entry_pct_for_symbol(self, symbol: str) -> Decimal:
        if not self.entry_pct_split_enabled:
            return self.entry_pct_of_deposit
        if is_meme_symbol(symbol, set(self.meme_symbols)):
            return self.entry_pct_meme
        return self.entry_pct_regular

    def margin_pct_for_symbol(
        self, symbol: str, leg_margin_pct: Decimal
    ) -> Decimal:
        if not self.entry_pct_split_enabled:
            return leg_margin_pct
        base = self.entry_pct_of_deposit
        if base <= 0:
            return leg_margin_pct
        return leg_margin_pct * (self.entry_pct_for_symbol(symbol) / base)

    def validate(self) -> None:
        active = self.active_symbols
        if not active:
            raise ValueError("at least one symbol required")
        if len(active) > 50:
            raise ValueError("max 50 symbols")
        if self.initial_deposit <= 0:
            raise ValueError("initial_deposit must be positive")
        if not (Decimal("0") < self.entry_pct_of_deposit <= Decimal("100")):
            raise ValueError("entry_pct_of_deposit must be 0-100")
        if self.leverage < 1:
            raise ValueError("leverage must be >= 1")
        if self.max_open_trades is not None and self.max_open_trades < 1:
            raise ValueError("max_open_trades must be >= 1 or None")

    @property
    def active_symbols(self) -> list[str]:
        excluded = set(self.excluded_symbols)
        return [s for s in self.symbols if s not in excluded]

    def to_single(self, symbol: str) -> StrategyParams:
        return StrategyParams(
            symbol=symbol,
            initial_deposit=self.initial_deposit,
            entry_pct_of_deposit=self.entry_pct_of_deposit,
            leverage=self.leverage,
            drop_pct=self.drop_pct,
            entry_timeframe=self.entry_timeframe,
            drop_window_minutes=self.drop_window_minutes,
            take_profit_pct=self.take_profit_pct,
            stop_loss_pct=self.stop_loss_pct,
            trailing_enabled=self.trailing_enabled,
            trailing_activation_pct=self.trailing_activation_pct,
            trailing_callback_pct=self.trailing_callback_pct,
            averaging_levels=self.averaging_levels,
            fee_rate=self.fee_rate,
            funding_rate_8h=self.funding_rate_8h,
            maintenance_margin_rate=self.maintenance_margin_rate,
            use_real_funding=self.use_real_funding,
            max_open_trades=self.max_open_trades,
            entry_pct_split_enabled=self.entry_pct_split_enabled,
            entry_pct_regular=self.entry_pct_regular,
            entry_pct_meme=self.entry_pct_meme,
            meme_symbols=list(self.meme_symbols),
        )


# Default drop % for each extra entry leg (2 total prices = 1 level, etc.)
DEFAULT_AVERAGING_DROPS = [Decimal("5"), Decimal("10"), Decimal("15")]
