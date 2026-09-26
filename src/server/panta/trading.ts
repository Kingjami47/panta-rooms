/**
 * Primary buy (trading) — quote → build → sign+broadcast (client wallet) → submit → verify.
 * Buy amounts are human-readable decimal USDC strings, e.g. "20.00".
 * Build returns INSTRUCTIONS (not a full tx) — the client compiles a v0 transaction.
 */
import { pantaCall } from "./client";
import type {
  PrimaryQuoteRequest,
  PrimaryQuoteResponse,
  PrimaryBuildResponse,
  PrimarySubmitResponse,
  PrimaryVerifyResponse,
} from "./types";

export async function quotePrimaryBuy(req: PrimaryQuoteRequest): Promise<PrimaryQuoteResponse> {
  return pantaCall<PrimaryQuoteResponse>("primaryorderquote/", { method: "POST", body: req, timeoutMs: 45_000 });
}

export async function buildPrimaryBuy(params: {
  quoteId: string;
  wallet: string;
  userId?: string;
  maxSlippageBps?: number;
}): Promise<PrimaryBuildResponse> {
  return pantaCall<PrimaryBuildResponse>("primaryorderbuild/", {
    method: "POST",
    body: {
      quoteId: params.quoteId,
      wallet: params.wallet,
      ...(params.userId ? { userId: params.userId } : {}),
      maxSlippageBps: params.maxSlippageBps ?? 100,
    },
    timeoutMs: 45_000,
  });
}

export async function submitPrimaryBuy(orderId: string, signature: string, wallet: string): Promise<PrimarySubmitResponse> {
  return pantaCall<PrimarySubmitResponse>("primaryordersubmit/", {
    method: "POST",
    body: { orderId, signature, wallet },
    timeoutMs: 30_000,
  });
}

export async function verifyPrimaryBuy(orderId: string, signature?: string, wallet?: string): Promise<PrimaryVerifyResponse> {
  return pantaCall<PrimaryVerifyResponse>("primaryorderverify/", {
    method: "POST",
    body: { orderId, ...(signature ? { signature } : {}), ...(wallet ? { wallet } : {}) },
    timeoutMs: 30_000,
  });
}
