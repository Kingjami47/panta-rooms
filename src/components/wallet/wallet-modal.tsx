"use client";

/**
 * Custom wallet-connection modal (replaces @solana/wallet-adapter-react-ui's
 * WalletModal UI while keeping the same context contract, so every existing
 * useWalletModal() call site keeps working).
 *
 * Why custom:
 *  1. MetaMask guidance — MetaMask supports Solana natively (May 2025+) and
 *     registers itself with the Solana Wallet Standard, so it is auto-detected
 *     here the moment the extension has a Solana account. When it is NOT in the
 *     list we show the user exactly how to enable it, instead of a dead end.
 *  2. Test-funds panel — honest, per-mode funding guidance for testers
 *     (demo = free, sandbox = fixtures, live = real mainnet funds; devnet
 *     faucets do NOT apply — see the panel copy for why).
 *
 * Click semantics match the lib (and the Task 4 fix): select(name) then close —
 * WalletProvider autoConnect performs the actual connect(); connection errors
 * surface through the Providers.tsx toast.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import { useQuery } from "@tanstack/react-query";
import { fetchStatus } from "@/lib/api-client";
import { useTestingCenter } from "@/components/wallet/center-context";
import { useMounted } from "@/hooks/use-mounted";

// ---- context (same shape as the lib's useWalletModal) ----

type WalletModalContextShape = { visible: boolean; setVisible: (open: boolean) => void };

const WalletModalContext = createContext<WalletModalContextShape>({ visible: false, setVisible: () => undefined });

export function useWalletModal(): WalletModalContextShape {
  return useContext(WalletModalContext);
}

// ---- per-wallet install hints (shown inline when a wallet is not detected) ----

function installHint(name: string): { title: string; body: string; link?: { label: string; href: string } } {
  const n = name.toLowerCase();
  if (n.includes("metamask")) {
    return {
      title: "MetaMask not detected",
      body: "MetaMask supports Solana natively. Update MetaMask to the latest version, then create a Solana account inside it (Accounts → Add account → Solana). Once the extension has a Solana account, MetaMask appears in this list automatically and can sign for Panta Rooms.",
      link: { label: "Get MetaMask", href: "https://metamask.io/download/" },
    };
  }
  if (n.includes("phantom")) {
    return {
      title: "Phantom not detected",
      body: "Install the Phantom extension, then refresh this page. Phantom is the most tested wallet for Panta Rooms.",
      link: { label: "Get Phantom", href: "https://phantom.app/download" },
    };
  }
  if (n.includes("solflare")) {
    return {
      title: "Solflare not detected",
      body: "Install the Solflare extension, then refresh this page.",
      link: { label: "Get Solflare", href: "https://solflare.com/download" },
    };
  }
  return {
    title: `${name} not detected`,
    body: "Install this wallet's extension and make sure it supports Solana, then refresh this page.",
  };
}

// ---- test-funds panel ----

function TestFundsPanel() {
  const { data: status } = useQuery({
    queryKey: ["config"],
    queryFn: fetchStatus,
    staleTime: 60_000,
  });

  const mode = status?.mode ?? "live";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-[13px] leading-relaxed text-zinc-300">
      <p className="font-semibold text-zinc-100">Where to get funds for testing</p>
      {mode === "live" ? (
        <div className="mt-2 space-y-2 text-zinc-400">
          <p>
            <span className="font-medium text-amber-300">This app runs on Solana mainnet — there is no testnet faucet for it.</span>{" "}
            Creation quotes a real fee of <span className="font-medium text-zinc-200">50 USDC</span> (10 USDC of it stays in
            your market as liquidity), so fund the connected wallet with real assets to test the full flow:
          </p>
          <ul className="ml-4 list-disc space-y-1 marker:text-zinc-600">
            <li>
              <span className="font-medium text-zinc-200">USDC:</span> buy inside Phantom (Buy with card), swap SOL → USDC in
              Phantom&apos;s built-in swap, or withdraw USDC from an exchange (Coinbase, Kraken, Binance) to your wallet address.
            </li>
            <li>
              <span className="font-medium text-zinc-200">SOL:</span> a small amount (~0.05 SOL) covers network fees for many
              trades — trades themselves cost fractions of a cent plus the USDC you put in.
            </li>
            <li>
              <span className="font-medium text-zinc-200">Cheapest full test:</span> trade on an existing market first (Trade
              YES/NO with 1–5 USDC) before creating your own market.
            </li>
          </ul>
          <p>
            Devnet faucets (faucet.solana.com, faucet.circle.com) <span className="font-medium text-zinc-200">do not apply</span>{" "}
            here — Panta has no devnet deployment, so devnet SOL/USDC cannot be used by this app.
          </p>
        </div>
      ) : mode === "test" ? (
        <p className="mt-2 text-zinc-400">
          Sandbox mode is on: Panta serves fixture data and never touches a Solana cluster, so no funds are needed — and real
          transactions cannot be broadcast. For a fully simulated room (create, discuss, trade) with zero setup, use{" "}
          <span className="font-medium text-zinc-200">Demo mode</span> in the Create flow.
        </p>
      ) : (
        <p className="mt-2 text-zinc-400">
          Demo mode is on: rooms are simulated locally and clearly labeled, so <span className="font-medium text-zinc-200">no
          wallet funds are needed</span> for any action.
        </p>
      )}
    </div>
  );
}

// ---- modal ----

/** Hands off to the full Testing & Funding center (balances, checklist, help). */
function OpenFundingCenterButton({ onOpen }: { onOpen: () => void }) {
  const { setVisible: setCenterVisible } = useTestingCenter();
  return (
    <button
      onClick={() => {
        onOpen();
        setCenterVisible(true);
      }}
      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-left text-[13px] font-medium text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.08]"
    >
      Testing &amp; Funding — balances, checklist &amp; how testing works →
    </button>
  );
}

function ModalBody() {
  const { visible, setVisible } = useWalletModal();
  const { wallets, select, connecting, wallet: activeWallet } = useWallet();
  const [note, setNote] = useState<ReturnType<typeof installHint> | null>(null);
  const [showFunds, setShowFunds] = useState(false);
  const mounted = useMounted();
  const [imgFailed, setImgFailed] = useState<Record<string, boolean>>({});

  const { detected, others } = useMemo(() => {
    const detected: typeof wallets = [];
    const others: typeof wallets = [];
    for (const w of wallets) {
      if (w.readyState === WalletReadyState.Installed) detected.push(w);
      else others.push(w);
    }
    const byName = (a: { adapter: { name: string } }, b: { adapter: { name: string } }) =>
      a.adapter.name.localeCompare(b.adapter.name);
    detected.sort(byName);
    others.sort(byName);
    return { detected, others };
  }, [wallets]);

  const metaMaskListed = wallets.some((w) => w.adapter.name.toLowerCase().includes("metamask"));

  const close = useCallback(() => {
    setNote(null); // clear the install hint for the next open (no setState-in-effect)
    setVisible(false);
  }, [setVisible]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, close]);

  const pick = useCallback(
    (name: string, ready: boolean) => {
      if (!ready) {
        setNote(installHint(name));
        return;
      }
      setNote(null);
      select(name as WalletName); // autoConnect performs connect() — see Providers.tsx
      close();
    },
    [select, close]
  );

  if (!mounted) return null;

  const Row = ({ name, icon, ready }: { name: string; icon: string; ready: boolean }) => (
    <button
      onClick={() => pick(name, ready)}
      className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
        ready
          ? "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.08]"
          : "border-transparent bg-transparent opacity-45 hover:opacity-70"
      }`}
    >
      {icon && !imgFailed[name] ? (
        <img src={icon} alt="" className="size-8 rounded-lg" onError={() => setImgFailed((m) => ({ ...m, [name]: true }))} />
      ) : (
        <span className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-zinc-300">
          {name.charAt(0)}
        </span>
      )}
      <span className="flex-1 text-[15px] font-medium text-zinc-100">{name}</span>
      {activeWallet?.adapter.name === name ? (
        <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">Current</span>
      ) : ready ? (
        <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">Detected</span>
      ) : (
        <span className="text-[11px] text-zinc-500">Not detected</span>
      )}
    </button>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-zinc-950/80 p-4 backdrop-blur-sm sm:items-center"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Connect a wallet"
    >
      <div
        className="my-auto w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-5 pb-1 pt-5">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Connect a wallet on Solana</h2>
            <p className="mt-0.5 text-[13px] text-zinc-500">
              {connecting ? "Connecting…" : "Wallets are detected automatically — your keys never touch this app."}
            </p>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="max-h-[60vh] space-y-2 overflow-y-auto px-5 py-4">
          {detected.length > 0 && (
            <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {connecting ? "Connecting" : "Available"}
            </p>
          )}
          {detected.map((w) => (
            <Row key={w.adapter.name} name={w.adapter.name} icon={w.adapter.icon} ready />
          ))}
          {others.map((w) => (
            <Row key={w.adapter.name} name={w.adapter.name} icon={w.adapter.icon} ready={false} />
          ))}

          {!metaMaskListed && (
            <div className="rounded-xl border border-sky-400/20 bg-sky-400/[0.06] px-4 py-3 text-[13px] leading-relaxed text-sky-100/90">
              <p className="font-medium text-sky-200">Using MetaMask?</p>
              <p className="mt-1 text-sky-100/70">
                MetaMask supports Solana natively — update it, add a Solana account (Accounts → Add account → Solana), and it
                appears in this list automatically. Nothing else to configure.
              </p>
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-block font-medium text-sky-300 underline-offset-2 hover:underline"
              >
                Get the latest MetaMask →
              </a>
            </div>
          )}

          {note && (
            <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3 text-[13px] leading-relaxed text-amber-100/90">
              <p className="font-medium text-amber-200">{note.title}</p>
              <p className="mt-1 text-amber-100/75">{note.body}</p>
              {note.link && (
                <a
                  href={note.link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 inline-block font-medium text-amber-300 underline-offset-2 hover:underline"
                >
                  {note.link.label} →
                </a>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-white/10 px-5 py-4">
          <OpenFundingCenterButton onOpen={close} />
          <button
            onClick={() => setShowFunds((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg px-1 text-[13px] font-medium text-zinc-300 transition-colors hover:text-zinc-100"
            aria-expanded={showFunds}
          >
            <span>Testing the app? Where to get funds</span>
            <span className={`text-zinc-500 transition-transform ${showFunds ? "rotate-180" : ""}`}>▾</span>
          </button>
          {showFunds && <TestFundsPanel />}
          <p className="text-center text-[11px] text-zinc-600">
            Non-custodial: Panta Rooms never stores keys or seed phrases.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function WalletModalProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const value = useMemo(() => ({ visible, setVisible }), [visible]);

  return (
    <WalletModalContext.Provider value={value}>
      {children}
      {visible && <ModalBody />}
    </WalletModalContext.Provider>
  );
}
