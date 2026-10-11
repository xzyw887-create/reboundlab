import { apiFetch } from "@/lib/clientFetch";
import type { SymbolInfo } from "@/lib/types";

export interface SymbolsResponse {
  symbols: SymbolInfo[];
  error?: string;
}

const CLIENT_TTL_MS = 10 * 60 * 1000;

let cache: { at: number; data: SymbolsResponse } | null = null;
let inflight: Promise<SymbolsResponse> | null = null;

/** Один запрос за раз + кэш на клиенте (не бьём /api/symbols параллельно). */
export async function fetchSymbols(force = false): Promise<SymbolsResponse> {
  if (!force && cache && Date.now() - cache.at < CLIENT_TTL_MS) {
    return cache.data;
  }

  if (inflight) {
    return inflight;
  }

  inflight = apiFetch("/api/symbols")
    .then(async (r) => {
      const data = (await r.json()) as SymbolsResponse;
      if (!r.ok || data.error) {
        throw new Error(data.error ?? `HTTP ${r.status}`);
      }
      cache = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
