/** Обычные vs мем-монеты — синхронно с backtester/core/coin_categories.py */

export const DEFAULT_MEME_SYMBOLS = new Set([
  "DOGEUSDT",
  "1000PEPEUSDT",
  "1000BONKUSDT",
  "1000FLOKIUSDT",
  "1000SHIBUSDT",
  "WIFUSDT",
  "MEMEUSDT",
  "PEOPLEUSDT",
  "BOMEUSDT",
  "NEIROUSDT",
  "TURBOUSDT",
  "BRETTUSDT",
  "POPCATUSDT",
  "MOODENGUSDT",
  "PNUTUSDT",
  "ACTUSDT",
  "GOATUSDT",
  "FARTCOINUSDT",
  "TRUMPUSDT",
]);

export type CoinKind = "regular" | "meme";

export function isMemeCoin(symbol: string): boolean {
  if (DEFAULT_MEME_SYMBOLS.has(symbol)) return true;
  if (symbol.startsWith("1000") && symbol.endsWith("USDT")) return true;
  return false;
}

export function coinKind(symbol: string): CoinKind {
  return isMemeCoin(symbol) ? "meme" : "regular";
}

export function coinKindLabel(kind: CoinKind): string {
  return kind === "meme" ? "Мемы" : "Обычные";
}
