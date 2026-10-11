"use client";

import { useEffect, useState } from "react";
import {
  formatMaxHistoryDepth,
  formatPairsStat,
  type MarketLandingStats,
} from "@/lib/marketLandingStatsFormat";
import { apiFetch } from "@/lib/clientFetch";
import { formatTpl, useLocale } from "@/lib/i18n";

type Props = {
  /** С сервера при первом рендере; клиент подтягивает свежие данные с API (кэш ~10 мин). */
  initialStats?: MarketLandingStats | null;
};

export function LandingMarketStats({ initialStats = null }: Props) {
  const { t, locale } = useLocale();
  const [stats, setStats] = useState<MarketLandingStats | null>(
    initialStats?.loadedPairs ? initialStats : null
  );

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/market/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: MarketLandingStats | null) => {
        if (!cancelled && data && typeof data.loadedPairs === "number") {
          setStats(data);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const pairsText =
    stats && stats.loadedPairs > 0
      ? formatPairsStat(stats.loadedPairs, locale)
      : null;
  const depthLabel =
    stats && stats.maxHistoryDays > 0
      ? formatMaxHistoryDepth(stats.maxHistoryDays, locale)
      : null;

  const items = [
    {
      icon: "📊",
      text: pairsText ?? t.landing.stats.pairsFallback,
    },
    {
      icon: "🕐",
      text: depthLabel
        ? formatTpl(t.landing.stats.historyDynamic, { depth: depthLabel })
        : t.landing.stats.historyFallback,
    },
    { icon: "⚙️", text: t.landing.stats.engine },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {items.map((stat) => (
        <div
          key={stat.icon}
          className="flex items-center gap-3 rounded-xl border border-border/60 bg-panel/40 px-4 py-3"
        >
          <span className="text-xl" aria-hidden>
            {stat.icon}
          </span>
          <p className="text-sm font-medium text-gray-200">{stat.text}</p>
        </div>
      ))}
    </div>
  );
}
