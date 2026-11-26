#!/usr/bin/env node
/**
 * Project pages: one page file per public portfolio project at /portfolio/<slug>/.
 *
 *   npm run sync-projects        # read the live projects, write the page files + sitemap
 *   node scripts/sync-projects.mjs --check   # only report what's out of date (preflight uses this)
 *
 * Run it after adding, renaming or editing a project in Admin → Portfolio, then push.
 * Visitors always see the live data either way; the files are what Google and link
 * previews (iMessage, Instagram) read. Free: one public read, no sign-in.
 *
 * Writes scripts/data/portfolio-pages.json (the snapshot `npm run sync` rebuilds the
 * page files from), portfolio/<slug>/index.html, and the project block in sitemap.xml.
 * Details: scripts/lib/project-pages.mjs.
 */
import { fetchProjects, snapshotFrom, readSnapshot, writeSnapshot, writeProjectPages, updateSitemap } from './lib/project-pages.mjs';

const check = process.argv.includes('--check');

let pages;
try {
  pages = snapshotFrom(await fetchProjects());
} catch (err) {
  console.error(`Could not read the live projects (${err && err.message}). Offline? Nothing changed.`);
  process.exit(check ? 0 : 1);
}
if (!pages.length) {
  console.error('The live project list is empty: not touching the page files.');
  process.exit(check ? 0 : 1);
}

const old = (readSnapshot() || {}).pages || [];
const oldBySlug = Object.fromEntries(old.map((p) => [p.slug, JSON.stringify(p)]));
const changed = new Set(pages.filter((p) => oldBySlug[p.slug] !== JSON.stringify(p)).map((p) => p.slug));
const gone = old.filter((p) => !pages.some((x) => x.slug === p.slug)).map((p) => p.slug);
const orderMoved = old.map((p) => p.slug).join() !== pages.map((p) => p.slug).join();

if (check) {
  if (!changed.size && !gone.length && !orderMoved) { console.log('✓ project pages match the live projects'); process.exit(0); }
  const bits = [...changed].map((s) => (oldBySlug[s] ? 'changed ' : 'new ') + s).concat(gone.map((s) => 'removed ' + s));
  console.log(`! ${bits.length || 'order of'} project page(s) out of date: ${bits.slice(0, 6).join(', ') || 'grid order'}${bits.length > 6 ? ', …' : ''}`);
  console.log('  run npm run sync-projects, then commit (Google sees the old text until then; visitors see the new).');
  process.exit(2);
}

writeSnapshot(pages);
const r = writeProjectPages(pages);
const sitemap = updateSitemap(pages, undefined, changed);
console.log(`Project pages: ${r.written.length} written${r.removed.length ? `, ${r.removed.length} removed (${r.removed.join(', ')})` : ''}${sitemap ? ', sitemap updated' : ''}.`);
if (changed.size) console.log('Changed: ' + [...changed].join(', '));
if (r.failed.length) {
  console.error('✗ could not stamp: ' + r.failed.join('; '));
  process.exit(1);
}
