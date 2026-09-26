"use client";

/**
 * Panta primary-buy flow (client-side, non-custodial).
 *
 * Documented sequence (docs.panta.market — how-it-works):
 *   1. POST /primaryorderquote/    → quoteId, shares, avgPrice, feeUsdc
 *   2. POST /primaryorderbuild/    → orderId, instructions[], recentBlockhash
 *   3. Client compiles a v0 tx  → wallet signs → broadcast on OUR RPC
 *   4. POST /primaryordersubmit/   → registers the signature
 *   5. POST /primaryorderverify/   → polls until confirmed/failed
 *   6. POST /trades/ (best effort) → attribution to our API key
 *
 * DEMO MODE: deterministic simulated quote + clearly-labeled demo confirmation.
 * No fabricated signatures; no fake "confirmed on-chain" claims.
 */

import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { ApiError, friendlyMessage, pantaProxy } from "@/lib/api-client";
import { broadcast, instructionsToVersionedTx, walletErrorCode } from "@/lib/solana-client";
import { useAppStore } from "@/store/app-store";
import { runDemoTransaction } from "@/lib/tx-provider";
import type { DemoScenario } from "@/lib/tx-provider";
import type { PrimaryBuildResponse, PrimaryQuoteResponse, PrimaryVerifyResponse } from "@/server/panta/types";
export type TradePhase =
  | "idle"
  | "quoting"
  | "quoted"
  | "building"
  | "signing"
  | "broadcasting"
  | "confirming"
  | "confirmed"
  | "error";

export interface TradeQuote {
  quoteId: string;
  shares: string;
  avgPrice: string;
  feeUsdc: string;
  amountUsdc: string;
  side: "yes" | "no";
  demo?: boolean;
}

export interface TradeState {
  phase: TradePhase;
  quote: TradeQuote | null;
  signature: string | null;
  error: string | null;
  errorCode: string | null;
  demoTrade: boolean;
}

const initial: TradeState = {
  phase: "idle",
  quote: null,
  signature: null,
  error: null,
  errorCode: null,
  demoTrade: false,
};

export function useTradeFlow(marketId: string, demoMode: boolean, demoScenario: DemoScenario = "success") {
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const addDemoTrade = useAppStore((s) => s.addDemoTrade);
  const setLastTx = useAppStore((s) => s.setLastTx);
  const [state, setState] = useState<TradeState>(initial);

  const reset = useCallback(() => setState(initial), []);

  const setError = useCallback((code: string, message: string) => {
    setState({ ...initial, phase: "error", errorCode: code, error: message });
  }, []);

  /** Step 1 — quote (real or demo). */
  const quote = useCallback(
    async (side: "yes" | "no", amountUsdc: string): Promise<TradeQuote | null> => {
      setState({ ...initial, demoTrade: demoMode });
      try {
        if (demoMode || !connected || !publicKey) {
          // Deterministic demo quote (clearly labeled by the UI).
          const amount = Number(amountUsdc);
          if (!Number.isFinite(amount) || amount < 1) {
            setError("INVALID_MARKET_PARAMS", "Enter an amount of at least 1 USDC.");
            return null;
          }
          const seedStr = `${marketId}:${side}`;
          let h = 0;
          for (const ch of seedStr) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
          const cents = 35 + (h % 30);
          const avg = cents / 100;
          const shares = (amount / avg).toFixed(2);
          const fee = (amount * 0.02).toFixed(2);
          const q: TradeQuote = {
            quoteId: `demo-qt-${h}`,
            shares,
            avgPrice: avg.toFixed(4),
            feeUsdc: fee,
            amountUsdc,
            side,
            demo: true,
          };
          setState({ ...initial, phase: "quoted", quote: q, demoTrade: true });
          return q;
        }

        setState((s) => ({ ...s, phase: "quoting", error: null, errorCode: null }));
        const res = await pantaProxy<PrimaryQuoteResponse>("primaryorderquote/", {
          wallet: publicKey.toBase58(),
          marketId,
          side,
          amountUsdc,
        });
        const q: TradeQuote = {
          quoteId: res.quoteId,
          shares: res.shares,
          avgPrice: res.avgPrice,
          feeUsdc: res.feeUsdc,
          amountUsdc,
          side,
        };
        setState((s) => ({ ...s, phase: "quoted", quote: q }));
        return q;
      } catch (e) {
        if (e instanceof ApiError) setError(e.code, e.friendly);
        else setError("NETWORK_ERROR", friendlyMessage("NETWORK_ERROR"));
        return null;
      }
    },
    [connected, publicKey, marketId, demoMode, setError]
  );

  /** Steps 2-6 — build, sign, broadcast, submit, verify, report. */
  const execute = useCallback(async (): Promise<boolean> => {
    const q = state.quote;
    if (!q) return false;

    // Demo path — the SIMULATED transaction provider (spec §8 separation).
    // Walks the same phase shape as mainnet and lands on the selected demo
    // scenario. Never touches the network and never yields a real signature.
    if (q.demo || demoMode || !connected || !publicKey || !signTransaction) {
      if (connected && !signTransaction) {
        setError("WALLET_ERROR", "This wallet cannot sign transactions.");
        return false;
      }
      const res = await runDemoTransaction({
        scenario: demoScenario,
        onPhase: (phase) => setState((s) => ({ ...s, phase })),
      });
      if (res.outcome !== "success") {
        setError(res.errorCode ?? "TX_FAILED", res.errorMessage ?? "The simulated transaction did not complete.");
        return false;
      }
      setState((s) => ({ ...s, phase: "confirmed", signature: res.demoTxId ?? null }));
      addDemoTrade({
        id: `demo-trade-${Date.now()}`,
        marketId,
        title: "",
        side: q.side,
        amountUsdc: q.amountUsdc,
        shares: q.shares,
        at: Date.now(),
        demoTxId: res.demoTxId,
      });
      return true;
    }

    try {
      // 2 · Build
      setState((s) => ({ ...s, phase: "building" }));
      const build = await pantaProxy<PrimaryBuildResponse>("primaryorderbuild/", {
        quoteId: q.quoteId,
        wallet: publicKey.toBase58(),
        maxSlippageBps: 100,
      });

      // 3 · Compile + sign + broadcast (user signs — we never hold keys)
      setState((s) => ({ ...s, phase: "signing" }));
      const tx = instructionsToVersionedTx(build.instructions, publicKey, build.recentBlockhash);
      let signed;
      try {
        signed = await signTransaction(tx);
      } catch (e) {
        const { code, message } = walletErrorCode(e);
        setError(code, message);
        return false;
      }

      setState((s) => ({ ...s, phase: "broadcasting" }));
      let signature: string;
      try {
        signature = await broadcast(connection, signed);
      } catch (e) {
        const { code, message } = walletErrorCode(e);
        setError(code, message);
        return false;
      }
      setState((s) => ({ ...s, signature }));
      // Real broadcast — remember it for Developer Details (demo paths never set this).
      setLastTx({ signature, kind: "trade", at: Date.now() });

      // 4 · Submit
      await pantaProxy("primaryordersubmit/", {
        orderId: build.orderId,
        signature,
        wallet: publicKey.toBase58(),
      });

      // 5 · Verify (poll up to ~30s)
      setState((s) => ({ ...s, phase: "confirming" }));
      let status: PrimaryVerifyResponse["status"] = "submitted";
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        try {
          const v = await pantaProxy<PrimaryVerifyResponse>("primaryorderverify/", {
            orderId: build.orderId,
            signature,
            wallet: publicKey.toBase58(),
          });
          status = v.status;
          if (v.status === "confirmed" || v.status === "failed" || v.status === "expired") break;
        } catch {
          /* keep polling */
        }
      }

      if (status === "confirmed") {
        setState((s) => ({ ...s, phase: "confirmed" }));
        // 6 · Attribution (best effort — never blocks the UX)
        pantaProxy("trades/", {
          signature,
          wallet: publicKey.toBase58(),
          marketId,
          quoteId: q.quoteId,
          clientOrderId: build.orderId,
        }).catch(() => undefined);
        return true;
      }

      setError(
        "TX_FAILED",
        status === "failed"
          ? "The transaction failed on-chain. No trade was submitted."
          : "The transaction has not confirmed yet. Check My Activity shortly — the position appears once Panta confirms it."
      );
      return false;
    } catch (e) {
      if (e instanceof ApiError) setError(e.code, e.friendly);
      else setError("NETWORK_ERROR", friendlyMessage("NETWORK_ERROR"));
      return false;
    }
  }, [state.quote, demoMode, demoScenario, connected, publicKey, signTransaction, connection, marketId, addDemoTrade, setLastTx, setError]);

  return { state, quote, execute, reset, connected };
}
