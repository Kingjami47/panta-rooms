// Pure-logic checks extracted from src/lib/env-hints.ts (mirrored for node testing)
export function hostKindFrom(hostname) {
  const PREVIEW_HOST_PATTERNS = [
    /^preview-/,
    /\.space-z\.ai$/,
    /\.vercel\.app$/,
    /\.netlify\.app$/,
    /\.pages\.dev$/,
    /\.fly\.dev$/,
    /\.onrender\.com$/,
    /\.replit\.app$/,
    /\.glitch\.me$/,
  ];
  const h = hostname.toLowerCase().trim();
  if (!h) return "production";
  if (h === "localhost" || h === "0.0.0.0" || h === "::1" || h === "[::1]") return "local";
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return "preview";
  if (PREVIEW_HOST_PATTERNS.some((re) => re.test(h))) return "preview";
  return "production";
}

const BLOCKED_ERROR_PATTERNS = [
  "user rejected", "user denied", "declined", "blocked",
  "malicious", "phishing", "unapproved", "not approved", "security",
];
export function looksLikeBlockedWalletError(message) {
  const m = (message ?? "").toLowerCase();
  return BLOCKED_ERROR_PATTERNS.some((p) => m.includes(p));
}
