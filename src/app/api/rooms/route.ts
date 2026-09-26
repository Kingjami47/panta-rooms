import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/rooms — list rooms (Creator view "My Rooms"). */
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  const rooms = await db.room.findMany({
    where: wallet ? { creatorWallet: wallet } : undefined,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { comments: true } } },
  });
  return NextResponse.json({ rooms });
}

/**
 * POST /api/rooms — register a Room for a market.
 * Called after a successful Panta create+register (marketId = event PDA)
 * or in DEMO MODE (marketId = "demo:<slug>").
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const marketId = String(body.marketId || "").trim();
    const title = String(body.title || "").trim();
    if (!marketId || !title) {
      return NextResponse.json({ code: "INVALID", message: "marketId and title are required" }, { status: 400 });
    }

    const room = await db.room.upsert({
      where: { marketId },
      update: {
        title,
        description: body.description ?? null,
        category: body.category ?? "other",
        imageUrl: body.imageUrl ?? null,
        creatorName: body.creatorName ?? undefined,
        creatorWallet: body.creatorWallet ?? undefined,
      },
      create: {
        marketId,
        title,
        description: body.description ?? null,
        category: body.category ?? "other",
        imageUrl: body.imageUrl ?? null,
        creatorName: body.creatorName ?? "Anonymous",
        creatorWallet: body.creatorWallet ?? null,
        demo: Boolean(body.demo),
      },
    });

    return NextResponse.json({ room });
  } catch {
    return NextResponse.json({ code: "INTERNAL_ERROR", message: "Could not save the room" }, { status: 500 });
  }
}
