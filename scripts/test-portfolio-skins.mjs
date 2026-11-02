#!/usr/bin/env node
/**
 * Portfolio skin rules (assets/js/portfolio-skins.js). Run: node scripts/test-portfolio-skins.mjs
 * Guards: which covers are allowed (stills + own video posters only), the
 * card/tab label fallback, skin ordering, demo/client links and blurbs, and
 * that the admin list's verticals save only the fields that changed.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = require('../assets/js/portfolio-skins.js');

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };
const posterOf = (v) => v.replace(/\.(mp4|webm|mov)$/i, '-poster.webp');
const urls = ['/a/one.webp', '/a/demo.webm', '/a/guide.md', '/a/two.webp', '/a/admin-dashboard.webp'];

ok(S.isAllowedCover(urls, '/a/two.webp', posterOf), 'a still on the record is allowed');
ok(S.isAllowedCover(urls, '/a/demo-poster.webp', posterOf), "the record's own video poster is allowed");
ok(!S.isAllowedCover(urls, '/b/other.webp', posterOf), "another record's image is not");
ok(!S.isAllowedCover(urls, '/a/gone-poster.webp', posterOf), 'a poster of a video not on the record is not');
ok(!S.isAllowedCover(urls, '/a/guide.md', posterOf), 'a doc slide is not a cover');
ok(!S.isAllowedCover(urls, '', posterOf), 'empty is not a picked cover');
ok(!S.isAllowedCover(['/a/one.webp'], '/a/demo-poster.webp', posterOf), 'a cover whose video was removed falls back');

const choices = S.coverChoices(urls, posterOf);
ok(choices[0].value === '' && /Auto/.test(choices[0].label), 'Auto comes first');
ok(choices.map((c) => c.value).join() === ',/a/one.webp,/a/two.webp,/a/admin-dashboard.webp,/a/demo-poster.webp', 'stills in order, then posters');
ok(/Home page/.test(choices[choices.length - 1].label), 'poster choice is labelled Home page');
ok(S.coverChoices(['/a/x.webm'], () => '').length === 1, 'a video without a poster adds no choice');

ok(S.labelFor({ title: 'Ink & Needle', skinLabel: '  Tattoo Shop  ' }, false) === 'Tattoo Shop', 'label is trimmed');
ok(S.labelFor({ title: 'Ink & Needle', skinLabel: '' }, false) === 'Ink & Needle', 'skin falls back to its title');
ok(S.labelFor({ title: 'Chair & Studio Platform' }, true) === 'Platform', 'platform falls back to Platform');
ok(S.labelFor({ title: 'X', skinLabel: 'y'.repeat(60) }, false).length === 40, 'label capped at 40');
ok(S.labelFor({}, false) === 'Build', 'a skin with no title or label reads Build');

const order = (list) => S.orderSkins(list).map((s) => s.id).join();
ok(order([{ id: 'a' }, { id: 'b', skinOrder: 20 }, { id: 'c', skinOrder: 10 }, { id: 'd' }]) === 'c,b,a,d', 'numbered first by number, the rest keep their order');
ok(order([{ id: 'a', skinOrder: 10 }, { id: 'b', skinOrder: 10 }]) === 'a,b', 'ties keep their order');
ok(order([{ id: 'a', skinOrder: 'x' }, { id: 'b', skinOrder: 5 }]) === 'b,a', 'a non-number counts as unnumbered');
const src = [{ id: 'a' }]; ok(S.orderSkins(src) !== src, 'returns a new array');

const patch = S.skinPatch({ skinLabel: '  Barber Shop ', skinOrder: '20', coverImageUrl: '/a/one.webp', title: 'nope', imageUrls: [] });
ok(JSON.stringify(Object.keys(patch).sort()) === '["coverImageUrl","skinLabel","skinOrder"]', 'patch carries only the three fields');
ok(patch.skinLabel === 'Barber Shop' && patch.skinOrder === 20, 'patch cleans label and order');
ok(S.skinPatch({ skinOrder: 'abc' }).skinOrder === null, 'bad order becomes null');
ok(JSON.stringify(S.skinPatch({ skinLabel: 'x' })) === '{"skinLabel":"x"}', 'only fields that were passed come out');

// ── Demo vs client, each vertical's own link (2026-10-31) ──
ok(S.kindOf({}) === 'client' && S.kindOf({ skinKind: 'nope' }) === 'client', 'an unmarked build is a client (nothing opens by accident)');
ok(S.kindOf({ skinKind: 'demo' }) === 'demo', 'a build marked demo is a demo');
ok(S.demoLinkFor({ skinKind: 'demo', projectUrl: ' https://carpet.expo.app ' }) === 'https://carpet.expo.app', "a demo opens its own link");
ok(S.demoLinkFor({ skinKind: 'client', projectUrl: 'https://rizopizzeria.com' }) === '', 'a client never gets a link');
ok(S.demoLinkFor({ skinKind: 'demo', projectUrl: '#' }) === '' && S.demoLinkFor({ skinKind: 'demo', projectUrl: 'javascript:alert(1)' }) === '', 'only real http(s) links count');

const plat = { title: 'Trade Services Platform', skinBlurb: 'Roof cleaning out of the box.' };
const carpet = { title: 'Masters Carpet', skinLabel: 'Carpet Cleaning', skinKind: 'demo', projectUrl: 'https://carpet.expo.app', skinBlurb: 'Book a carpet clean in two taps.' };
const t0 = S.tabInfo(plat, plat, true, 'https://tradeservice.expo.app');
ok(t0.liveUrl === 'https://tradeservice.expo.app' && t0.liveLabel === '' && t0.blurb === 'Roof cleaning out of the box.', 'the platform tab keeps the platform link');
const t1 = S.tabInfo(plat, carpet, false, 'https://tradeservice.expo.app');
ok(t1.liveUrl === 'https://carpet.expo.app' && t1.liveLabel === 'Open Carpet Cleaning demo', "a demo tab opens that vertical's demo, never the platform's");
ok(t1.blurb === 'Book a carpet clean in two taps.' && !t1.isClient, 'a demo tab shows its blurb');
const t2 = S.tabInfo(plat, { title: 'Tree', skinKind: 'demo' }, false, 'https://tradeservice.expo.app');
ok(t2.liveUrl === '', 'a demo without a link hides the button (no fallback to the platform)');
const t3 = S.tabInfo(plat, { title: 'Rizo', projectUrl: 'https://rizopizzeria.com' }, false, 'https://x.expo.app');
ok(t3.liveUrl === '' && t3.isClient, 'a client tab has no link');

ok(S.buildsSummary([]).text === '', 'no builds: no line');
ok(S.buildsSummary([carpet, { skinKind: 'demo' }, {}]).text === '2 industry demos · 1 live business', 'line counts demos and live businesses');
ok(S.buildsSummary([carpet]).text === '1 industry demo', 'one demo only');
ok(S.buildsSummary([{}, {}]).text === '2 live businesses', 'clients only');

const p2 = S.skinPatch({ skinKind: 'demo', skinBlurb: '  Book   a clean  ', projectUrl: ' https://carpet.expo.app ' });
ok(p2.skinKind === 'demo' && p2.skinBlurb === 'Book a clean' && p2.projectUrl === 'https://carpet.expo.app', 'patch cleans kind, blurb and link');
ok(S.skinPatch({ skinKind: 'x' }).skinKind === 'client', 'an unknown kind saves as client');
ok(S.skinPatch({ skinBlurb: 'y'.repeat(200) }).skinBlurb.length === 120, 'blurb capped at 120');
ok(S.skinPatch({ projectUrl: 'not a link' }).projectUrl === '', 'a bad link saves as empty');

// Admin list: a vertical's row saves only what changed.
const rowOf = (o) => Object.assign({}, o, { original: Object.assign({}, o) });
const r0 = rowOf({ label: 'Carpet', order: 10, cover: '', kind: 'demo', link: 'https://carpet.expo.app', blurb: '' });
ok(S.changedPatch(r0) === null, 'an untouched row saves nothing');
const r1 = Object.assign(rowOf({ label: 'Pizza', order: 30, cover: '', kind: 'client', link: 'https://rizopizzeria.com', blurb: '' }), { label: 'Rizo' });
const p3 = S.changedPatch(r1);
ok(p3 && p3.skinLabel === 'Rizo' && !('projectUrl' in p3) && !('skinKind' in p3) && !('skinOrder' in p3), "a label edit saves only the label (a client's saved link is never rewritten)");
const r2 = Object.assign(rowOf({ label: '', order: 20, cover: '', kind: 'client', link: '', blurb: '' }), { kind: 'demo', link: ' https://junk.expo.app ', blurb: '  Pickups  by load ' });
const p4 = S.changedPatch(r2);
ok(p4.skinKind === 'demo' && p4.projectUrl === 'https://junk.expo.app' && p4.skinBlurb === 'Pickups by load', 'kind, link and blurb edits are cleaned like any save');
const plat0 = Object.assign(rowOf({ label: 'Roof Cleaning', cover: '/a/one.webp', blurb: '' }), { cover: '/a/two.webp' });
const p5 = S.changedPatch(plat0);
ok(p5 && p5.coverImageUrl === '/a/two.webp' && Object.keys(p5).length === 1, "the platform row saves only its own label, cover and blurb");

// Arrows move one row and renumber all, so later inserts never collide.
const rows = [{ id: 'a', order: 10 }, { id: 'b', order: 20 }, { id: 'c', order: 25 }];
const up = S.moveRow(rows, 2, -1);
ok(up.map((r) => r.id).join() === 'a,c,b' && up.map((r) => r.order).join() === '10,20,30', 'moving up swaps with the row above and renumbers 10, 20, 30');
ok(rows.map((r) => r.id).join() === 'a,b,c' && rows[2].order === 25, 'moving returns new rows (the old list is untouched)');
ok(S.moveRow(rows, 0, -1).map((r) => r.id).join() === 'a,b,c', 'the first row cannot move up');
ok(S.moveRow(rows, 2, 1).map((r) => r.id).join() === 'a,b,c', 'the last row cannot move down');
