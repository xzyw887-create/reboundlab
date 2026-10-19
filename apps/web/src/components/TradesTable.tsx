import type { Trade } from "@/lib/types";
import { Fragment, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import { formatTpl, useLocale } from "@/lib/i18n";

interface AccountSummary {
  initialDeposit: number;
  closedNetPnlUsd?: number;
  openNetPnlUsd?: number;
}

interface Props {
  trades: Trade[];
  account?: AccountSummary;
  onSelect?: (index: number | null) => void;
  selected?: number | null;
  showAveraging?: boolean;
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

function formatTime(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleString(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLiqPrice(price: number, farLabel: string): string {
  if (price <= 0) return farLabel;
  return formatPrice(price);
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

function legPositionSize(
  e: Trade["entries"][number],
  leverage: number
): number {
  return e.notional_usd ?? (e.margin_usd ?? 0) * leverage;
}

function hasAveragingDetail(trade: Trade, showAveraging: boolean): boolean {
  if (!showAveraging) return false;
  return trade.avg_count > 0 || trade.entries.length > 1;
}

const TH =
  "py-2.5 px-3 font-medium whitespace-nowrap sticky top-0 z-10 bg-[#0b1220] shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]";
const TD = "py-2.5 px-3 align-top";

function tableColumnCount(showAveraging: boolean): number {
  return showAveraging ? 11 : 9;
}

function TradeDetailPanel({
  trade,
  tradeIndex,
  locale,
  labels,
}: {
  trade: Trade;
  tradeIndex: number;
  locale: Locale;
  labels: ReturnType<typeof useLocale>["t"];
}) {
  return (
    <div className="trade-detail-panel mx-2 my-2 p-4 bg-panel-inner rounded-xl border border-border/60 text-sm space-y-3">
      <h3 className="font-semibold text-accent">
        {trade.symbol?.replace("USDT", "")} — сделка #{tradeIndex + 1}
        <span className="text-gray-500 font-normal ml-2">
          · усреднений: {trade.avg_count}
        </span>
      </h3>
      <div className="space-y-2">
        {trade.entries.map((e, i) => (
          <div
            key={i}
            className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-gray-300 border-b border-border/40 pb-2 last:border-0 last:pb-0"
          >
            <span>
              <span className="text-gray-500">
                {i === 0
                  ? labels.trades.entryLeg
                  : formatTpl(labels.trades.avgLeg, { n: i })}
                :
              </span>{" "}
              {formatTime(e.time, locale)} · {formatPrice(e.price)}
            </span>
            <span className="text-accent text-right">
              <span className="block tabular-nums">
                {legPositionSize(e, trade.leverage).toFixed(2)}
              </span>
              <span className="text-gray-500 text-xs">
                {e.pct_of_deposit}% банка × {trade.leverage}x плечо
              </span>
              <span className="text-red-400/80 text-xs block mt-0.5">
                ликв. {formatLiqPrice(e.liq_price, labels.trades.liqFar)}
              </span>
            </span>
          </div>
        ))}
      </div>
      {(trade.final_liq_price ?? trade.liq_price) > 0 && (
        <p className="text-xs text-gray-500">
          Ликв. позиции:{" "}
          {formatLiqPrice(
            trade.final_liq_price ?? trade.liq_price,
            labels.trades.liqFar
          )}
        </p>
      )}
      {(trade.is_open || trade.status === "open") && trade.target_exit_price != null && (
        <p className="text-xs text-amber-400/90 border border-amber-700/40 rounded-lg p-2">
          Выход по TP: {formatPrice(trade.target_exit_price)} — ещё не произошёл
          {trade.mark_price != null && (
            <> . Цена на конец периода: {formatPrice(trade.mark_price)}</>
          )}
        </p>
      )}
    </div>
  );
}

function NumCell({
  value,
  sub,
  className = "text-gray-100",
  title,
}: {
  value: ReactNode;
  sub?: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <td className={`${TD} text-right tabular-nums`} title={title}>
      <div className={`flex flex-col items-end leading-snug ${className}`}>
        <span className="whitespace-nowrap">{value}</span>
        {sub ? (
          <span className="text-[10px] text-muted font-normal normal-case tracking-normal whitespace-nowrap">
            {sub}
          </span>
        ) : null}
      </div>
    </td>
  );
}

export function TradesTable({
  trades,
  account,
  onSelect,
  selected,
  showAveraging = false,
}: Props) {
  const { t: labels, locale } = useLocale();

  if (trades.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8 text-sm">
        {labels.trades.empty}
      </div>
    );
  }

  const lastIndex = trades.length - 1;
  const hasOpen = trades.some((t) => t.is_open || t.status === "open");
  const lastClosedIndex = trades.reduce(
    (idx, t, i) => (!(t.is_open || t.status === "open") ? i : idx),
    -1
  );
  const summaryRowIndex = hasOpen && lastClosedIndex >= 0 ? lastClosedIndex : lastIndex;
  const colSpan = tableColumnCount(showAveraging);

  const renderDetailRow = (trade: Trade, index: number) =>
    selected === index &&
    hasAveragingDetail(trade, showAveraging) && (
      <tr key={`detail-${index}`} className="border-b border-border/30">
        <td colSpan={colSpan} className="p-0 bg-panel-inner/30">
          <TradeDetailPanel
            trade={trade}
            tradeIndex={index}
            locale={locale}
            labels={labels}
          />
        </td>
      </tr>
    );

  return (
    <div className="trades-table-scroll overflow-x-auto">
      <table className="w-full text-sm border-separate border-spacing-0 table-fixed min-w-[720px]">
        <thead>
          <tr className="label-caps border-b border-border/60">
            <th className={`${TH} text-right w-10`}>#</th>
            <th className={`${TH} text-left w-[4.5rem]`}>{labels.trades.coin}</th>
            <th className={`${TH} text-right w-[6.5rem]`}>{labels.trades.entryPrice}</th>
            {showAveraging && (
              <>
                <th className={`${TH} text-center w-12`}>{labels.trades.avg}</th>
                <th className={`${TH} text-right w-[6rem]`}>{labels.trades.average}</th>
              </>
            )}
            <th
              className={`${TH} text-right w-[5.5rem]`}
              title={labels.trades.positionTitle}
            >
              {labels.trades.position}
            </th>
            <th
              className={`${TH} text-right w-[7rem]`}
              title={labels.trades.exitTitle}
            >
              {labels.trades.exit}
            </th>
            <th
              className={`${TH} text-right w-[5.5rem]`}
              title={labels.trades.accountTitle}
            >
              {labels.trades.account}
            </th>
            <th
              className={`${TH} text-right w-[4.5rem]`}
              title={labels.trades.pnlTitle}
            >
              {labels.trades.pnl}
            </th>
            <th
              className={`${TH} text-right w-[4.5rem]`}
              title={labels.trades.pnlPctTitle}
            >
              {labels.trades.pnlPct}
            </th>
            <th className={`${TH} text-left w-[5.5rem]`}>{labels.trades.status}</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade, i) => {
            const isOpen = trade.is_open || trade.status === "open";
            const targetExit = trade.target_exit_price ?? null;
            const markNow = trade.mark_price ?? null;
            const exitPrice = isOpen ? targetExit : trade.exit_price;
            const firstEntry = trade.entry_price ?? trade.entries[0]?.price ?? trade.avg_price;
            const entryTime = trade.entries[0]?.time ?? trade.opened_at;
            const totalNotional = tradeNotional(trade);
            const exitBelowEntry =
              !isOpen && exitPrice != null && exitPrice < firstEntry;
            const netPnl =
              trade.net_pnl_usd ??
              trade.pnl_usd - (trade.fees_paid ?? 0) - (trade.funding_paid ?? 0);
            const netPnlPct =
              totalNotional > 0 ? (netPnl / totalNotional) * 100 : trade.pnl_pct;

            const isSummaryRow = i === summaryRowIndex && !isOpen;

            const showDetail = hasAveragingDetail(trade, showAveraging);

            return (
              <Fragment key={i}>
                <tr
                  onClick={() => {
                    if (!showDetail) return;
                    onSelect?.(selected === i ? null : i);
                  }}
                  className={`border-b border-border/30 hover:bg-panel-inner/80 ${
                    showDetail ? "cursor-pointer" : ""
                  } ${selected === i ? "bg-accent/5" : ""} ${
                    isSummaryRow ? "bg-accent/5" : ""
                  }`}
                >
                <td className={`${TD} text-right tabular-nums text-muted`}>{i + 1}</td>
                <td className={`${TD} text-left font-medium text-accent`}>
                  {trade.symbol?.replace("USDT", "") ?? "—"}
                </td>
                <NumCell
                  className="text-green-400/90"
                  value={formatPrice(firstEntry)}
                  sub={entryTime ? formatTime(entryTime, locale) : undefined}
                />
                {showAveraging && (
                  <>
                    <td className={`${TD} text-center tabular-nums text-yellow-400/90`}>
                      {trade.avg_count > 0 ? trade.avg_count : "—"}
                    </td>
                    <NumCell
                      className="text-blue-400/90"
                      value={formatPrice(trade.avg_price)}
                    />
                  </>
                )}
                <NumCell
                  className="font-medium text-accent"
                  value={totalNotional.toFixed(2)}
                  sub={`${trade.leverage}x`}
                />
                <NumCell
                  className={
                    isOpen
                      ? "text-amber-300/90"
                      : exitBelowEntry
                      ? "text-amber-300"
                      : "text-gray-200"
                  }
                  title={
                    isOpen
                      ? `${labels.trades.tpTarget}: ${markNow != null ? formatPrice(markNow) : "—"}`
                      : exitBelowEntry
                      ? labels.trades.exitBelowAvgHint
                      : undefined
                  }
                  value={exitPrice != null ? formatPrice(exitPrice) : "—"}
                  sub={
                    !isOpen && trade.closed_at
                      ? formatTime(trade.closed_at, locale)
                      : isOpen
                      ? markNow != null
                        ? formatPrice(markNow)
                        : labels.trades.tpTarget
                      : exitBelowEntry
                      ? labels.trades.belowEntry
                      : undefined
                  }
                />
                <NumCell
                  className="font-medium text-accent"
                  value={trade.bank_at_close.toFixed(2)}
                />
                <NumCell
                  className={pnlClass(netPnl, isOpen)}
                  value={
                    <>
                      {isOpen && <span className="text-muted not-italic">~</span>}$
                      {netPnl.toFixed(2)}
                    </>
                  }
                />
                <NumCell
                  className={pnlClass(netPnlPct, isOpen)}
                  value={
                    <>
                      {isOpen && <span className="text-muted not-italic">~</span>}
                      {netPnlPct.toFixed(2)}%
                    </>
                  }
                />
                <td className={`${TD} text-left`}>
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      isOpen
                        ? "bg-amber-900/50 text-amber-300"
                        : trade.status === "liquidated"
                        ? "bg-red-900/50 text-red-300"
                        : netPnl >= 0
                        ? "bg-green-900/50 text-green-300"
                        : "bg-gray-800 text-gray-300"
                    }`}
                  >
                    {isOpen
                      ? labels.trades.active
                      : trade.close_reason === "take_profit"
                      ? "TP"
                      : trade.close_reason === "stop_loss"
                      ? "SL"
                      : trade.close_reason === "trailing"
                      ? labels.trades.trailing
                      : trade.close_reason === "liquidation"
                      ? labels.trades.liquidated
                      : trade.close_reason || trade.status}
                  </span>
                </td>
              </tr>
              {renderDetailRow(trade, i)}
            </Fragment>
            );
          })}
        </tbody>
      </table>

      {account && (
        <div className="mt-4 pt-3 border-t border-border text-sm space-y-1">
          {(() => {
            const realizedUsd = account.closedNetPnlUsd ?? 0;
            return (
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                <span className="text-gray-400">{labels.app.realizedPnl}</span>
                <span
                  className={
                    realizedUsd >= 0 ? "text-green-400" : "text-red-400"
                  }
                >
                  {realizedUsd >= 0 ? "+" : ""}${realizedUsd.toFixed(2)}
                </span>
              </div>
            );
          })()}
          {hasOpen && account.openNetPnlUsd != null && (
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs">
              <span className="text-gray-400">{labels.app.unrealizedPnl}</span>
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
        </div>
      )}
    </div>
  );
}
