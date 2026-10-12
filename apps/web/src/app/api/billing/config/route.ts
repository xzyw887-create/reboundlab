import { NextResponse } from "next/server";
import { checkoutStubAllowed, yookassaConfigured } from "@/lib/yookassaConfig";

export async function GET() {
  return NextResponse.json({
    yookassa: yookassaConfigured(),
    checkoutStub: checkoutStubAllowed(),
  });
}
