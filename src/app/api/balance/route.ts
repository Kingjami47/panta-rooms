import { NextRequest, NextResponse } from "next/server";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { USDC_MINT_DEFAULT } from "@/lib/environment";

export const dynamic = "force-dynamic";

/**
 * REAL wallet balances — read live from the Solana RPC (server-side, so no
 * CORS/private-RPC exposure and no client rate-limit flakiness).
 *
 * Honesty rules (spec §5/§7/§12):
 * - Only actual on-chain values are returned. No simulation, no caching that
 *   could show stale funds as fresh, no fabricated "funding succeeded".
 * - If the RPC is unreachable we return an explicit error — the UI shows it
 *   instead of pretending balances are zero.
 * - The USDC mint is the canonical native USDC on Solana mainnet, overridable
 *   via USDC_MINT / NEXT_PUBLIC_USDC_MINT, and echoed to the caller so the UI
 *   can show exactly which token was measured (spec §17: never assume silently).
 */

const COOLDOWN_MS = 1_500;
const hits = new Map<string, number>();

function j(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function GET(req: NextRequest) {
  // Be polite to the public RPC: one lookup per IP per 1.5s.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  if (now - (hits.get(ip) ?? 0) < COOLDOWN_MS) {
    return j({ ok: false, code: "RATE_LIMITED", friendly: "Please wait a moment before refreshing balances again." }, 429);
  }
  hits.set(ip, now);
  if (hits.size > 5_000) hits.clear();

  const address = req.nextUrl.searchParams.get("address")?.trim() ?? "";
  let pubkey: PublicKey;
  try {
    pubkey = new PublicKey(address);
  } catch {
    return j({ ok: false, code: "INVALID_ADDRESS", friendly: "That wallet address is not a valid Solana address." }, 400);
  }

  const endpoint =
    process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com";
  const mintStr = process.env.USDC_MINT || process.env.NEXT_PUBLIC_USDC_MINT || USDC_MINT_DEFAULT;
  let mint: PublicKey;
  try {
    mint = new PublicKey(mintStr);
  } catch {
    return j({ ok: false, code: "CONFIG_ERROR", friendly: "The server's token mint configuration is invalid." }, 500);
  }

  const connection = new Connection(endpoint, { commitment: "confirmed" });
  const withTimeout = <T,>(p: Promise<T>, ms = 12_000) =>
    Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("rpc-timeout")), ms))]);

  let lamports: number;
  try {
    lamports = await withTimeout(connection.getBalance(pubkey));
  } catch {
    return j(
      {
        ok: false,
        code: "RPC_UNREACHABLE",
        friendly:
          "Couldn't read balances — the Solana RPC is unreachable right now. Live trading would also fail until this recovers.",
      },
      502
    );
  }

  // Token balance for the configured USDC mint. A failure here must NOT turn
  // into a fake "0 USDC" — report it honestly as unavailable.
  let usdcRaw: string | null = null;
  try {
    const accounts = await withTimeout(connection.getParsedTokenAccountsByOwner(pubkey, { mint }));
    let total = 0n;
    for (const { account } of accounts.value) {
      const parsed = (account.data as { parsed?: { info?: { tokenAmount?: { amount?: string } } } }).parsed;
      const amount = parsed?.info?.tokenAmount?.amount;
      if (typeof amount === "string") total += BigInt(amount);
    }
    usdcRaw = total.toString();
  } catch {
    usdcRaw = null;
  }

  return j({
    ok: true,
    sol: (lamports / LAMPORTS_PER_SOL).toFixed(4),
    solLamports: lamports.toString(),
    usdc: usdcRaw === null ? null : (Number(usdcRaw) / 1e6).toFixed(2),
    usdcRaw,
    usdcMint: mintStr,
    rpcHost: new URL(endpoint).host,
    network: "mainnet-beta",
  });
}
