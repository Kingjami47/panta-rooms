/**
 * Mainnet preflight checks (spec §4/§5) — PURE functions, no React, no network.
 *
 * The UI gates every real Panta transaction behind these checks BEFORE any
 * quote/build/sign step, so a wallet without funds learns that immediately —
 * not after the whole flow. This module intentionally knows nothing about
 * React so it can be regression-tested directly (tests/regression.test.ts).
 *
 * Ground truth (src/lib/environment.ts):
 * - Creating a market costs 50 USDC (verified live: paymentUsdc "50000000")
 *   plus a small amount of SOL for network fees.
 * - Trades cost the trade amount + ~2% protocol fee + SOL for fees.
 * - Balances are REAL mainnet RPC reads — never simulated, never fabricated.
 */

import { CREATE_FEE_USDC, SOL_FEE_GUIDE, USDC_TRADE_MIN } from "./environment";

export { CREATE_FEE_USDC, SOL_FEE_GUIDE, USDC_TRADE_MIN };

/** Protocol trade fee documented by Panta (~2%). */
export const TRADE_FEE_RATE = 0.02;

export type CheckState = "ok" | "insufficient" | "unknown";

export interface PreflightCheck {
  id: "wallet" | "signer" | "sol" | "usdc";
  label: string;
  state: CheckState;
  /** human line shown under the label when NOT ok */
  detail?: string;
}

export interface PreflightInput {
  connected: boolean;
  /** wallet address available */
  hasAddress: boolean;
  /** a transaction-signing wallet is available */
  hasSigner: boolean;
  /** current SOL balance (human units) — null when it couldn't be read */
  sol: number | null;
  /** current USDC balance (human units) — null when it couldn't be read */
  usdc: number | null;
  /** USDC the upcoming transaction needs (creation fee, or trade amount + fee) */
  requiredUsdc: number;
  /** SOL needed for network fees */
  requiredSol?: number;
}

export interface PreflightResult {
  /** true only when EVERY check is ok — the flow may proceed to quote/build/sign */
  ok: boolean;
  checks: PreflightCheck[];
  /** convenience: true when the blocker is specifically a funds shortage */
  insufficientFunds: boolean;
  requiredUsdc: number;
  requiredSol: number;
}

/** Round a fee up to whole USDC cents so we never under-require. */
export function tradeFeeUsdc(amountUsdc: number): number {
  return Math.ceil(amountUsdc * TRADE_FEE_RATE * 100) / 100;
}

/** USDC required for a market creation = the verified creation fee. */
export function requiredUsdcForCreate(): number {
  return CREATE_FEE_USDC;
}

/** USDC required for a trade = amount + ~2% protocol fee. */
export function requiredUsdcForTrade(amountUsdc: number): number {
  return Math.ceil((amountUsdc + tradeFeeUsdc(amountUsdc)) * 100) / 100;
}

/** SOL required for network fees (single knob today: the documented guide). */
export function requiredSolFor(): number {
  return SOL_FEE_GUIDE;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/**
 * Evaluate every mainnet preflight check (spec §4). Order mirrors the spec:
 * wallet → signer/provider → SOL → USDC. A missing wallet short-circuits the
 * balance checks into "unknown" (they simply cannot be read without one).
 */
export function evaluateMainnetPreflight(input: PreflightInput): PreflightResult {
  const requiredSol = input.requiredSol ?? SOL_FEE_GUIDE;
  // Balances passed alongside a disconnected wallet are meaningless — normalize
  // them to null so the checks read "unknown" instead of silently passing.
  const sol = input.connected ? input.sol : null;
  const usdc = input.connected ? input.usdc : null;

  const wallet: PreflightCheck = input.connected && input.hasAddress
    ? { id: "wallet", label: "Wallet connected", state: "ok" }
    : { id: "wallet", label: "Wallet connected", state: "insufficient", detail: "Connect a Solana wallet to continue." };

  const signer: PreflightCheck = !input.connected
    ? { id: "signer", label: "Signing wallet available", state: "unknown", detail: "Connect a wallet first." }
    : input.hasSigner
      ? { id: "signer", label: "Signing wallet available", state: "ok" }
      : { id: "signer", label: "Signing wallet available", state: "insufficient", detail: "This wallet cannot sign transactions." };

  const solCheck: PreflightCheck =
    sol === null
      ? {
          id: "sol",
          label: `SOL for network fees (≥ ${fmt(requiredSol)})`,
          state: "unknown",
          detail: input.connected ? "Couldn't read the SOL balance right now — check again." : "Connect a wallet to read balances.",
        }
      : sol >= requiredSol
        ? { id: "sol", label: `SOL for network fees (≥ ${fmt(requiredSol)})`, state: "ok" }
        : {
            id: "sol",
            label: `SOL for network fees (≥ ${fmt(requiredSol)})`,
            state: "insufficient",
            detail: `Current SOL: ${fmt(sol)} — fund a little more SOL for fees.`,
          };

  const usdcCheck: PreflightCheck =
    usdc === null
      ? {
          id: "usdc",
          label: `USDC available (≥ ${fmt(input.requiredUsdc)})`,
          state: "unknown",
          detail: input.connected ? "Couldn't read the USDC balance right now — check again." : "Connect a wallet to read balances.",
        }
      : usdc >= input.requiredUsdc
        ? { id: "usdc", label: `USDC available (≥ ${fmt(input.requiredUsdc)})`, state: "ok" }
        : {
            id: "usdc",
            label: `USDC available (≥ ${fmt(input.requiredUsdc)})`,
            state: "insufficient",
            detail: `Current USDC: ${fmt(usdc)} — required: ${fmt(input.requiredUsdc)}.`,
          };

  const checks = [wallet, signer, solCheck, usdcCheck];
  const ok = checks.every((c) => c.state === "ok");
  const insufficientFunds =
    !ok && (usdcCheck.state === "insufficient" || solCheck.state === "insufficient") && wallet.state === "ok" && signer.state === "ok";

  return { ok, checks, insufficientFunds, requiredUsdc: input.requiredUsdc, requiredSol };
}

/** Minimum accepted trade amount (mirrors the Panta flow validation). */
export function isValidTradeAmount(amountUsdc: number): boolean {
  return Number.isFinite(amountUsdc) && amountUsdc >= USDC_TRADE_MIN;
}
