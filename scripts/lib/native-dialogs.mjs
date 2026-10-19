/**
 * Finds the browser's own popups — confirm(), alert(), prompt() — in admin code.
 * Admin code uses the site's popups instead (window.CwrUI, assets/js/admin-ui.js).
 * Used by scripts/preflight.mjs and scripts/test-admin-ui.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';

// Bare calls, or calls through the global object. Other method calls (CwrUI.confirm,
// x.alert) and look-alike names (isConfirmed, confirmDelete) don't match.
const CALL = /(^|[^\w.$])(?:(?:window|global|self|globalThis)\s*\.\s*)?(confirm|alert|prompt)\s*\(/g;

// Not scanned: out of scope this round (client portal, public booking page) and the kit itself.
const SKIP = new Set(['client-portal.js', 'hire-me-booking.js', 'admin-ui.js']);

// A "/" after one of these (or after a keyword below) starts a regex literal, not a division.
const BEFORE_REGEX = '(,=:[!&|?{};+-*%~^<>';
const REGEX_KEYWORDS = /(?:^|[^\w$])(?:return|typeof|case|in|of|delete|void|throw|new|else|do|yield|await)$/;

function startsRegex(out) {
  const t = out.slice(-40).replace(/\s+$/, '');
  if (!t) return true;
  return BEFORE_REGEX.includes(t[t.length - 1]) || REGEX_KEYWORDS.test(t);
}

/** Comments, string contents and regex literals become spaces (newlines kept), so only real code is searched. */
function blankCommentsAndStrings(src) {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (c === '/' && n !== '/' && n !== '*' && startsRegex(out)) {
      // Regex literal: skip to the closing "/" (escapes and [...] classes can hold one).
      out += '/';
      i++;
      let inClass = false;
      while (i < src.length && src[i] !== '\n') {
        const r = src[i];
        if (r === '\\') { out += '  '; i += 2; continue; }
        if (r === '[') inClass = true;
        else if (r === ']') inClass = false;
        else if (r === '/' && !inClass) break;
        out += ' ';
        i++;
      }
      out += '/';
      i++;
    } else if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') { out += ' '; i++; }
    } else if (c === '/' && n === '*') {
      out += '  ';
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { out += src[i] === '\n' ? '\n' : ' '; i++; }
      out += '  ';
      i += 2;
    } else if (c === '"' || c === "'" || c === '`') {
      out += c;
      i++;
      while (i < src.length && src[i] !== c) {
        if (src[i] === '\\') { out += '  '; i += 2; continue; }
        out += src[i] === '\n' ? '\n' : ' ';
        i++;
      }
      out += c;
      i++;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/** @returns {Array<{ line: number, call: 'confirm'|'alert'|'prompt', text: string }>} */
export function findNativeDialogs(source) {
  const lines = String(source).split('\n');
  const code = blankCommentsAndStrings(String(source)).split('\n');
  const found = [];
  code.forEach((l, idx) => {
    CALL.lastIndex = 0;
    let m;
    while ((m = CALL.exec(l))) {
      found.push({ line: idx + 1, call: m[2], text: lines[idx].trim() });
    }
  });
  return found;
}

/** Inline <script> blocks (no src) of an HTML file, with their starting line numbers. */
export function inlineScripts(html) {
  const blocks = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    const startLine = html.slice(0, m.index + m[0].indexOf('>') + 1).split('\n').length;
    blocks.push({ startLine, code: m[1] });
  }
  return blocks;
}

/** Popups in one repo file (HTML: inline scripts only), with real line numbers. */
export function findNativeDialogsInFile(root, rel) {
  const src = fs.readFileSync(path.join(root, rel), 'utf8');
  if (!rel.endsWith('.html')) return findNativeDialogs(src);
  return inlineScripts(src).flatMap((b) =>
    findNativeDialogs(b.code).map((f) => Object.assign({}, f, { line: b.startLine + f.line - 1 })));
}

/** Admin code to scan, repo-relative: assets/js/*.js (minus SKIP), post-builder, index.html. */
export function adminDialogFiles(root) {
  const js = (dir) => fs.readdirSync(path.join(root, dir))
    .filter((f) => f.endsWith('.js') && !SKIP.has(f))
    .map((f) => dir + '/' + f);
  return js('assets/js').concat(js('assets/js/post-builder'), ['index.html']).sort();
}
