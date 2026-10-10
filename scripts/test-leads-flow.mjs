#!/usr/bin/env node
/**
 * Prospects ↔ Outreach Scripts ↔ Leads Pipeline, end to end on an in-memory
 * RTDB. Run from the repo root:
 *   node scripts/test-leads-flow.mjs
 *
 * Guards: a cold send saves a Contacted prospect (never a lead), a repeat
 * send logs on that prospect, a send to an existing lead logs on the lead,
 * and "They replied → Add to Leads" promotes with the history carried over.
 */
import fs from 'node:fs';
import vm from 'node:vm';

// ——— tiny RTDB ———
let db = {};
const listeners = [];
const parts = p => String(p).split('/').filter(Boolean);
function getAt(p) { return parts(p).reduce((o, k) => (o == null ? undefined : o[k]), db); }
function setAt(p, v) {
  const ks = parts(p); let o = db;
  ks.slice(0, -1).forEach(k => { if (o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; });
  if (v === null) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = JSON.parse(JSON.stringify(v));
}
function fire() { listeners.forEach(l => l.cb({ val: () => JSON.parse(JSON.stringify(getAt(l.path) ?? null)) })); }
let pushN = 0;

function mkEl(id, tag = 'div') {
  return {
    id, tagName: tag, value: '', textContent: '', innerHTML: '', title: '',
    hidden: false, disabled: false, checked: false, className: '', children: [], dataset: {},
    _listeners: {},
    addEventListener(ev, fn) { (this._listeners[ev] ||= []).push(fn); },
    setAttribute() {}, appendChild(c) { this.children.push(c); }, insertBefore(c) { this.children.push(c); },
    click() { (this._listeners.click || []).forEach(f => f({ target: this, preventDefault() {} })); },
    input() { (this._listeners.input || []).forEach(f => f()); },
    change() { (this._listeners.change || []).forEach(f => f()); },
    focus() {}, classList: { toggle() {}, add() {}, remove() {} },
    closest() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; }
  };
}
const store = {};
const el = id => (store[id] ||= mkEl(id, id === 'outreach-preview' ? 'textarea' : 'div'));
['outreach-composer', 'outreach-preview', 'outreach-steps', 'outreach-add-lead', 'outreach-ask', 'outreach-ask-text',
  'outreach-ask-actions', 'outreach-lead-status', 'outreach-var-name', 'outreach-var-company', 'outreach-var-phone',
  'outreach-var-email', 'outreach-var-city', 'outreach-var-demo', 'outreach-var-package', 'outreach-script-select'].forEach(el);
store['outreach-var-package'].value = 'website';

const seedSrc = fs.readFileSync('assets/js/outreach-scripts-seed.js', 'utf8');
const sandbox = {
  console, setTimeout, Date, JSON, Promise,
  localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } },
  document: {
    head: { appendChild(s) { vm.runInContext(seedSrc, ctx); s.onload(); } },
    getElementById: id => store[id] || null,
    createElement: t => mkEl('', t),
    querySelectorAll: () => [],
    addEventListener() {}, dispatchEvent() {}
  },
  CustomEvent: function () {},
  setBusinessDocSelectOptions(h, o, opts) { if (h && opts && opts.value != null) h.value = String(opts.value); },
  setBusinessDocSelectValue(h, v) { if (h) h.value = v == null ? '' : String(v); },
  initBusinessDocCustomSelects() {}, syncBusinessDocSelectUI() {},
  isAdminSession: () => true,
  navigator: { clipboard: { writeText: async () => {} } },
  rtdb: {},
  rtdbRef: (_d, p) => p,
  rtdbGet: async p => ({ val: () => JSON.parse(JSON.stringify(getAt(p) ?? null)) }),
  rtdbSet: async (p, v) => { setAt(typeof p === 'object' ? p.path : p, v); fire(); },
  rtdbUpdate: async (p, patch) => { Object.keys(patch).forEach(k => setAt(p + '/' + k, patch[k])); fire(); },
  rtdbPush: p => { const key = 'k' + (++pushN).toString().padStart(3, '0'); return { key, path: p + '/' + key, toString() { return this.path; } }; },
  rtdbOnValue: (p, cb) => { listeners.push({ path: p, cb }); cb({ val: () => JSON.parse(JSON.stringify(getAt(p) ?? null)) }); return () => {}; },
  rtdbServerTimestamp: () => Date.now()
};
sandbox.window = sandbox; sandbox.self = sandbox;
// rtdbSet gets a push ref object; normalize.
const rawSet = sandbox.rtdbSet;
sandbox.rtdbSet = async (p, v) => rawSet(typeof p === 'object' ? p.path : p, v);

const ctx = vm.createContext(sandbox);
for (const f of ['lead-match.js', 'care-pricing.js', 'prospects.js', 'outreach-composer.js']) {
  vm.runInContext(fs.readFileSync('assets/js/' + f, 'utf8'), ctx);
}

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };
const tick = () => new Promise(r => setTimeout(r, 0));
const status = () => store['outreach-lead-status'].textContent;
async function save() { store['outreach-add-lead'].click(); for (let i = 0; i < 6; i++) await tick(); }
function fill(v) { for (const [k, val] of Object.entries(v)) store['outreach-var-' + k].value = val; }

await sandbox.CWR_OUTREACH.open();
ok(store['outreach-add-lead'].textContent === 'Save', 'opened on its own: button says Save');

// 1. Cold send to a brand-new business → Contacted prospect, not a lead.
fill({ name: 'Rosa', company: 'Bark Avenue', phone: '(559) 555-0142', email: '', city: 'Fresno' });
await save();
let prospects = Object.values(getAt('agencyProspects') || {});
ok(prospects.length === 1 && prospects[0].business === 'Bark Avenue', 'new business saved as a prospect');
ok(prospects[0].status === 'working' && Object.keys(prospects[0].touches || {}).length === 1, 'prospect is Contacted with one touch');
ok(!getAt('pipelineLeads'), 'no pipeline lead created for a cold send');
ok(/Saved “Bark Avenue” to Prospects/.test(status()), 'status says it went to Prospects');

// 2. Same business again (different format) → logged on that prospect.
fill({ name: '', company: 'bark avenue', phone: '559.555.0142', email: '', city: '' });
await save();
prospects = Object.values(getAt('agencyProspects') || {});
ok(prospects.length === 1 && Object.keys(prospects[0].touches).length === 2, 'repeat send logs a second touch, no duplicate');

// 3. An existing lead → touch logged on the lead.
setAt('pipelineLeads/L1', { name: 'Ana', company: 'Shack In The Back', email: 'ana@shack.com', stage: 'discovery-call', outreach: { email: 5 } });
fill({ name: 'Ana', company: '', phone: '', email: 'ANA@shack.com', city: '' });
await save();
const L1 = getAt('pipelineLeads/L1');
ok(L1.outreach.text > 5 && L1.outreach.email === 5, 'lead outreach gets the new text stamp, keeps the old');
ok(Object.values(L1.history || {}).some(h => h.from === 'outreach'), 'lead history records the send');
ok(L1.stage === 'discovery-call', 'lead stage unchanged');
ok(Object.values(getAt('agencyProspects')).length === 1, 'no prospect created for an existing lead');

// 4. Opened from the prospect → "They replied → Add to Leads" promotes with history.
const pid = Object.keys(getAt('agencyProspects'))[0];
await sandbox.CWR_OUTREACH.prefill({ prospectId: pid, company: 'Bark Avenue', scriptId: 'grooming' });
ok(store['outreach-add-lead'].textContent === 'They replied → Add to Leads', 'from a prospect: button offers Add to Leads');
await save();
const p = getAt('agencyProspects/' + pid);
const lead = getAt('pipelineLeads/' + p.leadId);
ok(p.status === 'promoted' && !!lead, 'prospect promoted and linked to a new lead');
ok(lead.prospectId === pid && lead.stage === 'lead' && lead.source === 'cold', 'lead links back to the prospect');
ok(Object.keys(lead.history || {}).length === 3, 'lead history carries both texts + the reply');
ok(lead.outreach && lead.outreach.text > 0, 'lead last-contacted carries over');
ok(lead.packageId === 'website' && lead.value > 0, 'package from the composer lands on the lead');
ok(store['outreach-add-lead'].textContent === 'In Leads Pipeline' && store['outreach-add-lead'].disabled, 'button shows it is already in the pipeline');
