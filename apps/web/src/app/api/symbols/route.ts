import { NextResponse } from "next/server";
import { listSymbolsFromDb } from "@/lib/listSymbols";

export async function GET() {
  try {
    const result = await listSymbolsFromDb();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
