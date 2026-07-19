from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from decimal import Decimal

from backtester.core.funding_apply import apply_funding_for_candle
from backtester.core.mmr import maintenance_margin_usd, mmr_for_notional
from backtester.core.margin import (
    calc_entry_margin,
    calc_fee,
    calc_liquidation_display,
    calc_pnl_pct,
    calc_position_equity,
    calc_position_qty,
    calc_take_profit_price_long,
    calc_total_notional,
    calc_unrealized_pnl_long,
    calc_wallet_balance,
    is_account_liquidated_cross,
)
from backtester.core.params import PortfolioParams
from backtester.core.types import (
    AverageEntry,
    Candle,
    CloseReason,
    PnlSnapshot,
    PortfolioSimulationResult,
    Trade,
    TradeStatus,
)
from backtester.simulators.single_coin import OpenPosition
from backtester.strategies.averaging import should_average
from backtester.strategies.entry import DropFromPeakTracker
from backtester.strategies.trailing import TrailingStop


def merge_timeline(
    candles_by_symbol: dict[str, list[Candle]],
) -> list[tuple[datetime, dict[str, Candle]]]:
    """Merge per-symbol candles into a unified minute-by-minute timeline."""
    buckets: dict[datetime, dict[str, Candle]] = defaultdict(dict)
    for symbol, candles in candles_by_symbol.items():
        for c in candles:
            buckets[c.open_time][symbol] = c
    return sorted(buckets.items(), key=lambda x: x[0])


class MultiCoinSimulator:
    """
    M16 — multi-coin portfolio on one shared deposit (cross margin).
    Liquidation of any position wipes entire bank and stops all trading.
    """

    def __init__(self, params: PortfolioParams):
        params.validate()
        self.params = params

    def run(
        self,
        candles_by_symbol: dict[str, list[Candle]],
        funding_by_symbol: dict[str, list[tuple[datetime, Decimal]]] | None = None,
    ) -> PortfolioSimulationResult:
        p = self.params
        symbols = p.active_symbols

        for sym in symbols:
            if sym not in candles_by_symbol or not candles_by_symbol[sym]:
                raise ValueError(f"No candles for symbol: {sym}")

        # Per-symbol candle lists for entry detection (index lookup)
        sym_indices: dict[str, dict[datetime, int]] = {}
        for sym in symbols:
            sym_indices[sym] = {
                c.open_time: i for i, c in enumerate(candles_by_symbol[sym])
            }

        cash = p.initial_deposit
        initial = p.initial_deposit
        positions: dict[str, OpenPosition] = {}
        trades: list[Trade] = []
        trades_by_symbol: dict[str, list[Trade]] = {s: [] for s in symbols}
        pnl_curve: list[PnlSnapshot] = []
        liquidated = False
        liquidated_at: datetime | None = None
        liquidated_symbol: str | None = None

        timeline = merge_timeline({s: candles_by_symbol[s] for s in symbols})

        entry_trackers = {sym: DropFromPeakTracker() for sym in symbols}
        last_realized = initial
        funding_map = funding_by_symbol or {}

        for t, minute_candles in timeline:
            if liquidated:
                break

            equity = self._total_equity(cash, positions, minute_candles)
            self._refresh_liq_prices(cash, positions)

            # --- Cross margin: account equity vs total maintenance ---
            if positions and self._check_liquidation(cash, positions, minute_candles):
                liq_sym = self._worst_position_symbol(positions, minute_candles)
                liq_candle = minute_candles.get(liq_sym) or next(iter(minute_candles.values()))
                for sym, pos in list(positions.items()):
                    c = minute_candles.get(sym, liq_candle)
                    trade, _ = self._close_position(
                        pos,
                        c,
                        pos.liq_price if pos.liq_price > 0 else c.low,
                        cash,
                        CloseReason.LIQUIDATION,
                        positions,
                        minute_candles,
                        sym,
                        force_zero=(sym == liq_sym),
                    )
                    if sym != liq_sym:
                        trade.pnl_usd = Decimal("0")
                        trade.bank_at_close = Decimal("0")
                    trades.append(trade)
                    trades_by_symbol[sym].append(trade)

                cash = Decimal("0")
                liquidated = True
                liquidated_at = t
                liquidated_symbol = liq_sym
                positions.clear()
                pnl_curve.append(PnlSnapshot(t, Decimal("0"), Decimal("-100")))
                break

            # --- Process each open position: funding, exits, averaging ---
            for sym in list(positions.keys()):
                if sym not in minute_candles:
                    continue
                candle = minute_candles[sym]
                pos = positions[sym]
                cash -= self._apply_funding(
                    pos, candle, funding_map.get(sym) if p.use_real_funding else None
                )
                cash, closed, exit_price = self._process_exits(
                    pos, candle, cash, p, trades, trades_by_symbol, positions, sym, minute_candles
                )
                if closed and exit_price is not None:
                    entry_trackers[sym].reset_to(exit_price)
                    last_realized = cash

            # --- New entries ---
            equity = self._total_equity(cash, positions, minute_candles)
            max_open = p.max_open_trades
            for sym in symbols:
                if sym in positions or sym not in minute_candles:
                    continue
                if max_open is not None and len(positions) >= max_open:
                    continue
                candle = minute_candles[sym]

                entry_price = entry_trackers[sym].check_entry(candle, p.drop_pct)
                if entry_price is None:
                    continue
                sym_entry_pct = p.entry_pct_for_symbol(sym)
                margin = calc_entry_margin(
                    cash, equity, sym_entry_pct, p.leverage, p.fee_rate
                )
                if margin <= 0:
                    continue

                notional = margin * p.leverage
                fee = calc_fee(notional, p.fee_rate)

                cash -= margin + fee
                qty = calc_position_qty(margin, entry_price, p.leverage)
                total_locked = sum(x.total_margin for x in positions.values()) + margin
                wallet_balance = cash + total_locked
                liq = calc_liquidation_display(
                    cash,
                    margin,
                    qty,
                    entry_price,
                    p.maintenance_margin_rate,
                    wallet_balance=wallet_balance,
                )

                entry = AverageEntry(
                    time=t,
                    price=entry_price,
                    margin_usd=margin,
                    qty=qty,
                    pct_of_deposit=sym_entry_pct,
                    liq_price_after=liq,
                )

                trailing = (
                    TrailingStop(p.trailing_activation_pct, p.trailing_callback_pct)
                    if p.trailing_enabled
                    else None
                )

                positions[sym] = OpenPosition(
                    symbol=sym,
                    opened_at=t,
                    entries=[entry],
                    total_qty=qty,
                    total_margin=margin,
                    avg_price=entry_price,
                    liq_price=liq,
                    fees_paid=fee,
                    bank_at_open=equity,
                    entry_pct=sym_entry_pct,
                    trailing=trailing,
                    last_funding_time=t,
                )

            if positions:
                balance = last_realized
            else:
                balance = cash
                last_realized = cash
            pnl_curve.append(self._snapshot(t, balance, initial))

        open_at_end = bool(positions) and not liquidated
        if open_at_end:
            last_t, last_candles = timeline[-1]
            earliest_open = min(pos.opened_at for pos in positions.values())
            for sym, pos in list(positions.items()):
                if sym in last_candles:
                    trade = self._mark_open_position(
                        pos, last_candles[sym], cash, positions, last_candles
                    )
                    trades.append(trade)
                    trades_by_symbol[sym].append(trade)
            final = self._total_equity(cash, positions, last_candles)
            realized = cash + sum(pos.total_margin for pos in positions.values())
            pnl_curve = [s for s in pnl_curve if s.time < earliest_open]
        else:
            final = cash if not liquidated else Decimal("0")
            realized = final
        final_pnl_pct = (
            ((final - initial) / initial) * Decimal("100") if initial > 0 else Decimal("0")
        )
        realized_pnl_pct = (
            ((realized - initial) / initial) * Decimal("100")
            if initial > 0
            else Decimal("0")
        )
        winning = sum(1 for t in trades if t.status == TradeStatus.CLOSED and t.pnl_usd > 0)
        liq_trades = sum(1 for t in trades if t.status == TradeStatus.LIQUIDATED)

        label = "+".join(symbols) if len(symbols) <= 3 else f"{len(symbols)}coins"

        return PortfolioSimulationResult(
            symbol=label,
            symbols=symbols,
            excluded_symbols=list(p.excluded_symbols),
            initial_deposit=initial,
            final_balance=final,
            final_pnl_pct=final_pnl_pct,
            realized_balance=realized,
            realized_pnl_pct=realized_pnl_pct,
            liquidated=liquidated,
            liquidated_at=liquidated_at,
            liquidated_symbol=liquidated_symbol,
            trades=trades,
            trades_by_symbol=trades_by_symbol,
            candles_by_symbol={s: candles_by_symbol[s] for s in symbols},
            pnl_curve=pnl_curve,
            total_trades=len(trades),
            winning_trades=winning,
            liquidated_trades=liq_trades,
        )

    def _total_equity(
        self,
        cash: Decimal,
        positions: dict[str, OpenPosition],
        minute_candles: dict[str, Candle],
    ) -> Decimal:
        equity = cash
        for sym, pos in positions.items():
            equity += pos.total_margin
            if sym in minute_candles:
                price = minute_candles[sym].close
                equity += calc_unrealized_pnl_long(pos.total_qty, pos.avg_price, price)
        return equity

    def _refresh_liq_prices(
        self,
        cash: Decimal,
        positions: dict[str, OpenPosition],
    ) -> None:
        total_locked = sum(pos.total_margin for pos in positions.values())
        wallet_balance = cash + total_locked
        mmr_param = self.params.maintenance_margin_rate
        for pos in positions.values():
            pos.liq_price = calc_liquidation_display(
                cash,
                pos.total_margin,
                pos.total_qty,
                pos.avg_price,
                mmr_param,
                wallet_balance=wallet_balance,
            )
            # Refresh per-leg display with full cross wallet
            for entry in pos.entries:
                entry.liq_price_after = calc_liquidation_display(
                    cash,
                    pos.total_margin,
                    pos.total_qty,
                    pos.avg_price,
                    mmr_param,
                    wallet_balance=wallet_balance,
                )

    def _check_liquidation(
        self,
        cash: Decimal,
        positions: dict[str, OpenPosition],
        minute_candles: dict[str, Candle],
    ) -> bool:
        legs: list[tuple[Decimal, Decimal, Decimal, Decimal]] = []
        for sym, pos in positions.items():
            if sym not in minute_candles:
                continue
            legs.append(
                (
                    pos.total_margin,
                    pos.total_qty,
                    pos.avg_price,
                    minute_candles[sym].low,
                )
            )
        if not legs:
            return False
        return is_account_liquidated_cross(
            cash, legs, self.params.maintenance_margin_rate
        )

    @staticmethod
    def _worst_position_symbol(
        positions: dict[str, OpenPosition],
        minute_candles: dict[str, Candle],
    ) -> str:
        """Position with the lowest candle low (closest to liquidation for longs)."""
        worst_sym = next(iter(positions))
        worst_low: Decimal | None = None
        for sym in positions:
            if sym not in minute_candles:
                continue
            low = minute_candles[sym].low
            if worst_low is None or low < worst_low:
                worst_low = low
                worst_sym = sym
        return worst_sym

    def _process_exits(
        self,
        pos: OpenPosition,
        candle: Candle,
        cash: Decimal,
        p: PortfolioParams,
        trades: list[Trade],
        trades_by_symbol: dict[str, list[Trade]],
        positions: dict[str, OpenPosition],
        sym: str,
        minute_candles: dict[str, Candle],
    ) -> tuple[Decimal, bool, Decimal | None]:
        """Returns (updated_cash, position_closed, exit_price)."""

        if p.stop_loss_pct is not None:
            sl = pos.avg_price * (Decimal("1") - p.stop_loss_pct / Decimal("100"))
            if candle.low <= sl:
                trade, new_cash = self._close_position(
                    pos, candle, sl, cash, CloseReason.STOP_LOSS, positions, minute_candles, sym
                )
                trades.append(trade)
                trades_by_symbol[sym].append(trade)
                del positions[sym]
                return new_cash, True, sl

        if pos.trailing and pos.trailing.update(
            pos.avg_price, candle.high, candle.low
        ):
            exit_price = pos.trailing.state.stop_price
            trade, new_cash = self._close_position(
                pos, candle, exit_price, cash, CloseReason.TRAILING, positions, minute_candles, sym
            )
            trades.append(trade)
            trades_by_symbol[sym].append(trade)
            del positions[sym]
            return new_cash, True, exit_price

        if not (pos.trailing and pos.trailing.is_active):
            tp = calc_take_profit_price_long(pos.avg_price, p.take_profit_pct)
            if candle.high >= tp:
                trade, new_cash = self._close_position(
                    pos, candle, tp, cash, CloseReason.TAKE_PROFIT, positions, minute_candles, sym
                )
                trades.append(trade)
                trades_by_symbol[sym].append(trade)
                del positions[sym]
                return new_cash, True, tp

        avg_level = should_average(
            candle.close,
            pos.entries[0].price,
            pos.avg_levels_used,
            p.averaging_levels,
        )
        if avg_level is not None:
            equity = calc_position_equity(
                cash,
                pos.total_margin,
                pos.total_qty,
                pos.avg_price,
                candle.close,
            )
            margin = calc_entry_margin(
                cash,
                equity,
                p.margin_pct_for_symbol(sym, avg_level.margin_pct_of_deposit),
                p.leverage,
                p.fee_rate,
            )
            if margin <= 0:
                return cash, False, None

            notional = margin * p.leverage
            fee = calc_fee(notional, p.fee_rate)
            if cash >= margin + fee:
                cash -= margin + fee
                qty = calc_position_qty(margin, candle.close, p.leverage)
                old_qty = pos.total_qty
                pos.total_qty += qty
                pos.total_margin += margin
                pos.avg_price = (
                    pos.avg_price * old_qty + candle.close * qty
                ) / pos.total_qty
                pos.fees_paid += fee
                pos.avg_levels_used += 1
                total_locked = sum(x.total_margin for x in positions.values())
                wallet_balance = cash + total_locked
                pos.entries.append(
                    AverageEntry(
                        time=candle.open_time,
                        price=candle.close,
                        margin_usd=margin,
                        qty=qty,
                        pct_of_deposit=p.margin_pct_for_symbol(
                            sym, avg_level.margin_pct_of_deposit
                        ),
                        liq_price_after=calc_liquidation_display(
                            cash,
                            pos.total_margin,
                            pos.total_qty,
                            pos.avg_price,
                            p.maintenance_margin_rate,
                            wallet_balance=wallet_balance,
                        ),
                    )
                )
                self._refresh_liq_prices(cash, positions)

        return cash, False, None

    def _apply_funding(
        self,
        pos: OpenPosition,
        candle: Candle,
        schedule: list[tuple[datetime, Decimal]] | None,
    ) -> Decimal:
        payment, new_last, new_idx = apply_funding_for_candle(
            pos.total_qty,
            candle.open_time,
            candle.close,
            schedule,
            self.params.funding_rate_8h,
            pos.last_funding_time,
            getattr(pos, "funding_event_idx", 0),
        )
        pos.last_funding_time = new_last
        pos.funding_event_idx = new_idx
        if payment != 0:
            pos.funding_paid += payment
        return payment

    def _mmr_snapshot(self, pos: OpenPosition, mark: Decimal) -> tuple[Decimal, Decimal]:
        notional = pos.total_qty * mark
        if self.params.maintenance_margin_rate is not None:
            rate = self.params.maintenance_margin_rate
            maint = notional * rate
        else:
            rate = mmr_for_notional(notional)
            maint = maintenance_margin_usd(pos.total_qty, mark)
        return rate * Decimal("100"), maint

    def _mark_open_position(
        self,
        pos: OpenPosition,
        candle: Candle,
        cash: Decimal,
        positions: dict[str, OpenPosition],
        minute_candles: dict[str, Candle],
    ) -> Trade:
        mark_price = candle.close
        pnl = calc_unrealized_pnl_long(pos.total_qty, pos.avg_price, mark_price)
        equity = self._total_equity(cash, positions, minute_candles)

        p = self.params
        if pos.trailing and pos.trailing.is_active:
            target_exit = pos.trailing.state.stop_price
        else:
            target_exit = calc_take_profit_price_long(
                pos.avg_price, p.take_profit_pct
            )

        mmr_pct, maint_usd = self._mmr_snapshot(pos, mark_price)

        return Trade(
            symbol=pos.symbol,
            opened_at=pos.opened_at,
            closed_at=None,
            entry_pct_of_deposit=pos.entry_pct,
            leverage=self.params.leverage,
            avg_count=pos.avg_levels_used,
            entries=pos.entries,
            avg_price=pos.avg_price,
            total_qty=pos.total_qty,
            total_margin=pos.total_margin,
            liq_price=pos.liq_price,
            fees_paid=pos.fees_paid,
            funding_paid=pos.funding_paid,
            pnl_usd=pnl,
            pnl_pct=calc_pnl_pct(
                pnl, calc_total_notional(pos.total_margin, self.params.leverage)
            ),
            bank_at_open=pos.bank_at_open,
            bank_at_close=equity,
            status=TradeStatus.OPEN,
            close_reason=None,
            close_price=None,
            mark_price=mark_price,
            target_exit_price=target_exit,
            mmr_pct=mmr_pct,
            maintenance_margin_usd=maint_usd,
        )

    def _close_position(
        self,
        pos: OpenPosition,
        candle: Candle,
        exit_price: Decimal,
        cash: Decimal,
        reason: CloseReason,
        positions: dict[str, OpenPosition],
        minute_candles: dict[str, Candle],
        sym: str,
        force_zero: bool = False,
    ) -> tuple[Trade, Decimal]:
        pnl = calc_unrealized_pnl_long(pos.total_qty, pos.avg_price, exit_price)
        close_fee = calc_fee(pos.total_qty * exit_price, self.params.fee_rate)
        pos.fees_paid += close_fee

        if force_zero or reason == CloseReason.LIQUIDATION:
            status = TradeStatus.LIQUIDATED
            bank_at_close = Decimal("0")
            new_cash = Decimal("0")
            pnl = -pos.total_margin if force_zero else pnl
        else:
            status = TradeStatus.CLOSED
            new_cash = cash + pos.total_margin + pnl - close_fee
            others = {k: v for k, v in positions.items() if k != sym}
            bank_at_close = self._total_equity(new_cash, others, minute_candles)

        mmr_pct, maint_usd = self._mmr_snapshot(pos, exit_price)

        trade = Trade(
            symbol=pos.symbol,
            opened_at=pos.opened_at,
            closed_at=candle.open_time,
            entry_pct_of_deposit=pos.entry_pct,
            leverage=self.params.leverage,
            avg_count=pos.avg_levels_used,
            entries=pos.entries,
            avg_price=pos.avg_price,
            total_qty=pos.total_qty,
            total_margin=pos.total_margin,
            liq_price=pos.liq_price,
            fees_paid=pos.fees_paid,
            funding_paid=pos.funding_paid,
            pnl_usd=pnl,
            pnl_pct=calc_pnl_pct(
                pnl, calc_total_notional(pos.total_margin, self.params.leverage)
            ),
            bank_at_open=pos.bank_at_open,
            bank_at_close=bank_at_close,
            status=status,
            close_reason=reason,
            close_price=exit_price,
            mmr_pct=mmr_pct,
            maintenance_margin_usd=maint_usd,
        )
        return trade, new_cash

    @staticmethod
    def _snapshot(time: datetime, balance: Decimal, initial: Decimal) -> PnlSnapshot:
        pct = ((balance - initial) / initial) * Decimal("100") if initial > 0 else Decimal("0")
        return PnlSnapshot(time=time, balance=balance, pnl_pct=pct)
