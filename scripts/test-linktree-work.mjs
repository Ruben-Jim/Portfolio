// Link Tree "Recent work": which portfolio projects show and how each card reads.
// Run: node scripts/test-linktree-work.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const W = require('../assets/js/linktree-work.js');

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };
const ids = (items) => items.map((x) => x.id).join(',');

const rtdb = {
  a: { title: 'Alpha', linktree: true, linktreeOrder: 20, order: 1 },
  b: { title: 'Bravo', linktree: true, linktreeOrder: 10, order: 2 },
  c: { title: 'Charlie', linktree: false, order: 3 },
  d: { title: 'Delta', order: 4 },
  e: { title: 'Echo', linktree: true, order: 0 },
  f: { title: 'Foxtrot', linktree: true, order: 9 },
  g: { title: '  ', linktree: true },
  h: null
};
ok(ids(W.pick(rtdb)) === 'b,a,e,f', 'only ticked projects; numbered first by number, then by portfolio order; blank titles skipped');
ok(ids(W.pick([{ id: 'x', title: 'X', linktree: 'true' }])) === '', 'only a real true ticks a project');
ok(W.pick(null).length === 0 && W.pick({}).length === 0, 'no data → no items (the page keeps its fallback)');
const many = {};
for (let i = 0; i < 9; i++) many['p' + i] = { title: 'P' + i, linktree: true, linktreeOrder: i };
ok(W.pick(many).length === W.MAX_ITEMS, 'capped at ' + W.MAX_ITEMS);

const item = W.toItem({
  id: 'r', title: 'Rizo', projectUrl: 'https://rizo.expo.app', isTemplate: false,
  imageUrls: ['/a/home.mp4', '/a/home.webp', '/a/menu.webp'], techTags: ['Expo', 'Firebase', 'Stripe', 'Node'],
  description: 'Online ordering with live tracking. Kitchen dashboard too.'
});
ok(item.url === 'https://rizo.expo.app', 'a demo links to its site');
ok(item.thumb === '/a/home.webp', 'thumbnail is the first still, never a video');
ok(item.badge === 'live', 'a non-template is Live');
ok(item.tags.join(',') === 'Expo,Firebase,Stripe', 'at most 3 tech tags');
ok(item.desc === 'Online ordering with live tracking.', 'description is the first sentence');

ok(W.toItem({ title: 'C', liveKind: 'client', projectUrl: 'https://c.com' }).url === '', 'a client project never links out');
ok(W.toItem({ title: 'J', projectUrl: 'javascript:alert(1)' }).url === '', 'only http(s) links');
ok(W.toItem({ title: 'T', isTemplate: true }).badge === 'template', 'a template gets the Template badge');
ok(W.toItem({ title: 'V', coverImageUrl: '/v/poster.webp', imageUrls: ['/v/a.webp'] }).thumb === '/v/poster.webp', 'the admin cover wins');
ok(W.toItem({ title: 'V', coverImageUrl: '/v/clip.mp4', imageUrls: { 0: '/v/a.webp' } }).thumb === '/v/a.webp', 'a video cover falls back to a still; object-shaped arrays work');
ok(W.toItem({ title: 'B', skinBlurb: 'Short blurb', description: 'Long text.' }).desc === 'Short blurb', 'the build blurb wins over the description');
ok(W.descFor({ description: '· Books jobs\n· Takes payments' }) === 'Books jobs Takes payments', 'bullet markers are stripped');
const long = W.descFor({ description: 'word '.repeat(60) });
ok(long.length <= 120 && long.endsWith('…'), 'long text is cut on a word with an ellipsis');
ok(W.toItem({ title: 'S', techTags: 'Expo, Firebase' }).tags.join('|') === 'Expo|Firebase', 'comma-separated tags work');

// ── Admin list ──
const all = {
  p1: { title: 'Platform', isTemplate: true, order: 1 },
  b1: { title: 'Build', builtFromTemplateId: 'p1', linktree: true, linktreeOrder: 20, order: 5 },
  s1: { title: 'Solo', linktree: true, linktreeOrder: 10, order: 2, visibility: 'private' },
  s2: { title: 'Other', order: 3 }
};
const rows = W.adminRows(all);
ok(rows.shown.map((r) => r.id).join() === 's1,b1', 'admin: shown in page order');
ok(rows.hidden.map((r) => r.id).join() === 'p1,s2', 'admin: the rest in portfolio order');
ok(rows.shown[1].parentTitle === 'Platform', 'admin: a build names its platform');
ok(rows.shown[0].isPrivate === true, 'admin: private projects are flagged');
ok(rows.hidden[0].badge === 'template', 'admin: template badge');
const capped = {};
for (let i = 0; i < 8; i++) capped['c' + i] = { title: 'C' + i, linktree: true, linktreeOrder: (i + 1) * 10 };
const cr = W.adminRows(capped);
ok(cr.shown.length === 8 && cr.shown.filter((r) => r.overCap).map((r) => r.id).join() === 'c6,c7', 'admin: ticked past the cap are marked overCap');

ok(JSON.stringify(W.togglePatch(rows.shown, false)) === JSON.stringify({ linktree: false, linktreeOrder: null }), 'hiding clears the order');
ok(W.togglePatch(rows.shown, true).linktreeOrder === 30, 'showing goes last');
ok(W.togglePatch([], true).linktreeOrder === 10, 'first shown gets 10');
ok(W.togglePatch([{ order: null }, { order: null }], true).linktreeOrder === 30, 'unnumbered shown rows still put the new one after them');

ok(JSON.stringify(W.movePatches(rows.shown, 1, -1)) === JSON.stringify({ b1: 10, s1: 20 }), 'move up swaps and renumbers');
ok(JSON.stringify(W.movePatches(rows.shown, 0, -1)) === '{}', 'moving past the top does nothing');

// ── Package settings ──
const KNOWN = ['linktree', 'starter-page', 'website', 'starter', 'growth'];
const def = W.normalizeSettings(null, KNOWN);
ok(def.packages.join() === 'starter-page,website,starter' && def.popular === 'starter', 'nothing saved → defaults with Website + app popular');
ok(W.normalizeSettings({ packages: ['website', 'starter', 'growth'], popular: 'growth' }, KNOWN).popular === 'growth', 'saved picks are kept');
ok(W.normalizeSettings({ packages: { 0: 'website', 1: 'starter', 2: 'growth' } }, KNOWN).popular === '', 'RTDB object arrays work; no popular saved → none');
ok(W.normalizeSettings({ packages: ['website', 'website', 'growth'] }, KNOWN).packages.join() === def.packages.join(), 'duplicates → defaults');
ok(W.normalizeSettings({ packages: ['website', 'gone', 'growth'] }, KNOWN).packages.join() === def.packages.join(), 'an unknown package → defaults');
ok(W.normalizeSettings({ packages: ['website', 'starter', 'growth'], popular: 'linktree' }, KNOWN).popular === '', 'popular must be one of the 3');

// ── Reviews ──
const rv = (id, t, extra) => ({ id, data: Object.assign({ createdAt: { seconds: t } }, extra) });
const reviews = [rv('a', 1), rv('b', 5), rv('c', 3, { hidden: true }), rv('d', 4)];
ok(W.reviewsFor(reviews).map((x) => x.id).join() === 'b,d', 'none picked → 2 newest, hidden skipped');
const picked = [rv('a', 1, { linktree: true }), rv('b', 5), rv('c', 3, { linktree: true, hidden: true }), rv('d', 4, { linktree: true }), rv('e', 2, { linktree: true }), rv('f', 6, { linktree: true })];
ok(W.reviewsFor(picked).map((x) => x.id).join() === 'f,d,e', 'picked ones only, newest first, max 3, hidden never');
ok(W.millis('2026-01-01') > 0 && W.millis(5) === 5 && W.millis(null) === 0, 'dates from Firestore, numbers or strings');

// ── Cards: blurb, features, link ──
const lib = {
  plat: { title: 'Platform', isTemplate: true },
  privPlat: { title: 'Hidden platform', visibility: 'private' },
  build: { title: 'Build', builtFromTemplateId: 'plat', linktree: true, linktreeOrder: 1, visibility: 'private' },
  buildOfPriv: { title: 'B2', builtFromTemplateId: 'privPlat', linktree: true, linktreeOrder: 2, projectUrl: 'https://b2.app' },
  solo: { title: 'Solo', linktree: true, linktreeOrder: 3, linktreeBlurb: '  Short   line  ', features: ['A', 'B', 'C', 'D'], description: 'Long. More.' },
  privClient: { title: 'Private client', linktree: true, linktreeOrder: 4, visibility: 'private', liveKind: 'client', projectUrl: 'https://c.app' }
};
const cards = Object.fromEntries(W.pick(lib).map((x) => [x.id, x]));
ok(cards.solo.href === 'https://rubenjimenez.dev/portfolio?project=solo', 'a public project opens its popup on the portfolio');
ok(cards.build.href === 'https://rubenjimenez.dev/portfolio?project=build', 'a build opens through its public platform');
ok(cards.buildOfPriv.href === 'https://b2.app', 'a build of a private platform falls back to its live site');
ok(cards.privClient.href === '', 'a private client project has no link');
ok(cards.solo.desc === 'Short line' && cards.solo.blurb === 'Short line', 'the typed Link Tree line wins, cleaned');
ok(W.toItem({ title: 'X', description: 'First one. Second.' }).desc === 'First one.', 'no typed line → first sentence');
ok(cards.solo.features.join() === 'A,B,C', "first 3 What's included chips");
ok(W.cleanBlurb('x'.repeat(200)).length === W.MAX_BLURB, 'the typed line is capped');
ok(W.adminRows(lib).shown.find((r) => r.id === 'solo').autoBlurb === 'Long.', 'admin rows carry the automatic line as a placeholder');

// ── Phone view ──
import { readFileSync as readSrc } from 'node:fs';
const mainSrc = readSrc(new URL('../assets/js/script.js', import.meta.url), 'utf8');
const shotsSrc = (mainSrc.match(/var PORTFOLIO_MOBILE_SHOTS = (\{[\s\S]*?\});/) || [])[1] || '{}';
const videosSrc = (mainSrc.match(/var PORTFOLIO_MOBILE_VIDEOS = (\[[\s\S]*?\]);/) || [])[1] || '[]';
const versionSrc = Number((mainSrc.match(/var PORTFOLIO_MOBILE_SHOT_VERSION = (\d+)/) || [])[1]);
const evalLit = (s) => Function('return ' + s)();
ok(JSON.stringify(evalLit(shotsSrc)) === JSON.stringify(W.PHONE_SHOTS), 'phone captures list matches the portfolio (script.js)');
ok(JSON.stringify(evalLit(videosSrc)) === JSON.stringify(W.PHONE_VIDEOS) && versionSrc === W.PHONE_VERSION, 'phone videos + version match the portfolio');

const showVideo = W.phoneFor({ projectUrl: 'https://pawshine.expo.app/' }, []);
ok(showVideo && showVideo.kind === 'video' && /pawshine-mobile\.mp4\?v=/.test(showVideo.src) && /poster/.test(showVideo.poster), 'live site with a recorded clip → phone video + poster');
const showStill = W.phoneFor({ projectUrl: 'https://ruben-jim.github.io/DEMO/' }, []);
ok(showStill && showStill.kind === 'image' && /homeverse-mobile\.webp/.test(showStill.src), 'capture without a clip → phone still');

const groups = [{ source: 'images', files: [
  { path: '/assets/images/projects/acme/admin-dashboard.webp', kind: 'image', portrait: true },
  { path: '/assets/images/projects/acme/phone-home.webp', kind: 'image', portrait: true, name: 'phone-home.webp' },
  { path: '/assets/images/projects/acme/desktop.webp', kind: 'image', portrait: false }
] }];
const folderPick = W.phoneFor({ imageUrls: ['/assets/images/projects/acme/desktop.webp'] }, groups);
ok(folderPick && folderPick.src === '/assets/images/projects/acme/phone-home.webp', 'phone-shaped still from the project folder, admin screens skipped');
ok(W.phoneFor({ imageUrls: ['/assets/images/projects/none/x.webp'] }, groups) === null, 'no phone capture → null (cover in the phone shape)');
ok(W.toItem({ id: 'p', title: 'P', projectUrl: 'https://carpet.expo.app' }, {}).phone.kind === 'video', 'card items carry their phone media');
const rowsWithPhone = W.adminRows({ a: { title: 'A', linktree: true, projectUrl: 'https://carpet.expo.app' }, b: { title: 'B', linktree: true } });
ok(rowsWithPhone.shown.find((r) => r.id === 'a').hasPhone === true && rowsWithPhone.shown.find((r) => r.id === 'b').hasPhone === false, 'admin rows flag projects without a phone capture');
