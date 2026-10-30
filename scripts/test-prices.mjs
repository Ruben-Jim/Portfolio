#!/usr/bin/env node
/**
 * Editable package prices (care-pricing.js): saved prices override the code
 * defaults, ranges stay ranges, bad values fall back, offers must stay under
 * the new price, and every token / helper reads the live price.
 *
 *   node scripts/test-prices.mjs
 */
import fs from 'node:fs';
import vm from 'node:vm';

let failed = 0;
const ok = (cond, msg, extra) => {
  console.log(`${cond ? '✓' : '✗'} ${msg}${cond || extra === undefined ? '' : '  → ' + JSON.stringify(extra)}`);
  if (!cond) failed++;
};
const SRC = fs.readFileSync('assets/js/care-pricing.js', 'utf8');

/** A fresh care-pricing.js. `stored` is what /agencyPricing holds. */
async function load(stored, opts = {}) {
  const writes = [];
  const sandbox = { console, setTimeout, Promise, Date, Math, JSON, Number, String, Object, Array, isFinite };
  sandbox.window = sandbox;
  if (!opts.noSdk) {
    sandbox.rtdb = {};
    sandbox.rtdbRef = (_d, p) => p;
    sandbox.rtdbGet = async () => ({ val: () => stored });
    sandbox.rtdbUpdate = async (p, patch) => { writes.push({ p, patch }); };
  }
  if (opts.fetch) sandbox.fetch = opts.fetch;
  const ctx = vm.createContext(sandbox);
  vm.runInContext(SRC, ctx);
  await sandbox.PackagePricing.load();
  return { PP: sandbox.PackagePricing, CP: sandbox.CarePricing, win: sandbox, writes };
}

// ——— defaults ———
{
  const { PP } = await load(null);
  ok(PP.packageById('starter').price === 1500, 'no saved prices: code default ($1,500)');
  ok(PP.regularLabel(PP.packageById('linktree')) === '$99–$199', 'ranges keep from–to');
  ok(PP.filesBehind().length === 0, 'nothing behind when live = defaults');
}

// ——— saved prices win, by reference everywhere ———
{
  const { PP, CP, win } = await load({ packagePrices: { starter: { price: 1800 }, linktree: { price: 149, max: 249 } } });
  const fromList = PP.PACKAGES.find((p) => p.id === 'starter');
  ok(PP.packageById('starter').price === 1800 && fromList.price === 1800, 'saved price wins (packageById and PACKAGES)');
  ok(PP.packagePrice('starter') === 1800, 'packagePrice uses it');
  ok(PP.regularLabel(PP.packageById('linktree')) === '$149–$249', 'saved range');
  ok(PP.packagePhrase('starter') === 'our Website + App Package is $1,800', 'outreach phrase follows');
  ok(PP.packageOptionLabel('starter') === 'Website + App Package — $1,800', 'dropdown label follows');
  ok(PP.priceHtml('starter', 'en') === '$1,800', 'Services card price follows');
  const v = CP.i18nVars();
  ok(v.pkg_starter === '$1,800' && v.pkg_linktree === '$149' && v.pkg_linktree_max === '$249' && v.pkg_linktree_range === '$149–$249', 'i18n tokens', v);
  ok(v.pkg_starter_page === '$499' && v.pkg_from === '$499', 'unsaved packages keep defaults; pkg_from = cheapest website package');
  ok(v.pkg_agency_k === '$6k' && v.pkg_agency_max_k === '$12k' && v.pkg_studio_k === '$15k', '"k" shorthand tokens for the big packages', v);
  ok(v.pkg_starter_k === '$1.8k', 'shorthand keeps one decimal when needed', v.pkg_starter_k);
  ok(win.CWR_I18N_VARS.pkg_starter === '$1,800', 'tokens published to CWR_I18N_VARS');
  ok(PP.fill('Choose {pkg_starter} Package · from {pkg_from} · {pkg_nope}') === 'Choose $1,800 Package · from $499 · {pkg_nope}', 'fill() replaces known tokens only');
  const behind = PP.filesBehind();
  ok(behind.length === 2 && behind.some((b) => b.id === 'starter' && b.files === '$1,500' && b.live === '$1,800'), 'filesBehind lists changed packages', behind);
  ok(PP.DEFAULT_PRICES.starter.price === 1500, 'defaults snapshot is untouched');
}

// ——— pkg_from tracks the cheapest website package ———
{
  const { CP } = await load({ packagePrices: { 'starter-page': { price: 599 } } });
  ok(CP.i18nVars().pkg_from === '$599', 'raising Starter raises "from"');
}

// ——— bad stored values fall back ———
{
  const { PP } = await load({ packagePrices: { starter: { price: 'abc' }, growth: { price: -5 }, linktree: { price: 300, max: 200 }, website: { price: 1250.6 }, bogus: { price: 1 } } });
  ok(PP.packageById('starter').price === 1500 && PP.packageById('growth').price === 3500, 'non-numbers and negatives use the default');
  ok(PP.packageById('website').price === 1251, 'fractions round to whole dollars');
  const lt = PP.packageById('linktree');
  ok(lt.price === 300 && !lt.max, 'a "to" at or below "from" is dropped instead of showing a backwards range', lt);
  ok(!PP.packageById('bogus'), 'unknown ids are ignored');
}

// ——— validation ———
{
  const { PP } = await load({ packageOffers: { website: { enabled: true, price: 899 } } });
  const base = PP.normalizePrices(null);
  ok(PP.validatePricing(base, PP.offers).length === 0, 'current prices + offers are valid');
  ok(PP.validatePricing(Object.assign({}, base, { website: { price: 899 } }), PP.offers).some((e) => /Multi-Page Package/.test(e) && /offer/i.test(e)),
    'a new price that is not above the live offer is refused, naming the package');
  ok(PP.validatePricing(Object.assign({}, base, { starter: { price: 0 } }), {}).some((e) => /Website \+ App Package/.test(e)), 'price must be at least $1');
  ok(PP.validatePricing(Object.assign({}, base, { starter: { price: 12.5 } }), {}).some((e) => /whole/.test(e)), 'price must be whole dollars');
  ok(PP.validatePricing(Object.assign({}, base, { agency: { price: 7000, max: 7000 } }), {}).some((e) => /Business Platform/.test(e)), 'a range needs "to" above "from"');
  ok(PP.validatePricing(base, { growth: { enabled: true, price: 4000 } }).some((e) => /Growth Package/.test(e)), 'an offer above the regular price is refused');
  ok(PP.validatePricing(base, { growth: { enabled: false, price: 4000 } }).length === 0, 'a switched-off offer is not checked');
}

// ——— save writes prices and offers together ———
{
  const { PP, writes } = await load(null);
  const prices = PP.normalizePrices({ starter: { price: '1,800' } });
  await PP.savePricing(prices, PP.offers);
  const w = writes[0];
  ok(writes.length === 1 && w.p === 'agencyPricing' && w.patch.packagePrices && w.patch.packageOffers && w.patch.updatedAt, 'one update with prices + offers', w);
  ok(w.patch.packagePrices.starter.price === 1800, '"1,800" saves as 1800');
  ok(PP.packageById('starter').price === 1800, 'live price applied after save');
}

// ——— no Firebase SDK on the page: public REST read ———
{
  let asked = '';
  const fetch = async (url) => { asked = url; return { ok: true, json: async () => ({ packagePrices: { growth: { price: 3900 } } }) }; };
  const { PP } = await load(null, { noSdk: true, fetch });
  ok(/agencyPricing\.json$/.test(asked), 'reads /agencyPricing.json over REST', asked);
  ok(PP.packageById('growth').price === 3900, 'REST prices apply');
}

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
