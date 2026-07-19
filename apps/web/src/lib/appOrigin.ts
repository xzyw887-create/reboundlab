/** Полный URL приложения на Render (калькулятор + auth). Пусто = тот же хост. */
export function fullAppUrl(path = "/"): string {
  const base = process.env.NEXT_PUBLIC_FULL_APP_URL?.replace(/\/$/, "");
  if (!base) return path.startsWith("/") ? path : `/${path}`;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function isExternalAppHost(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_FULL_APP_URL);
}
