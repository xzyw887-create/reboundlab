import { timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/apiErrors";

export function adminApiConfigured(): boolean {
  return Boolean(process.env.ADMIN_API_SECRET?.trim());
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Секрет только на сервере (ADMIN_API_SECRET). Без секрета эндпоинты admin не работают. */
export function assertAdminRequest(req: NextRequest): void {
  const expected = process.env.ADMIN_API_SECRET?.trim();
  if (!expected) {
    throw new ApiError("INVALID_REQUEST");
  }

  const auth = req.headers.get("authorization");
  const headerSecret = req.headers.get("x-admin-secret")?.trim();
  const bearer =
    auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : null;
  const provided = bearer || headerSecret || "";

  if (!provided || !safeEqual(provided, expected)) {
    throw new ApiError("UNAUTHORIZED");
  }
}
