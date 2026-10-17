#!/usr/bin/env node
/**
 * Short testimonial links (index.html <script id="review-link-redirect">).
 *   node scripts/test-review-link.mjs
 *
 * Guards: rubenjimenez.dev/review/<code> sends the visitor to the testimonial
 * form with that code, look-alike paths don't, and new codes are 8 characters
 * from an alphabet the Firestore rules accept, with no look-alike characters.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const m = html.match(/<script id="review-link-redirect">([\s\S]*?)<\/script>/);
ok(!!m, 'index.html has the review-link script');
if (!m) process.exit();
ok(html.indexOf('id="review-link-redirect"') < html.indexOf('<script src='), 'it runs before any other script loads');

function run(pathname) {
  const replaced = [];
  const win = { location: { pathname, replace: (u) => replaced.push(u) }, crypto: webcrypto };
  vm.runInNewContext(m[1], { window: win });
  return { replaced, api: win.CwrReviewLink };
}

let r = run('/review/Ab3dK9xQ');
ok(r.replaced.join() === '/testimonial.html?token=Ab3dK9xQ', '/review/<code> opens the form with that code');
ok(run('/review/Ab3dK9xQ/').replaced.length === 1, 'trailing slash is fine');
ok(run('/review/6f3ec391-1060-4ab5-ac8a-bbd5adc6f73f').replaced.length === 1, 'old long codes work through /review/ too');
for (const p of ['/', '/reviews/Ab3dK9xQ', '/review/', '/review/short', '/review/Ab3d K9xQ', '/review/Ab3dK9xQ/extra', '/review/<script>', '/testimonials']) {
  ok(run(p).replaced.length === 0, `no redirect for ${JSON.stringify(p)}`);
}

const api = run('/').api;
const codes = Array.from({ length: 3000 }, () => api.newCode());
ok(codes.every((c) => /^[A-Za-z0-9-]{8,48}$/.test(c)), 'codes match the Firestore rule pattern');
ok(codes.every((c) => c.length === 8), 'codes are 8 characters');
ok(codes.every((c) => !/[0O1lI]/.test(c)), 'no look-alike characters (0 O 1 l I)');
ok(new Set(codes).size === codes.length, '3000 codes, no repeats');
ok(new Set(codes.join('')).size >= 50, 'uses (nearly) the whole alphabet');
ok(api.codeFromPath('/review/Ab3dK9xQ') === 'Ab3dK9xQ' && api.codeFromPath('/about') === '', 'codeFromPath');

// GitHub Pages serves 404.html (built from assets/templates/site-404.html) for
// /review/<code>, so it must carry the same script, word for word.
for (const f of ['assets/templates/site-404.html', '404.html']) {
  const other = fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
  const om = other.match(/<script id="review-link-redirect">([\s\S]*?)<\/script>/);
  ok(!!om && om[1] === m[1], `${f} has the same review-link script`);
  ok(!!om && other.indexOf('id="review-link-redirect"') < (other.indexOf('<script src=') >= 0 ? other.indexOf('<script src=') : Infinity), `${f}: it runs before other scripts`);
}
