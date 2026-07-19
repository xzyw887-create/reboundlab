-- ReboundLab: Backtest schema
-- Schema: backtest

CREATE SCHEMA IF NOT EXISTS backtest;

CREATE TYPE backtest.run_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE backtest.trade_status AS ENUM ('open', 'closed', 'liquidated');

CREATE TABLE backtest.backtest_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES core.users(id),
    strategy_params JSONB NOT NULL,
    range_start DATE NOT NULL,
    range_end DATE NOT NULL,
    initial_deposit NUMERIC(20,8) NOT NULL,
    final_balance NUMERIC(20,8),
    final_pnl_pct NUMERIC(10,4),
    status backtest.run_status NOT NULL DEFAULT 'pending',
    liquidated BOOLEAN NOT NULL DEFAULT FALSE,
    liquidated_symbol VARCHAR(50),
    liquidated_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE backtest.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES backtest.backtest_runs(id) ON DELETE CASCADE,
    symbol VARCHAR(50) NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ,
    entry_pct_of_deposit NUMERIC(10,4) NOT NULL,
    leverage NUMERIC(6,2) NOT NULL,
    avg_count INT NOT NULL DEFAULT 0,
    avg_details JSONB NOT NULL DEFAULT '[]',
    avg_price NUMERIC(20,8),
    liq_price NUMERIC(20,8),
    pnl_usd NUMERIC(20,8),
    pnl_pct NUMERIC(10,4),
    fees_paid NUMERIC(20,8) NOT NULL DEFAULT 0,
    funding_paid NUMERIC(20,8) NOT NULL DEFAULT 0,
    status backtest.trade_status NOT NULL DEFAULT 'open',
    bank_at_open NUMERIC(20,8) NOT NULL,
    bank_at_close NUMERIC(20,8)
);

CREATE TABLE backtest.pnl_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES backtest.backtest_runs(id) ON DELETE CASCADE,
    snapshot_time TIMESTAMPTZ NOT NULL,
    balance NUMERIC(20,8) NOT NULL,
    pnl_pct NUMERIC(10,4) NOT NULL
);

CREATE TABLE backtest.optimization_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES core.users(id),
    symbols VARCHAR(50)[] NOT NULL,
    excluded_symbols VARCHAR(50)[] NOT NULL DEFAULT '{}',
    best_params JSONB,
    comparison JSONB,
    status backtest.run_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_backtest_runs_user ON backtest.backtest_runs(user_id);
CREATE INDEX idx_trades_run ON backtest.trades(run_id);
CREATE INDEX idx_pnl_snapshots_run ON backtest.pnl_snapshots(run_id, snapshot_time);
