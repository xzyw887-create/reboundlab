-- ReboundLab: Market data schema
-- Schema: market

CREATE SCHEMA IF NOT EXISTS market;

CREATE TYPE market.timeframe AS ENUM ('1m', '5m', '15m', '1h', '4h', '1d');
CREATE TYPE market.sync_status AS ENUM ('pending', 'running', 'completed', 'failed');

CREATE TABLE market.exchanges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    api_base_url VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE market.trading_pairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID NOT NULL REFERENCES market.exchanges(id),
    symbol VARCHAR(50) NOT NULL,
    base_asset VARCHAR(20) NOT NULL,
    quote_asset VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    history_from DATE,
    min_history_days INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(exchange_id, symbol)
);

CREATE TABLE market.sync_state (
    pair_id UUID NOT NULL REFERENCES market.trading_pairs(id),
    timeframe market.timeframe NOT NULL,
    last_candle_time TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    status market.sync_status NOT NULL DEFAULT 'pending',
    PRIMARY KEY (pair_id, timeframe)
);

CREATE TABLE market.sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES market.exchanges(id),
    pair_id UUID REFERENCES market.trading_pairs(id),
    level VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE market.load_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair_id UUID NOT NULL REFERENCES market.trading_pairs(id),
    timeframe market.timeframe NOT NULL,
    last_loaded_time TIMESTAMPTZ NOT NULL,
    status market.sync_status NOT NULL DEFAULT 'running',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(pair_id, timeframe)
);

CREATE INDEX idx_trading_pairs_quote ON market.trading_pairs(quote_asset) WHERE is_active = TRUE;
CREATE INDEX idx_trading_pairs_symbol ON market.trading_pairs(symbol);

-- Seed exchanges
INSERT INTO market.exchanges (code, name, api_base_url) VALUES
('binance', 'Binance', 'https://api.binance.com'),
('bybit', 'Bybit', 'https://api.bybit.com');
