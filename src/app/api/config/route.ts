import { NextRequest, NextResponse } from "next/server";
import { resolveMode, pantaEnvFor } from "@/server/request-mode";
import { getCategories } from "@/server/panta/discovery";
import { demoCards } from "@/server/panta/demo";
import { describeEnvironment, USDC_MINT_DEFAULT } from "@/lib/environment";

export const dynamic = "force-dynamic";

/**
 * Client boot configuration.
 * `mode` tells the UI which environment the server will actually serve — the
 * user's switcher choice ("live" | "test" | "demo" via the pr_env cookie) with
 * honest fallback to "demo" when the requested environment's API key is missing.
 *
 * `requested` echoes the raw cookie choice; `available` reports which Panta key
 * sets exist on this server so the switcher can disable what cannot be served.
 *
 * `environment` is the truth descriptor for the effective mode (network label,
 * funding guidance, whether real funds apply) — see src/lib/environment.ts.
 * `usdcMint`/`rpcHost` surface the exact token + RPC used for balance reads so
 * the UI can display them transparently (Developer Details).
 */
export async function GET(req: NextRequest) {
  const resolved = resolveMode(req);
  let mode = resolved.mode;
  let categories: string[] = [];

  if (mode !== "demo") {
    try {
      categories = await getCategories(pantaEnvFor(mode));
    } catch {
      // Panta unreachable → honest fallback: clearly-labeled demo data.
      mode = "demo";
    }
  }
  if (categories.length === 0) {
    categories = Array.from(new Set(demoCards().map((c) => c.category)));
  }

  const rpcEndpoint =
    process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com";
  const usdcMint = process.env.USDC_MINT || process.env.NEXT_PUBLIC_USDC_MINT || USDC_MINT_DEFAULT;

  return NextResponse.json({
    mode,
    requested: resolved.requested,
    available: resolved.available,
    categories,
    poweredByPanta: true,
    environment: describeEnvironment(mode),
    usdcMint,
    rpcHost: new URL(rpcEndpoint).host,
  });
}
