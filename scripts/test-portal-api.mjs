#!/usr/bin/env node
/**
 * Client portal API (functions/portal-api.js) on a fake admin database.
 *   node scripts/test-portal-api.mjs
 *
 * Guards: bad / expired tokens are refused, a client only ever sees their own
 * documents, signatures, and care plan, private hub fields never leave the
 * server, and writes can't be pointed at another client's records.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { handle, PRIVATE_PROJECT_FIELDS } = require('../functions/portal-api.js');

let data;
const parts = (p) => String(p || '').split('/').filter(Boolean);
const getAt = (p) => parts(p).reduce((o, k) => (o == null ? undefined : o[k]), data);
function setAt(p, v) {
  const ks = parts(p); let o = data;
  ks.slice(0, -1).forEach((k) => { if (o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; });
  o[ks[ks.length - 1]] = v === undefined ? v : JSON.parse(JSON.stringify(v));
}
let n = 0;
const db = {
  ref(p) {
    return {
      key: parts(p).slice(-1)[0],
      once: async () => ({ val: () => JSON.parse(JSON.stringify(getAt(p) ?? null)), exists: () => getAt(p) != null }),
      update: async (patch) => { for (const k of Object.keys(patch)) setAt(p + '/' + k, patch[k]); },
      set: async (v) => setAt(p, v),
      push() { return db.ref(p + '/M' + (++n)); },
      async transaction(fn) { const next = fn(JSON.parse(JSON.stringify(getAt(p) ?? null))); setAt(p, next); return { committed: true }; }
    };
  }
};

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };
const NOW = 1_800_000_000_000;
const TA = 'a'.repeat(32), TB = 'b'.repeat(32), TX = 'c'.repeat(32);
function reset() {
  data = {
    agencyClientPortals: { [TA]: { projectId: 'PA', expiresAt: NOW + 1e6 }, [TB]: { projectId: 'PB' }, [TX]: { projectId: 'PA', expiresAt: NOW - 1 } },
    agencyProjects: {
      PA: { clientName: 'Shelton Springs', title: 'HOA app', businessDocId: 'D1', notes: 'internal!', portalToken: TA, leadId: 'L1', buildHoursSpent: 40, expoUrl: 'https://hoa.expo.app' },
      PB: { clientName: 'Pro Cleaning', title: 'Cleaning app' }
    },
    agencyBusinessDocuments: {
      D1: { clientName: 'Shelton Springs', type: 'invoice', total: 1000 },
      D2: { clientName: 'shelton springs', type: 'contract' },
      D3: { clientName: 'Pro Cleaning', type: 'invoice', total: 2000 },
      D4: { clientName: 'Shelton Springs', type: 'proposal', status: 'draft' },
      D5: { clientName: 'Shelton Springs', type: 'invoice' }
    },
    agencyBusinessDocDeletes: { D5: true },
    agencyContractSignatures: { D3: { signedByName: 'Someone Else' } },
    agencyMaintenance: { MA: { projectId: 'PA', clientName: 'Shelton Springs', planTier: 'standard', tickets: [{ ref: 'CWR-SHS-004' }] }, MB: { projectId: 'PB', clientName: 'Pro Cleaning' } }
  };
}
async function fails(p, status) { try { await p; return false; } catch (e) { return !status || e.status === status; } }

reset();
ok(await fails(handle(db, { action: 'load', token: 'short' }, NOW), 403), 'malformed token refused');
ok(await fails(handle(db, { action: 'load', token: 'd'.repeat(32) }, NOW), 403), 'unknown token refused');
ok(await fails(handle(db, { action: 'load', token: TX }, NOW), 403), 'expired token refused');

const A = await handle(db, { action: 'load', token: TA }, NOW);
ok(A.businessDocs.map((d) => d.id).sort().join() === 'D1,D2', 'client sees only their own docs (no drafts, no deleted, no other client)');
ok(Object.keys(A.contractSignatures).length === 0, 'other clients\' signatures never returned');
ok(A.maintenance.length === 1 && A.maintenance[0].id === 'MA', 'only their care plan');
ok(PRIVATE_PROJECT_FIELDS.every((f) => !(f in A.hub)) && A.hub.expoUrl, 'private hub fields stripped, public ones kept');
ok(!JSON.stringify(A).includes(TA), 'the portal token is never echoed back in data');

// Writes are scoped to the token's project.
const sign = await handle(db, { action: 'signContract', token: TA, docId: 'D2', signedByName: 'Jane HOA', agreedToTerms: true }, NOW);
ok(getAt('agencyContractSignatures/D2/signedByName') === 'Jane HOA' && sign.signature.signedAt === NOW, 'can sign their own contract (server timestamp)');
ok(await fails(handle(db, { action: 'signContract', token: TA, docId: 'D2', signedByName: 'Again', agreedToTerms: true }, NOW), 409), 'cannot re-sign / overwrite a signature');
ok(await fails(handle(db, { action: 'signContract', token: TA, docId: 'D3', signedByName: 'Jane', agreedToTerms: true }, NOW), 403), 'cannot sign another client\'s document');
ok(await fails(handle(db, { action: 'signContract', token: TA, docId: 'D2x', signedByName: 'J', agreedToTerms: false }, NOW), 400), 'must agree to terms');

const t = await handle(db, { action: 'submitTicket', token: TA, title: 'Gate code broken', area: 'app', details: 'x' }, NOW);
ok(t.ticket.ref === 'CWR-SHS-005' && getAt('agencyMaintenance/MA/tickets').length === 2, 'ticket numbered server-side on their plan');
ok(!getAt('agencyMaintenance/MB/tickets'), 'other client\'s plan untouched');

await handle(db, { action: 'requestPlan', token: TB, planTier: 'priority', billingPreference: 'annual', hoursIncluded: 999, paymentStatus: 'paid', planStatus: 'active' }, NOW);
const mb = getAt('agencyMaintenance/MB');
ok(mb.planTier === 'priority' && mb.paymentStatus === 'awaiting' && mb.hoursIncluded === 40, 'plan request: payment status forced to awaiting, hours clamped');
ok(await fails(handle(db, { action: 'requestPlan', token: TB, planTier: 'free' }, NOW), 400), 'unknown tier refused');
ok(await fails(handle(db, { action: 'drop', token: TB }, NOW), 400), 'unknown action refused');
