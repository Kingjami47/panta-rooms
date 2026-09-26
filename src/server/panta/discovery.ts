/** Market discovery — list + categories (GET /markets/, GET /categories/). */
import { pantaCall, activeEnv, type PantaEnv } from "./client";
import type { CategoriesResponse, MarketListRow } from "./types";
import { toCardView, type CardView } from "./normalize";

export interface ListParams {
  category?: string;
  status?: string;
  cursor?: string;
  limit?: number;
}

export interface DiscoveryPage {
  items: CardView[];
  nextCursor: string | null;
}

export async function listMarketsRaw(
  params: ListParams = {},
  env: PantaEnv = activeEnv()
): Promise<{ items: MarketListRow[]; nextCursor: string | null }> {
  const q = new URLSearchParams();
  if (params.category) q.set("category", params.category);
  if (params.status) q.set("status", params.status);
  if (params.cursor) q.set("cursor", params.cursor);
  q.set("limit", String(Math.min(Math.max(params.limit ?? 24, 1), 50)));
  const res = await pantaCall<{ items: MarketListRow[]; nextCursor: string | null }>(`markets/?${q.toString()}`, {
    retries: 1,
    env,
  });
  return { items: res.items ?? [], nextCursor: res.nextCursor ?? null };
}

export async function listMarkets(params: ListParams = {}, env: PantaEnv = activeEnv()): Promise<DiscoveryPage> {
  const { items, nextCursor } = await listMarketsRaw(params, env);
  return { items: items.map(toCardView), nextCursor };
}

export async function getCategories(env: PantaEnv = activeEnv()): Promise<string[]> {
  const res = await pantaCall<CategoriesResponse>("categories/", { retries: 1, env });
  return res.categories ?? [];
}
