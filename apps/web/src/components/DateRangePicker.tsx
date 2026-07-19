"use client";

import type { DateCoverage } from "@/lib/dateCoverage";
import { formatCoverageDays } from "@/lib/dateCoverage";

interface Props {
  startDate: string;
  endDate: string;
  coverage: DateCoverage | null;
  planLabel?: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}

function CoinRangeRow({
  symbol,
  from,
  to,
  dataFrom,
  lateStart,
  runFrom,
}: {
  symbol: string;
  from: string;
  to: string;
  dataFrom: string;
  lateStart: boolean;
  runFrom: string;
}) {
  const short = symbol.replace("USDT", "");
  return (
    <div className="flex flex-col gap-0.5 text-[11px]">
      <div className="flex items-center gap-2">
        <span className="w-12 shrink-0 text-gray-500 font-medium">{short}</span>
        <span className={lateStart ? "text-gray-500" : "text-accent font-medium"}>
          {from} — {to}
        </span>
      </div>
      {lateStart && (
        <p className="pl-14 text-[10px] text-gold/95">
          Торговля с {from} — до этого в прогоне нет сделок по {short}
          {dataFrom < runFrom ? ` (листинг ${dataFrom})` : ""}
        </p>
      )}
    </div>
  );
}

export function DateRangePicker({
  startDate,
  endDate,
  coverage,
  planLabel,
  onStartChange,
  onEndChange,
}: Props) {
  if (!coverage) {
    return (
      <p className="text-xs text-gold/90 rounded-lg border border-gold/30 bg-gold/5 p-2.5">
        Нет загруженных свечей для выбранных монет в рамках вашего тарифа. Выберите
        другие монеты или дождитесь загрузки данных.
      </p>
    );
  }

  const days = formatCoverageDays(coverage.from, coverage.to);
  const multi = coverage.perCoin.length > 1;
  const lateCoins = coverage.perCoin.filter((c) => c.lateStart);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-accent/25 bg-accent/5 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-medium text-accent">
            Активные даты для прогона
          </span>
          <span className="text-[10px] text-muted">
            {days} {days === 1 ? "день" : days < 5 ? "дня" : "дней"} свечей 1m
          </span>
        </div>

        {planLabel && (
          <p className="text-[10px] text-muted">
            Тариф {planLabel}: доступно {coverage.planWindow.from} —{" "}
            {coverage.planWindow.to}
          </p>
        )}

        <div className="relative h-2 rounded-full bg-gray-700/80 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 right-0 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, rgba(55,65,81,0.9) 0%, var(--accent-cyan) 8%, var(--accent-cyan) 92%, rgba(55,65,81,0.9) 100%)",
            }}
            title={`Доступно: ${coverage.from} — ${coverage.to}`}
          />
        </div>

        <div className="flex justify-between text-[10px]">
          <span className="text-accent font-semibold">{coverage.from}</span>
          <span className="text-gray-600">серое = нет данных</span>
          <span className="text-accent font-semibold">{coverage.to}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1">
          <span className="label-caps">Начало</span>
          <input
            type="date"
            className="date-range-input w-full"
            value={startDate}
            min={coverage.from}
            max={coverage.to}
            onChange={(e) => onStartChange(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="label-caps">Конец</span>
          <input
            type="date"
            className="date-range-input w-full"
            value={endDate}
            min={startDate < coverage.from ? coverage.from : startDate}
            max={coverage.to}
            onChange={(e) => onEndChange(e.target.value)}
          />
        </label>
      </div>

      <p className="text-[11px] text-muted">
        В календаре{" "}
        <span className="text-accent">голубые даты</span> — можно выбрать,{" "}
        <span className="text-gray-500">серые</span> — недоступны.
        {multi &&
          " Общий прогон — с даты, когда история есть у всех выбранных монет."}
      </p>

      {multi && lateCoins.length > 0 && (
        <p className="text-[11px] text-gold/95 rounded-lg border border-gold/30 bg-gold/5 p-2">
          {lateCoins.map((c) => c.symbol.replace("USDT", "")).join(", ")}{" "}
          {lateCoins.length === 1 ? "начнёт" : "начнут"} торговать позже общего старта
          прогона ({coverage.from}).
        </p>
      )}

      {multi && (
        <div className="rounded-lg border border-border/50 bg-panel-inner/40 p-2.5 space-y-1.5">
          <p className="text-[10px] label-caps mb-1">По монетам</p>
          {coverage.perCoin.map((c) => (
            <CoinRangeRow
              key={c.symbol}
              symbol={c.symbol}
              from={c.from}
              to={c.to}
              dataFrom={c.data_from}
              lateStart={c.lateStart}
              runFrom={coverage.from}
            />
          ))}
          <p className="text-[10px] text-accent/90 pt-1 border-t border-border/40 mt-1">
            Общий прогон: {coverage.from} — {coverage.to}
          </p>
        </div>
      )}
    </div>
  );
}
