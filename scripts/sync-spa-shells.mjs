#!/usr/bin/env node
/**
 * Copy index.html to the GitHub Pages route shells, stamping per-route SEO
 * into the RAW HTML.
 *
 * Why this exists: GitHub Pages serves a static copy of index.html at every
 * route. A plain `cp` meant all 14 copies carried the homepage's
 * <title>, description and — fatally — <link rel="canonical" href="/">, so
 * Google folded /about, /portfolio, /services-pricing, /business-systems,
 * /contact and /hire-me into the homepage and dropped them from the index.
 * assets/js/seo.js fixes those tags client-side, but that only runs after
 * JS executes; crawlers read the raw bytes first.
 *
 * seo.js is the single source of truth. This script evaluates it in a stub
 * context and reads window.CWR_SEO.PAGES, so page titles/descriptions are
 * edited in exactly one place.
 *
 * Run after editing index.html:  npm run sync   (or ./scripts/sync-spa-shells.sh)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'index.html');
const SEO_JS = join(ROOT, 'assets/js/seo.js');

/** Routes that get a physical <route>/index.html shell. */
const ROUTES = [
  'about',
  'testimonials',
  'admin',
  'resume',
  'portfolio',
  'blog',
  'services-pricing',
  'service-pricing',
  'business-systems',
  'hire-me',
  'contact',
  'messages',
  'schedule'
];

/** Route slug -> the data-page article whose heading becomes that page's <h1>. */
const ARTICLE_FOR_ROUTE = { 'service-pricing': 'services-pricing' };

// --- load seo.js as the single source of truth -----------------------------

function loadSeo() {
  // seo.js ends with applyFromLocation(); apply() returns early when
  // document.head is missing, so a bare stub is enough to harvest PAGES.
  const sandbox = { window: {}, document: {} };
  sandbox.window.document = sandbox.document;
  vm.createContext(sandbox);
  new vm.Script(readFileSync(SEO_JS, 'utf8'), { filename: 'seo.js' }).runInContext(sandbox);
  const seo = sandbox.window.CWR_SEO;
  if (!seo || !seo.PAGES) throw new Error('seo.js did not expose window.CWR_SEO.PAGES');
  return seo;
}

// --- html helpers ----------------------------------------------------------

const escAttr = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const escText = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Replace a <meta {attr}="{key}" content="..."> value, or report a miss. */
function setMeta(html, attr, key, value, misses) {
  const re = new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`, 'i');
  if (!re.test(html)) {
    misses.push(`meta[${attr}="${key}"]`);
    return html;
  }
  return html.replace(re, `$1${escAttr(value)}$2`);
}

function setTitle(html, value, misses) {
  const re = /(<title>)[\s\S]*?(<\/title>)/i;
  if (!re.test(html)) {
    misses.push('<title>');
    return html;
  }
  return html.replace(re, `$1${escText(value)}$2`);
}

function setCanonical(html, href, misses) {
  const re = /(<link\s+rel="canonical"\s+href=")[^"]*(")/i;
  if (!re.test(html)) {
    misses.push('link[rel=canonical]');
    return html;
  }
  return html.replace(re, `$1${escAttr(href)}$2`);
}

/**
 * Give the page exactly one <h1>: demote the homepage hero, then promote the
 * target article's first heading. Styling is class-based (.h2, .article-title,
 * .cwr-landing-title) and .hire-hero h1 is aliased in index.html's inline
 * <style>, so the tag swap is visually inert.
 */
function moveH1(html, articleSlug, misses) {
  const before = html;

  // Demote the home hero h1 -> h2 so it does not compete.
  html = html.replace(
    /<h1(\s+class="cwr-landing-title"[\s\S]*?)<\/h1>/i,
    (m, inner) => `<h2${inner}</h2>`
  );
  if (html === before) misses.push('home hero <h1> (not demoted)');

  // Slice out just this route's <article>...</article> (articles are siblings).
  const start = html.search(new RegExp(`<article[^>]*data-page="${articleSlug}"`, 'i'));
  if (start === -1) {
    misses.push(`<article data-page="${articleSlug}">`);
    return html;
  }
  const after = html.slice(start + 1);
  const nextRel = after.search(/<article[\s>]/i);
  const end = nextRel === -1 ? html.length : start + 1 + nextRel;

  const slice = html.slice(start, end);
  // First <h2 ...>...</h2> in the article is its page title. h2 cannot nest,
  // so the non-greedy match is safe even with <br>/<span> inside.
  const promoted = slice.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/i, (m, attrs, inner) => `<h1${attrs}>${inner}</h1>`);
  if (promoted === slice) {
    misses.push(`first <h2> inside data-page="${articleSlug}"`);
    return html;
  }
  return html.slice(0, start) + promoted + html.slice(end);
}

// --- stamp one shell -------------------------------------------------------

function stamp(html, seoEntry, origin, articleSlug) {
  const misses = [];
  const url = origin + seoEntry.path;

  html = setTitle(html, seoEntry.title, misses);
  html = setMeta(html, 'name', 'title', seoEntry.title, misses);
  html = setMeta(html, 'name', 'description', seoEntry.description, misses);
  html = setMeta(html, 'name', 'robots', seoEntry.robots, misses);

  html = setMeta(html, 'property', 'og:url', url, misses);
  html = setMeta(html, 'property', 'og:title', seoEntry.title, misses);
  html = setMeta(html, 'property', 'og:description', seoEntry.description, misses);

  html = setMeta(html, 'property', 'twitter:url', url, misses);
  html = setMeta(html, 'property', 'twitter:title', seoEntry.title, misses);
  html = setMeta(html, 'property', 'twitter:description', seoEntry.description, misses);

  html = setCanonical(html, url, misses);

  if (articleSlug) html = moveH1(html, articleSlug, misses);

  return { html, misses };
}

// --- main ------------------------------------------------------------------

const seo = loadSeo();
const source = readFileSync(SRC, 'utf8');
let failed = false;

function report(label, misses) {
  if (misses.length) {
    failed = true;
    console.error(`  ✗ ${label} — could not stamp: ${misses.join(', ')}`);
  } else {
    console.log(`  ✓ ${label}`);
  }
}

console.log('Syncing SPA shells from index.html\n');

// 404.html: GitHub Pages' fallback. Serves the home view but must never be
// indexed as a duplicate of /.
{
  const home = seo.resolve('home');
  const { html, misses } = stamp(
    source,
    { ...home, robots: 'noindex, nofollow' },
    seo.ORIGIN,
    null
  );
  writeFileSync(join(ROOT, '404.html'), html);
  report('404.html', misses);
}

for (const route of ROUTES) {
  const entry = seo.resolve(route);
  const articleSlug = ARTICLE_FOR_ROUTE[route] || route;
  const { html, misses } = stamp(source, entry, seo.ORIGIN, articleSlug);
  mkdirSync(join(ROOT, route), { recursive: true });
  writeFileSync(join(ROOT, route, 'index.html'), html);
  report(`${route}/index.html  →  ${entry.title}`, misses);
}

console.log(`\n${failed ? 'Synced WITH WARNINGS — see ✗ above.' : 'All shells synced and stamped.'}`);
process.exit(failed ? 1 : 0);
