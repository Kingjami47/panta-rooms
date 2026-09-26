/** Probe build + register endpoints with a fresh quote createId, plus account metrics. */
import { readFileSync } from "node:fs";

const envText = readFileSync("/home/z/my-project/.env", "utf8");
function env(name) {
  const m = envText.match(new RegExp(`^${name}=(.*)$`, "m"));
  return m ? m[1].trim() : null;
}
const KEY = env("PANTA_API_KEY");
const BASE = (env("PANTA_API_BASE_URL") || "https://live-api.panta.market/api/v1").replace(/\/$/, "");

async function call(label, path, method, body) {
  process.stdout.write(`\n=== ${label}: ${method} ${BASE}/${path} ===\n`);
  try {
    const res = await fetch(`${BASE}/${path}`, {
      method,
      headers: {
        "X-Api-Key": KEY,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    console.log("HTTP", res.status);
    console.log("BODY:", text.slice(0, 900));
    return { status: res.status, text };
  } catch (e) {
    console.log("FETCH ERROR:", e?.message ?? String(e));
    return { status: 0, text: "" };
  }
}

// 1. account metrics — verify canCreateMarkets on the account tied to this key
await call("account metrics", "account/metrics/", "GET");

// 2. fresh quote → then build against it
const now = Math.floor(Date.now() / 1000);
const start = now + 7200;
const end = start + 14 * 86400;
const q = await call("quote (fresh)", "markets/create/quote/", "POST", {
  wallet: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  question: `Probe market ${now}: will this probe resolve YES?`,
  resolutionRule: "Resolves NO by construction — probe only, never registered.",
  sourcesOfTruth: ["https://example.com/probe"],
  category: "other",
  startTime: start,
  endTime: end,
  resolutionTime: end + 3600,
  marketType: "standard",
  title: `Probe ${now}`,
  description: "Diagnostic probe",
  imageUrl: "https://preview-4mhmiq9cv.space-z.ai/covers/other.svg",
  region: "Global",
});

let createId = null;
try {
  createId = JSON.parse(q.text)?.createId ?? null;
} catch {}

if (createId) {
  await call("build", "markets/create/build/", "POST", {
    createId,
    wallet: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  });
  // deliberately bogus signature on register — expect 400-class, NOT 401, if auth is fine
  await call("register (bogus sig — expect validation error)", "markets/register/", "POST", {
    createId,
    signature: "x".repeat(128),
  });
} else {
  console.log("\nNo createId — skipping build/register probes");
}
