"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  createSeriesMarkers,
  type MouseEventParams,
  type SeriesMarker,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle, Marker } from "@/lib/types";

interface Props {
  candles: Candle[];
  markers?: Marker[];
  height?: number;
}

function prepareCandles(candles: Candle[]) {
  const sorted = [...candles].sort((a, b) => a.time - b.time);
  const seen = new Set<number>();
  return sorted
    .filter((c) => {
      if (seen.has(c.time)) return false;
      seen.add(c.time);
      return true;
    })
    .map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
}

function prepareMarkers(markers: Marker[], candleTimes: Set<number>): Marker[] {
  return markers
    .filter((m) => m.price != null && candleTimes.has(m.time))
    .sort((a, b) => a.time - b.time);
}

const MARKER_SIZE = 0.65;

function toPriceMarker(m: Marker): SeriesMarker<UTCTimestamp> {
  const position =
    m.kind === "buy"
      ? "atPriceTop"
      : m.kind === "sell"
      ? "atPriceBottom"
      : "atPriceMiddle";

  return {
    time: m.time as UTCTimestamp,
    position,
    price: m.price!,
    shape:
      m.shape === "circle"
        ? "circle"
        : m.shape === "arrowDown"
        ? "arrowDown"
        : "arrowUp",
    color: m.color,
    text: "",
    size: MARKER_SIZE,
  };
}

function formatMarkerPrice(price: number): string {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

function markerLabel(kind: Marker["kind"]): string {
  if (kind === "buy") return "Покупка";
  if (kind === "sell") return "Продажа";
  if (kind === "avg") return "Усреднение";
  return "";
}

export function PriceChart({ candles, markers = [], height = 360 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    price: number;
    kind: Marker["kind"];
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || candles.length === 0) return;

    const chart = createChart(container, {
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
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { borderColor: "#1e2d42", timeVisible: true },
      rightPriceScale: { borderColor: "#1e2d42" },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    const data = prepareCandles(candles);
    const candleTimes = new Set(data.map((d) => d.time as number));
    const validMarkers = prepareMarkers(markers, candleTimes);

    series.setData(data);

    const markersPlugin =
      validMarkers.length > 0
        ? createSeriesMarkers(series, validMarkers.map(toPriceMarker))
        : null;

    chart.timeScale().fitContent();

    const handleCrosshair = (param: MouseEventParams) => {
      if (!param.time || !param.point) {
        setTooltip(null);
        return;
      }
      const time =
        typeof param.time === "number" ? param.time : Number(param.time);
      const hits = validMarkers.filter((m) => m.time === time && m.price != null);
      if (hits.length === 0) {
        setTooltip(null);
        return;
      }
      const hit = hits[hits.length - 1];
      setTooltip({
        x: param.point.x,
        y: param.point.y,
        price: hit.price!,
        kind: hit.kind,
      });
    };

    chart.subscribeCrosshairMove(handleCrosshair);

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.unsubscribeCrosshairMove(handleCrosshair);
      markersPlugin?.detach();
      chart.remove();
      setTooltip(null);
    };
  }, [candles, markers, height]);

  if (candles.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-border/60 bg-panel-inner text-muted"
        style={{ height }}
      >
        Нет данных для этой монеты
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="flex gap-4 text-xs text-gray-500 mb-2">
        <span className="text-green-400">▲ покупка</span>
        <span className="text-red-400">▼ продажа</span>
        <span className="text-yellow-400">● усреднение</span>
        <span className="text-gray-600">— наведите на свечу со сделкой</span>
      </div>
      <div className="relative w-full rounded-xl border border-border/60 overflow-hidden bg-panel-inner">
        <div ref={containerRef} className="w-full" />
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-accent/30 bg-panel px-2.5 py-1.5 text-xs shadow-glow-sm"
            style={{ left: tooltip.x, top: tooltip.y - 8 }}
          >
            <span
              className={
                tooltip.kind === "buy"
                  ? "text-green-400"
                  : tooltip.kind === "avg"
                  ? "text-yellow-400"
                  : "text-red-400"
              }
            >
              {markerLabel(tooltip.kind)}
            </span>
            <span className="text-gray-300 ml-1.5 font-mono">
              ${formatMarkerPrice(tooltip.price)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
