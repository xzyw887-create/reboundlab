"use client";

import Link from "next/link";
import { LegalPageShell } from "@/components/LegalPageShell";
import { useLocale } from "@/lib/i18n";
import { SupportContacts } from "@/components/SupportContacts";

export default function HelpPage() {
  const { t } = useLocale();

  return (
    <LegalPageShell title={t.help.title} subtitle={t.help.subtitle}>
      <SupportContacts />

      <h2 className="text-lg font-semibold text-white mt-10 not-prose">{t.help.faqTitle}</h2>
      <div className="grid gap-3 mt-4 not-prose">
        {t.help.faq.map((item) => (
          <details key={item.q} className="card-pro px-4 py-3 group">
            <summary className="cursor-pointer text-sm font-medium text-gray-200 list-none flex justify-between gap-2">
              {item.q}
              <span className="text-muted group-open:rotate-45 transition-transform shrink-0">+</span>
            </summary>
            <p className="text-sm text-muted mt-3 pb-1 leading-relaxed">{item.a}</p>
          </details>
        ))}
      </div>

      <div className="card-pro mt-8 not-prose">
        <div className="card-pro-body space-y-2">
          <p className="label-caps text-accent">{t.help.knowledgeBaseLabel}</p>
          <h2 className="text-base font-semibold text-white">{t.help.knowledgeBaseTitle}</h2>
          <p className="text-sm text-muted leading-relaxed">{t.help.knowledgeBaseText}</p>
        </div>
      </div>

      <div className="grid gap-4 mt-6 not-prose">
        {t.help.topics.map((item) => (
          <div key={item.title} className="card-pro px-4 py-4">
            <h2 className="text-sm font-semibold text-white">{item.title}</h2>
            <p className="text-sm text-muted mt-2 leading-relaxed">{item.text}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 not-prose">
        <Link href="/how-it-works" className="text-accent hover:underline">
          {t.nav.howItWorks} →
        </Link>
      </p>
    </LegalPageShell>
  );
}
