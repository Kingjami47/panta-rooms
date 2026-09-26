import { NextRequest, NextResponse } from "next/server";
import { PantaError, pantaCall } from "@/server/panta/client";
import { resolveMode, pantaEnvFor } from "@/server/request-mode";

/**
 * Secure proxy for the subset of Panta endpoints the browser needs.
 * The API key NEVER leaves the server — the browser calls /api/panta/*.
 * Wallet signing + broadcasting still happen client-side (non-custodial per Panta).
 */

type Ctx = { params: Promise<{ path: string[] }> };

/** Allowlist of product endpoints (with trailing slash convention). */
const ALLOWED = [
  // discovery + market data
  "categories",
  "markets",
  // market creation
  "markets/create/quote",
  "markets/create/build",
  "markets/create/image-upload",
  "markets/register",
  // trading
  "primaryorderquote",
  "primaryorderbuild",
  "primaryordersubmit",
  "primaryorderverify",
  // positions / claims / attribution
  "positions",
  "claim/build",
  "claim/creator-fees/build",
  "trades",
];

function isAllowed(path: string): boolean {
  return ALLOWED.some((a) => path === a || path.startsWith(`${a}/`));
}

async function forward(req: NextRequest, ctx: Ctx) {
  const { path: segments } = await ctx.params;
  const path = segments.map((s) => decodeURIComponent(s)).join("/");

  if (!isAllowed(path)) {
    return NextResponse.json({ code: "FORBIDDEN", message: "Endpoint not allowed" }, { status: 403 });
  }

  const search = req.nextUrl.searchParams.toString();
  // Panta requires trailing slashes — before the query string, never after.
  const slashed = path.endsWith("/") ? path : `${path}/`;
  const fullPath = `${slashed}${search ? `?${search}` : ""}`;
  const userId = req.headers.get("x-user-id") || undefined;

  // Demo environment guard: sample data only — no quotes, builds, submissions,
  // registrations or any other action can reach Panta from demo mode.
  const resolved = resolveMode(req);
  if (resolved.mode === "demo") {
    if (req.method === "POST") {
      return NextResponse.json(
        {
          code: "DEMO_READ_ONLY",
          message:
            "Demo mode serves sample data only — nothing is broadcast. Switch the environment (Testing & Funding) to Live or Sandbox for this action.",
        },
        { status: 403 }
      );
    }
    if (path === "positions") {
      // Honest empty state — demo mode has no real positions to show.
      return NextResponse.json({
        wallet: req.nextUrl.searchParams.get("wallet") ?? "",
        positions: [],
        note: "Demo mode — switch the environment to Live to see real positions.",
      });
    }
  }

  try {
    let body: unknown = undefined;
    if (req.method === "POST") {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    }
    const data = await pantaCall(fullPath, {
      method: req.method === "POST" ? "POST" : "GET",
      body,
      env: pantaEnvFor(resolved.mode),
      userId,
    });
    return NextResponse.json(data ?? {});
  } catch (e) {
    if (e instanceof PantaError) {
      return NextResponse.json(
        { code: e.code, message: e.message, field: e.field, fields: e.fields },
        { status: e.status }
      );
    }
    return NextResponse.json(
      { code: "PANTA_UNREACHABLE", message: "Could not reach the Panta API. Please try again." },
      { status: 502 }
    );
  }
}

export const GET = forward;
export const POST = forward;
export const dynamic = "force-dynamic";
