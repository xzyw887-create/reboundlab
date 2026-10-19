"use client";

import { SUPPORT_EMAIL, TELEGRAM_URL } from "@/lib/supportContact";
import { useLocale } from "@/lib/i18n";

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor" aria-hidden>
      <path d="M21.5 4.3 18.2 20c-.25 1.1-.9 1.37-1.82.85l-5.04-3.72-2.43 2.34c-.27.27-.5.5-1.02.5l.36-5.13 9.35-8.45c.41-.36-.09-.56-.63-.2L6.2 12.86l-4.97-1.55c-1.08-.34-1.1-1.08.23-1.6L20.12 3.5c.9-.34 1.68.2 1.38.8Z" />
    </svg>
  );
}

export function SupportContacts({ showLabel = true }: { showLabel?: boolean }) {
  const { t } = useLocale();

  return (
    <div className="contact-marks">
      {showLabel && <p className="page-kicker contact-marks-label">{t.help.title}</p>}
      <div className="contact-marks-row">
        <a href={`mailto:${SUPPORT_EMAIL}`} className="contact-mark" aria-label={t.help.email}>
          <MailIcon />
        </a>
        <a
          href={TELEGRAM_URL}
          className="contact-mark"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t.help.telegram}
        >
          <TelegramIcon />
        </a>
      </div>
    </div>
  );
}
