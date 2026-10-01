/**
 * Normalizers for Panta catalog rows.
 * Handles quirks verified live on 2026-09-21:
 * - List rows may carry title: "" → fall back to description, then a clean id label.
 * - Live timestamps are unix seconds (number); sandbox fixtures return ISO strings.
 * - Resolved outcome is not an explicit field on detail: infer from yesPrice/noPrice.
 */

import type { MarketDetail, MarketListRow } from "./types";

export function toUnix(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value > 1e12 ? Math.floor(value / 1000) : Math.floor(value);
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : Math.floor(t / 1000);
}

export function displayTitle(row: Pick<MarketListRow, "title" | "description" | "marketId"> & { question?: string }): string {
  const t = (row.title || "").trim();
  if (t) return t;
  // Detail rows carry a dedicated `question` field (verified 2026-09-27) that is
  // populated even when title is "" — use it before falling back further.
  const q = (row.question || "").trim();
  if (q) return q;
  const d = (row.description || "").trim();
  if (d) return d;
  return `Market ${row.marketId.slice(0, 8)}…`;
}

export function displayDescription(row: Pick<MarketListRow, "title" | "description">): string | null {
  const t = (row.title || "").trim();
  const d = (row.description || "").trim();
  if (t && d && t !== d) return d;
  return null;
}

/**
 * Infer resolved outcome:
 *   yesPrice ≈ 1 / noPrice ≈ 0 → YES won; reverse → NO.
 * Positions rows carry an explicit `outcome` — prefer that when available.
 */
export function inferOutcome(row: { resolved?: boolean; phase?: string; yesPrice?: string | null; noPrice?: string | null }): "yes" | "no" | null {
  const yes = Number(row.yesPrice ?? NaN);
  const no = Number(row.noPrice ?? NaN);
  if (Number.isFinite(yes) && Number.isFinite(no)) {
    if (yes >= 0.999) return "yes";
    if (no >= 0.999) return "no";
    if (yes <= 0.001) return "no";
    if (no <= 0.001) return "yes";
  }
  return null;
}

export function normalizeMoney(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function priceCents(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export interface CardView {
  marketId: string;
  title: string;
  description: string | null;
  category: string;
  phase: MarketListRow["phase"];
  resolved: boolean;
  outcome: "yes" | "no" | null;
  yesCents: number | null;
  noCents: number | null;
  volumeUsdc: string | null;
  image: string | null;
  endTime: number | null;
  resolutionTime: number | null;
  creatorAddress: string | null;
  resolutionRule: string | null;
  /** Explicitly false only when Panta's card says so — absent/null = unknown. */
  onChain?: boolean | null;
}

export function toCardView(row: MarketDetail): CardView {
  const resolved = Boolean(row.resolved || row.phase === "resolved");
  const outcome = inferOutcome(row);
  let yesCents = priceCents(row.yesPrice);
  let noCents = priceCents(row.noPrice);
  // Resolved markets: spot prices can be stale/partial — settle the display
  // to 100/0 per the outcome (docs: win ≈ 1 USDC/share, lose = 0).
  if (resolved && outcome) {
    yesCents = outcome === "yes" ? 100 : 0;
    noCents = outcome === "no" ? 100 : 0;
  }
  return {
    marketId: row.marketId,
    title: displayTitle(row),
    description: displayDescription(row),
    category: (row.category || "other").toLowerCase(),
    phase: row.phase,
    resolved,
    outcome,
    yesCents,
    noCents,
    volumeUsdc: normalizeMoney(row.volumeUsdc),
    image: row.images?.[0] || null,
    endTime: toUnix(row.endTime),
    resolutionTime: toUnix(row.resolutionTime),
    creatorAddress: (row as MarketDetail).creatorAddress ?? null,
    resolutionRule: (row as MarketDetail).resolutionRule ?? null,
    onChain: typeof row.onChain === "boolean" ? row.onChain : null,
  };
}
