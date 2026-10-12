const CHART_W = 360;
const CHART_H = 140;

export type TradeMarker = { x: number; y: number; kind: "buy" | "sell" };

export type ProductShowcaseTableRow = {
  coin: string;
  entry: string;
  position: string;
  exit: string;
  account: string;
  pnl: number;
  pnlPct: number;
  closed: boolean;
};

export type ProductShowcaseCompareRun = {
  profitPct: number;
  trades: number;
  maxDdPct: number;
  winRatePct: number;
};

export type ProductShowcaseDemo = {
  pairLabel: string;
  deposit: number;
  profitPct: number;
  finalBalance: number;
  closedCount: number;
  chart: {
    pricePath: string;
    areaPath: string;
    markers: TradeMarker[];
  };
  tableRows: ProductShowcaseTableRow[];
  compareA: ProductShowcaseCompareRun;
  compareB: ProductShowcaseCompareRun;
  report: {
    equityPath: string;
    maxDdPct: number;
    winRatePct: number;
    avgTradeUsd: number;
    feesUsd: number;
    fundingUsd: number;
    netPnlUsd: number;
  };
};

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round(n: number, d: number): number {
  const p = 10 ** d;
  return Math.round(n * p) / p;
}

function generateOrganicPoints(): [number, number][] {
  const count = Math.floor(rand(38, 52));
  const points: [number, number][] = [];
  let y = rand(48, 68);
  let velocity = rand(-1.5, 1.5);
  const center = rand(54, 62);

  for (let i = 0; i < count; i++) {
    const x = (i / (count - 1)) * CHART_W;
    const progress = i / (count - 1);
    velocity =
      velocity * rand(0.5, 0.65) +
      rand(-1, 1) * rand(1.8, 4.2) +
      Math.sin(i * rand(0.4, 0.75)) * rand(0.3, 1);
    if (Math.random() < 0.06) velocity += rand(-8, 5);
    y += velocity;
    y += (center - y) * rand(0.03, 0.06);
    y += Math.sin(progress * Math.PI * rand(1.1, 2)) * rand(-1.2, 1.2);
    points.push([x, clamp(y, 26, CHART_H - 14)]);
  }

  points[0] = [0, points[0][1]];
  points[points.length - 1] = [CHART_W, points[points.length - 1][1]];
  return points;
}

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

function findTradeMarkers(points: [number, number][]): TradeMarker[] {
  const maxMarkers = Math.floor(rand(3, 5));
  const raw: { idx: number; kind: "buy" | "sell"; score: number }[] = [];

  for (let i = 2; i < points.length - 2; i++) {
    const y0 = points[i - 1][1];
    const y1 = points[i][1];
    const y2 = points[i + 1][1];
    const prom = localProminence(points, i);
    if (prom < 5) continue;
    if (y1 < y0 && y1 < y2) raw.push({ idx: i, kind: "buy", score: prom });
    if (y1 > y0 && y1 > y2) raw.push({ idx: i, kind: "sell", score: prom });
  }

  raw.sort((a, b) => b.score - a.score);
  const picked: { idx: number; kind: "buy" | "sell" }[] = [];
  const minGap = Math.floor(points.length * 0.1);

  for (const candidate of raw) {
    if (picked.length >= maxMarkers) break;
    if (picked.some((p) => Math.abs(p.idx - candidate.idx) < minGap)) continue;
    if (picked.length > 0 && picked[picked.length - 1].kind === candidate.kind) continue;
    picked.push({ idx: candidate.idx, kind: candidate.kind });
  }

  if (picked.length < 2) {
    const fallback = [0.2, 0.45, 0.7].slice(0, maxMarkers);
    return fallback.map((f, i) => {
      const idx = Math.min(Math.floor(points.length * f), points.length - 2);
      return {
        x: points[idx][0],
        y: points[idx][1],
        kind: (i % 2 === 0 ? "buy" : "sell") as "buy" | "sell",
      };
    });
  }

  picked.sort((a, b) => a.idx - b.idx);
  return picked.map((m) => ({
    x: points[m.idx][0],
    y: points[m.idx][1],
    kind: m.kind,
  }));
}

function generateEquityPath(startUsd: number, endUsd: number): string {
  const w = 360;
  const h = 80;
  const pad = 8;
  const n = Math.floor(rand(8, 12));
  const values: number[] = [startUsd];
  for (let i = 1; i < n - 1; i++) {
    const t = i / (n - 1);
    const linear = startUsd + (endUsd - startUsd) * t;
    const wiggle = rand(-1.2, 0.45) * (1 - t * 0.35);
    values.push(linear + wiggle);
  }
  values.push(endUsd);

  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const span = max - min || 1;

  const pts = values.map((v, i) => {
    const x = (i / (n - 1)) * w;
    const y = pad + (1 - (v - min) / span) * (h - pad * 2);
    return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  return pts.join(" ");
}

const COIN_PRESETS = [
  { symbol: "BTC", entry: [61200, 69800] as const, decimals: 1 },
  { symbol: "ETH", entry: [3180, 3820] as const, decimals: 2 },
  { symbol: "SOL", entry: [138, 178] as const, decimals: 2 },
] as const;

function formatPrice(n: number, decimals: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (decimals <= 0) return String(Math.round(n));
  return n.toFixed(Math.min(decimals, 2));
}

function buildTableRows(
  deposit: number,
  finalBalance: number,
  winRatePct: number
): ProductShowcaseTableRow[] {
  const visible = Math.floor(rand(3, 4));
  const lossCount = winRatePct >= 86 ? 0 : Math.random() < 0.42 ? 1 : 0;
  const winCount = Math.max(1, visible - lossCount);

  const net = finalBalance - deposit;
  const lossTotal = lossCount ? round(rand(0.25, 1.35), 2) : 0;
  const winPool = net + lossTotal;

  const rowPnls: number[] = [];
  let winAllocated = 0;
  for (let i = 0; i < winCount; i++) {
    const isLast = i === winCount - 1;
    const p = isLast
      ? round(Math.max(0.35, winPool - winAllocated), 2)
      : round((winPool / winCount) * rand(0.55, 1.45), 2);
    rowPnls.push(p);
    winAllocated += p;
  }
  for (let i = 0; i < lossCount; i++) {
    rowPnls.push(-lossTotal);
  }

  for (let i = rowPnls.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rowPnls[i], rowPnls[j]] = [rowPnls[j], rowPnls[i]];
  }

  let account = deposit;
  const rows: ProductShowcaseTableRow[] = [];

  for (let i = 0; i < visible; i++) {
    const preset = COIN_PRESETS[Math.floor(rand(0, COIN_PRESETS.length))];
    const entry = rand(preset.entry[0], preset.entry[1]);
    const move = rand(0.004, 0.028) * (rowPnls[i] >= 0 ? 1 : -1);
    const exit = entry * (1 + move);
    const notional = round(rand(28, 86), 2);
    const pnl = rowPnls[i];
    const pnlPct = round((pnl / notional) * 100, 2);
    account = round(account + pnl, 2);

    rows.push({
      coin: preset.symbol,
      entry: formatPrice(entry, preset.decimals),
      position: notional.toFixed(2),
      exit: formatPrice(exit, preset.decimals),
      account: account.toFixed(2),
      pnl,
      pnlPct,
      closed: true,
    });
  }

  return rows;
}

function buildCompareRun(base: ProductShowcaseCompareRun, better: boolean): ProductShowcaseCompareRun {
  const profitPct = better
    ? round(base.profitPct + rand(2.5, 9.5), 1)
    : round(base.profitPct - rand(1.2, 5.5), 1);
  const trades = Math.max(
    5,
    base.trades + (better ? Math.floor(rand(2, 14)) : -Math.floor(rand(1, 8)))
  );
  const maxDdPct = round(
    better ? base.maxDdPct * rand(0.72, 0.92) : base.maxDdPct * rand(1.05, 1.35),
    1
  );
  const winRatePct = round(
    clamp(
      better ? base.winRatePct + rand(1, 6) : base.winRatePct - rand(2, 9),
      62,
      90
    ),
    0
  );
  return { profitPct, trades, maxDdPct, winRatePct };
}

export function generateProductShowcaseDemo(): ProductShowcaseDemo {
  const deposit = 100;
  const profitPct = round(rand(10.2, 27.4), 2);
  const finalBalance = round(deposit * (1 + profitPct / 100), 2);
  const netPnlUsd = round(finalBalance - deposit, 2);

  const closedCount = Math.floor(rand(5, 11));
  const winRatePct = Math.floor(rand(68, 89));
  const maxDdPct = round(rand(1.4, 6.8), 1);
  const feesUsd = round(rand(0.42, 2.65), 2);
  const fundingUsd = round(-rand(0.05, 0.48), 2);
  const avgTradeUsd = round(netPnlUsd / closedCount + rand(-0.08, 0.12), 2);

  const pairs = ["BTCUSDT", "ETHUSDT", "SOLUSDT"] as const;
  const pair = pairs[Math.floor(rand(0, pairs.length))];

  const points = generateOrganicPoints();
  const pricePath = toSmoothPath(points);
  const areaPath = `${pricePath} L ${CHART_W} ${CHART_H} L 0 ${CHART_H} Z`;
  const markers = findTradeMarkers(points);

  const baseCompare: ProductShowcaseCompareRun = {
    profitPct: round(profitPct * rand(0.72, 0.92), 1),
    trades: Math.floor(rand(6, 22)),
    maxDdPct: round(maxDdPct * rand(1.05, 1.45), 1),
    winRatePct: Math.floor(rand(64, 82)),
  };

  const compareA = baseCompare;
  const compareB = buildCompareRun(baseCompare, true);

  return {
    pairLabel: `${pair} · 1m`,
    deposit,
    profitPct,
    finalBalance,
    closedCount,
    chart: { pricePath, areaPath, markers },
    tableRows: buildTableRows(deposit, finalBalance, winRatePct),
    compareA,
    compareB,
    report: {
      equityPath: generateEquityPath(deposit, finalBalance),
      maxDdPct,
      winRatePct,
      avgTradeUsd,
      feesUsd,
      fundingUsd,
      netPnlUsd,
    },
  };
}
