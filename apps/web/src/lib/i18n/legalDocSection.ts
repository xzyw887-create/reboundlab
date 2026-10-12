/** Общая структура разделов юридических страниц (оферта, политика ПДн). */
export type LegalDocSection = {
  heading: string;
  paragraphs?: string[];
  items?: string[];
};

export type LegalPageFooterCopy = {
  updated: string;
};
