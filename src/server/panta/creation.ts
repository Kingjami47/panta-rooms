/**
 * Market creation — quote → build → (wallet signs + broadcasts client-side) → register.
 * Also: Cloudinary image-upload helper (POST /markets/create/image-upload/).
 *
 * Amounts are USDC base units as integer strings (6 decimals) — e.g. "50000000" = 50 USDC.
 * `startTime` must be ≥ on-chain minimumStartDelay (typically 3600s) ahead for standard markets.
 */
import { pantaCall } from "./client";
import type {
  CreateQuoteRequest,
  CreateQuoteResponse,
  CreateBuildResponse,
  CreateRegisterResponse,
} from "./types";

export async function quoteMarketCreation(req: CreateQuoteRequest): Promise<CreateQuoteResponse> {
  return pantaCall<CreateQuoteResponse>("markets/create/quote/", { method: "POST", body: req, timeoutMs: 45_000 });
}

export async function buildMarketCreation(createId: string, wallet: string): Promise<CreateBuildResponse> {
  return pantaCall<CreateBuildResponse>("markets/create/build/", {
    method: "POST",
    body: { createId, wallet },
    timeoutMs: 45_000,
  });
}

export async function registerMarket(createId: string, signature: string): Promise<CreateRegisterResponse> {
  return pantaCall<CreateRegisterResponse>("markets/register/", {
    method: "POST",
    body: { createId, signature },
    timeoutMs: 60_000,
  });
}

export interface ImageUploadSession {
  uploadUrl: string;
  publicId: string;
  expiresAt: string;
  fields: Record<string, string>;
}

export async function requestImageUpload(): Promise<ImageUploadSession> {
  return pantaCall<ImageUploadSession>("markets/create/image-upload/", { method: "POST", body: {}, timeoutMs: 30_000 });
}

/** List markets created through this API account (createdBy=me). */
export async function listMyCreatedMarkets() {
  const res = await pantaCall<{ items: import("./types").MarketListRow[]; nextCursor: string | null }>(
    "markets/?createdBy=me&limit=50",
    { retries: 1 }
  );
  return res.items ?? [];
}
