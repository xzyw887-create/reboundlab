import { NextResponse } from "next/server";
import { authUserJson, getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    return NextResponse.json({ user: authUserJson(user) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ошибка сервера";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
