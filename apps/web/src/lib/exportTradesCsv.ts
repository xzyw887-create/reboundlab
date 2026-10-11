import type { Trade } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import { en } from "@/lib/i18n/en";
import { ru } from "@/lib/i18n/ru";
import type { TradesExportPayload } from "@/lib/tradesExportSession";

function escapeCsv(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tradeNetPnl(t: Trade): number {
  if (t.net_pnl_usd != null) return t.net_pnl_usd;
  return t.pnl_usd - t.fees_paid - (t.funding_paid ?? 0);
}

export function tradeNetPnlUsd(t: Trade): number {
  return tradeNetPnl(t);
}

export function buildTradesCsv(trades: Trade[]): string {
  const headers = [
    "symbol",
    "opened_at",
    "closed_at",
    "status",
    "close_reason",
    "entry_price",
    "exit_price",
    "avg_price",
    "leverage",
    "margin_usd",
    "pnl_usd",
    "net_pnl_usd",
    "fees_paid",
    "funding_paid",
  ];

  const rows = trades.map((t) =>
    [
      t.symbol ?? "",
      t.opened_at,
      t.closed_at ?? "",
      t.status,
      t.close_reason ?? "",
      t.entry_price,
      t.exit_price ?? "",
      t.avg_price,
      t.leverage,
      t.total_margin,
      t.pnl_usd,
      tradeNetPnl(t),
      t.fees_paid,
      t.funding_paid ?? 0,
    ]
      .map(escapeCsv)
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

export function downloadTradesCsv(trades: Trade[], filename: string): void {
  const csv = buildTradesCsv(trades);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTpl(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

function pnlColor(value: number): string {
  return value >= 0 ? "#4ade80" : "#f87171";
}

export function buildTradesExportHtml(
  payload: TradesExportPayload,
  locale: Locale
): string {
  const copy = locale === "ru" ? ru.exportPage : en.exportPage;
  const cols = copy.columns;
  const { trades, filename, periodStart, periodEnd } = payload;
  const csvJson = JSON.stringify(buildTradesCsv(trades));
  const filenameJson = JSON.stringify(filename);

  const metaLines = [
    periodStart || periodEnd
      ? formatTpl(copy.period, {
          start: periodStart ?? "—",
          end: periodEnd ?? "—",
        })
      : "",
    formatTpl(copy.tradesCount, { count: String(trades.length) }),
  ].filter(Boolean);

  const rowsHtml = trades
    .map((trade, i) => {
      const net = tradeNetPnl(trade);
      const cells = [
        trade.symbol ?? "—",
        formatTime(trade.opened_at, locale),
        trade.closed_at ? formatTime(trade.closed_at, locale) : "—",
        trade.status,
        trade.close_reason ?? "—",
        formatPrice(trade.entry_price),
        trade.exit_price != null ? formatPrice(trade.exit_price) : "—",
        formatPrice(trade.avg_price),
        `${trade.leverage}x`,
        trade.total_margin.toFixed(2),
        `${trade.pnl_usd >= 0 ? "+" : ""}${trade.pnl_usd.toFixed(2)}`,
        `${net >= 0 ? "+" : ""}${net.toFixed(2)}`,
        trade.fees_paid.toFixed(2),
        (trade.funding_paid ?? 0).toFixed(2),
      ];

      const pnlStyle = `color:${pnlColor(trade.pnl_usd)}`;
      const netStyle = `color:${pnlColor(net)}`;

      return `<tr>
        <td>${escapeHtml(cells[0])}</td>
        <td>${escapeHtml(cells[1])}</td>
        <td>${escapeHtml(cells[2])}</td>
        <td>${escapeHtml(cells[3])}</td>
        <td>${escapeHtml(cells[4])}</td>
        <td class="num">${escapeHtml(cells[5])}</td>
        <td class="num">${escapeHtml(cells[6])}</td>
        <td class="num">${escapeHtml(cells[7])}</td>
        <td class="num">${escapeHtml(cells[8])}</td>
        <td class="num">${escapeHtml(cells[9])}</td>
        <td class="num" style="${pnlStyle}">${escapeHtml(cells[10])}</td>
        <td class="num" style="${netStyle}">${escapeHtml(cells[11])}</td>
        <td class="num">${escapeHtml(cells[12])}</td>
        <td class="num">${escapeHtml(cells[13])}</td>
      </tr>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(copy.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, system-ui, -apple-system, sans-serif;
      background: #0b0f14;
      color: #e5e7eb;
      line-height: 1.4;
    }
    header {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      background: rgba(11,15,20,0.95);
      backdrop-filter: blur(8px);
    }
    h1 { margin: 0; font-size: 16px; font-weight: 600; }
    .meta { margin: 2px 0 0; font-size: 12px; color: #9ca3af; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    button {
      border: 0;
      border-radius: 10px;
      padding: 8px 14px;
      font-size: 14px;
      cursor: pointer;
    }
    .btn-primary {
      background: linear-gradient(135deg, #0ea5e9, #0284c7);
      color: white;
      font-weight: 600;
    }
    .btn-ghost {
      background: rgba(255,255,255,0.06);
      color: #d1d5db;
    }
    main { padding: 16px; max-width: 1600px; margin: 0 auto; }
    .table-wrap {
      overflow-x: auto;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
    }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead { background: rgba(255,255,255,0.04); color: #9ca3af; }
    th, td { padding: 10px 12px; white-space: nowrap; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); }
    th.num, td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody tr:hover { background: rgba(255,255,255,0.03); }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>${escapeHtml(copy.title)}</h1>
      ${metaLines.map((line) => `<p class="meta">${escapeHtml(line)}</p>`).join("")}
    </div>
    <div class="actions">
      <button type="button" class="btn-primary" id="download-btn">${escapeHtml(copy.downloadCsv)}</button>
      <button type="button" class="btn-ghost" onclick="window.close()">${escapeHtml(copy.closeTab)}</button>
    </div>
  </header>
  <main>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>${escapeHtml(cols.symbol)}</th>
            <th>${escapeHtml(cols.opened)}</th>
            <th>${escapeHtml(cols.closed)}</th>
            <th>${escapeHtml(cols.status)}</th>
            <th>${escapeHtml(cols.reason)}</th>
            <th class="num">${escapeHtml(cols.entry)}</th>
            <th class="num">${escapeHtml(cols.exit)}</th>
            <th class="num">${escapeHtml(cols.avg)}</th>
            <th class="num">${escapeHtml(cols.leverage)}</th>
            <th class="num">${escapeHtml(cols.margin)}</th>
            <th class="num">${escapeHtml(cols.pnl)}</th>
            <th class="num">${escapeHtml(cols.netPnl)}</th>
            <th class="num">${escapeHtml(cols.fees)}</th>
            <th class="num">${escapeHtml(cols.funding)}</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  </main>
  <script>
    (function () {
      var csv = ${csvJson};
      var filename = ${filenameJson};
      document.getElementById("download-btn").addEventListener("click", function () {
        var blob = new Blob(["\\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      });
    })();
  </script>
</body>
</html>`;
}

export function openTradesExportPage(
  trades: Trade[],
  options: {
    filename: string;
    periodStart?: string;
    periodEnd?: string;
    locale?: Locale;
  }
): void {
  if (typeof window === "undefined" || trades.length === 0) return;

  const payload: TradesExportPayload = {
    trades,
    filename: options.filename,
    periodStart: options.periodStart,
    periodEnd: options.periodEnd,
  };

  const html = buildTradesExportHtml(payload, options.locale ?? "ru");
  const popup = window.open("", "_blank");

  if (!popup) {
    downloadTradesCsv(trades, options.filename);
    return;
  }

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}
