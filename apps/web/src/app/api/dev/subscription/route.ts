import { NextRequest, NextResponse } from "next/server";
import { authUserJson, getAuthUser } from "@/lib/auth";
import type { DevSubscriptionPreset } from "@/lib/devSubscriptionPreset";
import { isDevLocalTesterAccount } from "@/lib/devLocalAuth";
import { applyDevSubscriptionPreset } from "@/lib/devSubscriptionTools";

const PRESETS: DevSubscriptionPreset[] = [
  "trial",
  "trial_expired",
  "basic",
  "pro",
  "basic_expired",
  "pro_expired",
];

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }
  if (!isDevLocalTesterAccount(user.email)) {
    return NextResponse.json({ error: "Недоступно" }, { status: 404 });
  }

  const body = (await req.json()) as { preset?: DevSubscriptionPreset };
  const preset = body.preset;
  if (!preset || !PRESETS.includes(preset)) {
    return NextResponse.json({ error: "Неверный preset" }, { status: 400 });
  }

  try {
    await applyDevSubscriptionPreset(user.id, user.email, preset);
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
