"use client";

/**
 * Client-side Solana helpers (non-custodial, mirrors the official Panta playground):
 * - create flow: base64 unsigned VersionedTransaction → deserialize → wallet signs
 * - buy/claim flows: instruction list + blockhash → compile v0 tx → wallet signs
 * The user's wallet is ALWAYS the signer; we only compile and broadcast.
 */

import { Buffer } from "buffer";
import bs58 from "bs58";
import {
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  type Connection,
  type TransactionSignature,
} from "@solana/web3.js";
import { WALLET_BLOCKED_MESSAGE, isPreviewHost, looksLikeBlockedWalletError } from "@/lib/env-hints";

if (typeof window !== "undefined" && !(window as unknown as { Buffer?: typeof Buffer }).Buffer) {
  (window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
}

export interface BuiltInstruction {
  programId: string;
  data: string;
  accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
}

export function deserializeVersionedTx(base64: string): VersionedTransaction {
  return VersionedTransaction.deserialize(Buffer.from(base64, "base64"));
}

export function instructionsToVersionedTx(
  instructions: BuiltInstruction[],
  feePayer: PublicKey,
  recentBlockhash: string
): VersionedTransaction {
  const ixs = instructions.map(
    (ix) =>
      new TransactionInstruction({
        programId: new PublicKey(ix.programId),
        keys: ix.accounts.map((a) => ({
          pubkey: new PublicKey(a.pubkey),
          isSigner: a.isSigner,
          isWritable: a.isWritable,
        })),
        data: Buffer.from(ix.data, "base64") as unknown as Buffer,
      })
  );
  const message = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash,
    instructions: ixs,
  }).compileToV0Message();
  return new VersionedTransaction(message);
}

/** Broadcast a signed transaction on our RPC and return the signature. */
export async function broadcast(
  connection: Connection,
  signed: VersionedTransaction
): Promise<TransactionSignature> {
  return connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
}

export function shortWallet(addr: string | null | undefined): string {
  if (!addr) return "";
  return addr.length > 10 ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : addr;
}

export function shortSignature(sig: string): string {
  return sig.length > 18 ? `${sig.slice(0, 10)}…${sig.slice(-6)}` : sig;
}

/** Map wallet/broadcast exceptions to friendly codes (spec §19). */
export function walletErrorCode(e: unknown): { code: string; message: string } {
  const msg = e instanceof Error ? e.message : String(e);
  const lower = msg.toLowerCase();

  // Phantom's "Request blocked" screen (preview/sandbox domains) surfaces as a
  // generic rejection or an explicit block error. On preview hosts, give the
  // accurate, actionable message instead of blaming the user.
  if (isPreviewHost() && looksLikeBlockedWalletError(msg)) {
    return { code: "WALLET_BLOCKED", message: WALLET_BLOCKED_MESSAGE };
  }
  if (lower.includes("user rejected") || lower.includes("user denied") || lower.includes("declined")) {
    return { code: "WALLET_REJECTED", message: "Your wallet rejected the transaction. No trade was submitted." };
  }
  if (lower.includes("insufficient") || lower.includes("0x1") /* custom program error: insufficient lamports */) {
    return { code: "INSUFFICIENT_FUNDS", message: "Your wallet does not have enough USDC (plus fees) for this transaction." };
  }
  if (lower.includes("blockhash") || lower.includes("expired")) {
    return { code: "QUOTE_EXPIRED", message: "The transaction timed out before it was confirmed. Please try again." };
  }
  if (lower.includes("transaction failed") || lower.includes("simulation")) {
    return { code: "TX_FAILED", message: "The transaction failed on-chain. No trade was submitted." };
  }
  return { code: "WALLET_ERROR", message: msg || "The wallet transaction could not be completed." };
}

export { bs58 };
