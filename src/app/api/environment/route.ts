import { NextRequest, NextResponse } from "next/server";
import { ENV_COOKIE } from "@/server/request-mode";
import { describeEnvironment } from "@/lib/environment";

export const dynamic = "force-dynamic";

/**
 * POST /api/environment — switch the user's environment: "live" | "test" | "demo".
 *
 * Stores the choice in a cookie that every API route reads per request, so the
 * whole app (feed, chips, balances, create/trade behavior) re-resolves to the
 * chosen environment after the client invalidates its queries.
 *
 * Honesty: "test" is Panta's SANDBOX (fixture responses, no blockchain) — the
 * app never pretends a testnet exists. See src/lib/environment.ts.
 */
export async function POST(req: NextRequest) {
  let body: { mode?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* invalid JSON → invalid mode below */
  }

  const mode = body.mode;
  if (mode !== "live" && mode !== "test" && mode !== "demo") {
    return NextResponse.json(
      { ok: false, code: "INVALID_MODE", message: "Unknown environment — expected live, test or demo." },
      { status: 400 }
    );
  }

  const res = NextResponse.json({ ok: true, mode, environment: describeEnvironment(mode) });
  res.cookies.set(ENV_COOKIE, mode, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}
