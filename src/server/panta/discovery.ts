/** Market discovery — list + categories (GET /markets/, GET /categories/). */
import { pantaCall, activeEnv, type PantaEnv } from "./client";
import type { CategoriesResponse, MarketListRow } from "./types";
import { toCardView, type CardView } from "./normalize";
import { getMarket } from "./markets";

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

/**
 * Title enrichment — the live list endpoint returns title:"" for most markets
 * (verified 2026-09-27: 18 of 24 rows on the first page — mostly resolved
 * ones), while the detail endpoint carries the real title + `question`.
 *
 * Cloudflare constraint (verified 2026-09-27): burst/parallel detail calls get
 * blocked with Error 1010 "browser signature banned". The old implementation
 * fired up to 24 simultaneous detail fetches per page load — production
 * enrichment was being silently banned, so cards fell back to ID labels.
 *
 * Safe enrichment protocol:
 * - concurrency pool of 3 with random start jitter (no bursts)
 * - per-market NEGATIVE cache: a failed detail cools down for 10 minutes
 *   (previously failures were retried on every request — a vicious cycle
 *   that kept the ban alive)
 * - global circuit breaker: ≥6 detail failures within 60 s pauses enrichment
 *   entirely for 5 minutes — the feed then serves list data honestly instead
 *   of hammering a blocked endpoint
 * - successful details cached 15 minutes (rate-limit friendly)
 *
 * Third-party audit (2026-09-27, github.com/bisale24-ops/settlement-check):
 * Panta's detail endpoint answers in TWO shapes — complete cards (with
 * question/resolutionRule) and "stripped" cards missing those fields, and a
 * card can flip shapes between reads. A stripped answer is therefore cached
 * only briefly (thin cache) so the next enrich pass can pick up the complete
 * shape, instead of pinning the stripped one for the full TTL.
 */
const detailCache = new Map<string, { at: number; card: CardView; ttl: number }>();
const failCache = new Map<string, { at: number }>();
const DETAIL_TTL = 1_800_000;
/** Stripped-card thin cache — re-check soon in case the shape flips. */
const THIN_TTL = 300_000;
const FAIL_TTL = 900_000;
const MAX_ENRICH = 8;
const POOL_SIZE = 2;
const JITTER_MS = 600;
/** Enrichment time budget — a slow/blocked upstream must never push the feed
 *  request past the serverless function timeout. Completed details stay cached
 *  and appear on the next load (progressive enrichment). */
const ENRICH_BUDGET_MS = 6_000;

// Circuit breaker — shared across all feeds/categories on this server instance.
const breaker = { openUntil: 0, fails: 0, windowStart: 0 };
const BREAKER_WINDOW_MS = 45_000;
const BREAKER_THRESHOLD = 4;
const BREAKER_COOLDOWN_MS = 300_000;

function breakerOpen(): boolean {
  return Date.now() < breaker.openUntil;
}

function recordDetailFailure(): void {
  const now = Date.now();
  if (now - breaker.windowStart > BREAKER_WINDOW_MS) {
    breaker.windowStart = now;
    breaker.fails = 0;
  }
  breaker.fails += 1;
  if (breaker.fails >= BREAKER_THRESHOLD) {
    breaker.openUntil = now + BREAKER_COOLDOWN_MS;
    breaker.fails = 0;
    console.warn("[discovery] detail circuit breaker OPEN — enrichment paused 5 min (upstream blocking detail calls)");
  }
}

function needsEnrichment(card: CardView): boolean {
  const t = (card.title || "").trim();
  return !t || card.title.startsWith("Market ");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Fixed-size concurrency pool — keeps detail calls off Cloudflare's burst radar. */
async function pooled<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R | undefined>(items.length).fill(undefined);
  let next = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (true) {
      const idx = next++;
      if (idx >= items.length) break;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out as R[];
}

async function enrichCards(cards: CardView[], env: PantaEnv): Promise<CardView[]> {
  if (breakerOpen()) return cards;
  const missing = cards.filter(needsEnrichment);
  if (!missing.length) return cards;

  const results = await pooled(missing.slice(0, MAX_ENRICH), POOL_SIZE, async (c) => {
    const hit = detailCache.get(c.marketId);
    if (hit && Date.now() - hit.at < hit.ttl) return hit.card;
    const fail = failCache.get(c.marketId);
    if (fail && Date.now() - fail.at < FAIL_TTL) return null;
    await sleep(Math.random() * JITTER_MS);
    try {
      const card = await getMarket(c.marketId, env);
      // Complete answer (real question text) → full TTL. A detail that still
      // carries only the id-label fallback means a stripped card — cache it
      // briefly so a later read can upgrade to the complete shape.
      const thin = needsEnrichment(card);
      detailCache.set(c.marketId, { at: Date.now(), card, ttl: thin ? THIN_TTL : DETAIL_TTL });
      failCache.delete(c.marketId);
      return card;
    } catch {
      // Negative cache — never re-hit a failing market on every page load.
      failCache.set(c.marketId, { at: Date.now() });
      recordDetailFailure();
      return null;
    }
  });

  const byId = new Map<string, CardView>();
  for (const r of results) {
    if (r) byId.set(r.marketId, r);
  }
  return cards.map((c) => {
    const d = byId.get(c.marketId);
    if (!d) return c;
    return {
      ...c,
      title: (d.title || "").trim() ? d.title : c.title,
      description: d.description ?? c.description,
      yesCents: d.yesCents ?? c.yesCents,
      noCents: d.noCents ?? c.noCents,
      image: d.image ?? c.image,
      volumeUsdc: d.volumeUsdc ?? c.volumeUsdc,
      outcome: d.outcome ?? c.outcome,
      resolved: d.resolved || c.resolved,
    };
  });
}

export async function listMarkets(params: ListParams = {}, env: PantaEnv = activeEnv()): Promise<DiscoveryPage> {
  const { items, nextCursor } = await listMarketsRaw(params, env);
  const base = items.map(toCardView);
  // Race enrichment against a hard budget. enrichCards never rejects (detail
  // failures are caught + negatively cached), so the loser is simply abandoned;
  // whatever finished in time is already in detailCache for the next request.
  const cards = await Promise.race([enrichCards(base, env), sleep(ENRICH_BUDGET_MS).then(() => base)]);
  return { items: cards, nextCursor };
}

export async function getCategories(env: PantaEnv = activeEnv()): Promise<string[]> {
  const res = await pantaCall<CategoriesResponse>("categories/", { retries: 1, env });
  return res.categories ?? [];
}
