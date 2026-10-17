#!/usr/bin/env node
/**
 * Homepage "Trusted by local businesses" spotlight (assets/js/script.js).
 *   node scripts/test-landing-spotlight.mjs
 *
 * Guards: only real projects admin ticked "Show on homepage" appear (no
 * built-in placeholder clients), each slide gets a short summary from the
 * project's Outcome (else Description), and the client logo field only
 * accepts a site asset path or an https URL.
 */
import fs from 'node:fs';
import vm from 'node:vm';

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };

const src = fs.readFileSync(new URL('../assets/js/script.js', import.meta.url), 'utf8');

// Pull one top-level declaration out of script.js by brace counting.
function extract(head) {
  const start = src.indexOf(head);
  if (start < 0) throw new Error(`script.js has no "${head}"`);
  if (/^var [A-Z_]+ = \d/.test(head)) return src.slice(start, src.indexOf(';', start) + 1);
  let depth = 0;
  for (let i = src.indexOf('{', start); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(start, i + 1);
  }
  throw new Error(`unbalanced braces after "${head}"`);
}

ok(!/LANDING_SOCIAL_PROOF_SPOTLIGHT\s*=/.test(src), 'the hard-coded placeholder clients are gone');

const ctx = {};
vm.runInNewContext([
  'function isPortfolioPublic(',
  'var LANDING_SPOTLIGHT_MAX = ',
  'var LANDING_SPOTLIGHT_SUMMARY_MAX = ',
  'function portfolioSanitizeLogoUrl(',
  'function landingSpotlightProjects(',
  'function landingSpotlightSummary(',
].map(extract).join('\n') + '\nthis.api = { portfolioSanitizeLogoUrl, landingSpotlightProjects, landingSpotlightSummary, LANDING_SPOTLIGHT_MAX };', ctx);
const { portfolioSanitizeLogoUrl: logo, landingSpotlightProjects: pick, landingSpotlightSummary: summary, LANDING_SPOTLIGHT_MAX: MAX } = ctx.api;

// Which projects show
const list = [
  { id: 'a', title: 'ProCleaning Seattle', homeSpotlight: true },
  { id: 'b', title: 'Not ticked' },
  { id: 'c', title: 'Ticked but private', homeSpotlight: true, visibility: 'private' },
  { id: 'd', title: 'Shelton Springs HOA', homeSpotlight: true },
  { id: 'e', title: 'Truthy string is not a tick', homeSpotlight: 'true' },
];
ok(pick(list).map((p) => p.id).join() === 'a,d', 'only public projects ticked "Show on homepage", in portfolio order');
ok(pick([]).length === 0 && pick(null).length === 0, 'nothing ticked → nothing to show');
ok(pick(Array.from({ length: 12 }, (_, i) => ({ id: 'p' + i, homeSpotlight: true }))).length === MAX, `at most ${MAX} slides`);

// Summary line
ok(summary({ outcome: 'Crews see every job in one app.', description: 'An app.' }) === 'Crews see every job in one app.', 'uses Outcome first');
ok(summary({ outcome: '  ', description: 'Board portal for an HOA.' }) === 'Board portal for an HOA.', 'falls back to Description');
ok(summary({ outcome: 'First paragraph\nwraps here.\n\nSecond paragraph.' }) === 'First paragraph wraps here.', 'first paragraph only, line breaks joined');
const long = summary({ outcome: 'word '.repeat(80) });
ok(long.length <= 181 && long.endsWith('…') && !/\s…$/.test(long), `long text is cut on a word with … (${long.length} chars)`);
ok(summary({}) === '' && summary(null) === '', 'no text → empty');

// Client logo field
ok(logo('/assets/images/logo/logo-3-color.png') === '/assets/images/logo/logo-3-color.png', 'site asset path is kept');
ok(logo('./assets/images/logo/logo-2-color.png') === '/assets/images/logo/logo-2-color.png', './assets path becomes /assets');
ok(logo('assets/images/logo/logo-1-color.png') === '/assets/images/logo/logo-1-color.png', 'assets path without slash becomes /assets');
ok(logo('https://cdn.example.com/logo.png') === 'https://cdn.example.com/logo.png', 'https URL is kept');
for (const bad of ['javascript:alert(1)', 'http://example.com/logo.png', 'data:image/png;base64,AAA', '/assets/x" onerror="alert(1)', '//evil.com/x.png', 'https://x.com/a b.png', '']) {
  ok(logo(bad) === '', `rejects ${JSON.stringify(bad)}`);
}
ok(logo('/assets/' + 'a'.repeat(600)) === '', 'rejects over 500 characters');
