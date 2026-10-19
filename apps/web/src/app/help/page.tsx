"use client";

import { LegalPageShell } from "@/components/LegalPageShell";
import { useLocale } from "@/lib/i18n";
import { SupportContacts } from "@/components/SupportContacts";

/** Тексты вопросов остаются в t.help.faq. Чтобы вернуть блок — поставьте true. */
const SHOW_HELP_FAQ = false;

export default function HelpPage() {
  const { t } = useLocale();

  return (
    <LegalPageShell title={t.help.title} subtitle={t.help.subtitle}>
      <SupportContacts showLabel={false} />

      {SHOW_HELP_FAQ && (
        <>
          <h2 className="text-lg font-semibold text-white mt-10 not-prose">{t.help.faqTitle}</h2>
          <div className="grid gap-3 mt-4 not-prose">
            {t.help.faq.map((item) => (
              <details key={item.q} className="viz-card px-4 py-3 group">
                <summary className="cursor-pointer text-sm font-medium text-gray-200 list-none flex justify-between gap-2">
                  {item.q}
                  <span className="text-muted group-open:rotate-45 transition-transform shrink-0">+</span>
                </summary>
                <p className="text-sm text-muted mt-3 pb-1 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </>
      )}
    </LegalPageShell>
  );
}
