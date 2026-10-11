"use client";

import {
  SUPPORT_EMAIL,
  TELEGRAM_HANDLE,
  TELEGRAM_URL,
  telegramContactKind,
} from "@/lib/supportContact";
import { useLocale } from "@/lib/i18n";

export function SupportContacts() {
  const { t } = useLocale();
  const tgKind = telegramContactKind();
  const telegramHint =
    tgKind === "channel"
      ? t.help.telegramHintChannel
      : tgKind === "personal"
        ? t.help.telegramHintPersonal
        : t.help.telegramHintGroup;

  return (
    <div className="grid sm:grid-cols-2 gap-4 not-prose mt-2">
      <div className="card-pro">
        <div className="card-pro-body space-y-3">
          <p className="label-caps text-muted">{t.help.email}</p>
          <p className="text-sm text-gray-200">{t.help.emailHint}</p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex items-center justify-center w-full rounded-xl border border-border/80 bg-panel-inner px-4 py-2.5 text-sm font-medium text-gray-100 hover:border-accent/40 transition-colors"
          >
            {SUPPORT_EMAIL}
          </a>
        </div>
      </div>

      <div className="card-pro">
        <div className="card-pro-body space-y-3">
          <p className="label-caps text-muted">{t.help.telegram}</p>
          <p className="text-sm text-gray-200">{telegramHint}</p>
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-full rounded-xl border border-border/80 bg-panel-inner px-4 py-2.5 text-sm font-medium text-gray-100 hover:border-accent/40 transition-colors"
          >
            {TELEGRAM_HANDLE}
          </a>
        </div>
      </div>
    </div>
  );
}
