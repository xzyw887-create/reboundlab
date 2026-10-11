"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BacktestParams, SymbolInfo } from "@/lib/types";
import { DEMO_COINS } from "@/lib/types";
import { NumericInput } from "@/components/NumericInput";
import { DateRangePicker } from "@/components/DateRangePicker";
import { SymbolMultiSelect } from "@/components/SymbolMultiSelect";
import { AveragingGridTable } from "@/components/AveragingGridTable";
import {
  clampDateRange,
  computeSelectedCoverage,
} from "@/lib/dateCoverage";
import type { PlanDateContext } from "@/lib/planDateLimits";
import { fetchSymbols } from "@/lib/fetchSymbols";
import { formatTpl, useLocale } from "@/lib/i18n";
import { coinKind, shortSymbol } from "@/lib/coinCategories";
import {
  applyPreset,
  ACTIVE_STRATEGY_PRESETS,
  loadSavedPreset,
  savePresetId,
  type PresetId,
} from "@/lib/presets";
import { applyCustomBaseline } from "@/lib/defaultParams";
import { AutomaticComingSoonPlate } from "@/components/AutomaticComingSoonPlate";
import { TierGate } from "@/components/TierGate";
import {
  featuresForTier,
  planByTier,
  type PlanTier,
} from "@/lib/subscriptionTiers";
import {
  autoTrialsGridKey,
  countTotalCombos,
  DEFAULT_DROP_GRID,
  defaultAutoTrials,
  estimateAutomaticSeconds,
  formatDuration,
  formatElapsedProgress,
  effectiveTpGrid,
  formatTpGrid,
  resolveAutoTrials,
} from "@/lib/automaticEstimate";

interface Props {
  params: BacktestParams;
  onChange: (p: BacktestParams) => void;
  onRun: () => void;
  onAutomatic: () => void;
  onStop: () => void;
  loading: boolean;
  optimizing?: boolean;
  planTier: PlanTier;
  onOpenPricing?: () => void;
  authEmail?: string | null;
  authRegisteredAt?: string | null;
  runBlocked?: boolean;
  runBlockedReason?: string | null;
}

type ParamSource = "you" | "auto";

function ParamBadge({ source }: { source: ParamSource }) {
  const { t } = useLocale();
  if (source === "you") {
    return (
      <span
        className="inline-flex h-5 shrink-0 items-center gap-0.5 rounded px-1.5 text-[10px] font-semibold uppercase tracking-wide bg-gray-700/80 text-gray-300 border border-gray-600/60 leading-none"
        title={t.strategy.auto.badgeYouTitle}
      >
        <span aria-hidden>🔒</span> {t.strategy.auto.badgeYou}
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-5 shrink-0 items-center gap-0.5 rounded px-1.5 text-[10px] font-semibold uppercase tracking-wide bg-accent/20 text-accent border border-accent/40 leading-none"
      title={t.strategy.auto.badgeAutoTitle}
    >
      <span aria-hidden>🔄</span> {t.strategy.auto.badgeAuto}
    </span>
  );
}

function ParamLegend({ expanded }: { expanded: boolean }) {
  const { t } = useLocale();
  if (!expanded) return null;
  return (
    <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs space-y-2">
      <p className="text-accent font-semibold">{t.strategy.auto.modeTitle}</p>
      <div className="grid grid-cols-1 gap-1 pt-1 border-t border-accent/20">
        <p className="text-muted flex items-center gap-2 flex-wrap">
          <ParamBadge source="you" />
          <span>{t.strategy.auto.legendYouFields}</span>
        </p>
        <p className="text-muted flex items-center gap-2 flex-wrap">
          <ParamBadge source="auto" />
          <span>{t.strategy.auto.legendAutoFields}</span>
        </p>
      </div>
    </div>
  );
}

function SectionBlock({
  title,
  variant,
  show,
  children,
}: {
  title: string;
  variant: ParamSource;
  show: boolean;
  children: React.ReactNode;
}) {
  if (!show) return <>{children}</>;
  return (
    <div
      className={`rounded-xl border p-3 space-y-3 ${
        variant === "you"
          ? "border-gray-600/50 bg-panel-inner/30"
          : "border-accent/50 border-dashed bg-accent/[0.07]"
      }`}
    >
      <h3 className="text-xs font-semibold text-gray-300 flex items-center gap-2">
        <ParamBadge source={variant} />
        {title}
      </h3>
      {children}
    </div>
  );
}

function AutoReadonlyBox({
  label,
  searchRange,
  value,
  suffix = "%",
}: {
  label: string;
  searchRange: string;
  value?: number | null;
  suffix?: string;
}) {
  const { t } = useLocale();
  return (
    <div className="rounded-lg border border-dashed border-accent/45 bg-accent/10 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-200">
        {label}
      </p>
      {value != null && value > 0 ? (
        <p className="text-base font-semibold text-accent mt-1">
          {value}
          {suffix}
        </p>
      ) : (
        <p className="text-sm text-muted italic mt-1">{t.strategy.auto.willPick}</p>
      )}
      <p className="text-[11px] text-muted mt-1.5">
        {formatTpl(t.strategy.auto.searchVariants, { range: searchRange })}
      </p>
    </div>
  );
}
function Field({
  label,
  source,
  showBadges,
  children,
  hint,
}: {
  label: React.ReactNode;
  source?: ParamSource;
  showBadges?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="form-field">
      <div className="form-field-label">
        {showBadges && source ? <ParamBadge source={source} /> : null}
        <span className="flex min-w-0 items-center gap-1 truncate">{label}</span>
      </div>
      <div className="form-field-control">{children}</div>
      {hint && showBadges && <p className="text-xs text-sky-200/90">{hint}</p>}
      {hint && !showBadges && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

function CheckboxRow({
  checked,
  onChange,
  source,
  showBadges,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  source: ParamSource;
  showBadges?: boolean;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 text-sm group ${
        disabled ? "cursor-not-allowed opacity-60 pointer-events-none" : "cursor-pointer"
      }`}
    >
      <span
        className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
          checked
            ? "border-accent bg-accent text-white"
            : "border-border bg-surface group-hover:border-gray-500"
        }`}
      >
        {checked && "✓"}
      </span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="space-y-0.5">
        <span className="flex items-center gap-2 flex-wrap">
          {showBadges && <ParamBadge source={source} />}
          {label}
        </span>
        {hint && (
          <span className={`block text-xs ${showBadges ? "text-sky-200/90" : "text-muted"}`}>
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}

export function StrategyForm({
  params,
  onChange,
  onRun,
  onAutomatic,
  onStop,
  loading,
  optimizing,
  planTier,
  onOpenPricing,
  authEmail,
  authRegisteredAt,
  runBlocked = false,
  runBlockedReason,
}: Props) {
  const [symbolCatalog, setSymbolCatalog] = useState<SymbolInfo[]>([]);
  const [symbolsLoading, setSymbolsLoading] = useState(true);
  const [symbolsError, setSymbolsError] = useState<string | null>(null);
  const [presetId, setPresetId] = useState<PresetId>("custom");

  const { t } = useLocale();
  const tierFeatures = useMemo(() => featuresForTier(planTier), [planTier]);
  const currentPlan = useMemo(() => planByTier(planTier), [planTier]);
  const planDateContext = useMemo<PlanDateContext>(
    () => ({
      tier: planTier,
      registeredAt: authRegisteredAt ?? null,
    }),
    [planTier, authRegisteredAt]
  );

  useEffect(() => {
    setPresetId(loadSavedPreset());
  }, []);

  const activeSelectedKey = useMemo(
    () =>
      params.symbols
        .filter((s) => !params.excluded_symbols.includes(s))
        .sort()
        .join(","),
    [params.symbols, params.excluded_symbols]
  );

  useEffect(() => {
    let cancelled = false;
    setSymbolsLoading(true);
    fetchSymbols()
      .then((data) => {
        if (cancelled) return;
        setSymbolCatalog(data.symbols ?? []);
        setSymbolsError(null);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setSymbolsError(err.message);
          setSymbolCatalog([]);
        }
      })
      .finally(() => {
        if (!cancelled) setSymbolsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const coinSelectionInitialized = useRef(false);
  /** Обновить каталог при смене монет (не при первом монтировании). */
  useEffect(() => {
    if (!activeSelectedKey) return;
    if (!coinSelectionInitialized.current) {
      coinSelectionInitialized.current = true;
      return;
    }
    let cancelled = false;
    fetchSymbols()
      .then((data) => {
        if (cancelled || data.error) return;
        setSymbolCatalog(data.symbols ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeSelectedKey]);

  const update = (patch: Partial<BacktestParams>) => {
    // В Automatic можно менять любые поля — режим не сбрасывается
    if (presetId !== "custom" && presetId !== "automatic") {
      setPresetId("custom");
      savePresetId("custom");
    }
    onChange({ ...params, ...patch });
  };

  const pickerSymbols = useMemo(() => {
    if (symbolCatalog.length > 0) return symbolCatalog;
    return DEMO_COINS.map((s) => ({
      symbol: s,
      base: s.replace("USDT", ""),
      active: true,
      history_from: null,
      data_from: null,
      data_to: null,
      candle_count: 0,
      loaded: false,
    }));
  }, [symbolCatalog]);

  const loadedSymbols = useMemo(
    () => pickerSymbols.filter((s) => s.loaded),
    [pickerSymbols]
  );

  const selectedCoverage = useMemo(
    () =>
      computeSelectedCoverage(
        params.symbols,
        params.excluded_symbols,
        loadedSymbols,
        planDateContext
      ),
    [params.symbols, params.excluded_symbols, loadedSymbols, planDateContext]
  );

  const coverageKey = selectedCoverage
    ? `${selectedCoverage.from}|${selectedCoverage.to}|${activeSelectedKey}`
    : null;
  const lastCoverageKey = useRef<string | null>(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  useEffect(() => {
    if (!selectedCoverage || !coverageKey) return;
    if (coverageKey === lastCoverageKey.current) return;
    lastCoverageKey.current = coverageKey;

    const p = paramsRef.current;
    const { start, end } = clampDateRange(
      p.start_date,
      p.end_date,
      selectedCoverage
    );
    if (start !== p.start_date || end !== p.end_date) {
      onChange({ ...p, start_date: start, end_date: end });
    }
  }, [coverageKey, selectedCoverage, onChange]);

  const activeSelected = params.symbols.filter(
    (s) => !params.excluded_symbols.includes(s)
  );

  const splitCoinGroups = useMemo(() => {
    const linear: string[] = [];
    const volatile: string[] = [];
    for (const sym of activeSelected) {
      if (coinKind(sym) === "meme") volatile.push(shortSymbol(sym));
      else linear.push(shortSymbol(sym));
    }
    return { linear, volatile };
  }, [activeSelected]);

  const extraLegs = Math.max(0, params.entry_prices_total - 1);
  const isAutomaticMode = false;
  const autoTrialEstimate = useMemo(() => {
    if (!isAutomaticMode) return null;
    const plan = resolveAutoTrials(params);
    const seconds = estimateAutomaticSeconds(params, plan.trials);
    return { ...plan, seconds };
  }, [isAutomaticMode, params]);
  const autoGridKey = useMemo(
    () => (isAutomaticMode ? autoTrialsGridKey(params) : null),
    [
      isAutomaticMode,
      params.trailing,
      params.averaging_enabled,
      params.entry_prices_total,
    ]
  );
  const [optElapsed, setOptElapsed] = useState(0);
  const optStartedRef = useRef<number | null>(null);
  const lastAutoGridKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAutomaticMode || !autoTrialEstimate || !autoGridKey) return;
    if (lastAutoGridKeyRef.current === autoGridKey) return;

    lastAutoGridKeyRef.current = autoGridKey;
    const ten = defaultAutoTrials(autoTrialEstimate.totalCombos);
    if (paramsRef.current.auto_trials !== ten) {
      onChange({ ...paramsRef.current, auto_trials: ten });
    }
  }, [isAutomaticMode, autoGridKey, autoTrialEstimate?.totalCombos, onChange]);

  useEffect(() => {
    if (!isAutomaticMode) {
      lastAutoGridKeyRef.current = null;
    }
  }, [isAutomaticMode]);

  useEffect(() => {
    if (!optimizing) {
      setOptElapsed(0);
      optStartedRef.current = null;
      return;
    }
    optStartedRef.current = Date.now();
    const id = window.setInterval(() => {
      if (optStartedRef.current != null) {
        setOptElapsed((Date.now() - optStartedRef.current) / 1000);
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [optimizing]);

  const selectedAutoTrials =
    autoTrialEstimate == null
      ? 1
      : (params.auto_trials ?? defaultAutoTrials(autoTrialEstimate.totalCombos));

  const setAutoTrials = (value: number) => {
    if (!autoTrialEstimate) return;
    update({
      auto_trials: Math.max(
        1,
        Math.min(autoTrialEstimate.totalCombos, Math.floor(value))
      ),
    });
  };

  const tpGridValues = effectiveTpGrid(params);

  const autoFields = isAutomaticMode ? (
    <div className="grid grid-cols-2 gap-3">
      <AutoReadonlyBox
        label={t.strategy.dropForEntry}
        searchRange={`${DEFAULT_DROP_GRID.join(", ")}%`}
        value={params.drop_pct}
      />
      <AutoReadonlyBox
        label={t.strategy.tp.replace(/\s*\(%\)$/, "")}
        searchRange={`${formatTpGrid(tpGridValues)}%`}
        value={params.tp}
      />
      {params.trailing ? (
        <>
          <AutoReadonlyBox
            label={t.strategy.trailingActivation}
            searchRange="3, 5, 8%"
            value={params.trailing_activation}
          />
          <AutoReadonlyBox
            label={t.strategy.trailingCallback}
            searchRange="0.5, 1%"
            value={params.trailing_callback}
          />
        </>
      ) : (
        <p className="col-span-2 text-xs text-muted border border-accent/20 rounded-lg px-2 py-1.5 bg-accent/5">
          {t.strategy.auto.trailingOffHint}
        </p>
      )}
      {params.averaging_enabled && extraLegs > 0 && (
        <p className="col-span-2 text-xs text-muted border border-accent/20 rounded-lg px-2 py-1.5 bg-accent/5">
          {formatTpl(t.strategy.auto.averagingHint, { n: extraLegs })}
        </p>
      )}
      <div className="col-span-2 rounded-lg border border-dashed border-accent/35 bg-accent/5 px-3 py-2 text-xs text-muted space-y-1">
        <p className="text-sky-200 font-medium">{t.strategy.auto.gridTitle}</p>
        <p>
          TP: {formatTpGrid(tpGridValues)}% · {t.strategy.dropPctShort}:{" "}
          {DEFAULT_DROP_GRID.join(", ")}%
          {params.trailing ? ` · ${t.strategy.auto.gridTrailingDetail}` : ""}
        </p>
        <p className="text-[11px]">{t.strategy.auto.gridFootnote}</p>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      <Field label={t.strategy.preset}>
        <select
          value={presetId}
          onChange={(e) => {
            const id = e.target.value as PresetId;
            setPresetId(id);
            savePresetId(id);
            if (id === "custom") {
              onChange(applyCustomBaseline(params));
            } else {
              onChange(applyPreset(params, id));
            }
          }}
          className={isAutomaticMode ? "border-accent/50 bg-accent/5" : undefined}
        >
          {ACTIVE_STRATEGY_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {t.strategy[p.labelKey]}
            </option>
          ))}
        </select>
      </Field>

      <SectionBlock title={t.strategy.parameters} variant="you" show={isAutomaticMode}>
      <Field label={t.strategy.mode} source="you" showBadges={isAutomaticMode}>
        <select
          value={params.mode}
          onChange={(e) => {
            const mode = e.target.value as "single" | "multi";
            if (mode === "multi" && !tierFeatures.multiCoin) return;
            if (mode === "single") {
              update({
                mode,
                symbols: [params.symbols[0] ?? DEMO_COINS[0]],
              });
              return;
            }
            update({ mode, symbols: params.symbols });
          }}
        >
          <option value="single">{t.strategy.modeSingle}</option>
          <option value="multi" disabled={!tierFeatures.multiCoin}>
            {t.strategy.modeMulti}
          </option>
        </select>
      </Field>

      <Field
        label={formatTpl(t.strategy.coinsSelected, { n: activeSelected.length })}
        source="you"
        showBadges={isAutomaticMode}
      >
        {symbolsLoading && (
          <p className="text-xs text-accent mb-2">{t.strategy.coinsLoading}</p>
        )}
        {symbolsError && (
          <p className="text-xs text-red-400 mb-2">
            {formatTpl(t.strategy.coinsLoadFailed, { error: symbolsError })}
          </p>
        )}
        {!symbolsLoading && !symbolsError && loadedSymbols.length === 0 && (
          <p className="text-xs text-gold/90 mb-2">{t.strategy.noCoins}</p>
        )}
        <SymbolMultiSelect
          mode={params.mode}
          symbols={loadedSymbols}
          selected={params.symbols}
          excluded={params.excluded_symbols}
          onChange={(symbols, excluded) => {
            const active = symbols.filter((s) => !excluded.includes(s));
            const nextMode =
              !tierFeatures.multiCoin
                ? "single"
                : active.length > 1 || params.mode === "multi"
                ? "multi"
                : "single";
            update({
              symbols,
              excluded_symbols: excluded,
              mode: nextMode,
            });
          }}
        />
      </Field>

      <Field label={t.strategy.period} source="you" showBadges={isAutomaticMode}>
        <DateRangePicker
          startDate={params.start_date}
          endDate={params.end_date}
          coverage={selectedCoverage}
          loading={symbolsLoading}
          onStartChange={(start_date) => {
            const end = params.end_date;
            if (selectedCoverage) {
              const clamped = clampDateRange(start_date, end, selectedCoverage);
              update({
                start_date: clamped.start,
                end_date: clamped.end,
              });
            } else {
              update({ start_date });
            }
          }}
          onEndChange={(end_date) => {
            if (selectedCoverage) {
              const clamped = clampDateRange(
                params.start_date,
                end_date,
                selectedCoverage
              );
              update({
                start_date: clamped.start,
                end_date: clamped.end,
              });
            } else {
              update({ end_date });
            }
          }}
        />
      </Field>

      {params.mode === "multi" && (
        <TierGate allowed={tierFeatures.multiCoin} title={t.strategy.maxOpenTrades} requiredPlan="Pro">
          <Field label={t.strategy.maxOpenTrades} source="you" showBadges={isAutomaticMode}>
            <NumericInput
              value={params.max_open_trades ?? 0}
              onChange={(v) =>
                update({ max_open_trades: v > 0 ? Math.round(v) : null })
              }
              integer
              min={0}
              max={50}
            />
          </Field>
        </TierGate>
      )}

      <div className="form-param-grid">
        <Field
          label={
            <>
              {t.strategy.deposit}
              <span className="text-muted tabular-nums shrink-0">$</span>
            </>
          }
          source="you"
          showBadges={isAutomaticMode}
        >
          <NumericInput
            value={params.deposit}
            onChange={(deposit) => update({ deposit })}
            min={1}
          />
        </Field>
        <Field label={t.strategy.entryPct} source="you" showBadges={isAutomaticMode}>
          <NumericInput
            value={params.entry_pct}
            onChange={(entry_pct) => update({ entry_pct })}
            integer
            min={1}
            max={100}
          />
        </Field>
        <Field label={t.strategy.leverage} source="you" showBadges={isAutomaticMode}>
          <NumericInput
            value={params.leverage}
            onChange={(leverage) => update({ leverage })}
            integer
            min={1}
            max={125}
          />
        </Field>
        {!isAutomaticMode && (
          <>
            <Field label={t.strategy.dropPctShort}>
              <NumericInput
                value={params.drop_pct}
                onChange={(drop_pct) => update({ drop_pct })}
                step={0.1}
                min={0.1}
              />
            </Field>
            <Field label={t.strategy.tp}>
              <NumericInput
                value={params.tp}
                onChange={(tp) => update({ tp })}
                step={0.1}
                min={0.1}
              />
            </Field>
          </>
        )}
        <Field
          label={t.strategy.sl}
          source="you"
          showBadges={isAutomaticMode}
          hint={isAutomaticMode ? t.strategy.slHint : undefined}
        >
          <NumericInput
            value={params.sl ?? 0}
            onChange={(v) => update({ sl: v > 0 ? v : undefined })}
            step={0.1}
            min={0}
          />
        </Field>
      </div>

      <TierGate allowed={tierFeatures.entryPctSplit} title={t.strategy.entrySplit} requiredPlan="Pro">
        <CheckboxRow
          checked={params.entry_pct_split}
          onChange={(entry_pct_split) => update({ entry_pct_split })}
          source="you"
          showBadges={isAutomaticMode}
          label={t.strategy.entrySplit}
          disabled={!tierFeatures.entryPctSplit}
        />

        {params.entry_pct_split && (
          <div className="space-y-2 pl-4 border-l-2 border-gray-600/50 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={`${t.strategy.linearPerpetuals} %`} source="you" showBadges={isAutomaticMode}>
                <NumericInput
                  value={params.entry_pct_regular}
                  onChange={(entry_pct_regular) => update({ entry_pct_regular })}
                  integer
                  min={1}
                  max={100}
                />
              </Field>
              <Field label={`${t.strategy.volatilityPairs} %`} source="you" showBadges={isAutomaticMode}>
                <NumericInput
                  value={params.entry_pct_meme}
                  onChange={(entry_pct_meme) => update({ entry_pct_meme })}
                  integer
                  min={1}
                  max={100}
                />
              </Field>
            </div>
            {activeSelected.length > 0 && (
              <div className="text-[11px] text-muted space-y-0.5 rounded-lg bg-panel-inner/60 p-2">
                <p className="font-medium text-gray-200">{t.strategy.splitAssigned}</p>
                <p>
                  {t.strategy.linearPerpetuals}:{" "}
                  {splitCoinGroups.linear.length > 0
                    ? splitCoinGroups.linear.join(", ")
                    : "—"}
                </p>
                <p>
                  {t.strategy.volatilityPairs}:{" "}
                  {splitCoinGroups.volatile.length > 0
                    ? splitCoinGroups.volatile.join(", ")
                    : "—"}
                </p>
              </div>
            )}
          </div>
        )}
      </TierGate>

      <TierGate allowed={tierFeatures.trailing} title={t.strategy.trailing} requiredPlan="Pro">
        <CheckboxRow
          checked={params.trailing}
          onChange={(trailing) => update({ trailing })}
          source="you"
          showBadges={isAutomaticMode}
          label={t.strategy.trailing}
          disabled={!tierFeatures.trailing}
        />

        {!isAutomaticMode && params.trailing && (
          <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-accent/30 mt-3">
            <Field label={t.strategy.trailingActivation}>
              <NumericInput
                value={params.trailing_activation}
                onChange={(trailing_activation) => update({ trailing_activation })}
                step={0.1}
                min={0.1}
              />
            </Field>
            <Field label={t.strategy.trailingCallback}>
              <NumericInput
                value={params.trailing_callback}
                onChange={(trailing_callback) => update({ trailing_callback })}
                step={0.1}
                min={0.1}
              />
            </Field>
          </div>
        )}
      </TierGate>

      <TierGate
        allowed={tierFeatures.averagingMaxLegs > 0}
        title={t.strategy.averaging}
        requiredPlan="Pro"
      >
        <CheckboxRow
          checked={params.averaging_enabled}
          onChange={(averaging_enabled) => update({ averaging_enabled })}
          source="you"
          showBadges={isAutomaticMode}
          label={t.strategy.averaging}
          disabled={tierFeatures.averagingMaxLegs <= 0}
        />

        {params.averaging_enabled && (
        <div className="space-y-3 pl-4 border-l-2 border-gray-600/50">
          <Field label={t.strategy.averagingLevels} source="you" showBadges={isAutomaticMode}>
            <select
              value={params.entry_prices_total}
              onChange={(e) =>
                update({
                  entry_prices_total: Number(e.target.value) as 2 | 3 | 4,
                })
              }
            >
              <option value={2}>{t.strategy.avg1}</option>
              <option value={3}>{t.strategy.avg2}</option>
              <option value={4}>{t.strategy.avg3}</option>
            </select>
          </Field>

          {isAutomaticMode && extraLegs > 0 && autoTrialEstimate && (
            <AveragingGridTable
              extraLegs={extraLegs}
              entryPct={params.entry_pct}
              entryPricesTotal={params.entry_prices_total}
              leverage={params.leverage}
              trailing={params.trailing}
              tpGrid={tpGridValues}
              totalCombos={autoTrialEstimate.totalCombos}
              trialsToRun={autoTrialEstimate.trials}
              capped={autoTrialEstimate.capped}
            />
          )}

          {!isAutomaticMode && (
            <>
              <div key={`avg-drops-${extraLegs}`} className="space-y-3">
                {Array.from({ length: extraLegs }, (_, i) => {
                  const drop = params.averaging_drops[i] ?? [5, 10, 15][i];
                  const margin =
                    params.averaging_margins[i] ?? params.entry_pct;
                  return (
                    <div key={i} className="grid grid-cols-2 gap-3 items-end">
                      <div className="space-y-1 min-w-0">
                        <span className="text-xs text-muted block leading-tight">
                          {formatTpl(t.strategy.avgDropShort, { n: i + 1 })}
                        </span>
                        <NumericInput
                          value={drop}
                          onChange={(val) => {
                            const drops = [...params.averaging_drops];
                            while (drops.length < 3) drops.push([5, 10, 15][drops.length]);
                            drops[i] = val;
                            update({ averaging_drops: drops });
                          }}
                          step={0.5}
                          min={0.5}
                        />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <span className="text-xs text-muted block leading-tight">
                          {formatTpl(t.strategy.avgMarginShort, { n: i + 1 })}
                        </span>
                        <NumericInput
                          value={margin}
                          onChange={(val) => {
                            const margins = [...params.averaging_margins];
                            while (margins.length < 3) {
                              margins.push(params.entry_pct);
                            }
                            margins[i] = val;
                            update({ averaging_margins: margins });
                          }}
                          step={0.1}
                          min={0.1}
                          max={100}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
      </TierGate>

      </SectionBlock>

      {isAutomaticMode && autoTrialEstimate && (
        <SectionBlock title={t.strategy.auto.trialsSection} variant="you" show>
          <p className="text-sm text-gray-200">
            {t.strategy.auto.trialsTotal}{" "}
            <span className="text-accent font-semibold">
              {autoTrialEstimate.totalCombos}
            </span>
            <span className="text-muted text-xs ml-2">
              {formatTpl(t.strategy.auto.trialsStandard, {
                n: defaultAutoTrials(autoTrialEstimate.totalCombos),
              })}
            </span>
          </p>

          <Field
            label={formatTpl(t.strategy.auto.trialsRun, {
              selected: selectedAutoTrials,
              total: autoTrialEstimate.totalCombos,
            })}
          >
            <input
              type="range"
              min={1}
              max={autoTrialEstimate.totalCombos}
              value={selectedAutoTrials}
              onChange={(e) => setAutoTrials(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-700 accent-accent"
              aria-label={t.strategy.auto.trialsRunAria}
            />
            <div className="flex items-center gap-2 mt-3">
              <NumericInput
                value={selectedAutoTrials}
                onChange={setAutoTrials}
                integer
                min={1}
                max={autoTrialEstimate.totalCombos}
              />
              <button
                type="button"
                onClick={() => setAutoTrials(autoTrialEstimate.totalCombos)}
                className={`shrink-0 px-4 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  autoTrialEstimate.runAll
                    ? "border-accent bg-accent/25 text-sky-100"
                    : "border-border text-gray-300 hover:border-accent/60"
                }`}
              >
                {t.strategy.auto.trialsMax}
              </button>
            </div>
            <p className="text-xs text-muted mt-2">
              {autoTrialEstimate.runAll
                ? formatTpl(t.strategy.auto.trialsFullScan, {
                    n: autoTrialEstimate.totalCombos,
                  })
                : formatTpl(t.strategy.auto.trialsSample, {
                    trials: autoTrialEstimate.trials,
                    total: autoTrialEstimate.totalCombos,
                  })}
              {" · "}
              {t.strategy.auto.trialsEstimate}{" "}
              <span className="text-gray-300">
                ~{formatDuration(autoTrialEstimate.seconds, t)}
              </span>
            </p>
            <p className="text-xs text-muted mt-1">{t.strategy.auto.trialsHint}</p>
          </Field>
          <label className="flex items-start gap-2 text-sm text-gray-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              className="mt-1 accent-accent"
              checked={params.auto_two_stage !== false}
              onChange={(e) => update({ auto_two_stage: e.target.checked })}
            />
            <span>
              <span className="font-medium">{t.strategy.auto.twoStageTitle}</span>
              <span className="block text-xs text-muted mt-0.5">
                {t.strategy.auto.twoStageDesc}
              </span>
            </span>
          </label>
        </SectionBlock>
      )}

      {isAutomaticMode && (
        <SectionBlock title={t.strategy.autoPickSection} variant="auto" show>
          {autoFields}
        </SectionBlock>
      )}

      {optimizing ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={onStop}
            className="w-full rounded-lg border border-red-500/60 bg-red-950/40 text-red-300 font-semibold py-2.5 px-4 hover:bg-red-900/50 transition-colors"
          >
            {t.strategy.auto.stopCancel}
          </button>
          <p className="text-xs text-center text-accent animate-pulse">
            {autoTrialEstimate
              ? formatElapsedProgress(
                  optElapsed,
                  autoTrialEstimate.seconds,
                  autoTrialEstimate.trials,
                  t,
                  autoTrialEstimate.totalCombos,
                  autoTrialEstimate.capped
                )
              : t.strategy.auto.searching}
          </p>
        </div>
      ) : loading ? (
        <div className="space-y-2">
          <button
            type="button"
            disabled
            className="btn-primary w-full opacity-60 cursor-wait"
          >
            {t.strategy.running}
          </button>
          <button
            type="button"
            onClick={onStop}
            className="w-full rounded-lg border border-red-500/60 bg-red-950/40 text-red-300 font-semibold py-2.5 px-4 hover:bg-red-900/50 transition-colors"
          >
            {t.strategy.cancel}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {runBlocked && runBlockedReason && (
            <p className="text-xs text-amber-200 bg-amber-950/40 border border-amber-600/40 rounded-lg p-2.5 text-center">
              {runBlockedReason}
            </p>
          )}
          <button
            onClick={onRun}
            disabled={activeSelected.length === 0 || runBlocked}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {runBlocked ? t.strategy.runBlocked : t.strategy.run}
          </button>
          <AutomaticComingSoonPlate />
        </div>
      )}
    </div>
  );
}
