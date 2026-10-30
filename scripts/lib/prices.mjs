/**
 * Package prices in the site files.
 *
 * Live prices are edited in the admin Pricing tab (/agencyPricing/packagePrices).
 * The files carry typed copies of them — the defaults in care-pricing.js and in
 * the leads Cloud Function, llms.txt, and the HTML a crawler reads before any
 * script runs. Every typed copy is generated from the prices by this module, so
 * nothing is found by guessing:
 *
 *   data-price-template="Starter Package ({pkg_starter_page}) demo"   text, or
 *     the attribute named by data-price-attr (meta tags)
 *   data-package-price="starter"                                    the regular label
 *   data-i18n="services.starter_cta"   when the English string has {pkg_*} tokens
 *   llms.txt package bullets ("**Growth Package — $3,500**") and "from $499"
 *   the PACKAGES defaults blocks in care-pricing.js and functions/inbound-leads.js
 *
 * Used by sync-prices.mjs (write), sync-spa-shells.mjs (stamping titles) and
 * preflight.mjs (check), and tested by test-price-sync.mjs.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DATABASE_URL = 'https://portfolio-2578e-default-rtdb.firebaseio.com';

/**
 * care-pricing.js in a sandbox. With no `stored`, the code defaults (= what the
 * files carry). With `stored` (an /agencyPricing value), those prices applied.
 */
export async function loadPricing(stored, root = ROOT) {
  const sandbox = { console, setTimeout, Promise, Date, Math, JSON, Number, String, Object, Array, isFinite };
  sandbox.window = sandbox;
  if (stored !== undefined) sandbox.fetch = async () => ({ ok: true, json: async () => stored });
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(join(root, 'assets/js/care-pricing.js'), 'utf8'), sandbox, { filename: 'care-pricing.js' });
  if (stored !== undefined) await sandbox.PackagePricing.load();
  return { PP: sandbox.PackagePricing, CP: sandbox.CarePricing, vars: sandbox.CarePricing.i18nVars() };
}

/**
 * The public /agencyPricing node, or throws (offline, timeout, HTTP error).
 * PRICES_FILE=<path to JSON> reads that instead (dry runs and tests).
 */
export async function fetchLive(timeoutMs = 8000) {
  if (process.env.PRICES_FILE) return JSON.parse(readFileSync(process.env.PRICES_FILE, 'utf8'));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(DATABASE_URL + '/agencyPricing.json', { signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** English strings from i18n.js (it exposes window.CWR_I18N). */
export function loadI18nEn(root = ROOT) {
  const noop = () => {};
  const sandbox = {
    console,
    localStorage: { getItem: () => null, setItem: noop },
    document: { readyState: 'loading', addEventListener: noop, documentElement: { getAttribute: () => 'en', setAttribute: noop } }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(join(root, 'assets/js/i18n.js'), 'utf8'), sandbox, { filename: 'i18n.js' });
  if (!sandbox.CWR_I18N || !sandbox.CWR_I18N.en) throw new Error('i18n.js did not expose window.CWR_I18N');
  return sandbox.CWR_I18N.en;
}

/** {token} → value for every token both care-pricing.js and i18n.js know. */
export function fillTokens(str, vars) {
  return String(str).replace(/\{([a-z_]+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
}

const unescapeAttr = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const escapeText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (s) => escapeText(s).replace(/"/g, '&quot;');

const ELEMENT = (attr) => new RegExp('(<([a-zA-Z][\\w-]*)\\b(?=[^>]*\\s' + attr + '="([^"]*)")[^>]*>)([\\s\\S]*?)(<\\/\\2>)', 'g');

/** Every marked copy in one HTML file, written with `pricing`'s prices. */
export function renderHtml(html, pricing, en) {
  const { PP, vars } = pricing;
  let out = html;
  // Attribute templates (meta tags): data-price-attr names the attribute.
  out = out.replace(/<[a-zA-Z][\w-]*\b[^>]*\sdata-price-template="[^"]*"[^>]*\sdata-price-attr="[^"]*"[^>]*>|<[a-zA-Z][\w-]*\b[^>]*\sdata-price-attr="[^"]*"[^>]*\sdata-price-template="[^"]*"[^>]*>/g, (tag) => {
    const tpl = unescapeAttr(tag.match(/\sdata-price-template="([^"]*)"/)[1]);
    const attr = tag.match(/\sdata-price-attr="([^"]*)"/)[1];
    const value = escapeAttr(fillTokens(tpl, vars));
    const re = new RegExp('(\\s' + attr + '=")[^"]*(")');
    return re.test(tag) ? tag.replace(re, (m, a, b) => a + value + b) : tag.replace(/\s*\/?>$/, (end) => ' ' + attr + '="' + value + '"' + end);
  });
  // Text templates.
  out = out.replace(ELEMENT('data-price-template'), (m, open, tag, tpl, inner, close) =>
    /\sdata-price-attr="/.test(open) ? m : open + escapeText(fillTokens(unescapeAttr(tpl), vars)) + close);
  // Services / Hire Me price boxes: the regular label (offers are applied live).
  out = out.replace(ELEMENT('data-package-price'), (m, open, tag, id, inner, close) => {
    const p = PP.packageById(id);
    return p ? open + escapeText(PP.regularLabel(p)) + close : m;
  });
  // i18n elements whose English string carries a package price.
  if (en) {
    out = out.replace(ELEMENT('data-i18n'), (m, open, tag, key, inner, close) => {
      const val = en[key];
      return typeof val === 'string' && /\{pkg_[a-z_]+\}/.test(val) ? open + fillTokens(val, vars) + close : m;
    });
  }
  return out;
}

// A dollar figure, not the punctuation after it: "$499," is $499.
const MONEY = '\\$\\d(?:[\\d,]*\\d)?';

/** llms.txt: the package bullets, by name, and "fixed-price from $X". */
export function renderLlms(text, pricing) {
  const { PP, vars } = pricing;
  let out = text;
  for (const p of PP.PACKAGES) {
    const name = p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp('(\\*\\*' + name + ' — )' + MONEY + '(?:–' + MONEY + ')?(\\*\\*)', 'g'), (m, a, b) => a + PP.regularLabel(p) + b);
  }
  return out.replace(new RegExp('(fixed-price from )' + MONEY, 'g'), (m, a) => a + vars.pkg_from);
}

/** The PACKAGES defaults block in care-pricing.js. */
export function renderClientDefaults(src, pricing) {
  const start = src.indexOf('// sync-prices: begin defaults');
  const end = src.indexOf('// sync-prices: end defaults');
  if (start < 0 || end < start) throw new Error('care-pricing.js: sync-prices markers not found');
  let block = src.slice(start, end);
  for (const p of pricing.PP.PACKAGES) {
    block = block.replace(new RegExp("(\\{ id: '" + p.id + "',[^\\n]*?price: )\\d+(?:, max: \\d+)?"), (m, a) => a + p.price + (p.max ? ', max: ' + p.max : ''));
  }
  return src.slice(0, start) + block + src.slice(end);
}

/** The PACKAGES table in functions/inbound-leads.js (fallback when /agencyPricing can't be read). */
export function renderFunctionDefaults(src, pricing) {
  let out = src;
  for (const p of pricing.PP.PACKAGES) {
    const key = /-/.test(p.id) ? '"' + p.id + '"' : p.id;
    out = out.replace(new RegExp('(\\n  ' + key.replace(/"/g, '"') + ': \\{ name: "[^"]*", price: )\\d+'), (m, a) => a + p.price);
  }
  return out;
}

/** Route shells: index.html and its copies (each has a sibling index.html with the SPA script). */
export function shellFiles(root = ROOT) {
  const out = ['index.html'];
  for (const d of readdirSync(root)) {
    const f = join(d, 'index.html');
    if (/^(\.|_site|node_modules|docs|examples|functions|scripts|assets)/.test(d)) continue;
    if (existsSync(join(root, f)) && statSync(join(root, d)).isDirectory() && /script\.js\?v=/.test(readFileSync(join(root, f), 'utf8'))) out.push(f);
  }
  return out;
}

/** Every other public HTML page that carries price markers (Link Tree, examples). */
export function markedHtml(root = ROOT) {
  const shells = new Set(shellFiles(root));
  return guardFiles(root).filter((f) => /\.html$/.test(f) && !shells.has(f) &&
    /\sdata-price-template="|\sdata-package-price="/.test(readFileSync(join(root, f), 'utf8')));
}

/** Every file the sync owns, with how to render it. */
export function targets(root = ROOT) {
  return [
    ...shellFiles(root).map((file) => ({ file, kind: 'html' })),
    ...markedHtml(root).map((file) => ({ file, kind: 'html' })),
    { file: 'llms.txt', kind: 'llms' },
    { file: 'assets/js/care-pricing.js', kind: 'client-defaults' },
    { file: 'functions/inbound-leads.js', kind: 'function-defaults' }
  ];
}

export function renderTarget(t, src, pricing, en) {
  if (t.kind === 'html') return renderHtml(src, pricing, en);
  if (t.kind === 'llms') return renderLlms(src, pricing);
  if (t.kind === 'client-defaults') return renderClientDefaults(src, pricing);
  if (t.kind === 'function-defaults') return renderFunctionDefaults(src, pricing);
  return src;
}

/** Files whose typed copies differ from `pricing`, with the first differing line. */
export function staleFiles(pricing, en, root = ROOT) {
  const out = [];
  for (const t of targets(root)) {
    const path = join(root, t.file);
    if (!existsSync(path)) continue;
    const src = readFileSync(path, 'utf8');
    const want = renderTarget(t, src, pricing, en);
    if (want !== src) {
      const a = src.split('\n');
      const b = want.split('\n');
      const i = a.findIndex((line, n) => line !== b[n]);
      out.push({ file: t.file, line: i + 1, has: (a[i] || '').trim().slice(0, 140), want: (b[i] || '').trim().slice(0, 140) });
    }
  }
  return out;
}

// ——— guard: package prices typed outside the markers ———

/** Text with every generated copy blanked, so only hand-typed figures remain. */
function stripMarked(file, src, en, pricing) {
  let out = src;
  if (/\.html$/.test(file)) {
    // Element text first: the attribute is how those elements are found.
    out = out.replace(ELEMENT('data-price-template'), (m, open, tag, tpl, inner, close) => (/\sdata-price-attr="/.test(open) ? m : open + close));
    out = out.replace(ELEMENT('data-package-price'), (m, open, tag, id, inner, close) => open + close);
    out = out.replace(ELEMENT('data-i18n'), (m, open, tag, key, inner, close) =>
      en && typeof en[key] === 'string' && /\{pkg_[a-z_]+\}/.test(en[key]) ? open + close : m);
    out = out.replace(/(<[^>]*\sdata-price-attr="([^"]*)"[^>]*>)/g, (tag, t, attr) =>
      tag.replace(new RegExp('\\s' + attr + '="[^"]*"'), ' '));
    out = out.replace(/\sdata-price-template="[^"]*"/g, ' ');
  }
  if (file === 'assets/js/care-pricing.js') {
    const a = out.indexOf('// sync-prices: begin defaults');
    const b = out.indexOf('// sync-prices: end defaults');
    if (a >= 0 && b > a) out = out.slice(0, a) + out.slice(b);
  }
  if (file === 'llms.txt') {
    for (const p of pricing.PP.PACKAGES) {
      const name = p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      out = out.replace(new RegExp('(\\*\\*' + name + ' — )' + MONEY + '(?:–' + MONEY + ')?', 'g'), '$1');
    }
    out = out.replace(new RegExp('(fixed-price from )' + MONEY, 'g'), '$1');
  }
  return out;
}

/** "$1,500" or "$1500"; "$6k"/"$1.5k" for the shorthand. */
export function figurePatterns(PP) {
  const figures = new Set();
  for (const p of PP.PACKAGES) {
    figures.add(p.price);
    if (p.max) figures.add(p.max);
  }
  const res = [];
  for (const n of figures) {
    const digits = n.toLocaleString('en-US').replace(/,/g, ',?');
    res.push(new RegExp('\\$' + digits + '(?![\\d,]*\\d|\\.\\d)', 'g'));
    if (n >= 1000) res.push(new RegExp('\\$' + String(Math.round(n / 100) / 10).replace('.', '\\.') + 'k(?!\\w)', 'g'));
  }
  return res;
}

/** Public files the guard reads. */
export function guardFiles(root = ROOT) {
  const files = [...shellFiles(root), 'linktree.html', 'link-in-bio.html', 'llms.txt'];
  const walk = (dir) => {
    for (const name of readdirSync(join(root, dir))) {
      const rel = join(dir, name);
      const st = statSync(join(root, rel));
      if (st.isDirectory()) walk(rel);
      else if (/\.(js|json|html)$/.test(name) && !/\.min\.js$/.test(name)) files.push(rel);
    }
  };
  walk('assets/js');
  walk('examples');
  return [...new Set(files)].filter((f) => existsSync(join(root, f)));
}

/**
 * Hand-typed package prices outside the markers. `allow` entries are
 * { text, file? }: a figure inside that exact text (in that file, if given)
 * is not a package price.
 */
export function unmarkedPrices(pricing, en, allow, root = ROOT) {
  const patterns = figurePatterns(pricing.PP);
  const hits = [];
  for (const file of guardFiles(root)) {
    const src = stripMarked(file, readFileSync(join(root, file), 'utf8'), en, pricing);
    for (const re of patterns) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(src))) {
        const near = src.slice(Math.max(0, m.index - 160), m.index + m[0].length + 160);
        const allowed = allow.some((a) => (!a.file || a.file === file || (a.file.endsWith('/') && file.startsWith(a.file))) &&
          a.text.includes(m[0]) && near.includes(a.text));
        if (allowed) continue;
        const line = src.slice(0, m.index).split('\n').length;
        hits.push({ file, line, figure: m[0], text: src.split('\n')[line - 1].trim().slice(0, 150) });
      }
    }
  }
  return hits;
}

export function readAllowlist(root = ROOT) {
  return JSON.parse(readFileSync(join(root, 'scripts/price-allowlist.json'), 'utf8')).allow;
}

export const relativeTo = (p) => relative(ROOT, p);
