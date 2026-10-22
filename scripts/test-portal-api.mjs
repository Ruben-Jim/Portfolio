#!/usr/bin/env node
/**
 * Client portal API (functions/portal-api.js) on a fake admin database.
 *   node scripts/test-portal-api.mjs
 *
 * Guards: bad / expired tokens are refused, a client only ever sees their own
 * documents, signatures, and care plan, private hub fields never leave the
 * server, and writes can't be pointed at another client's records.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { handle, PRIVATE_PROJECT_FIELDS, carePlanPrice } = require('../functions/portal-api.js');

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
      // Like RTDB: the update function first runs on the local cache, which is
      // empty inside a function, then again on the server's value. Returning
      // undefined aborts and writes nothing.
      async transaction(fn) {
        const real = JSON.parse(JSON.stringify(getAt(p) ?? null));
        if (real !== null && fn(null) === undefined) return { committed: false };
        const next = fn(real);
        if (next === undefined) return { committed: false };
        setAt(p, next);
        return { committed: true };
      }
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

// Picking a care plan bills it right away: an unpaid invoice the board can
// download before paying. NOW is Jan 15, 2027 in Fresno.
const invoicesFor = (maintId) => Object.entries(getAt('agencyBusinessDocuments') || {})
  .filter(([, d]) => d.sourceMaintenanceId === maintId);
reset();
data.agencyBusinessDocuments.D6 = { clientName: 'Pro Cleaning', type: 'invoice', invoiceNumber: 'INV-2027-0007' };
data.agencyBusinessDocuments.D7 = { clientName: 'Pro Cleaning', type: 'invoice', invoiceNumber: 'INV-2026-0042' };
const pick = await handle(db, { action: 'requestPlan', token: TA, planTier: 'standard', billingPreference: 'annual', total: 1, amount: 1 }, NOW);
const inv = pick.invoice && getAt('agencyBusinessDocuments/' + pick.invoice.id);
ok(inv && inv.type === 'invoice' && inv.status === 'sent', 'picking a plan creates an unpaid invoice');
ok(inv && inv.total === 990, 'annual Standard billed at the site price, not a number from the browser');
ok(inv && inv.invoiceNumber === 'INV-2027-0008', 'invoice takes the next number for the year');
ok(inv && inv.dueDate === '2027-01-30', 'invoice due 15 days out');
ok(inv && inv.clientName === 'Shelton Springs' && inv.maintenancePlanId === 'standard' && inv.maintenanceBilling === 'annual' &&
  inv.maintenanceInvoiceKind === 'setup' && inv.sourceMaintenanceId === 'MA', 'invoice is tied to the plan');
ok(inv && JSON.stringify(inv.addOns).includes('Jan 15, 2027 – Jan 14, 2028'), 'annual line shows the service year');
ok(inv && getAt('agencyMaintenance/MA/pendingInvoiceId') === pick.invoice.id, 'plan remembers its unpaid invoice');
ok(inv && pick.invoice.invoiceNumber === inv.invoiceNumber, 'portal gets the invoice back so it can open it');
const A2 = await handle(db, { action: 'load', token: TA }, NOW);
ok(inv && A2.businessDocs.some((d) => d.id === pick.invoice.id), 'invoice shows in their portal documents');

await handle(db, { action: 'requestPlan', token: TA, planTier: 'essential', billingPreference: 'monthly' }, NOW + 60000);
const re = invoicesFor('MA');
ok(inv && re.length === 1 && re[0][0] === pick.invoice.id && re[0][1].invoiceNumber === 'INV-2027-0008', 're-picking before paying updates the same invoice');
ok(re.length === 1 && re[0][1].total === 79 && re[0][1].maintenancePlanId === 'essential' && re[0][1].maintenanceBilling === 'monthly',
  're-picked invoice carries the new plan and price');

if (inv) setAt('agencyBusinessDocuments/' + pick.invoice.id + '/status', 'paid');
const again = await handle(db, { action: 'requestPlan', token: TA, planTier: 'standard', billingPreference: 'annual' }, NOW);
ok(inv && again.invoice && again.invoice.id !== pick.invoice.id && invoicesFor('MA').length === 2, 'a paid invoice is never reused');
ok(inv && getAt('agencyBusinessDocuments/' + pick.invoice.id + '/total') === 79, 'the paid invoice is left untouched');

// Prices come from site settings and the project's own yearly rate, never the browser.
reset();
data.agencyPricing = { yearlyDiscountPct: 40, promo: { enabled: true, months: 3, pct: 50 } };
const mo = await handle(db, { action: 'requestPlan', token: TB, planTier: 'standard', billingPreference: 'monthly', promoPct: 90, promoMonthsLeft: 24 }, NOW);
ok(mo.invoice && getAt('agencyBusinessDocuments/' + mo.invoice.id + '/total') === 75, 'monthly invoice uses the site promo price');
ok(getAt('agencyMaintenance/MB/promoPct') === 50 && getAt('agencyMaintenance/MB/promoMonthsLeft') === 3, 'plan promo comes from site settings, not the browser');
data.agencyProjects.PB.yearlyDiscountPct = 30;
const yr = await handle(db, { action: 'requestPlan', token: TB, planTier: 'standard', billingPreference: 'annual' }, NOW);
ok(yr.invoice && getAt('agencyBusinessDocuments/' + yr.invoice.id + '/total') === 1260, "the project's own yearly rate wins");

// 8pm Oct 14 in Fresno is already Oct 15 in UTC.
reset();
const late = await handle(db, { action: 'requestPlan', token: TB, planTier: 'essential', billingPreference: 'annual' }, Date.UTC(2026, 9, 15, 3, 0));
const li = late.invoice && getAt('agencyBusinessDocuments/' + late.invoice.id);
ok(li && li.dueDate === '2026-10-29' && li.invoiceNumber === 'INV-2026-0001', 'due date and invoice year follow Pacific time');
// The invoice prints the date part of createdAt, so it must be the Pacific day.
ok(li && li.createdAt.slice(0, 10) === '2026-10-14' && Date.parse(li.createdAt) === Date.UTC(2026, 9, 15, 3, 0), 'issued date is the Pacific day and still the exact moment');

// The server's price math must match assets/js/care-pricing.js, which the
// portal uses to show prices before the client picks.
async function browserPricing(raw) {
  const win = { rtdb: {}, rtdbRef: () => ({}), rtdbGet: async () => ({ val: () => raw }), console };
  win.window = win;
  vm.createContext(win);
  vm.runInContext(fs.readFileSync(new URL('../assets/js/care-pricing.js', import.meta.url), 'utf8'), win);
  await win.CarePricing.load();
  return win.CarePricing;
}
const mismatches = [];
for (const raw of [null, { yearlyDiscountPct: 40, promo: { enabled: true, months: 2, pct: 25 } }]) {
  const CP = await browserPricing(raw);
  for (const hub of [{}, { yearlyDiscountPct: 30 }]) {
    for (const tier of ['essential', 'standard', 'priority']) {
      const annual = CP.quote(tier, hub.yearlyDiscountPct).annual;
      const monthly = CP.config.promo.enabled ? CP.promoMonthly(tier) : CP.quote(tier).monthly;
      if (typeof carePlanPrice !== 'function' || carePlanPrice(tier, 'annual', raw, hub) !== annual || carePlanPrice(tier, 'monthly', raw, hub) !== monthly) {
        mismatches.push(`${tier} ${JSON.stringify(raw)} ${JSON.stringify(hub)}`);
      }
    }
  }
}
ok(mismatches.length === 0, 'server prices match care-pricing.js' + (mismatches.length ? ': ' + mismatches.join('; ') : ''));

// Tickets: the portal sees the write-up only when CWR shares it, never the
// admin's notes, and can answer a ticket that is ready to check — once.
reset();
data.agencyMaintenance.MA.notes = 'admin only';
data.agencyMaintenance.MA.tickets = [
  { ref: 'CWR-SHS-004', title: 'Gate', status: 'check', found: 'f', fixed: 'x', howToCheck: 'h', shareWriteup: true, source: 'text', kind: 'bug', down: true },
  { ref: 'CWR-SHS-003', title: 'Pool', status: 'check', found: 'secret-f', fixed: 'secret-x', howToCheck: 'secret-h', shareWriteup: false, debugNotes: 'leak?' },
  'Legacy plain ticket'
];
const L = await handle(db, { action: 'load', token: TA }, NOW);
const raw = JSON.stringify(L);
ok(!raw.includes('secret-f') && !raw.includes('secret-x') && !raw.includes('secret-h'), 'write-up never sent when sharing is off');
ok(!raw.includes('leak?'), 'fields outside the allow-list never sent');
ok(!raw.includes('admin only'), 'care plan notes never sent');
const lt = L.maintenance[0].tickets;
ok(lt[0].found === 'f' && lt[0].fixed === 'x' && lt[0].howToCheck === 'h' && lt[0].source === 'text' && lt[0].kind === 'bug' && lt[0].down === true, 'shared write-up and ticket facts sent');
ok(lt[2].title === 'Legacy plain ticket', 'old plain-string tickets still sent');

const sub = await handle(db, { action: 'submitTicket', token: TA, title: 'New one', area: 'Payments' }, NOW);
ok(sub.ticket.source === 'portal' && typeof sub.ticket.loggedAt === 'string', 'portal tickets record their source and when they were logged');

const okReply = await handle(db, { action: 'replyTicket', token: TA, ref: 'CWR-SHS-004', verdict: 'ok' }, NOW);
const t4 = getAt('agencyMaintenance/MA/tickets')[0];
ok(t4.status === 'resolved' && typeof t4.resolvedAt === 'string' && t4.clientReply.verdict === 'ok', '"Looks good" resolves the ticket');
ok(okReply.ticket.status === 'resolved' && !('debugNotes' in okReply.ticket), 'reply returns the public ticket');
ok(await fails(handle(db, { action: 'replyTicket', token: TA, ref: 'CWR-SHS-004', verdict: 'ok' }, NOW), 409), 'a second answer is refused once it is no longer ready to check');

const nw = await handle(db, { action: 'replyTicket', token: TA, ref: 'CWR-SHS-003', verdict: 'not-working', note: 'Still shows the old hours' }, NOW);
const t3 = getAt('agencyMaintenance/MA/tickets')[1];
ok(t3.status === 'in-progress' && t3.clientReply.note === 'Still shows the old hours' && !t3.resolvedAt, '"Still not working" puts it back in progress with their note');
ok(!JSON.stringify(nw).includes('secret-f'), 'reply never leaks an unshared write-up');

ok(await fails(handle(db, { action: 'replyTicket', token: TA, ref: 'CWR-SHS-999', verdict: 'ok' }, NOW), 404), 'unknown ticket refused');
ok(await fails(handle(db, { action: 'replyTicket', token: TA, ref: 'CWR-SHS-003', verdict: 'maybe' }, NOW), 400), 'unknown answer refused');
const beforeOther = JSON.stringify(getAt('agencyMaintenance/MA'));
ok(await fails(handle(db, { action: 'replyTicket', token: TB, ref: 'CWR-SHS-004', verdict: 'ok' }, NOW), 404), "another client's ticket can't be answered");
ok(JSON.stringify(getAt('agencyMaintenance/MA')) === beforeOther, "another client's plan untouched");
