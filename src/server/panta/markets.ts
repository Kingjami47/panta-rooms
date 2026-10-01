/** Market data — single market detail + trade tape. */
import { pantaCall, activeEnv, type PantaEnv } from "./client";
import type { MarketDetail, MarketTradesResponse } from "./types";
import { toCardView, isStrippedCard, type CardView } from "./normalize";

export interface GetMarketOptions {
  /** Extra reads when the upstream returns the stripped card shape. */
  stripRetries?: number;
  /** Epoch ms — no retry attempts past this point (enrichment budget guard). */
  deadline?: number;
}

/**
 * Single market detail with shape-flip resilience.
 *
 * Verified live 2026-10-01: Panta's detail endpoint answers from replicas in
 * TWO shapes — complete cards (89 keys, question/resolutionRule present, real
 * title) and stripped cards (41 keys, title:"", no question). The same market,
 * same caller IP, seconds apart: complete → complete → stripped. A re-read has
 * a high chance of landing on a complete replica, so stripped answers are
 * retried within this call. Thrown errors are NEVER retried here — they must
 * keep propagating so discovery's fail-cache and circuit breaker stay honest.
 */
export async function getMarket(
  marketId: string,
  env: PantaEnv = activeEnv(),
  opts: GetMarketOptions = {}
): Promise<CardView> {
  const path = `markets/${encodeURIComponent(marketId)}/`;
  let card = toCardView(await pantaCall<MarketDetail>(path, { retries: 1, env }));
  const retries = Math.max(0, opts.stripRetries ?? 0);
  for (let i = 0; i < retries && isStrippedCard(card); i++) {
    if (opts.deadline !== undefined && Date.now() >= opts.deadline) break;
    // Small spacing — stay off the burst radar while re-rolling the replica dice.
    await new Promise((r) => setTimeout(r, 250 + Math.random() * 350));
    try {
      const again = toCardView(await pantaCall<MarketDetail>(path, { retries: 1, env }));
      if (!isStrippedCard(again)) return again;
      card = again;
    } catch {
      break; // a shape retry must never surface as a detail "failure"
    }
  }
  return card;
}

export async function getMarketTrades(marketId: string, limit = 25, env: PantaEnv = activeEnv()) {
  const res = await pantaCall<MarketTradesResponse>(
    `markets/${encodeURIComponent(marketId)}/trades/?limit=${Math.min(Math.max(limit, 1), 200)}`,
    { retries: 1, env }
  );
  return res.items ?? [];
}
