import Link from "next/link";
import type { LegalDocSection } from "@/lib/i18n/legalDocSection";

const LINK_PATH = /^(\/(?:pricing|app|privacy|terms|help))$/;

export function renderLegalInlineLinks(text: string, keyPrefix: string) {
  const parts = text.split(/(\/(?:pricing|app|privacy|terms|help))/g);
  return parts.map((part, i) =>
    LINK_PATH.test(part) ? (
      <Link key={`${keyPrefix}-${i}`} href={part} className="text-accent hover:underline">
        {part}
      </Link>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    )
  );
}

export function LegalDocSections({ sections }: { sections: LegalDocSection[] }) {
  return (
    <>
      {sections.map((section) => (
        <section key={section.heading} className="pt-4 first:pt-0">
          <h2 className="text-lg font-semibold text-white">{section.heading}</h2>
          {section.paragraphs?.map((p) => (
            <p key={p.slice(0, 56)} className="mt-2">
              {renderLegalInlineLinks(p, p.slice(0, 12))}
            </p>
          ))}
          {section.items && (
            <ul className="list-disc pl-5 space-y-1 mt-2">
              {section.items.map((item) => (
                <li key={item}>{renderLegalInlineLinks(item, item.slice(0, 12))}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </>
  );
}
