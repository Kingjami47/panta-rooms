/**
 * Per-segment title-quality scorecard for Explore Rooms.
 * Usage: node scripts/scorecard_segments.mjs [base]
 * Default base = production. For each category tab the UI offers, fetch the
 * feed the same way the dashboard does and count real vs fallback titles.
 */
const BASE = process.argv[2] || "https://panta-rooms.vercel.app";
const CATS = ["all", "sports", "crypto", "politics", "entertainment", "finance", "science", "world", "other"];
const isFallback = (t) => !t || !t.trim() || /^Market /i.test(t);

const rows = [];
for (const cat of CATS) {
  const q = cat === "all" ? "" : `&category=${cat}`;
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE}/api/discovery?limit=24${q}&cb=${Date.now()}`, { cache: "no-store" });
    const j = await res.json();
    const items = j.items ?? [];
    let real = 0, fallback = 0;
    const badIds = [];
    for (const c of items) {
      if (isFallback(c.title)) { fallback++; badIds.push(c.marketId.slice(0, 8)); }
      else real++;
    }
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    rows.push({ cat, real, fallback, total: items.length, dt, demo: j.demo });
    console.log(
      `${cat.padEnd(14)} ${String(real).padStart(2)} real / ${String(fallback).padStart(2)} fallback  (${items.length} cards, ${dt}s${j.demo ? ", DEMO" : ""})`
    );
    if (fallback > 0) console.log(`   fallback ids: ${badIds.join(", ")}`);
  } catch (e) {
    rows.push({ cat, error: e.message });
    console.log(`${cat.padEnd(14)} ERROR ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 800));
}

const tot = rows.reduce((a, r) => ({ real: a.real + (r.real || 0), fallback: a.fallback + (r.fallback || 0) }), { real: 0, fallback: 0 });
console.log(`\nTOTAL: ${tot.real} real / ${tot.fallback} fallback  (${((tot.real / Math.max(1, tot.real + tot.fallback)) * 100).toFixed(0)}% real)`);
