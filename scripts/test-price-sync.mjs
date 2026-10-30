#!/usr/bin/env node
/**
 * scripts/lib/prices.mjs: every typed package price in the files is a marked
 * copy the sync can rewrite, and nothing else is touched.
 *
 *   node scripts/test-price-sync.mjs
 */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ROOT, loadPricing, loadI18nEn, renderHtml, renderLlms, renderClientDefaults, renderFunctionDefaults,
  staleFiles, unmarkedPrices, readAllowlist
} from './lib/prices.mjs';

let failed = 0;
const ok = (cond, msg, extra) => {
  console.log(`${cond ? '✓' : '✗'} ${msg}${cond || extra === undefined ? '' : '  → ' + JSON.stringify(extra).slice(0, 600)}`);
  if (!cond) failed++;
};

const files = await loadPricing();
const live = await loadPricing({ packagePrices: { starter: { price: 1800 }, 'starter-page': { price: 599 }, agency: { price: 7000, max: 14000 } } });
const en = { 'services.starter_cta': 'Choose {pkg_starter} Package', 'home.price_line': 'Packages from <strong>{pkg_from}</strong> · care from {ess_permo}/mo', 'plain.key': 'No price here' };

// ——— HTML markers ———
{
  const html = [
    '<label for="x" data-price-template="Website + App Package ({pkg_starter}) demo">Website + App Package ($1,500) demo</label>',
    '<meta name="description" content="Packages from $499." data-price-template="Packages from {pkg_from}." data-price-attr="content">',
    '<div class="enterprise-price" data-package-price="agency">$6,000–$12,000</div>',
    '<span data-i18n="services.starter_cta" data-package-cta="starter">Choose $1,500 Package</span>',
    '<p class="cwr-landing-price" data-i18n="home.price_line">Packages from <strong>$499</strong> · care from $44/mo</p>',
    '<p data-i18n="plain.key">Untouched $1,500 figure</p>',
    '<span class="matcher-option-text">Under ~$1,500</span>'
  ].join('\n');
  const out = renderHtml(html, live, en).split('\n');
  ok(out[0].includes('>Website + App Package ($1,800) demo</label>'), 'text template filled', out[0]);
  ok(out[1].includes('content="Packages from $599."'), 'meta attribute template filled', out[1]);
  ok(out[2].includes('>$7,000–$14,000</div>'), 'data-package-price gets the regular label', out[2]);
  ok(out[3].includes('>Choose $1,800 Package</span>'), 'i18n element with a {pkg_} string is rendered', out[3]);
  ok(out[4].includes('Packages from <strong>$599</strong> · care from $44/mo'), 'i18n rendering keeps markup and fills care tokens too', out[4]);
  ok(out[5].includes('Untouched $1,500 figure'), 'i18n strings without {pkg_} tokens are left alone');
  ok(out[6].includes('Under ~$1,500'), 'unmarked figures are never rewritten');
  ok(renderHtml(renderHtml(html, live, en), live, en) === renderHtml(html, live, en), 'rendering twice changes nothing');
  const filePrice = files.PP.regularLabel(files.PP.packageById('starter'));
  ok(renderHtml(html, files, en).split('\n')[3].includes('Choose ' + filePrice + ' Package'), 'with the file prices it renders what the files say');
}

// ——— llms.txt ———
{
  const txt = '> Packages are fixed-price from $499, and…\n- **Website + App Package — $1,500** (~2–3 weeks)\n- **Business Platform — $6,000–$12,000** (scoped)\n- Budget under ~$1,500? Ask.';
  const out = renderLlms(txt, live);
  ok(out.includes('fixed-price from $599'), 'llms.txt "from" phrase');
  ok(out.includes('**Website + App Package — $1,800**') && out.includes('**Business Platform — $7,000–$14,000**'), 'llms.txt package bullets by name');
  ok(out.includes('under ~$1,500?'), 'llms.txt leaves other figures');
}

// ——— defaults tables ———
{
  const cp = readFileSync(join(ROOT, 'assets/js/care-pricing.js'), 'utf8');
  const out = renderClientDefaults(cp, live);
  ok(/\{ id: 'starter', name: 'Website \+ App Package', price: 1800,/.test(out) && /\{ id: 'agency', [^\n]*price: 7000, max: 14000,/.test(out), 'care-pricing.js defaults rewritten');
  ok(renderClientDefaults(cp, files) === cp, 'care-pricing.js defaults match the file prices today');
  const fn = readFileSync(join(ROOT, 'functions/inbound-leads.js'), 'utf8');
  const fnOut = renderFunctionDefaults(fn, live);
  ok(/\n  starter: \{ name: "Website \+ App Package", price: 1800,/.test(fnOut) && /\n  "starter-page": \{ name: "Starter Package", price: 599,/.test(fnOut), 'Cloud Function defaults rewritten');
  ok(renderFunctionDefaults(fn, files) === fn, 'Cloud Function defaults match the file prices today');
}

// ——— guard, on a scratch tree ———
{
  const root = mkdtempSync(join(tmpdir(), 'price-guard-'));
  mkdirSync(join(root, 'assets/js'), { recursive: true });
  mkdirSync(join(root, 'examples'), { recursive: true });
  writeFileSync(join(root, 'index.html'), '<script src="/assets/js/script.js?v=1"></script>\n<p data-price-template="Growth {pkg_growth}">Growth $3,500</p>\n<p>Hand-typed Growth $3,500 here</p>\n<p>Under ~$1,500</p>\n');
  writeFileSync(join(root, 'llms.txt'), '- **Growth Package — $3,500** (3–4 weeks)\n');
  writeFileSync(join(root, 'assets/js/x.js'), "var a = 'Agencies charge $15k–$40k'; var b = 'Growth is $3500 flat';\n");
  const hits = unmarkedPrices(files, en, [{ text: 'Under ~$1,500' }, { text: '$15k–$40k', file: 'assets/js/x.js' }], root);
  const where = hits.map((h) => h.file + ':' + h.line + ' ' + h.figure);
  ok(where.includes('index.html:3 $3,500') && where.includes('assets/js/x.js:1 $3500'), 'hand-typed prices are caught (with or without the comma)', where);
  ok(!where.some((w) => /index\.html:2|llms\.txt|\$1,500|\$15k/.test(w)), 'marked copies, llms bullets and allowlisted text pass', where);
}

// ——— the repo itself ———
{
  const realEn = loadI18nEn();
  const stale = staleFiles(files, realEn);
  ok(stale.length === 0, 'every typed copy in the repo matches the file prices', stale.slice(0, 5));
  const hits = unmarkedPrices(files, realEn, readAllowlist());
  ok(hits.length === 0, 'no package price is typed outside a marker', hits.slice(0, 8));
}

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
