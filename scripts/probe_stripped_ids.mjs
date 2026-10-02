/**
 * Diagnose persistently-stripped markets (2026-10-01 screenshot regression).
 *
 * For each market ID: hit production /api/rooms/{id} (direct upstream detail
 * read via getMarket, stripRetries:2, 3s deadline — bypasses discovery caches)
 * several times, spaced out. Each call = 1-3 upstream replica dice-rolls.
 *
 * - If a market returns a REAL title on some calls  -> upstream shape flips
 *   fine; the discovery page just hasn't converged for it yet (our side).
 * - If a market returns the fallback label on EVERY call -> that market is
 *   persistently stripped upstream (their side, unfixable by re-rolls).
 */
const BASE = "https://panta-rooms.vercel.app";
const IDS = [
  // 4 IDs stripped in the discovery probe just now
  "8R5sx7Ms8BfYZz1na6ZLuh39JVMQgi6eNnNASj5pVjAY",
  "F5RSyCPuS4KLiUtzvRai5uaVAMLD9aAt22bSxgDK3z1C",
  "2KCSfe1nAsc6PZWsXndxjHbHUH2JKs1HvdDgBAZAXLyY",
  "CMMp6w39hnbsW5qLaeRV8HDioq2HfDx4bR6GWkQFLwTM",
  // control: known-good real title
  "6yEBmxJu2oWdubFVKZshVVUpLLsXd61csSfmf8y4Qtwd",
];
const ROUNDS = 4;
const label = (t) => (!t || !t.trim() || /^Market /i.test(t) ? "STRIPPED" : "real");

const tally = Object.fromEntries(IDS.map((id) => [id, { real: 0, stripped: 0, titles: [] }]));

for (let r = 1; r <= ROUNDS; r++) {
  for (const id of IDS) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${BASE}/api/rooms/${id}?cb=${Date.now()}_${Math.random()}`, {
        cache: "no-store",
      });
      const j = await res.json();
      const mt = j?.market?.title ?? "(no market)";
      const kind = label(mt);
      tally[id][kind === "real" ? "real" : "stripped"]++;
      if (kind === "real" && !tally[id].titles.includes(mt)) tally[id].titles.push(mt);
      console.log(`r${r} ${id.slice(0, 8)} ${kind}  ${(Date.now() - t0) / 1000}s  ${String(mt).slice(0, 60)}`);
    } catch (e) {
      tally[id].stripped++;
      console.log(`r${r} ${id.slice(0, 8)} ERROR  ${(Date.now() - t0) / 1000}s  ${e.message}`);
    }
    await new Promise((s) => setTimeout(s, 1200));
  }
}

console.log("\n=== TALLY ===");
for (const [id, t] of Object.entries(tally)) {
  console.log(`${id.slice(0, 10)}  real=${t.real} stripped=${t.stripped}  ${t.titles[0] ? t.titles[0].slice(0, 60) : "(never real)"}`);
}
