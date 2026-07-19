import { NextResponse } from "next/server";
import type { PlanTier } from "@/lib/subscriptionTiers";
import { authUserJson, getAuthUser } from "@/lib/auth";
import { activateSubscription } from "@/lib/subscriptionActivate";

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
    }

    const body = (await req.json()) as { tier?: PlanTier };
    const tier = body.tier;
    if (!tier || (tier !== "basic" && tier !== "pro")) {
      return NextResponse.json({ error: "Укажите тариф basic или pro" }, { status: 400 });
    }

    await activateSubscription(user.id, tier);
    const updated = await getAuthUser();
    if (!updated) {
      return NextResponse.json({ error: "Ошибка обновления аккаунта" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      user: authUserJson(updated),
      message: "Подписка активирована",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ошибка сервера";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
