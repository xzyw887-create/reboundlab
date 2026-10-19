/** Куда вести после входа: терминал только с живой подпиской и привязанным способом оплаты. */
export function pathAfterLogin(
  user: {
    devLocalTester?: boolean;
    paymentMethodBound?: boolean;
    trialExpired?: boolean;
    subscriptionExpired?: boolean;
  } | null,
  next: string
): string {
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/pricing";
  if (!user) return safe;
  const live =
    Boolean(user.paymentMethodBound) && !user.trialExpired && !user.subscriptionExpired;
  if (live) return safe;
  return "/pricing";
}
