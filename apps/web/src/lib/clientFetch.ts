import { clientApiLocale } from "@/lib/apiLocale";

/** fetch with X-Locale so API errors match the UI language */
export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const locale = clientApiLocale();
  const headers = new Headers(init?.headers);
  headers.set("X-Locale", locale);
  return fetch(input, { ...init, headers });
}
