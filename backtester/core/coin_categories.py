"""Классификация монет: обычные vs мемы (для % входа и UI)."""

from __future__ import annotations

# Binance USDT perpetual — известные мем-тикеры
DEFAULT_MEME_SYMBOLS: frozenset[str] = frozenset(
    {
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
    }
)


def is_meme_symbol(symbol: str, extra_meme: set[str] | frozenset[str] | None = None) -> bool:
    """Мем: явный список или тикер Binance с префиксом 1000 (1000PEPE и т.д.)."""
    if symbol in DEFAULT_MEME_SYMBOLS:
        return True
    if extra_meme and symbol in extra_meme:
        return True
    if symbol.startswith("1000") and symbol.endswith("USDT"):
        return True
    return False
