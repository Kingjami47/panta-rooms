/** Market data — single market detail + trade tape. */
import { pantaCall, activeEnv, type PantaEnv } from "./client";
import type { MarketDetail, MarketTradesResponse } from "./types";
import { toCardView, type CardView } from "./normalize";

export async function getMarket(marketId: string, env: PantaEnv = activeEnv()): Promise<CardView> {
  const res = await pantaCall<MarketDetail>(`markets/${encodeURIComponent(marketId)}/`, { retries: 1, env });
  return toCardView(res);
}

export async function getMarketTrades(marketId: string, limit = 25, env: PantaEnv = activeEnv()) {
  const res = await pantaCall<MarketTradesResponse>(
    `markets/${encodeURIComponent(marketId)}/trades/?limit=${Math.min(Math.max(limit, 1), 200)}`,
    { retries: 1, env }
  );
  return res.items ?? [];
}
