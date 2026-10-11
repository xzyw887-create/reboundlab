"use client";

import { useLocale } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className="flex items-center rounded-lg border border-border/80 bg-panel-inner/80 p-0.5 text-xs font-medium"
      role="group"
      aria-label="Language"
    >
      {(["en", "ru"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={`px-2.5 py-1 rounded-md uppercase transition-colors ${
            locale === code
              ? "bg-accent/25 text-sky-100 border border-accent/40"
              : "text-muted hover:text-gray-200"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
