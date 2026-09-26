/**
 * Reproduce the create/quote 401 seen in the Create wizard.
 * POSTs the exact payload shape the wizard sends, with both live and test keys.
 */
import { readFileSync } from "node:fs";

const envText = readFileSync("/home/z/my-project/.env", "utf8");
function env(name) {
  const m = envText.match(new RegExp(`^${name}=(.*)$`, "m"));
  return m ? m[1].trim() : null;
}

const LIVE_KEY = env("PANTA_API_KEY");
const TEST_KEY = env("PANTA_API_KEY_TEST");
const BASE = (env("PANTA_API_BASE_URL") || "https://live-api.panta.market/api/v1").replace(/\/$/, "");

const now = Math.floor(Date.now() / 1000);
const start = now + 7200;
const days = 14;
const end = start + days * 86400;

const body = {
  wallet: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  question: "Will Bitcoin close above $200,000 on Dec 31, 2026 (UTC)?",
  resolutionRule:
    "YES if the Binance BTC/USDT 1-day candle closing 2026-12-31 23:59:59 UTC ends above $200,000; otherwise NO.",
  sourcesOfTruth: ["https://www.binance.com/en/trade/BTC_USDT"],
  category: "crypto",
  startTime: start,
  endTime: end,
  resolutionTime: end + 3600,
  marketType: "standard",
  title: "Bitcoin above $200k by end of 2026?",
  description: "Resolves by the Binance BTC/USDT daily close on Dec 31, 2026.",
  imageUrl: "https://preview-4mhmiq9cv.space-z.ai/covers/crypto.svg",
  region: "Global",
};

async function probe(label, key, base) {
  process.stdout.write(`\n=== ${label} → POST ${base}/markets/create/quote/ ===\n`);
  try {
    const res = await fetch(`${base}/markets/create/quote/`, {
      method: "POST",
      headers: {
        "X-Api-Key": key,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log("HTTP", res.status);
    console.log("BODY:", text.slice(0, 1200));
  } catch (e) {
    console.log("FETCH ERROR:", e?.message ?? String(e));
  }
}

await probe("LIVE key", LIVE_KEY, BASE);
await probe("TEST key (same base)", TEST_KEY, BASE);
