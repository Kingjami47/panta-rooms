import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const BOARD_SIZE = 8;

/**
 * GET /api/community?window=week|all — community leaderboard.
 *
 * Top Rooms ranks the social layer's own data (discussion activity per Room);
 * Top Voices ranks the people behind those comments. All counts come from our
 * Room/Comment tables — no Panta calls, so this endpoint stays fast and cannot
 * fail because of upstream hiccups.
 *
 * window=week  → only comments from the last 7 days are ranked
 * window=all   → all-time counts
 */
export async function GET(req: NextRequest) {
  const window = req.nextUrl.searchParams.get("window") === "week" ? "week" : "all";
  const since = new Date(Date.now() - WEEK_MS);
  const commentWhere = window === "week" ? { createdAt: { gte: since } } : {};

  try {
    const [byRoomWindow, byRoomAll, lastActivity, voices, roomTotal, commentTotal] = await Promise.all([
      db.comment.groupBy({ by: ["roomId"], _count: { _all: true }, where: commentWhere }),
      db.comment.groupBy({ by: ["roomId"], _count: { _all: true } }),
      db.comment.groupBy({ by: ["roomId"], _max: { createdAt: true } }),
      db.comment.groupBy({
        by: ["wallet", "displayName"],
        _count: { _all: true },
        where: commentWhere,
        orderBy: { _count: { displayName: "desc" } },
        take: BOARD_SIZE,
      }),
      db.room.count(),
      db.comment.count(),
    ]);

    const windowCount = new Map(byRoomWindow.map((r) => [r.roomId, r._count._all]));
    const lastAt = new Map(lastActivity.map((r) => [r.roomId, r._max.createdAt]));

    // Candidate rooms = those with activity in the selected window, best first.
    const activeRoomIds = [...windowCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, BOARD_SIZE * 3)
      .map(([id]) => id);

    const rooms = activeRoomIds.length
      ? await db.room.findMany({
          where: { id: { in: activeRoomIds } },
          select: {
            id: true,
            marketId: true,
            title: true,
            category: true,
            imageUrl: true,
            demo: true,
            creatorName: true,
          },
        })
      : [];

    const topRooms = rooms
      .map((r) => ({
        marketId: r.marketId,
        title: r.title,
        category: r.category,
        imageUrl: r.imageUrl,
        demo: r.demo,
        creatorName: r.creatorName,
        commentCount: windowCount.get(r.id) ?? 0,
        lastActivityAt: (lastAt.get(r.id) ?? null)?.toISOString() ?? null,
      }))
      .sort((a, b) => b.commentCount - a.commentCount)
      .slice(0, BOARD_SIZE);

    return NextResponse.json({
      window,
      topRooms,
      topVoices: voices.map((v) => ({
        displayName: v.displayName,
        wallet: v.wallet,
        commentCount: v._count._all,
      })),
      totals: { rooms: roomTotal, comments: commentTotal },
    });
  } catch {
    return NextResponse.json({ code: "INTERNAL_ERROR", message: "Could not load the community board" }, { status: 500 });
  }
}
