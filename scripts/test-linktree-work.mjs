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
