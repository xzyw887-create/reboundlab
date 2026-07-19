"use client";

import Link from "next/link";
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
import {
  applyPreset,
  ACTIVE_STRATEGY_PRESETS,
  loadSavedPreset,
  savePresetId,
  type PresetId,
} from "@/lib/presets";
import { AutomaticComingSoonModal } from "@/components/AutomaticComingSoonModal";
import { TierGate } from "@/components/TierGate";
import {
  featuresForTier,
  planByTier,
  type PlanTier,
} from "@/lib/subscriptionTiers";
import { planDisplayName } from "@/lib/selectedPlan";
import {
  autoTrialsGridKey,
  countTotalCombos,
  DEFAULT_DROP_GRID,
  defaultAutoTrials,
  estimateAutomaticSeconds,
  formatDurationRu,
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
  if (source === "you") {
    return (
      <span
        className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-gray-700/80 text-gray-300 border border-gray-600/60"
        title="Вы задаёте это значение"
      >
        <span aria-hidden>🔒</span> вы
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-accent/20 text-accent border border-accent/40"
      title="Automatic подберёт — изменить нельзя"
    >
      <span aria-hidden>🔄</span> auto
    </span>
  );
}

function ParamLegend({ expanded }: { expanded: boolean }) {
  if (!expanded) return null;
  return (
    <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs space-y-2">
      <p className="text-accent font-semibold">Режим Automatic</p>
      <p className="text-muted">
        Поля с меткой <ParamBadge source="you" /> — редактируете вы (серая рамка).
        Блок <ParamBadge source="auto" /> — только просмотр: пунктир и цвет accent,
        значения подставит Automatic после подбора. Затем нажмите{" "}
        <span className="text-accent">Automatic</span>.
      </p>
      <div className="grid grid-cols-1 gap-1 pt-1 border-t border-accent/20">
        <p className="text-muted flex items-center gap-2 flex-wrap">
          <ParamBadge source="you" />
          <span>период, монеты, депозит, плечо, вход %, SL, усреднения вкл/выкл и их количество, трейлинг вкл/выкл</span>
        </p>
        <p className="text-muted flex items-center gap-2 flex-wrap">
          <ParamBadge source="auto" />
          <span>падение %, Take Profit, активация и откат трейлинга (если трейлинг включён), % падения и маржа усреднений</span>
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
  return (
    <div className="rounded-lg border border-dashed border-accent/45 bg-accent/10 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-accent/90">
        {label}
      </p>
      {value != null && value > 0 ? (
        <p className="text-base font-semibold text-accent mt-1">
          {value}
          {suffix}
        </p>
      ) : (
        <p className="text-sm text-muted italic mt-1">Подберёт Automatic</p>
      )}
      <p className="text-[11px] text-muted mt-1.5">Варианты перебора: {searchRange}</p>
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
  label: string;
  source?: ParamSource;
  showBadges?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="block space-y-1">
      <span className="text-xs text-muted flex items-center gap-2 flex-wrap">
        {showBadges && source && <ParamBadge source={source} />}
        <span>{label}</span>
      </span>
      {children}
      {hint && showBadges && <p className="text-xs text-accent/80 mt-1">{hint}</p>}
      {hint && !showBadges && <p className="text-xs text-muted mt-1">{hint}</p>}
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
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
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
          <span className={`block text-xs ${showBadges ? "text-accent/80" : "text-muted"}`}>
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
  const [symbolsError, setSymbolsError] = useState<string | null>(null);
  const [presetId, setPresetId] = useState<PresetId>("custom");
  const [automaticSoonOpen, setAutomaticSoonOpen] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    fetch("/api/symbols")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setSymbolsError(data.error);
          return;
        }
        setSymbolCatalog(data.symbols ?? []);
        setSymbolsError(null);
      })
      .catch((err: Error) => {
        if (!cancelled) setSymbolsError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeSelectedKey = useMemo(
    () =>
      params.symbols
        .filter((s) => !params.excluded_symbols.includes(s))
        .sort()
        .join(","),
    [params.symbols, params.excluded_symbols]
  );

  /** Обновить диапазоны при смене монет (после загрузки новых данных в БД) */
  useEffect(() => {
    if (!activeSelectedKey) return;
    let cancelled = false;
    fetch("/api/symbols")
      .then((r) => r.json())
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
        label="Падение для входа"
        searchRange={`${DEFAULT_DROP_GRID.join(", ")}%`}
        value={params.drop_pct}
      />
      <AutoReadonlyBox
        label="Take Profit"
        searchRange={`${formatTpGrid(tpGridValues)}%`}
        value={params.tp}
      />
      {params.trailing ? (
        <>
          <AutoReadonlyBox
            label="Активация трейлинга"
            searchRange="3, 5, 8%"
            value={params.trailing_activation}
          />
          <AutoReadonlyBox
            label="Откат от пика"
            searchRange="0.5, 1%"
            value={params.trailing_callback}
          />
        </>
      ) : (
        <p className="col-span-2 text-xs text-muted border border-accent/20 rounded-lg px-2 py-1.5 bg-accent/5">
          Трейлинг выключен — Automatic не подбирает активацию и откат.
        </p>
      )}
      {params.averaging_enabled && extraLegs > 0 && (
        <p className="col-span-2 text-xs text-muted border border-accent/20 rounded-lg px-2 py-1.5 bg-accent/5">
          Усреднения: % падения и маржа для {extraLegs} уровн(я/ей) — только перебор,
          не редактируется. Количество уровней задаёте вы.
        </p>
      )}
      <div className="col-span-2 rounded-lg border border-dashed border-accent/35 bg-accent/5 px-3 py-2 text-xs text-muted space-y-1">
        <p className="text-accent/90 font-medium">Сетка перебора (фиксированная)</p>
        <p>
          TP: {formatTpGrid(tpGridValues)}% · Падение: {DEFAULT_DROP_GRID.join(", ")}%
          {params.trailing
            ? " · Трейлинг: акт. 3, 5, 8% · откат 0.5, 1%"
            : ""}
        </p>
        <p className="text-[11px]">
          После нажатия Automatic значения выше обновятся. Редактировать их вручную нельзя
          — только параметры с меткой «вы».
        </p>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      <div className="tier-banner">
        <div>
          <p className="label-caps text-accent/80">Ваш тариф</p>
          <p className="text-sm font-semibold text-white">
            {currentPlan?.name ?? planDisplayName(planTier)}
            {planTier === "trial" && (
              <span className="text-muted font-normal ml-1">· 3 дня</span>
            )}
          </p>
          {authEmail && (
            <p className="text-[11px] text-muted mt-0.5 truncate">{authEmail}</p>
          )}
        </div>
        {authEmail ? (
          <Link
            href="/account"
            className="text-xs text-accent hover:text-accent/80 font-medium shrink-0"
          >
            Аккаунт
          </Link>
        ) : (
          onOpenPricing && (
            <button
              type="button"
              onClick={onOpenPricing}
              className="text-xs text-accent hover:text-accent/80 font-medium shrink-0"
            >
              Сменить тариф
            </button>
          )
        )}
      </div>

      <ParamLegend expanded={isAutomaticMode} />

      <Field label="Пресет стратегии">
        <select
          value={presetId}
          onChange={(e) => {
            const id = e.target.value as PresetId;
            setPresetId(id);
            savePresetId(id);
            if (id !== "custom") {
              let next = applyPreset(params, id);
              onChange(next);
            }
          }}
          className={isAutomaticMode ? "border-accent/50 bg-accent/5" : undefined}
        >
          {ACTIVE_STRATEGY_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted mt-1">
          {ACTIVE_STRATEGY_PRESETS.find((p) => p.id === presetId)?.description ??
            "Выберите готовый набор — поля ниже заполнятся сами. Монеты и даты не меняются."}
        </p>
      </Field>

      <SectionBlock title="Вы задаёте" variant="you" show={isAutomaticMode}>
      <Field label="Период теста" source="you" showBadges={isAutomaticMode}>
        <DateRangePicker
          startDate={params.start_date}
          endDate={params.end_date}
          coverage={selectedCoverage}
          planLabel={currentPlan?.name}
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
        <p className="text-xs text-muted mt-2">
          Реальные 1m свечи Binance Futures. Диапазон обновляется при смене монет
          и после загрузки новых данных в базу.
        </p>
      </Field>

      <Field label="Режим" source="you" showBadges={isAutomaticMode}>
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
            const loaded = loadedSymbols.map((s) => s.symbol);
            const pick =
              params.symbols.length >= 2
                ? params.symbols
                : loaded.length >= 2
                ? loaded.slice(0, 2)
                : DEMO_COINS.slice(0, 2);
            update({ mode, symbols: pick });
          }}
        >
          <option value="single">1 монета</option>
          <option value="multi" disabled={!tierFeatures.multiCoin}>
            Несколько монет{!tierFeatures.multiCoin ? " · Pro" : ""}
          </option>
        </select>
        {!tierFeatures.multiCoin && (
          <p className="text-[11px] text-muted mt-1">Несколько монет — в тарифе Pro</p>
        )}
      </Field>

      <Field
        label={`Монеты (${activeSelected.length} выбрано · ${loadedSymbols.length} доступно)`}
        source="you"
        showBadges={isAutomaticMode}
      >
        {symbolsError && (
          <p className="text-xs text-red-400 mb-2">
            Не удалось загрузить список монет: {symbolsError}
          </p>
        )}
        {!symbolsError && loadedSymbols.length === 0 && (
          <p className="text-xs text-gold/90 mb-2">
            Нет загруженных монет. Запустите:{" "}
            <code className="text-xs">
              bash scripts/load-market-data.sh 365 BTCUSDT,ETHUSDT,SOLUSDT
            </code>
          </p>
        )}
        <SymbolMultiSelect
          mode={params.mode}
          symbols={loadedSymbols}
          selected={params.symbols}
          excluded={params.excluded_symbols}
          onChange={(symbols, excluded) => {
            const active = symbols.filter((s) => !excluded.includes(s));
            update({
              symbols,
              excluded_symbols: excluded,
              mode:
                tierFeatures.multiCoin && active.length > 1
                  ? "multi"
                  : active.length <= 1
                  ? "single"
                  : params.mode,
            });
          }}
        />
        <p className="text-xs text-muted mt-2">
          Только монеты со свечами в базе. Добавить другие:{" "}
          <code className="text-xs">bash scripts/load-market-data.sh 90 SYMBOL</code>
        </p>
      </Field>

      {params.mode === "multi" && (
        <TierGate allowed={tierFeatures.multiCoin} requiredPlan="Pro">
          <Field label="Макс. открытых сделок одновременно" source="you" showBadges={isAutomaticMode}>
            <NumericInput
              value={params.max_open_trades ?? 0}
              onChange={(v) =>
                update({ max_open_trades: v > 0 ? Math.round(v) : null })
              }
              integer
              min={0}
              max={50}
            />
            <p className="text-xs text-muted mt-1">
              0 = без лимита. Например 3 — не более трёх позиций сразу на весь счёт.
            </p>
          </Field>
        </TierGate>
      )}

      <div className={`grid grid-cols-2 gap-3 ${isAutomaticMode ? "" : ""}`}>
        <Field label="Депозит ($)" source="you" showBadges={isAutomaticMode}>
          <NumericInput
            value={params.deposit}
            onChange={(deposit) => update({ deposit })}
            min={1}
          />
        </Field>
        <Field label="Вход (% от банка)" source="you" showBadges={isAutomaticMode}>
          <NumericInput
            value={params.entry_pct}
            onChange={(entry_pct) => update({ entry_pct })}
            step={0.1}
            min={0.1}
            max={100}
          />
          <p className="text-xs text-muted mt-1">
            Позиция = вход% × плечо. При 10% и 10x покупка на 100% банка — как при 100%
            и 1x.
          </p>
        </Field>
        <Field label="Плечо" source="you" showBadges={isAutomaticMode}>
          <NumericInput
            value={params.leverage}
            onChange={(leverage) => update({ leverage })}
            integer
            min={1}
            max={125}
          />
          <p className="text-xs text-muted mt-1">
            Умножает позицию: маржа × плечо = сумма покупки. Cross margin — ликвидация от
            всего баланса, не только от плеча.
          </p>
        </Field>
        {!isAutomaticMode && (
          <>
            <Field label="Падение для входа (%)">
              <NumericInput
                value={params.drop_pct}
                onChange={(drop_pct) => update({ drop_pct })}
                step={0.1}
                min={0.1}
              />
              <p className="text-xs text-muted mt-1">
                Покупка при падении % от пика после последней продажи.
              </p>
            </Field>
            <Field label="Take Profit (%)">
              <NumericInput
                value={params.tp}
                onChange={(tp) => update({ tp })}
                step={0.1}
                min={0.1}
              />
              <p className="text-xs text-muted mt-1">
                Рост цены на {params.tp}% от средней. При {params.leverage}x это ≈{" "}
                {(params.tp * params.leverage).toFixed(1)}% на маржу (ROE).
              </p>
            </Field>
          </>
        )}
        <Field
          label="Stop Loss (%)"
          source="you"
          showBadges={isAutomaticMode}
          hint={isAutomaticMode ? "0 = выключен. Automatic не меняет." : undefined}
        >
          <NumericInput
            value={params.sl ?? 0}
            onChange={(v) => update({ sl: v > 0 ? v : undefined })}
            step={0.5}
            min={0}
          />
          {!isAutomaticMode && (
            <p className="text-xs text-muted mt-1">
              0 = выключен. Закрытие при падении на {params.sl ?? 0}% от средней цены.
            </p>
          )}
        </Field>
      </div>

      <div className="rounded-lg border border-border/60 bg-panel-inner/50 p-3 text-xs text-muted space-y-1">
        <p>
          Комиссия: <span className="text-gray-300">0.05%</span> taker на открытие и закрытие
          (Binance USDT-M, каждая нога)
        </p>
        <p>
          Funding: реальные ставки Binance каждые 8ч (списание или зачисление).
        </p>
        <p>
          MMR: по размеру позиции (тиер Binance, от 0.4%).
        </p>
      </div>

      <TierGate allowed={tierFeatures.entryPctSplit} requiredPlan="Pro">
        <CheckboxRow
          checked={params.entry_pct_split}
          onChange={(entry_pct_split) => update({ entry_pct_split })}
          source="you"
          showBadges={isAutomaticMode}
          label="Разный % входа: обычные / мемы"
          disabled={!tierFeatures.entryPctSplit}
        />

        {params.entry_pct_split && (
          <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-gray-600/50 mt-3">
            <Field label="Обычные монеты %" source="you" showBadges={isAutomaticMode}>
              <NumericInput
                value={params.entry_pct_regular}
                onChange={(entry_pct_regular) => update({ entry_pct_regular })}
                step={0.5}
                min={0.1}
                max={100}
              />
            </Field>
            <Field label="Мем-монеты %" source="you" showBadges={isAutomaticMode}>
              <NumericInput
                value={params.entry_pct_meme}
                onChange={(entry_pct_meme) => update({ entry_pct_meme })}
                step={0.5}
                min={0.1}
                max={100}
              />
            </Field>
            <p className="col-span-2 text-xs text-muted">
              Обычные: BTC, ETH, SOL и др. Мемы: DOGE, PEPE, WIF, BONK и тикеры с
              префиксом 1000. Усреднения масштабируются пропорционально.
            </p>
          </div>
        )}
      </TierGate>

      <TierGate allowed={tierFeatures.trailing} requiredPlan="Pro">
        <CheckboxRow
          checked={params.trailing}
          onChange={(trailing) => update({ trailing })}
          source="you"
          showBadges={isAutomaticMode}
          label="Трейлинг TP"
          disabled={!tierFeatures.trailing}
          hint={
            isAutomaticMode
              ? params.trailing
                ? "Включён — активацию и откат подберёт Automatic."
                : "Выключен — трейлинг не используется."
              : undefined
          }
        />

        {!isAutomaticMode && params.trailing && (
          <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-accent/30 mt-3">
            <Field label="Активация (%)">
              <NumericInput
                value={params.trailing_activation}
                onChange={(trailing_activation) => update({ trailing_activation })}
                step={0.1}
                min={0.1}
              />
            </Field>
            <Field label="Откат от пика (%)">
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

      <TierGate allowed={tierFeatures.averagingMaxLegs > 0} requiredPlan="Pro">
        <CheckboxRow
          checked={params.averaging_enabled}
          onChange={(averaging_enabled) => update({ averaging_enabled })}
          source="you"
          showBadges={isAutomaticMode}
          label="Усреднения"
          disabled={tierFeatures.averagingMaxLegs <= 0}
          hint={
            isAutomaticMode
              ? "Вкл/выкл и количество — задаёте вы. % падения и маржу подберёт Automatic."
              : undefined
          }
        />

        {params.averaging_enabled && (
        <div className="space-y-3 pl-4 border-l-2 border-gray-600/50">
          <Field label="Сколько цен входа в сделке" source="you" showBadges={isAutomaticMode}>
            <select
              value={params.entry_prices_total}
              onChange={(e) =>
                update({
                  entry_prices_total: Number(e.target.value) as 2 | 3 | 4,
                })
              }
            >
              <option value={2}>2 цены (вход + 1 усреднение)</option>
              <option value={3}>3 цены (вход + 2 усреднения)</option>
              <option value={4}>4 цены (вход + 3 усреднения)</option>
            </select>
            <p className="text-xs text-muted mt-1">
              {isAutomaticMode
                ? "Automatic переберёт варианты % падения и маржи для каждого уровня (таблица ниже)."
                : "Каждая докупка — свой % маржи от банка, с тем же плечом что и вход."}
            </p>
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
                    <div key={i} className="grid grid-cols-2 gap-2">
                      <Field key={i} label={`Уср. ${i + 1}: падение от первого входа (%)`}>
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
                      </Field>
                      <Field label={`Уср. ${i + 1}: маржа (% банка)`}>
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
                        <p className="text-xs text-muted mt-1">
                          Номинал = {margin}% × {params.leverage}x ={" "}
                          <span className="text-gray-400">
                            {(margin * params.leverage).toFixed(0)}% банка
                          </span>
                        </p>
                      </Field>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted">
                Тейк — {params.tp}% от средней цены после всех усреднений.
                Докупка — когда цена упала на заданный % от{" "}
                <span className="text-gray-400">цены первого входа</span> (стартовой
                точки сделки).
              </p>
            </>
          )}
        </div>
      )}
      </TierGate>

      </SectionBlock>

      {isAutomaticMode && autoTrialEstimate && (
        <SectionBlock title="Сколько вариантов считать" variant="you" show>
          <p className="text-sm text-gray-200">
            Всего комбинаций:{" "}
            <span className="text-accent font-semibold">
              {autoTrialEstimate.totalCombos}
            </span>
            <span className="text-muted text-xs ml-2">
              (стандарт — 10% = {defaultAutoTrials(autoTrialEstimate.totalCombos)})
            </span>
          </p>

          <Field label={`Прогнать: ${selectedAutoTrials} из ${autoTrialEstimate.totalCombos}`}>
            <input
              type="range"
              min={1}
              max={autoTrialEstimate.totalCombos}
              value={selectedAutoTrials}
              onChange={(e) => setAutoTrials(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-700 accent-accent"
              aria-label="Сколько вариантов прогнать"
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
                    ? "border-accent bg-accent/20 text-accent"
                    : "border-border text-gray-300 hover:border-accent/60"
                }`}
              >
                Макс
              </button>
            </div>
            <p className="text-xs text-muted mt-2">
              {autoTrialEstimate.runAll
                ? `Полный перебор всех ${autoTrialEstimate.totalCombos} комбинаций`
                : `Случайная выборка ${autoTrialEstimate.trials} из ${autoTrialEstimate.totalCombos}`}
              {" · "}
              оценка{" "}
              <span className="text-gray-300">
                ~{formatDurationRu(autoTrialEstimate.seconds)}
              </span>
            </p>
            <p className="text-xs text-muted mt-1">
              Ползунок, поле ввода или «Макс». Время зависит от монет, периода и
              мощности компьютера — оценка приблизительная.
            </p>
          </Field>
          <label className="flex items-start gap-2 text-sm text-gray-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              className="mt-1 accent-accent"
              checked={params.auto_two_stage !== false}
              onChange={(e) => update({ auto_two_stage: e.target.checked })}
            />
            <span>
              <span className="font-medium">Два этапа подбора</span>
              <span className="block text-xs text-muted mt-0.5">
                Грубая сетка, затем уточнение TP ±0.5–1% вокруг лучшего (~6 прогонов)
              </span>
            </span>
          </label>
        </SectionBlock>
      )}

      {isAutomaticMode && (
        <SectionBlock title="Automatic подберёт (только просмотр)" variant="auto" show>
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
            Стоп — отменить подбор
          </button>
          <p className="text-xs text-center text-accent animate-pulse">
            {autoTrialEstimate
              ? formatElapsedProgress(
                  optElapsed,
                  autoTrialEstimate.seconds,
                  autoTrialEstimate.trials,
                  autoTrialEstimate.totalCombos,
                  autoTrialEstimate.capped
                )
              : "Automatic перебирает варианты…"}
          </p>
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
            disabled={loading || activeSelected.length === 0 || runBlocked}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Считаем…"
              : runBlocked
                ? "Прогон недоступен"
                : "Запустить бэктест"}
          </button>
          <button
            type="button"
            onClick={() => setAutomaticSoonOpen(true)}
            className="w-full rounded-lg border border-dashed border-accent/45 bg-accent/5 text-accent/90 font-medium py-2.5 px-4 hover:bg-accent/10 transition-colors text-sm"
          >
            Automatic — скоро
          </button>
        </div>
      )}

      <AutomaticComingSoonModal
        open={automaticSoonOpen}
        onClose={() => setAutomaticSoonOpen(false)}
      />

      <p className="text-xs text-muted text-center">
        {params.mode === "multi"
          ? "Кросс-маржа: один банк на все монеты"
          : "Одна монета, один банк"}
        {" · "}
        настройки сохраняются автоматически
      </p>
    </div>
  );
}
