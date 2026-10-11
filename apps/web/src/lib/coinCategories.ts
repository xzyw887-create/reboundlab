/** Linear vs high-volatility pairs — synced with backtester/core/coin_categories.py */

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

/** Binance-style grouping for UI */
export function coinKindLabel(kind: CoinKind): string {
  return kind === "meme" ? "Volatility pairs" : "Linear Perpetuals";
}

export function shortSymbol(symbol: string): string {
  return symbol.replace("USDT", "");
}
