#!/usr/bin/env node
/**
 * Build Post builder starters from the services kit.
 *
 * Loads examples/instagram/services.html?dump=1 in headless Chrome (EN + ES), reads the
 * JSON that services-dump.js writes into the page, validates it against the builder
 * model and writes assets/js/post-builder/starters.json.
 *
 *   python3 -m http.server 8765          # from the repo root
 *   node scripts/build-post-starters.mjs
 *
 * Re-run whenever the services posts change.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeDesign, validateDesign } from '../assets/js/post-builder/model.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets/js/post-builder/starters.json');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8765/examples/instagram/services.html';

function dump(lang) {
  const html = execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=1400,2200',
    '--virtual-time-budget=15000', '--dump-dom', `${BASE}?dump=1&lang=${lang}`
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  const m = html.match(/<script type="application\/json" id="pb-dump">([\s\S]*?)<\/script>/);
  if (!m) throw new Error(`No dump output for ${lang}. Is the server running at ${BASE}?`);
  const data = JSON.parse(m[1]);
  if (data.error) throw new Error(`services-dump.js failed (${lang}):\n${data.error}`);
  return data;
}

const sets = [...dump('en'), ...dump('es')];
let problems = 0;
for (const set of sets) {
  const errors = validateDesign(normalizeDesign({ format: set.format, slides: set.slides }));
  if (errors.length) {
    problems += errors.length;
    console.error(`${set.id}:\n  ${errors.join('\n  ')}`);
  }
  const count = set.slides.reduce((n, s) => n + s.elements.length, 0);
  console.log(`${set.id}: ${set.slides.length} slides, ${count} elements`);
}
if (problems) process.exit(1);

writeFileSync(OUT, JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), sets }, null, 1) + '\n');
console.log(`Wrote ${OUT}`);
