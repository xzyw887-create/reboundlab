import { query } from "@/lib/db";
import { ensureBillingSchema } from "@/lib/ensureBillingSchema";
import { activateBoundMethod, startTrialWithMethod } from "@/lib/autopay";
import {
  describeYooMethod,
  fetchYooKassaPaymentMethod,
} from "@/lib/yookassaClient";
import { yookassaConfigured } from "@/lib/yookassaConfig";

type MethodRow = {
  user_id: string;
  yookassa_method_id: string;
  method_type: string;
  purpose: string | null;
  status: string;
  title: string | null;
};

async function loadMethod(userId: string, methodId?: string | null): Promise<MethodRow | null> {
  await ensureBillingSchema();
  const rows = await query<MethodRow>(
    `SELECT user_id, yookassa_method_id, method_type, purpose, status, title
     FROM core.saved_payment_methods
     WHERE user_id = $1
       AND ($2::text IS NULL OR yookassa_method_id = $2)
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, methodId ?? null]
  );
  return rows[0] ?? null;
}

/** Привязка без списания: ждём status=active и saved=true, затем открываем доступ. */
export async function completeUserBind(
  userId: string,
  methodId?: string | null
): Promise<{ ready: boolean }> {
  const row = await loadMethod(userId, methodId);
  if (!row) return { ready: false };
  if (row.status === "active") {
    if (row.purpose === "trial") {
      try {
        await startTrialWithMethod(userId);
      } catch {
        /* пробный уже открыт */
      }
    }
    return { ready: true };
  }

  const purpose = row.purpose === "keep" ? "keep" : "trial";

  if (row.method_type === "local" || row.yookassa_method_id.startsWith("local-")) {
    await activateBoundMethod(userId, {
      externalId: row.yookassa_method_id,
      type: "local",
      title: row.title,
      purpose,
    });
    return { ready: true };
  }

  if (!yookassaConfigured()) return { ready: false };

  const remote = await fetchYooKassaPaymentMethod(row.yookassa_method_id);
  const active = remote.status === "active" && remote.saved !== false;
  if (!active) return { ready: false };

  await activateBoundMethod(userId, {
    externalId: remote.id,
    type: remote.type || row.method_type,
    title: describeYooMethod(remote),
    purpose,
  });
  return { ready: true };
}

export async function completeBindByMethodId(methodId: string): Promise<void> {
  await ensureBillingSchema();
  const rows = await query<{ user_id: string }>(
    `SELECT user_id FROM core.saved_payment_methods WHERE yookassa_method_id = $1 LIMIT 1`,
    [methodId]
  );
  const userId = rows[0]?.user_id;
  if (!userId) return;
  await completeUserBind(userId, methodId);
}
