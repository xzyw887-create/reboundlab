import { NextRequest, NextResponse } from "next/server";
import { authUserJson, registerUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "");
    const password = String(body.password ?? "");
    const user = await registerUser(email, password);
    return NextResponse.json({ user: authUserJson(user) });
  } catch (err: unknown) {
    const pg = err as { code?: string };
    const message =
      pg.code === "23505"
        ? "Этот email уже зарегистрирован"
        : err instanceof Error
        ? err.message
        : "Ошибка регистрации";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
