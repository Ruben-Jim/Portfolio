#!/usr/bin/env node
/**
 * "See examples" on Services & Pricing (assets/js/script.js).
 *   node scripts/test-pricing-examples.mjs
 *
 * Guards: a project or build shows under a package only when it has that
 * package's demo link (Package demos section) and is public. The retired
 * "Show as example on package" field lists nothing. A title or picture alone
 * never picks a package.
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
  'function getPackageDemosForPackage(',
  'function getProjectsForPricingPackage(',
].map(extract).join('\n');

function run(projects, packageId) {
  const window = { portfolioProjects: projects };
  const ctx = {
    window,
    isPortfolioPublic: (p) => !p || String(p.visibility || 'public').toLowerCase() !== 'private',
    cwrText: (k, fallback) => fallback,
    portfolioCoverImageUrl: () => '',
  };
  vm.runInNewContext(code + '\nwindow.result = getProjectsForPricingPackage(' + JSON.stringify(packageId) + ');', ctx);
  return window.result;
}
const examples = (projects, packageId) => run(projects, packageId).map((p) => p.title);

const lawnPlatform = {
  id: 'lawn', title: 'Lawn Care Platform',
  imageUrls: ['/assets/images/projects/lawncare/lawncare-1.webp'],
};
ok(!examples([{ ...lawnPlatform, pricingPackage: 'starter-page' }], 'starter-page').length,
  'the retired "Show as example on package" field lists nothing');
ok(!examples([{ id: 'x', title: 'Ruiz Lawn Care' }], 'starter-page').length,
  'a lawn-care title alone does not pick a package');
ok(!examples([{ id: 'y', title: 'Yard', imageUrl: '/assets/images/projects/lawncare/a.webp' }], 'starter-page').length,
  'a lawn-care image alone does not pick a package');

const template = { id: 't', title: 'Chair & Studio Platform', isTemplate: true, packageDemos: { website: 'https://x--multi-page.expo.app' } };
ok(examples([template], 'website').join() === 'Chair & Studio Platform', 'a project with a Multi-Page demo link is a Multi-Page example');
ok(!examples([template], 'growth').length, '…and only under that package');
ok(examples([{ id: 'n', title: 'Shop', packageDemos: { growth: 'https://shop--growth.expo.app' } }], 'growth').join() === 'Shop',
  'any project can have package demos, not only starter templates');

const pubBuild = { id: 'b1', title: 'Paw Shine', builtFromTemplateId: 'plat', packageDemos: { starter: 'https://pawshine--website-app.expo.app' } };
const privBuild = { id: 'b2', title: 'Sunergy', builtFromTemplateId: 'plat', visibility: 'private', packageDemos: { starter: 'https://sunergy--website-app.expo.app' } };
ok(examples([pubBuild, privBuild], 'starter').join() === 'Paw Shine', 'a public build with a demo link is listed; a private one is not');

const row = run([pubBuild], 'starter')[0];
ok(row.packageId === 'starter' && row.recordId === 'b1' && !row.externalUrl,
  'an example opens the project popup for that package (not a bare link)');

ok(examples([], 'linktree').length === 4, 'Link Tree keeps its 4 built-in examples');
ok(examples([template], 'none').length === 0, 'no examples for a made-up package');
