"use client";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AutomaticComingSoonModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="automatic-soon-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-dashed border-accent/50 bg-panel shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-gradient-bar" />
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-accent/80">
                Скоро
              </p>
              <h2 id="automatic-soon-title" className="text-lg font-semibold text-gray-100 mt-1">
                Automatic — подбор параметров
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-muted hover:text-gray-200 text-xl leading-none px-1"
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>

          <p className="text-sm text-muted">
            Режим в разработке. Сейчас доступен классический бэктест — все параметры задаёте
            вы. Automatic появится в отдельном тарифе позже.
          </p>

          <ul className="text-sm text-gray-300 space-y-2 list-disc pl-5">
            <li>Перебор падения %, Take Profit, трейлинга</li>
            <li>Подбор усреднений (% падения и маржа)</li>
            <li>Два этапа: грубая сетка → уточнение TP</li>
            <li>Исключение монет с ликвидацией</li>
          </ul>

          <div className="rounded-lg border border-accent/25 bg-accent/5 px-3 py-2 text-xs text-muted">
            Код оптимизатора уже в проекте — включим, когда закроем подписки и оплату.
          </div>

          <button type="button" onClick={onClose} className="btn-primary w-full">
            Понятно — работаю с калькулятором
          </button>
        </div>
      </div>
    </div>
  );
}
