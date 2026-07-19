-- Plain PostgreSQL candles table for Neon (no TimescaleDB required)
-- Use this instead of database/timescale/hypertables.sql on serverless Postgres

CREATE TABLE IF NOT EXISTS market.candles (
    pair_id UUID NOT NULL REFERENCES market.trading_pairs(id),
    timeframe market.timeframe NOT NULL,
    open_time TIMESTAMPTZ NOT NULL,
    open NUMERIC(20,8) NOT NULL,
    high NUMERIC(20,8) NOT NULL,
    low NUMERIC(20,8) NOT NULL,
    close NUMERIC(20,8) NOT NULL,
    volume NUMERIC(30,8) NOT NULL DEFAULT 0,
    PRIMARY KEY (pair_id, timeframe, open_time)
);

CREATE INDEX IF NOT EXISTS idx_candles_pair_tf_time
    ON market.candles (pair_id, timeframe, open_time DESC);
