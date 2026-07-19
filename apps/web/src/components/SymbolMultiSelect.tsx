"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SymbolInfo } from "@/lib/types";
import { coinKind, coinKindLabel, isMemeCoin } from "@/lib/coinCategories";

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
  const meme = isMemeCoin(item.symbol);
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
      <span className={`font-medium ${meme ? "text-gold" : "text-gray-100"}`}>
        {item.base}
      </span>
      <span
        className={`pill-tag shrink-0 ${meme ? "border-gold/30 text-gold/80" : ""}`}
      >
        {meme ? "мем" : "обычн."}
      </span>
      <span className="text-xs text-muted truncate ml-auto">
        {item.data_from && item.data_to
          ? `${item.data_from} — ${item.data_to}`
          : item.symbol}
      </span>
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

  const grouped = useMemo(() => {
    const regular: SymbolInfo[] = [];
    const meme: SymbolInfo[] = [];
    for (const s of filtered) {
      if (coinKind(s.symbol) === "meme") meme.push(s);
      else regular.push(s);
    }
    return { regular, meme };
  }, [filtered]);

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
      ? "Выберите монеты"
      : mode === "single"
      ? activeSelected[0].replace("USDT", "")
      : `Выбрано: ${activeSelected.length}`;

  const renderSection = (kind: "regular" | "meme", items: SymbolInfo[]) => {
    if (items.length === 0) return null;
    return (
      <div key={kind} className="py-1">
        <p className="label-caps px-2 py-1 text-muted/90 sticky top-0 bg-panel z-10">
          {coinKindLabel(kind)} ({items.length})
        </p>
        {items.map((item) => (
          <SymbolRow
            key={item.symbol}
            item={item}
            checked={isChecked(item.symbol)}
            mode={mode}
            onToggle={() => toggle(item.symbol)}
          />
        ))}
      </div>
    );
  };

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
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs border ${
                isMemeCoin(sym)
                  ? "bg-gold/10 border-gold/40 text-gold"
                  : "bg-accent/15 border-accent/40 text-accent"
              }`}
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
              placeholder="Поиск: BTC, PEPE, WIF…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <p className="text-xs text-muted px-2 py-3">Ничего не найдено</p>
            )}
            {renderSection("regular", grouped.regular)}
            {renderSection("meme", grouped.meme)}
          </div>

          {mode === "multi" && loaded.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 p-2 border-t border-border text-xs">
              <button
                type="button"
                className="text-accent hover:underline"
                onClick={() => selectGroup("regular")}
              >
                Все обычные
              </button>
              <button
                type="button"
                className="text-gold hover:underline"
                onClick={() => selectGroup("meme")}
              >
                Все мемы
              </button>
              <button
                type="button"
                className="text-muted hover:underline"
                onClick={clearAll}
              >
                Снять все
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
