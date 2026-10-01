/**
 * Local verification of Cloudflare-safe enrichment (Task 30).
 * Run: npx tsx scripts/test-enrich.mts
 * Prints how many cards carry real market questions vs honest ID fallbacks.
 * NEVER prints the API key.
 */
import { readFileSync } from "node:fs";

process.env.PANTA_MODE = "live";
process.env.PANTA_API_KEY = readFileSync("download/PANTA_API_KEY_live_secret.txt", "utf8").trim();

const { listMarkets } = await import("../src/server/panta/discovery");

async function run(label: string) {
  const t0 = Date.now();
  const page = await listMarkets({ limit: 24 });
  const dt = Date.now() - t0;
  const items = page.items;
  const real = items.filter((c) => !c.title.startsWith("Market ") && c.title.trim() !== "");
  const labeled = items.length - real.length;
  console.log(`\n== ${label} == ${dt}ms | cards: ${items.length} | real titles: ${real.length} | ID-fallback: ${labeled}`);
  const cats = [...new Set(items.map((c) => c.category))];
  console.log("categories on page:", cats.join(", "));
  for (const c of items.slice(0, 8)) {
    console.log(` - [${c.category}${c.resolved ? "/resolved" : ""}] ${c.title.slice(0, 90)}`);
  }
  return { real: real.length, total: items.length, dt };
}

const a = await run("PASS 1 (cold caches)");
await new Promise((r) => setTimeout(r, 2000));
const b = await run("PASS 2 (warm detail cache)");

const ok = b.real >= Math.max(3, a.real) && b.dt < 8000;
console.log(ok ? "\nRESULT: PASS" : "\nRESULT: CHECK MANUALLY");
process.exit(ok ? 0 : 1);
