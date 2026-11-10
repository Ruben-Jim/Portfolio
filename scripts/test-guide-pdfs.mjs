#!/usr/bin/env node
/**
 * Guide PDFs (scripts/lib/guide-pdfs.mjs). Run: node scripts/test-guide-pdfs.mjs
 * Guards: which .md files are client guides, the PDF names per language (the
 * portal derives the same names), and when a PDF is out of date with its guide.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { listGuides, guideLangs, pdfPathsFor, guideHash, staleGuides, writeManifestEntry } from './lib/guide-pdfs.mjs';

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'guide-pdfs-'));
const dir = path.join(root, 'assets/docs/projects/maria');
fs.mkdirSync(path.join(dir, 'screenshots'), { recursive: true });
const write = (rel, text) => fs.writeFileSync(path.join(root, rel), text);
const BILINGUAL = '<!-- lang:en -->\n# Your guide\n\n![Home](screenshots/01.webp)\n\n<!-- lang:es -->\n# Tu guía\n\n![Inicio](screenshots/01.webp)\n';
write('assets/docs/projects/maria/platform-guide.md', BILINGUAL);
write('assets/docs/projects/maria/tap-to-pay.md', '# Tap to pay\n\nOne language only.\n');
write('assets/docs/projects/maria/SCREENSHOT-CHECKLIST.md', '# internal');
write('assets/docs/projects/README.md', '# internal');
write('assets/docs/projects/maria/notes.txt', 'x');
write('assets/docs/projects/maria/screenshots/01.webp', 'image-bytes-v1');

const guides = listGuides(root);
ok(guides.join() === 'assets/docs/projects/maria/platform-guide.md,assets/docs/projects/maria/tap-to-pay.md',
  'client guides are the lowercase .md files in a project folder (checklists and READMEs are not)');

ok(guideLangs(BILINGUAL).join() === 'en,es' && guideLangs('# One language').length === 0, 'a guide with lang markers has languages; a plain one has none');
ok(pdfPathsFor('a/b/platform-guide.md', ['en', 'es']).map((p) => p.lang + ':' + p.path).join() === 'en:a/b/platform-guide.en.pdf,es:a/b/platform-guide.es.pdf',
  'a two-language guide gets one PDF per language');
ok(pdfPathsFor('a/b/tap-to-pay.md', []).map((p) => p.path).join() === 'a/b/tap-to-pay.pdf', 'a one-language guide gets one PDF');

const h1 = guideHash(root, guides[0]);
ok(h1 === guideHash(root, guides[0]), 'the fingerprint is stable');
write('assets/docs/projects/maria/screenshots/01.webp', 'image-bytes-v2');
const h2 = guideHash(root, guides[0]);
ok(h2 !== h1, 'changing a screenshot changes the fingerprint');
write('assets/docs/projects/maria/platform-guide.md', BILINGUAL + '\nOne more line.\n');
ok(guideHash(root, guides[0]) !== h2, 'changing the text changes the fingerprint');

let stale = staleGuides(root);
ok(stale.length === 2 && stale.every((s) => /no PDF yet/.test(s.reason)), 'with no PDFs built, both guides are out of date');

for (const g of guides) {
  const md = fs.readFileSync(path.join(root, g), 'utf8');
  for (const p of pdfPathsFor(g, guideLangs(md))) write(p.path, '%PDF-1.4 fake');
  writeManifestEntry(root, g);
}
ok(staleGuides(root).length === 0, 'after building, nothing is out of date');

write('assets/docs/projects/maria/tap-to-pay.md', '# Tap to pay\n\nEdited.\n');
stale = staleGuides(root);
ok(stale.length === 1 && stale[0].md.endsWith('tap-to-pay.md') && /changed/.test(stale[0].reason), 'editing a guide makes its PDF out of date');

fs.rmSync(path.join(root, 'assets/docs/projects/maria/platform-guide.es.pdf'));
ok(staleGuides(root).some((s) => s.md.endsWith('platform-guide.md') && /missing/.test(s.reason)), 'a deleted PDF is reported as missing');

fs.rmSync(root, { recursive: true, force: true });
