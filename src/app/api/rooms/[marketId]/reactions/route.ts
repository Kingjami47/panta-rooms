import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { allow, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/rooms/[marketId]/reactions — toggle an emoji reaction on a comment.
 * Integrity (audit 2026-10-08): the commentId MUST belong to the Room named in
 * the URL — reactions can no longer be toggled cross-room via any endpoint.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ marketId: string }> }) {
  const { marketId } = await ctx.params;
  try {
    if (!allow(`reactions:${clientIp(req)}`, 30, 60_000)) {
      return NextResponse.json(
        { code: "RATE_LIMITED", message: "Too many reactions too fast — take a breath." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const commentId = String(body.commentId || "");
    const emoji = String(body.emoji || "").slice(0, 8);
    const voter = String(body.voter || "").trim().slice(0, 44);
    if (!commentId || !emoji || !voter) {
      return NextResponse.json({ code: "INVALID", message: "commentId, emoji and voter are required" }, { status: 400 });
    }

    // The comment must exist AND live in the room this endpoint addresses.
    const comment = await db.comment.findUnique({
      where: { id: commentId },
      include: { room: { select: { marketId: true } } },
    });
    if (!comment || comment.room.marketId !== marketId) {
      return NextResponse.json({ code: "COMMENT_NOT_FOUND", message: "That comment is not in this room" }, { status: 404 });
    }

    const existing = await db.reaction.findUnique({
      where: { commentId_wallet_emoji: { commentId, wallet: voter, emoji } },
    });

    if (existing) {
      await db.reaction.delete({ where: { id: existing.id } });
    } else {
      await db.reaction.create({ data: { commentId, wallet: voter, emoji } });
    }

    const reactions = await db.reaction.findMany({ where: { commentId } });
    return NextResponse.json({
      toggled: !existing,
      counts: reactions.reduce<Record<string, number>>((acc, r) => {
        acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
        return acc;
      }, {}),
    });
  } catch {
    return NextResponse.json({ code: "INTERNAL_ERROR", message: "Could not react" }, { status: 500 });
  }
}
