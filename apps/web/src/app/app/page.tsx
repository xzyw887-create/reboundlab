"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PricingWindow } from "@/components/PricingWindow";
import { useEffect, useMemo, useRef, useState } from "react";
import { StrategyForm } from "@/components/StrategyForm";
import { PriceChart } from "@/components/PriceChart";
import { PnlChart } from "@/components/PnlChart";
import { TradesTable } from "@/components/TradesTable";
import { CompareRuns } from "@/components/CompareRuns";
import { AveragingGridTable } from "@/components/AveragingGridTable";
import type { BacktestParams, BacktestResult } from "@/lib/types";
import { TIMEFRAME_OPTIONS } from "@/lib/types";
import { loadSavedParams, saveParams } from "@/lib/savedParams";
import {
  clearCompareSlot,
  loadCompareSlot,
  saveCompareSlot,
  type SavedRun,
} from "@/lib/compareRuns";
import { resampleCandles } from "@/lib/resampleCandles";
import { resolveAutoTrials, autoGridsPayload } from "@/lib/automaticEstimate";
import { TierGate } from "@/components/TierGate";
import { featuresForTier, type PlanTier } from "@/lib/subscriptionTiers";
import {
  clampParamsToPlan,
  loadSelectedPlan,
  saveSelectedPlan,
} from "@/lib/selectedPlan";

interface ClientAuthUser {
  id: string;
  email: string;
  planTier: PlanTier;
  trialExpired: boolean;
  expiresAt: string | null;
  registeredAt: string;
}

const TEST_START = "2026-06-12";
const TEST_END = "2026-07-11";

const DEFAULT_PARAMS: BacktestParams = {
  mode: "single",
  symbols: ["BTCUSDT"],
  excluded_symbols: [],
  deposit: 100,
  entry_pct: 10,
  leverage: 5,
  drop_pct: 1,
  timeframe: "1m",
  tp: 2,
  trailing: false,
  trailing_activation: 2,
  trailing_callback: 2,
  averaging_enabled: true,
  entry_prices_total: 3,
  averaging_drops: [5, 10, 15],
  averaging_margins: [10, 10, 10],
  max_open_trades: null,
  entry_pct_split: false,
  entry_pct_regular: 10,
  entry_pct_meme: 5,
  data_source: "db",
  start_date: TEST_START,
  end_date: TEST_END,
  auto_two_stage: true,
};

const TF_SECONDS: Record<string, number> = {
  "1m": 60,
  "15m": 900,
  "30m": 1800,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
};

function snapToCandle(
  unix: number,
  candles: { time: number }[],
  timeframe: string
): number | null {
  if (candles.length === 0) return null;
  const period = TF_SECONDS[timeframe] ?? 60;

  for (const c of candles) {
    if (c.time <= unix && unix < c.time + period) {
      return c.time;
    }
  }

  const closest = candles.reduce((a, b) =>
    Math.abs(b.time - unix) < Math.abs(a.time - unix) ? b : a
  );
  return Math.abs(closest.time - unix) <= period ? closest.time : null;
}

function buildMarkers(
  trades: BacktestResult["trades"],
  symbol: string,
  candles: { time: number }[],
  timeframe: string
) {
  const filtered = trades.filter((t) => t.symbol === symbol);
  const markers: BacktestResult["markers"] = [];

  for (const trade of filtered) {
    const openTime = snapToCandle(
      Math.floor(new Date(trade.opened_at).getTime() / 1000),
      candles,
      timeframe
    );
    if (openTime !== null) {
      const buyPrice =
        trade.entries[0]?.price ?? trade.entry_price ?? trade.avg_price;
      markers.push({
        time: openTime,
        position: "inBar",
        color: "#22c55e",
        shape: "arrowUp",
        text: "",
        price: buyPrice,
        kind: "buy",
      });
    }

    if (trade.closed_at) {
      const closeTime = snapToCandle(
        Math.floor(new Date(trade.closed_at).getTime() / 1000),
        candles,
        timeframe
      );
      if (closeTime !== null && trade.status !== "open") {
        const sellPrice = trade.exit_price ?? trade.avg_price;
        markers.push({
          time: closeTime,
          position: "inBar",
          color: "#ef4444",
          shape: "arrowDown",
          text: "",
          price: sellPrice,
          kind: "sell",
        });
      }
    }

    for (const entry of trade.entries.slice(1)) {
      const avgTime = snapToCandle(
        Math.floor(new Date(entry.time).getTime() / 1000),
        candles,
        timeframe
      );
      if (avgTime !== null) {
        markers.push({
          time: avgTime,
          position: "inBar",
          color: "#eab308",
          shape: "circle",
          text: "",
          price: entry.price,
          kind: "avg",
        });
      }
    }
  }

  return markers.sort((a, b) => a.time - b.time);
}

export default function HomePage() {
  const router = useRouter();
  const [params, setParams] = useState<BacktestParams>(DEFAULT_PARAMS);
  const [paramsReady, setParamsReady] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<number | null>(null);
  const [chartSymbol, setChartSymbol] = useState<string>("BTCUSDT");
  const [chartTimeframe, setChartTimeframe] = useState<string>(DEFAULT_PARAMS.timeframe);
  const [compareA, setCompareA] = useState<SavedRun | null>(null);
  const [compareB, setCompareB] = useState<SavedRun | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [planTier, setPlanTier] = useState<PlanTier>("trial");
  const [authUser, setAuthUser] = useState<ClientAuthUser | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const effectiveTier = useMemo(() => {
    if (authUser) {
      return authUser.trialExpired ? "trial" : authUser.planTier;
    }
    return planTier;
  }, [authUser, planTier]);

  const tierFeatures = useMemo(() => featuresForTier(effectiveTier), [effectiveTier]);

  const applyParams = (next: BacktestParams) => {
    setParams(clampParamsToPlan(next, effectiveTier));
  };

  const selectPlan = (tier: PlanTier) => {
    if (authUser) {
      setPricingOpen(true);
      return;
    }
    setPlanTier(tier);
    saveSelectedPlan(tier);
    setParams((p) => clampParamsToPlan(p, tier));
  };

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthUser(null);
    router.refresh();
  }

  useEffect(() => {
    setCompareA(loadCompareSlot("A"));
    setCompareB(loadCompareSlot("B"));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((data) => {
        if (cancelled) return;
        const user = data.user as ClientAuthUser | null;
        setAuthUser(user);
        const tier = user?.planTier ?? loadSelectedPlan();
        setPlanTier(tier);
        const saved = loadSavedParams(DEFAULT_PARAMS);
        setParams(clampParamsToPlan(saved, user ? (user.trialExpired ? "trial" : user.planTier) : tier));
        setChartTimeframe(saved.timeframe);
        if (saved.symbols[0]) setChartSymbol(saved.symbols[0]);
        setParamsReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        const tier = loadSelectedPlan();
        setPlanTier(tier);
        const saved = loadSavedParams(DEFAULT_PARAMS);
        setParams(clampParamsToPlan(saved, tier));
        setParamsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!paramsReady) return;
    saveParams(params);
  }, [params, paramsReady]);

  async function runBacktest(overrides?: Partial<BacktestParams>) {
    if (authUser?.trialExpired) {
      setError("Пробный период закончился — выберите тариф Basic или Pro");
      setPricingOpen(true);
      return;
    }
    abortRef.current?.abort();
    const payload = clampParamsToPlan(
      { ...params, ...overrides, automatic: false },
      effectiveTier
    );
    setLoading(true);
    setOptimizing(false);
    setError(null);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ac.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка расчёта");
      setResult(data);
      setSelectedTrade(null);
      if (overrides) setParams(payload);
      saveParams(overrides ? payload : params);
      const firstSym = data.summary.symbols?.[0] ?? payload.symbols[0] ?? "BTCUSDT";
      setChartSymbol(firstSym);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
      setOptimizing(false);
      abortRef.current = null;
    }
  }

  function stopOptimization() {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setOptimizing(false);
    setError(null);
  }

  async function runAutomatic() {
    abortRef.current?.abort();
    const { trials } = resolveAutoTrials(params);
    const payload = {
      ...params,
      automatic: true,
      auto_trials: trials,
      auto_grids: autoGridsPayload(params),
    };
    setLoading(true);
    setOptimizing(true);
    setError(null);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ac.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка оптимизации");
      setResult(data);
      setSelectedTrade(null);
      if (data.optimization?.best_params) {
        const bp = data.optimization.best_params;
        const updated: BacktestParams = {
          ...params,
          drop_pct: bp.drop_pct,
          tp: bp.tp,
          trailing: bp.trailing,
          trailing_activation: bp.trailing_activation,
          trailing_callback: bp.trailing_callback,
          excluded_symbols: bp.excluded_symbols ?? params.excluded_symbols,
        };
        if (bp.averaging_drops?.length) {
          updated.averaging_enabled = true;
          updated.entry_prices_total = (bp.entry_prices_total ?? 2) as 2 | 3 | 4;
          updated.averaging_drops = bp.averaging_drops;
          updated.averaging_margins = bp.averaging_margins ?? params.averaging_margins;
        }
        setParams(updated);
        saveParams(updated);
      }
      const firstSym = data.summary.symbols?.[0] ?? params.symbols[0] ?? "BTCUSDT";
      setChartSymbol(firstSym);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
      setOptimizing(false);
      abortRef.current = null;
    }
  }

  function excludeAndRerun(symbol: string) {
    const excluded = [...new Set([...params.excluded_symbols, symbol])];
    const symbols = params.symbols.filter((s) => !excluded.includes(s));
    if (symbols.length === 0) return;
    runBacktest({ excluded_symbols: excluded, symbols });
  }

  function saveToCompare(slot: "A" | "B") {
    if (!result) return;
    const run: SavedRun = {
      label: `Прогон ${slot}`,
      params: { ...params },
      result,
      savedAt: new Date().toISOString(),
    };
    saveCompareSlot(slot, run);
    if (slot === "A") setCompareA(run);
    else setCompareB(run);
  }

  function clearCompare(slot: "A" | "B") {
    clearCompareSlot(slot);
    if (slot === "A") setCompareA(null);
    else setCompareB(null);
  }

  function onChartTimeframeChange(tf: string) {
    setChartTimeframe(tf);
    setParams((p) => ({ ...p, timeframe: tf }));
  }

  const s = result?.summary;
  const candles1m = useMemo(() => {
    if (!result) return [];
    return (
      result.candles_1m_by_symbol?.[chartSymbol] ??
      result.candles_by_symbol?.[chartSymbol] ??
      []
    );
  }, [result, chartSymbol]);
  const chartCandles = useMemo(
    () => resampleCandles(candles1m, chartTimeframe),
    [candles1m, chartTimeframe]
  );
  const chartMarkers = useMemo(
    () =>
      result
        ? buildMarkers(result.trades, chartSymbol, chartCandles, chartTimeframe)
        : [],
    [result, chartSymbol, chartCandles, chartTimeframe]
  );
  const tableTrades = result?.trades ?? [];
  const displayBalance = s?.realized_balance ?? s?.final_balance ?? 0;
  const displayPnlPct = s?.realized_pnl_pct ?? s?.final_pnl_pct ?? 0;
  const hasOpenAtEnd = (s?.open_trades ?? 0) > 0;
  const closedTrades =
    s?.closed_trades ?? (s ? s.total_trades - s.open_trades : 0);
  const closedNetPnl = s?.closed_net_pnl_usd ?? 0;
  const openNetPnl = s?.open_net_pnl_usd ?? s?.last_open_trade?.net_pnl_usd ?? 0;
  const optRealized =
    result?.optimization?.best_realized_balance ??
    result?.optimization?.best_final_balance;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-panel/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="logo-box">BP</div>
            <div>
              <h1 className="title-gradient">BackTest Pro</h1>
              <p className="label-caps mt-0.5">
                Crypto Backtesting Platform · Binance ·{" "}
                {result?.mode === "multi" ? "Multi-Coin" : "Single"}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setPricingOpen(true)}
              className="text-xs sm:text-sm text-accent hover:text-accent/80 font-medium whitespace-nowrap border border-accent/30 rounded-lg px-3 py-1.5 bg-accent/5 hover:bg-accent/10 transition-colors"
            >
              Тарифы
            </button>
            {authUser ? (
              <div className="hidden sm:flex items-center gap-2 text-xs">
                <Link
                  href="/account"
                  className="text-muted hover:text-accent truncate max-w-[140px]"
                >
                  {authUser.email}
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="text-muted hover:text-accent"
                >
                  Выйти
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-xs sm:text-sm text-muted hover:text-accent whitespace-nowrap"
              >
                Войти
              </Link>
            )}
          {s && (
            <div className="flex gap-5 text-sm">
              <div className="text-right">
                <p className="label-caps">
                  {hasOpenAtEnd ? "Счёт (закрытые)" : "Счёт"}
                </p>
                <p
                  className={`font-semibold ${
                    displayPnlPct >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  ${displayBalance.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="label-caps">
                  {hasOpenAtEnd ? "PnL (закрытые)" : "PnL"}
                </p>
                <p
                  className={`font-semibold ${
                    displayPnlPct >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {displayPnlPct >= 0 ? "+" : ""}
                  {displayPnlPct.toFixed(2)}%
                </p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="label-caps">Сделок</p>
                <p className="font-semibold text-white">
                  {s.total_trades}
                  <span className="text-muted text-xs font-normal ml-1">
                    (закр. {closedTrades}
                    {(s.open_trades ?? 0) > 0 ? ` · откр. ${s.open_trades}` : ""})
                  </span>
                </p>
              </div>
            </div>
          )}
          </div>
        </div>
      </header>

      {authUser?.trialExpired && (
        <div className="bg-amber-950/40 border-b border-amber-600/40 px-4 py-2 text-center text-sm text-amber-200">
          Пробный период закончился.{" "}
          <button
            type="button"
            onClick={() => setPricingOpen(true)}
            className="text-accent underline"
          >
            Выберите тариф Basic или Pro
          </button>
          {" "}(оплата скоро)
        </div>
      )}

      {!authUser && paramsReady && (
        <div className="bg-accent/5 border-b border-accent/20 px-4 py-2 text-center text-xs text-muted">
          Демо-режим — тариф только для просмотра.{" "}
          <Link href="/register" className="text-accent hover:underline">
            Регистрация — 3 дня бесплатно
          </Link>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-3">
          <div className="card-pro sticky top-24">
            <div className="card-pro-body">
              <p className="label-caps text-center mb-1">Стратегия</p>
              <h2 className="font-semibold text-center text-white mb-4">
                Параметры бэктеста
              </h2>
            <StrategyForm
              params={params}
              onChange={applyParams}
              onRun={() => runBacktest()}
              onAutomatic={() => runAutomatic()}
              onStop={stopOptimization}
              loading={loading}
              optimizing={optimizing}
              planTier={effectiveTier}
              onOpenPricing={() => setPricingOpen(true)}
              authEmail={authUser?.email}
              authRegisteredAt={authUser?.registeredAt ?? null}
              runBlocked={!!authUser?.trialExpired}
              runBlockedReason={
                authUser?.trialExpired
                  ? "Пробный период закончился — выберите тариф"
                  : null
              }
            />
            {error && (
              <p className="mt-3 text-sm text-red-300 bg-red-950/40 border border-red-800/50 rounded-xl p-2">
                {error}
              </p>
            )}
            </div>
          </div>
        </aside>

        <div className="lg:col-span-9 space-y-6">
          {result?.optimization && (
            <div className="card-pro border-accent/30">
              <div className="card-pro-body">
                <p className="font-semibold text-accent">Automatic — лучшие параметры</p>
                <p className="text-sm text-muted mt-1">
                  Падение {result.optimization.best_params.drop_pct}% · TP{" "}
                  {result.optimization.best_params.tp}%
                  {result.optimization.best_params.trailing ? " · трейлинг" : ""}
                  {result.optimization.best_params.excluded_symbols?.length ? (
                    <>
                      {" "}
                      · исключены:{" "}
                      {result.optimization.best_params.excluded_symbols
                        .map((s) => s.replace("USDT", ""))
                        .join(", ")}
                    </>
                  ) : null}
                </p>
                {result.optimization.best_params.averaging_drops?.length ? (
                  <div className="mt-3">
                    <AveragingGridTable
                      extraLegs={result.optimization.best_params.averaging_drops.length}
                      entryPct={params.entry_pct}
                      entryPricesTotal={
                        (result.optimization.best_params.entry_prices_total ??
                          result.optimization.best_params.averaging_drops.length + 1) as
                          | 2
                          | 3
                          | 4
                      }
                      leverage={params.leverage}
                      mode="picked-only"
                      picked={{
                        drops: result.optimization.best_params.averaging_drops,
                        margins:
                          result.optimization.best_params.averaging_margins ?? [],
                      }}
                    />
                  </div>
                ) : null}
                <p className="text-sm text-gray-300 mt-2">
                  Итог (закрытые): $
                  {(optRealized ?? 0).toFixed(2)}
                  {hasOpenAtEnd && result.optimization.best_final_balance != null && (
                    <>
                      {" "}
                      · с открытой: $
                      {result.optimization.best_final_balance.toFixed(2)}
                    </>
                  )}
                  {" · "}
                  {result.optimization.estimated_trials != null &&
                  result.optimization.estimated_trials > result.optimization.trials
                    ? `посчитано ${result.optimization.trials} случайных из ${result.optimization.estimated_trials}`
                    : `перебрано ${result.optimization.trials}`}{" "}
                  вариантов
                  {result.optimization.elapsed_seconds != null && (
                    <> · {result.optimization.elapsed_seconds.toFixed(1)} сек</>
                  )}
                  {result.optimization.two_stage && (
                    <>
                      {" "}
                      · этап 1: {result.optimization.stage1_trials ?? "—"}
                      {result.optimization.stage2_trials
                        ? ` · уточнение TP: ${result.optimization.stage2_trials}`
                        : ""}
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {s?.liquidated && s.liquidated_symbol && (
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-red-300 font-medium">
                  Ликвидация по {s.liquidated_symbol.replace("USDT", "")}
                </p>
                <p className="text-sm text-red-400/80 mt-1">
                  Весь депозит сгорел. Можно исключить монету и пересчитать.
                </p>
              </div>
              <button
                onClick={() => excludeAndRerun(s.liquidated_symbol!)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium whitespace-nowrap"
              >
                Исключить и пересчитать
              </button>
            </div>
          )}

          {s && (
            <div
              className={`card-pro ${
                hasOpenAtEnd ? "border-gold/30" : ""
              }`}
            >
              <div className={`card-pro-body ${hasOpenAtEnd ? "bg-gold/5" : ""}`}>
              <p
                className={`font-medium text-sm ${
                  hasOpenAtEnd ? "text-gold" : "text-gray-100"
                }`}
              >
                Сделок: {s.total_trades} · Закрыто: {closedTrades}
                {(s.open_trades ?? 0) > 0 && ` · Открыто: ${s.open_trades}`}
                {s.winning_trades > 0 && ` · В плюсе: ${s.winning_trades}`}
              </p>
              {hasOpenAtEnd ? (
                <div className="mt-3 space-y-2 text-sm">
                  <p className="text-gray-200">
                    <span className="text-gold font-semibold">Результат закрытых сделок:</span>{" "}
                    <span
                      className={
                        closedNetPnl >= 0 ? "text-green-400 font-semibold" : "text-red-400 font-semibold"
                      }
                    >
                      {closedNetPnl >= 0 ? "+" : ""}
                      ${closedNetPnl.toFixed(2)}
                    </span>
                    <span className="text-muted">
                      {" "}
                      · счёт ${displayBalance.toFixed(2)} ({displayPnlPct >= 0 ? "+" : ""}
                      {displayPnlPct.toFixed(2)}%)
                    </span>
                  </p>
                  {s.last_open_trade && (
                    <div className="rounded-lg border border-gold/30 bg-gold/5 p-3">
                      <p className="text-gold font-semibold text-xs uppercase tracking-wide">
                        Активная сделка на конец периода
                      </p>
                      <p className="text-gray-200 mt-1">
                        {s.last_open_trade.symbol.replace("USDT", "")}
                        {s.last_open_trade.avg_count != null && s.last_open_trade.avg_count > 0
                          ? ` · усреднений: ${s.last_open_trade.avg_count}`
                          : ""}
                      </p>
                      <p className="text-muted text-xs mt-1">
                        Средняя ${s.last_open_trade.avg_price?.toFixed(2) ?? "—"}
                        {s.last_open_trade.mark_price != null && (
                          <> · цена на конец ${s.last_open_trade.mark_price.toFixed(2)}</>
                        )}
                        {s.last_open_trade.target_exit_price != null && (
                          <> · TP ${s.last_open_trade.target_exit_price.toFixed(2)}</>
                        )}
                      </p>
                      <p className="mt-2">
                        Нереализованный PnL:{" "}
                        <span
                          className={
                            openNetPnl >= 0
                              ? "text-green-400 font-semibold"
                              : "text-red-400 font-semibold"
                          }
                        >
                          {openNetPnl >= 0 ? "+" : ""}${openNetPnl.toFixed(2)}
                        </span>
                        <span className="text-muted text-xs block mt-1">
                          Полный счёт с открытой позицией: ${s.final_balance.toFixed(2)} (
                          {s.final_pnl_pct >= 0 ? "+" : ""}
                          {s.final_pnl_pct.toFixed(2)}%)
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted mt-1">
                  Все сделки закрыты — итог в шапке отражает полный результат периода.
                </p>
              )}
              </div>
            </div>
          )}

          {s && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Депозит", value: `$${s.initial_deposit}`, color: "text-white" },
                {
                  label: hasOpenAtEnd ? "Итог (закрытые)" : "Итог",
                  value: `$${displayBalance.toFixed(2)}`,
                  color: displayPnlPct >= 0 ? "text-green-400" : "text-red-400",
                },
                {
                  label: hasOpenAtEnd ? "Прибыль (закрытые)" : "Прибыль",
                  value: `${displayPnlPct >= 0 ? "+" : ""}${displayPnlPct.toFixed(2)}%`,
                  color: displayPnlPct >= 0 ? "text-green-400" : "text-red-400",
                },
                {
                  label: "Монеты",
                  value: s.symbols.map((x) => x.replace("USDT", "")).join(" + "),
                  color: "text-accent",
                },
              ].map((card) => (
                <div key={card.label} className="stat-card">
                  <p className="label-caps">{card.label}</p>
                  <p className={`text-xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                </div>
              ))}
            </div>
          )}

          <TierGate allowed={tierFeatures.compareRuns} requiredPlan="Basic">
            <CompareRuns
              slotA={compareA}
              slotB={compareB}
              canSave={!!result && !loading && tierFeatures.compareRuns}
              onSaveA={() => saveToCompare("A")}
              onSaveB={() => saveToCompare("B")}
              onClearA={() => clearCompare("A")}
              onClearB={() => clearCompare("B")}
            />
          </TierGate>

          <div className="card-pro">
            <div className="card-pro-body">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <p className="label-caps">График</p>
                <h2 className="font-semibold text-white">
                  Цена + сделки
                {result ? (
                  <span className="text-accent font-normal text-sm ml-2">
                    {chartSymbol.replace("USDT", "")}
                  </span>
                ) : null}
                </h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {result && (
                  <select
                    value={chartTimeframe}
                    onChange={(e) => onChartTimeframeChange(e.target.value)}
                    className="bg-surface border border-border rounded-lg px-3 py-1 text-xs text-gray-300"
                    aria-label="Таймфрейм графика"
                  >
                    {TIMEFRAME_OPTIONS.map((tf) => (
                      <option key={tf.value} value={tf.value}>
                        {tf.label}
                      </option>
                    ))}
                  </select>
                )}
                {result && result.mode === "multi" && s?.symbols && (
                  <div className="flex gap-1">
                    {s.symbols.map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => setChartSymbol(sym)}
                        className={`px-3 py-1 rounded-lg text-xs transition-all ${
                          chartSymbol === sym
                            ? "chip-active font-semibold"
                            : "btn-ghost"
                        }`}
                      >
                        {sym.replace("USDT", "")}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {result ? (
              <PriceChart
                key={chartSymbol}
                candles={chartCandles}
                markers={chartMarkers}
              />
            ) : (
              <div className="h-[360px] flex items-center justify-center text-muted text-sm border border-border/60 rounded-xl bg-panel-inner">
                Нажмите «Запустить бэктест»
              </div>
            )}
            </div>
          </div>

          {result && result.pnl_curve.length > 0 && (
            <div className="card-pro">
              <div className="card-pro-body py-3">
              <PnlChart
                data={result.pnl_curve}
                initialDeposit={s?.initial_deposit ?? params.deposit}
                periodStart={result.meta?.start_date ?? params.start_date}
                periodEnd={result.meta?.end_date ?? params.end_date}
                height={130}
                excludesOpenTrade={s?.excludes_open_trade}
              />
              </div>
            </div>
          )}

          {result && (
            <div className="card-pro">
              <div className="card-pro-body">
              <p className="label-caps mb-1">Справка</p>
              <h2 className="font-semibold text-white mb-2">Как работает алгоритм</h2>
              <div className="text-xs text-muted space-y-2 leading-relaxed">
                <p>
                  <span className="text-green-400 font-medium">Покупка</span> — каждую минуту
                  смотрим цены на графике. Запоминаем пик (максимум). Покупаем, когда цена
                  упала на {params.drop_pct}% от пика. Первая сделка — те же правила, без
                  «авто-входа» в начале периода.
                </p>
                <p>
                  После продажи пик сбрасывается на цену выхода. Если цена выросла — пик
                  поднимается. Падение считается от пика, не обязательно от цены продажи.
                </p>
                <p>
                  <span className="text-red-400 font-medium">Продажа (TP)</span> — когда цена
                  выросла на {params.tp}% от средней (при {params.leverage}x плече ≈{" "}
                  {(params.tp * params.leverage).toFixed(0)}% на маржу). Ликвидация — когда
                  equity ≤ maintenance; после ликвидации баланс $0, торговля останавливается.
                </p>
                {params.averaging_enabled && (
                  <p>
                    <span className="text-yellow-400 font-medium">Усреднение</span> — до{" "}
                    {params.entry_prices_total} цен входа. Падение для докупки — % от{" "}
                    <span className="text-gray-300">первого входа</span>, маржа у каждого
                    усреднения своя.
                  </p>
                )}
                <p>
                  Вход: {params.entry_pct}% банка × {params.leverage}x ={" "}
                  {(params.entry_pct * params.leverage).toFixed(0)}% банка в позиции
                  (сложный процент). Одна сделка на монету одновременно.
                </p>
              </div>
              </div>
            </div>
          )}

          {result && (
            <div className="card-pro">
              <div className="card-pro-body">
              <p className="label-caps mb-1">Сделки</p>
              <h2 className="font-semibold text-white mb-3">Таблица сделок</h2>
              <TradesTable
                trades={tableTrades}
                account={
                  s
                    ? {
                        initialDeposit: s.initial_deposit,
                        displayEquity: displayBalance,
                        displayPnlPct,
                        fullEquity: hasOpenAtEnd ? s.final_balance : undefined,
                        fullPnlPct: hasOpenAtEnd ? s.final_pnl_pct : undefined,
                        closedNetPnlUsd: s.closed_net_pnl_usd,
                        openNetPnlUsd: s.open_net_pnl_usd,
                        openTrades: s.open_trades,
                      }
                    : undefined
                }
                selected={selectedTrade}
                onSelect={setSelectedTrade}
              />
              </div>
            </div>
          )}

          <p className="text-xs text-muted text-center pb-4">
            Не является финансовой рекомендацией. Результаты основаны на исторических данных.
          </p>
        </div>
      </main>

      <PricingWindow
        open={pricingOpen}
        onClose={() => setPricingOpen(false)}
        onSelectPlan={selectPlan}
      />
    </div>
  );
}
