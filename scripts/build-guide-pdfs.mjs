#!/usr/bin/env node
/**
 * Builds the PDF of every client guide (assets/docs/projects/<client>/*.md) that
 * is new or changed, next to the guide. The portal's Download / Share buttons
 * hand out these PDFs. Preflight blocks a push while one is out of date.
 *
 *   npm i --no-save playwright-core     (once; uses your installed Google Chrome)
 *   node scripts/build-guide-pdfs.mjs           new or changed guides
 *   node scripts/build-guide-pdfs.mjs --all     every guide
 *
 * Layout lives in scripts/guide-pdf-template.html: Letter pages, the title and
 * intro first, then one page per "Step", page numbers in the footer.
 */
import http from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listGuides, guideLangs, pdfPathsFor, staleGuides, writeManifestEntry, TEMPLATE } from './lib/guide-pdfs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const all = process.argv.includes('--all');

let chromium;
try {
  ({ chromium } = await import('playwright-core'));
} catch {
  console.error('playwright-core is not installed. Run: npm i --no-save playwright-core');
  process.exit(1);
}

const todo = all ? listGuides(ROOT) : staleGuides(ROOT).map((s) => s.md);
if (!todo.length) {
  console.log('✓ guide PDFs: all up to date');
  process.exit(0);
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.md': 'text/markdown; charset=utf-8',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const file = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
let failed = 0;
try {
  for (const md of todo) {
    const langs = guideLangs(readFileSync(join(ROOT, md), 'utf8'));
    let built = true;
    for (const { lang, path } of pdfPathsFor(md, langs)) {
      let info;
      try {
        await page.goto(base + '/' + TEMPLATE, { waitUntil: 'load' });
        info = await page.evaluate(([u, l]) => window.renderGuide(u, l), ['/' + md, lang]);
      } catch (err) {
        console.error(`✗ ${path}: ${err.message.split('\n')[0]}`);
        built = false;
        continue;
      }
      // A screenshot missing from the repo is left out (it's broken in the portal too);
      // adding the file later changes the guide's fingerprint, so preflight asks for a rebuild.
      if (info.broken.length) console.warn(`! ${path}: left out missing screenshots: ${info.broken.join(', ')}`);
      await page.pdf({
        path: join(ROOT, path),
        format: 'Letter',
        printBackground: true,
        margin: { top: '0.6in', bottom: '0.75in', left: '0.65in', right: '0.65in' },
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate:
          '<div style="width:100%;padding:0 0.65in;font:8px -apple-system,Helvetica,Arial,sans-serif;color:#8e8e93;display:flex;justify-content:space-between">' +
          '<span>' + esc(info.title) + ' · CodeWithRuben</span>' +
          '<span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>'
      });
      const kb = Math.round(statSync(join(ROOT, path)).size / 1024);
      console.log(`✓ ${path}  (${info.images} screenshots, ${kb} KB)`);
    }
    if (built) writeManifestEntry(ROOT, md);
    else failed++;
  }
} finally {
  await browser.close();
  server.close();
}
if (failed) process.exit(1);
