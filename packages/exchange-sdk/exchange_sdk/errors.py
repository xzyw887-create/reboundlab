from __future__ import annotations

class ExchangeError(Exception):
    """Base error for exchange SDK."""


class ExchangeAPIError(ExchangeError):
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


class ExchangeRateLimitError(ExchangeAPIError):
    pass
