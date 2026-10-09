#!/usr/bin/env node
/**
 * Outreach composer — package line + Link Tree line. Run from the repo root:
 *   node scripts/test-outreach-pricing-blocks.mjs
 *
 * Guards: legacy saved scripts get the block tokens, the package line follows
 * the Package picker (summary by default, offer-first when asked), the Link
 * Tree line follows its checkbox, hand edits survive control changes, and a
 * saved edit never loses the block tokens.
 */
import fs from 'node:fs';
import vm from 'node:vm';

function mkEl(id, tag = 'div') {
  return {
    id, tagName: tag, value: '', textContent: '', innerHTML: '',
    hidden: false, disabled: false, checked: false, className: '', children: [],
    _listeners: {},
    addEventListener(ev, fn) { (this._listeners[ev] ||= []).push(fn); },
    setAttribute() {}, appendChild(c) { this.children.push(c); },
    click() { (this._listeners.click || []).forEach(f => f()); },
    input() { (this._listeners.input || []).forEach(f => f()); },
    change() { (this._listeners.change || []).forEach(f => f()); },
    focus() {},
    classList: { toggle() {}, add() {}, remove() {} },
    closest() { return null; },
    querySelector() { return null; }
  };
}

const ids = ['outreach-composer', 'outreach-script-select', 'outreach-steps', 'outreach-preview', 'outreach-warn',
  'outreach-count', 'outreach-script-meta', 'outreach-status', 'outreach-var-name', 'outreach-var-company',
  'outreach-var-city', 'outreach-var-demo', 'outreach-var-phone', 'outreach-var-email', 'outreach-var-package',
  'outreach-copy', 'outreach-text', 'outreach-email', 'outreach-call', 'outreach-script-menu', 'outreach-ads',
  'outreach-ads-wrap', 'outreach-ask', 'outreach-ask-text', 'outreach-ask-actions', 'outreach-lead-status',
  'outreach-pricing-blocks', 'outreach-offer-wrap', 'outreach-offer-lead', 'outreach-offer-hint',
  'outreach-offer-lead-row', 'outreach-offer-lead-select', 'outreach-offer-lead-custom-wrap',
  'outreach-offer-lead-custom', 'outreach-linktree-wrap', 'outreach-linktree', 'outreach-offer-oneoff',
  'outreach-offer-oneoff-note', 'outreach-offer-price', 'outreach-offer-spots', 'outreach-offer-ends'];
const store = Object.fromEntries(ids.map(i => [i, mkEl(i, i === 'outreach-preview' ? 'textarea' : 'div')]));
store['outreach-var-package'].value = 'website';

const seedSrc = fs.readFileSync('assets/js/outreach-scripts-seed.js', 'utf8');

// A saved no-site-ig from before the change: package + Link Tree as plain text.
const LEGACY_TEXT =
  'Hey! I’m Ruben with @codewithruben. Noticed [Company] doesn’t have a website up yet. Let me know if you’d want to see a mockup!' +
  '\n\nFor reference, [package], with your first month of care included.' +
  '\n\nNot ready for a full site? I also build a custom link page for your Instagram bio (a branded Linktree), live in a few days from $99: rubenjimenez.dev/link-in-bio';

let scripts = null;
// Live offer on Business Website only; Starter Presence has none.
const pricing = { packageOffers: { website: { enabled: true, price: 499, spots: 5, claimed: 2 } } };

const sandbox = {
  console,
  localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } },
  document: {
    head: { appendChild(s) { vm.runInContext(seedSrc, ctx); s.onload(); } },
    getElementById: id => store[id] || null,
    createElement: t => mkEl('', t),
    querySelectorAll: () => []
  },
  setTimeout,
  setBusinessDocSelectOptions(hidden, options, opts) {
    if (hidden && opts && opts.value != null) hidden.value = String(opts.value);
  },
  setBusinessDocSelectValue(hidden, value) { if (hidden) hidden.value = value == null ? '' : String(value); },
  initBusinessDocCustomSelects() {},
  syncBusinessDocSelectUI() {}
};
sandbox.window = sandbox;
sandbox.navigator = { clipboard: { writeText: async () => {} } };
sandbox.rtdb = {};
sandbox.rtdbRef = (_d, p) => p;
sandbox.rtdbGet = async p => ({ val: () => (String(p).startsWith('agencyPricing') ? pricing : scripts) });
sandbox.rtdbSet = async (_p, v) => { scripts = v; };
sandbox.rtdbUpdate = async (p, patch) => {
  if (String(p).startsWith('agencyOutreachScripts/')) {
    const id = p.split('/')[1];
    scripts[id] = Object.assign({}, scripts[id], patch);
  } else if (p === 'agencyOutreachScripts') {
    scripts = Object.assign({}, scripts, patch);
  }
};

const ctx = vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('assets/js/care-pricing.js', 'utf8'), ctx);
await sandbox.PackagePricing.load();

// Seed RTDB from the seed file, then swap in the legacy copy of no-site-ig.
vm.runInContext(seedSrc, ctx);
scripts = {};
for (const s of sandbox.OUTREACH_SCRIPT_SEEDS) {
  scripts[s.id] = { label: s.label, tag: s.tag, vertical: s.vertical, demoLink: s.demoLink, order: s.order,
    text: s.text, subject: s.subject, email: s.email, call: s.call };
}
scripts['no-site-ig'].text = LEGACY_TEXT;

vm.runInContext(fs.readFileSync('assets/js/outreach-composer.js', 'utf8'), ctx);

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };
const body = () => store['outreach-preview'].value;
const pick = id => { store['outreach-script-select'].value = id; store['outreach-script-select'].change(); };

await sandbox.window.CWR_OUTREACH.open();
store['outreach-var-company'].value = 'Shack In The Back Grooming';
store['outreach-var-company'].input();

pick('no-site-ig');
ok(!body().includes('For reference,'), 'legacy package sentence replaced by the package line');
ok(body().includes('Business Website — $499 (normally $999): 1–3 pages, live chat, gallery, SEO, hosting, and a branded Link Tree. First month of care included.'),
  'package line shows price + what is included (with the live offer price)');
ok(store['outreach-linktree'].checked === true && store['outreach-linktree-wrap'].hidden === false,
  'Link Tree checkbox shown and checked on a no-website script');
ok(body().includes('Not ready for a full site? Our Link Tree package runs $99–$199, with your first month of care included. Example: rubenjimenez.dev/link-in-bio'),
  'Link Tree line uses the agreed wording + example link');
ok(!/\[(package line|link tree line)\]/.test(body()), 'no block tokens left in the message');

store['outreach-linktree'].checked = false;
store['outreach-linktree'].change();
ok(!body().includes('Link Tree package runs'), 'unchecking removes the Link Tree line');
ok(!/\n{3,}/.test(body()) && !/\s$/.test(body()), 'no leftover blank lines when a block is removed');

store['outreach-var-package'].value = 'linktree';
store['outreach-var-package'].change();
ok(store['outreach-linktree-wrap'].hidden === true, 'Link Tree checkbox hidden when Link Tree is the package');
ok(body().includes('Link Tree — $99–$199: a branded link-in-bio page'), 'package line follows the picker');

// Offer-first: unavailable without an offer, then live once one exists.
store['outreach-var-package'].value = 'starter';
store['outreach-var-package'].change();
ok(store['outreach-offer-lead'].disabled === false, 'Lead with the offer can be checked with no live offer');
ok(body().includes('Starter Presence — $1,500: everything in Business Website'), 'regular price when no offer');
store['outreach-offer-lead'].checked = true;
store['outreach-offer-lead'].change();
ok(store['outreach-offer-oneoff'].hidden === false, 'one-off offer fields appear when there is no live offer');
ok(body().includes('Starter Presence — $1,500:'), 'no one-off price yet → regular line stays');
ok(/below \$1,500/.test(store['outreach-offer-oneoff-note'].textContent), 'note asks for a price below the regular one');
store['outreach-offer-price'].value = '1800';
store['outreach-offer-price'].input();
ok(body().includes('Starter Presence — $1,500:'), 'a price above regular is ignored');
store['outreach-offer-price'].value = '1200';
store['outreach-offer-spots'].value = '3';
store['outreach-offer-ends'].value = '2026-11-30';
store['outreach-offer-ends'].change();
ok(body().includes('This month only: our Starter Presence package is $1,200 (normally $1,500) until Nov 30 or for the next 3 clients, whichever comes first. First month of care included.'),
  'one-off offer line uses price, spots and end date');
store['outreach-offer-lead'].checked = false;
store['outreach-offer-lead'].change();
ok(body().includes('Starter Presence — $1,500:'), 'unchecking drops the one-off offer');
store['outreach-var-package'].value = 'website';
store['outreach-var-package'].change();
ok(store['outreach-offer-lead'].disabled === false, 'Lead with the offer enabled once an offer is live');
ok(body().includes('Business Website — $499 (normally $999): 1–3 pages'), 'summary line shows the offer price');
store['outreach-offer-lead'].checked = true;
store['outreach-offer-lead'].change();
ok(store['outreach-offer-lead-row'].hidden === false, 'lead-in dropdown appears');
ok(store['outreach-offer-oneoff'].hidden === true, 'one-off fields hidden when a live offer exists');
ok(body().includes('This month only: our Business Website package is $499 (normally $999) for the next 3 clients. First month of care included.'),
  'offer-first line with default lead-in');
store['outreach-offer-lead-select'].value = '__custom';
store['outreach-offer-lead-select'].change();
store['outreach-offer-lead-custom'].value = 'For my first Hesperia clients';
store['outreach-offer-lead-custom'].input();
ok(body().includes('For my first Hesperia clients: our Business Website package is $499'), 'custom lead-in used');

// Hand edit survives a control change; only the generated line swaps.
store['outreach-preview'].value = body().replace('Hey!', 'Hey there!');
store['outreach-preview'].input();
store['outreach-offer-lead'].checked = false;
store['outreach-offer-lead'].change();
ok(body().startsWith('Hey there!'), 'hand edit kept when a pricing control changes');
ok(body().includes('Business Website — $499 (normally $999): 1–3 pages'), 'generated line swapped inside the edited message');

// Saving that edit with Link Tree off keeps both tokens in the template.
const ask = sandbox.document.getElementById('outreach-ask-actions');
pick('no-site-ig-trades');          // triggers "Keep this edit?"
await new Promise(r => setTimeout(r, 0));
const update = ask.children.find(b => b.textContent === 'Update this script');
ok(!!update, 'edit prompt offers Update this script');
update.click();
await new Promise(r => setTimeout(r, 0));
const saved = scripts['no-site-ig'].text;
ok(saved.startsWith('Hey there!'), 'edit saved to the script');
ok(saved.includes('[package line]') && saved.includes('[link tree line]'), 'saved template keeps both block tokens');
ok(!saved.includes('$499') && !saved.includes('Link Tree package runs'), 'no hard-coded prices saved into the template');

// Call step keeps its spoken [package] phrase; vertical scripts stay untouched.
pick('no-site-ig');
store['outreach-steps'].children[3].click();
ok(body().includes('"For reference, our Business Website package is $499 (normally $999)'), 'call step still uses the spoken [package] phrase');
ok(store['outreach-pricing-blocks'].hidden === true, 'pricing controls hidden on the call step');
store['outreach-steps'].children[0].click();
pick('restaurant');
ok(store['outreach-pricing-blocks'].hidden === true, 'pricing controls hidden on scripts without the blocks');
