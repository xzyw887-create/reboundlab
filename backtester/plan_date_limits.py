"""Tier-based backtest date windows (mirrors apps/web/src/lib/planDateLimits.ts)."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

TRIAL_HISTORY_DAYS = 90
PAID_HISTORY_DAYS = 1095

TIER_MAX_DAYS: dict[str, int] = {
    "trial": TRIAL_HISTORY_DAYS,
    "basic": PAID_HISTORY_DAYS,
    "starter": PAID_HISTORY_DAYS,
    "pro": PAID_HISTORY_DAYS,
    "automatic": PAID_HISTORY_DAYS,
}


def _parse_iso(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value[:10])


def tier_history_window(
    tier: str,
    registered_at: str | None = None,
    today: date | None = None,
) -> tuple[str, str]:
    today = today or datetime.now(timezone.utc).date()
    max_days = TIER_MAX_DAYS.get(tier, TRIAL_HISTORY_DAYS)

    if tier == "trial":
        anchor = _parse_iso(registered_at) or today
        start = anchor - timedelta(days=max_days)
        return start.isoformat(), today.isoformat()

    start = today - timedelta(days=max_days)
    return start.isoformat(), today.isoformat()


def clamp_coin_range_to_plan(
    data_from: str,
    data_to: str,
    window_from: str,
    window_to: str,
) -> tuple[str, str] | None:
    start = max(data_from, window_from)
    end = min(data_to, window_to)
    if start > end:
        return None
    return start, end


def validate_backtest_date_range(
    start: str,
    end: str,
    coverage_from: str,
    coverage_to: str,
) -> str | None:
    if start > end:
        return "Начало периода позже конца"
    if start < coverage_from or end > coverage_to:
        return f"Период вне доступного диапазона ({coverage_from} — {coverage_to})"
    return None
