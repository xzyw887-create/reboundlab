import { NextRequest, NextResponse } from "next/server";
import { authUserJson, getAuthUser } from "@/lib/auth";
import { parseBillingInterval } from "@/lib/billingInterval";
import {
  clearPreviewSubscription,
  confirmPreviewCheckout,
} from "@/lib/flowPreviewCheckout";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }
  const body = (await req.json()) as { action?: string; tier?: string; interval?: string };
  try {
    if (body.action === "enroll") {
      return NextResponse.json({ error: "Недоступно" }, { status: 404 });
    } else if (!user.flowPreview) {
      return NextResponse.json({ error: "Недоступно" }, { status: 404 });
    } else if (body.action === "clear") {
      await clearPreviewSubscription(user.id);
    } else if (body.action === "confirm") {
      const tier = body.tier;
      if (tier !== "trial" && tier !== "basic" && tier !== "pro") {
        return NextResponse.json({ error: "Неверный тариф" }, { status: 400 });
      }
      await confirmPreviewCheckout(user.id, tier, parseBillingInterval(body.interval));
    } else {
      return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
    }

    const updated = await getAuthUser();
    if (!updated) {
      return NextResponse.json({ error: "Не удалось обновить аккаунт" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, user: authUserJson(updated) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ошибка";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
