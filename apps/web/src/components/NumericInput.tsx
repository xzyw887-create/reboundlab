"use client";

import { useState } from "react";

interface Props {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  integer?: boolean;
  prefix?: string;
  suffix?: string;
}

function formatDisplay(value: number, integer: boolean): string {
  if (integer) return String(Math.round(value));
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function clamp(value: number, min?: number, max?: number) {
  let next = value;
  if (min !== undefined) next = Math.max(min, next);
  if (max !== undefined) next = Math.min(max, next);
  return next;
}

function parseValue(raw: string, integer: boolean): number | null {
  if (raw === "" || raw === "-" || raw === ".") return null;
  const parsed = integer ? parseInt(raw, 10) : parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function NumericInput({
  value,
  onChange,
  step,
  min,
  max,
  integer = false,
  prefix,
  suffix,
}: Props) {
  const resolvedStep = step ?? (integer ? 1 : 0.1);
  const [draft, setDraft] = useState<string | null>(null);
  const editing = draft !== null;

  function commit(raw: string) {
    const parsed = parseValue(raw, integer);
    if (parsed === null) {
      setDraft(null);
      return;
    }

    let next = integer ? parsed : Math.round(parsed * 10) / 10;
    next = clamp(next, min, max);
    onChange(next);
    setDraft(null);
  }

  return (
    <div className="form-number-input flex items-center gap-1.5">
      {prefix ? (
        <span className="shrink-0 text-sm text-muted tabular-nums select-none">
          {prefix}
        </span>
      ) : null}
      <input
        type="number"
        step={resolvedStep}
        min={min}
        max={max}
        className={`min-w-0 flex-1 border-0 bg-transparent p-0 text-sm tabular-nums text-gray-100 focus:outline-none focus:ring-0 ${
          suffix ? "pr-1" : "pr-0"
        }`}
        value={editing ? draft ?? "" : formatDisplay(value, integer)}
        onFocus={(e) => {
          setDraft(formatDisplay(value, integer));
          e.target.select();
        }}
        onBlur={() => {
          if (draft !== null) commit(draft);
        }}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      {suffix ? (
        <span className="shrink-0 text-sm text-muted tabular-nums select-none">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}
