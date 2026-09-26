/**
 * Panta API types — mirrors shapes verified against live API on 2026-09-21.
 * Docs: https://docs.panta.market/api-reference/*
 */

export type MarketPhase = "primary" | "secondary" | "resolved" | "cancelled";

export interface MarketListRow {
  marketId: string;
  category: string;
  /** Live list rows may return "" — fall back to description (verified live). */
  title: string;
  description: string;
  images: string[];
  phase: MarketPhase;
  marketType: "standard" | "breaking";
  /** Live returns unix seconds (number); sandbox returns ISO strings. Normalized on read. */
  startTime: number | string;
  endTime: number | string;
  resolutionTime: number | string;
  region: string;
  resolved: boolean;
  status: string;
  volumeUsdc: string;
  campaignId: string | null;
  createdByPartner?: boolean;
  yesPrice?: string | null;
  noPrice?: string | null;
  primaryYesPrice?: string | null;
  primaryNoPrice?: string | null;
  secondaryYesPrice?: string | null;
  secondaryNoPrice?: string | null;
}

export interface MarketDetail extends MarketListRow {
  creatorAddress?: string;
  oracle?: string;
  volumeUsdcBase?: string;
  totalVolumeUsdc?: string;
  totalVolumeUsdcBase?: string;
  priceSource?: string;
  valuationStatus?: string;
  resolvedAt?: number | string | null;
  resolutionRule?: string;
  isResolved?: boolean;
  isGraduated?: boolean;
  creationFee?: number;
}

export interface MarketTradesResponse {
  marketId: string;
  items: TradeRow[];
}

export interface TradeRow {
  id: string | number;
  marketId: string;
  wallet: string;
  isPrimary: boolean;
  yesAmount: number | string;
  noAmount: number | string;
  feePaid: number | string;
  blockTime: number | null;
  signature: string;
  quoteAsset: string;
  /** present on live rows (verified) */
  kind?: string;
  side?: string;
  shares?: string;
  sharesBase?: string;
}

export interface CategoriesResponse {
  categories: string[];
}

// ---- Market creation ----

export interface CreateQuoteRequest {
  wallet: string;
  question: string;
  resolutionRule: string;
  sourcesOfTruth: string[];
  category: string;
  startTime: number;
  endTime: number;
  resolutionTime: number;
  marketType?: "standard" | "breaking";
  title?: string;
  description?: string;
  imageUrl: string;
  region?: string;
  oracle?: string;
  eventInProgress?: boolean;
}

export interface CreateQuoteResponse {
  createId: string;
  expectedEventPda: string;
  paymentUsdc: string; // base units (6 decimals)
  liquidityInjectionUsdc: string;
  platformRevenueUsdc: string;
  marketType: string;
  expiresAt: string;
  blockhashExpiryHintSec?: number;
}

export interface CreateBuildResponse {
  createId: string;
  expectedEventPda: string;
  transaction: string; // base64 unsigned VersionedTransaction
  recentBlockhash: string;
  lastValidBlockHeight: number;
  blockhashExpiryHintSec?: number;
  buildFingerprint: string;
  paymentUsdc: string;
  derived?: Record<string, string>;
  expiresAt: string;
}

export interface CreateRegisterResponse {
  createId: string;
  marketId: string;
  status: string;
  signature: string;
  category: string;
  title: string;
  images: string[];
}

// ---- Primary buy (trading) ----

export interface PrimaryQuoteRequest {
  wallet: string;
  marketId: string;
  side: "yes" | "no";
  amountUsdc: string;
  userId?: string;
}

export interface PrimaryQuoteResponse {
  quoteId: string;
  marketId: string;
  side: string;
  amountUsdc: string;
  shares: string;
  avgPrice: string;
  feeUsdc: string;
  expiresAt: string;
  blockhashExpiryHintSec?: number;
}

export interface BuiltInstruction {
  programId: string;
  data: string; // base64
  accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
}

export interface PrimaryBuildResponse {
  orderId: string;
  quoteId: string;
  wallet: string;
  marketId: string;
  side: string;
  amountUsdc: string;
  expectedShares: string;
  feeUsdc: string;
  status: string;
  instructions: BuiltInstruction[];
  derived?: Record<string, string>;
  recentBlockhash: string;
  lastValidBlockHeight: number;
  expiresAt: string;
  blockhashExpiryHintSec?: number;
}

export interface PrimarySubmitResponse {
  orderId: string;
  status: string;
  signature: string;
}

export interface PrimaryVerifyResponse {
  orderId: string;
  status: "built" | "submitted" | "confirmed" | "failed" | "expired";
  signature?: string;
  marketId?: string;
  side?: string;
  amountUsdc?: number;
}

// ---- Positions ----

export interface PositionRow {
  marketId: string;
  category: string | null;
  side: "yes" | "no";
  shares: string;
  phase: MarketPhase;
  claimable: boolean;
  claimed: boolean;
  outcome: string | null;
}

export interface PositionsResponse {
  wallet: string;
  positions: PositionRow[];
}

// ---- Claims ----

export interface WinClaimBuildResponse {
  wallet: string;
  marketId: string;
  outcome: string;
  winningShares: string;
  instructions: BuiltInstruction[];
  derived?: Record<string, string>;
  recentBlockhash: string;
  lastValidBlockHeight: number;
}

export interface CreatorFeesBuildResponse {
  wallet: string;
  marketId: string;
  claimableFeesUsdc: string; // base units
  instructions: BuiltInstruction[];
  derived?: Record<string, string>;
  recentBlockhash: string;
  lastValidBlockHeight: number;
}

// ---- Attribution ----

export interface ReportTradeRequest {
  signature: string;
  wallet: string;
  marketId: string;
  quoteId?: string;
  clientOrderId?: string;
  userId?: string;
}

export interface ReportTradeResponse {
  signature: string;
  status: string;
  marketId: string;
  wallet: string;
  side?: string;
  kind?: string;
}
