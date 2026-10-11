import { listSymbolsFromDb } from "@/lib/listSymbols";
import type { MarketLandingStats } from "@/lib/marketLandingStatsFormat";

export type { MarketLandingStats };

export async function getMarketLandingStats(): Promise<MarketLandingStats> {
  const { symbols, total_loaded } = await listSymbolsFromDb();
  let maxHistoryDays = 0;

  for (const s of symbols) {
    if (!s.data_from || !s.data_to) continue;
    const from = new Date(`${s.data_from}T00:00:00Z`).getTime();
    const to = new Date(`${s.data_to}T00:00:00Z`).getTime();
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) continue;
    const days = Math.floor((to - from) / 86_400_000);
    maxHistoryDays = Math.max(maxHistoryDays, days);
  }

  return { loadedPairs: total_loaded, maxHistoryDays };
}
