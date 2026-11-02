// Portfolio media for template verticals: 1920×1200 page stills + a scrolling home-page demo video,
// the same set the existing verticals use (pawshine, sunergy, homecontractors).
// Usage: npm i --no-save puppeteer-core && node scripts/capture-vertical-media.mjs <outDir> /tmp/vcap [stills|video|all] [id,id]
// Writes <outDir>/<id>/<id>-{home,home-services,services,our-work,testimonials,contact}.webp
// and <id>-demo.mp4 + <id>-demo-poster.webp (960×600: it is the card cover, so it must stay sharp). MP4 only: the site plays one file per video
// and the admin picker prefers the .mp4, so a .webm twin would never be used.
// Capture into a review folder, then copy the keepers into assets/images/projects/<id>/
// and run ./scripts/build-portfolio-assets.sh so the admin picker lists them.
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2];
const TMP = process.argv[3];
const MODE = process.argv[4] || 'all';
const ONLY = process.argv[5] ? process.argv[5].split(',') : null;
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

// Trades template verticals (Trade Services Platform). Roof cleaning is the platform itself.
const VERTICALS = [
  ['masterscarpet', 'https://carpet.expo.app'],
  ['squirreltree', 'https://squirreltreeservice.expo.app'],
  ['fiestarentals', 'https://rentals.expo.app'],
  ['valleyhaul', 'https://junk.expo.app'],
  ['rapidoroadside', 'https://roadsidefix.expo.app']
].filter(([id]) => !ONLY || ONLY.includes(id));

// 1280×800 CSS pixels at 1.5× = 1920×1200 files.
const VIEW = { width: 1280, height: 800, deviceScaleFactor: 1.5 };
const PAGES = [
  ['services', '/services'],
  ['our-work', '/our-work'],
  ['testimonials', '/testimonials'],
  ['contact', '/contact']
];
const HOLD = 3.5;          // seconds on the hero before scrolling
const END_HOLD = 1.2;      // seconds resting on the footer
const SCREENS_PER_SEC = 0.32;
const MIN_SCROLL = 6, MAX_SCROLL = 14; // keeps each video near the existing ~17s ones
const FPS = 30;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// In-page: find the element that actually scrolls (RN-web pages use an inner scroller).
const MARK_SCROLLER = () => {
  document.querySelectorAll('[data-rec-scroller]').forEach((e) => e.removeAttribute('data-rec-scroller'));
  const se = document.scrollingElement;
  let best = se, bestH = se.scrollHeight - se.clientHeight;
  document.querySelectorAll('*').forEach((e) => {
    const cs = getComputedStyle(e);
    const d = e.scrollHeight - e.clientHeight;
    if (d > bestH && /(auto|scroll)/.test(cs.overflowY) && e.clientHeight > innerHeight * 0.6) { best = e; bestH = d; }
  });
  best.setAttribute('data-rec-scroller', '1');
  return bestH;
};
const HIDE_COOKIES = () => document.querySelectorAll('body *').forEach((e) => {
  const cs = getComputedStyle(e);
  if ((cs.position === 'fixed' || cs.position === 'sticky') && e.offsetHeight < innerHeight * 0.6 &&
      /cookie|consent|we use analytics|privacy choices/i.test(e.textContent || '')) e.style.display = 'none';
});
const SCROLL_TO = (y) => { const el = document.querySelector('[data-rec-scroller]'); el.scrollTop = y; return el.scrollTop; };

// Same frame-exact clock as record-hero-showcase.mjs: real time while loading, then it only
// moves when stepped, so every video frame is exactly 1/FPS apart.
const VIRTUAL_CLOCK = () => {
  const rNow = performance.now.bind(performance), rDateNow = Date.now, RDate = Date;
  const rInterval = setInterval, rRaf = requestAnimationFrame.bind(window);
  const dateBase = rDateNow() - rNow();
  let frozen = false, vnow = 0, seq = 1;
  const now = () => (frozen ? vnow : rNow());
  const timers = new Map();
  const rafs = new Map();
  const runDue = (until) => {
    for (;;) {
      let next = null;
      for (const [id, t] of timers) if (t.at <= until && (!next || t.at < next[1].at)) next = [id, t];
      if (!next) return;
      const [id, t] = next;
      if (frozen && t.at > vnow) vnow = t.at;
      if (t.every != null) t.at += Math.max(1, t.every); else timers.delete(id);
      try { typeof t.fn === 'function' ? t.fn(...t.args) : (0, eval)(String(t.fn)); } catch (e) { console.error(e); }
    }
  };
  const runRafs = (ts) => { const list = [...rafs.values()]; rafs.clear(); list.forEach((fn) => { try { fn(ts); } catch (e) {} }); };
  window.setTimeout = (fn, ms, ...args) => { const id = seq++; timers.set(id, { at: now() + (Number(ms) || 0), fn, args, every: null }); return id; };
  window.setInterval = (fn, ms, ...args) => { const id = seq++; timers.set(id, { at: now() + Math.max(1, Number(ms) || 0), fn, args, every: Number(ms) || 0 }); return id; };
  window.clearTimeout = window.clearInterval = (id) => { timers.delete(id); };
  window.requestAnimationFrame = (fn) => { const id = seq++; rafs.set(id, fn); return id; };
  window.cancelAnimationFrame = (id) => { rafs.delete(id); };
  performance.now = () => now();
  const vDateNow = () => Math.round(dateBase + now());
  RDate.now = vDateNow;
  window.Date = class extends RDate { constructor(...a) { a.length ? super(...a) : super(vDateNow()); } static now() { return vDateNow(); } };
  rInterval(() => { if (!frozen) runDue(rNow()); }, 4);
  (function pump() { if (!frozen) runRafs(rNow()); rRaf(pump); })();
  const anims = new Map(); const vids = new Set();
  const track = () => {
    document.getAnimations().forEach((a) => { if (!anims.has(a)) { a.pause(); anims.set(a, true); } });
    document.querySelectorAll('video').forEach((v) => { if (!vids.has(v)) { v.pause(); vids.add(v); } });
  };
  window.__vt = {
    freeze() { vnow = rNow(); frozen = true; track(); },
    step(ms) {
      const target = vnow + ms;
      runDue(target); vnow = target;
      runRafs(vnow);
      track();
      anims.forEach((_, a) => { try { if (a.playState !== 'finished') a.currentTime = (a.currentTime || 0) + ms; } catch (e) {} });
      vids.forEach((v) => { try { if (v.duration) v.currentTime = (v.currentTime + ms / 1000) % v.duration; } catch (e) {} });
    }
  };
};

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required']
});
async function newPage(clock) {
  const page = await browser.newPage();
  await page.setViewport(VIEW);
  if (clock) await page.evaluateOnNewDocument(VIRTUAL_CLOCK);
  return page;
}

// Load a route and scroll it once top to bottom so lazy images are in before the shot.
async function open(page, url) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
  await sleep(2500);
  let range = 0;
  for (let k = 0; k < 40 && (range = await page.evaluate(MARK_SCROLLER)) < 50; k++) await sleep(250);
  for (let y = 0; y <= Math.min(range, 20000); y += 400) { await page.evaluate(SCROLL_TO, y); await sleep(120); }
  await page.evaluate(SCROLL_TO, 0);
  await page.evaluate(HIDE_COOKIES);
  await sleep(1500);
  return range;
}

async function stills(id, base) {
  const dir = join(OUT, id);
  mkdirSync(dir, { recursive: true });
  const page = await newPage(false);
  const shot = async (name) => {
    const png = join(TMP, `${id}-${name}.png`);
    await page.screenshot({ path: png });
    execFileSync('magick', [png, '-resize', '1920x1200!', '-quality', '82', join(dir, `${id}-${name}.webp`)]);
    rmSync(png, { force: true });
  };
  await open(page, base);
  await shot('home');
  // One screen down: the services strip under the hero.
  await page.evaluate(() => { const el = document.querySelector('[data-rec-scroller]'); el.scrollTop = el.clientHeight; });
  await sleep(1500);
  await shot('home-services');
  for (const [name, path] of PAGES) {
    await open(page, base + path);
    await shot(name);
  }
  await page.close();
}

async function video(id, base) {
  const dir = join(OUT, id);
  mkdirSync(dir, { recursive: true });
  const page = await newPage(true);
  // Warm-up pass caches every lazy image, then a fresh load restarts the hero animation.
  const warmRange = await open(page, base);
  await page.goto(base, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
  for (let k = 0; k < 40 && (await page.evaluate(MARK_SCROLLER)) < warmRange * 0.8; k++) await sleep(250);
  await page.evaluate(HIDE_COOKIES);

  const frames = join(TMP, `${id}-frames`);
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });
  const cdp = await page.createCDPSession();
  const { range, screen } = await page.evaluate(() => {
    const el = document.querySelector('[data-rec-scroller]');
    return { range: el.scrollHeight - el.clientHeight, screen: el.clientHeight };
  });
  const secs = Math.max(MIN_SCROLL, Math.min(MAX_SCROLL, range / (screen * SCREENS_PER_SEC)));
  const n = Math.round((HOLD + secs + END_HOLD) * FPS);
  const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  await page.evaluate(() => { document.querySelector('[data-rec-scroller]').scrollTop = 0; window.__vt.freeze(); });
  for (let i = 0; i < n; i++) {
    const t = i / FPS;
    const p = t <= HOLD ? 0 : ease(Math.min(1, (t - HOLD) / secs));
    if (i % 15 === 0) await page.evaluate(HIDE_COOKIES); // banners can appear after load
    await page.evaluate((p, ms) => {
      const el = document.querySelector('[data-rec-scroller]');
      el.scrollTop = (el.scrollHeight - el.clientHeight) * p;
      window.__vt.step(ms);
    }, p, 1000 / FPS);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, optimizeForSpeed: true });
    writeFileSync(join(frames, `${String(i).padStart(5, '0')}.jpg`), Buffer.from(shot.data, 'base64'));
  }
  await page.close();

  const out = join(dir, `${id}-demo`);
  const input = ['-v', 'error', '-y', '-framerate', String(FPS), '-i', join(frames, '%05d.jpg'), '-vf', 'scale=1920:1200,format=yuv420p', '-an'];
  execFileSync('ffmpeg', [...input, '-c:v', 'libx264', '-crf', '24', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out + '.mp4']);
  execFileSync('magick', [join(frames, '00000.jpg'), '-resize', '960x600!', '-quality', '80', out + '-poster.webp']);
  rmSync(frames, { recursive: true, force: true });
  return { secs: (n / FPS).toFixed(1), frames: n };
}

for (const [id, base] of VERTICALS) {
  try {
    if (MODE !== 'video') await stills(id, base);
    const v = MODE !== 'stills' ? await video(id, base) : null;
    console.log(`✓ ${id}${v ? `  video ${v.secs}s/${v.frames}f` : ''}`);
  } catch (err) {
    console.log(`✗ ${id}: ${err.message}`);
  }
}
await browser.close();
