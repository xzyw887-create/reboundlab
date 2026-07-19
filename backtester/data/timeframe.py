"""Candle timeframes for entry signals and chart display."""
from __future__ import annotations

TIMEFRAMES: dict[str, int] = {
    "1m": 1,
    "15m": 15,
    "30m": 30,
    "1h": 60,
    "4h": 240,
    "1d": 1440,
}

def timeframe_minutes(tf: str) -> int:
    if tf not in TIMEFRAMES:
        raise ValueError(f"Unsupported timeframe: {tf}")
    return TIMEFRAMES[tf]


def normalize_timeframe(tf: str) -> str:
    aliases = {
        "1": "1m",
        "15": "15m",
        "30": "30m",
        "60": "1h",
        "240": "4h",
        "1440": "1d",
    }
    if tf in TIMEFRAMES:
        return tf
    if tf in aliases:
        return aliases[tf]
    raise ValueError(f"Unsupported timeframe: {tf}")
