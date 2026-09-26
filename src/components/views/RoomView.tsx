"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  ArrowLeft,
  Check,
  Copy,
  Link2,
  Loader2,
  MessageSquare,
  Send,
  Share2,
} from "lucide-react";
import { fetchComments, fetchRoomBundle, postComment, toggleReaction, ApiError } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { shortWallet } from "@/lib/solana-client";
import { isDemoTxId, type DemoScenario } from "@/lib/tx-provider";
import { requiredUsdcForTrade } from "@/lib/preflight";
import { useMainnetPreflight } from "@/components/trade/use-preflight";
import { PreflightCard } from "@/components/trade/preflight-card";
import { DemoScenarioPicker } from "@/components/trade/demo-scenario";
import { useTradeFlow } from "@/components/trade/useTradeFlow";
import { FundsHint, useAppMode } from "@/components/wallet/funding-center";
import {
  CategoryPill,
  DemoBanner,
  NoticeBanner,
  PhasePill,
  PriceBar,
  PreviewWalletNotice,
  SectionTitle,
  Spinner,
  timeAgo,
} from "@/components/shared/ui-bits";

const REACTIONS = ["👍", "🔥", "😂", "🤔"];

// ---------- Trade panel ----------

function TradePanel({ marketId, demoMode, open }: { marketId: string; demoMode: boolean; open: boolean }) {
  const [scenario, setScenario] = useState<DemoScenario>("success");
  const { state, quote, execute, reset, connected } = useTradeFlow(marketId, demoMode, scenario);
  const [amount, setAmount] = useState("10");
  const [side, setSide] = useState<"yes" | "no" | null>(null);

  // Mainnet preflight (spec §4/§5): gate the REAL flow on wallet + balances
  // before any quote/build/sign. Demo/sandbox never runs it.
  const amountNum = Number(amount);
  const amountValid = Number.isFinite(amountNum) && amountNum >= 1;
  const preflight = useMainnetPreflight(
    amountValid ? requiredUsdcForTrade(amountNum) : requiredUsdcForTrade(1),
    !demoMode && connected && amountValid
  );
  const preflightBlocks = !demoMode && connected && amountValid && !preflight.ok;

  const fullReset = () => {
    setSide(null);
    setAmount("10");
    reset();
  };

  if (!open) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
        <p className="text-[13.5px] text-zinc-400">
          {demoMode
            ? "Trading in this environment is simulated — the full quote → sign → confirm flow runs, but nothing is broadcast."
            : "Connect a Solana wallet to take a YES or NO position through Panta."}
        </p>
      </div>
    );
  }

  // Confirmation state
  if (state.phase === "confirmed") {
    return (
      <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] p-5">
        <div className="flex items-center gap-2 text-emerald-300">
          <Check className="size-4.5" />
          <p className="text-[14px] font-semibold">
            {state.demoTrade ? "Demo trade recorded" : "Trade confirmed"}
          </p>
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-emerald-200/80">
          {state.demoTrade
            ? `Simulated fill: ${state.quote?.shares} ${state.quote?.side.toUpperCase()} shares @ ${state.quote?.avgPrice}¢ avg. No real transaction was broadcast.`
            : `Bought ${state.quote?.shares} ${state.quote?.side.toUpperCase()} shares @ ${(Number(state.quote?.avgPrice ?? 0) * 100).toFixed(1)}¢ avg · fee ${state.quote?.feeUsdc} USDC. View it under My Activity.`}
        </p>
        {state.signature && (
          <p className="mt-2 break-all font-mono text-[11px] text-emerald-200/50">
            {isDemoTxId(state.signature)
              ? `Demo transaction ID (simulated — not a blockchain signature): ${state.signature}`
              : `signature: ${state.signature}`}
          </p>
        )}
        <button onClick={fullReset} className="mt-4 rounded-lg border border-emerald-400/30 px-3.5 py-1.5 text-[13px] font-medium text-emerald-200 hover:bg-emerald-400/10">
          New trade
        </button>
      </div>
    );
  }

  // Quote review state
  if ((state.phase === "quoted" || state.phase === "building" || state.phase === "signing" || state.phase === "broadcasting" || state.phase === "confirming") && state.quote) {
    const busy = ["building", "signing", "broadcasting", "confirming"].includes(state.phase);
    const stepLabel: Record<string, string> = {
      building: "Building transaction via Panta…",
      signing: "Waiting for wallet signature…",
      broadcasting: "Broadcasting to Solana…",
      confirming: "Confirming with Panta…",
    };
    return (
      <div className="rounded-xl border border-white/[0.1] bg-white/[0.04] p-5">
        <p className="text-[13px] text-zinc-400">
          Review your fill — <span className="font-medium text-zinc-200">{state.quote.side.toUpperCase()}</span>
        </p>
        <div className="mt-3 space-y-2 rounded-lg border border-white/[0.06] bg-black/20 p-4 text-[13.5px]">
          <div className="flex justify-between">
            <span className="text-zinc-400">You pay</span>
            <span className="font-mono text-zinc-100">{state.quote.amountUsdc} USDC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">You receive</span>
            <span className="font-mono text-zinc-100">≈ {state.quote.shares} {state.quote.side.toUpperCase()} shares</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Avg price</span>
            <span className="font-mono text-zinc-100">{(Number(state.quote.avgPrice) * 100).toFixed(1)}¢</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Protocol fee</span>
            <span className="font-mono text-zinc-100">{state.quote.feeUsdc} USDC</span>
          </div>
        </div>
        {state.demoTrade && (
          <p className="mt-3 rounded-lg border border-amber-400/25 bg-amber-400/[0.07] px-3 py-2 text-[12px] text-amber-200/90">
            DEMO MODE — this fill is simulated. No wallet signature or on-chain transaction is involved.
          </p>
        )}
        {busy && (
          <p className="mt-3 flex items-center gap-2 text-[13px] text-zinc-400">
            <Spinner /> {stepLabel[state.phase]}
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <button
            disabled={busy}
            onClick={() => execute()}
            className="flex-1 rounded-lg bg-white py-2.5 text-[14px] font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {state.demoTrade ? "Confirm demo trade" : busy ? "Working…" : "Confirm trade"}
          </button>
          <button
            disabled={busy}
            onClick={fullReset}
            className="rounded-lg border border-white/12 px-4 text-[13.5px] text-zinc-300 transition hover:bg-white/[0.06] disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (state.phase === "error") {
    return (
      <div className="rounded-xl border border-red-400/25 bg-red-400/[0.06] p-5">
        <p className="text-[13.5px] font-medium text-red-200">{state.error}</p>
        <button onClick={reset} className="mt-3 rounded-lg border border-red-400/30 px-3.5 py-1.5 text-[13px] text-red-200 hover:bg-red-400/10">
          Try again
        </button>
      </div>
    );
  }

  // Idle: pick side + amount
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
      <p className="text-[13px] text-zinc-400">Take a position</p>
      {!demoMode && (
        <div className="mt-3 space-y-2.5">
          <PreviewWalletNotice />
          {connected ? (
            <FundsHint note="Live mode — trades use real USDC." />
          ) : (
            <p className="rounded-lg border border-amber-400/25 bg-amber-400/[0.07] px-3 py-2 text-[12px] leading-snug text-amber-200/90">
              No wallet connected — the flow below runs in clearly-labeled demo shape until you connect one.
            </p>
          )}
        </div>
      )}
      {demoMode && <DemoScenarioPicker value={scenario} onChange={setScenario} disabled={state.phase !== "idle"} />}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {(["yes", "no"] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              setSide(s);
              setAmount("10");
            }}
            className={`rounded-lg border py-3 text-[15px] font-bold transition ${
              s === "yes"
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
                : "border-red-400/30 bg-red-400/10 text-red-300 hover:bg-red-400/20"
            } ${side === s ? "ring-2 ring-white/40" : ""}`}
          >
            Trade {s.toUpperCase()}
          </button>
        ))}
      </div>
      {side && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[13px] text-zinc-400">Amount (USDC)</label>
            <div className="flex gap-1.5">
              {["5", "10", "20"].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className={`rounded-md px-2 py-0.5 text-[12px] transition ${
                    amount === v ? "bg-white/15 text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            className="w-full rounded-lg border border-white/10 bg-black/25 px-4 py-2.5 font-mono text-[14px] text-zinc-100 focus:border-white/25 focus:outline-none"
          />
          {!amountValid && (
            <p className="mt-2 text-[12px] text-amber-300">Enter an amount of at least 1 USDC.</p>
          )}
          {demoMode ? null : (
            <PreflightCard p={preflight} />
          )}
          <button
            disabled={state.phase === "quoting" || !amountValid || preflightBlocks}
            onClick={() => quote(side, amount)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-[14px] font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-60"
          >
            {state.phase === "quoting" ? <Spinner /> : null}
            {state.phase === "quoting" ? "Getting quote from Panta…" : "Get quote"}
          </button>
          {preflightBlocks && !preflight.loading && (
            <p className="mt-2 text-[12px] leading-snug text-amber-300">
              Preflight blocked — resolve the balance items above before quoting this mainnet trade.
            </p>
          )}
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-zinc-500">
            {demoMode
              ? "DEMO MODE — quote and confirmation are simulated."
              : "Panta quotes the fill, your wallet signs, and the transaction is broadcast to Solana. Panta Rooms never holds your keys."}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------- Discussion ----------

interface CommentRow {
  id: string;
  displayName: string;
  wallet: string | null;
  body: string;
  createdAt: string;
  reactions: Record<string, number>;
}

function Discussion({ marketId, demoMode }: { marketId: string; demoMode: boolean }) {
  const qc = useQueryClient();
  const { publicKey } = useWallet();
  const identity = useAppStore((s) => s.identity);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["comments", marketId],
    queryFn: () => fetchComments(marketId),
    refetchInterval: 10_000,
  });

  const voter = publicKey?.toBase58() ?? identity ?? "guest";

  const submit = async () => {
    const t = text.trim();
    if (!t || posting) return;
    setPosting(true);
    setError(null);
    try {
      await postComment(marketId, t, publicKey?.toBase58() ?? null);
      setText("");
      await qc.invalidateQueries({ queryKey: ["comments", marketId] });
      await qc.invalidateQueries({ queryKey: ["room", marketId] });
    } catch (e) {
      setError(e instanceof ApiError ? e.friendly : "Could not post the comment.");
    } finally {
      setPosting(false);
    }
  };

  const react = async (commentId: string, emoji: string) => {
    try {
      await toggleReaction(marketId, commentId, emoji, voter);
      await qc.invalidateQueries({ queryKey: ["comments", marketId] });
    } catch {
      /* non-blocking */
    }
  };

  const comments: CommentRow[] = data?.comments ?? [];

  return (
    <div>
      <SectionTitle hint={`${comments.length} comment${comments.length === 1 ? "" : "s"}`}>Discussion</SectionTitle>
      <div className="flex gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-[11px] font-bold text-zinc-300">
          {(publicKey ? shortWallet(publicKey.toBase58()).slice(0, 2) : "G").toUpperCase()}
        </div>
        <div className="flex-1">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={demoMode ? "Share your take (demo room)…" : "Share your take on this prediction…"}
            maxLength={500}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[13.5px] text-zinc-200 placeholder:text-zinc-500 focus:border-white/20 focus:outline-none"
          />
          {error && <p className="mt-1.5 text-[12px] text-red-300">{error}</p>}
        </div>
        <button
          onClick={submit}
          disabled={posting || !text.trim()}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-40"
          aria-label="Post comment"
        >
          {posting ? <Spinner /> : <Send className="size-4" />}
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {comments.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-zinc-500">
            No comments yet — start the conversation.
          </p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-[10px] font-bold text-zinc-300">
                  {c.displayName.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-[13px] font-medium text-zinc-200">{c.displayName}</span>
                {c.wallet && <span className="font-mono text-[11px] text-zinc-500">{shortWallet(c.wallet)}</span>}
                <span className="ml-auto text-[11.5px] text-zinc-500">{timeAgo(new Date(c.createdAt).getTime() / 1000)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-zinc-300">{c.body}</p>
              <div className="mt-2.5 flex items-center gap-1.5">
                {REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => react(c.id, emoji)}
                    className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[12px] text-zinc-400 transition hover:bg-white/[0.08]"
                  >
                    <span>{emoji}</span>
                    {c.reactions[emoji] ? <span className="text-[11px]">{c.reactions[emoji]}</span> : null}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ---------- Activity tape ----------

function ActivityTape({ tape, demo }: { tape: import("@/lib/types").TapeRow[]; demo: boolean }) {
  if (!tape.length) {
    return (
      <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center text-[13px] text-zinc-500">
        No trades yet on this market.
      </p>
    );
  }
  return (
    <div className="max-h-96 space-y-2 overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      {tape.map((t) => {
        const s = (t.side ?? (Number(t.yesAmount) > 0 ? "yes" : "no")).toLowerCase();
        const shares = t.shares ?? String(Number(t.yesAmount) > 0 ? t.yesAmount : t.noAmount);
        return (
          <div key={String(t.id)} className="flex items-center gap-3 rounded-lg px-2 py-2 text-[12.5px] hover:bg-white/[0.03]">
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-bold ${
                s === "yes" ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"
              }`}
            >
              {s.toUpperCase()}
            </span>
            <span className="font-mono text-zinc-400">{shortWallet(t.wallet)}</span>
            <span className="text-zinc-500">bought {Number(shares).toFixed(1)} shares</span>
            {t.demo && <span className="rounded bg-amber-400/15 px-1.5 text-[10px] font-bold text-amber-300">DEMO</span>}
            <span className="ml-auto shrink-0 text-zinc-500">{t.blockTime ? timeAgo(t.blockTime) : ""}</span>
          </div>
        );
      })}
      {demo && (
        <p className="px-2 pt-1 text-[11px] text-amber-200/60">
          DEMO DATA — simulated activity, not real trades.
        </p>
      )}
    </div>
  );
}

// ---------- Room view ----------

export function RoomView() {
  const marketId = useAppStore((s) => s.marketId);
  const navigate = useAppStore((s) => s.navigate);
  const { connected } = useWallet();
  const { env } = useAppMode();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["room", marketId],
    queryFn: () => fetchRoomBundle(marketId!),
    enabled: Boolean(marketId),
    refetchInterval: 20_000,
  });

  const shareUrl = useMemo(() => {
    if (!marketId) return "";
    const base = window.location.href.split("#")[0];
    return `${base}#/room/${encodeURIComponent(marketId)}`;
  }, [marketId]);

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  const shareNative = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Panta Room", url: shareUrl });
        return;
      } catch {
        /* user cancelled */
      }
    }
    copyShare();
  };

  if (!marketId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-zinc-400">
        No market selected. <button onClick={() => navigate("/discover")} className="text-zinc-200 underline">Explore rooms</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-32 sm:px-6">
        <Loader2 className="size-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (isError || !data?.market) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <NoticeBanner text="This Room could not be loaded. The market may not exist on Panta, or the API is unreachable." tone="error" />
        <button onClick={() => navigate("/discover")} className="mt-6 inline-flex items-center gap-2 text-[14px] text-zinc-300 hover:text-white">
          <ArrowLeft className="size-4" /> Back to Explore
        </button>
      </div>
    );
  }

  const m = data.market;
  // Data-based labeling (demo rooms) stays separate from environment-based
  // action simulation: a real market viewed in Sandbox keeps its live labels,
  // but trades there are simulated because Sandbox never broadcasts on-chain.
  const demo = data.demo || m.demo;
  const simulated = demo || env.mode !== "live";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6">
      <button onClick={() => navigate("/discover")} className="mb-6 inline-flex items-center gap-1.5 text-[13.5px] text-zinc-400 transition hover:text-zinc-200">
        <ArrowLeft className="size-4" /> Explore
      </button>

      {demo && (
        <div className="mb-5">
          <DemoBanner note={data.notice ?? "This room shows deterministic sample data."} />
        </div>
      )}
      {data.notice && !demo && (
        <div className="mb-5">
          <NoticeBanner text={data.notice} />
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Left: market + social */}
        <div className="pr-fade-up space-y-8">
          {/* Market header */}
          <div className="pr-card p-6">
            <div className="flex flex-wrap items-center gap-2">
              <CategoryPill category={m.category} />
              <PhasePill phase={m.phase} outcome={m.outcome} />
              {demo && (
                <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-amber-300">
                  DEMO DATA
                </span>
              )}
            </div>
            <h1 className="mt-4 text-xl font-bold leading-snug tracking-tight text-zinc-50 sm:text-2xl">{m.title}</h1>
            {m.description && <p className="mt-2.5 text-[13.5px] leading-relaxed text-zinc-400">{m.description}</p>}
            {m.resolutionRule && (
              <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Resolution</p>
                <p className="mt-1 text-[13px] leading-relaxed text-zinc-300">{m.resolutionRule}</p>
              </div>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] text-zinc-500">
              {m.volumeUsdc && <span>{m.volumeUsdc} USDC volume</span>}
              {m.creatorAddress && <span className="font-mono">creator {shortWallet(m.creatorAddress)}</span>}
              <span className="inline-flex items-center gap-1.5">
                <MessageSquare className="size-3.5" /> {data.room?.commentCount ?? 0}
              </span>
            </div>
          </div>

          {/* Activity */}
          <div>
            <SectionTitle hint={demo ? "Simulated (DEMO)" : "Live from Panta"}>Activity</SectionTitle>
            <ActivityTape tape={data.tape ?? []} demo={demo} />
          </div>

          {/* Discussion */}
          <Discussion marketId={marketId} demoMode={demo} />
        </div>

        {/* Right: trade + share */}
        <aside className="pr-fade-up space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="pr-card p-5">
            <div className="mb-4">
              <PriceBar yesCents={m.yesCents} noCents={m.noCents} />
            </div>
            {m.resolved ? (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-[13.5px] text-zinc-300">
                This market resolved <span className="font-semibold">{m.outcome?.toUpperCase() ?? "—"}</span>. Winners can
                claim from the My Activity page.
              </div>
            ) : (
              <TradePanel marketId={marketId} demoMode={simulated} open />
            )}
            {!connected && !simulated && (
              <p className="mt-3 text-center text-[12px] text-zinc-500">
                Connect a Solana wallet (Phantom or Solflare) to trade for real.
              </p>
            )}
          </div>

          {/* Share */}
          <div className="pr-card p-5">
            <SectionTitle>Share this Room</SectionTitle>
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
              <Link2 className="size-3.5 shrink-0 text-zinc-500" />
              <span className="truncate font-mono text-[11.5px] text-zinc-400">{shareUrl}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={shareNative}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-[13.5px] font-semibold text-zinc-950 transition hover:bg-zinc-200"
              >
                <Share2 className="size-4" /> Share Room
              </button>
              <button
                onClick={copyShare}
                className="flex items-center gap-1.5 rounded-lg border border-white/12 px-3.5 text-[13px] text-zinc-300 transition hover:bg-white/[0.06]"
              >
                {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-zinc-500">
              Drop the link in your Telegram, Discord, stream or newsletter — anyone can join the conversation and trade.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
