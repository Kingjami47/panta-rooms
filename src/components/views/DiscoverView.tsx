"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { fetchDiscovery, fetchStatus } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import type { FeedCard } from "@/lib/types";
import { CategoryPill, CardSkeleton, DemoBanner, EmptyState, NoticeBanner, PhasePill, PriceBar, daysLeft, timeAgo } from "@/components/shared/ui-bits";

function MarketCard({ card }: { card: FeedCard }) {
  const navigate = useAppStore((s) => s.navigate);
  return (
    <button
      onClick={() => navigate(`/room/${encodeURIComponent(card.marketId)}`)}
      className="pr-card flex w-full flex-col p-5 text-left"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CategoryPill category={card.category} />
          <PhasePill phase={card.phase} outcome={card.outcome} />
        </div>
        {card.demo && (
          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-300">
            DEMO
          </span>
        )}
      </div>
      <h3 className="mt-3.5 line-clamp-2 text-[15.5px] font-semibold leading-snug text-zinc-100">{card.title}</h3>
      <div className="mt-4">
        <PriceBar yesCents={card.yesCents} noCents={card.noCents} compact />
      </div>
      <div className="mt-4 flex items-center justify-between text-[12.5px] text-zinc-500">
        <span>
          {card.volumeUsdc ? <>{card.volumeUsdc} USDC volume</> : "No volume yet"}
        </span>
        <span>{card.resolved ? "Resolved" : daysLeft(card.endTime) || timeAgo(card.endTime)}</span>
      </div>
      <div className="mt-3 flex items-center gap-3 border-t border-white/[0.06] pt-3 text-[12px] text-zinc-500">
        <span>{card.hasRoom ? `Room active · ${card.commentCount} comments` : "Be the first to discuss"}</span>
      </div>
    </button>
  );
}

export function DiscoverView() {
  const status = useAppStore((s) => s.status);
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["discovery", category, statusFilter],
    queryFn: ({ signal }) => fetchDiscovery({ category, status: statusFilter }, signal),
  });

  useEffect(() => {
    if (!status) fetchStatus().then(useAppStore.getState().setStatus).catch(() => undefined);
  }, [status]);

  const categories = useMemo(() => {
    const base = status?.categories ?? ["sports", "crypto", "politics", "entertainment", "finance", "science", "world", "other"];
    return ["all", ...base];
  }, [status]);

  const filtered = useMemo(() => {
    if (!data?.items) return [];
    if (!query.trim()) return data.items;
    const q = query.toLowerCase();
    return data.items.filter((c) => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
  }, [data, query]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">Explore Rooms</h1>
        <p className="mt-2 text-[14px] text-zinc-400">
          Live Panta markets, each with a Room for discussion, trading and sharing.
        </p>
      </div>

      {data?.demo && (
        <div className="mb-6">
          <DemoBanner note={isError ? "Live Panta data is unavailable right now — showing samples instead." : undefined} />
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium capitalize transition-colors ${
                category === c
                  ? "bg-white text-zinc-950"
                  : "border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
              }`}
            >
              {c === "all" ? "All" : c}
            </button>
          ))}
          <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
          {[
            { k: "all", l: "Any status" },
            { k: "primary", l: "Open" },
            { k: "resolved", l: "Resolved" },
          ].map((s) => (
            <button
              key={s.k}
              onClick={() => setStatusFilter(s.k)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                statusFilter === s.k
                  ? "bg-white text-zinc-950"
                  : "border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
              }`}
            >
              {s.l}
            </button>
          ))}
        </div>
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search markets…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-[14px] text-zinc-200 placeholder:text-zinc-500 focus:border-white/20 focus:outline-none"
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={query ? "No matches" : "No markets found"}
          body={query ? "Try a different search term or clear the filters." : "Panta's catalog has no markets for this filter yet. Create the first one!"}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((card) => (
            <MarketCard key={card.marketId} card={card} />
          ))}
        </div>
      )}

      {isError && !data && (
        <div className="mt-6">
          <NoticeBanner text="Live Panta discovery failed. Retrying automatically — or use Create a Room to start your own market." tone="error" />
        </div>
      )}
    </div>
  );
}
