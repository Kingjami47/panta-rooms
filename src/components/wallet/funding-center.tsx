"use client";

/**
 * Testing & Funding Center — the honest, mode-aware testing experience.
 *
 * Ground truth (verified 2026-09-22, see src/lib/environment.ts):
 * - Panta LIVE = Solana mainnet, real USDC → balances here are REAL RPC reads.
 * - Panta SANDBOX = fixture data, no blockchain → no funds apply, none shown.
 * - Panta DEMO = simulated app data → no funds apply, none shown.
 * There is no legitimate faucet for mainnet funds, so the funding section
 * links ONLY official documented paths — it never invents one, never fakes a
 * "funds received" state, and never displays simulated balances (spec §5/§7).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  FlaskConical,
  Info,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import {
  ApiError,
  fetchBalances,
  fetchStatus,
  friendlyMessage,
  setEnvironment,
  type AppEnvMode,
} from "@/lib/api-client";
import {
  CREATE_FEE_USDC,
  SOL_FEE_GUIDE,
  USDC_TRADE_MIN,
  describeEnvironment,
  FUNDING_LINKS,
  type EnvironmentInfo,
} from "@/lib/environment";
import { shortWallet } from "@/lib/solana-client";
import { useAppStore } from "@/store/app-store";
import { useWalletModal } from "@/components/wallet/wallet-modal";
import { useTestingCenter } from "@/components/wallet/center-context";
import { toast } from "@/hooks/use-toast";
import { useMounted } from "@/hooks/use-mounted";

// ---- shared hooks ----

export function useAppMode() {
  const { data } = useQuery({
    queryKey: ["config"],
    queryFn: fetchStatus,
    staleTime: 60_000,
  });
  const mode = data?.mode ?? "live";
  const env = useMemo(() => describeEnvironment(mode), [mode]);
  return { status: data, mode, env };
}

/** REAL balances via server RPC proxy — enabled only where real funds apply. */
export function useBalances(address: string | null | undefined, env: EnvironmentInfo) {
  return useQuery({
    queryKey: ["balances", address ?? null],
    queryFn: () => fetchBalances(address as string),
    enabled: Boolean(address) && env.realFunds,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

// ---- small shared bits ----

function toneClasses(tone: EnvironmentInfo["tone"]) {
  return tone === "live"
    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
    : "border-amber-400/30 bg-amber-400/10 text-amber-300";
}

function CopyButton({ text, label = "Copy address" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    try {
      void navigator.clipboard?.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  }, [text]);
  return (
    <button
      onClick={copy}
      aria-label={label}
      title={label}
      className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
    >
      {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
    </button>
  );
}

// ---- header chip (spec §2/§9: the environment is always visible) ----

export function EnvironmentChip() {
  const mounted = useMounted();
  const { env } = useAppMode();
  const { setVisible } = useTestingCenter();
  if (!mounted) return null;
  return (
    <button
      onClick={() => setVisible(true)}
      title={`${env.label} — click to switch environment or see testing & funding details`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide transition hover:brightness-125 ${toneClasses(env.tone)}`}
    >
      {env.tone === "live" ? (
        <span className="size-1.5 rounded-full bg-emerald-400" />
      ) : (
        <FlaskConical className="size-3" />
      )}
      {env.chip}
    </button>
  );
}

// ---- slim environment banner (spec §9 — subtle, dismissible) ----

const BANNER_KEY = "pr-env-note-v1";

function readBannerDismissed(): boolean {
  try {
    return window.localStorage.getItem(BANNER_KEY) === "1";
  } catch {
    return false;
  }
}

export function EnvironmentBanner() {
  const mounted = useMounted();
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const { mode, env } = useAppMode();
  const { setVisible } = useTestingCenter();

  // MAINNET warnings are NEVER dismissible (spec §7 — the real-money mode must
  // always announce itself). Sandbox/demo notes may be dismissed per device.
  const isLive = mode === "live";
  const isDemo = mode === "demo";
  const isDismissed = mounted && !isLive ? (dismissed ?? readBannerDismissed()) : false;

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      window.localStorage.setItem(BANNER_KEY, "1");
    } catch {
      /* private mode — session-only dismissal */
    }
  }, []);

  if (!mounted || isDismissed) return null;

  // Tone per spec: MAINNET = red (real money warning), DEMO = green (safe),
  // SANDBOX = amber (fixtures).
  const tone = isLive
    ? "border-red-400/30 bg-red-400/[0.08] text-red-200/90"
    : isDemo
      ? "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-200/90"
      : "border-amber-400/25 bg-amber-400/[0.07] text-amber-200/90";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-3 sm:px-6">
      <div className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-[12.5px] leading-snug ${tone}`}>
        {isLive ? (
          <span className="size-2 shrink-0 rounded-full bg-red-400 pr-live-dot" />
        ) : isDemo ? (
          <span className="size-1.5 shrink-0 rounded-full bg-emerald-400" />
        ) : (
          <FlaskConical className="size-3.5 shrink-0 text-amber-300" />
        )}
        <span className="min-w-0 flex-1">
          {isLive ? (
            <>
              <span className="font-semibold">MAINNET</span> — real USDC and SOL are required. Every transaction is
              broadcast to Solana mainnet with real funds. New here? Test the full app in{" "}
              <span className="font-medium">Demo Mode</span> first — no funds needed.
            </>
          ) : isDemo ? (
            <>
              <span className="font-semibold">DEMO MODE</span> — no real funds are used. Every transaction is simulated
              and clearly labeled.
            </>
          ) : (
            <>
              <span className="font-semibold">{env.chip}</span> — {env.networkLine}
            </>
          )}
        </span>
        <button
          onClick={() => setVisible(true)}
          className="hidden shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11.5px] font-medium text-zinc-200 transition hover:bg-white/10 sm:block"
        >
          Testing &amp; Funding
        </button>
        {!isLive && (
          <button
            onClick={dismiss}
            aria-label="Dismiss environment note"
            className="shrink-0 rounded-md p-1 text-zinc-500 transition-colors hover:text-zinc-200"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ---- inline hint for wizard / trade panel (spec §15 easy access) ----

export function FundsHint({ note }: { note?: string }) {
  const mounted = useMounted();
  const { env } = useAppMode();
  const { setVisible } = useTestingCenter();
  if (!mounted || !env.realFunds) return null;
  return (
    <p className="text-[12px] leading-relaxed text-zinc-500">
      {note ?? "Using real funds."}{" "}
      <button
        onClick={() => setVisible(true)}
        className="font-medium text-zinc-300 underline decoration-zinc-600 underline-offset-2 transition hover:text-white"
      >
        Check balances &amp; funding options →
      </button>
    </p>
  );
}

// ---- checklist (spec §8 — dynamic, honest) ----

type CheckItem = { label: string; state: "done" | "todo" | "unknown"; detail?: string };

function useChecklist(env: EnvironmentInfo, connected: boolean, balances: ReturnType<typeof useBalances>): CheckItem[] {
  return useMemo(() => {
    if (!env.realFunds) {
      return [
        { label: "Environment identified", state: "done", detail: env.label },
        { label: "No funds needed", state: "done", detail: "This environment never touches a blockchain" },
        {
          label: connected ? "Ready to test" : "Ready to explore (wallet optional)",
          state: "done",
          detail: env.mode === "test" ? "Fixture responses — nothing is broadcast on-chain" : "Simulated rooms, clearly labeled",
        },
      ];
    }

    const bal = balances.data;
    const solOk = bal ? Number(bal.sol) >= SOL_FEE_GUIDE : null;
    const usdcOk = bal && bal.usdc !== null ? Number(bal.usdc) >= USDC_TRADE_MIN : null;

    return [
      connected
        ? { label: "Wallet connected", state: "done" as const }
        : { label: "Wallet connected", state: "todo" as const, detail: "Connect a Solana wallet to continue" },
      { label: "Environment identified", state: "done" as const, detail: env.label },
      {
        label: `SOL for fees (≥ ${SOL_FEE_GUIDE})`,
        state: !connected ? "todo" : solOk === null ? "unknown" : solOk ? "done" : "todo",
        detail:
          !connected
            ? undefined
            : solOk === null
              ? "Couldn't verify — see the balance error above"
              : solOk
                ? undefined
                : "Cover network fees — see funding options below",
      },
      {
        label: `USDC available (≥ ${USDC_TRADE_MIN} to trade · ${CREATE_FEE_USDC} to create)`,
        state: !connected ? "todo" : usdcOk === null ? "unknown" : usdcOk ? "done" : "todo",
        detail:
          !connected
            ? undefined
            : usdcOk === null
              ? "Couldn't verify — see the balance error above"
              : usdcOk
                ? undefined
                : "Fund with USDC — see funding options below",
      },
      {
        label: "Ready to test",
        state: connected && solOk && usdcOk ? "done" : "todo",
        detail: connected && solOk && usdcOk ? "Trade a small amount (1–5 USDC) on an existing room first" : undefined,
      },
    ];
  }, [env, connected, balances.data]);
}

function Checklist({ items }: { items: CheckItem[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-start gap-2.5 text-[13px]">
          <span
            className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border ${
              item.state === "done"
                ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
                : item.state === "unknown"
                  ? "border-zinc-600 bg-white/[0.04] text-zinc-500"
                  : "border-zinc-700 bg-transparent text-transparent"
            }`}
          >
            {item.state === "done" ? (
              <Check className="size-3" />
            ) : item.state === "unknown" ? (
              <span className="text-[9px] font-bold">?</span>
            ) : (
              <span className="block size-1.5 rounded-full bg-zinc-600" />
            )}
          </span>
          <span className="min-w-0">
            <span className={item.state === "done" ? "font-medium text-zinc-100" : "text-zinc-300"}>{item.label}</span>
            {item.detail && <span className="block text-[12px] leading-snug text-zinc-500">{item.detail}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ---- balances panel (spec §4/§6/§7 — REAL values only) ----

function BalancesPanel({ env }: { env: EnvironmentInfo }) {
  const { publicKey, connected } = useWallet();
  const balances = useBalances(publicKey?.toBase58(), env);
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  if (!env.realFunds) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-[13px] leading-relaxed text-zinc-400">
        <p className="font-semibold text-zinc-100">Balances</p>
        <p className="mt-1.5">{env.noFundsLine}</p>
      </div>
    );
  }

  if (!connected || !publicKey) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-[13px] leading-relaxed text-zinc-400">
        <p className="font-semibold text-zinc-100">Your balances</p>
        <p className="mt-1.5">Connect a wallet to see your real SOL and USDC balances, read live from Solana.</p>
      </div>
    );
  }

  const loading = balances.isFetching && !balances.data;
  const error = balances.error as { message?: string } | null;
  const updated = balances.dataUpdatedAt ? Math.floor((Date.now() - balances.dataUpdatedAt) / 1000) : null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-zinc-100">Your balances</p>
        <button
          onClick={() => void balances.refetch()}
          disabled={balances.isFetching}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[12px] font-medium text-zinc-200 transition hover:bg-white/10 disabled:opacity-50"
        >
          {balances.isFetching ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
          Refresh Balances
        </button>
      </div>

      {loading ? (
        <div className="mt-3 flex items-center gap-2 text-[13px] text-zinc-500">
          <Loader2 className="size-3.5 animate-spin" /> Reading balances from Solana…
        </div>
      ) : error ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-400/25 bg-amber-400/[0.07] px-3 py-2.5 text-[12.5px] leading-relaxed text-amber-200/90">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-300" />
          <span>{error.message || "Couldn't read balances right now. Please try again."}</span>
        </div>
      ) : balances.data ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">SOL</p>
              <p className="mt-0.5 font-mono text-lg font-semibold text-zinc-100">{balances.data.sol}</p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">USDC (native)</p>
              {balances.data.usdc === null ? (
                <p className="mt-1 text-[12.5px] leading-snug text-amber-300">Couldn&apos;t read right now</p>
              ) : (
                <p className="mt-0.5 font-mono text-lg font-semibold text-zinc-100">{balances.data.usdc}</p>
              )}
            </div>
          </div>
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-zinc-500">
            Read live from the Solana RPC ({balances.data.rpcHost}) — never simulated.
            {updated !== null && updated < 60 ? ` Updated ${updated}s ago.` : ""}
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-500">
            Funding a wallet externally? Funds may take a few moments to appear — hit Refresh Balances.
          </p>
        </>
      ) : null}
    </div>
  );
}

// ---- funding section (spec §4/§5 — official paths only, no invented faucets) ----

function FundingSection({ env }: { env: EnvironmentInfo }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-[13px] leading-relaxed text-zinc-400">
      <p className="font-semibold text-zinc-100">Get funds for testing</p>
      <p className="mt-1.5">{env.summary}</p>

      {env.realFunds ? (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {FUNDING_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="group flex min-h-[44px] items-start gap-2.5 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 transition hover:border-white/25 hover:bg-white/[0.08]"
              >
                <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-zinc-500 transition group-hover:text-zinc-300" />
                <span>
                  <span className="block font-medium text-zinc-100">{l.label}</span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-zinc-500">{l.note}</span>
                </span>
              </a>
            ))}
          </div>
          <ul className="mt-3 ml-4 list-disc space-y-1 marker:text-zinc-600">
            {env.fundLines.map((line) => (
              <li key={line.slice(0, 40)}>{line}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-zinc-300">
          Nothing to do here — open any room and try the flow. Demo rooms and sandbox responses are always labeled, and
          no transaction is ever broadcast.
        </p>
      )}

      <p className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-zinc-500">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>{env.devnetNote}</span>
      </p>
    </div>
  );
}

// ---- developer details (spec §21 — small, expandable) ----

function DeveloperDetails({ env, balances }: { env: EnvironmentInfo; balances: ReturnType<typeof useBalances> }) {
  const { publicKey, wallet } = useWallet();
  const { status } = useAppMode();
  const lastTx = useAppStore((s) => s.lastTx);
  const bal = balances.data;

  const rows: Array<[string, React.ReactNode]> = [
    ["Panta environment", `${env.label} (mode: ${status?.mode ?? "?"})`],
    ["Solana network", env.realFunds ? `mainnet-beta · RPC ${bal?.rpcHost ?? "—"}` : env.network],
    ["Wallet", wallet ? `${wallet.adapter.name} · ${publicKey?.toBase58() ?? "—"}` : "not connected"],
    ["SOL balance", bal?.sol ?? "—"],
    ["USDC mint", bal?.usdcMint ?? "—"],
    ["Token balance", bal ? (bal.usdc === null ? "unavailable (lookup failed)" : `${bal.usdc} USDC (raw ${bal.usdcRaw})`) : "—"],
    [
      "Last transaction",
      lastTx ? (
        <a
          href={`https://explorer.solana.com/tx/${lastTx.signature}`}
          target="_blank"
          rel="noreferrer"
          className="break-all text-sky-300 underline-offset-2 hover:underline"
        >
          {lastTx.kind} · {shortWallet(lastTx.signature)} ↗
        </a>
      ) : (
        "none this session"
      ),
    ],
    ["Transaction status", lastTx ? "Broadcast — confirm on the explorer / My Activity" : "—"],
  ];

  return (
    <details className="group rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[12.5px] font-medium text-zinc-400 transition hover:text-zinc-200">
        Developer Details
        <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
      </summary>
      <dl className="mt-3 space-y-2">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[130px_1fr] gap-2 text-[12px] leading-relaxed">
            <dt className="text-zinc-500">{k}</dt>
            <dd className="min-w-0 break-words font-mono text-zinc-300">{v}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

// ---- environment switcher (one-click Live / Sandbox / Demo) ----

const ENV_OPTIONS: Array<{ id: AppEnvMode; title: string; desc: string; icon: "live" | "test" | "demo" }> = [
  {
    id: "live",
    title: "Live — Solana Mainnet",
    desc: "Real USDC, real transactions broadcast on-chain. The production environment.",
    icon: "live",
  },
  {
    id: "test",
    title: "Sandbox — Panta test mode",
    desc: "Panta's official test mode: real API shape, fixture responses, no blockchain, zero funds. Trading and creating run simulated.",
    icon: "test",
  },
  {
    id: "demo",
    title: "Demo — sample data",
    desc: "Sample rooms generated by this app. The full browse · create · discuss · trade experience with zero setup.",
    icon: "demo",
  },
];

export function EnvironmentSwitcher() {
  const mounted = useMounted();
  const { status, mode, env } = useAppMode();
  const queryClient = useQueryClient();
  const [switching, setSwitching] = useState<AppEnvMode | null>(null);

  const apply = useCallback(
    async (next: AppEnvMode) => {
      if (!status || next === mode || switching) return;
      setSwitching(next);
      try {
        await setEnvironment(next);
        // Everything derives from the config query (mode chips, feed, balances,
        // create/trade behavior) — invalidate all so the whole app re-resolves.
        await queryClient.invalidateQueries();
        toast({ title: "Environment switched", description: describeEnvironment(next).label });
      } catch (e) {
        toast({
          title: "Couldn't switch environment",
          description: e instanceof ApiError ? e.friendly : friendlyMessage("NETWORK_ERROR"),
          variant: "destructive",
        });
      } finally {
        setSwitching(null);
      }
    },
    [status, mode, switching, queryClient]
  );

  if (!mounted) return null;

  const available = status?.available ?? { live: true, test: true };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-zinc-100">Environment</p>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${toneClasses(env.tone)}`}>
          {env.tone === "live" ? <span className="size-1.5 rounded-full bg-emerald-400" /> : <FlaskConical className="size-2.5" />}
          {env.chip}
        </span>
      </div>
      <p className="mt-1 text-[12px] leading-snug text-zinc-500">
        Switch any time. Panta has no testnet — the honest choices are real mainnet, Panta&apos;s sandbox fixtures, or
        demo data. Never trust a site offering “testnet funds”.
      </p>
      <div className="mt-3 space-y-2">
        {ENV_OPTIONS.map((opt) => {
          const isCurrent = Boolean(status) && opt.id === mode;
          const unavailable = opt.id === "live" ? !available.live : opt.id === "test" ? !available.test : false;
          const busy = switching === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => void apply(opt.id)}
              disabled={!status || Boolean(switching) || unavailable}
              className={`flex w-full items-start gap-3 rounded-lg border px-3.5 py-2.5 text-left transition ${
                isCurrent
                  ? "border-white/25 bg-white/[0.07]"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
              } ${!status || unavailable ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <span className="mt-0.5 flex w-4 shrink-0 justify-center">
                {busy ? (
                  <Loader2 className="size-4 animate-spin text-zinc-300" />
                ) : opt.icon === "live" ? (
                  <span className="mt-1 block size-2 rounded-full bg-emerald-400" />
                ) : (
                  <FlaskConical className="size-4 text-amber-300" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-medium text-zinc-100">{opt.title}</span>
                  {isCurrent && (
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-px text-[10px] font-bold tracking-wide text-emerald-300">
                      ACTIVE
                    </span>
                  )}
                  {unavailable && (
                    <span className="rounded-full border border-zinc-700 px-1.5 py-px text-[10px] font-medium text-zinc-500">
                      KEYS MISSING
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-zinc-500">
                  {unavailable
                    ? "This environment's Panta API key is not configured on the server right now."
                    : opt.desc}
                </span>
              </span>
              {isCurrent && <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- modal (spec §6) ----

function CenterBody() {
  const { visible, setVisible } = useTestingCenter();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const { publicKey, connected, wallet } = useWallet();
  const { env } = useAppMode();
  const balances = useBalances(publicKey?.toBase58(), env);
  const mounted = useMounted();

  const close = useCallback(() => setVisible(false), [setVisible]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, close]);

  const items = useChecklist(env, connected, balances);

  if (!mounted || !visible) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-zinc-950/80 p-4 backdrop-blur-sm sm:items-center"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Testing and funding"
    >
      <div
        className="my-auto w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 pb-4 pt-5">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Testing &amp; Funding</h2>
            <p className="mt-0.5 text-[13px] text-zinc-500">
              Test the full Panta Rooms experience — clearly separated from real money.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClasses(env.tone)}`}>
              {env.tone === "live" ? <span className="size-1.5 rounded-full bg-emerald-400" /> : <FlaskConical className="size-3" />}
              {env.chip}
            </span>
            <button
              onClick={close}
              aria-label="Close"
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] space-y-3.5 overflow-y-auto px-5 py-4">
          {/* environment switcher (one-click Live / Sandbox / Demo) */}
          <EnvironmentSwitcher />

          {/* wallet card (spec §3/§18) */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
            <p className="text-[13px] font-semibold text-zinc-100">Your wallet</p>
            {connected && publicKey ? (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 break-all font-mono text-[13px] leading-snug text-zinc-200">
                    {publicKey.toBase58()}
                  </span>
                  <CopyButton text={publicKey.toBase58()} />
                </div>
                <p className="mt-1 text-[12px] text-zinc-500">{wallet?.adapter.name}</p>
              </div>
            ) : (
              <p className="mt-1.5 text-[13px] text-zinc-400">
                No wallet connected yet — connect one to see live balances and trade.
              </p>
            )}
            <dl className="mt-3 space-y-1.5 text-[12.5px]">
              <div className="flex items-baseline gap-2">
                <dt className="w-16 shrink-0 text-zinc-500">Network</dt>
                <dd className="text-zinc-200">{env.network}</dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt className="w-16 shrink-0 text-zinc-500">Status</dt>
                <dd className="leading-snug text-zinc-400">{env.networkLine}</dd>
              </div>
            </dl>
            {!connected && (
              <button
                onClick={() => {
                  close();
                  setWalletModalVisible(true);
                }}
                className="mt-3 min-h-[40px] w-full rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-zinc-950 transition hover:bg-zinc-200"
              >
                Connect a wallet
              </button>
            )}
          </div>

          {/* balances (real values only) */}
          <BalancesPanel env={env} />

          {/* checklist */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
            <p className="text-[13px] font-semibold text-zinc-100">Ready to test?</p>
            <div className="mt-2.5">
              <Checklist items={items} />
            </div>
          </div>

          {/* funding */}
          <FundingSection env={env} />

          {/* how it works (spec §16) */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-[13px] leading-relaxed text-zinc-400">
            <p className="font-semibold text-zinc-100">How testing works</p>
            <p className="mt-1.5">
              Panta Rooms runs on the Panta API, which operates on Solana mainnet with real USDC — the Panta docs
              describe no testnet, and Panta&apos;s sandbox is fixture-only. So testing here has two honest paths:
            </p>
            <ol className="mt-2 ml-4 list-decimal space-y-1 marker:text-zinc-600">
              <li>
                <span className="font-medium text-zinc-200">Free, zero setup:</span> switch the Environment above to{" "}
                <span className="font-medium text-zinc-200">Demo</span> or{" "}
                <span className="font-medium text-zinc-200">Sandbox</span> — clearly labeled, no blockchain, no funds.
              </li>
              <li>
                <span className="font-medium text-zinc-200">Real flow:</span> connect a wallet, fund it with a small
                amount of real USDC + {SOL_FEE_GUIDE} SOL, and trade 1–5 USDC on an existing room — every transaction is
                visible in your wallet before you approve it.
              </li>
            </ol>
            <p className="mt-2 font-medium text-zinc-300">Testnet-style assets have no real monetary value — and mainnet funds always do. This app never mixes the two or fakes either.</p>
          </div>

          {/* developer details */}
          <DeveloperDetails env={env} balances={balances} />

          <p className="text-center text-[11px] text-zinc-600">
            Non-custodial: Panta Rooms never asks for keys or seed phrases — you approve every transaction in your
            wallet.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function TestingCenterModal() {
  return <CenterBody />;
}
