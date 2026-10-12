"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useEffect, useMemo, useRef, useState } from "react";
import { StrategyForm } from "@/components/StrategyForm";
import { PriceChart } from "@/components/PriceChart";
import { PnlChart } from "@/components/PnlChart";
import { TradesTable } from "@/components/TradesTable";
import { TradesOutcomeSummary } from "@/components/TradesOutcomeSummary";
import { CompareRuns } from "@/components/CompareRuns";
import { AveragingGridTable } from "@/components/AveragingGridTable";
import type { BacktestParams, BacktestResult } from "@/lib/types";
import { TIMEFRAME_OPTIONS } from "@/lib/types";
import { loadSavedParams, saveParams, loadChartTimeframe, saveChartTimeframe } from "@/lib/savedParams";
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
import { isLocalTestMode, LOCAL_TEST_TIER } from "@/lib/localTestMode";
import {
  clampParamsToPlan,
  loadSelectedPlan,
  planDisplayName,
  saveSelectedPlan,
} from "@/lib/selectedPlan";
import { useLocale, formatTpl } from "@/lib/i18n";
import { closedOnlySummary } from "@/lib/closedOnlySummary";
import { BacktestReport } from "@/components/BacktestReport";
import { RunHistoryPanel, type SavedBacktestRun } from "@/components/RunHistoryPanel";
import { openTradesExportPage } from "@/lib/exportTradesCsv";
import { paramsSummary } from "@/lib/compareRuns";
import { DEFAULT_BACKTEST_PARAMS } from "@/lib/defaultParams";
import { apiFetch } from "@/lib/clientFetch";

type AppTab = "calculator" | "history";

interface ClientAuthUser {
  id: string;
  email: string;
  telegramId?: number | null;
  telegramUsername?: string | null;
  telegramDisplayName?: string | null;
  planTier: PlanTier;
  trialExpired: boolean;
  subscriptionExpired: boolean;
  expiresAt: string | null;
  registeredAt: string;
}

const DEFAULT_PARAMS = DEFAULT_BACKTEST_PARAMS;

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

  return null;
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
  const [compareViewActive, setCompareViewActive] = useState(false);
  const [planTier, setPlanTier] = useState<PlanTier>("trial");
  const [authUser, setAuthUser] = useState<ClientAuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appTab, setAppTab] = useState<AppTab>("calculator");
  const [historyRuns, setHistoryRuns] = useState<SavedBacktestRun[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const authUserRef = useRef<ClientAuthUser | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { t, locale } = useLocale();
  const effectiveTier = useMemo(() => {
    if (!authUser) return "trial";
    if (authUser.trialExpired) return "trial";
    if (isLocalTestMode()) return LOCAL_TEST_TIER;
    return authUser.planTier;
  }, [authUser]);

  const isGuest = !authUser;
  const accessBlocked =
    isGuest ||
    !!authUser?.trialExpired ||
    !!authUser?.subscriptionExpired;

  const tierFeatures = useMemo(() => featuresForTier(effectiveTier), [effectiveTier]);

  useEffect(() => {
    authUserRef.current = authUser;
  }, [authUser]);

  const applyParams = (next: BacktestParams) => {
    setParams(clampParamsToPlan(next, effectiveTier));
  };

  const goPricing = () => router.push("/pricing");

  const selectPlan = (tier: PlanTier) => {
    if (authUser) {
      goPricing();
      return;
    }
    setPlanTier(tier);
    saveSelectedPlan(tier);
    setParams((p) => clampParamsToPlan(p, tier));
  };

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    setAuthUser(null);
    setHistoryRuns([]);
    router.refresh();
  }

  async function loadHistory() {
    const user = authUserRef.current;
    if (!user) {
      setHistoryRuns([]);
      return;
    }
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await apiFetch("/api/runs");
      const data = await res.json();
      if (!res.ok) {
        setHistoryError(data.error ?? t.history.saveFailed);
        setHistoryRuns([]);
        return;
      }
      setHistoryRuns(data.runs ?? []);
    } catch {
      setHistoryRuns([]);
      setHistoryError(t.history.saveFailed);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function saveRunToCloud(data: BacktestResult, runParams: BacktestParams) {
    if (!authUserRef.current) return;
    try {
      const res = await apiFetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: paramsSummary(runParams, t),
          params: runParams,
          summary: {
            initial_deposit: data.summary.initial_deposit,
            final_balance: data.summary.final_balance,
            final_pnl_pct: data.summary.final_pnl_pct,
            realized_pnl_pct: data.summary.realized_pnl_pct,
            total_trades: data.summary.total_trades,
            symbols: data.summary.symbols,
            mode: data.mode,
            start_date: runParams.start_date,
            end_date: runParams.end_date,
          },
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setHistoryError(body.error ?? t.history.saveFailed);
        return;
      }
      setHistoryError(null);
      if (body.id) {
        const saved: SavedBacktestRun = {
          id: body.id,
          label: paramsSummary(runParams, t),
          params: runParams,
          summary: {
            initial_deposit: data.summary.initial_deposit,
            final_balance: data.summary.final_balance,
            final_pnl_pct: data.summary.final_pnl_pct,
            realized_pnl_pct: data.summary.realized_pnl_pct,
            total_trades: data.summary.total_trades,
            symbols: data.summary.symbols,
            mode: data.mode,
            start_date: runParams.start_date,
            end_date: runParams.end_date,
          },
          created_at: body.created_at ?? new Date().toISOString(),
        };
        setHistoryRuns((prev) => [saved, ...prev.filter((r) => r.id !== saved.id)]);
      } else {
        void loadHistory();
      }
    } catch {
      setHistoryError(t.history.saveFailed);
    }
  }

  function loadRunFromHistory(run: SavedBacktestRun) {
    const payload = clampParamsToPlan(
      { ...run.params, automatic: false, timeframe: "1m" },
      effectiveTier
    );
    setParams(payload);
    saveParams(payload);
    setAppTab("calculator");
    setSelectedTrade(null);
    void runBacktest(undefined, { skipHistorySave: true, baseParams: payload });
  }

  async function deleteHistoryRun(id: string) {
    await apiFetch(`/api/runs?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setHistoryRuns((prev) => prev.filter((r) => r.id !== id));
  }

  useEffect(() => {
    setCompareA(loadCompareSlot("A"));
    setCompareB(loadCompareSlot("B"));
  }, []);

  useEffect(() => {
    if (appTab === "history" && authUser) {
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appTab, authUser?.id]);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((data) => {
        if (cancelled) return;
        const user = data.user as ClientAuthUser | null;
        const saved = loadSavedParams(DEFAULT_PARAMS);
        if (user) {
          setAuthUser(user);
          authUserRef.current = user;
          const tier = user.trialExpired ? "trial" : user.planTier;
          setPlanTier(tier);
          setParams(
            clampParamsToPlan(
              saved,
              user.trialExpired ? "trial" : user.planTier
            )
          );
        } else {
          setAuthUser(null);
          authUserRef.current = null;
          const previewTier = loadSelectedPlan();
          setPlanTier(previewTier);
          setParams(clampParamsToPlan(saved, previewTier));
        }
        setChartTimeframe(loadChartTimeframe(saved.timeframe ?? DEFAULT_PARAMS.timeframe));
        if (saved.symbols[0]) setChartSymbol(saved.symbols[0]);
        setParamsReady(true);
        setAuthChecked(true);
      })
      .catch(() => {
        if (cancelled) return;
        const saved = loadSavedParams(DEFAULT_PARAMS);
        setAuthUser(null);
        authUserRef.current = null;
        const previewTier = loadSelectedPlan();
        setPlanTier(previewTier);
        setParams(clampParamsToPlan(saved, previewTier));
        setChartTimeframe(loadChartTimeframe(saved.timeframe ?? DEFAULT_PARAMS.timeframe));
        if (saved.symbols[0]) setChartSymbol(saved.symbols[0]);
        setParamsReady(true);
        setAuthChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!paramsReady) return;
    saveParams(params);
  }, [params, paramsReady]);

  useEffect(() => {
    if (!paramsReady) return;
    setParams((p) => clampParamsToPlan(p, effectiveTier));
  }, [effectiveTier, paramsReady]);

  async function runBacktest(
    overrides?: Partial<BacktestParams>,
    options?: { skipHistorySave?: boolean; baseParams?: BacktestParams }
  ) {
    if (isGuest) {
      setError(t.app.guestRunBlocked);
      return;
    }
    if (authUser?.trialExpired || authUser?.subscriptionExpired) {
      setError(
        authUser.subscriptionExpired
          ? t.app.subscriptionExpired + " — " + t.app.choosePlan
          : t.app.trialExpired + " — " + t.app.choosePlan
      );
      goPricing();
      return;
    }
    abortRef.current?.abort();
    const base = options?.baseParams ?? params;
    const payload = clampParamsToPlan(
      { ...base, ...overrides, automatic: false, timeframe: "1m" },
      effectiveTier
    );
    setLoading(true);
    setOptimizing(false);
    setError(null);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await apiFetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ac.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.auth.errorGeneric);
      setResult(data);
      setSelectedTrade(null);
      if (overrides || options?.baseParams) {
        setParams(payload);
        saveParams(payload);
      } else {
        saveParams(params);
      }
      if (!options?.skipHistorySave) {
        void saveRunToCloud(data, payload);
      }
      const firstSym = data.summary.symbols?.[0] ?? payload.symbols[0] ?? "BTCUSDT";
      setChartSymbol(firstSym);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : t.auth.errorGeneric);
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
    if (isGuest) {
      setError(t.app.guestRunBlocked);
      return;
    }
    if (authUser?.trialExpired || authUser?.subscriptionExpired) {
      setError(
        authUser.subscriptionExpired
          ? t.app.subscriptionExpired + " — " + t.app.choosePlan
          : t.app.trialExpired + " — " + t.app.choosePlan
      );
      goPricing();
      return;
    }
    abortRef.current?.abort();
    const { trials } = resolveAutoTrials(params);
    const payload = {
      ...params,
      automatic: true,
      auto_trials: trials,
      auto_grids: autoGridsPayload(params),
      timeframe: "1m",
    };
    setLoading(true);
    setOptimizing(true);
    setError(null);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await apiFetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ac.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.auth.errorGeneric);
      setResult(data);
      setSelectedTrade(null);
      void saveRunToCloud(data, params);
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
      setError(e instanceof Error ? e.message : t.auth.errorGeneric);
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
      label: slot === "A" ? t.compare.strategyA : t.compare.strategyB,
      params: { ...params, timeframe: chartTimeframe },
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

  function resetCompare() {
    clearCompare("A");
    clearCompare("B");
    setCompareViewActive(false);
  }

  function onChartTimeframeChange(tf: string) {
    setChartTimeframe(tf);
    saveChartTimeframe(tf);
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
  const closedSummary = s ? closedOnlySummary(s) : null;
  const displayBalance = closedSummary?.balance ?? 0;
  const displayPnlPct = closedSummary?.pnlPct ?? 0;
  const hasOpenAtEnd = (s?.open_trades ?? 0) > 0;
  const optRealized =
    result?.optimization?.best_realized_balance ??
    result?.optimization?.best_final_balance;

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted text-sm">
        …
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-panel/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <BrandLogo size="md" decorative />
            <div>
              <h1 className="title-gradient">BackTest Pro</h1>
              <p className="label-caps mt-0.5">
                {t.app.platformTag} ·{" "}
                {result?.mode === "multi" ? t.app.modeBadgeMulti : t.app.modeBadgeSingle}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-end">
            <LanguageSwitcher />
            {authUser ? (
              <div className="flex items-center gap-2 text-xs">
                <Link
                  href="/account"
                  className="pill-tag text-[10px] hover:border-accent/50 transition-colors"
                  title={t.nav.account}
                >
                  {planDisplayName(effectiveTier)}
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="text-muted hover:text-accent whitespace-nowrap"
                >
                  {t.nav.logout}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="hidden sm:inline-flex pill-tag text-[10px] text-accent/90 border-accent/30">
                  {t.landing.demo}
                </span>
                <Link href="/login?next=/app" className="btn-primary site-cta-sm text-xs">
                  {t.nav.login}
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {isGuest && (
        <div className="bg-sky-950/50 border-b border-sky-700/40 px-4 py-2.5 text-center text-sm text-sky-100">
          {t.app.demoBanner}{" "}
          <Link href="/login?next=/app" className="text-accent font-medium underline">
            {t.nav.login}
          </Link>
        </div>
      )}

      {(authUser?.trialExpired || authUser?.subscriptionExpired) && (
        <div className="bg-amber-950/40 border-b border-amber-600/40 px-4 py-2 text-center text-sm text-amber-200">
          {authUser.subscriptionExpired
            ? t.app.subscriptionExpired
            : t.app.trialExpired}{" "}
          <Link href="/pricing" className="text-accent underline">
            {t.app.choosePlan}
          </Link>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex gap-1 border-b border-border/60 pb-0">
          <button
            type="button"
            onClick={() => setAppTab("calculator")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              appTab === "calculator"
                ? "border-accent text-white"
                : "border-transparent text-muted hover:text-gray-200"
            }`}
          >
            {t.app.tabCalculator}
          </button>
          <button
            type="button"
            onClick={() => setAppTab("history")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              appTab === "history"
                ? "border-accent text-white"
                : "border-transparent text-muted hover:text-gray-200"
            }`}
          >
            {t.app.tabHistory}
          </button>
        </div>

        {historyError && (
          <p className="text-sm text-red-300 bg-red-950/40 border border-red-800/50 rounded-xl p-3">
            {historyError}
          </p>
        )}

        {appTab === "history" ? (
          <div className="max-w-3xl mx-auto w-full">
            {!authUser ? (
              <div className="card-pro">
                <div className="card-pro-body text-center py-10 space-y-3">
                  <p className="text-sm text-muted">{t.history.loginRequired}</p>
                  <Link href="/login?next=/app" className="btn-primary inline-block px-6">
                    {t.nav.login}
                  </Link>
                </div>
              </div>
            ) : (
              <RunHistoryPanel
                runs={historyRuns}
                loading={historyLoading}
                onLoad={loadRunFromHistory}
                onDelete={deleteHistoryRun}
              />
            )}
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside className="lg:col-span-3 lg:sticky lg:top-20 lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto lg:overscroll-contain pr-1">
          <div className="card-pro">
            <div className="card-pro-body pb-4">
              <p className="label-caps text-center mb-1">{t.app.strategy}</p>
              <h2 className="font-semibold text-center text-white mb-4">
                {t.app.paramsTitle}
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
              onOpenPricing={goPricing}
              authEmail={authUser?.email}
              authRegisteredAt={authUser?.registeredAt ?? null}
              runBlocked={accessBlocked}
              runBlockedReason={
                isGuest
                  ? t.app.guestRunBlocked
                  : authUser?.subscriptionExpired
                    ? t.app.subscriptionBlocked
                    : authUser?.trialExpired
                      ? t.app.trialBlocked
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
          <TierGate allowed={tierFeatures.compareRuns} title={t.compare.title} requiredPlan="Basic">
            <CompareRuns
              slotA={compareA}
              slotB={compareB}
              canSave={!!result && !loading && tierFeatures.compareRuns}
              compareActive={compareViewActive}
              onCompare={() => setCompareViewActive(true)}
              onExitCompare={() => setCompareViewActive(false)}
              onSaveA={() => saveToCompare("A")}
              onSaveB={() => saveToCompare("B")}
              onClearA={() => clearCompare("A")}
              onClearB={() => clearCompare("B")}
              onResetAll={resetCompare}
            />
          </TierGate>

          {!compareViewActive && result?.optimization && (
            <div className="card-pro border-accent/30">
              <div className="card-pro-body">
                <p className="font-semibold text-accent">{t.app.automaticBest}</p>
                <p className="text-sm text-muted mt-1">
                  {formatTpl(t.strategy.auto.optDropTp, {
                    drop: result.optimization.best_params.drop_pct,
                    tp: result.optimization.best_params.tp,
                  })}
                  {result.optimization.best_params.trailing
                    ? t.strategy.auto.optTrailing
                    : ""}
                  {result.optimization.best_params.excluded_symbols?.length ? (
                    <>
                      {t.strategy.auto.optExcluded}{" "}
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

          {!compareViewActive && s?.liquidated && s.liquidated_symbol && (
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-red-300 font-medium">
                  {t.app.liquidated} {s.liquidated_symbol.replace("USDT", "")}
                </p>
                <p className="text-sm text-red-400/80 mt-1">{t.app.liquidatedHint}</p>
              </div>
              <button
                onClick={() => excludeAndRerun(s.liquidated_symbol!)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium whitespace-nowrap"
              >
                {t.app.excludeRerun}
              </button>
            </div>
          )}

          {!compareViewActive && s && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: t.app.deposit, value: `$${s.initial_deposit}`, color: "text-white" },
                {
                  label: t.app.result,
                  value: `$${displayBalance.toFixed(2)}`,
                  color: displayPnlPct >= 0 ? "text-green-400" : "text-red-400",
                },
                {
                  label: t.app.profit,
                  value: `${displayPnlPct >= 0 ? "+" : ""}${displayPnlPct.toFixed(2)}%`,
                  color: displayPnlPct >= 0 ? "text-green-400" : "text-red-400",
                },
                {
                  label: t.app.coinsLabel,
                  value: s.symbols.map((x) => x.replace("USDT", "")).join(" + "),
                  color: "text-accent",
                },
              ].map((card) => (
                <div key={card.label} className="stat-card">
                  <p className="label-caps truncate">{card.label}</p>
                  <p className={`text-xl font-bold mt-2 tabular-nums ${card.color}`}>{card.value}</p>
                </div>
              ))}
            </div>
          )}

          {!compareViewActive && (
          <>
          <div className="card-pro">
            <div className="card-pro-body">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-baseline gap-2 min-w-0">
                <p className="label-caps">{t.app.chart}</p>
                {result && (
                  <span className="text-accent font-semibold text-sm truncate">
                    {chartSymbol.replace("USDT", "")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {result && (
                  <>
                    <select
                      value={chartTimeframe}
                      onChange={(e) => onChartTimeframeChange(e.target.value)}
                      className="bg-surface border border-border rounded-lg px-3 py-1 text-xs text-gray-300"
                      aria-label={t.app.chart}
                      title={t.app.chartTimeframeHint}
                    >
                      {TIMEFRAME_OPTIONS.map((tf) => (
                        <option key={tf.value} value={tf.value}>
                          {tf.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-gray-500 hidden sm:inline">
                      {t.app.chartTimeframeHint}
                    </span>
                  </>
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
                {t.app.runBacktestHint}
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
              />
              </div>
            </div>
          )}

          {result && (
            <div className="card-pro">
              <div className="card-pro-body">
              <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <h2 className="font-semibold text-white">{t.app.tradesTable}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  {s && <TradesOutcomeSummary summary={s} />}
                  <button
                    type="button"
                    className="btn-ghost px-3 py-1 text-xs shrink-0"
                    onClick={() =>
                      openTradesExportPage(tableTrades, {
                        filename: `backtest_${params.start_date}_${params.end_date}.csv`,
                        periodStart: params.start_date,
                        periodEnd: params.end_date,
                        locale,
                      })
                    }
                  >
                    {t.app.exportCsv}
                  </button>
                </div>
              </div>
              <TradesTable
                trades={tableTrades}
                showAveraging={params.averaging_enabled}
                account={
                  s
                    ? {
                        initialDeposit: s.initial_deposit,
                        closedNetPnlUsd:
                          closedSummary?.pnlUsd ?? s.closed_net_pnl_usd,
                        openNetPnlUsd: s.open_net_pnl_usd,
                      }
                    : undefined
                }
                selected={selectedTrade}
                onSelect={setSelectedTrade}
              />
              <BacktestReport result={result} />
              </div>
            </div>
          )}

          </>
          )}

          <p className="text-xs text-muted text-center pb-4">
            {t.app.disclaimer}
          </p>
        </div>
        </div>
        )}
      </main>

    </div>
  );
}
