from __future__ import annotations

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
    is_liquidated_long,
)
from backtester.core.params import StrategyParams
from backtester.core.types import (
    AverageEntry,
    Candle,
    CloseReason,
    PnlSnapshot,
    SimulationResult,
    Trade,
    TradeStatus,
)
from backtester.strategies.averaging import should_average
from backtester.strategies.entry import DropFromPeakTracker
from backtester.strategies.trailing import TrailingStop


@dataclass
class OpenPosition:
    symbol: str
    opened_at: datetime
    entries: list[AverageEntry] = field(default_factory=list)
    total_qty: Decimal = Decimal("0")
    total_margin: Decimal = Decimal("0")
    avg_price: Decimal = Decimal("0")
    liq_price: Decimal = Decimal("0")
    fees_paid: Decimal = Decimal("0")
    funding_paid: Decimal = Decimal("0")
    bank_at_open: Decimal = Decimal("0")
    entry_pct: Decimal = Decimal("0")
    trailing: TrailingStop | None = None
    avg_levels_used: int = 0
    last_funding_time: datetime | None = None
    funding_event_idx: int = 0


class SingleCoinSimulator:
    """Single-coin backtest: cross margin, leverage on every leg, liq stops trading."""

    def __init__(self, params: StrategyParams):
        params.validate()
        self.params = params

    def _equity(self, cash: Decimal, pos: OpenPosition | None, mark: Decimal) -> Decimal:
        if pos is None:
            return cash
        return calc_position_equity(
            cash, pos.total_margin, pos.total_qty, pos.avg_price, mark
        )

    def _refresh_liq_price(self, cash: Decimal, pos: OpenPosition) -> None:
        pos.liq_price = calc_liquidation_display(
            cash,
            pos.total_margin,
            pos.total_qty,
            pos.avg_price,
            self.params.maintenance_margin_rate,
        )

    def run(
        self,
        candles: list[Candle],
        funding_schedule: list[tuple[datetime, Decimal]] | None = None,
    ) -> SimulationResult:
        if not candles:
            raise ValueError("candles list is empty")

        p = self.params
        cash = p.initial_deposit
        initial = p.initial_deposit
        position: OpenPosition | None = None
        trades: list[Trade] = []
        pnl_curve: list[PnlSnapshot] = []
        liquidated = False
        liquidated_at: datetime | None = None
        entry_tracker = DropFromPeakTracker()
        last_realized = initial
        schedule = funding_schedule if p.use_real_funding else None

        for candle in candles:
            if liquidated:
                break

            if position is not None:
                self._refresh_liq_price(cash, position)
                cash, position, closed, liq_hit = self._process_position(
                    position, candle, cash, trades, schedule
                )
                if liq_hit:
                    liquidated = True
                    liquidated_at = candle.open_time
                    cash = Decimal("0")
                    if trades and trades[-1].close_price is not None:
                        entry_tracker.reset_to(trades[-1].close_price)
                    pnl_curve.append(
                        PnlSnapshot(candle.open_time, Decimal("0"), Decimal("-100"))
                    )
                    continue
                if closed and trades[-1].close_price is not None:
                    entry_tracker.reset_to(trades[-1].close_price)
                    last_realized = cash

            if position is None and not liquidated:
                equity = cash
                entry_price = entry_tracker.check_entry(candle, p.drop_pct)
                if entry_price is not None:
                    position, cash = self._open_at_price(
                        candle, cash, equity, entry_price
                    )

            if not liquidated:
                if position is not None:
                    balance = last_realized
                else:
                    balance = cash
                    last_realized = cash
                pnl_curve.append(self._snapshot(candle.open_time, balance, initial))

        open_trade_at_end = position is not None and not liquidated
        if open_trade_at_end:
            last = candles[-1]
            trade = self._mark_open_position(position, last, cash)
            trades.append(trade)
            final = self._equity(cash, position, last.close)
            realized = cash + position.total_margin
            pnl_curve = [s for s in pnl_curve if s.time < position.opened_at]
        else:
            final = cash if not liquidated else Decimal("0")
            realized = final

        final_pnl_pct = (
            ((final - initial) / initial) * Decimal("100")
            if initial > 0
            else Decimal("0")
        )
        realized_pnl_pct = (
            ((realized - initial) / initial) * Decimal("100")
            if initial > 0
            else Decimal("0")
        )

        winning = sum(
            1
            for t in trades
            if t.status == TradeStatus.CLOSED and t.pnl_usd > 0
        )
        liq_trades = sum(1 for t in trades if t.status == TradeStatus.LIQUIDATED)

        return SimulationResult(
            symbol=p.symbol,
            initial_deposit=initial,
            final_balance=final,
            final_pnl_pct=final_pnl_pct,
            realized_balance=realized,
            realized_pnl_pct=realized_pnl_pct,
            liquidated=liquidated,
            liquidated_at=liquidated_at,
            trades=trades,
            pnl_curve=pnl_curve,
            total_trades=len(trades),
            winning_trades=winning,
            liquidated_trades=liq_trades,
        )

    def _mark_open_position(
        self,
        pos: OpenPosition,
        candle: Candle,
        cash: Decimal,
    ) -> Trade:
        mark_price = candle.close
        pnl = calc_unrealized_pnl_long(pos.total_qty, pos.avg_price, mark_price)
        equity = calc_position_equity(
            cash, pos.total_margin, pos.total_qty, pos.avg_price, mark_price
        )

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

    def _open_at_price(
        self,
        candle: Candle,
        cash: Decimal,
        equity: Decimal,
        entry_price: Decimal,
    ) -> tuple[OpenPosition | None, Decimal]:
        p = self.params
        sym_entry_pct = p.entry_pct_for_symbol(p.symbol)

        margin = calc_entry_margin(
            cash, equity, sym_entry_pct, p.leverage, p.fee_rate
        )
        if margin <= 0:
            return None, cash

        notional = margin * p.leverage
        fee = calc_fee(notional, p.fee_rate)

        cash -= margin + fee
        qty = calc_position_qty(margin, entry_price, p.leverage)
        leg_liq = calc_liquidation_display(
            cash, margin, qty, entry_price, p.maintenance_margin_rate
        )

        entry = AverageEntry(
            time=candle.open_time,
            price=entry_price,
            margin_usd=margin,
            qty=qty,
            pct_of_deposit=sym_entry_pct,
            liq_price_after=leg_liq,
        )

        trailing = (
            TrailingStop(p.trailing_activation_pct, p.trailing_callback_pct)
            if p.trailing_enabled
            else None
        )

        position = OpenPosition(
            symbol=p.symbol,
            opened_at=candle.open_time,
            entries=[entry],
            total_qty=qty,
            total_margin=margin,
            avg_price=entry_price,
            liq_price=leg_liq,
            fees_paid=fee,
            funding_paid=Decimal("0"),
            bank_at_open=equity,
            entry_pct=sym_entry_pct,
            trailing=trailing,
            last_funding_time=candle.open_time,
        )
        self._refresh_liq_price(cash, position)
        return position, cash

    def _process_position(
        self,
        pos: OpenPosition,
        candle: Candle,
        cash: Decimal,
        trades: list[Trade],
        funding_schedule: list[tuple[datetime, Decimal]] | None,
    ) -> tuple[Decimal, OpenPosition | None, bool, bool]:
        p = self.params

        payment, new_last, new_idx = apply_funding_for_candle(
            pos.total_qty,
            candle.open_time,
            candle.close,
            funding_schedule,
            p.funding_rate_8h,
            pos.last_funding_time,
            pos.funding_event_idx,
        )
        cash -= payment
        pos.last_funding_time = new_last
        pos.funding_event_idx = new_idx
        if payment != 0:
            pos.funding_paid += payment

        if is_liquidated_long(
            cash,
            pos.total_margin,
            pos.total_qty,
            pos.avg_price,
            candle.low,
            p.maintenance_margin_rate,
        ):
            liq_price = pos.liq_price if pos.liq_price > 0 else candle.low
            trade = self._close_position(
                pos, candle, liq_price, cash, CloseReason.LIQUIDATION
            )
            trades.append(trade)
            return Decimal("0"), None, True, True

        if p.stop_loss_pct is not None:
            sl_price = pos.avg_price * (Decimal("1") - p.stop_loss_pct / Decimal("100"))
            if candle.low <= sl_price:
                trade = self._close_position(
                    pos, candle, sl_price, cash, CloseReason.STOP_LOSS
                )
                trades.append(trade)
                return trade.bank_at_close, None, True, False

        if pos.trailing and pos.trailing.update(
            pos.avg_price, candle.high, candle.low
        ):
            exit_price = pos.trailing.state.stop_price
            trade = self._close_position(
                pos, candle, exit_price, cash, CloseReason.TRAILING
            )
            trades.append(trade)
            return trade.bank_at_close, None, True, False

        if not (pos.trailing and pos.trailing.is_active):
            tp_price = calc_take_profit_price_long(pos.avg_price, p.take_profit_pct)
            if candle.high >= tp_price:
                trade = self._close_position(
                    pos, candle, tp_price, cash, CloseReason.TAKE_PROFIT
                )
                trades.append(trade)
                return trade.bank_at_close, None, True, False

        avg_level = should_average(
            candle.close,
            pos.entries[0].price,
            pos.avg_levels_used,
            p.averaging_levels,
        )
        if avg_level is not None:
            equity = calc_position_equity(
                cash, pos.total_margin, pos.total_qty, pos.avg_price, candle.close
            )
            margin = calc_entry_margin(
                cash,
                equity,
                p.margin_pct_for_symbol(p.symbol, avg_level.margin_pct_of_deposit),
                p.leverage,
                p.fee_rate,
            )
            if margin <= 0:
                return cash, pos, False, False

            notional = margin * p.leverage
            fee = calc_fee(notional, p.fee_rate)
            if cash >= margin + fee:
                cash -= margin + fee
                qty = calc_position_qty(margin, candle.close, p.leverage)
                pos.total_qty += qty
                pos.total_margin += margin
                pos.avg_price = (
                    (pos.avg_price * (pos.total_qty - qty) + candle.close * qty)
                    / pos.total_qty
                )
                pos.fees_paid += fee
                pos.avg_levels_used += 1
                pos.entries.append(
                    AverageEntry(
                        time=candle.open_time,
                        price=candle.close,
                        margin_usd=margin,
                        qty=qty,
                        pct_of_deposit=p.margin_pct_for_symbol(
                            p.symbol, avg_level.margin_pct_of_deposit
                        ),
                        liq_price_after=calc_liquidation_display(
                            cash,
                            pos.total_margin,
                            pos.total_qty,
                            pos.avg_price,
                            p.maintenance_margin_rate,
                        ),
                    )
                )
                self._refresh_liq_price(cash, pos)

        return cash, pos, False, False

    def _mmr_snapshot(self, pos: OpenPosition, mark: Decimal) -> tuple[Decimal, Decimal]:
        notional = pos.total_qty * mark
        if self.params.maintenance_margin_rate is not None:
            rate = self.params.maintenance_margin_rate
            maint = notional * rate
        else:
            rate = mmr_for_notional(notional)
            maint = maintenance_margin_usd(pos.total_qty, mark)
        return rate * Decimal("100"), maint

    def _close_position(
        self,
        pos: OpenPosition,
        candle: Candle,
        exit_price: Decimal,
        cash: Decimal,
        reason: CloseReason,
    ) -> Trade:
        pnl = calc_unrealized_pnl_long(pos.total_qty, pos.avg_price, exit_price)
        close_fee = calc_fee(pos.total_qty * exit_price, self.params.fee_rate)
        pos.fees_paid += close_fee

        returned = pos.total_margin + pnl - close_fee
        bank_at_close = cash + returned

        if reason == CloseReason.LIQUIDATION:
            status = TradeStatus.LIQUIDATED
            bank_at_close = Decimal("0")
            pnl = -pos.total_margin
        else:
            status = TradeStatus.CLOSED

        mmr_pct, maint_usd = self._mmr_snapshot(pos, exit_price)

        return Trade(
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

    @staticmethod
    def _snapshot(time: datetime, balance: Decimal, initial: Decimal) -> PnlSnapshot:
        pct = ((balance - initial) / initial) * Decimal("100") if initial > 0 else Decimal("0")
        return PnlSnapshot(time=time, balance=balance, pnl_pct=pct)
