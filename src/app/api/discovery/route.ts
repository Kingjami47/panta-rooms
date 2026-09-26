import { NextRequest, NextResponse } from "next/server";
import { listMarkets } from "@/server/panta/discovery";
import { PantaError, isPantaConfigured } from "@/server/panta/client";
import { resolveMode, pantaEnvFor } from "@/server/request-mode";
import { demoCards } from "@/server/panta/demo";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** In-memory cache for the discovery feed (60s) to respect Panta rate limits. */
interface CacheEntry {
  at: number;
  data: unknown;
}
const cache = new Map<string, CacheEntry>();
const TTL = 60_000;

interface FeedCard {
  marketId: string;
  title: string;
  description: string | null;
  category: string;
  phase: string;
  resolved: boolean;
  outcome: string | null;
  yesCents: number | null;
  noCents: number | null;
  volumeUsdc: string | null;
  image: string | null;
  endTime: number | null;
  resolutionTime: number | null;
  creatorAddress: string | null;
  resolutionRule: string | null;
  demo: boolean;
  hasRoom: boolean;
  commentCount: number;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category") || undefined;
  const status = searchParams.get("status") || undefined;
  const cursor = searchParams.get("cursor") || undefined;
  const limit = Number(searchParams.get("limit") || 24);

  const resolved = resolveMode(req);
  const mode = resolved.mode;
  // Cache key includes the mode — live, sandbox and demo feeds must never mix.
  const cacheKey = `${mode}|${category ?? "all"}|${status ?? "all"}|${cursor ?? ""}|${limit}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL) {
    return NextResponse.json(hit.data);
  }

  let cards: FeedCard[] = [];
  let nextCursor: string | null = null;
  let demo = false;

  if (mode === "demo") {
    // Demo environment: deterministic sample feed, clearly labeled — Panta is never called.
    demo = true;
    cards = demoCards(category).map((c) => ({
      ...c,
      demo: true,
      hasRoom: true,
      commentCount: 0,
    }));
    nextCursor = null;
  } else {
    try {
      if (!isPantaConfigured()) throw new PantaError("PANTA_UNREACHABLE", "Panta key not configured", 503);
      // Panta's status filter only accepts real phases — never forward "all".
      const phase = status && ["primary", "secondary", "resolved", "cancelled"].includes(status) ? status : undefined;
      const page = await listMarkets({ category, status: phase, cursor, limit }, pantaEnvFor(mode));
      nextCursor = page.nextCursor;

      const roomIds = page.items.map((c) => c.marketId);
      const rooms = await db.room.findMany({
        where: { marketId: { in: roomIds } },
        include: { _count: { select: { comments: true } } },
      });
      const roomMap = new Map(rooms.map((r) => [r.marketId, r]));

      cards = page.items.map((c) => {
        const room = roomMap.get(c.marketId);
        return {
          ...c,
          demo: false,
          hasRoom: Boolean(room),
          commentCount: room?._count.comments ?? 0,
        };
      });
    } catch (e) {
      console.error("[discovery] falling back to demo:", e instanceof Error ? e.message : e);
      // Honest fallback: deterministic demo feed, clearly labeled.
      demo = true;
      cards = demoCards(category).map((c) => ({
        ...c,
        demo: true,
        hasRoom: true,
        commentCount: 0,
      }));
      nextCursor = null;
    }
  }

  // Sort: active markets first by volume, resolved last.
  cards.sort((a, b) => {
    if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
    const av = Number((a.volumeUsdc || "0").replace(/,/g, "")) || 0;
    const bv = Number((b.volumeUsdc || "0").replace(/,/g, "")) || 0;
    return bv - av;
  });

  const payload = { items: cards, nextCursor, demo };
  cache.set(cacheKey, { at: Date.now(), data: payload });
  return NextResponse.json(payload);
}
