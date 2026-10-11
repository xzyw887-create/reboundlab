import type { Trade } from "@/lib/types";

export const TRADES_EXPORT_PREFIX = "btp_trades_export:";

export interface TradesExportPayload {
  trades: Trade[];
  filename: string;
  periodStart?: string;
  periodEnd?: string;
}

export function stashTradesExport(payload: TradesExportPayload): string {
  const key = `${TRADES_EXPORT_PREFIX}${Date.now()}`;
  // localStorage is shared across tabs; sessionStorage is not available in window.open targets.
  localStorage.setItem(key, JSON.stringify(payload));
  return key;
}

export function readTradesExport(key: string | null): TradesExportPayload | null {
  if (!key?.startsWith(TRADES_EXPORT_PREFIX)) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as TradesExportPayload;
  } catch {
    return null;
  }
}

export function clearTradesExport(key: string | null): void {
  if (!key?.startsWith(TRADES_EXPORT_PREFIX)) return;
  localStorage.removeItem(key);
}
