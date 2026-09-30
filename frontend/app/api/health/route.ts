import { NextResponse } from "next/server";
import { apiOrigin } from "@/lib/api-origin";

export const dynamic = "force-dynamic";

export async function GET() {
  let ready = false;
  try {
    const response = await fetch(`${apiOrigin()}/ready`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    ready = response.ok && (await response.json()).status === "ready";
  } catch {
    // Keep infrastructure names and exception details out of the public response.
  }
  return NextResponse.json(
    { status: ready ? "ready" : "unavailable" },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
