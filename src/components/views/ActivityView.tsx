"use client";

/**
 * My Activity (spec §16):
 * - Positions: GET /positions/?wallet= (Panta) — shares, phase, claim eligibility.
 *   Panta's positions endpoint is currently unstable in production; failures are
 *   surfaced honestly — never hidden, never faked.
 * - Demo trades recorded this session are listed and labeled DEMO.
 * - Claims: when a position is claimable, build the documented claim transaction,
 *   let the wallet sign, broadcast, and report — the real Panta claim flow.
 */

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Coins, RefreshCw, Wallet } from "lucide-react";
import { fetchMarketDetail, fetchPositions, pantaProxy, ApiError } from "@/lib/api-client";
import { broadcast, instructionsToVersionedTx, walletErrorCode } from "@/lib/solana-client";
import { useAppStore } from "@/store/app-store";
import type { WinClaimBuildResponse } from "@/server/panta/types";
import { DemoBanner, NoticeBanner, PreviewWalletNotice, SectionTitle, Spinner } from "@/components/shared/ui-bits";
import type { PositionItem } from "@/lib/types";

function PositionCard({ p, onClaim, claiming }: { p: PositionItem; onClaim?: () => void; claiming?: boolean }) {
  const navigate = useAppStore((s) => s.navigate);
  const resolvedWinner = p.outcome ? p.outcome === p.side : false;
  const estValue =
    p.phase === "resolved"
      ? resolvedWinner
        ? Number(p.shares) * 1
        : 0
      : p.estValue != null
        ? p.estValue
        : null;

  return (
    <div className="pr-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${p.side === "yes" ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"}`}>
            {p.side.toUpperCase()}
          </span>
          <span className="text-[11.5px] capitalize text-zinc-500">{p.phase}</span>
          {p.outcome && <span className="text-[11.5px] text-zinc-500">· resolved {p.outcome.toUpperCase()}</span>}
        </div>
        {p.demo && <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">DEMO</span>}
      </div>
      <button
        onClick={() => navigate(`/room/${encodeURIComponent(p.marketId)}`)}
        className="mt-2.5 block text-left text-[14.5px] font-medium leading-snug text-zinc-100 hover:underline"
      >
        {p.title || p.marketId}
      </button>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px]">
        <span className="text-zinc-400">
          <span className="font-mono text-zinc-200">{Number(p.shares).toFixed(2)}</span> shares
        </span>
        {estValue != null && (
          <span className="text-zinc-400">
            ≈ <span className="font-mono text-zinc-200">{estValue.toFixed(2)}</span> USDC
          </span>
        )}
        {p.claimed && <span className="text-[12px] text-zinc-500">already claimed</span>}
      </div>
      {p.claimable && !p.claimed && resolvedWinner && (
        <button
          onClick={onClaim}
          disabled={claiming}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
        >
          <Coins className="size-4" />
          {claiming ? "Preparing claim…" : "Claim winnings"}
        </button>
      )}
    </div>
  );
}

export function ActivityView() {
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const qc = useQueryClient();
  const navigate = useAppStore((s) => s.navigate);
  const demoTrades = useAppStore((s) => s.demoTrades);
  const [claimingMarket, setClaimingMarket] = useState<string | null>(null);
  const [claimMsg, setClaimMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const wallet = publicKey?.toBase58() ?? null;

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["positions", wallet],
    queryFn: () => fetchPositions(wallet!),
    enabled: Boolean(wallet),
    retry: 1,
    refetchInterval: 60_000,
  });

  const positions: PositionItem[] = data?.positions ?? [];

  const claim = async (p: PositionItem) => {
    if (!publicKey || !signTransaction) return;
    setClaimingMarket(p.marketId);
    setClaimMsg(null);
    try {
      const build = await pantaProxy<WinClaimBuildResponse>("claim/build/", {
        wallet: publicKey.toBase58(),
        marketId: p.marketId,
      });
      const tx = instructionsToVersionedTx(build.instructions, publicKey, build.recentBlockhash);
      const signed = await signTransaction(tx);
      const signature = await broadcast(connection, signed);
      // optional attribution for the claim (kind: claim)
      pantaProxy("trades/", {
        signature,
        wallet: publicKey.toBase58(),
        marketId: p.marketId,
      }).catch(() => undefined);
      setClaimMsg({ ok: true, text: `Claim broadcast: ${signature.slice(0, 12)}… — view it on Solana. ${build.winningShares} winning shares.` });
      await qc.invalidateQueries({ queryKey: ["positions", wallet] });
    } catch (e) {
      if (e instanceof ApiError) {
        setClaimMsg({ ok: false, text: e.friendly });
      } else {
        const { message } = walletErrorCode(e);
        setClaimMsg({ ok: false, text: message });
      }
    } finally {
      setClaimingMarket(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">My Activity</h1>
      <p className="mt-2 text-[14px] text-zinc-400">Your positions and claims across Panta Rooms.</p>

      {!connected ? (
        <div className="pr-card mt-8 flex flex-col items-center px-6 py-14 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Wallet className="size-5 text-zinc-400" />
          </div>
          <p className="mt-4 text-[15px] font-semibold text-zinc-200">Connect your wallet</p>
          <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-zinc-500">
            Positions are read directly from Panta for your Solana address. Nothing is stored by Panta Rooms.
          </p>
        </div>
      ) : (
        <>
          {claimMsg && (
            <div className="mt-6">
              <NoticeBanner text={claimMsg.text} tone={claimMsg.ok ? "info" : "error"} />
            </div>
          )}

          <div className="mt-6">
            <PreviewWalletNotice />
          </div>

          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle hint={isLoading ? undefined : `${positions.length} position${positions.length === 1 ? "" : "s"}`}>
                Positions
              </SectionTitle>
              <button onClick={() => refetch()} className="inline-flex items-center gap-1.5 text-[12.5px] text-zinc-400 hover:text-zinc-200" disabled={isRefetching}>
                {isRefetching ? <Spinner className="size-3.5" /> : <RefreshCw className="size-3.5" />} Refresh
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 py-10 text-[13.5px] text-zinc-500">
                <Spinner /> Loading positions from Panta…
              </div>
            ) : isError ? (
              <div className="space-y-3">
                <NoticeBanner
                  text={`Panta's positions service couldn't complete your request (${
                    error instanceof ApiError ? error.code : "unavailable"
                  }). This endpoint is intermittent in production right now — your positions are safe on-chain; try Refresh.`}
                  tone="error"
                />
                <p className="text-[12.5px] text-zinc-500">
                  Note: positions can take a moment to appear after a trade while Panta's indexer catches up.
                </p>
              </div>
            ) : positions.length === 0 ? (
              <div className="pr-card px-6 py-10 text-center">
                <p className="text-[14px] text-zinc-300">No positions yet</p>
                {data?.note ? (
                  <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-500">{data.note}</p>
                ) : (
                  <p className="mt-1 text-[12.5px] text-zinc-500">
                    Trades you make in Rooms appear here. Newly confirmed trades may take a minute to index.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3.5">
                {positions.map((p) => (
                  <PositionRowWrapper key={`${p.marketId}-${p.side}`} p={p} onClaim={() => claim(p)} claiming={claimingMarket === p.marketId} />
                ))}
              </div>
            )}
          </div>

          <p className="mt-10 text-[12px] leading-relaxed text-zinc-600">
            Claims use Panta&apos;s documented claim flow: build unsigned instructions → your wallet signs → broadcast →
            Panta verifies on-chain. Creator-fee claims appear for market creators after graduation.
          </p>
        </>
      )}

      {/* Demo trades are session-local and wallet-independent — always shown when present */}
      {demoTrades.length > 0 && (
        <div className="mt-10">
          <SectionTitle hint="this session">Demo trades</SectionTitle>
          <DemoBanner note="Trades below were simulated in DEMO MODE. No transactions were broadcast." />
          <div className="mt-3 space-y-2.5">
            {demoTrades.map((t) => (
              <div key={t.id} className="pr-card p-4 text-[13.5px]">
                <div className="flex items-center gap-3">
                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${t.side === "yes" ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"}`}>
                    {t.side.toUpperCase()}
                  </span>
                  <span className="font-mono text-zinc-300">{t.shares}</span>
                  <span className="text-zinc-500">shares for {t.amountUsdc} USDC</span>
                  <span className="rounded bg-amber-400/15 px-1.5 text-[10px] font-bold text-amber-300">DEMO</span>
                  <button onClick={() => navigate(`/room/${encodeURIComponent(t.marketId)}`)} className="ml-auto inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-200">
                    Room <ArrowRight className="size-3.5" />
                  </button>
                </div>
                {t.demoTxId && (
                  <p className="mt-2 break-all font-mono text-[10.5px] leading-relaxed text-zinc-600">
                    Demo transaction ID (simulated — not a blockchain signature): {t.demoTxId}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Wraps PositionCard and resolves the market title + estimated value via Panta detail. */
function PositionRowWrapper({ p, onClaim, claiming }: { p: PositionItem; onClaim?: () => void; claiming?: boolean }) {
  const [title, setTitle] = useState<string | null>(null);
  const [estValue, setEstValue] = useState<number | null>(null);

  useQuery({
    queryKey: ["pos-market", p.marketId],
    queryFn: async () => {
      const d = await fetchMarketDetail(p.marketId);
      setTitle(d.title);
      const price = p.side === "yes" ? d.yesCents : d.noCents;
      if (p.phase !== "resolved" && price != null) setEstValue(Number(p.shares) * (price / 100));
      return d;
    },
    staleTime: 60_000,
    retry: false,
  });

  return <PositionCard p={{ ...p, title: title ?? p.title, estValue }} onClaim={onClaim} claiming={claiming} />;
}
