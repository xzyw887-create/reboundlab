/** Живой период: пробный не истёк или оплаченный тариф ещё действует. */
export function hasLiveAccess(user: {
  trialExpired?: boolean;
  subscriptionExpired?: boolean;
} | null): boolean {
  if (!user) return false;
  return !user.trialExpired && !user.subscriptionExpired;
}

/** После входа: с активным тарифом — куда просили, без тарифа — на выбор плана. */
export function pathAfterLogin(
  user: {
    trialExpired?: boolean;
    subscriptionExpired?: boolean;
  } | null,
  next: string
): string {
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/app";
  if (!user) return safe;
  if (hasLiveAccess(user)) return safe;
  return "/pricing";
}
