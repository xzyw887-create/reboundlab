-- Funding rate history (Binance USDT-M Futures)
CREATE TABLE IF NOT EXISTS market.funding_rates (
    pair_id UUID NOT NULL REFERENCES market.trading_pairs(id),
    funding_time TIMESTAMPTZ NOT NULL,
    rate NUMERIC(20, 12) NOT NULL,
    PRIMARY KEY (pair_id, funding_time)
);

CREATE INDEX IF NOT EXISTS idx_funding_rates_time ON market.funding_rates(funding_time);
