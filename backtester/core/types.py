from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional


class TradeStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"
    LIQUIDATED = "liquidated"


class CloseReason(str, Enum):
    TAKE_PROFIT = "take_profit"
    STOP_LOSS = "stop_loss"
    TRAILING = "trailing"
    LIQUIDATION = "liquidation"
    END_OF_PERIOD = "end_of_period"


@dataclass
class Candle:
    open_time: datetime
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal = Decimal("0")


@dataclass
class AverageEntry:
    time: datetime
    price: Decimal
    margin_usd: Decimal
    qty: Decimal
    pct_of_deposit: Decimal
    liq_price_after: Decimal


@dataclass
class Trade:
    symbol: str
    opened_at: datetime
    closed_at: Optional[datetime]
    entry_pct_of_deposit: Decimal
    leverage: Decimal
    avg_count: int
    entries: list[AverageEntry]
    avg_price: Decimal
    total_qty: Decimal
    total_margin: Decimal
    liq_price: Decimal
    fees_paid: Decimal
    funding_paid: Decimal
    pnl_usd: Decimal
    pnl_pct: Decimal
    bank_at_open: Decimal
    bank_at_close: Decimal
    status: TradeStatus
    close_reason: Optional[CloseReason] = None
    close_price: Optional[Decimal] = None
    mark_price: Optional[Decimal] = None
    """TP (or trailing) price target — set while trade is still open."""
    target_exit_price: Optional[Decimal] = None
    mmr_pct: Optional[Decimal] = None
    maintenance_margin_usd: Optional[Decimal] = None


@dataclass
class PnlSnapshot:
    time: datetime
    balance: Decimal
    pnl_pct: Decimal


@dataclass
class SimulationResult:
    symbol: str
    initial_deposit: Decimal
    final_balance: Decimal
    final_pnl_pct: Decimal
    liquidated: bool
    liquidated_at: Optional[datetime]
    trades: list[Trade]
    pnl_curve: list[PnlSnapshot]
    total_trades: int
    winning_trades: int
    liquidated_trades: int
    liquidated_symbol: Optional[str] = None
    """Full account equity at end (cash + margins + unrealized on open)."""
    realized_balance: Decimal = Decimal("0")
    """Cash + locked margins in open positions, without unrealized PnL."""
    realized_pnl_pct: Decimal = Decimal("0")


@dataclass
class PortfolioSimulationResult(SimulationResult):
    """Multi-coin portfolio result."""

    symbols: list[str] = field(default_factory=list)
    excluded_symbols: list[str] = field(default_factory=list)
    trades_by_symbol: dict[str, list[Trade]] = field(default_factory=dict)
    candles_by_symbol: dict[str, list[Candle]] = field(default_factory=dict)
