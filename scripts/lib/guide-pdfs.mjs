/**
 * Client guide PDFs. Each guide (.md in assets/docs/projects/<client>/) gets a
 * paginated PDF next to it, built by scripts/build-guide-pdfs.mjs, so the
 * portal's Download / Share hand out a PDF instead of the raw Markdown.
 *
 * Names (the portal derives the same ones, see client-portal.js):
 *   one language   platform-guide.md -> platform-guide.pdf
 *   two languages  platform-guide.md -> platform-guide.en.pdf, platform-guide.es.pdf
 *
 * The manifest stores a fingerprint of each guide's text, its screenshots and
 * the PDF template, so preflight can tell when a PDF is behind its guide.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, posix } from 'node:path';

export const GUIDES_DIR = 'assets/docs/projects';
export const MANIFEST = 'assets/docs/projects/guide-pdfs.json';
export const TEMPLATE = 'scripts/guide-pdf-template.html';

// Lowercase names are client guides; UPPERCASE ones (README, SCREENSHOT-CHECKLIST) are notes.
const GUIDE_NAME = /^[a-z0-9][a-z0-9-]*\.md$/;
// Same markers as splitMarkdownByLang in portfolio-detail-shared.js.
const LANG_MARKER = /^[ \t]*<!--\s*lang:([a-z]{2})\s*-->[ \t]*$/gim;

export function listGuides(root) {
  const base = join(root, GUIDES_DIR);
  if (!existsSync(base)) return [];
  const out = [];
  for (const d of readdirSync(base, { withFileTypes: true }).filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    for (const f of readdirSync(join(base, d.name)).sort()) {
      if (GUIDE_NAME.test(f)) out.push(posix.join(GUIDES_DIR, d.name, f));
    }
  }
  return out;
}

/** ['en', 'es'] for a two-language guide; [] when it has one language. */
export function guideLangs(md) {
  const langs = [...String(md).matchAll(LANG_MARKER)].map((m) => m[1].toLowerCase());
  return langs.length >= 2 ? langs : [];
}

export function pdfPathsFor(mdRel, langs) {
  if (!langs || !langs.length) return [{ lang: '', path: mdRel.replace(/\.md$/, '.pdf') }];
  return langs.map((lang) => ({ lang, path: mdRel.replace(/\.md$/, '.' + lang + '.pdf') }));
}

/** Local screenshots the guide shows, relative to the repo root. */
function imageRefs(mdRel, md) {
  const refs = new Set();
  for (const m of String(md).matchAll(/!\[[^\]]*\]\(([^)\s]+)[^)]*\)/g)) {
    const src = m[1];
    if (/^[a-z]+:|^\/\//i.test(src)) continue;
    refs.add(src.startsWith('/') ? src.slice(1) : posix.join(posix.dirname(mdRel), src));
  }
  return [...refs].sort();
}

export function guideHash(root, mdRel) {
  const md = readFileSync(join(root, mdRel), 'utf8');
  const h = createHash('sha256').update(md);
  for (const rel of imageRefs(mdRel, md)) {
    const file = join(root, rel);
    h.update('\0' + rel + '\0').update(existsSync(file) ? readFileSync(file) : 'missing');
  }
  const template = join(root, TEMPLATE);
  h.update('\0template\0').update(existsSync(template) ? readFileSync(template) : '');
  return h.digest('hex').slice(0, 16);
}

export function readManifest(root) {
  try {
    return JSON.parse(readFileSync(join(root, MANIFEST), 'utf8'));
  } catch {
    return { guides: {} };
  }
}

export function writeManifestEntry(root, mdRel) {
  const manifest = readManifest(root);
  const md = readFileSync(join(root, mdRel), 'utf8');
  manifest.about = 'Built by scripts/build-guide-pdfs.mjs. hash = guide text + screenshots + PDF template; preflight rebuild check.';
  manifest.guides = manifest.guides || {};
  manifest.guides[mdRel] = { hash: guideHash(root, mdRel), pdfs: pdfPathsFor(mdRel, guideLangs(md)).map((p) => p.path) };
  // Guides that were deleted or renamed drop out of the record.
  const current = new Set(listGuides(root));
  const sorted = Object.fromEntries(Object.keys(manifest.guides).filter((k) => current.has(k)).sort().map((k) => [k, manifest.guides[k]]));
  writeFileSync(join(root, MANIFEST), JSON.stringify({ about: manifest.about, guides: sorted }, null, 2) + '\n');
}

/** Guides whose PDF is missing or older than the guide: [{ md, reason }]. */
export function staleGuides(root) {
  const manifest = readManifest(root);
  const out = [];
  for (const mdRel of listGuides(root)) {
    const entry = (manifest.guides || {})[mdRel];
    const md = readFileSync(join(root, mdRel), 'utf8');
    const missing = pdfPathsFor(mdRel, guideLangs(md)).filter((p) => !existsSync(join(root, p.path)));
    if (!entry) out.push({ md: mdRel, reason: 'no PDF yet' });
    else if (missing.length) out.push({ md: mdRel, reason: 'PDF missing: ' + missing.map((p) => p.path).join(', ') });
    else if (entry.hash !== guideHash(root, mdRel)) out.push({ md: mdRel, reason: 'guide changed since its PDF was built' });
  }
  return out;
}

