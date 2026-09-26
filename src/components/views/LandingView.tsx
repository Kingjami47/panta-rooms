"use client";

import { useAppStore } from "@/store/app-store";
import { MessageSquare, Users, Share2 } from "lucide-react";

const STEPS = [
  {
    key: "create",
    title: "Create",
    body: "Turn a question into a prediction market.",
  },
  {
    key: "discuss",
    title: "Discuss",
    body: "Give every market a place for conversation.",
  },
  {
    key: "trade",
    title: "Trade",
    body: "Let users take YES or NO positions through Panta.",
  },
  {
    key: "share",
    title: "Share",
    body: "Bring the prediction to your community.",
  },
];

export function LandingView() {
  const navigate = useAppStore((s) => s.navigate);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      {/* Hero */}
      <section className="pr-fade-up flex flex-col items-center pb-16 pt-20 text-center sm:pt-28">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1 text-[12.5px] text-zinc-400">
          <span className="size-1.5 rounded-full bg-emerald-400 pr-live-dot" />
          A social layer for prediction markets
        </span>
        <h1 className="pr-grad-text max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl">
          Every question can become a market.
        </h1>
        <p className="mt-6 max-w-xl text-balance text-[15px] leading-relaxed text-zinc-400 sm:text-base">
          Create prediction Rooms, bring your community into the conversation, and let people trade directly on the outcomes.
        </p>
        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <button
            onClick={() => navigate("/create")}
            className="w-full rounded-xl bg-white px-7 py-3 text-[15px] font-semibold text-zinc-950 shadow-lg shadow-black/30 transition hover:bg-zinc-200 sm:w-auto"
          >
            Create a Room
          </button>
          <button
            onClick={() => navigate("/discover")}
            className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-7 py-3 text-[15px] font-semibold text-zinc-200 transition hover:bg-white/[0.08] sm:w-auto"
          >
            Explore Rooms
          </button>
        </div>
      </section>

      {/* Steps */}
      <section className="grid grid-cols-1 gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <div key={s.key} className="pr-card pr-fade-up p-6" style={{ animationDelay: `${i * 70}ms` }}>
            <div className="mb-3 flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-zinc-200">
              {s.key === "create" && <span className="text-base font-bold">+</span>}
              {s.key === "discuss" && <MessageSquare className="size-4.5" />}
              {s.key === "trade" && <span className="text-[13px] font-bold">Y/N</span>}
              {s.key === "share" && <Share2 className="size-4.5" />}
            </div>
            <h3 className="text-[15px] font-semibold text-zinc-100">{s.title}</h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-400">{s.body}</p>
          </div>
        ))}
      </section>

      {/* For communities */}
      <section className="pb-20">
        <div className="pr-card pr-fade-up overflow-hidden">
          <div className="grid gap-0 md:grid-cols-2">
            <div className="p-8 sm:p-10">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Built for communities, not just traders.</h2>
              <p className="mt-4 text-[14.5px] leading-relaxed text-zinc-400">
                Prediction markets usually live in their own destination apps. Panta Rooms flips that: the market comes
                to where the conversation already is. Creators, Telegram and Discord communities, sports groups, media,
                and event organizers can give any question a Room of its own.
              </p>
              <p className="mt-3 text-[14.5px] leading-relaxed text-zinc-400">
                Under the hood, every Room runs on the Panta API — market creation, YES/NO pricing, trading, positions
                and claims on Solana. Panta provides the infrastructure. Panta Rooms turns that infrastructure into a
                social experience.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["Creators", "Telegram", "Discord", "Sports", "Crypto", "Media", "Events"].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[12px] text-zinc-300">
                    <Users className="size-3 text-zinc-500" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative hidden border-l border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-10 md:block">
              {/* A quiet illustrative mock of a Room */}
              <div className="pr-card pointer-events-none select-none p-5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">Open</span>
                  <span className="text-[11px] text-zinc-500">Sports</span>
                </div>
                <p className="mt-3 text-[15px] font-semibold leading-snug text-zinc-100">
                  Will Arsenal win their next Premier League match?
                </p>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[13px] font-medium">
                    <span className="pr-yes">YES 54¢</span>
                    <span className="pr-no">NO 46¢</span>
                  </div>
                  <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full w-[54%] bg-[var(--yes)]" />
                    <div className="h-full w-[46%] bg-[var(--no)]" />
                  </div>
                </div>
                <div className="mt-5 space-y-2.5">
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 text-[12.5px] text-zinc-400">
                    <span className="font-medium text-zinc-200">Maya</span> — away form is too strong, I&apos;m on NO.
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 text-[12.5px] text-zinc-400">
                    <span className="font-medium text-zinc-200">Dre</span> — home record says otherwise. Bought YES.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
