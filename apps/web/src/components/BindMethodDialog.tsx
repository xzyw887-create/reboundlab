"use client";

import { useEffect } from "react";

interface Props {
  open: boolean;
  loading: boolean;
  error: string | null;
  amountLabel: string;
  localStub: boolean;
  onClose: () => void;
  onPick: (method: "bank_card" | "sbp") => void;
}

export function BindMethodDialog({
  open,
  loading,
  error,
  amountLabel,
  localStub,
  onClose,
  onPick,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, loading, onClose]);

  if (!open) return null;

  return (
    <div className="checkout-backdrop" role="dialog" aria-modal="true" onClick={() => !loading && onClose()}>
      <div className="checkout-panel" onClick={(e) => e.stopPropagation()}>
        <header className="checkout-header">
          <div>
            <p className="label-caps text-sky-300/90">Пробные сутки</p>
            <h2 className="text-xl font-bold text-white mt-1">Карта или СБП</h2>
          </div>
          <button type="button" onClick={onClose} className="pricing-window-close" aria-label="Закрыть" disabled={loading}>
            ×
          </button>
        </header>
        <div className="checkout-body space-y-4">
          <p className="text-sm text-muted leading-relaxed">
            Сейчас ничего не списывается. Способ оплаты сохраняется в ЮKassa. Через сутки спишется Basic{" "}
            {amountLabel}, дальше каждый месяц, пока не отмените автопродление в аккаунте.
          </p>
          {localStub && (
            <p className="text-xs text-amber-200/90 bg-amber-950/40 border border-amber-700/40 rounded-lg px-3 py-2">
              На этом компьютере банк не открывается: привязка тестовая, номер карты не сохраняется.
            </p>
          )}
          {error && (
            <p className="text-sm text-red-300 bg-red-950/40 border border-red-800/50 rounded-xl p-2">{error}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              className="btn-primary"
              disabled={loading}
              onClick={() => onPick("bank_card")}
            >
              {loading ? "…" : "Карта"}
            </button>
            <button
              type="button"
              className="landing-btn-outline py-2.5"
              disabled={loading}
              onClick={() => onPick("sbp")}
            >
              {loading ? "…" : "СБП"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
