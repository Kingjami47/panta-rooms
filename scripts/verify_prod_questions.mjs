#!/usr/bin/env node
// Sample discovery card questions to distinguish real question text
// from fallback titles ("Market <id>"), and check demo vs live origin.
const BASE = 'https://panta-rooms.vercel.app';

(async () => {
  const r = await fetch(BASE + '/api/discovery?limit=8', { headers: { accept: 'application/json' } });
  const body = await r.json().catch(() => null);
  if (!body) { console.log('non-JSON discovery response'); return; }
  const arr = Array.isArray(body) ? body : (body.items || body.cards || body.markets || body.data || body.rooms || []);
  console.log('cards:', arr.length);
  for (const c of arr.slice(0, 8)) {
    const q = String(c.question ?? c.title ?? c.name ?? '');
    const isFallback = /^Market\s+[A-Za-z0-9]{6,}/.test(q) || q.length < 12;
    console.log(`- [${c.demo ? 'DEMO' : 'LIVE'}] fallback=${isFallback} | ${JSON.stringify(q.slice(0, 100))}`);
    const rr = c.resolutionRule ?? c.description;
    if (typeof rr === 'string' && rr) console.log(`    rule: ${JSON.stringify(rr.slice(0, 100))}`);
  }
})().catch(e => console.error('ERR:', e.message));
