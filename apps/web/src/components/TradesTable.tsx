import type { Trade } from "@/lib/types";

interface AccountSummary {
  initialDeposit: number;
  /** Итог без нереализованного PnL открытых сделок */
  displayEquity: number;
  displayPnlPct: number;
  /** Полный счёт с открытыми (если есть) */
  fullEquity?: number;
  fullPnlPct?: number;
  closedNetPnlUsd?: number;
  openNetPnlUsd?: number;
  openTrades?: number;
}

interface Props {
  trades: Trade[];
  account?: AccountSummary;
  onSelect?: (index: number) => void;
  selected?: number | null;
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

function formatFunding(amount: number): string {
  if (amount === 0) return "$0";
  if (amount > 0) return `−$${Math.abs(amount).toFixed(2)} списано`;
  return `+$${Math.abs(amount).toFixed(2)} зачислено`;
}

function formatLiq(price: number): string {
  if (price <= 0) return "далеко (cross margin)";
  return `$${formatPrice(price)}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pnlClass(value: number, isOpen?: boolean) {
  const base = value >= 0 ? "text-green-400" : "text-red-400";
  return isOpen ? `${base} italic` : base;
}

function tradeNotional(t: Trade): number {
  if (t.total_notional != null) return t.total_notional;
  const margin =
    t.total_margin ?? t.entries.reduce((sum, e) => sum + (e.margin_usd ?? 0), 0);
  return margin * t.leverage;
}

function legNotional(e: Trade["entries"][number], leverage: number): number {
  return e.notional_usd ?? (e.margin_usd ?? 0) * leverage;
}

export function TradesTable({ trades, account, onSelect, selected }: Props) {
  if (trades.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8 text-sm">
        Сделок нет — попробуйте уменьшить drop% или увеличить окно
      </div>
    );
  }

  const selectedTrade = selected != null ? trades[selected] : null;
  const lastIndex = trades.length - 1;
  const hasOpen = trades.some((t) => t.is_open || t.status === "open");
  const lastClosedIndex = trades.reduce(
    (idx, t, i) => (!(t.is_open || t.status === "open") ? i : idx),
    -1
  );
  const summaryRowIndex = hasOpen && lastClosedIndex >= 0 ? lastClosedIndex : lastIndex;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="label-caps border-b border-border/60">
            <th className="text-left py-2 px-2">#</th>
            <th className="text-left py-2 px-2">Монета</th>
            <th className="text-right py-2 px-2">Цена входа $</th>
            <th className="text-center py-2 px-2">Уср.</th>
            <th className="text-right py-2 px-2">Средняя $</th>
            <th
              className="text-right py-2 px-2"
              title="Сумма позиции: маржа × плечо — от неё считается PnL"
            >
              Позиция $
            </th>
            <th
              className="text-right py-2 px-2"
              title="Закрытые — фактическая цена. Открытые — цель TP (ещё не было)"
            >
              Выход $
            </th>
            <th className="text-right py-2 px-2" title="Полный счёт: кэш + все открытые позиции">
              Счёт $
            </th>
            <th
              className="text-right py-2 px-2"
              title="Чистый результат после комиссий и funding"
            >
              PnL $
            </th>
            <th
              className="text-right py-2 px-2"
              title="% от суммы позиции (маржа × плечо)"
            >
              PnL %
            </th>
            <th className="text-left py-2 px-2">Статус</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t, i) => {
            const isOpen = t.is_open || t.status === "open";
            const targetExit = t.target_exit_price ?? null;
            const markNow = t.mark_price ?? null;
            const exitPrice = isOpen ? targetExit : t.exit_price;
            const firstEntry = t.entry_price ?? t.entries[0]?.price ?? t.avg_price;
            const entryTime = t.entries[0]?.time ?? t.opened_at;
            const totalNotional = tradeNotional(t);
            const exitBelowEntry =
              !isOpen && exitPrice != null && exitPrice < firstEntry;
            const netPnl =
              t.net_pnl_usd ??
              t.pnl_usd - (t.fees_paid ?? 0) - (t.funding_paid ?? 0);
            const netPnlPct =
              totalNotional > 0 ? (netPnl / totalNotional) * 100 : t.pnl_pct;

            const isSummaryRow = i === summaryRowIndex && account && !isOpen;
            const accountLabel = isSummaryRow ? "итог" : null;

            return (
              <tr
                key={i}
                onClick={() => onSelect?.(i)}
                className={`border-b border-border/30 cursor-pointer hover:bg-panel-inner/80 ${
                  selected === i ? "bg-accent/5" : ""
                } ${isOpen ? "bg-gold/5" : ""} ${
                  isSummaryRow && account ? "bg-accent/5" : ""
                }`}
              >
                <td className="py-2 px-2">{i + 1}</td>
                <td className="py-2 px-2 font-medium text-accent">
                  {t.symbol?.replace("USDT", "") ?? "—"}
                </td>
                <td className="py-2 px-2 text-right text-green-400/90">
                  {formatPrice(firstEntry)}
                  {entryTime && (
                    <span className="text-[10px] text-muted block">
                      {formatTime(entryTime)}
                    </span>
                  )}
                </td>
                <td className="py-2 px-2 text-center text-yellow-400/90">
                  {t.avg_count > 0 ? t.avg_count : "—"}
                </td>
                <td className="py-2 px-2 text-right text-blue-400/90">
                  {formatPrice(t.avg_price)}
                </td>
                <td className="py-2 px-2 text-right font-medium text-accent">
                  {totalNotional.toFixed(2)}
                  <span className="text-[10px] text-gray-500 block">
                    {t.leverage}x
                  </span>
                </td>
                <td
                  className={`py-2 px-2 text-right ${
                    isOpen
                      ? "text-amber-300/90"
                      : exitBelowEntry
                      ? "text-amber-300"
                      : "text-gray-200"
                  }`}
                  title={
                    isOpen
                      ? `Цель закрытия (TP). Сейчас: $${markNow != null ? formatPrice(markNow) : "—"}`
                      : exitBelowEntry
                      ? "Выход ниже первого входа, но выше средней — сделка в плюсе"
                      : undefined
                  }
                >
                  {exitPrice != null ? formatPrice(exitPrice) : "—"}
                  {!isOpen && t.closed_at && (
                    <span className="text-[10px] text-muted block">
                      {formatTime(t.closed_at)}
                    </span>
                  )}
                  {isOpen && (
                    <span className="text-[10px] text-amber-500/90 block">
                      цель TP · ещё не было
                    </span>
                  )}
                  {markNow != null && isOpen && (
                    <span className="text-[10px] text-gray-500 block">
                      сейчас ${formatPrice(markNow)}
                    </span>
                  )}
                  {exitBelowEntry && !isOpen && (
                    <span className="text-[10px] text-amber-500/80 block">ниже входа</span>
                  )}
                </td>
                <td className="py-2 px-2 text-right font-medium text-accent">
                  {t.bank_at_close.toFixed(2)}
                  {accountLabel && (
                    <span className="text-[10px] text-accent/80 block">
                      {accountLabel}
                    </span>
                  )}
                </td>
                <td className={`py-2 px-2 text-right ${pnlClass(netPnl, isOpen)}`}>
                  {isOpen ? "~" : ""}
                  {netPnl.toFixed(2)}
                </td>
                <td className={`py-2 px-2 text-right ${pnlClass(netPnlPct, isOpen)}`}>
                  {isOpen ? "~" : ""}
                  {netPnlPct.toFixed(2)}%
                </td>
                <td className="py-2 px-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      isOpen
                        ? "bg-amber-900/50 text-amber-300"
                        : t.status === "liquidated"
                        ? "bg-red-900/50 text-red-300"
                        : netPnl >= 0
                        ? "bg-green-900/50 text-green-300"
                        : "bg-gray-800 text-gray-300"
                    }`}
                  >
                    {isOpen
                      ? "Активна"
                      : t.close_reason === "take_profit"
                      ? "TP"
                      : t.close_reason === "stop_loss"
                      ? "SL"
                      : t.close_reason === "trailing"
                      ? "Трейлинг"
                      : t.close_reason === "liquidation"
                      ? "Ликв."
                      : t.close_reason || t.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {account && (
        <div className="mt-4 pt-3 border-t border-border text-sm space-y-1">
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
            <span className="text-gray-400">
              Итог{hasOpen ? " (без PnL открытых)" : ""}
            </span>
            <span
              className={
                account.displayPnlPct >= 0 ? "text-green-400" : "text-red-400"
              }
            >
              ${account.displayEquity.toFixed(2)}
              <span className="text-gray-500 ml-2">
                ({account.displayPnlPct >= 0 ? "+" : ""}
                {account.displayPnlPct.toFixed(2)}%)
              </span>
            </span>
          </div>
          {hasOpen && account.fullEquity != null && account.fullPnlPct != null && (
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>С полным счётом (включая открытые)</span>
              <span className="text-amber-300/90">
                ${account.fullEquity.toFixed(2)} (
                {account.fullPnlPct >= 0 ? "+" : ""}
                {account.fullPnlPct.toFixed(2)}%)
              </span>
            </div>
          )}
          {account.closedNetPnlUsd != null && (
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>Закрытые сделки (чистыми)</span>
              <span
                className={
                  account.closedNetPnlUsd >= 0
                    ? "text-green-400/90"
                    : "text-red-400/90"
                }
              >
                {account.closedNetPnlUsd >= 0 ? "+" : ""}$
                {account.closedNetPnlUsd.toFixed(2)}
              </span>
            </div>
          )}
          {(account.openTrades ?? 0) > 0 && account.openNetPnlUsd != null && (
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>Открытые ({account.openTrades})</span>
              <span
                className={
                  account.openNetPnlUsd >= 0
                    ? "text-amber-300/90"
                    : "text-red-400/90"
                }
              >
                {account.openNetPnlUsd >= 0 ? "+" : ""}$
                {account.openNetPnlUsd.toFixed(2)}
              </span>
            </div>
          )}
          <p className="text-[11px] text-gray-600 pt-1">
            Итог в шапке — без нереализованного PnL открытых сделок. Колонка «Счёт» —
            полный счёт в момент сделки.
          </p>
        </div>
      )}

      {selectedTrade && (
        <div className="mt-4 p-4 bg-panel-inner rounded-xl border border-border/60 text-sm space-y-3">
          <h3 className="font-semibold text-accent">
            {selectedTrade.symbol?.replace("USDT", "")} — сделка #
            {(selected ?? 0) + 1}
            {selectedTrade.avg_count > 0 && (
              <span className="text-gray-500 font-normal ml-2">
                · усреднений: {selectedTrade.avg_count}
              </span>
            )}
          </h3>
          <div className="space-y-2">
            {selectedTrade.entries.map((e, i) => {
              const notional = legNotional(e, selectedTrade.leverage);
              return (
                <div
                  key={i}
                  className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-gray-300 border-b border-border/40 pb-2 last:border-0 last:pb-0"
                >
                  <span>
                    <span className="text-gray-500">
                      {i === 0 ? "Вход" : `Усреднение ${i}`}:
                    </span>{" "}
                    {formatTime(e.time)} @ ${formatPrice(e.price)}
                  </span>
                  <span className="text-accent text-right">
                    <span className="block">
                      купили на ${notional.toFixed(2)}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {e.pct_of_deposit}% банка × {selectedTrade.leverage}x плечо
                    </span>
                    <span className="text-red-400/90 text-xs block mt-0.5">
                      ликв. {formatLiq(e.liq_price)}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
          {(selectedTrade.is_open || selectedTrade.status === "open") &&
            selectedTrade.target_exit_price != null && (
              <p className="text-xs text-amber-400/90 border border-amber-700/40 rounded-lg p-2">
                Выход по TP: ${formatPrice(selectedTrade.target_exit_price)} — ещё не
                произошёл
                {selectedTrade.mark_price != null && (
                  <>
                    . Цена на конец периода: ${formatPrice(selectedTrade.mark_price)}
                  </>
                )}
              </p>
            )}
          <p className="text-xs text-gray-500">
            Итого купили на ${tradeNotional(selectedTrade).toFixed(2)} · средняя цена: $
            {formatPrice(selectedTrade.avg_price)}
            {(selectedTrade.final_liq_price ?? selectedTrade.liq_price) > 0 && (
              <>
                {" "}
                · ликв. позиции: $
                {formatPrice(
                  selectedTrade.final_liq_price ?? selectedTrade.liq_price
                )}
              </>
            )}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 border border-border/40 rounded-lg p-2">
            <span>
              Комиссии:{" "}
              <span className="text-gray-200">
                ${(selectedTrade.fees_paid ?? 0).toFixed(2)}
              </span>
            </span>
            <span>
              Funding:{" "}
              <span className="text-gray-200">
                {formatFunding(selectedTrade.funding_paid ?? 0)}
              </span>
            </span>
            {selectedTrade.mmr_pct != null && (
              <span>
                MMR:{" "}
                <span className="text-gray-200">
                  {selectedTrade.mmr_pct.toFixed(2)}%
                </span>
              </span>
            )}
            {selectedTrade.maintenance_margin_usd != null && (
              <span>
                Поддерж. маржа:{" "}
                <span className="text-gray-200">
                  ${selectedTrade.maintenance_margin_usd.toFixed(2)}
                </span>
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600">
            Cross margin (как на Binance): весь баланс защищает позицию. Плечо только
            умножает покупку — 10%×10x = 100%×1x. Ликвидация одинакова при одинаковой
            позиции.
          </p>
        </div>
      )}

      <p className="text-xs text-gray-600 mt-2 px-2">
        «Позиция $» в таблице — на какую сумму купили монету (вход% × плечо). Нажмите строку
        — детали.
      </p>
    </div>
  );
}
