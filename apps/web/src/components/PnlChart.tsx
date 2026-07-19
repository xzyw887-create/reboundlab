"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  createChart,
  ColorType,
  AreaSeries,
  type UTCTimestamp,
} from "lightweight-charts";

interface Point {
  time: number;
  balance: number;
  pnl_pct: number;
}

interface Props {
  data: Point[];
  initialDeposit: number;
  periodStart: string;
  periodEnd: string;
  height?: number;
  excludesOpenTrade?: boolean;
}

function dateToUtcStart(dateStr: string): number {
  return Math.floor(Date.parse(`${dateStr}T00:00:00.000Z`) / 1000);
}

function dateToUtcEnd(dateStr: string): number {
  return Math.floor(Date.parse(`${dateStr}T23:59:59.000Z`) / 1000);
}

/** lightweight-charts требует строго возрастающие time (без дублей). */
function ensureStrictAscending(points: Point[]): Point[] {
  if (points.length === 0) return [];
  const sorted = [...points].sort((a, b) => a.time - b.time);
  const out: Point[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i++) {
    const p = sorted[i];
    const prevTime = out[out.length - 1].time;
    const time = p.time <= prevTime ? prevTime + 60 : p.time;
    out.push({ ...p, time });
  }

  return out;
}

/** Оставляем только смены баланса + начало/конец периода — ступеньки видны целиком. */
function compressToStepPoints(data: Point[]): Point[] {
  const sorted = [...data].sort((a, b) => a.time - b.time);
  const deduped: Point[] = [];

  for (const point of sorted) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.time === point.time) {
      deduped[deduped.length - 1] = point;
    } else {
      deduped.push(point);
    }
  }

  if (deduped.length === 0) return [];

  const out: Point[] = [deduped[0]];

  for (let i = 1; i < deduped.length; i++) {
    const prev = deduped[i - 1];
    const cur = deduped[i];

    if (cur.balance === prev.balance) continue;

    if (cur.time > prev.time) {
      const stepTime = cur.time - 60;
      if (stepTime > out[out.length - 1].time) {
        out.push({
          time: stepTime,
          balance: prev.balance,
          pnl_pct: prev.pnl_pct,
        });
      }
    }
    if (cur.time > out[out.length - 1].time) {
      out.push(cur);
    } else {
      out[out.length - 1] = cur;
    }
  }

  return ensureStrictAscending(out);
}

function getBalanceLevels(points: Point[], initialDeposit: number): number[] {
  const levels = new Set<number>();
  levels.add(initialDeposit);
  for (const p of points) levels.add(p.balance);
  return [...levels].sort((a, b) => a - b);
}

function getPriceRange(levels: number[]): { min: number; max: number } {
  if (levels.length === 0) return { min: 0, max: 1 };

  const min = levels[0];
  const max = levels[levels.length - 1];

  let minStep = max - min;
  for (let i = 1; i < levels.length; i++) {
    const step = levels[i] - levels[i - 1];
    if (step > 0 && step < minStep) minStep = step;
  }
  if (levels.length < 2 || minStep <= 0) {
    minStep = min * 0.01;
  }

  const pad = Math.max(minStep * 0.65, min * 0.005, 3);
  return { min: min - pad, max: max + pad };
}

export function PnlChart({
  data,
  initialDeposit,
  periodStart,
  periodEnd,
  height = 130,
  excludesOpenTrade = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const axisFrom = dateToUtcStart(periodStart);
  const axisTo = dateToUtcEnd(periodEnd);

  const chartData = useMemo(() => {
    const compressed = compressToStepPoints(data);

    if (compressed.length === 0) {
      return [
        { time: axisFrom, balance: initialDeposit, pnl_pct: 0 },
        { time: axisTo, balance: initialDeposit, pnl_pct: 0 },
      ];
    }

    const anchored: Point[] = [...compressed];

    if (anchored[0].time > axisFrom) {
      anchored.unshift({
        time: axisFrom,
        balance: initialDeposit,
        pnl_pct: 0,
      });
    } else {
      anchored[0] = { ...anchored[0], time: axisFrom };
    }

    const lastBalance = anchored[anchored.length - 1].balance;
    if (anchored[anchored.length - 1].time < axisTo) {
      anchored.push({
        time: axisTo,
        balance: lastBalance,
        pnl_pct: anchored[anchored.length - 1].pnl_pct,
      });
    } else if (anchored[anchored.length - 1].time > axisTo) {
      anchored[anchored.length - 1] = {
        ...anchored[anchored.length - 1],
        time: axisTo,
      };
    }

    return ensureStrictAscending(anchored);
  }, [data, initialDeposit, axisFrom, axisTo]);

  const balanceLevels = useMemo(
    () => getBalanceLevels(chartData, initialDeposit),
    [chartData, initialDeposit]
  );

  const priceRange = useMemo(
    () => getPriceRange(balanceLevels),
    [balanceLevels]
  );

  const lastBalance = chartData[chartData.length - 1]?.balance ?? initialDeposit;
  const isProfit = lastBalance >= initialDeposit;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || chartData.length === 0) return;

    const width = container.clientWidth;

    const chart = createChart(container, {
      width: width > 0 ? width : undefined,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#121820" },
        textColor: "#8892b0",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "#1e2d42" },
        horzLines: { color: "#1e2d42" },
      },
      handleScroll: false,
      handleScale: false,
      timeScale: {
        borderColor: "#1e2d42",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 0,
        fixLeftEdge: true,
        fixRightEdge: true,
        lockVisibleTimeRangeOnResize: true,
      },
      rightPriceScale: {
        borderColor: "#1e2d42",
        scaleMargins: { top: 0.12, bottom: 0.12 },
        minimumWidth: 76,
        entireTextOnly: false,
      },
    });

    const lineColor = isProfit ? "#22c55e" : "#ef4444";
    const topColor = isProfit
      ? "rgba(34, 197, 94, 0.35)"
      : "rgba(239, 68, 68, 0.35)";

    const series = chart.addSeries(AreaSeries, {
      lineColor,
      topColor,
      bottomColor: "rgba(0, 0, 0, 0)",
      lineWidth: 2,
      autoscaleInfoProvider: () => ({
        priceRange: {
          minValue: priceRange.min,
          maxValue: priceRange.max,
        },
      }),
    });

    series.setData(
      chartData.map((d) => ({
        time: d.time as UTCTimestamp,
        value: d.balance,
      }))
    );

    for (const level of balanceLevels) {
      const isStart = Math.abs(level - initialDeposit) < 0.01;
      series.createPriceLine({
        price: level,
        color: isStart ? "#6b7280" : "#4b5563",
        lineWidth: 1,
        lineStyle: isStart ? 2 : 3,
        axisLabelVisible: true,
        title: isStart ? "Старт" : "",
      });
    }

    const fit = () => {
      chart.timeScale().setVisibleRange({
        from: axisFrom as UTCTimestamp,
        to: axisTo as UTCTimestamp,
      });
    };

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      if (w > 0) {
        chart.applyOptions({ width: w });
        fit();
      }
    };

    handleResize();
    requestAnimationFrame(fit);

    const observer = new ResizeObserver(handleResize);
    observer.observe(container);
    window.addEventListener("resize", handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [
    chartData,
    balanceLevels,
    priceRange,
    height,
    initialDeposit,
    isProfit,
    axisFrom,
    axisTo,
  ]);

  if (chartData.length === 0) return null;

  const delta = lastBalance - initialDeposit;
  const deltaPct = initialDeposit > 0 ? (delta / initialDeposit) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-xs font-medium text-gray-400">
          Кривая баланса (закрытые сделки
          {excludesOpenTrade ? ", без открытой в конце периода" : ""})
        </h3>
        <p className="text-[11px] text-gray-500">
          ${initialDeposit.toFixed(0)} → ${lastBalance.toFixed(2)}
          <span
            className={
              delta >= 0 ? "text-green-400 ml-1" : "text-red-400 ml-1"
            }
          >
            ({delta >= 0 ? "+" : ""}
            {deltaPct.toFixed(2)}%)
          </span>
        </p>
      </div>
      <div
        ref={containerRef}
        className="w-full rounded-lg border border-border overflow-hidden"
        style={{ height }}
      />
    </div>
  );
}
