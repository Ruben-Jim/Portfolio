#!/usr/bin/env node
/**
 * Build the publish folder for EAS Hosting:  node scripts/build-site.mjs
 *
 * Copies ONLY the public site into _site/ and generates the route shells there.
 * Everything else — functions/, scripts/, rules, docs, CLAUDE.md — stays in the
 * repo but is never served (GitHub Pages served the whole repo root).
 *
 * Deploy:  npx eas-cli deploy --export-dir _site          (preview URL)
 *          npx eas-cli deploy --export-dir _site --prod   (production)
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_NAME = '_site';
const OUT = join(ROOT, OUT_NAME);

// The public surface. Add a path here when a new public page or asset folder appears.
const PUBLIC = [
  'index.html',
  'assets',
  'examples',            // IG post builder captures/badges + OG images
  'portal.html',
  'get.html',
  'linktree.html',
  'link-in-bio.html',
  'testimonial.html',
  'robots.txt',
  'sitemap.xml',
  'llms.txt'
];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const missing = PUBLIC.filter((p) => !existsSync(join(ROOT, p)));
if (missing.length) {
  console.error(`✗ missing public paths: ${missing.join(', ')}`);
  process.exit(1);
}
for (const p of PUBLIC) {
  cpSync(join(ROOT, p), join(OUT, p), {
    recursive: true,
    // Skip dev notes and scripts that live next to public assets (READMEs, capture scripts).
    // assets/docs/ markdown stays: project guides are served to clients via the portal.
    filter: (src) => {
      const rel = src.slice(ROOT.length + 1);
      if (rel.split('/').includes('.DS_Store')) return false;
      if (/\.(mjs|sh)$/.test(rel)) return false;
      if (/\.md$/.test(rel) && !rel.startsWith('assets/docs/')) return false;
      return true;
    }
  });
}

// Route shells + 404.html, written into _site/ instead of the repo root.
const sync = spawnSync(process.execPath, [join(ROOT, 'scripts/sync-spa-shells.mjs')], {
  cwd: ROOT,
  env: { ...process.env, SITE_OUT: OUT_NAME },
  stdio: 'inherit'
});
if (sync.status !== 0) process.exit(sync.status || 1);

// Guard: nothing private may end up in the publish folder.
const PRIVATE = /(^|\/)(functions|scripts|node_modules|\.git|\.claude|\.cursor|\.githooks)(\/|$)|\.(md|rules|mjs)$|(^|\/)(database\.rules\.json|firebase\.json|serve\.json|package(-lock)?\.json|\.env.*)$/;
const leaks = [];
(function walk(dir, rel) {
  for (const name of readdirSync(dir)) {
    const r = rel ? `${rel}/${name}` : name;
    if (PRIVATE.test(r) && !r.startsWith('assets/docs/')) leaks.push(r); // project guides are served to clients via the portal
    if (statSync(join(dir, name)).isDirectory()) walk(join(dir, name), r);
  }
})(OUT, '');
if (leaks.length) {
  console.error(`✗ private files in ${OUT_NAME}/: ${leaks.slice(0, 10).join(', ')}`);
  process.exit(1);
}

const count = (dir) => readdirSync(dir).reduce((n, f) => n + (statSync(join(dir, f)).isDirectory() ? count(join(dir, f)) : 1), 0);
console.log(`\n✓ ${OUT_NAME}/ built: ${count(OUT)} files, no private paths`);
