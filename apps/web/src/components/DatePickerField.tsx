"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Locale } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n";

const POPOVER_W = 272;
const POPOVER_H = 300;

function localIsoToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIso(iso: string): { y: number; m: number; d: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function toIso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function formatDisplay(iso: string, locale: Locale): string {
  const p = parseIso(iso);
  if (!p) return "";
  const dd = String(p.d).padStart(2, "0");
  const mm = String(p.m).padStart(2, "0");
  return locale === "ru" ? `${dd}.${mm}.${p.y}` : `${p.y}-${mm}-${dd}`;
}

function validateDateParts(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return toIso(y, m, d);
}

function parseDisplayInput(text: string, locale: Locale): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (/^\d{8}$/.test(trimmed)) {
    if (locale === "ru") {
      return validateDateParts(
        Number(trimmed.slice(4, 8)),
        Number(trimmed.slice(2, 4)),
        Number(trimmed.slice(0, 2))
      );
    }
    return validateDateParts(
      Number(trimmed.slice(0, 4)),
      Number(trimmed.slice(4, 6)),
      Number(trimmed.slice(6, 8))
    );
  }

  if (locale === "ru") {
    const m = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (m) return validateDateParts(Number(m[3]), Number(m[2]), Number(m[1]));
  } else {
    const m = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return validateDateParts(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  return null;
}

function monthLabel(year: number, month: number, locale: Locale): string {
  return new Date(year, month - 1, 1).toLocaleDateString(
    locale === "ru" ? "ru-RU" : "en-US",
    { month: "long", year: "numeric" }
  );
}

function buildMonthGrid(year: number, month: number): (number | null)[][] {
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (first.getDay() + 6) % 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

function findAsideBoundary(el: HTMLElement | null): DOMRect | null {
  let node: HTMLElement | null = el;
  while (node) {
    if (node.tagName === "ASIDE") {
      return node.getBoundingClientRect();
    }
    node = node.parentElement;
  }
  return null;
}

function computePopoverPos(
  anchor: DOMRect,
  align: "start" | "end",
  boundary: DOMRect | null
): { top: number; left: number } {
  const pad = 8;
  const minLeft = (boundary?.left ?? pad) + 4;
  const maxRight = (boundary?.right ?? window.innerWidth - pad) - 4;

  let left = align === "end" ? anchor.right - POPOVER_W : anchor.left;
  let top = anchor.bottom + 6;

  if (left + POPOVER_W > maxRight) {
    left = maxRight - POPOVER_W;
  }
  if (left < minLeft) {
    left = minLeft;
  }
  if (top + POPOVER_H > window.innerHeight - pad) {
    top = Math.max(pad, anchor.top - POPOVER_H - 6);
  }

  return { top, left };
}

interface Props {
  value: string;
  min: string;
  max: string;
  ariaLabel: string;
  align?: "start" | "end";
  onChange: (value: string) => void;
}

export function DatePickerField({
  value,
  min,
  max,
  ariaLabel,
  align = "start",
  onChange,
}: Props) {
  const { locale, t } = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const [draft, setDraft] = useState(() => formatDisplay(value, locale));
  const [focused, setFocused] = useState(false);

  const anchor = parseIso(value) ?? parseIso(localIsoToday())!;
  const [viewYear, setViewYear] = useState(anchor.y);
  const [viewMonth, setViewMonth] = useState(anchor.m);

  const todayIso = localIsoToday();
  const weekdays = t.dates.weekdays;

  useEffect(() => {
    if (!focused) setDraft(formatDisplay(value, locale));
  }, [value, locale, focused]);

  useEffect(() => {
    if (!open) return;
    const p = parseIso(value);
    if (p) {
      setViewYear(p.y);
      setViewMonth(p.m);
    }
  }, [open, value]);

  useEffect(() => {
    if (!open) return;

    let raf = 0;

    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onReposition() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;

      const outOfView =
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        rect.right < 0 ||
        rect.left > window.innerWidth;

      if (outOfView) {
        setOpen(false);
        return;
      }

      const boundary = findAsideBoundary(rootRef.current);
      setPopoverPos(computePopoverPos(rect, align, boundary));
    }

    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        onReposition();
      });
    }

    document.addEventListener("mousedown", onDocMouseDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onScroll, true);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [open, align]);

  const grid = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  function openPopover() {
    inputRef.current?.blur();
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) {
      const boundary = findAsideBoundary(rootRef.current);
      setPopoverPos(computePopoverPos(rect, align, boundary));
    }
    setOpen(true);
  }

  function commitDraft() {
    const iso = parseDisplayInput(draft, locale);
    if (iso && iso >= min && iso <= max) {
      onChange(iso);
      setDraft(formatDisplay(iso, locale));
    } else {
      setDraft(formatDisplay(value, locale));
    }
    setFocused(false);
  }

  function selectIso(iso: string) {
    if (iso < min || iso > max) return;
    onChange(iso);
    setOpen(false);
  }

  function selectDay(day: number) {
    selectIso(toIso(viewYear, viewMonth, day));
  }

  function selectToday() {
    selectIso(todayIso);
    const p = parseIso(todayIso);
    if (p) {
      setViewYear(p.y);
      setViewMonth(p.m);
    }
  }

  function prevMonth() {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const popover =
    open &&
    createPortal(
      <div
        ref={popoverRef}
        className="date-picker-popover date-picker-popover--fixed"
        role="dialog"
        aria-label={ariaLabel}
        style={{ top: popoverPos.top, left: popoverPos.left }}
      >
        <div className="date-picker-nav">
          <button type="button" className="date-picker-nav-btn" onClick={prevMonth} aria-label={t.dates.prevMonth}>
            ‹
          </button>
          <button
            type="button"
            className="date-picker-today-btn"
            onClick={selectToday}
            title={t.dates.today}
            aria-label={t.dates.today}
          />
          <button type="button" className="date-picker-nav-btn" onClick={nextMonth} aria-label={t.dates.nextMonth}>
            ›
          </button>
        </div>
        <p className="date-picker-month">{monthLabel(viewYear, viewMonth, locale)}</p>
        <div className="date-picker-weekdays">
          {weekdays.map((wd) => (
            <span key={wd}>{wd}</span>
          ))}
        </div>
        <div className="date-picker-grid">
          {grid.flat().map((day, i) => {
            if (day == null) {
              return <span key={`e-${i}`} className="date-picker-day date-picker-day--empty" />;
            }
            const iso = toIso(viewYear, viewMonth, day);
            const disabled = iso < min || iso > max;
            const isSelected = iso === value;
            const isToday = iso === todayIso;
            return (
              <button
                key={iso}
                type="button"
                disabled={disabled}
                onClick={() => selectDay(day)}
                className={`date-picker-day ${
                  isSelected ? "date-picker-day--selected" : ""
                } ${isToday ? "date-picker-day--today" : ""}`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>,
      document.body
    );

  return (
    <div className="date-range-field" ref={rootRef}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        aria-label={ariaLabel}
        className="date-range-input w-full min-w-0"
        value={focused ? draft : formatDisplay(value, locale)}
        onFocus={() => {
          setOpen(false);
          setDraft(formatDisplay(value, locale));
          setFocused(true);
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            inputRef.current?.blur();
          }
          if (e.key === "Escape") {
            setDraft(formatDisplay(value, locale));
            setFocused(false);
            inputRef.current?.blur();
          }
        }}
      />
      <button
        type="button"
        className="date-range-calendar-btn"
        aria-label={ariaLabel}
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={openPopover}
      />
      {popover}
    </div>
  );
}
