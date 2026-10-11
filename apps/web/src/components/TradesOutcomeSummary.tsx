import type { BacktestResult } from "@/lib/types";
import { useLocale } from "@/lib/i18n";

type Summary = BacktestResult["summary"];

export function tradeOutcomeCounts(s: Summary) {
  const open = s.open_trades ?? 0;
  const closed = s.closed_trades ?? s.total_trades - open;
  const winning = s.winning_trades;
  const losing = Math.max(0, closed - winning);
  return { winning, losing, open };
}

export function TradesOutcomeSummary({ summary }: { summary: Summary }) {
  const { t } = useLocale();
  const { winning, losing, open } = tradeOutcomeCounts(summary);

  return (
    <p className="text-xs text-muted flex flex-wrap items-center gap-x-3 gap-y-1">
      <span>
        {t.app.tradesWin}:{" "}
        <span className="text-green-400/90 font-medium tabular-nums">{winning}</span>
      </span>
      <span className="text-border/80 hidden sm:inline">·</span>
      <span>
        {t.app.tradesLoss}:{" "}
        <span className="text-red-400/90 font-medium tabular-nums">{losing}</span>
      </span>
      <span className="text-border/80 hidden sm:inline">·</span>
      <span>
        {t.app.tradesOpenCount}:{" "}
        <span
          className={
            open > 0
              ? "text-amber-300/90 font-medium tabular-nums"
              : "text-gray-400 font-medium tabular-nums"
          }
        >
          {open}
        </span>
      </span>
    </p>
  );
}
