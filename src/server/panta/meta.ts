/**
 * Shared market-metadata store (learned titles).
 *
 * Why this exists: Panta's list endpoint returns title:"" for most rows, and
 * its detail endpoint serves two shapes (complete vs stripped) that flip
 * between reads — a real title is only obtained by re-rolling until a complete
 * read succeeds. Until 2026-10-02 those learned titles lived ONLY in per-process
 * memory, and on Vercel every cold start / concurrent instance starts from
 * zero: users kept seeing "Market <id>…" fallback cards even though the same
 * market had already been learned moments earlier on another instance.
 *
 * This module persists every complete read to the shared database. Discovery
 * seeds each page from it BEFORE spending any upstream reads, so a title
 * learned once (by any instance, via the feed or a room visit) is served
 * instantly everywhere, forever.
 *
 * Best-effort by design: every helper swallows database errors — the feed must
 * keep working even if the DB hiccups. Rows are written ONLY from complete
 * reads (persistMarketMeta rejects stripped cards), so stored titles cannot
 * regress to fallback labels.
 */
import { db } from "@/lib/db";
import { isStrippedCard, type CardView } from "./normalize";

export interface MarketMetaRow {
  marketId: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
}

/** Load learned metadata for a page of market ids (single indexed query). */
export async function loadMarketMeta(marketIds: string[]): Promise<Map<string, MarketMetaRow>> {
  if (!marketIds.length) return new Map();
  try {
    const rows = await db.marketMeta.findMany({
      where: { marketId: { in: marketIds } },
      select: { marketId: true, title: true, description: true, imageUrl: true },
    });
    return new Map(rows.map((r) => [r.marketId, r]));
  } catch (e) {
    console.error(
      "[meta] loadMarketMeta failed (continuing without shared titles):",
      e instanceof Error ? e.message : e
    );
    return new Map();
  }
}

/**
 * Persist a COMPLETE market read so every instance can serve it. Stripped
 * cards are refused — a fallback label must never overwrite learned knowledge.
 * Returns silently on any database error (knowledge is best-effort).
 */
export async function persistMarketMeta(card: CardView): Promise<void> {
  if (isStrippedCard(card)) return;
  try {
    await db.marketMeta.upsert({
      where: { marketId: card.marketId },
      create: {
        marketId: card.marketId,
        title: card.title,
        description: card.description ?? null,
        imageUrl: card.image ?? null,
      },
      update: {
        title: card.title,
        description: card.description ?? null,
        imageUrl: card.image ?? null,
      },
    });
  } catch (e) {
    console.error(
      "[meta] persistMarketMeta failed:",
      e instanceof Error ? e.message : e
    );
  }
}
