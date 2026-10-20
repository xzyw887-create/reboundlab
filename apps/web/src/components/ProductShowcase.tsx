"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
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
}: {
  m: Mocks;
  demo: ProductShowcaseDemo;
  trades: Dictionary["trades"];
}) {
  const rows = demo.tableRows.slice(0, 5);
  return (
    <div className="feature-sheet" aria-hidden>
      <div className="feature-sheet-bar">
        <span>{m.tradesTitle}</span>
        <span className="mono">
          {rows.length} {m.tradesClosedSuffix}
        </span>
      </div>
      <table className="feature-sheet-table">
        <thead>
          <tr>
            <th>{tr.coin}</th>
            <th>{tr.entryPrice}</th>
            <th>{tr.exit}</th>
            <th>{tr.pnl}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td className="feature-sheet-coin">{row.coin}</td>
              <td className="mono">{row.entry}</td>
              <td className="mono">{row.exit}</td>
              <td className={`mono ${row.pnl >= 0 ? "feature-sheet-pos" : "feature-sheet-neg"}`}>
                {fmtSignedUsd(row.pnl)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MockResults({
  demo,
  report,
}: {
  demo: ProductShowcaseDemo;
  report: Dictionary["report"];
}) {
  const r = demo.report;
  const stats = [
    [report.winRate, `${r.winRatePct}%`],
    [report.maxDrawdown, `−${r.maxDdPct.toFixed(1)}%`],
    [report.totalFees, `$${r.feesUsd.toFixed(2)}`],
    [report.totalFunding, fmtSignedUsd(r.fundingUsd)],
  ];
  return (
    <div className="feature-sheet" aria-hidden>
      <div className="feature-sheet-pnl">
        <span>PnL</span>
        <strong className={r.netPnlUsd >= 0 ? "feature-sheet-pos" : "feature-sheet-neg"}>
          {fmtSignedUsd(r.netPnlUsd)}
        </strong>
      </div>
      <svg viewBox="0 0 360 96" className="feature-sheet-chart" aria-hidden>
        <path d={r.equityPath} fill="none" stroke="#22d3ee" strokeWidth="2.4" />
      </svg>
      <div className="feature-sheet-stats">
        {stats.map(([label, value]) => (
          <div key={String(label)} className="feature-sheet-stat">
            <span>{label}</span>
            <strong className="mono">{value}</strong>
          </div>
        ))}
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
        <MockTradesTable m={m} demo={demo} trades={dict.trades} />
      );
    case 2:
      return <MockResults demo={demo} report={dict.report} />;
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
  const [demo, setDemo] = useState<ProductShowcaseDemo | null>(null);

  useEffect(() => {
    setDemo(generateProductShowcaseDemo());
  }, []);

  return (
    <section id="features" className="feature-stage-section product-showcase scroll-mt-24">
      <div className="landing-container">
        <p className="page-kicker text-center">{ps.label}</p>
        {demo && (
          <div className="feature-stage">
            {ps.slides.slice(0, 3).map((slide, index) => (
              <div key={slide.eyebrow} className="feature-stage-item">
                <article className="feature-stage-card">
                  <p className="feature-stage-pill">
                    <span>{slide.eyebrow}</span>
                  </p>
                  <h3 className="feature-stage-title">{slide.title}</h3>
                  <div className="feature-stage-visual">
                    <SlideVisual index={index} m={ps.mocks} demo={demo} dict={t} />
                  </div>
                </article>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
