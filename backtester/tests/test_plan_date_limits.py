"""Tests for tier-based date windows."""

from datetime import date

from backtester.plan_date_limits import (
    TRIAL_HISTORY_DAYS,
    PAID_HISTORY_DAYS,
    clamp_coin_range_to_plan,
    tier_history_window,
    validate_backtest_date_range,
)


def test_trial_window_from_registration():
    start, end = tier_history_window(
        "trial",
        registered_at="2026-07-18",
        today=date(2026, 7, 18),
    )
    assert end == "2026-07-18"
    assert start == "2026-04-19"  # 90 days before anchor


def test_paid_window_three_years():
    start, end = tier_history_window(
        "pro",
        registered_at="2026-01-01",
        today=date(2026, 7, 18),
    )
    assert end == "2026-07-18"
    assert start == "2023-07-19"


def test_clamp_coin_younger_than_plan():
    window_from, window_to = "2023-07-19", "2026-07-18"
    result = clamp_coin_range_to_plan("2025-01-01", "2026-07-18", window_from, window_to)
    assert result == ("2025-01-01", "2026-07-18")


def test_clamp_coin_no_overlap():
    result = clamp_coin_range_to_plan(
        "2020-01-01", "2022-01-01", "2023-07-19", "2026-07-18"
    )
    assert result is None


def test_validate_dates_in_coverage():
    err = validate_backtest_date_range(
        "2025-06-01", "2025-07-01", "2025-01-01", "2026-07-18"
    )
    assert err is None


def test_validate_dates_outside_coverage():
    err = validate_backtest_date_range(
        "2020-01-01", "2025-07-01", "2025-01-01", "2026-07-18"
    )
    assert err is not None
    assert "диапазона" in err


def test_constants():
    assert TRIAL_HISTORY_DAYS == 90
    assert PAID_HISTORY_DAYS == 1095
