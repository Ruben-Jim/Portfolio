#!/usr/bin/env node
/**
 * Customer inbox sessions (functions/dm-session.js) on a fake admin database.
 *   node scripts/test-dm-session.mjs
 *
 * Guards: one conversation per email, the token is scoped to that one
 * conversation, lookupOnly never creates, portal chat only links a project
 * with a real portal token, and the per-IP rate limit kicks in.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { handle, RATE_LIMIT_PER_HOUR } = require('../functions/dm-session.js');

let data;
const parts = (p) => String(p || '').split('/').filter(Boolean);
const getAt = (p) => parts(p).reduce((o, k) => (o == null ? undefined : o[k]), data);
function setAt(p, v) {
  const ks = parts(p); let o = data;
  ks.slice(0, -1).forEach((k) => { if (o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; });
  o[ks[ks.length - 1]] = JSON.parse(JSON.stringify(v));
}
let n = 0;
function ref(p) {
  const q = { child: null, eq: null };
  const api = {
    key: parts(p).slice(-1)[0],
    orderByChild(c) { q.child = c; return api; },
    equalTo(v) { q.eq = v; return api; },
    limitToFirst() { return api; },
    once: async () => {
      let val = JSON.parse(JSON.stringify(getAt(p) ?? null));
      if (q.child && val) val = Object.fromEntries(Object.entries(val).filter(([, r]) => r[q.child] === q.eq).slice(0, 1));
      return { val: () => (val && Object.keys(val).length ? val : (q.child ? null : val)) };
    },
    update: async (patch) => { for (const k of Object.keys(patch)) setAt(p + '/' + k, patch[k]); },
    set: async (v) => setAt(p, v),
    push() { return ref(p + '/C' + (++n)); },
    async transaction(fn) { const next = fn(getAt(p) ?? null); setAt(p, next); return { committed: true, snapshot: { val: () => next } }; }
  };
  return api;
}
const minted = [];
const deps = { db: { ref }, auth: { createCustomToken: async (uid, claims) => { minted.push({ uid, claims }); return 'tok:' + uid; } } };

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };
const NOW = 1_800_000_000_000;
data = { agencyClientPortals: { ['a'.repeat(32)]: { projectId: 'PA' } } };
async function fails(p, status) { try { await p; return false; } catch (e) { return !status || e.status === status; } }

ok(await fails(handle(deps, { email: 'nope' }, '1.1.1.1', NOW), 400), 'invalid email refused');

const r1 = await handle(deps, { email: 'Rosa@BarkAvenue.com', name: 'Rosa', source: 'hire-me', subject: 'New Hire Me Inquiry' }, '1.1.1.1', NOW);
ok(r1.conversation.id && r1.token, 'new email → conversation + token');
ok(minted[0].claims.dmConv === r1.conversation.id && minted[0].claims.dmEmail === 'rosa@barkavenue.com', 'token is scoped to that one conversation');
ok(!('admin' in minted[0].claims), 'customer token never carries admin');

const r2 = await handle(deps, { email: 'rosa@barkavenue.com', source: 'contact' }, '1.1.1.1', NOW);
ok(r2.conversation.id === r1.conversation.id && Object.keys(getAt('dm/meta')).length === 1, 'same email → same conversation, no duplicate');
ok(minted[1].uid === minted[0].uid, 'stable uid per email');
ok(getAt('dm/meta/' + r1.conversation.id + '/originSource') === 'hire-me', 'origin source never overwritten');

const r3 = await handle(deps, { email: 'stranger@x.com', lookupOnly: true }, '1.1.1.1', NOW);
ok(r3.conversation === null && !r3.token && Object.keys(getAt('dm/meta')).length === 1, 'lookupOnly never creates and mints nothing');

const r4 = await handle(deps, { email: 'jane@hoa.com', source: 'client-portal', portalToken: 'b'.repeat(32) }, '1.1.1.1', NOW);
ok(!r4.conversation.agencyProjectId, 'fake portal token does not link a project');
const r5 = await handle(deps, { email: 'jane@hoa.com', source: 'client-portal', portalToken: 'a'.repeat(32) }, '1.1.1.1', NOW);
ok(r5.conversation.agencyProjectId === 'PA', 'real portal token links the project');

let limited = false;
for (let i = 0; i < RATE_LIMIT_PER_HOUR + 1 && !limited; i++) {
  limited = await fails(handle(deps, { email: 'probe' + i + '@x.com', lookupOnly: true }, '9.9.9.9', NOW), 429);
}
ok(limited, `rate limit stops a burst of ${RATE_LIMIT_PER_HOUR}+ lookups from one IP`);
ok(!(await fails(handle(deps, { email: 'ok@x.com', lookupOnly: true }, '8.8.8.8', NOW))), 'other IPs unaffected');
