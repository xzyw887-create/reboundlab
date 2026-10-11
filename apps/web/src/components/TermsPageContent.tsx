"use client";

import Link from "next/link";
import { useEffect } from "react";
import { LegalPageShell } from "@/components/LegalPageShell";
import { legalCopy } from "@/lib/i18n/legalContent";
import { useLocale } from "@/lib/i18n";
import {
  SELLER_FULL_NAME,
  SELLER_INN,
  SELLER_LEGAL_STATUS,
} from "@/lib/legalSeller";
import { SUPPORT_EMAIL, TELEGRAM_HANDLE, TELEGRAM_URL } from "@/lib/supportContact";

export function TermsPageContent() {
  const { locale } = useLocale();
  const c = legalCopy[locale].terms;

  useEffect(() => {
    document.title = c.metaTitle;
  }, [c.metaTitle]);

  return (
    <LegalPageShell title={c.title} subtitle={c.subtitle}>
      <p>{c.intro}</p>

      <h2 className="text-lg font-semibold text-white pt-4">{c.sellerHeading}</h2>
      <ul className="list-none space-y-1 pl-0">
        <li>{SELLER_FULL_NAME}</li>
        <li>
          {c.sellerInnLabel}: {SELLER_INN}
        </li>
        <li>{SELLER_LEGAL_STATUS}</li>
        <li>
          Email:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-accent hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </li>
        <li>
          Telegram:{" "}
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            {TELEGRAM_HANDLE}
          </a>
        </li>
        <li>
          {c.sellerChannels}{" "}
          <Link href="/help" className="text-accent hover:underline">
            /help
          </Link>
        </li>
      </ul>

      <h2 className="text-lg font-semibold text-white pt-4">{c.subjectHeading}</h2>
      <p>{c.subjectBody}</p>

      <h2 className="text-lg font-semibold text-white pt-4">{c.pricingHeading}</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          {c.pricingPlansIntro}
          <Link href="/pricing" className="text-accent hover:underline">
            {c.pricingLinkLabel}
          </Link>
          .
        </li>
        <li>{c.pricingTrial}</li>
        <li>{c.pricingPaid}</li>
      </ul>

      <h2 className="text-lg font-semibold text-white pt-4">{c.deliveryHeading}</h2>
      <p>
        {c.deliveryBeforeApp}
        <Link href="/app" className="text-accent hover:underline">
          /app
        </Link>
        {c.deliveryAfterApp}
      </p>

      <h2 className="text-lg font-semibold text-white pt-4">{c.liabilityHeading}</h2>
      <p>
        {c.liabilityBody}{" "}
        <strong className="text-gray-200">{c.liabilityNote}</strong>
        {locale === "ru"
          ? " и не гарантируют доход. Решения на рынке принимает пользователь самостоятельно."
          : " and do not guarantee returns. You make your own trading decisions."}
      </p>

      <h2 className="text-lg font-semibold text-white pt-4">{c.useHeading}</h2>
      <p>{c.useBody}</p>

      <p className="text-xs text-muted pt-6">{c.updated}</p>
    </LegalPageShell>
  );
}
