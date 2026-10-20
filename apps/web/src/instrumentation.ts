export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startBillingScheduler } = await import("./lib/billingScheduler");
  startBillingScheduler();
}
