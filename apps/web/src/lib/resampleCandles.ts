import type { Candle } from "@/lib/types";

const TF_MINUTES: Record<string, number> = {
  "1m": 1,
  "15m": 15,
  "30m": 30,
  "1h": 60,
  "4h": 240,
  "1d": 1440,
};

function bucketStart(unixSec: number, periodMin: number): number {
  const d = new Date(unixSec * 1000);
  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth();
  const day = d.getUTCDate();
  let h = d.getUTCHours();
  let m = d.getUTCMinutes();

  if (periodMin === 1) {
    return Math.floor(unixSec / 60) * 60;
  }
  if (periodMin === 1440) {
    return Date.UTC(y, mo, day) / 1000;
  }
  if (periodMin === 60) {
    return Date.UTC(y, mo, day, h) / 1000;
  }
  if (periodMin === 240) {
    h = Math.floor(h / 4) * 4;
    return Date.UTC(y, mo, day, h) / 1000;
  }
  m = Math.floor(m / periodMin) * periodMin;
  return Date.UTC(y, mo, day, h, m) / 1000;
}

export function resampleCandles(candles: Candle[], timeframe: string): Candle[] {
  const period = TF_MINUTES[timeframe] ?? 1;
  if (period === 1) return candles;
  if (candles.length === 0) return [];

  const buckets = new Map<number, Candle[]>();
  for (const c of candles) {
    const start = bucketStart(c.time, period);
    const chunk = buckets.get(start);
    if (chunk) chunk.push(c);
    else buckets.set(start, [c]);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([time, chunk]) => ({
      time,
      open: chunk[0].open,
      high: Math.max(...chunk.map((x) => x.high)),
      low: Math.min(...chunk.map((x) => x.low)),
      close: chunk[chunk.length - 1].close,
    }));
}
