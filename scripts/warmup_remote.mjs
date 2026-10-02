/**
 * Remote MarketMeta warmup — teach production's shared DB every real title.
 * Walks the saved fallback ids (scripts/warmup_ids.json), hits the rooms
 * endpoint (direct detail read + persist, stripRetries 2) until the id stops
 * being stripped, with modest concurrency + spacing.
 * Usage: node scripts/warmup_remote.mjs
 */
import { readFileSync } from "node:fs";

const BASE = "https://panta-rooms.vercel.app";
const IDS = JSON.parse(readFileSync("scripts/warmup_ids.json", "utf8"));
const ROUNDS = 4;
const CONCURRENCY = 2;
const isFallback = (t) => !t || !t.trim() || /^Market /i.test(t);

const learned = [];
const stuck = [];
let idx = 0;

async function worker(wid) {
  while (true) {
    const i = idx++;
    if (i >= IDS.length) break;
    const id = IDS[i];
    let got = null;
    for (let r = 1; r <= ROUNDS && !got; r++) {
      try {
        const res = await fetch(`${BASE}/api/rooms/${id}?w=${Date.now()}_${wid}`, { cache: "no-store" });
        const j = await res.json();
        const t = j?.market?.title ?? "";
        if (!isFallback(t)) got = t;
      } catch {
        /* retry next round */
      }
      if (!got) await new Promise((s) => setTimeout(s, 700));
    }
    if (got) {
      learned.push(id);
      console.log(`✓ ${id.slice(0, 8)}  ${got.slice(0, 72)}`);
    } else {
      stuck.push(id);
      console.log(`✗ ${id.slice(0, 8)}  still stripped after ${ROUNDS} rounds`);
    }
  }
}

const workers = Array.from({ length: CONCURRENCY }, (_, w) => worker(w));
await Promise.all(workers);
console.log(`\n=== WARMUP DONE === learned ${learned.length}/${IDS.length}, stuck ${stuck.length}`);
if (stuck.length) require_fs_write(stuck);
function require_fs_write(ids) {
  import("node:fs").then((fs) => fs.writeFileSync("scripts/warmup_stuck.json", JSON.stringify(ids)));
}
