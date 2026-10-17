#!/usr/bin/env node
/**
 * "See examples" on Services & Pricing (assets/js/script.js).
 *   node scripts/test-pricing-examples.mjs
 *
 * Guards: a portfolio project shows under a package only when admin picked
 * that package. "None" means none, even for a lawn-care title or image.
 */
import fs from 'node:fs';
import vm from 'node:vm';

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };

const src = fs.readFileSync(new URL('../assets/js/script.js', import.meta.url), 'utf8');

// Pull one top-level declaration out of script.js by brace counting.
function extract(head) {
  const start = src.indexOf(head);
  if (start < 0) throw new Error(`script.js has no "${head}"`);
  let depth = 0;
  for (let i = src.indexOf('{', start); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(start, i + 1) + (head.startsWith('var ') ? ';' : '');
  }
  throw new Error(`unbalanced braces after "${head}"`);
}

const code = [
  'var PRICING_PACKAGE_STATIC_EXAMPLES = ',
  'function sanitizePricingPackage(',
  'function getPortfolioPricingPackage(',
  'function getTemplateDemosForPackage(',
  'function getProjectsForPricingPackage(',
].map(extract).join('\n');

function examples(projects, packageId) {
  const window = { portfolioProjects: projects };
  const ctx = {
    window,
    isPortfolioPublic: (p) => !p || String(p.visibility || 'public').toLowerCase() !== 'private',
    cwrText: (k, fallback) => fallback,
  };
  vm.runInNewContext(code + '\nwindow.result = getProjectsForPricingPackage(' + JSON.stringify(packageId) + ');', ctx);
  return window.result.map((p) => p.title);
}

const lawnPlatform = {
  id: 'lawn', title: 'Lawn Care Platform', pricingPackage: '',
  imageUrls: ['/assets/images/projects/lawncare/lawncare-1.webp'],
};
ok(!examples([lawnPlatform], 'starter-page').includes('Lawn Care Platform'),
  'lawn-care project set to None is not a Starter example');
ok(!examples([{ id: 'x', title: 'Ruiz Lawn Care' }], 'starter-page').length,
  'a lawn-care title alone does not pick a package');
ok(!examples([{ id: 'y', title: 'Yard', imageUrl: '/assets/images/projects/lawncare/a.webp' }], 'starter-page').length,
  'a lawn-care image alone does not pick a package');

ok(examples([{ ...lawnPlatform, pricingPackage: 'starter-page' }], 'starter-page').join() === 'Lawn Care Platform',
  'picking Starter still lists it under Starter');
ok(!examples([{ ...lawnPlatform, pricingPackage: 'starter-page' }], 'website').length,
  '…and only under Starter');
ok(examples([{ id: 'z', title: 'Shop', pricingPackage: ' Website ' }], 'website').join() === 'Shop',
  'package ids are trimmed and case-insensitive');
ok(!examples([{ id: 'w', title: 'Shop', pricingPackage: 'enterprise' }], 'website').length,
  'unknown package ids count as None');

const demo = { id: 't', title: 'Chair & Studio Platform', isTemplate: true, pricingPackage: 'website', packageDemos: { website: 'https://x--website-app.expo.app' } };
const titles = examples([demo], 'website');
ok(titles.length === 1 && titles[0] === 'Chair & Studio Platform', 'a template with a live demo is listed once, not twice');

ok(examples([], 'linktree').length === 4, 'Link Tree keeps its 4 built-in examples');
ok(examples([lawnPlatform], 'none').length === 0, 'no examples for a made-up package');
