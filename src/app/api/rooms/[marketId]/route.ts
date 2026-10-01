import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMarket, getMarketTrades } from "@/server/panta/markets";
import { PantaError, isPantaConfigured } from "@/server/panta/client";
import { resolveMode, pantaEnvFor } from "@/server/request-mode";
import { demoCard, demoTape } from "@/server/panta/demo";
import { isStrippedCard, type CardView } from "@/server/panta/normalize";

export const dynamic = "force-dynamic";

/**
 * GET /api/rooms/[marketId] — full Room bundle:
 * market (Panta detail) + activity tape (Panta trades) + room + discussion.
 * Falls back to DEMO DATA (clearly labeled) when Panta is unreachable/unconfigured
 * or the marketId is a demo id ("demo:…").
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ marketId: string }> }) {
  const { marketId } = await ctx.params;
  const isDemoId = marketId.startsWith("demo:") || marketId.startsWith("demo-");
  // Sandbox ("test") serves Panta fixtures; live serves mainnet. Demo ids always
  // resolve locally, and real market reads stay honest in every environment.
  const pantaEnv = pantaEnvFor(resolveMode(req).mode);

  let market: CardView | null = null;
  let tape: unknown[] = [];
  let demo = false;
  let notice: string | null = null;

  if (isDemoId) {
    demo = true;
    tape = demoTape(marketId);
    market = demoCard(marketId);
    if (!market) {
      // Wizard-created demo room: synthesize the market view from the room record.
      const demoRoom = await db.room.findUnique({ where: { marketId } });
      if (demoRoom) {
        market = {
          marketId,
          title: demoRoom.title,
          description: demoRoom.description,
          category: demoRoom.category,
          phase: "primary",
          resolved: false,
          outcome: null,
          yesCents: 50,
          noCents: 50,
          volumeUsdc: "0",
          image: demoRoom.imageUrl,
          endTime: null,
          resolutionTime: null,
          creatorAddress: null,
          resolutionRule: "DEMO MODE — simulated market. Switch the environment to Live to create real markets.",
        };
      } else {
        return NextResponse.json({ code: "ROOM_NOT_FOUND", message: "Demo market not found" }, { status: 404 });
      }
    }
  } else {
    try {
      if (!isPantaConfigured()) throw new PantaError("PANTA_UNREACHABLE", "Panta key not configured", 503);
      // Shape-flip resilience: re-roll stripped detail answers (deadline keeps
      // the room open well inside serverless time limits).
      market = await getMarket(marketId, pantaEnv, { stripRetries: 2, deadline: Date.now() + 3_000 });
      try {
        tape = await getMarketTrades(marketId, 20, pantaEnv);
      } catch (e) {
        // Tape is supplementary — market stays live even if the tape hiccups.
        notice =
          e instanceof PantaError && e.code === "PANTA_TIMEOUT"
            ? "Recent activity is temporarily unavailable from Panta."
            : null;
      }
    } catch (e) {
      if (e instanceof PantaError && (e.code === "MARKET_NOT_FOUND" || e.code === "INVALID_MARKET_PARAMS")) {
        return NextResponse.json(
          { code: "ROOM_NOT_FOUND", message: "This market could not be found on Panta." },
          { status: 404 }
        );
      }
      // Unreachable / timeout → honest fallback. If a local Room exists for this
      // market, synthesize its market view from the Room record (clearly labeled
      // DEMO) so discussion still works; otherwise say the data is unavailable.
      const localRoom = await db.room.findUnique({ where: { marketId } });
      if (localRoom) {
        demo = true;
        tape = localRoom.demo ? demoTape(marketId) : [];
        market = {
          marketId,
          title: localRoom.title,
          description: localRoom.description,
          category: localRoom.category,
          phase: "primary",
          resolved: false,
          outcome: null,
          yesCents: 50,
          noCents: 50,
          volumeUsdc: "0",
          image: localRoom.imageUrl,
          endTime: null,
          resolutionTime: null,
          creatorAddress: null,
          resolutionRule:
            "Live Panta data is temporarily unavailable — showing the Room's local record (DEMO) instead.",
        };
        notice = "Live Panta data is temporarily unavailable — showing this Room with clearly-labeled sample data.";
      } else {
        demo = true;
        market = null;
        notice = "Live Panta data is unavailable right now.";
      }
    }
  }

  const room = await db.room.findUnique({
    where: { marketId },
    include: { _count: { select: { comments: true } } },
  });

  // Auto-provision the social shell for a valid market (live or demo).
  // Any Panta market can become a Room — that is the core product idea.
  let finalRoom = room;
  if (!finalRoom && market) {
    finalRoom = await db.room.upsert({
      where: { marketId },
      update: {},
      create: {
        marketId,
        title: market.title,
        description: market.description,
        category: market.category,
        imageUrl: market.image,
        creatorName: isDemoId ? "Demo" : shortAddr(market.creatorAddress ?? "Panta"),
        demo,
      },
      include: { _count: { select: { comments: true } } },
    });
  }

  // Heal fallback titles: rooms registered before title enrichment carried the
  // "Market <id>…" id-label. Once a live read yields the real question, upgrade
  // the local record (and backfill the cover image if missing).
  if (market && !demo && finalRoom && isStrippedCard({ title: finalRoom.title }) && !isStrippedCard(market)) {
    finalRoom = await db.room.update({
      where: { marketId },
      data: {
        title: market.title,
        ...(market.description ? { description: market.description } : {}),
        ...(market.image && !finalRoom.imageUrl ? { imageUrl: market.image } : {}),
      },
      include: { _count: { select: { comments: true } } },
    });
  }

  return NextResponse.json({
    market,
    tape,
    room: finalRoom
      ? {
          id: finalRoom.id,
          marketId: finalRoom.marketId,
          title: finalRoom.title,
          description: finalRoom.description,
          category: finalRoom.category,
          imageUrl: finalRoom.imageUrl,
          creatorName: finalRoom.creatorName,
          demo: finalRoom.demo,
          createdAt: finalRoom.createdAt,
          commentCount: finalRoom._count.comments,
        }
      : null,
    demo: demo || Boolean(finalRoom?.demo),
    notice,
  });
}

function shortAddr(a: string): string {
  return a.length > 10 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}
