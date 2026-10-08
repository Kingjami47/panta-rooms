import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { allow, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Input caps — keep the social layer's rows small and render-safe. */
const LIMITS = {
  marketId: 120,
  title: 140,
  description: 1_000,
  category: 40,
  imageUrl: 500,
  creatorName: 40,
  wallet: 64,
};

function clip(v: unknown, max: number): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

/** Only https (or site-relative) image URLs — blocks javascript:/data: payloads. */
function safeImage(v: unknown): string | null {
  const s = clip(v, LIMITS.imageUrl);
  if (!s) return null;
  return /^https:\/\//i.test(s) || s.startsWith("/") ? s : null;
}

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
 *
 * Integrity rules (audit 2026-10-08):
 * - A room's metadata can only be written by its creator wallet, or claimed
 *   ONCE by a wallet when the room is still unclaimed (auto-provisioned rows
 *   carry creatorWallet = null).
 * - Anyone else posting an existing marketId gets the existing room back
 *   unchanged — registration is idempotent, never a hijack.
 */
export async function POST(req: NextRequest) {
  try {
    if (!allow(`rooms:${clientIp(req)}`, 10, 60_000)) {
      return NextResponse.json(
        { code: "RATE_LIMITED", message: "Too many room registrations — try again in a minute." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const marketId = clip(body.marketId, LIMITS.marketId);
    const title = clip(body.title, LIMITS.title);
    if (!marketId || !title) {
      return NextResponse.json({ code: "INVALID", message: "marketId and title are required" }, { status: 400 });
    }

    const existing = await db.room.findUnique({ where: { marketId } });
    const wallet = clip(body.creatorWallet, LIMITS.wallet);

    if (existing) {
      const owns = Boolean(wallet && existing.creatorWallet && wallet === existing.creatorWallet);
      const canClaim = Boolean(wallet && !existing.creatorWallet);
      if (!owns && !canClaim) {
        // Not ours — return the room untouched (idempotent register, no hijack).
        return NextResponse.json({ room: existing });
      }
      const room = await db.room.update({
        where: { marketId },
        data: {
          title,
          description: clip(body.description, LIMITS.description),
          category: clip(body.category, LIMITS.category) ?? "other",
          imageUrl: safeImage(body.imageUrl),
          creatorName: clip(body.creatorName, LIMITS.creatorName) ?? undefined,
          creatorWallet: existing.creatorWallet ?? wallet,
        },
      });
      return NextResponse.json({ room });
    }

    const room = await db.room.create({
      data: {
        marketId,
        title,
        description: clip(body.description, LIMITS.description),
        category: clip(body.category, LIMITS.category) ?? "other",
        imageUrl: safeImage(body.imageUrl),
        creatorName: clip(body.creatorName, LIMITS.creatorName) ?? "Anonymous",
        creatorWallet: wallet,
        demo: Boolean(body.demo),
      },
    });

    return NextResponse.json({ room });
  } catch {
    return NextResponse.json({ code: "INTERNAL_ERROR", message: "Could not save the room" }, { status: 500 });
  }
}
