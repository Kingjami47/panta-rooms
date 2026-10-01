#!/usr/bin/env node
// Verify the 5f5b684 deployment on production:
// 1) /api/config health
// 2) /api/rooms — do cards carry populated question (+resolutionRule) text?
// 3) /api/discovery — list endpoint field mapping
// Never prints secrets; only counts/booleans/short samples.
const BASE = 'https://panta-rooms.vercel.app';

async function j(path) {
  const r = await fetch(BASE + path, { headers: { accept: 'application/json' } });
  const ct = r.headers.get('content-type') || '';
  let body = null, text = null;
  if (ct.includes('json')) body = await r.json().catch(() => null);
  if (!body) text = (await r.text().catch(() => '')).slice(0, 200);
  return { path, status: r.status, ct, body, text };
}

function countCards(body) {
  if (!body) return { n: 0, cards: [] };
  const arr = Array.isArray(body) ? body : (body.rooms || body.items || body.cards || body.markets || body.data || []);
  return { n: Array.isArray(arr) ? arr.length : 0, cards: Array.isArray(arr) ? arr : [] };
}

(async () => {
  console.log('== 1) /api/config ==');
  const cfg = await j('/api/config');
  console.log('status:', cfg.status, '| json:', !!cfg.body, cfg.text ? `| text: ${cfg.text.slice(0,80)}` : '');

  console.log('== 2) /api/rooms ==');
  const rooms = await j('/api/rooms?limit=8');
  const r1 = countCards(rooms.body);
  let withQ = 0, withRR = 0;
  for (const c of r1.cards) {
    const q = c.question ?? c.title ?? c.name;
    const rr = c.resolutionRule ?? c.resolutionRules ?? c.description;
    if (typeof q === 'string' && q.trim().length > 0) withQ++;
    if (typeof rr === 'string' ? rr.trim().length > 0 : rr != null) withRR++;
  }
  console.log(`status: ${rooms.status} | cards: ${r1.n} | with question text: ${withQ} | with resolutionRule-ish text: ${withRR}`);
  if (r1.cards[0]) {
    const c = r1.cards[0];
    const q = c.question ?? c.title ?? c.name ?? '';
    console.log('sample question (first 90 chars):', JSON.stringify(String(q).slice(0, 90)));
    console.log('card keys:', Object.keys(c).slice(0, 15).join(', '));
  }

  console.log('== 3) /api/discovery ==');
  const disc = await j('/api/discovery?limit=8');
  const r2 = countCards(disc.body);
  let dQ = 0;
  for (const c of r2.cards) {
    const q = c.question ?? c.title ?? c.name;
    if (typeof q === 'string' && q.trim().length > 0) dQ++;
  }
  console.log(`status: ${disc.status} | cards: ${r2.n} | with question text: ${dQ}`);
  if (disc.text && !disc.body) console.log('non-JSON response head:', disc.text);
})().catch(e => { console.error('VERIFY ERROR:', e.message); process.exit(1); });
