#!/usr/bin/env node
/**
 * Portfolio skin rules (assets/js/portfolio-skins.js). Run: node scripts/test-portfolio-skins.mjs
 * Guards: which covers are allowed (stills + own video posters only), the
 * card/tab label fallback, skin ordering, and that a skin save only ever
 * carries label, order and cover.
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
