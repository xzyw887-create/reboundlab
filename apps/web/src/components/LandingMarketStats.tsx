"use client";

import { useLocale } from "@/lib/i18n";

function IconDatabase() {
  return (
    <svg viewBox="0 0 40 40" className="landing-proof-icon" fill="none" aria-hidden>
      <ellipse cx="20" cy="10" rx="11" ry="4.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M9 10v8c0 2.3 4.9 4.2 11 4.2s11-1.9 11-4.2v-8"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M9 18v8c0 2.3 4.9 4.2 11 4.2s11-1.9 11-4.2v-8"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function IconBars() {
  return (
    <svg viewBox="0 0 40 40" className="landing-proof-icon" fill="none" aria-hidden>
      <path d="M8 28V20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M15 28V15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M22 28V11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M29 28V7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 40 40" className="landing-proof-icon" fill="none" aria-hidden>
      <path
        d="M20 6.5l10.5 4.2v8.4c0 6.2-4.2 10.6-10.5 13.4C14.2 29.7 10 25.3 10 19.1v-8.4L20 6.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 19.2l3 3 6.2-6.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LandingMarketStats() {
  const { t } = useLocale();
  const s = t.landing.stats;
  const items = [
    { key: "years", value: s.yearsValue, caption: s.yearsCaption, icon: <IconDatabase /> },
    { key: "candles", value: s.candlesValue, caption: s.candlesCaption, icon: <IconBars /> },
    { key: "accuracy", value: s.accuracyValue, caption: s.accuracyCaption, icon: <IconShield /> },
  ];

  return (
    <div className="landing-proof">
      {items.map((item) => (
        <div key={item.key} className="landing-proof-card">
          {item.icon}
          <p className="landing-proof-copy">
            <span className="landing-proof-value">{item.value}</span>
            <span className="landing-proof-caption">{item.caption}</span>
          </p>
        </div>
      ))}
    </div>
  );
}
