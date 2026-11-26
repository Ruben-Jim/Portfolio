#!/usr/bin/env node
// Project pages (/portfolio/<slug>/): slugs, which projects get a page, and the page-file stamp.
// Run: node scripts/test-project-pages.mjs
import { createRequire } from 'node:module';
import { stampProjectPage, metaDescription, snapshotFrom } from './lib/project-pages.mjs';
const require = createRequire(import.meta.url);
const { PortfolioDetailShared: D } = require('../assets/js/portfolio-detail-shared.js');

let failures = 0;
const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) failures++; };

ok(D.projectSlug('Rizo’s Pizzería Ajijic') === 'rizos-pizzeria-ajijic', 'apostrophes and accents drop out of slugs');
ok(D.projectSlug('Realtor & Insurance Platform') === 'realtor-and-insurance-platform', '& becomes "and"');
ok(D.projectSlug('   ') === 'project', 'an empty title still gets a slug');
ok(D.projectSlug('x'.repeat(90)).length <= 60, 'slugs are at most 60 characters');

const all = [
  { id: 'b', title: 'Barber Shop', order: 30, builtFromTemplateId: 'p' },
  { id: 'p', title: 'Chair & Studio Platform', order: 20, isTemplate: true },
  { id: 'h', title: 'Hidden', order: 5, visibility: 'private' },
  { id: 'a', title: 'Same Name', order: 10 },
  { id: 'c', title: 'Same Name', order: 40 },
  { id: 'd', title: 'Own Build', order: 50, builtFromTemplateId: 'not-a-template' }
];
const pages = D.projectPages(all);
ok(pages.map((p) => p.slug).join() === 'same-name,chair-and-studio-platform,same-name-2,own-build', 'grid order, private and in-card builds left out, duplicates numbered');
const hit = D.projectPageFor(all, 'b');
ok(hit && hit.page.slug === 'chair-and-studio-platform' && hit.buildId === 'b', 'a build opens its platform page on its tab');
ok(D.projectPageFor(all, 'h') === null, 'a private project has no page');

const snap = snapshotFrom([{ id: 'x', title: 'Pro <Clean>', description: '· one\n· two', imageUrls: ['/assets/images/a/clip.webm', 'assets/images/a/shot.webp'] }]);
ok(snap[0].image === '/assets/images/a/shot.webp', 'the preview image skips videos');
ok(metaDescription({ title: 'T', description: 'a '.repeat(120) }).length <= 160, 'descriptions are cut to 160 characters');

const shell = '<html><head><title>Portfolio | X</title><meta name="title" content="P"><meta name="description" content="D" data-price-template="{pkg_x}">' +
  '<meta name="robots" content="index"><meta property="og:url" content="u"><meta property="og:title" content="t"><meta property="og:description" content="d">' +
  '<meta property="og:image" content="i"><meta property="twitter:url" content="u"><meta property="twitter:title" content="t"><meta property="twitter:description" content="d">' +
  '<meta property="twitter:image" content="i"><link rel="canonical" href="https://rubenjimenez.dev/portfolio/"></head><body>' +
  '<article class="portfolio" data-page="portfolio"><header><h1 class="h2 article-title" data-i18n="portfolio.title">Portfolio</h1></header>' +
  '<section class="project-page" id="portfolio-project-page" aria-labelledby="project-page-title" hidden><header><h2 class="h2 article-title project-page-title" id="project-page-title" data-project-page-title>Project</h2></header>' +
  '<div class="project-page-body" data-project-page-body></div></section></article></body></html>';
const { html, misses } = stampProjectPage(shell, snap[0], null, { slug: 'next-one', title: 'Next One' });
ok(!misses.length, 'every tag found' + (misses.length ? ': ' + misses.join(', ') : ''));
ok(html.includes('<title>Pro &lt;Clean&gt; | CodeWithRuben</title>') && !html.includes('<Clean>'), 'title is escaped');
ok(html.includes('href="https://rubenjimenez.dev/portfolio/pro-clean/"'), 'canonical is the project URL');
ok((html.match(/<h1/g) || []).length === 1 && /<h1[^>]*project-page-title[^>]*>Pro &lt;Clean&gt;<\/h1>/.test(html), 'one <h1>: the project');
ok(!html.includes('data-price-template'), 'no price markers carried over');
ok(/id="portfolio-project-page"[^>]*data-prerendered="pro-clean"/.test(html) && !/id="portfolio-project-page"[^>]*hidden/.test(html), 'the page section is shown pre-filled');
ok(html.includes('<li>one</li><li>two</li>') && html.includes('/portfolio/next-one/'), 'text and next-project link are pre-built');
ok(html.includes('class="portfolio is-project-page"'), 'the grid is hidden on the page file');

if (failures) { console.log(`\n✗ ${failures} project page check(s) failed`); process.exit(1); }
console.log('\n✓ project pages');
