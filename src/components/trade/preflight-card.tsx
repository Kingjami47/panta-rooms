"use client";

/**
 * Mainnet preflight card (spec §4/§5) — the pre-flow funds gate.
 *
 * Shown BEFORE any quote/build/sign step in LIVE mode. When funds are short it
 * says exactly what is missing (Current vs Required), never blames Panta, and
 * offers [Check Again] + [Open Funding]. When everything passes it collapses to
 * a compact green line so the flow feels unchanged for funded wallets.
 */

import { Check, Loader2, RefreshCw, Wallet } from "lucide-react";
import { useTestingCenter } from "@/components/wallet/center-context";
import type { PreflightResult } from "@/lib/preflight";

function fmt(n: number | null): string {
  if (n === null) return "couldn't read";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function PreflightCard({ p }: { p: PreflightResult & { loading: boolean; refresh: () => void; currentSol: number | null; currentUsdc: number | null } }) {
  const { setVisible } = useTestingCenter();

  // All good — compact pass line, flow proceeds unchanged.
  if (p.ok) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.06] px-3.5 py-2.5 text-[12.5px] text-emerald-200/90">
        <Check className="size-3.5 shrink-0 text-emerald-300" />
        <span>
          Preflight passed — wallet, SOL fees and USDC balance are ready for this mainnet transaction.
        </span>
      </div>
    );
  }

  // Balance reads still in flight.
  if (p.loading) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[12.5px] text-zinc-400">
        <Loader2 className="size-3.5 animate-spin" /> Checking your mainnet balances before quoting…
      </div>
    );
  }

  const shortUsdc = p.checks.find((c) => c.id === "usdc")?.state === "insufficient";
  const shortSol = p.checks.find((c) => c.id === "sol")?.state === "insufficient";
  const headline =
    !p.checks.length
      ? "Connect a wallet to continue on mainnet"
      : shortUsdc || shortSol
        ? "Insufficient Mainnet balance"
        : "Preflight check incomplete";

  return (
    <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-4">
      <div className="flex items-center gap-2">
        <Wallet className="size-4 shrink-0 text-amber-300" />
        <p className="text-[13.5px] font-semibold text-amber-200">{headline}</p>
      </div>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-amber-100/80">
        {shortUsdc || shortSol
          ? "Creating this transaction requires the USDC amount below plus a small amount of SOL for network fees. This is a wallet-balance situation, not a Panta problem — please fund your wallet before continuing."
          : "Resolve the items below before starting the real transaction."}
      </p>

      <div className="mt-3 space-y-1.5 rounded-lg border border-white/[0.06] bg-black/20 p-3 text-[12.5px]">
        <div className="flex justify-between gap-3">
          <span className="text-zinc-400">Current USDC balance</span>
          <span className={`font-mono ${shortUsdc ? "text-red-300" : "text-zinc-200"}`}>{fmt(p.currentUsdc)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-zinc-400">Required USDC</span>
          <span className="font-mono text-zinc-200">{fmt(p.requiredUsdc)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-zinc-400">Current SOL balance</span>
          <span className={`font-mono ${shortSol ? "text-red-300" : "text-zinc-200"}`}>{fmt(p.currentSol)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-zinc-400">SOL needed for fees</span>
          <span className="font-mono text-zinc-200">≈ {fmt(p.requiredSol)}</span>
        </div>
      </div>

      <ul className="mt-2.5 space-y-1">
        {p.checks
          .filter((c) => c.state !== "ok")
          .map((c) => (
            <li key={c.id} className="text-[12px] leading-snug text-amber-200/80">
              • {c.label}{c.detail ? ` — ${c.detail}` : ""}
            </li>
          ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={p.refresh}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 px-3.5 py-1.5 text-[13px] font-medium text-amber-200 transition hover:bg-amber-400/10"
        >
          <RefreshCw className="size-3.5" /> Check Again
        </button>
        <button
          onClick={() => setVisible(true)}
          className="rounded-lg border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[13px] font-medium text-zinc-200 transition hover:bg-white/10"
        >
          Open Funding
        </button>
      </div>
    </div>
  );
}
