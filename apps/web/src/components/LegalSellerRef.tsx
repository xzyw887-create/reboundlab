import Link from "next/link";
import { SELLER_DETAILS_ANCHOR } from "@/lib/legalSeller";

interface Props {
  text: string;
  linkLabel: string;
}

/** На /privacy — ссылка на полные реквизиты в оферте. */
export function LegalSellerRef({ text, linkLabel }: Props) {
  return (
    <p className="text-[11px] sm:text-xs text-muted pt-6 leading-relaxed">
      {text}{" "}
      <Link
        href={`/terms#${SELLER_DETAILS_ANCHOR}`}
        className="text-accent/90 hover:underline"
      >
        {linkLabel}
      </Link>
      .
    </p>
  );
}
