/**
 * Per-request environment resolution — powers the user-facing environment switcher.
 *
 * The user's choice lives in a cookie ("pr_env"): "live" | "test" | "demo".
 * - "live" → Panta LIVE keys → Solana mainnet, real USDC, real transactions.
 * - "test" → Panta TEST keys → SANDBOX FIXTURES. NOT a blockchain, NOT a
 *   testnet (see src/lib/environment.ts — it must never be labeled
 *   "devnet"/"testnet"): no funds apply and nothing can be broadcast.
 * - "demo" → no Panta call at all; the app serves its own clearly-labeled
 *   sample data.
 *
 * Honest fallback rules:
 * - A requested mode whose API key is missing degrades to "demo" (never
 *   silently to live, never to a fabricated environment).
 * - No cookie keeps the legacy server-wide PANTA_MODE behavior.
 */
import type { NextRequest } from "next/server";
import { activeEnv, hasKeyFor, type PantaEnv } from "./panta/client";
import type { EnvMode } from "@/lib/environment";

export const ENV_COOKIE = "pr_env";

export interface ResolvedMode {
  /** the user's cookie choice — null when absent or invalid */
  requested: EnvMode | null;
  /** the mode the server will actually serve (honest fallback applied) */
  mode: EnvMode;
  /** which Panta key sets exist on this server (drives switcher availability) */
  available: { live: boolean; test: boolean };
}

function cookieMode(req: NextRequest): EnvMode | null {
  const v = req.cookies.get(ENV_COOKIE)?.value;
  return v === "live" || v === "test" || v === "demo" ? v : null;
}

export function resolveMode(req: NextRequest): ResolvedMode {
  const requested = cookieMode(req);
  const available = { live: hasKeyFor("live"), test: hasKeyFor("test") };

  let mode: EnvMode;
  if (requested === "demo") {
    mode = "demo";
  } else if (requested === "test") {
    mode = available.test ? "test" : "demo";
  } else if (requested === "live") {
    mode = available.live ? "live" : "demo";
  } else {
    // No explicit choice — keep the legacy server-wide PANTA_MODE behavior.
    const legacy = activeEnv();
    mode = legacy === "test" ? (available.test ? "test" : "demo") : available.live ? "live" : "demo";
  }

  return { requested, mode, available };
}

/** Which Panta key set serves a given mode (demo callers must never reach Panta). */
export function pantaEnvFor(mode: EnvMode): PantaEnv {
  return mode === "test" ? "test" : "live";
}
