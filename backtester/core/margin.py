from __future__ import annotations

from decimal import Decimal

from backtester.core.mmr import maintenance_margin_usd, mmr_for_notional

# ---------------------------------------------------------------------------
# Position sizing — Binance USDT-M: Notional = Margin × Leverage
# ---------------------------------------------------------------------------


def calc_leg_notional(margin_usd: Decimal, leverage: Decimal) -> Decimal:
    """Position size in USD = margin (залог) × leverage."""
    return margin_usd * leverage


def calc_position_qty(
    margin_usd: Decimal, entry_price: Decimal, leverage: Decimal
) -> Decimal:
    """qty = (margin × leverage) / price."""
    if entry_price <= 0:
        return Decimal("0")
    return calc_leg_notional(margin_usd, leverage) / entry_price


def calc_total_notional(total_margin: Decimal, leverage: Decimal) -> Decimal:
    return total_margin * leverage


def calc_notional_pct_of_bank(entry_pct: Decimal, leverage: Decimal) -> Decimal:
    """Position as % of bank = entry_pct × leverage."""
    return entry_pct * leverage


def calc_fee(notional: Decimal, fee_rate: Decimal) -> Decimal:
    return notional * fee_rate


def calc_entry_margin(
    cash: Decimal,
    equity: Decimal,
    entry_pct: Decimal,
    leverage: Decimal,
    fee_rate: Decimal,
) -> Decimal:
    """
    Margin (залог) = entry_pct of equity.
    Position = margin × leverage. Fee taken from cash.
    """
    if equity <= 0 or cash <= 0 or entry_pct <= 0:
        return Decimal("0")
    desired = equity * (entry_pct / Decimal("100"))
    max_affordable = cash / (Decimal("1") + leverage * fee_rate)
    margin = min(desired, max_affordable)
    return margin if margin > 0 else Decimal("0")


# ---------------------------------------------------------------------------
# PnL
# ---------------------------------------------------------------------------


def calc_unrealized_pnl_long(
    qty: Decimal, avg_entry: Decimal, current_price: Decimal
) -> Decimal:
    return qty * (current_price - avg_entry)


def calc_pnl_pct(pnl_usd: Decimal, notional_usd: Decimal) -> Decimal:
    """PnL % relative to position notional."""
    if notional_usd <= 0:
        return Decimal("0")
    return (pnl_usd / notional_usd) * Decimal("100")


def calc_roe_pct(pnl_usd: Decimal, margin_usd: Decimal) -> Decimal:
    return (pnl_usd / margin_usd) * Decimal("100") if margin_usd > 0 else Decimal("0")


# ---------------------------------------------------------------------------
# Take profit
# ---------------------------------------------------------------------------


def calc_take_profit_price_long(avg_price: Decimal, tp_price_pct: Decimal) -> Decimal:
    return avg_price * (Decimal("1") + tp_price_pct / Decimal("100"))


def calc_take_profit_roe(tp_price_pct: Decimal, leverage: Decimal) -> Decimal:
    return tp_price_pct * leverage


# ---------------------------------------------------------------------------
# Liquidation — Binance Cross Margin (USDⓈ-M)
# https://www.binance.com/en/support/faq/detail/360033525271
#
# Long: LP = (WB − Position×EP) / (Position×(MMR − 1))
# WB = cross wallet balance (весь баланс счёта)
# Liquidation trigger: Margin Ratio = 100% → equity ≤ maintenance margin
# ---------------------------------------------------------------------------


def calc_wallet_balance(cash: Decimal, locked_margin: Decimal) -> Decimal:
    """Cross margin wallet = свободный кэш + залог в позициях."""
    return cash + locked_margin


def calc_position_equity(
    cash: Decimal,
    margin: Decimal,
    qty: Decimal,
    avg_price: Decimal,
    mark_price: Decimal,
) -> Decimal:
    """Equity = WB + unrealized PnL."""
    return cash + margin + calc_unrealized_pnl_long(qty, avg_price, mark_price)


def calc_binance_cross_liq_long(
    wallet_balance: Decimal,
    qty: Decimal,
    entry_price: Decimal,
    maintenance_margin_rate: Decimal,
) -> Decimal:
    """
    Binance cross-margin long liquidation price.
    Returns 0 if price would be ≤ 0 (UI shows «далеко» — как «-» на Binance).
    """
    if qty <= 0 or entry_price <= 0:
        return Decimal("0")
    denom = qty * (maintenance_margin_rate - Decimal("1"))
    if denom == 0:
        return Decimal("0")
    liq = (wallet_balance - qty * entry_price) / denom
    return liq if liq > 0 else Decimal("0")


def calc_bankruptcy_price_long(
    wallet_balance: Decimal, qty: Decimal, entry_price: Decimal
) -> Decimal:
    """Price where account equity hits zero (полная потеря баланса)."""
    if qty <= 0:
        return Decimal("0")
    price = entry_price - wallet_balance / qty
    return price if price > 0 else Decimal("0")


def is_liquidated_long(
    cash: Decimal,
    margin: Decimal,
    qty: Decimal,
    avg_price: Decimal,
    candle_low: Decimal,
    maintenance_margin_rate: Decimal | None = None,
) -> bool:
    """Binance: liquidate when equity ≤ maintenance margin at candle low."""
    if qty <= 0:
        return False
    equity = calc_position_equity(cash, margin, qty, avg_price, candle_low)
    if maintenance_margin_rate is not None:
        maintenance = qty * candle_low * maintenance_margin_rate
    else:
        maintenance = maintenance_margin_usd(qty, candle_low)
    return equity <= maintenance


def calc_liquidation_display(
    cash: Decimal,
    margin: Decimal,
    qty: Decimal,
    avg_price: Decimal,
    maintenance_margin_rate: Decimal | None = None,
    *,
    wallet_balance: Decimal | None = None,
) -> Decimal:
    """Cross-margin liq for UI. Pass wallet_balance for multi-coin (full WB)."""
    wb = wallet_balance if wallet_balance is not None else calc_wallet_balance(cash, margin)
    mmr = maintenance_margin_rate
    if mmr is None:
        notional = qty * avg_price
        mmr = mmr_for_notional(notional)
    return calc_binance_cross_liq_long(wb, qty, avg_price, mmr)


def calc_liquidation_display_cross(
    wallet_balance: Decimal,
    qty: Decimal,
    avg_price: Decimal,
) -> Decimal:
    """Cross liq using tiered MMR from position notional."""
    notional = qty * avg_price
    mmr = mmr_for_notional(notional)
    return calc_binance_cross_liq_long(wallet_balance, qty, avg_price, mmr)


def is_account_liquidated_cross(
    cash: Decimal,
    positions: list[tuple[Decimal, Decimal, Decimal, Decimal]],
    maintenance_margin_rate: Decimal | None = None,
) -> bool:
    equity = cash
    maintenance = Decimal("0")
    for margin, qty, avg_price, candle_low in positions:
        equity += margin + calc_unrealized_pnl_long(qty, avg_price, candle_low)
        if maintenance_margin_rate is not None:
            maintenance += qty * candle_low * maintenance_margin_rate
        else:
            maintenance += maintenance_margin_usd(qty, candle_low)
    return equity <= maintenance if maintenance > 0 else False
