/**
 * Project page files: portfolio/<slug>/index.html, one per public project.
 *
 * Each is the Portfolio route shell with the project stamped in (title, description,
 * canonical, preview image, and its text pre-filled in #portfolio-project-page), so
 * Google and link previews read the project. Visitors get the live data: script.js
 * re-renders the page from the database as soon as it loads.
 *
 * The project list comes from a snapshot (scripts/data/portfolio-pages.json) written by
 * `npm run sync-projects`, so `npm run sync` can rebuild these files offline whenever
 * index.html changes. Slugs come from PortfolioDetailShared.projectPages, the same code
 * the site uses.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SNAPSHOT = join(ROOT, 'scripts', 'data', 'portfolio-pages.json');
export const DATABASE_URL = 'https://portfolio-2578e-default-rtdb.firebaseio.com';
export const ORIGIN = 'https://rubenjimenez.dev';
/** Marks a generated page file (so stale ones can be found and removed). */
const MARKER = 'name="cwr-project-page"';

const require = createRequire(import.meta.url);
const { PortfolioDetailShared: PDS } = require('../../assets/js/portfolio-detail-shared.js');

/** The public /portfolioProjects node as a list with ids. PROJECTS_FILE=<json> reads a file instead. */
export async function fetchProjects(timeoutMs = 10000) {
  let raw;
  if (process.env.PROJECTS_FILE) raw = JSON.parse(readFileSync(process.env.PROJECTS_FILE, 'utf8'));
  else {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(DATABASE_URL + '/portfolioProjects.json', { signal: ctrl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      raw = await res.json();
    } finally {
      clearTimeout(timer);
    }
  }
  if (!raw || typeof raw !== 'object') return [];
  return Object.keys(raw).map((id) => Object.assign({ id }, raw[id]));
}

const clean = (v, max) => String(v == null ? '' : v).replace(/\r/g, '').trim().slice(0, max);

/** What the page files need, per page, in grid order. Stable JSON so diffs stay small. */
export function snapshotFrom(all) {
  return PDS.projectPages(all).map(({ id, slug, record: r }) => ({
    slug,
    id,
    title: clean(r.title, 140) || 'Project',
    description: clean(r.description, 4000),
    outcome: clean(r.outcome, 3000),
    bestFor: Array.isArray(r.bestFor) ? r.bestFor.map((x) => clean(x, 160)).filter(Boolean).slice(0, 12) : [],
    image: coverImage(r),
    imageAlt: clean(r.imageAlt, 200)
  }));
}

/** First still image (not a video) for the preview card and the pre-built page. */
function coverImage(r) {
  const list = [r.coverImageUrl, r.imageUrl].concat(Array.isArray(r.imageUrls) ? r.imageUrls : []);
  for (const u of list) {
    const s = String(u || '').trim();
    if (/^\/?assets\/.+\.(png|jpe?g|webp)$/i.test(s)) return '/' + s.replace(/^\//, '');
  }
  return '';
}

export function readSnapshot() {
  try { return JSON.parse(readFileSync(SNAPSHOT, 'utf8')); } catch { return null; }
}

export function writeSnapshot(pages) {
  mkdirSync(dirname(SNAPSHOT), { recursive: true });
  writeFileSync(SNAPSHOT, JSON.stringify({ note: 'Written by npm run sync-projects. Do not edit.', pages }, null, 2) + '\n');
}

// --- stamping ----------------------------------------------------------------

const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** One line for the description tag: no bullets, ≤ 160 characters. */
export function metaDescription(p) {
  let d = String(p.description || p.outcome || '').replace(/[·•]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!d) d = p.title + ', built by CodeWithRuben, a Fresno web and mobile studio.';
  if (d.length > 160) {
    d = d.slice(0, 158).replace(/\s+\S*$/, '');
    if (!/[.!?]$/.test(d)) d += '…';
  }
  return d;
}

function setMeta(html, attr, key, value, misses) {
  const re = new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`, 'i');
  if (!re.test(html)) { misses.push(`meta[${attr}="${key}"]`); return html; }
  return html.replace(re, (m, a, b) => a + escAttr(value) + b);
}

function blocksHtml(text) {
  return PDS.textBlocks(text).map((b) => b.type === 'ul'
    ? '<ul>' + b.items.map((i) => '<li>' + escText(i) + '</li>').join('') + '</ul>'
    : '<p>' + escText(b.text) + '</p>').join('');
}

/** The pre-built page text inside #portfolio-project-page. */
function prerenderHtml(p, prev, next) {
  const parts = [];
  if (p.image) parts.push(`<img src="${escAttr(p.image)}" alt="${escAttr(p.imageAlt || p.title)}" width="1200" height="750" loading="eager">`);
  if (p.description) parts.push('<section><h3>About</h3>' + blocksHtml(p.description) + '</section>');
  if (p.bestFor.length) parts.push('<section><h3>Best for</h3><ul>' + p.bestFor.map((x) => '<li>' + escText(x) + '</li>').join('') + '</ul></section>');
  if (p.outcome) parts.push('<section><h3>Outcome</h3>' + blocksHtml(p.outcome) + '</section>');
  parts.push('<p><a href="/hire-me">Start a project like this</a></p>');
  const nav = [prev && `<a href="/portfolio/${prev.slug}/">← ${escText(prev.title)}</a>`, next && `<a href="/portfolio/${next.slug}/">${escText(next.title)} →</a>`]
    .filter(Boolean).join(' · ');
  if (nav) parts.push('<p>' + nav + '</p>');
  return '<div class="project-page-prerender">' + parts.join('') + '</div>';
}

/** The Portfolio shell → this project's page file. Returns { html, misses }. */
export function stampProjectPage(shell, p, prev, next) {
  const misses = [];
  let html = shell;
  const url = `${ORIGIN}/portfolio/${p.slug}/`;
  const title = `${p.title} | CodeWithRuben`;
  const desc = metaDescription(p);
  const image = p.image ? ORIGIN + p.image : '';

  html = html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, () => `<title>${escText(title)}</title>`);
  html = setMeta(html, 'name', 'title', title, misses);
  html = setMeta(html, 'name', 'description', desc, misses);
  html = setMeta(html, 'name', 'robots', 'index, follow', misses);
  for (const [k, v] of [['og:url', url], ['og:title', title], ['og:description', desc], ['twitter:url', url], ['twitter:title', title], ['twitter:description', desc]]) {
    html = setMeta(html, 'property', k, v, misses);
  }
  if (image) {
    html = setMeta(html, 'property', 'og:image', image, misses);
    html = setMeta(html, 'property', 'twitter:image', image, misses);
  }
  // Price markers belong to the Portfolio page's own copy, not a project's.
  html = html.replace(/(<(?:title|meta)\b[^>]*?)\s+data-price-(?:template|attr)="[^"]*"/gi, '$1');
  const canon = /(<link\s+rel="canonical"\s+href=")[^"]*(")/i;
  if (canon.test(html)) html = html.replace(canon, `$1${escAttr(url)}$2`); else misses.push('link[rel=canonical]');
  html = html.replace(/<\/head>/i, `  <meta ${MARKER} content="${escAttr(p.slug)}">\n</head>`);

  // Inside the Portfolio article: the grid's title goes back to <h2>, the project's is the <h1>.
  const start = html.search(/<article class="portfolio[^"]*" data-page="portfolio"/);
  if (start < 0) { misses.push('portfolio article'); return { html, misses }; }
  const end = html.indexOf('</article>', start);
  let art = html.slice(start, end);
  art = art.replace(/<article class="portfolio([^"]*)"/, '<article class="portfolio$1 is-project-page"');
  art = art.replace(/<h1(\s[^>]*data-i18n="portfolio\.title"[^>]*)>([\s\S]*?)<\/h1>/, '<h2$1>$2</h2>');
  const before = art;
  art = art.replace(
    /<section class="project-page" id="portfolio-project-page"([^>]*?) hidden>/,
    `<section class="project-page" id="portfolio-project-page"$1 data-prerendered="${escAttr(p.slug)}">`
  );
  if (art === before) misses.push('#portfolio-project-page');
  art = art.replace(
    /<h2 class="h2 article-title project-page-title"([^>]*)>[\s\S]*?<\/h2>/,
    (m, attrs) => `<h1 class="h2 article-title project-page-title"${attrs}>${escText(p.title)}</h1>`
  );
  // The short line under the title: the description's first paragraph (as script.js does).
  const firstP = PDS.textBlocks(p.description).find((blk) => blk.type === 'p');
  if (firstP) art = art.replace('<p class="project-page-lede" data-project-page-lede hidden></p>', `<p class="project-page-lede" data-project-page-lede>${escText(firstP.text)}</p>`);
  art = art.replace(/(<div class="project-page-body" data-project-page-body>)(<\/div>)/, (m, a, b) => a + prerenderHtml(p, prev, next) + b);
  html = html.slice(0, start) + art + html.slice(end);
  return { html, misses };
}

/**
 * Write every project page into <out>/portfolio/<slug>/index.html from <out>/portfolio/index.html,
 * and remove page files for projects that no longer have a page. Returns { written, removed, failed }.
 */
export function writeProjectPages(pages, out = ROOT) {
  const shellPath = join(out, 'portfolio', 'index.html');
  const shell = readFileSync(shellPath, 'utf8');
  const result = { written: [], removed: [], failed: [] };
  const keep = new Set();
  pages.forEach((p, i) => {
    const { html, misses } = stampProjectPage(shell, p, pages[i - 1], pages[i + 1]);
    mkdirSync(join(out, 'portfolio', p.slug), { recursive: true });
    writeFileSync(join(out, 'portfolio', p.slug, 'index.html'), html);
    keep.add(p.slug);
    (misses.length ? result.failed : result.written).push(misses.length ? `${p.slug} (${misses.join(', ')})` : p.slug);
  });
  for (const d of readdirSync(join(out, 'portfolio'), { withFileTypes: true })) {
    if (!d.isDirectory() || keep.has(d.name)) continue;
    const f = join(out, 'portfolio', d.name, 'index.html');
    if (existsSync(f) && readFileSync(f, 'utf8').includes(MARKER)) {
      rmSync(join(out, 'portfolio', d.name), { recursive: true, force: true });
      result.removed.push(d.name);
    }
  }
  return result;
}

/** Page files under <root>/portfolio/ (for preflight). */
export function projectPageFiles(root = ROOT) {
  const dir = join(root, 'portfolio');
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join('portfolio', d.name, 'index.html'))
    .filter((f) => { try { return readFileSync(join(root, f), 'utf8').includes(MARKER); } catch { return false; } });
}

/** Rewrite the project block in sitemap.xml. Returns true when it changed. */
export function updateSitemap(pages, root = ROOT, changed = new Set()) {
  const file = join(root, 'sitemap.xml');
  const xml = readFileSync(file, 'utf8');
  const today = new Date().toISOString().slice(0, 10);
  const prev = /<!-- projects:start -->[\s\S]*?<!-- projects:end -->\n?/.exec(xml);
  const lastmods = {};
  if (prev) for (const m of prev[0].matchAll(/<loc>[^<]*\/portfolio\/([a-z0-9-]+)\/<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)) lastmods[m[1]] = m[2];
  const block = '<!-- projects:start -->\n' + pages.map((p) =>
    `  <url>\n    <loc>${ORIGIN}/portfolio/${p.slug}/</loc>\n    <lastmod>${(!changed.has(p.slug) && lastmods[p.slug]) || today}</lastmod>\n  </url>\n`).join('') + '  <!-- projects:end -->\n';
  const next = prev ? xml.replace(prev[0], block) : xml.replace('</urlset>', '  ' + block + '</urlset>');
  if (next === xml) return false;
  writeFileSync(file, next);
  return true;
}
