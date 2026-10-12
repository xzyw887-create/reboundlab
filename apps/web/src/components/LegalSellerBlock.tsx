import Link from "next/link";
import {
  SELLER_DETAILS_ANCHOR,
  SELLER_FULL_NAME,
  SELLER_INN,
  SELLER_LEGAL_STATUS,
} from "@/lib/legalSeller";
import { SUPPORT_EMAIL, TELEGRAM_HANDLE, TELEGRAM_URL } from "@/lib/supportContact";

interface Props {
  heading: string;
  innLabel: string;
  helpChannelsLabel: string;
  updated?: string;
}

/** Полные реквизиты исполнителя — один раз на /terms (ЮKassa, 152-ФЗ, оферта). */
export function LegalSellerBlock({ heading, innLabel, helpChannelsLabel, updated }: Props) {
  return (
    <footer
      id={SELLER_DETAILS_ANCHOR}
      className="mt-6 pt-6 border-t border-border/50 text-[11px] sm:text-xs text-muted leading-relaxed scroll-mt-24"
    >
      <p className="text-gray-400 font-medium">{heading}</p>
      <p className="mt-1.5 text-gray-300">
        {SELLER_FULL_NAME}
        <span className="text-muted"> · </span>
        {innLabel} {SELLER_INN}
      </p>
      <p className="mt-1">{SELLER_LEGAL_STATUS}</p>
      <p className="mt-2">
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-accent/90 hover:underline">
          {SUPPORT_EMAIL}
        </a>
        <span className="text-muted"> · </span>
        <a
          href={TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent/90 hover:underline"
        >
          {TELEGRAM_HANDLE}
        </a>
        <span className="text-muted"> · </span>
        <Link href="/help" className="text-accent/90 hover:underline">
          /help
        </Link>
      </p>
      <p className="mt-1 text-[10px] sm:text-[11px] text-muted/90">{helpChannelsLabel}</p>
      {updated && <p className="pt-3 text-muted">{updated}</p>}
    </footer>
  );
}
