#!/usr/bin/env node
/**
 * Pre-push gate. Fast checks that never modify files; exit 1 blocks the push.
 *
 *   node scripts/preflight.mjs        (also runs from .githooks/pre-push)
 *
 * 1. JS syntax: every assets/js file parses (post-builder/ as ES modules).
 * 2. Shell sync: all 20 route shells carry the same ?v= cache-busters as
 *    index.html, plus the admin loader and the pre-rendered marquee — the
 *    "edited index.html, forgot sync-spa-shells" mistake.
 * 3. Tests: every scripts/test-*.mjs passes.
 * 4. Secrets: no service-account keys or private keys tracked in git.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const fail = (msg) => failures.push(msg);

// 1. JS syntax -------------------------------------------------------------
function checkSyntax(dir, asModule) {
  for (const name of readdirSync(join(ROOT, dir))) {
    if (!name.endsWith('.js') || name.endsWith('.min.js')) continue;
    const file = join(ROOT, dir, name);
    const args = asModule
      ? ['--input-type=module', '--check']
      : ['--check', file];
    const r = spawnSync(process.execPath, args, {
      input: asModule ? readFileSync(file) : undefined,
      encoding: 'utf8'
    });
    if (r.status !== 0) fail(`syntax: ${dir}/${name}\n${(r.stderr || '').split('\n').slice(0, 4).join('\n')}`);
  }
}
checkSyntax('assets/js', false);
checkSyntax('assets/js/post-builder', true);

// 2. Shell sync ------------------------------------------------------------
const versions = (html) => new Set(html.match(/\.(?:js|css)\?v=[\w.-]+/g) || []);
const source = readFileSync(join(ROOT, 'index.html'), 'utf8');
const want = versions(source);
const shells = readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => join(d.name, 'index.html'))
  .filter((p) => {
    try { return readFileSync(join(ROOT, p), 'utf8').includes('script.js?v='); } catch { return false; }
  });
for (const shell of shells) {
  const html = readFileSync(join(ROOT, shell), 'utf8');
  const have = versions(html);
  const missing = [...want].filter((v) => !have.has(v));
  if (missing.length) fail(`shell out of sync: ${shell} (missing ${missing.slice(0, 3).join(', ')}) — run node scripts/sync-spa-shells.mjs`);
  if (!html.includes('window.loadAdminBundle = function')) fail(`shell missing admin loader: ${shell}`);
  if (!html.includes('data-marquee-ready="1"')) fail(`shell missing pre-rendered marquee: ${shell}`);
}
if (shells.length < 19) fail(`expected 19 route shells, found ${shells.length}`);

// 3. Tests -----------------------------------------------------------------
for (const name of readdirSync(join(ROOT, 'scripts')).filter((n) => /^test-.*\.mjs$/.test(n))) {
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts', name)], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) fail(`test failed: ${name}\n${(r.stdout + r.stderr).split('\n').filter((l) => /✗|Error|FAIL/.test(l)).slice(0, 5).join('\n')}`);
}

// 4. Secrets ---------------------------------------------------------------
const tracked = spawnSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).stdout.split('\n');
for (const f of tracked) {
  if (/serviceAccount.*\.json$|-firebase-adminsdk-.*\.json$/i.test(f)) fail(`secret file tracked in git: ${f}`);
}
const keyHits = spawnSync('git', ['grep', '-l', '-I', '-e', '-----BEGIN PRIVATE KEY-----', '-e', '"private_key":'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
if (keyHits) fail(`private key material tracked in git: ${keyHits.split('\n').join(', ')}`);

// ---------------------------------------------------------------------------
if (failures.length) {
  console.error(`\n✗ preflight: ${failures.length} problem(s)\n`);
  for (const f of failures) console.error('  ✗ ' + f.replace(/\n/g, '\n    '));
  console.error('\nPush blocked. Fix the above, or push with --no-verify if you must.\n');
  process.exit(1);
}
console.log(`✓ preflight: JS syntax, ${shells.length} shells in sync, tests, no secrets`);
