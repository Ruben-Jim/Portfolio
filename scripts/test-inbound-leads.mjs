#!/usr/bin/env node
/**
 * Website inquiries → Leads Pipeline (functions/inbound-leads.js) on a fake
 * admin database. Run from the repo root:
 *   node scripts/test-inbound-leads.mjs
 *
 * Guards: Hire Me makes a Lead with package + live offer, a booking moves the
 * same person to Discovery call (never back), repeat Contact messages don't
 * pile up, a matching prospect is promoted with its history, both-way links
 * are written, and the server price table matches care-pricing.js.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { upsertInboundLead, eventFromMessage, eventFromBooking, PACKAGES } = require('../functions/inbound-leads.js');

let data = {};
const parts = p => String(p || '').split('/').filter(Boolean);
const getAt = p => parts(p).reduce((o, k) => (o == null ? undefined : o[k]), data);
function setAt(p, v) {
  const ks = parts(p); let o = data;
  ks.slice(0, -1).forEach(k => { if (o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; });
  o[ks[ks.length - 1]] = JSON.parse(JSON.stringify(v));
}
let n = 0;
const db = {
  ref(p) {
    return {
      key: parts(p).slice(-1)[0],
      once: async () => ({ val: () => JSON.parse(JSON.stringify(getAt(p) ?? null)) }),
      update: async patch => { for (const k of Object.keys(patch)) setAt((p ? p + '/' : '') + k, patch[k]); },
      set: async v => setAt(p, v),
      push() { const key = 'L' + (++n); return db.ref(p + '/' + key); }
    };
  }
};

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };
const NOW = Date.parse('2026-10-10T18:00:00Z');
const leads = () => Object.entries(getAt('pipelineLeads') || {});

data = {
  agencyPricing: { packageOffers: { website: { enabled: true, price: 699, spots: 5, claimed: 0, endsAt: '2026-11-09' } } },
  agencyProspects: { P1: { business: 'Bark Avenue', email: 'rosa@barkavenue.com', status: 'working', scriptId: 'grooming',
    touches: { a: { at: 100, kind: 'dm' }, b: { at: 200, kind: 'texted' } } } },
  dm: { meta: { C1: { customerName: 'Rosa', customerEmail: 'Rosa@BarkAvenue.com' } } }
};

// Hire Me from someone who was a prospect.
const hm = await eventFromMessage(db, 'C1', { senderRole: 'customer', source: 'hire-me', body: 'Need a site', package_id: 'website', budget: '$500–$1k' });
let r = await upsertInboundLead(db, hm, NOW);
let [id, L] = leads()[0];
ok(r.created && leads().length === 1, 'Hire Me inquiry creates one lead');
ok(L.stage === 'lead' && L.inboundSource === 'hire-me', 'stage Lead, inbound source recorded');
ok(L.packageId === 'website' && L.value === 699 && L.packageOfferPrice === 699, 'package + live $699 offer price set');
ok(L.email === 'rosa@barkavenue.com' && L.company === 'Bark Avenue', 'email normalized, business taken from the prospect');
ok(L.source === 'cold' && L.prospectId === 'P1' && L.outreachScriptId === 'grooming', 'credited to the cold outreach that found them');
ok(Object.keys(L.history).length === 3 && L.outreach.dm === 100 && L.outreach.text === 200, 'prospect history + last-contacted carried over');
ok(getAt('dm/meta/C1/leadId') === id, 'DM thread links to the lead');
ok(getAt('agencyProspects/P1/status') === 'promoted' && getAt('agencyProspects/P1/leadId') === id, 'prospect marked In pipeline');

// Same person books a call → same lead, Discovery call, follow-up on the call day.
const bk = eventFromBooking('B1', { name: 'Rosa', email: 'rosa@barkavenue.com', callTypeLabel: 'Discovery call', startISO: '2026-10-14T21:00:00Z', source: 'hire_me' });
r = await upsertInboundLead(db, bk, NOW + 1000);
L = getAt('pipelineLeads/' + id);
ok(!r.created && leads().length === 1, 'booking links to the same lead');
ok(L.stage === 'discovery-call' && L.followUpAt === '2026-10-14', 'moves to Discovery call, follow-up = call date (Pacific)');
ok(L.bookingId === 'B1' && getAt('agencyBookings/B1/leadId') === id, 'booking linked both ways');

// A later Hire Me never moves the lead backward.
setAt('pipelineLeads/' + id + '/stage', 'proposal');
await upsertInboundLead(db, Object.assign({}, hm, { message: 'one more question' }), NOW + 2000);
ok(getAt('pipelineLeads/' + id + '/stage') === 'proposal', 'stage never moves backward');

// Contact: first message makes a lead, repeats in the same thread don't.
setAt('dm/meta/C2', { customerName: 'Sam', customerEmail: 'sam@tacos.com' });
const c = await eventFromMessage(db, 'C2', { senderRole: 'customer', source: 'contact', body: 'Do you do menus?' });
await upsertInboundLead(db, c, NOW + 3000);
r = await upsertInboundLead(db, c, NOW + 4000);
ok(leads().length === 2 && r.skipped === 'conversation already linked', 'repeat Contact messages do not pile up');
const sam = leads().find(([, l]) => l.email === 'sam@tacos.com')[1];
ok(sam.source === 'website' && sam.value === 0 && !sam.packageId, 'contact lead: website source, no package');

// Ignored events.
ok(await eventFromMessage(db, 'C2', { senderRole: 'admin', source: 'contact' }) === null, 'admin replies are ignored');
ok(await eventFromMessage(db, 'C2', { senderRole: 'customer', source: 'client-portal' }) === null, 'portal messages are ignored');

// Expired offer → regular price.
data.agencyPricing.packageOffers.website.endsAt = '2026-10-01';
setAt('dm/meta/C3', { customerName: 'Lee', customerEmail: 'lee@x.com' });
await upsertInboundLead(db, await eventFromMessage(db, 'C3', { senderRole: 'customer', source: 'hire-me', package_id: 'website' }), NOW);
const lee = leads().find(([, l]) => l.email === 'lee@x.com')[1];
ok(lee.value === 999 && !lee.packageOfferPrice, 'expired offer falls back to the regular price');

// Server price table matches the site.
const ctx = vm.createContext({ window: {}, document: { querySelectorAll: () => [] }, console, setTimeout });
vm.runInContext(fs.readFileSync('assets/js/care-pricing.js', 'utf8'), ctx);
const site = ctx.window.PackagePricing.PACKAGES;
ok(site.length === Object.keys(PACKAGES).length && site.every(p => PACKAGES[p.id] && PACKAGES[p.id].price === p.price && PACKAGES[p.id].projectType === p.projectType),
  'functions price table matches care-pricing.js PACKAGES');
