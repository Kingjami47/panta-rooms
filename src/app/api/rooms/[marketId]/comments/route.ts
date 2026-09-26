import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/rooms/[marketId]/comments — discussion thread for a Room. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ marketId: string }> }) {
  const { marketId } = await ctx.params;
  const room = await db.room.findUnique({ where: { marketId } });
  if (!room) return NextResponse.json({ comments: [] });

  const comments = await db.comment.findMany({
    where: { roomId: room.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { reactions: true },
  });
  return NextResponse.json({
    comments: comments.map((c) => ({
      id: c.id,
      displayName: c.displayName,
      wallet: c.wallet,
      body: c.body,
      createdAt: c.createdAt,
      reactions: c.reactions.reduce<Record<string, number>>((acc, r) => {
        acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
        return acc;
      }, {}),
    })),
  });
}

/** POST /api/rooms/[marketId]/comments — post a comment. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ marketId: string }> }) {
  const { marketId } = await ctx.params;
  try {
    const body = await req.json();
    const text = String(body.body || "").trim();
    if (!text) {
      return NextResponse.json({ code: "INVALID", message: "Comment cannot be empty" }, { status: 400 });
    }
    if (text.length > 500) {
      return NextResponse.json({ code: "INVALID", message: "Comment is too long (max 500 characters)" }, { status: 400 });
    }

    const room = await db.room.findUnique({ where: { marketId } });
    if (!room) {
      return NextResponse.json({ code: "ROOM_NOT_FOUND", message: "This room does not exist yet" }, { status: 404 });
    }

    const comment = await db.comment.create({
      data: {
        roomId: room.id,
        wallet: body.wallet ?? null,
        displayName: String(body.displayName || (body.wallet ? shortWallet(body.wallet) : "Guest")),
        body: text,
      },
    });

    return NextResponse.json({
      comment: {
        id: comment.id,
        displayName: comment.displayName,
        wallet: comment.wallet,
        body: comment.body,
        createdAt: comment.createdAt,
        reactions: {},
      },
    });
  } catch {
    return NextResponse.json({ code: "INTERNAL_ERROR", message: "Could not post the comment" }, { status: 500 });
  }
}

function shortWallet(w: string): string {
  return w.length > 10 ? `${w.slice(0, 4)}…${w.slice(-4)}` : w;
}
