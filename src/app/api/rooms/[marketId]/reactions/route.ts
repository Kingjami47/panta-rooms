import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** POST /api/rooms/[marketId]/reactions — toggle an emoji reaction on a comment. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ marketId: string }> }) {
  const { marketId } = await ctx.params;
  try {
    const body = await req.json();
    const commentId = String(body.commentId || "");
    const emoji = String(body.emoji || "").slice(0, 8);
    const voter = String(body.voter || "");
    if (!commentId || !emoji || !voter) {
      return NextResponse.json({ code: "INVALID", message: "commentId, emoji and voter are required" }, { status: 400 });
    }

    const existing = await db.reaction.findUnique({
      where: { commentId_wallet_emoji: { commentId, wallet: voter, emoji } },
    });

    if (existing) {
      await db.reaction.delete({ where: { id: existing.id } });
    } else {
      await db.reaction.create({ data: { commentId, wallet: voter, emoji } });
    }

    const room = await db.room.findUnique({ where: { marketId } });
    const reactions = await db.reaction.findMany({ where: { commentId } });
    return NextResponse.json({
      toggled: !existing,
      counts: reactions.reduce<Record<string, number>>((acc, r) => {
        acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
        return acc;
      }, {}),
      _room: room?.id ?? null,
    });
  } catch {
    return NextResponse.json({ code: "INTERNAL_ERROR", message: "Could not react" }, { status: 500 });
  }
}
