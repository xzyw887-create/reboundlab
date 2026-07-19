-- ReboundLab: TimescaleDB candles hypertable
-- Requires TimescaleDB extension

CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE market.candles (
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

SELECT create_hypertable('market.candles', 'open_time',
    partitioning_column => 'pair_id',
    number_partitions => 4,
    if_not_exists => TRUE
);

CREATE INDEX idx_candles_pair_tf_time
    ON market.candles (pair_id, timeframe, open_time DESC);

-- Compression policy: compress chunks older than 90 days
ALTER TABLE market.candles SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'pair_id, timeframe'
);

SELECT add_compression_policy('market.candles', INTERVAL '90 days', if_not_exists => TRUE);
