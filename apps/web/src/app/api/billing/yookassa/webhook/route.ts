import { NextRequest, NextResponse } from "next/server";
import { fulfillYooKassaPayment } from "@/lib/fulfillPayment";
import { yookassaConfigured } from "@/lib/yookassaConfig";

export const dynamic = "force-dynamic";

type WebhookBody = {
  event?: string;
  object?: { id?: string };
};

/** URL для кабинета ЮKassa: https://backtestpro.ru/api/billing/yookassa/webhook */
export async function POST(req: NextRequest) {
  if (!yookassaConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  let body: WebhookBody;
  try {
    body = (await req.json()) as WebhookBody;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (body.event !== "payment.succeeded") {
    return NextResponse.json({ ok: true });
  }

  const yooId = body.object?.id;
  if (!yooId) {
    return NextResponse.json({ ok: true });
  }

  try {
    await fulfillYooKassaPayment(yooId);
  } catch (err) {
    console.error("[yookassa webhook]", yooId, err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
