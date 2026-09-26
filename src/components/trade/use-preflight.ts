"use client";

/**
 * Mainnet preflight hook (spec §4/§5) — wraps the pure evaluator in
 * src/lib/preflight.ts with live wallet + real RPC balance reads.
 * Only meaningful in LIVE mode; demo/sandbox flows never call it.
 */

import { useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAppMode, useBalances } from "@/components/wallet/funding-center";
import {
  evaluateMainnetPreflight,
  requiredSolFor,
  type PreflightResult,
} from "@/lib/preflight";

export function useMainnetPreflight(requiredUsdc: number, enabled: boolean): PreflightResult & {
  loading: boolean;
  refresh: () => void;
  /** raw numeric balances for the Current vs Required card (null = unreadable) */
  currentSol: number | null;
  currentUsdc: number | null;
} {
  const { publicKey, connected, signTransaction, wallet } = useWallet();
  const { env } = useAppMode();
  const balances = useBalances(publicKey?.toBase58(), env);

  const active = enabled && env.realFunds;
  const solNum = balances.data ? Number(balances.data.sol) : null;
  const usdcNum =
    balances.data && balances.data.usdc !== null ? Number(balances.data.usdc) : null;

  const result = useMemo(() => {
    if (!active) {
      return {
        ok: false,
        checks: [],
        insufficientFunds: false,
        requiredUsdc,
        requiredSol: requiredSolFor(),
        loading: false,
        refresh: () => undefined,
        currentSol: null,
        currentUsdc: null,
      };
    }
    return {
      ...evaluateMainnetPreflight({
        connected,
        hasAddress: Boolean(publicKey),
        hasSigner: Boolean(signTransaction && wallet?.adapter),
        sol: connected ? solNum : null,
        usdc: connected ? usdcNum : null,
        requiredUsdc,
      }),
      loading: connected && balances.isFetching && !balances.data,
      refresh: () => void balances.refetch(),
      currentSol: solNum,
      currentUsdc: usdcNum,
    };
  }, [
    active, connected, publicKey, signTransaction, wallet, solNum, usdcNum,
    requiredUsdc, balances,
  ]);

  return result;
}
