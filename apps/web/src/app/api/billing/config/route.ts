import { unstable_noStore as noStore } from "next/cache";
import { NextResponse } from "next/server";
import { checkoutStubAllowed, yookassaConfigured } from "@/lib/yookassaConfig";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  noStore();
  return NextResponse.json(
    {
      yookassa: yookassaConfigured(),
      checkoutStub: checkoutStubAllowed(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-BTP-Billing-Runtime": "1",
      },
    }
  );
}
