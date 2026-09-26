/**
 * Probe Panta sandbox (pk_test_): quote + build a create tx, decode it,
 * and determine which Solana cluster the transaction targets.
 * Compares lastValidBlockHeight against mainnet-beta and devnet RPC.
 */
import fs from "node:fs";

const TEST_KEY = JSON.parse(fs.readFileSync("/home/z/my-project/scripts/panta_key.json", "utf8")).secret;
const BASE = "https://live-api.panta.market/api/v1";

async function api(path, body) {
  const res = await fetch(`${BASE}/${path}`, {
    method: body ? "POST" : "GET",
    headers: { "X-Api-Key": TEST_KEY, "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return { status: res.status, json: JSON.parse(text) }; } catch { return { status: res.status, json: text.slice(0, 300) }; }
}

const now = Math.floor(Date.now() / 1000);
const start = now + 7200, end = start + 30 * 86400, res_t = end + 3600;

console.log("=== sandbox quote (pk_test_) ===");
const q = await api("markets/create/quote/", {
  wallet: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  question: "Sandbox probe: will BTC be above $1 on 2027-01-01?",
  resolutionRule: "CoinGecko daily close UTC above $1",
  sourcesOfTruth: ["https://www.coingecko.com"],
  category: "crypto",
  startTime: start, endTime: end, resolutionTime: res_t,
  marketType: "standard",
  title: "Sandbox probe BTC $1",
  description: "Probe.",
  imageUrl: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=1024&h=1024&fit=crop&q=80",
  region: "Global",
});
console.log("status:", q.status);
console.log(JSON.stringify(q.json, null, 1).slice(0, 900));

if (q.status !== 200) { console.log("quote failed — cannot build"); process.exit(0); }

console.log("\n=== sandbox build ===");
const b = await api("markets/create/build/", { createId: q.json.createId, wallet: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" });
console.log("status:", b.status);
if (b.status !== 200) { console.log(JSON.stringify(b.json).slice(0, 500)); process.exit(0); }

const { VersionedTransaction, Connection, PublicKey } = await import("/home/z/my-project/node_modules/@solana/web3.js/lib/index.cjs.js").catch(() => ({}));
if (!VersionedTransaction) { console.log("web3.js import failed"); process.exit(0); }

const tx = VersionedTransaction.deserialize(Buffer.from(b.json.transaction, "base64"));
const keys = tx.message.getAccountKeys({ accountKeysFromLookups: null });
console.log("\n--- tx accounts ---");
for (let i = 0; i < keys.length; i++) {
  const pk = keys.get(i).toBase58();
  let tag = "";
  if (tx.message.staticAccountKeys[i]) tag = "(static)";
  console.log(`${i}: ${pk} ${tag}`);
}
console.log("signers required:", tx.message.header.numRequiredSignatures);
console.log("recentBlockhash:", tx.message.recentBlockhash);
console.log("lastValidBlockHeight:", b.json.lastValidBlockHeight);

console.log("\n--- cluster check ---");
for (const [name, url] of [["mainnet-beta", "https://api.mainnet-beta.solana.com"], ["devnet", "https://api.devnet.solana.com"], ["testnet", "https://api.testnet.solana.com"]]) {
  try {
    const c = new Connection(url, { commitment: "confirmed" });
    const h = await c.getBlockHeight({ commitment: "confirmed" });
    const bhInfo = await c.getFeeCalculatorForBlockhash(tx.message.recentBlockhash, "confirmed").catch(() => null);
    const valid = bhInfo && bhInfo.value ? "blockhash VALID" : "blockhash unknown/expired";
    const dist = b.json.lastValidBlockHeight - h;
    console.log(`${name}: height=${h} lastValidDelta=${dist} ${valid}`);
  } catch (e) {
    console.log(`${name}: RPC error ${String(e && e.message).slice(0, 80)}`);
  }
}
