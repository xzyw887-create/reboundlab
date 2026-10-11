import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SIGNUP_DEVICE_COOKIE } from "@/lib/signupGuardConstants";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  if (!request.cookies.get(SIGNUP_DEVICE_COOKIE)?.value) {
    response.cookies.set(SIGNUP_DEVICE_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
    });
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
