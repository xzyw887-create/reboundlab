import { NextRequest, NextResponse } from "next/server";
import { authUserJson, loginUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "");
    const password = String(body.password ?? "");
    const user = await loginUser(email, password);
    return NextResponse.json({ user: authUserJson(user) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ошибка входа";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
