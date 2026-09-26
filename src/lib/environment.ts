/**
 * Environment truth model — single source of truth for client + server.
 *
 * Every statement here was verified against primary sources (2026-09-22):
 *
 *  1. Panta LIVE keys → Solana MAINNET. The 39-page docs.panta.market corpus
 *     describes exactly one chain environment: production USDC markets,
 *     broadcast by the integrator on "your RPC". Verified live: creation fee
 *     paymentUsdc = "50000000" (50 USDC, 6 decimals), ~2% protocol trade fee.
 *  2. Panta TEST keys → SANDBOX FIXTURES, NOT a blockchain. Panta's own
 *     response disclaimer (probed 2026-09-22):
 *       "Test mode: this response uses sandbox fixtures and does not access
 *        Solana mainnet."
 *     expectedEventPda comes back as "TestMarket111…" and build responses are
 *     fixtures that cannot be deserialized into a real transaction.
 *  3. Nowhere in the Panta docs does a devnet/testnet deployment, a faucet, or
 *     a test token exist. Devnet SOL (e.g. faucet.solana.com) therefore CANNOT
 *     be used by this app, and no honest "test USDC" exists for it.
 *
 * Consequence (honesty rules): the UI must never label the sandbox "Devnet" or
 * "Testnet", must never display simulated balances, and must present the
 * zero-cost testing paths (Sandbox fixtures / Demo data) as exactly that —
 * while real blockchain testing happens on mainnet with real funds.
 */

export type EnvMode = "live" | "test" | "demo";

/** Canonical NATIVE USDC mint on Solana mainnet (Circle). Display/lookup only —
 *  overridable via USDC_MINT / NEXT_PUBLIC_USDC_MINT env (see /api/balance).
 *  Shown verbatim in Developer Details so testers can verify it themselves. */
export const USDC_MINT_DEFAULT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/** App-level readiness guidance (documented in the UI, enforced by the app). */
export const SOL_FEE_GUIDE = 0.05; // enough SOL for many transaction fees
export const USDC_TRADE_MIN = 1;   // minimum trade amount enforced by the trade flow
export const CREATE_FEE_USDC = 50; // verified from the live Panta quote (paymentUsdc)

export interface EnvironmentInfo {
  mode: EnvMode;
  /** compact chip text, e.g. "LIVE · MAINNET" */
  chip: string;
  /** long label, e.g. "Live — Solana Mainnet" */
  label: string;
  /** value shown as "Network" */
  network: string;
  /** one-liner under the wallet address in the wallet card */
  networkLine: string;
  /** true when wallet balances are real and meaningful (mainnet) */
  realFunds: boolean;
  /** chip color tone */
  tone: "live" | "testing";
  /** funding-panel intro paragraph */
  summary: string;
  /** honest funding bullets (live mode) */
  fundLines: string[];
  /** shown instead of balances when no funds apply */
  noFundsLine: string;
  /** why devnet faucets do not apply */
  devnetNote: string;
}

const LIVE: EnvironmentInfo = {
  mode: "live",
  chip: "LIVE · MAINNET",
  label: "Live — Solana Mainnet",
  network: "Solana Mainnet (mainnet-beta)",
  networkLine: "Real transactions with real USDC — Panta has no on-chain testnet.",
  realFunds: true,
  tone: "live",
  summary:
    "This environment runs on Solana mainnet. Balances in this panel are read live from the Solana blockchain — nothing here is simulated. Panta provides no test assets: its documentation describes only production markets, and its sandbox is fixture-only, so real blockchain testing uses real funds.",
  fundLines: [
    "USDC — buy inside Phantom (Buy with card), swap SOL → USDC in Phantom's swap, or withdraw from an exchange (Coinbase, Kraken, Binance) to your wallet address.",
    `SOL — about ${SOL_FEE_GUIDE} SOL covers network fees for many transactions; trades themselves cost fractions of a cent plus the USDC you put in.`,
    `Expected costs — minimum trade ${USDC_TRADE_MIN} USDC (plus ~2% protocol fee); creating a market costs ${CREATE_FEE_USDC} USDC (10 USDC of it stays in your market as liquidity).`,
    "Cheapest full test — trade 1–5 USDC on an existing room before creating your own market.",
    "There is no legitimate faucet for mainnet funds. Never enter your seed phrase on a site promising free mainnet money.",
  ],
  noFundsLine: "",
  devnetNote:
    "Devnet faucets (e.g. faucet.solana.com) do not apply — devnet SOL/USDC cannot be used on Solana mainnet, and Panta has no devnet deployment.",
};

const SANDBOX: EnvironmentInfo = {
  mode: "test",
  chip: "SANDBOX",
  label: "Panta Sandbox — fixture data",
  network: "No blockchain (Panta sandbox fixtures)",
  networkLine: "Panta serves fixture responses — no Solana cluster, no funds, no real transactions.",
  realFunds: false,
  tone: "testing",
  summary:
    "Panta's sandbox (test API keys) returns fixture data. Panta's own disclaimer: “Test mode: this response uses sandbox fixtures and does not access Solana mainnet.” Nothing in this mode touches a blockchain, so no funds are needed — and real transactions cannot be broadcast.",
  fundLines: [],
  noFundsLine:
    "No funds are needed in this environment — and no balances are shown, because a fixture environment has no chain to hold them. This app never displays simulated wallet balances.",
  devnetNote:
    "Devnet faucets do not apply — the sandbox does not use any Solana cluster at all, so there is nothing to fund.",
};

const DEMO: EnvironmentInfo = {
  mode: "demo",
  chip: "DEMO DATA",
  label: "Demo — simulated data",
  network: "None (simulated application data)",
  networkLine: "Deterministic samples generated by Panta Rooms — no blockchain, no funds.",
  realFunds: false,
  tone: "testing",
  summary:
    "Demo mode serves clearly-labeled sample rooms generated by this app. Nothing touches a blockchain and nothing is real, so the full experience — browse, create, discuss, trade — can be tested for free.",
  fundLines: [],
  noFundsLine:
    "No funds are needed in this environment — and no balances are shown, because simulated data has no wallet balances. This app never displays simulated wallet balances.",
  devnetNote:
    "Devnet faucets do not apply — demo data is generated locally and never touches a Solana cluster.",
};

export function describeEnvironment(mode: EnvMode | string | undefined | null): EnvironmentInfo {
  if (mode === "test") return SANDBOX;
  if (mode === "demo") return DEMO;
  return LIVE;
}

/** Official, documented funding sources (live mode) — no invented faucets. */
export const FUNDING_LINKS: Array<{ label: string; href: string; note: string }> = [
  {
    label: "Buy or swap in Phantom",
    href: "https://phantom.app/download",
    note: "Phantom's built-in Buy (card) and SOL → USDC swap are the fastest paths for small test amounts.",
  },
  {
    label: "Withdraw from an exchange",
    href: "https://www.circle.com/en/usdc",
    note: "Coinbase / Kraken / Binance let you withdraw USDC on Solana directly to your wallet address.",
  },
];
