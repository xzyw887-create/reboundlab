"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n";

const CHART_W = 400;
const CHART_H = 140;
const PATH_LEN = 100;

type TradeKind = "buy" | "sell";

type PreviewMarker = {
  x: number;
  y: number;
  kind: TradeKind;
  delay: number;
};

type PreviewScene = {
  pricePath: string;
  areaPath: string;
  markers: PreviewMarker[];
  stats: { pnl: number; trades: number; maxDd: number };
};

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Momentum random walk — denser, less "polygon" feel */
function generateOrganicPoints(): [number, number][] {
  const count = Math.floor(rand(52, 78));
  const points: [number, number][] = [];
  let y = rand(44, 66);
  let velocity = rand(-2, 2);
  const center = rand(52, 62);

  for (let i = 0; i < count; i++) {
    const x = (i / (count - 1)) * CHART_W;
    const progress = i / (count - 1);

    velocity =
      velocity * rand(0.48, 0.62) +
      rand(-1, 1) * rand(2.2, 5.5) +
      Math.sin(i * rand(0.35, 0.7)) * rand(0.4, 1.2);

    if (Math.random() < 0.07) velocity += rand(-11, 7);
    if (Math.random() < 0.04) velocity += rand(-4, 4);

    y += velocity;
    y += (center - y) * rand(0.025, 0.055);
    y += Math.sin(progress * Math.PI * rand(1.2, 2.4)) * rand(-1.5, 1.5);

    points.push([x, clamp(y, 24, CHART_H - 16)]);
  }

  points[0] = [0, points[0][1]];
  points[points.length - 1] = [CHART_W, points[points.length - 1][1]];
  return points;
}

/** Catmull-Rom → cubic Bézier for a smooth price line */
function toSmoothPath(points: [number, number][], tension = 1): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]}`;
  }

  let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  const t = tension / 6;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1[0] + (p2[0] - p0[0]) * t;
    const cp1y = p1[1] + (p2[1] - p0[1]) * t;
    const cp2x = p2[0] - (p3[0] - p1[0]) * t;
    const cp2y = p2[1] - (p3[1] - p1[1]) * t;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }

  return d;
}

function localProminence(points: [number, number][], idx: number): number {
  const y = points[idx][1];
  let lo = y;
  let hi = y;
  for (let j = Math.max(0, idx - 3); j <= Math.min(points.length - 1, idx + 3); j++) {
    lo = Math.min(lo, points[j][1]);
    hi = Math.max(hi, points[j][1]);
  }
  return hi - lo;
}

function findTradeExtrema(points: [number, number][]): { idx: number; kind: TradeKind }[] {
  const raw: { idx: number; kind: TradeKind; score: number }[] = [];

  for (let i = 2; i < points.length - 2; i++) {
    const y0 = points[i - 1][1];
    const y1 = points[i][1];
    const y2 = points[i + 1][1];
    const prom = localProminence(points, i);
    if (prom < 6) continue;

    if (y1 < y0 && y1 < y2) raw.push({ idx: i, kind: "buy", score: prom });
    if (y1 > y0 && y1 > y2) raw.push({ idx: i, kind: "sell", score: prom });
  }

  raw.sort((a, b) => b.score - a.score);

  const picked: { idx: number; kind: TradeKind }[] = [];
  const minGap = Math.floor(points.length * 0.08);

  for (const candidate of raw) {
    if (picked.length >= Math.floor(rand(4, 7))) break;
    if (picked.some((p) => Math.abs(p.idx - candidate.idx) < minGap)) continue;
    if (picked.length > 0 && picked[picked.length - 1].kind === candidate.kind) continue;
    picked.push({ idx: candidate.idx, kind: candidate.kind });
  }

  picked.sort((a, b) => a.idx - b.idx);
  return picked;
}

function generatePreviewScene(): PreviewScene {
  const points = generateOrganicPoints();
  const pricePath = toSmoothPath(points);
  const areaPath = `${pricePath} L ${CHART_W} ${CHART_H} L 0 ${CHART_H} Z`;

  let picked = findTradeExtrema(points);
  if (picked.length < 2) {
    const fallbackIdx = [
      Math.floor(points.length * 0.22),
      Math.floor(points.length * 0.42),
      Math.floor(points.length * 0.62),
      Math.floor(points.length * 0.82),
    ];
    picked = fallbackIdx.map((idx, i) => ({
      idx: Math.min(idx, points.length - 2),
      kind: (i % 2 === 0 ? "buy" : "sell") as TradeKind,
    }));
  }

  const lineDrawSec = 3.15;
  const markers: PreviewMarker[] = picked.map((m) => ({
    x: points[m.idx][0],
    y: points[m.idx][1],
    kind: m.kind,
    delay: 0.35 + (points[m.idx][0] / CHART_W) * lineDrawSec,
  }));

  const pnl = Math.round(rand(4.2, 26.8) * 10) / 10;
  const trades = Math.floor(rand(19, 84));
  const maxDd = Math.floor(rand(4, 14));

  return {
    pricePath,
    areaPath,
    markers,
    stats: { pnl, trades, maxDd },
  };
}

/** Total preview choreography — line draw + last marker pop */
const PREVIEW_ANIM_MS = 7200;

function useCountUp(
  target: number,
  durationMs: number,
  decimals = 0,
  active: boolean
): string {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    let frame = 0;

    const tick = (ts: number) => {
      if (start == null) start = ts;
      const t = Math.min((ts - start) / durationMs, 1);
      const eased = 1 - (1 - t) ** 3;
      setValue(target * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    setValue(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, active]);

  return decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
}

export function TerminalPreview() {
  const { t } = useLocale();
  const [scene] = useState(() => generatePreviewScene());
  const [statsActive, setStatsActive] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const show = window.setTimeout(() => setStatsActive(true), 400);
    const done = window.setTimeout(() => setFinished(true), PREVIEW_ANIM_MS);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(done);
    };
  }, []);

  const { pnl, trades, maxDd } = scene.stats;
  const pnlDisplay = useCountUp(pnl, 1800, 1, statsActive);
  const tradesDisplay = useCountUp(trades, 1600, 0, statsActive);
  const maxDdDisplay = useCountUp(maxDd, 1400, 0, statsActive);

  return (
    <div
      className={`landing-preview card-pro landing-preview--animated${
        finished ? " landing-preview--done" : ""
      }`}
    >
      <div className="card-pro-body space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="landing-preview-live" aria-hidden />
            <span className="label-caps text-muted truncate">{t.landing.previewLabel}</span>
          </div>
          <span className="pill-tag">Pro</span>
        </div>

        <div className="landing-chart-mock landing-chart-mock--animated" aria-hidden>
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            className="landing-chart-svg"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="landing-chart-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(37, 99, 235, 0.18)" />
                <stop offset="100%" stopColor="rgba(37, 99, 235, 0)" />
              </linearGradient>
              <linearGradient id="landing-chart-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
            </defs>

            {[28, 56, 84, 112].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2={CHART_W}
                y2={y}
                className="landing-chart-grid"
              />
            ))}

            <path
              d={scene.areaPath}
              fill="url(#landing-chart-fill)"
              className="landing-chart-area"
            />
            <path
              d={scene.pricePath}
              fill="none"
              stroke="url(#landing-chart-line)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={PATH_LEN}
              className="landing-chart-line"
            />

            {scene.markers.map((m, i) => (
              <g key={i} transform={`translate(${m.x}, ${m.y})`}>
                <g
                  className="landing-chart-marker"
                  style={{ animationDelay: `${m.delay}s` }}
                >
                  {m.kind === "buy" ? (
                    <>
                      <polygon points="0,-7 6,5 -6,5" fill="#34d399" />
                      <circle r="10" fill="none" stroke="#34d399" strokeWidth="1" opacity="0.35" />
                    </>
                  ) : (
                    <>
                      <polygon points="0,7 6,-5 -6,-5" fill="#f87171" />
                      <circle r="10" fill="none" stroke="#f87171" strokeWidth="1" opacity="0.35" />
                    </>
                  )}
                </g>
              </g>
            ))}
          </svg>
          <div className="landing-chart-scan" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="stat-card text-center py-3 landing-stat-card">
            <p className="text-[11px] text-muted">{t.landing.previewStats.pnl}</p>
            <p className="text-sm font-semibold text-green-400 mt-1 tabular-nums">
              +{pnlDisplay}%
            </p>
          </div>
          <div className="stat-card text-center py-3 landing-stat-card">
            <p className="text-[11px] text-muted">{t.landing.previewStats.trades}</p>
            <p className="text-sm font-semibold text-white mt-1 tabular-nums">{tradesDisplay}</p>
          </div>
          <div className="stat-card text-center py-3 landing-stat-card">
            <p className="text-[11px] text-muted">{t.landing.previewStats.maxDd}</p>
            <p className="text-sm font-semibold text-amber-300/90 mt-1 tabular-nums">
              {maxDdDisplay}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
