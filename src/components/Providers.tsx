"use client";

import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import {
  WalletAccountError,
  WalletConnectionError,
  WalletDisconnectedError,
  WalletNotReadyError,
  WalletTimeoutError,
  WalletWindowBlockedError,
  type WalletError,
} from "@solana/wallet-adapter-base";
import { WalletModalProvider, useWalletModal } from "@/components/wallet/wallet-modal";
import { TestingCenterProvider, useTestingCenter } from "@/components/wallet/center-context";
import { TestingCenterModal, useAppMode, useBalances } from "@/components/wallet/funding-center";
import { fetchStatus } from "@/lib/api-client";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import { shortWallet } from "@/lib/solana-client";
import { isPreviewHost } from "@/lib/env-hints";
import { toast } from "@/hooks/use-toast";
import { Check, ChevronDown, Copy, FlaskConical } from "lucide-react";

/**
 * Connection-lifecycle errors are surfaced as toasts here. Trading/signing
 * errors are intentionally excluded — the trade flow UI surfaces those inline,
 * and double-reporting would be confusing.
 */
function isConnectionLifecycleError(error: WalletError): boolean {
  return (
    error instanceof WalletConnectionError ||
    error instanceof WalletNotReadyError ||
    error instanceof WalletDisconnectedError ||
    error instanceof WalletTimeoutError ||
    error instanceof WalletWindowBlockedError ||
    error instanceof WalletAccountError
  );
}

function friendlyWalletError(error: WalletError): string {
  const message = (error?.message ?? "").toLowerCase();
  const code = typeof (error as { code?: unknown })?.code === "number" ? (error as unknown as { code: number }).code : undefined;

  if (code === 4001 || message.includes("user rejected") || message.includes("user denied") || message.includes("declined")) {
    // On preview/sandbox domains, "declined" is usually Phantom's
    // "Request blocked" screen rather than a manual rejection.
    if (isPreviewHost()) {
      return 'Request declined or blocked \u2014 on preview links, Phantom may show a "Request blocked" screen. Choose "Proceed anyway (unsafe)" in the popup, then retry the connection.';
    }
    return "Connection request was declined in your wallet. Approve it and try again.";
  }
  if (error instanceof WalletWindowBlockedError || message.includes("popup") || message.includes("blocked") || message.includes("failed to open")) {
    return "Your wallet couldn't open its approval window. Allow popups for this site, then try again.";
  }
  if (message.includes("locked") || message.includes("unlock")) {
    return "Your wallet is locked. Unlock it, then try again.";
  }
  if (error instanceof WalletNotReadyError || message.includes("not installed") || message.includes("not found")) {
    return "Wallet not detected. Install the extension, then refresh this page.";
  }
  if (error instanceof WalletTimeoutError || message.includes("timed out") || message.includes("timeout")) {
    return "The wallet took too long to respond. Please try again.";
  }
  if (error instanceof WalletDisconnectedError || message.includes("disconnected")) {
    return "The wallet disconnected unexpectedly. Please reconnect.";
  }
  if (message.includes("metamask")) {
    return "MetaMask couldn't complete the Solana request. Make sure MetaMask is up to date and has a Solana account (Accounts → Add account → Solana), then try again.";
  }
  return "Couldn't connect to your wallet. Make sure the extension is installed and unlocked, then try again.";
}

function IdentitySync() {
  const { publicKey, connected, wallet } = useWallet();
  const setIdentity = useAppStore((s) => s.setIdentity);

  useEffect(() => {
    if (connected && publicKey) {
      setIdentity(publicKey.toBase58());
    } else {
      setIdentity(null);
    }
  }, [connected, publicKey, setIdentity]);

  useEffect(() => {
    // keep wallet name for debug only
    void wallet;
  }, [wallet]);

  return null;
}

/**
 * Mirrors the reactive ["config"] query into the zustand store so components
 * that read `status` from the store (CreateWizard, DiscoverView) re-resolve
 * immediately after an environment switch instead of holding a stale mode.
 */
function ConfigSync() {
  const { data } = useQuery({ queryKey: ["config"], queryFn: fetchStatus, staleTime: 60_000 });
  const setStatus = useAppStore((s) => s.setStatus);
  useEffect(() => {
    if (data) setStatus(data);
  }, [data, setStatus]);
  return null;
}

export function WalletConnectButton() {
  const { publicKey, connected, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  if (connected && publicKey) {
    return <WalletStatusCard address={publicKey.toBase58()} onDisconnect={() => disconnect().catch(() => undefined)} />;
  }

  return (
    <button
      onClick={() => setVisible(true)}
      className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
    >
      {connecting ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}

/**
 * Connected-wallet status card (spec §18): address, environment line, REAL
 * balances (live mode only — nothing is simulated), and one-click access to
 * the Testing & Funding center + disconnect. Closes on outside click/Escape.
 */
function WalletStatusCard({ address, onDisconnect }: { address: string; onDisconnect: () => void }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { wallet } = useWallet();
  const { setVisible: setCenterVisible } = useTestingCenter();
  const { env } = useAppMode();
  const balances = useBalances(address, env);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const copy = useCallback(() => {
    try {
      void navigator.clipboard?.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }, [address]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Wallet status"
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-sm transition-colors hover:bg-white/[0.08]"
      >
        <span className="size-1.5 rounded-full bg-emerald-400 pr-live-dot" />
        <span className="font-mono text-[13px] text-zinc-200">{shortWallet(address)}</span>
        <ChevronDown className={`size-3.5 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="fixed inset-x-4 top-[4.5rem] z-50 rounded-2xl border border-white/10 bg-zinc-900 p-4 shadow-2xl shadow-black/60 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold text-zinc-100">{wallet?.adapter.name ?? "Wallet"}</p>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${
                env.tone === "live"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                  : "border-amber-400/30 bg-amber-400/10 text-amber-300"
              }`}
            >
              {env.tone === "live" ? <span className="size-1.5 rounded-full bg-emerald-400" /> : <FlaskConical className="size-2.5" />}
              {env.chip}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="truncate font-mono text-[11.5px] text-zinc-500">{address}</span>
            <button
              onClick={copy}
              aria-label="Copy address"
              className="shrink-0 rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
            >
              {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
            </button>
          </div>

          {env.realFunds ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">SOL</p>
                <p className="font-mono text-[14px] font-semibold text-zinc-100">
                  {balances.isLoading ? "…" : (balances.data?.sol ?? "—")}
                </p>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">USDC</p>
                <p className="font-mono text-[14px] font-semibold text-zinc-100">
                  {balances.isLoading ? "…" : (balances.data?.usdc ?? "—")}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11.5px] leading-snug text-zinc-400">
              {env.networkLine}
            </p>
          )}

          <div className="mt-3 flex flex-col gap-2">
            <button
              onClick={() => {
                setOpen(false);
                setCenterVisible(true);
              }}
              className="min-h-[40px] rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-zinc-950 transition hover:bg-zinc-200"
            >
              Testing &amp; Funding
            </button>
            <button
              onClick={() => {
                setOpen(false);
                onDisconnect();
              }}
              className="min-h-[40px] rounded-lg border border-white/10 px-4 py-2 text-[13px] font-medium text-zinc-300 transition hover:bg-white/5 hover:text-zinc-100"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } },
      })
  );

  const rpc = useMemo(() => process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com", []);
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  const handleWalletError = useCallback((error: WalletError) => {
    if (!isConnectionLifecycleError(error)) return;
    toast({
      title: "Wallet connection",
      description: friendlyWalletError(error),
      variant: "destructive",
    });
  }, []);

  return (
    <ConnectionProvider endpoint={rpc}>
      {/*
        autoConnect MUST be enabled: the wallet modal closes as soon as a wallet
        is selected (`select()` then `handleClose()`), and with autoConnect
        disabled nothing would ever call `connect()` — leaving the UI in a
        stagnant "not connected" state. autoConnect triggers the wallet's
        connection request right after the user picks a wallet, and performs a
        silent reconnect for previously-authorized sessions on reload.
      */}
      <WalletProvider wallets={wallets} autoConnect onError={handleWalletError}>
        {/*
          QueryClientProvider must wrap WalletModalProvider: the custom wallet
          modal renders inside the latter and uses useQuery for the mode chip.
        */}
        <QueryClientProvider client={queryClient}>
          <WalletModalProvider>
            <TestingCenterProvider>
              <IdentitySync />
              <ConfigSync />
              {children}
              <TestingCenterModal />
            </TestingCenterProvider>
          </WalletModalProvider>
        </QueryClientProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
