"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SymbolInfo } from "@/lib/types";
import { coinKind } from "@/lib/coinCategories";
import { formatTpl, useLocale } from "@/lib/i18n";

interface Props {
  mode: "single" | "multi";
  symbols: SymbolInfo[];
  selected: string[];
  excluded: string[];
  onChange: (symbols: string[], excluded: string[]) => void;
}

function SymbolRow({
  item,
  checked,
  mode,
  onToggle,
}: {
  item: SymbolInfo;
  checked: boolean;
  mode: "single" | "multi";
  onToggle: () => void;
}) {
  return (
    <label
      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm cursor-pointer hover:bg-panel-inner ${
        checked ? "bg-accent/10" : ""
      }`}
    >
      <input
        type={mode === "single" ? "radio" : "checkbox"}
        name="symbol-pick"
        checked={checked}
        onChange={onToggle}
        className="shrink-0"
      />
      <span className="font-medium text-gray-100">{item.base}</span>
    </label>
  );
}

export function SymbolMultiSelect({
  mode,
  symbols,
  selected,
  excluded,
  onChange,
}: Props) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const loaded = useMemo(() => symbols.filter((s) => s.loaded), [symbols]);

  const activeSelected = useMemo(
    () => selected.filter((s) => !excluded.includes(s)),
    [selected, excluded]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return loaded;
    return loaded.filter(
      (s) => s.symbol.includes(q) || s.base.toUpperCase().includes(q)
    );
  }, [loaded, search]);

  const sortedFiltered = useMemo(
    () => [...filtered].sort((a, b) => a.base.localeCompare(b.base)),
    [filtered]
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const isChecked = (sym: string) =>
    selected.includes(sym) && !excluded.includes(sym);

  const toggle = (sym: string) => {
    if (mode === "single") {
      onChange([sym], excluded.filter((s) => s !== sym));
      setOpen(false);
      return;
    }

    if (isChecked(sym)) {
      const remaining = activeSelected.filter((s) => s !== sym);
      onChange(remaining.length > 0 ? remaining : [sym], excluded);
      return;
    }

    const next = selected.includes(sym) ? selected : [...selected, sym];
    onChange(next, excluded.filter((s) => s !== sym));
  };

  const selectGroup = (kind: "regular" | "meme") => {
    if (mode === "single") return;
    const groupSyms = loaded
      .filter((s) => coinKind(s.symbol) === kind)
      .map((s) => s.symbol);
    const merged = [...new Set([...activeSelected, ...groupSyms])];
    onChange(merged, []);
  };

  const clearAll = () => {
    const fallback = loaded[0]?.symbol ?? "BTCUSDT";
    onChange([fallback], []);
  };

  const label =
    activeSelected.length === 0
      ? t.strategy.chooseCoins
      : mode === "single"
      ? activeSelected[0].replace("USDT", "")
      : formatTpl(t.strategy.selectedCount, { n: activeSelected.length });

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-border/80 bg-panel-inner px-3 py-2.5 text-sm text-left hover:border-accent/40 transition-colors"
      >
        <span className="truncate">{label}</span>
        <span className="text-muted text-xs shrink-0">{open ? "▲" : "▼"}</span>
      </button>

      {activeSelected.length > 0 && mode === "multi" && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {activeSelected.map((sym) => (
            <span
              key={sym}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs border border-border/70 bg-panel-inner text-gray-200"
            >
              {sym.replace("USDT", "")}
              <button
                type="button"
                className="opacity-80 hover:opacity-100"
                onClick={() => toggle(sym)}
                aria-label={`Убрать ${sym}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-border/80 bg-panel shadow-glow overflow-hidden">
          <div className="p-2 border-b border-border">
            <input
              type="search"
              autoFocus
              placeholder={t.strategy.searchCoins}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="max-h-72 overflow-y-auto p-1">
            {sortedFiltered.length === 0 && (
              <p className="text-xs text-muted px-2 py-3">{t.strategy.noResults}</p>
            )}
            {sortedFiltered.map((item) => (
              <SymbolRow
                key={item.symbol}
                item={item}
                checked={isChecked(item.symbol)}
                mode={mode}
                onToggle={() => toggle(item.symbol)}
              />
            ))}
          </div>

          {mode === "multi" && loaded.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 p-2 border-t border-border text-xs text-muted">
              <button
                type="button"
                className="hover:text-gray-200 hover:underline"
                onClick={() => selectGroup("regular")}
              >
                {t.strategy.selectAllLinear}
              </button>
              <button
                type="button"
                className="hover:text-gray-200 hover:underline"
                onClick={() => selectGroup("meme")}
              >
                {t.strategy.selectAllVolatile}
              </button>
              <button
                type="button"
                className="hover:text-gray-200 hover:underline"
                onClick={clearAll}
              >
                {t.strategy.clearAll}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
