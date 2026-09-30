import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
const allowed = new Set([
  "auth",
  "businesses",
  "products",
  "product_groups",
  "sales",
  "categories",
  "stock_movements",
  "dashboard",
  "reports",
  "activities",
  "imports",
  "notifications",
  "team_members",
  "team_invitations",
  "subscriptions",
]);
async function proxy(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  if (!allowed.has(path[0]) || path.some((p) => !/^[a-zA-Z0-9_-]+$/.test(p)))
    return NextResponse.json(
      { error: { message: "Not found" } },
      { status: 404 },
    );
  if (
    !["GET", "HEAD"].includes(req.method) &&
    req.headers.get("origin") !== req.nextUrl.origin
  )
    return NextResponse.json(
      { error: { message: "Request origin rejected" } },
      { status: 403 },
    );
  const jar = await cookies();
  const token = jar.get("stoqo_session")?.value;
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const business = req.headers.get("X-Business-Id") || (path[0] === "products" && path[2] === "image" ? req.nextUrl.searchParams.get("business_id") : null);
  if (business) headers.set("X-Business-Id", business);
  const ct = req.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  // Only forward trusted platform IP information when deployed on Vercel.
  if (process.env.VERCEL && req.headers.get("x-vercel-forwarded-for"))
    headers.set("X-Forwarded-For", req.headers.get("x-vercel-forwarded-for")!);
  try {
    const upstream = await fetch(
      `${process.env.API_URL || (process.env.API_HOST ? `http://${process.env.API_HOST}:${process.env.API_PORT || "10000"}` : "http://localhost:3001")}/api/v1/${path.join("/")}${req.nextUrl.search}`,
      {
        method: req.method,
        headers,
        body: ["GET", "HEAD"].includes(req.method)
          ? undefined
          : await req.arrayBuffer(),
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
      },
    );
    if (upstream.status === 204) {
      jar.delete("stoqo_session");
      return new NextResponse(null, { status: 204 });
    }
    if (upstream.headers.get("content-type")?.includes("text/csv"))
      return new NextResponse(await upstream.text(), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition":
            upstream.headers.get("content-disposition") || "attachment",
          "Cache-Control": "no-store",
        },
      });
    if (upstream.ok && upstream.headers.get("content-type")?.startsWith("image/")) return new NextResponse(await upstream.arrayBuffer(), {headers:{"Content-Type":upstream.headers.get("content-type")!,"Cache-Control":"private, no-store"}});
    const body = await upstream.json();
    if (path[0] === "auth" && body.data?.token) {
      jar.set("stoqo_session", body.data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 14 * 86400,
      });
      delete body.data.token;
    }
    return NextResponse.json(body, {
      status: upstream.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "service_unavailable",
          message: "We couldn’t reach Stoqo. Please try again shortly.",
        },
      },
      { status: 503 },
    );
  }
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
