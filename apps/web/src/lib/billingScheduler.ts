import { chargeAllDue } from "@/lib/chargeDue";

const globalKey = "__btpBillingScheduler";

/** Списание по окончании периода, без захода человека на сайт. */
export function startBillingScheduler(): void {
  const g = globalThis as typeof globalThis & { [globalKey]?: boolean };
  if (g[globalKey]) return;
  g[globalKey] = true;

  const tick = () => {
    void chargeAllDue().catch((err) => {
      console.error("[autopay]", err);
    });
  };

  setTimeout(tick, 15_000);
  setInterval(tick, 60_000);
}
