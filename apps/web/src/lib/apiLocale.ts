export type ApiLocale = "en" | "ru";

const STORAGE_KEY = "reboundlab-locale";

export function normalizeApiLocale(raw: string | null | undefined): ApiLocale {
  if (!raw) return "ru";
  const v = raw.trim().toLowerCase();
  if (v === "en" || v.startsWith("en-")) return "en";
  if (v === "ru" || v.startsWith("ru-")) return "ru";
  return "ru";
}

/** Server: Next.js route handlers */
export function localeFromRequest(req: Request): ApiLocale {
  const explicit = req.headers.get("x-locale");
  if (explicit) return normalizeApiLocale(explicit);

  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)reboundlab-locale=([^;]+)/);
  if (match?.[1]) return normalizeApiLocale(decodeURIComponent(match[1]));

  const accept = req.headers.get("accept-language");
  if (accept) {
    const first = accept.split(",")[0]?.trim();
    return normalizeApiLocale(first);
  }

  return "ru";
}

/** Browser: read saved UI locale */
export function clientApiLocale(): ApiLocale {
  if (typeof window === "undefined") return "ru";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return normalizeApiLocale(saved);
  } catch {
    return "ru";
  }
}
