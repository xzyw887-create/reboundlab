"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import { useLocale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/en";
import { productShowcaseImages } from "@/lib/productShowcaseImages";
import {
  generateProductShowcaseDemo,
  type ProductShowcaseDemo,
} from "@/lib/productShowcaseDemo";

type Mocks = Dictionary["landing"]["productShowcase"]["mocks"];

function fmtSignedUsd(n: number): string {
  const sign = n >= 0 ? "+" : "−";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function fmtSignedPct(n: number): string {
  const sign = n >= 0 ? "+" : "−";
  return `${sign}${Math.abs(n).toFixed(2)}%`;
}

function MockChartTrades({
  m,
  demo,
  labels,
}: {
  m: Mocks;
  demo: ProductShowcaseDemo;
  labels: Dictionary["app"];
}) {
  const gradId = useId();
  return (
    <div className="product-mock product-mock--chart" aria-hidden>
      <div className="product-mock-summary">
        <div className="product-mock-kpi">
          <span className="product-mock-kpi-label">{labels.deposit}</span>
          <span className="mono text-gray-100">${demo.deposit.toFixed(0)}</span>
        </div>
        <div className="product-mock-kpi">
          <span className="product-mock-kpi-label">{labels.result}</span>
          <span className="mono text-gray-100">${demo.finalBalance.toFixed(2)}</span>
        </div>
        <div className="product-mock-kpi">
          <span className="product-mock-kpi-label">{labels.profit}</span>
          <span className="mono text-emerald-400">{fmtSignedPct(demo.profitPct)}</span>
        </div>
      </div>
      <div className="product-mock-bar">
        <span className="mono text-muted">{demo.pairLabel}</span>
        <span className="mono text-muted">
          {demo.chart.markers.length} {m.markersLabel}
        </span>
      </div>
      <svg viewBox={`0 0 ${360} ${140}`} className="w-full h-auto">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(37, 99, 235, 0.2)" />
            <stop offset="100%" stopColor="rgba(37, 99, 235, 0)" />
          </linearGradient>
        </defs>
        {[35, 70, 105].map((y) => (
          <line key={y} x1="0" y1={y} x2="360" y2={y} stroke="#2a3038" strokeWidth="1" />
        ))}
        <path d={demo.chart.areaPath} fill={`url(#${gradId})`} />
        <path d={demo.chart.pricePath} fill="none" stroke="#2563eb" strokeWidth="2" />
        {demo.chart.markers.map((mark, i) => (
          <circle
            key={i}
            cx={mark.x}
            cy={mark.y}
            r="5"
            fill={mark.kind === "buy" ? "#22c55e" : "#ef4444"}
            stroke="#0f1114"
            strokeWidth="2"
          />
        ))}
      </svg>
      <p className="product-mock-caption mono">{m.chartCaption}</p>
    </div>
  );
}

function MockTradesTable({
  m,
  demo,
  trades: tr,
  exportCols,
}: {
  m: Mocks;
  demo: ProductShowcaseDemo;
  trades: Dictionary["trades"];
  exportCols: Dictionary["exportPage"]["columns"];
}) {
  return (
    <div className="product-mock product-mock--trades" aria-hidden>
      <div className="product-mock-bar">
        <span>{m.tradesTitle}</span>
        <span className="mono text-muted">
          {demo.closedCount} {m.tradesClosedSuffix}
        </span>
      </div>
      <div className="product-mock-table-scroll">
        <table className="product-mock-table product-mock-table--wide">
          <thead>
            <tr>
              <th>{tr.coin}</th>
              <th>{tr.entryPrice}</th>
              <th>{tr.position}</th>
              <th>{tr.exit}</th>
              <th>{tr.account}</th>
              <th>{tr.pnl}</th>
              <th>{tr.pnlPct}</th>
              <th>{tr.status}</th>
            </tr>
          </thead>
          <tbody className="mono">
            {demo.tableRows.map((row, i) => (
              <tr key={i}>
                <td className="text-accent">{row.coin}</td>
                <td>{row.entry}</td>
                <td>{row.position}</td>
                <td>{row.exit}</td>
                <td>{row.account}</td>
                <td className={row.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {fmtSignedUsd(row.pnl)}
                </td>
                <td className={row.pnlPct >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {fmtSignedPct(row.pnlPct)}
                </td>
                <td className="text-muted">{exportCols.closed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MockCompare({ m, demo }: { m: Mocks; demo: ProductShowcaseDemo }) {
  const cols = [
    { label: m.runA, run: demo.compareA },
    { label: m.runB, run: demo.compareB },
  ];
  return (
    <div className="product-mock product-mock--compare" aria-hidden>
      <div className="grid grid-cols-2 gap-2">
        {cols.map(({ label, run }) => (
          <div key={label} className="product-mock-compare-col">
            <p className="label-caps text-muted mb-2">{label}</p>
            <p className="mono text-lg text-emerald-400">{fmtSignedPct(run.profitPct)}</p>
            <ul className="mt-3 space-y-1 text-xs text-muted mono">
              <li>
                {m.metricTrades}: {run.trades}
              </li>
              <li>
                {m.metricDd}: −{run.maxDdPct.toFixed(1)}%
              </li>
              <li>
                {m.metricWin}: {run.winRatePct}%
              </li>
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockPnlReport({
  m,
  demo,
  report,
  appLabels,
}: {
  m: Mocks;
  demo: ProductShowcaseDemo;
  report: Dictionary["report"];
  appLabels: Dictionary["app"];
}) {
  const r = demo.report;
  return (
    <div className="product-mock" aria-hidden>
      <div className="product-mock-bar">
        <span>{appLabels.equityCurve}</span>
        <span className="mono text-emerald-400">{fmtSignedUsd(r.netPnlUsd)}</span>
      </div>
      <svg viewBox="0 0 360 80" className="w-full h-auto mb-3 px-1">
        <path d={r.equityPath} fill="none" stroke="#22c55e" strokeWidth="2" />
      </svg>
      <div className="product-mock-metrics">
        {[
          [report.maxDrawdown, `−${r.maxDdPct.toFixed(1)}%`],
          [report.winRate, `${r.winRatePct}%`],
          [report.avgTrade, fmtSignedUsd(r.avgTradeUsd)],
          [report.totalFees, `$${r.feesUsd.toFixed(2)}`],
          [report.totalFunding, fmtSignedUsd(r.fundingUsd)],
        ].map(([k, v]) => (
          <div key={String(k)} className="product-mock-metric">
            <p className="product-mock-metric-label">{k}</p>
            <p className="mono text-sm text-gray-100">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideVisual({
  index,
  m,
  demo,
  dict,
}: {
  index: number;
  m: Mocks;
  demo: ProductShowcaseDemo;
  dict: Dictionary;
}) {
  const src = productShowcaseImages[index];
  if (src) {
    return (
      <div className="product-mock product-mock--screenshot" aria-hidden>
        <Image
          src={src}
          alt=""
          width={960}
          height={540}
          className="w-full h-auto rounded-sm"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>
    );
  }

  switch (index) {
    case 0:
      return <MockChartTrades m={m} demo={demo} labels={dict.app} />;
    case 1:
      return (
        <MockTradesTable
          m={m}
          demo={demo}
          trades={dict.trades}
          exportCols={dict.exportPage.columns}
        />
      );
    case 2:
      return <MockCompare m={m} demo={demo} />;
    case 3:
      return (
        <MockPnlReport m={m} demo={demo} report={dict.report} appLabels={dict.app} />
      );
    default:
      return null;
  }
}

export function ProductShowcase() {
  const { t } = useLocale();
  const ps = t.landing.productShowcase;
  const [demo] = useState(() => generateProductShowcaseDemo());

  return (
    <section id="features" className="landing-section product-showcase">
      <div className="landing-container">
        <div className="max-w-2xl mb-12 md:mb-16 space-y-3">
          <p className="label-caps">{ps.label}</p>
          <h2 className="text-2xl sm:text-3xl font-medium text-gray-50 leading-snug">{ps.title}</h2>
          <p className="text-muted leading-relaxed">{ps.lead}</p>
        </div>

        <div className="product-showcase-stack">
          {ps.slides.map((slide, index) => {
            const reverse = index % 2 === 1;
            return (
              <article
                key={slide.eyebrow}
                className={`product-showcase-row${reverse ? " product-showcase-row--reverse" : ""}`}
              >
                <div className="product-showcase-copy space-y-4">
                  <p className="label-caps text-accent">{slide.eyebrow}</p>
                  <h3 className="text-xl sm:text-2xl font-medium text-gray-50 leading-snug">
                    {slide.title}
                  </h3>
                  <p className="text-sm sm:text-base text-muted leading-relaxed max-w-md">
                    {slide.body}
                  </p>
                </div>
                <div className="product-showcase-visual-frame">
                  <div
                    className={`product-showcase-visual${
                      index === 1 ? " product-showcase-visual--table" : ""
                    }`}
                  >
                    <SlideVisual index={index} m={ps.mocks} demo={demo} dict={t} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <nav
          className="mt-14 flex flex-wrap gap-3 justify-center sm:justify-start"
          aria-label={ps.quickNavLabel}
        >
          <Link href="/how-it-works" className="landing-btn-outline inline-flex px-6">
            {t.nav.howItWorks}
          </Link>
          <Link href="/help" className="landing-btn-outline inline-flex px-6">
            {t.nav.help}
          </Link>
        </nav>
      </div>
    </section>
  );
}
