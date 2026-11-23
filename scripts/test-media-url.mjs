// Project videos → Firebase Storage URLs. Run: node scripts/test-media-url.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };
const src = readFileSync(new URL('../assets/js/media-url.js', import.meta.url), 'utf8');

function load(on) {
  const code = src.replace(/var MEDIA_FROM_STORAGE = (true|false);/, `var MEDIA_FROM_STORAGE = ${on};`);
  const ctx = { window: {}, module: { exports: {} } };
  vm.runInNewContext(code, ctx);
  return ctx.module.exports;
}

const off = load(false);
ok(off.mediaUrl('/assets/video/showcase/realtor-mobile.mp4?v=5') === '/assets/video/showcase/realtor-mobile.mp4?v=5', 'off: paths unchanged');

const on = load(true);
const base = 'https://firebasestorage.googleapis.com/v0/b/portfolio-2578e.firebasestorage.app/o/';
ok(on.mediaUrl('/assets/video/showcase/realtor-mobile.mp4?v=5') === base + 'media%2Fvideo%2Fshowcase%2Frealtor-mobile.mp4?alt=media&v=5', 'showcase clip → Storage, keeps ?v=');
ok(on.mediaUrl('/assets/images/projects/pawshine/pawshine-demo.mp4') === base + 'media%2Fimages%2Fprojects%2Fpawshine%2Fpawshine-demo.mp4?alt=media', 'project video → Storage');
ok(on.mediaUrl('/assets/images/projects/abo/video-admin.webm?v=1&x=2').indexOf('media%2Fimages%2Fprojects%2Fabo%2Fvideo-admin.webm?alt=media&v=1') > 0, '.webm too');
ok(on.mediaUrl('/assets/images/projects/pawshine/pawshine-demo.webp?v=1') === '/assets/images/projects/pawshine/pawshine-demo.webp?v=1', 'posters and images stay local');
ok(on.mediaUrl('https://example.com/a.mp4') === 'https://example.com/a.mp4', 'full URLs unchanged');
ok(on.mediaUrl('/assets/images/hero/clip.mp4') === '/assets/images/hero/clip.mp4', 'only project and showcase folders move');
ok(on.mediaUrl('') === '' && on.mediaUrl(null) === '', 'empty in, empty out');
ok(off.objectName('/assets/video/showcase/a.mp4') === 'media/video/showcase/a.mp4', 'object name');
