/**
 * MarketMeta warmup — the "thorough cleanup" pass for ALL market segments.
 *
 * Walks every verified Panta category (plus the unfiltered catalog), re-rolls
 * every stripped card until a complete detail read lands, and persists each
 * real question into the shared MarketMeta table. After this run, production
 * serves real titles on EVERY tab instantly (discovery seeds from MarketMeta
 * before spending any upstream read).
 *
 * Requires: DATABASE_URL (Postgres) + PANTA_API_KEY in env (from vercel env pull).
 * Run: node --env-file=.env.local scripts/warmup_market_meta.mts
 * NEVER prints the API key.
 */
import { PANTA_CATEGORIES } from "../src/lib/panta-categories";

if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  console.error("ABORT: DATABASE_URL must point at the production Postgres (set via .env.local from `vercel env pull`)");
  process.exit(1);
}
if (!process.env.PANTA_API_KEY) {
  console.error("ABORT: PANTA_API_KEY missing (set via .env.local from `vercel env pull`)");
  process.exit(1);
}
process.env.PANTA_MODE ||= "live";

const { db } = await import("../src/lib/db");
const { listMarketsRaw } = await import("../src/server/panta/discovery");
const { getMarket } = await import("../src/server/panta/markets");
const { toCardView, isStrippedCard } = await import("../src/server/panta/normalize");
const { persistMarketMeta } = await import("../src/server/panta/meta");

const ROLL_PASSES = 6; // re-roll rounds per category for stubborn stripped ids
const SLEEP_MS = 900; // spacing — stay well off any burst radar

const isFallback = (t: string) => !t || !t.trim() || /^Market /i.test(t);

let learned = 0;
let stillStripped = 0;
const seen = new Set<string>();

const targets: (string | undefined)[] = [undefined, ...PANTA_CATEGORIES];

for (const cat of targets) {
  const label = cat ?? "ALL";
  let ids: string[] = [];
  try {
    const { items } = await listMarketsRaw({ category: cat, limit: 50 });
    ids = items.map((r) => r.marketId);
    console.log(`\n[${label}] ${ids.length} markets in list`);
  } catch (e) {
    console.log(`[${label}] list FAILED: ${e instanceof Error ? e.message : e}`);
    continue;
  }

  // Build card views once (list rows carry most fields, title often stripped).
  let cards: ReturnType<typeof toCardView>[] = [];
  try {
    const { items } = await listMarketsRaw({ category: cat, limit: 50 });
    cards = items.map(toCardView);
  } catch {
    /* ids-only path is fine */
  }

  const pending = new Set(cards.filter((c) => isFallback(c.title)).map((c) => c.marketId));
  // Complete list rows need no detail read — persist directly.
  for (const c of cards) {
    if (!isFallback(c.title) && !seen.has(c.marketId)) {
      seen.add(c.marketId);
      await persistMarketMeta(c);
      learned++;
    }
  }
  console.log(`[${label}] ${pending.size} stripped → re-rolling detail reads`);

  for (let pass = 1; pass <= ROLL_PASSES && pending.size > 0; pass++) {
    for (const id of [...pending]) {
      try {
        const card = await getMarket(id, "live", { stripRetries: 3 });
        if (!isStrippedCard(card)) {
          if (!seen.has(id)) {
            seen.add(id);
            await persistMarketMeta(card);
            learned++;
            console.log(`  ✓ ${id.slice(0, 8)} ${card.title.slice(0, 70)}`);
          }
          pending.delete(id);
        } else if (pass === ROLL_PASSES) {
          stillStripped++;
          console.log(`  ✗ ${id.slice(0, 8)} still stripped after ${ROLL_PASSES} passes`);
        }
      } catch (e) {
        console.log(`  ! ${id.slice(0, 8)} read error: ${e instanceof Error ? e.message : e}`);
        if (pass === ROLL_PASSES) stillStripped++;
      }
      await new Promise((r) => setTimeout(r, SLEEP_MS));
    }
  }
}

console.log(`\n=== WARMUP DONE === learned ${learned} titles into MarketMeta, ${stillStripped} still stripped (they'll keep upgrading via the live feed)`);
process.exit(0);
