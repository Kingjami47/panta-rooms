/**
 * Positions + claims + attribution.
 *
 * NOTE (verified live 2026-09-21): GET /positions/ is intermittently unstable in
 * production (504 / spurious INVALID_MARKET_PARAMS for valid wallets). We call it
 * with retries and surface an honest "unavailable" state — never fake data.
 */
import { pantaCall } from "./client";
import type {
  PositionsResponse,
  WinClaimBuildResponse,
  CreatorFeesBuildResponse,
  ReportTradeRequest,
  ReportTradeResponse,
} from "./types";

export async function getPositions(wallet: string) {
  return pantaCall<PositionsResponse>(`positions/?wallet=${encodeURIComponent(wallet)}`, {
    retries: 1,
    timeoutMs: 40_000,
  });
}

export async function buildWinClaim(wallet: string, marketId: string): Promise<WinClaimBuildResponse> {
  return pantaCall<WinClaimBuildResponse>("claim/build/", {
    method: "POST",
    body: { wallet, marketId },
    timeoutMs: 45_000,
  });
}

export async function buildCreatorFeesClaim(wallet: string, marketId: string): Promise<CreatorFeesBuildResponse> {
  return pantaCall<CreatorFeesBuildResponse>("claim/creator-fees/build/", {
    method: "POST",
    body: { wallet, marketId },
    timeoutMs: 45_000,
  });
}

export async function reportTrade(req: ReportTradeRequest): Promise<ReportTradeResponse> {
  return pantaCall<ReportTradeResponse>("trades/", { method: "POST", body: req, timeoutMs: 60_000 });
}

export async function getTradeStatus(signature: string) {
  return pantaCall<{ signature: string; status?: string }>(`trades/${encodeURIComponent(signature)}/`, { retries: 1 });
}
