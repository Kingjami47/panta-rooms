"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flame, MessageSquare, MessagesSquare, Trophy } from "lucide-react";
import { fetchCommunity, type CommunityWindow } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { shortWallet } from "@/lib/solana-client";
import { CategoryPill, SectionTitle, Spinner, timeAgo } from "@/components/shared/ui-bits";

/**
 * Community leaderboard — the social proof engine for Panta Rooms.
 * Two boards: Top Rooms (discussion activity) and Top Voices (commenters),
 * each switchable between this-week and all-time windows.
 */

const RANK_STYLES = [
  "border-amber-300/40 bg-amber-300/10 text-amber-300", // 1 — gold
  "border-zinc-300/40 bg-zinc-300/10 text-zinc-300", // 2 — silver
  "border-orange-400/40 bg-orange-400/10 text-orange-300", // 3 — bronze
];

function RankBadge({ rank }: { rank: number }) {
  const cls = rank <= 3 ? RANK_STYLES[rank - 1] : "border-white/[0.08] bg-white/[0.03] text-zinc-500";
  return (
    <span
      aria-label={`Rank ${rank}`}
      className={`flex size-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold ${cls}`}
    >
      {rank}
    </span>
  );
}

function TopRooms({
  window,
}: {
  window: CommunityWindow;
}) {
  const navigate = useAppStore((s) => s.navigate);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["community", window],
    queryFn: ({ signal }) => fetchCommunity(window, signal),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-14 text-[13px] text-zinc-500">
        <Spinner /> Loading the board…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center text-[13px] text-zinc-500">
        The community board is unavailable right now. Please try again shortly.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] text-zinc-500">
        {data.totals.rooms} room{data.totals.rooms === 1 ? "" : "s"} · {data.totals.comments} comment
        {data.totals.comments === 1 ? "" : "s"} so far
      </p>

      {data.topRooms.length === 0 ? (
        <div className="pr-card flex flex-col items-center px-6 py-12 text-center">
          <MessagesSquare className="size-6 text-zinc-600" />
          <p className="mt-3 text-[14px] font-semibold text-zinc-300">
            {window === "week" ? "No room activity this week yet" : "No discussions yet"}
          </p>
          <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-zinc-500">
            Open any market, post the first take, and this board is yours — the most-discussed rooms rank here.
          </p>
          <button
            onClick={() => navigate("/discover")}
            className="mt-4 rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-zinc-950 transition hover:bg-zinc-200"
          >
            Explore Rooms
          </button>
        </div>
      ) : (
        <ol className="space-y-2.5">
          {data.topRooms.map((room, i) => (
            <li key={room.marketId}>
              <button
                onClick={() => navigate(`/room/${encodeURIComponent(room.marketId)}`)}
                className="pr-card flex w-full items-center gap-3 p-4 text-left transition hover:bg-white/[0.04]"
              >
                <RankBadge rank={i + 1} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CategoryPill category={room.category} />
                    {room.demo && (
                      <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-300">
                        DEMO
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[14px] font-medium leading-snug text-zinc-100">{room.title}</p>
                  <p className="mt-1 text-[11.5px] text-zinc-500">
                    by {room.creatorName}
                    {room.lastActivityAt ? ` · last active ${timeAgo(new Date(room.lastActivityAt).getTime() / 1000)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5 text-zinc-300">
                  <span className="flex items-center gap-1 text-[13px] font-semibold">
                    <MessageSquare className="size-3.5 text-zinc-500" />
                    {room.commentCount}
                  </span>
                  <span className="text-[10.5px] uppercase tracking-wide text-zinc-600">
                    {window === "week" ? "this week" : "comments"}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function TopVoices({ window }: { window: CommunityWindow }) {
  const { data } = useQuery({
    queryKey: ["community", window],
    queryFn: ({ signal }) => fetchCommunity(window, signal),
    staleTime: 30_000,
  });

  const voices = data?.topVoices ?? [];
  if (!data || voices.length === 0) {
    return (
      <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center text-[13px] text-zinc-500">
        {window === "week" ? "No voices this week yet — say something in a Room." : "No voices yet — be the first."}
      </p>
    );
  }

  return (
    <ol className="space-y-2.5">
      {voices.map((v, i) => (
        <li
          key={`${v.wallet ?? v.displayName}-${i}`}
          className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
        >
          <RankBadge rank={i + 1} />
          <div
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-[11px] font-bold text-zinc-300"
          >
            {v.displayName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-medium text-zinc-200">{v.displayName}</p>
            {v.wallet && <p className="font-mono text-[11px] text-zinc-500">{shortWallet(v.wallet)}</p>}
          </div>
          <span className="shrink-0 text-[13px] font-semibold text-zinc-300">
            {v.commentCount}{" "}
            <span className="text-[11px] font-normal text-zinc-500">comment{v.commentCount === 1 ? "" : "s"}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function CommunityView() {
  const [window, setWindow] = useState<CommunityWindow>("week");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
            <Trophy className="size-6 text-amber-300 sm:size-7" />
            Community
          </h1>
          <p className="mt-2 max-w-xl text-[14px] text-zinc-400">
            The most-discussed Rooms and the loudest voices across Panta Rooms. Post a take in any market to climb the
            board.
          </p>
        </div>
        <div className="flex items-center gap-1.5" role="group" aria-label="Leaderboard window">
          {(
            [
              { k: "week", l: "This week" },
              { k: "all", l: "All time" },
            ] as const
          ).map((w) => (
            <button
              key={w.k}
              onClick={() => setWindow(w.k)}
              aria-pressed={window === w.k}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                window === w.k
                  ? "bg-white text-zinc-950"
                  : "border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
              }`}
            >
              {w.l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <section aria-labelledby="top-rooms-title">
          <SectionTitle hint={window === "week" ? "ranked by comments this week" : "ranked by all-time comments"}>
            <span id="top-rooms-title" className="flex items-center gap-2">
              <Flame className="size-4 text-orange-300" />
              Top Rooms
            </span>
          </SectionTitle>
          <TopRooms window={window} />
        </section>

        <aside aria-labelledby="top-voices-title">
          <SectionTitle hint="commenters">
            <span id="top-voices-title" className="flex items-center gap-2">
              <MessagesSquare className="size-4 text-sky-300" />
              Top Voices
            </span>
          </SectionTitle>
          <TopVoices window={window} />
        </aside>
      </div>
    </div>
  );
}
