#!/usr/bin/env node
/**
 * Bring every typed package price in the site files up to the live prices.
 *
 * Prices are edited in the admin Pricing tab and go live on the site at once.
 * The files carry typed copies (llms.txt, the text a crawler reads before
 * scripts run, the defaults in care-pricing.js and the leads Cloud Function);
 * this rewrites all of them from /agencyPricing, then re-stamps the page
 * shells. The pre-push check fails until it has run after a price change.
 *
 *   node scripts/sync-prices.mjs
 *
 * See scripts/lib/prices.mjs for what counts as a typed copy.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, fetchLive, loadPricing, loadI18nEn, targets, renderTarget, staleFiles } from './lib/prices.mjs';

let stored;
try {
  stored = await fetchLive();
} catch (err) {
  console.error('✗ Could not read the live prices (' + (err && err.message) + '). Nothing was changed.');
  process.exit(1);
}

const live = await loadPricing(stored || {});
const before = await loadPricing();
const changes = live.PP.PACKAGES.filter((p) => {
  const d = before.PP.packageById(p.id);
  return d.price !== p.price || (d.max || 0) !== (p.max || 0);
});
console.log(changes.length
  ? 'Live prices: ' + changes.map((p) => p.name + ' ' + before.PP.regularLabel(before.PP.packageById(p.id)) + ' → ' + live.PP.regularLabel(p)).join(', ')
  : 'Live prices match the files\' defaults.');

// Defaults first: the shell stamper reads care-pricing.js.
const en = loadI18nEn();
const written = [];
for (const t of targets()) {
  if (t.file !== 'index.html' && t.kind === 'html' && /(^|\/)index\.html$/.test(t.file) && !t.file.startsWith('examples/')) continue; // shells: copied below
  const path = join(ROOT, t.file);
  const src = readFileSync(path, 'utf8');
  const out = renderTarget(t, src, live, en);
  if (out !== src) {
    writeFileSync(path, out);
    written.push(t.file);
  }
}

const shells = spawnSync(process.execPath, [join(ROOT, 'scripts/sync-spa-shells.mjs')], { cwd: ROOT, encoding: 'utf8' });
if (shells.status !== 0) {
  console.error(shells.stdout + shells.stderr);
  console.error('✗ sync-spa-shells.mjs failed after the price update.');
  process.exit(1);
}

const stale = staleFiles(await loadPricing(), loadI18nEn());
if (stale.length) {
  console.error('✗ Still out of date:');
  for (const s of stale) console.error(`  ${s.file}:${s.line}\n    has:  ${s.has}\n    want: ${s.want}`);
  process.exit(1);
}

console.log(written.length ? 'Updated: ' + written.join(', ') + ' (+ the page shells)' : 'No file needed a change.');
if (written.includes('functions/inbound-leads.js')) {
  console.log('Note: functions/inbound-leads.js changed (its fallback prices). Once the version that reads /agencyPricing/packagePrices is deployed, new leads use the live price without another deploy.');
}
console.log('✓ Prices in the files match the live prices. Commit and push as usual.');
