"use client";

/**
 * Environment hints for the wallet UX.
 *
 * Phantom (and some other wallets) run a domain-reputation / phishing check
 * before showing signing prompts. Fresh sandbox or preview links — e.g. the
 * "preview-chat-<id>.space-z.ai" URLs used for app previews — have zero
 * reputation, so Phantom can show its "Request blocked — This dApp could be
 * malicious" screen even though the dApp is the user's own app. The user can
 * continue with "Proceed anyway (unsafe)".
 *
 * This module detects such hosts so the UI can:
 *   1. explain the wallet warning BEFORE the popup appears (proactive banner),
 *   2. map the resulting rejection to an accurate, actionable message.
 */

export type HostKind = "local" | "preview" | "production";

const PREVIEW_HOST_PATTERNS: RegExp[] = [
  /^preview-/, // preview-chat-<id>.space-z.ai style links
  /\.space-z\.ai$/, // the sandbox host itself
  /\.vercel\.app$/,
  /\.netlify\.app$/,
  /\.pages\.dev$/,
  /\.fly\.dev$/,
  /\.onrender\.com$/,
  /\.replit\.app$/,
  /\.glitch\.me$/,
];

/** Classify a hostname. Pure — safe to unit-test. */
export function hostKindFrom(hostname: string): HostKind {
  const h = hostname.toLowerCase().trim();
  if (!h) return "production";
  if (h === "localhost" || h === "0.0.0.0" || h === "::1" || h === "[::1]") return "local";
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return "preview"; // raw IP host
  if (PREVIEW_HOST_PATTERNS.some((re) => re.test(h))) return "preview";
  return "production";
}

/** True when the app runs on a preview/sandbox host where wallets may warn. */
export function isPreviewHost(): boolean {
  if (typeof window === "undefined") return false;
  return hostKindFrom(window.location.hostname) === "preview";
}

/**
 * Messages for the Phantom "Request blocked" scenario on preview hosts.
 * Honest + actionable (spec §19 tone): what happened, what to do, why it is safe here.
 */
export const PREVIEW_WALLET_NOTICE =
  'Preview link: wallets like Phantom show a "Request blocked" warning on preview domains they don\u2019t know yet. If the popup appears, choose "Proceed anyway (unsafe)" to continue \u2014 this is your own app on a preview link, and your wallet only ever signs this app\u2019s own transaction.';

export const WALLET_BLOCKED_MESSAGE =
  'Phantom blocked or declined the signing popup \u2014 this happens on preview/sandbox domains. In the Phantom popup choose "Proceed anyway (unsafe)", then try again. If you declined it yourself, nothing was sent \u2014 no transaction left your wallet.';

/** Error strings produced when the user closes Phantom's block screen. */
const BLOCKED_ERROR_PATTERNS = [
  "user rejected",
  "user denied",
  "declined",
  "blocked",
  "malicious",
  "phishing",
  "unapproved",
  "not approved",
  "security",
];

/**
 * True when a wallet error is consistent with Phantom's "Request blocked"
 * screen (or a manual decline) — only meaningful combined with isPreviewHost().
 */
export function looksLikeBlockedWalletError(message: string): boolean {
  const m = (message ?? "").toLowerCase();
  return BLOCKED_ERROR_PATTERNS.some((p) => m.includes(p));
}
