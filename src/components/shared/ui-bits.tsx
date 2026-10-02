"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { categoryLabel } from "@/lib/panta-categories";

export function DemoBanner({ note }: { note?: string | null }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3 text-[13px] leading-relaxed text-amber-200/90">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />
      <div>
        <span className="font-semibold text-amber-200">DEMO DATA</span>
        {note ? <span className="text-amber-200/80"> — {note}</span> : (
          <span className="text-amber-200/80">
            {" "}— these are deterministic samples, not live Panta markets. No real trades exist here.
          </span>
        )}
      </div>
    </div>
  );
}

export function NoticeBanner({ text, tone = "info" }: { text: string; tone?: "info" | "error" }) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] leading-relaxed ${
        tone === "error"
          ? "border-red-400/25 bg-red-400/[0.07] text-red-200/90"
          : "border-sky-400/20 bg-sky-400/[0.06] text-sky-200/90"
      }`}
    >
      {tone === "error" ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : <Info className="mt-0.5 size-4 shrink-0" />}
      <span>{text}</span>
    </div>
  );
}

export function PhasePill({ phase, outcome }: { phase: string; outcome?: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    primary: { label: "Open", cls: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
    secondary: { label: "Secondary", cls: "border-sky-400/30 bg-sky-400/10 text-sky-300" },
    resolved: { label: "Resolved", cls: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300" },
    cancelled: { label: "Cancelled", cls: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400" },
  };
  const m = map[phase] ?? map.primary;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${m.cls}`}>
      {phase === "resolved" && outcome ? `Resolved · ${outcome.toUpperCase()} won` : m.label}
    </span>
  );
}

export function CategoryPill({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[11px] font-medium text-zinc-300">
      {/* Panta's real slugs are hyphenated ("pop-culture") — show the friendly
          label instead of a raw slug (verified 2026-10-02). */}
      {categoryLabel(category)}
    </span>
  );
}

/** YES/NO price bar — quiet, not a trading terminal. */
export function PriceBar({ yesCents, noCents, compact = false }: { yesCents: number | null; noCents: number | null; compact?: boolean }) {
  if (yesCents === null && noCents === null) {
    return <span className="text-xs text-zinc-500">No price data yet</span>;
  }
  const yes = yesCents ?? 50;
  const no = noCents ?? 100 - yes;
  return (
    <div className={compact ? "w-full" : "w-full max-w-md"}>
      <div className="mb-1.5 flex items-center justify-between text-[13px] font-medium">
        <span className="pr-yes">YES {yes}¢</span>
        <span className="pr-no">NO {no}¢</span>
      </div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-l-full bg-[var(--yes)] transition-all duration-500" style={{ width: `${yes}%` }} />
        <div className="h-full rounded-r-full bg-[var(--no)] transition-all duration-500" style={{ width: `${no}%` }} />
      </div>
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between">
      <h3 className="text-[15px] font-semibold tracking-tight text-zinc-100">{children}</h3>
      {hint && <span className="text-xs text-zinc-500">{hint}</span>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={`size-4 animate-spin ${className ?? ""}`} />;
}

export function CardSkeleton() {
  return (
    <div className="pr-card p-5">
      <div className="flex items-center gap-2">
        <div className="h-5 w-20 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="h-5 w-16 animate-pulse rounded-full bg-white/[0.04]" />
      </div>
      <div className="mt-4 h-4 w-4/5 animate-pulse rounded bg-white/[0.06]" />
      <div className="mt-2 h-4 w-3/5 animate-pulse rounded bg-white/[0.04]" />
      <div className="mt-5 h-1.5 w-full animate-pulse rounded-full bg-white/[0.04]" />
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="pr-card flex flex-col items-center justify-center px-6 py-14 text-center">
      <p className="text-[15px] font-semibold text-zinc-200">{title}</p>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-zinc-500">{body}</p>
    </div>
  );
}

export function timeAgo(unix: number | null | undefined): string {
  if (!unix) return "";
  const diff = Date.now() / 1000 - unix;
  if (diff < 0) {
    const f = Math.abs(diff);
    if (f < 3600) return `in ${Math.ceil(f / 60)}m`;
    if (f < 86400) return `in ${Math.ceil(f / 3600)}h`;
    return `in ${Math.ceil(f / 86400)}d`;
  }
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function daysLeft(unix: number | null | undefined): string {
  if (!unix) return "";
  const diff = unix - Date.now() / 1000;
  if (diff <= 0) return "Ended";
  if (diff < 86400) return `Ends in ${Math.ceil(diff / 3600)}h`;
  return `Ends in ${Math.ceil(diff / 86400)}d`;
}
