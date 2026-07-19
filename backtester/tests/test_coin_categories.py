"""Tests for meme vs regular coin classification."""

from backtester.core.coin_categories import is_meme_symbol


def test_meme_known_symbols():
    assert is_meme_symbol("DOGEUSDT")
    assert is_meme_symbol("1000PEPEUSDT")
    assert is_meme_symbol("WIFUSDT")


def test_regular_major_coins():
    assert not is_meme_symbol("BTCUSDT")
    assert not is_meme_symbol("ETHUSDT")
    assert not is_meme_symbol("SOLUSDT")


def test_1000_prefix_heuristic():
    assert is_meme_symbol("1000XYZUSDT")
    assert not is_meme_symbol("BTCUSDT")
