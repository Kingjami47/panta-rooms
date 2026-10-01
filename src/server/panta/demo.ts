/**
 * DEMO MODE provider — deterministic sample data.
 *
 * Rules (spec §18):
 * - Used ONLY when the Panta API is unreachable or no key is configured.
 * - Every payload is tagged `demo: true` so the UI renders a DEMO DATA banner.
 * - No fabricated transaction hashes, balances, or "confirmed" flows.
 * - Deterministic: same seed → same rows, stable across reloads.
 */

import type { CardView } from "./normalize";

const DAY = 86_400;
const NOW = () => Math.floor(Date.now() / 1000);

const CATEGORY_COVER: Record<string, string> = {
  sports: "/covers/sports.svg",
  crypto: "/covers/crypto.svg",
  politics: "/covers/politics.svg",
  entertainment: "/covers/entertainment.svg",
  finance: "/covers/finance.svg",
  science: "/covers/science.svg",
  world: "/covers/world.svg",
  other: "/covers/other.svg",
};

export function demoCover(category: string): string {
  return CATEGORY_COVER[category] ?? CATEGORY_COVER.other;
}

interface DemoSeed {
  id: string;
  title: string;
  category: string;
  yesCents: number;
  volume: string;
  daysToEnd: number;
  phase: "primary" | "resolved";
  outcome?: "yes" | "no";
}

const SEEDS: DemoSeed[] = [
  { id: "demo-bitcoin-120k", title: "Will Bitcoin close above $120,000 before October 31?", category: "crypto", yesCents: 62, volume: "48,210", daysToEnd: 40, phase: "primary" },
  { id: "demo-arsenal-next", title: "Will Arsenal win their next Premier League match?", category: "sports", yesCents: 54, volume: "12,480", daysToEnd: 6, phase: "primary" },
  { id: "demo-fed-cut", title: "Will the Fed announce a rate cut at their next meeting?", category: "finance", yesCents: 71, volume: "96,102", daysToEnd: 21, phase: "primary" },
  { id: "demo-grammy", title: "Will a debut album win Album of the Year this season?", category: "entertainment", yesCents: 33, volume: "7,940", daysToEnd: 90, phase: "primary" },
  { id: "demo-launch", title: "Will the next Starship orbital test launch succeed on first attempt?", category: "science", yesCents: 45, volume: "22,315", daysToEnd: 30, phase: "primary" },
  { id: "demo-election", title: "Will the incumbent mayor win the next city election?", category: "politics", yesCents: 58, volume: "31,004", daysToEnd: 60, phase: "primary" },
  { id: "demo-eth-5k", title: "Will ETH trade above $5,000 at any point this quarter?", category: "crypto", yesCents: 39, volume: "64,772", daysToEnd: 45, phase: "primary" },
  { id: "demo-worldcup", title: "Will the host nation reach the semifinals of the next tournament?", category: "sports", yesCents: 47, volume: "18,223", daysToEnd: 120, phase: "primary" },
  { id: "demo-gpt-release", title: "Will a new frontier model top the main benchmark before December?", category: "other", yesCents: 66, volume: "9,508", daysToEnd: 70, phase: "primary" },
  { id: "demo-climate", title: "Will global average temperature set a new record this year?", category: "world", yesCents: 52, volume: "5,610", daysToEnd: 100, phase: "primary" },
  { id: "demo-summit", title: "Will the next global summit adopt a binding emissions target?", category: "world", yesCents: 28, volume: "11,372", daysToEnd: 55, phase: "primary" },
  { id: "demo-resolved-1", title: "Did the central bank hold rates at the last meeting?", category: "finance", yesCents: 0, volume: "44,120", daysToEnd: -3, phase: "resolved", outcome: "yes" },
  { id: "demo-resolved-2", title: "Did the featured fighter win the main event by knockout?", category: "sports", yesCents: 0, volume: "27,930", daysToEnd: -7, phase: "resolved", outcome: "no" },
  { id: "demo-resolved-3", title: "Did total crypto market cap close above $3 trillion last quarter?", category: "crypto", yesCents: 0, volume: "61,405", daysToEnd: -5, phase: "resolved", outcome: "yes" },
  { id: "demo-resolved-4", title: "Did the incumbent party win the national election?", category: "politics", yesCents: 0, volume: "88,240", daysToEnd: -12, phase: "resolved", outcome: "no" },
  { id: "demo-resolved-5", title: "Did the sequel outsell the original's opening weekend?", category: "entertainment", yesCents: 0, volume: "19,860", daysToEnd: -9, phase: "resolved", outcome: "yes" },
];

export function demoCards(category?: string): CardView[] {
  const now = NOW();
  let cards = SEEDS.map((s): CardView => ({
    marketId: s.id,
    title: s.title,
    description: "Sample market in DEMO MODE — nothing here is real. Switch the environment to Live to browse Panta's actual catalog.",
    category: s.category,
    phase: s.phase,
    resolved: s.phase === "resolved",
    outcome: s.outcome ?? null,
    yesCents: s.phase === "resolved" ? (s.outcome === "yes" ? 100 : 0) : s.yesCents,
    noCents: s.phase === "resolved" ? (s.outcome === "no" ? 100 : 0) : 100 - s.yesCents,
    volumeUsdc: s.volume,
    image: demoCover(s.category),
    endTime: now + s.daysToEnd * DAY,
    resolutionTime: now + (s.daysToEnd + 1) * DAY,
    creatorAddress: null,
    resolutionRule: "DEMO MODE sample rule — resolves per the stated public source.",
  }));
  if (category && category !== "all") cards = cards.filter((c) => c.category === category);
  return cards;
}

export function demoCard(marketId: string): CardView | null {
  return demoCards().find((c) => c.marketId === marketId) ?? null;
}

/** Deterministic pseudo-trades for demo Rooms (labeled DEMO in the UI). */
export function demoTape(marketId: string, limit = 8) {
  const now = NOW();
  let hash = 0;
  for (const ch of marketId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const wallets = ["DemoWallet…7f3a", "DemoWallet…k29c", "DemoWallet…q81m", "DemoWallet…b44d"];
  const rows = Array.from({ length: Math.min(limit, 8) }, (_, i) => {
    const side = (hash + i) % 2 === 0 ? "yes" : "no";
    const shares = 5 + ((hash + i * 13) % 60);
    return {
      id: `${marketId}-demo-${i}`,
      marketId,
      wallet: wallets[(hash + i) % wallets.length],
      isPrimary: true,
      yesAmount: side === "yes" ? shares : 0,
      noAmount: side === "no" ? shares : 0,
      feePaid: 0,
      blockTime: now - (i + 1) * 900 - ((hash + i) % 600),
      signature: "",
      quoteAsset: "USDC",
      kind: "buy",
      side,
      shares: String(shares),
      demo: true,
    };
  });
  return rows;
}
