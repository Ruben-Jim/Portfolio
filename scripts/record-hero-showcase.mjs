// Record live laptop + phone clips of each demo for the hero showcase and the Reels.
// Usage: npm i --no-save puppeteer-core && node scripts/record-hero-showcase.mjs assets/video/showcase /tmp/rec [id,id]
//
// Per project: hold on the hero (typewriter / hero video plays), then each device scrolls its
// whole page to the footer at the same steady pace (screens per second), so each clip is as long
// as its own page needs. The hero switches projects when the longer clip ends.
// Outputs <id>-desktop.mp4 960×600, <id>-mobile.mp4 393×710 (iPhone 15 Safari's visible page area) (H.264: smaller than VP9 here and plays everywhere),
// and <id>-<kind>-poster.webp first frames.
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2];
const TMP = process.argv[3];
const ONLY = process.argv[4] ? process.argv[4].split(',') : null;
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const PROJECTS = [
  ['realtor', 'https://realtor.expo.app'],
  ['procleaning', 'https://procleaning.expo.app'],
  ['roofcleaning', 'https://roofcleaning.expo.app'],
  ['treeservice', 'https://treeservice.expo.app'],
  ['carpet', 'https://carpet.expo.app'],
  ['sunergy', 'https://sunergyelectricservices.expo.app'],
  ['pawshine', 'https://pawshine.expo.app'],
  ['lawncare', 'https://lawncare.expo.app'],
  ['beautysalon', 'https://beautysalon.expo.app'],
  ['barbershop', 'https://barbershoptemplate.expo.app'],
  ['photographer', 'https://photographer.expo.app']
].filter(([id]) => !ONLY || ONLY.includes(id));

const HOLD = 4;            // seconds on the hero before scrolling
const END_HOLD = 1.2;      // seconds resting on the footer
const SCREENS_PER_SEC = 0.28; // scroll pace on both devices: about one screen every 3.6s
const MIN_SCROLL = 6, MAX_SCROLL = 40; // clamp per clip (seconds)
const FPS = 30;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DEVICES = {
  desktop: { viewport: { width: 1440, height: 900, deviceScaleFactor: 1 }, scale: '960:600' },
  mobile: {
    // iPhone 15 in Safari: 393×852 screen (captured at 2×, plenty for the 393px clip); the page sees 852 minus the status bar (59)
    // and Safari's bottom bar (83) = 393×710. Same UA as iOS 18 Safari on an iPhone.
    viewport: { width: 393, height: 710, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
    scale: '393:710'
  }
};

// In-page: find the element that actually scrolls (RN-web pages use an inner scroller).
// Picks whichever scrolls furthest: the document or an inner overflow box.
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

// Injected before any page script: a clock that runs in real time while the page loads, then
// freezes and only moves when the recorder steps it (timers, rAF, Date/performance.now, CSS
// animations and <video> all follow it). That makes every frame exactly 1/30s apart.
const VIRTUAL_CLOCK = () => {
  const rNow = performance.now.bind(performance), rDateNow = Date.now, RDate = Date;
  const rInterval = setInterval, rRaf = requestAnimationFrame.bind(window);
  const dateBase = rDateNow() - rNow();
  let frozen = false, vnow = 0, seq = 1;
  const now = () => (frozen ? vnow : rNow());
  const timers = new Map(); // id -> { at, fn, args, every }
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
  // Real-time pump while loading.
  rInterval(() => { if (!frozen) runDue(rNow()); }, 4);
  (function pump(ts) { if (!frozen) runRafs(rNow()); rRaf(pump); })();
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

async function record(id, url, kind) {
  const d = DEVICES[kind];
  const page = await browser.newPage();
  if (d.ua) await page.setUserAgent(d.ua);
  await page.setViewport(d.viewport);
  await page.evaluateOnNewDocument(VIRTUAL_CLOCK);

  // Warm-up pass: scroll through once so every lazy image is cached.
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
  await sleep(2500);
  const warmRange = await page.evaluate(MARK_SCROLLER);
  for (let y = 0; y <= 20000; y += 250) {
    const at = await page.evaluate((y) => { const el = document.querySelector('[data-rec-scroller]'); el.scrollTop = y; return el.scrollTop; }, y);
    await sleep(220);
    if (at < y - 250) break; // reached the footer
  }

  // Real take: reload so the hero animation starts fresh, then hold + scroll at a steady speed.
  // The app renders its scroller after load, so wait until the page scrolls about as far as in the warm-up.
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
  for (let k = 0; k < 40 && (await page.evaluate(MARK_SCROLLER)) < warmRange * 0.8; k++) await sleep(250);
  await page.evaluate(HIDE_COOKIES);

  const dir = join(TMP, `${id}-${kind}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  // Frame by frame on the injected clock: set the scroll position, step the page's time by
  // exactly 1/30s, screenshot. (A real-time screencast dropped frames, so the scroll juddered.)
  const s = await page.createCDPSession();
  const range = await page.evaluate(() => { const el = document.querySelector('[data-rec-scroller]'); return el.scrollHeight - el.clientHeight; });
  const screen = await page.evaluate(() => document.querySelector('[data-rec-scroller]').clientHeight);
  const secs = Math.max(MIN_SCROLL, Math.min(MAX_SCROLL, range / (screen * SCREENS_PER_SEC)));
  const n = Math.round((HOLD + secs + END_HOLD) * FPS);
  const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  await page.evaluate(() => { document.querySelector('[data-rec-scroller]').scrollTop = 0; window.__vt.freeze(); });
  for (let i = 0; i < n; i++) {
    const t = i / FPS;
    const p = t <= HOLD ? 0 : ease(Math.min(1, (t - HOLD) / secs));
    if (i % 15 === 0) await page.evaluate(HIDE_COOKIES); // banners can appear after load
    // Re-read max each frame: late content can grow the page.
    await page.evaluate((p, ms) => {
      const el = document.querySelector('[data-rec-scroller]');
      el.scrollTop = (el.scrollHeight - el.clientHeight) * p;
      window.__vt.step(ms);
    }, p, 1000 / FPS);
    const shot = await s.send('Page.captureScreenshot', { format: 'jpeg', quality: 90, optimizeForSpeed: true });
    writeFileSync(join(dir, `${String(i).padStart(5, '0')}.jpg`), Buffer.from(shot.data, 'base64'));
  }
  await page.close();
  const frames = { length: n };
  const t0 = 0, t1 = n / FPS;
  const vf = `scale=${d.scale}:force_original_aspect_ratio=increase,crop=${d.scale.replace(':', ':')},format=yuv420p`;
  const base = join(OUT, `${id}-${kind}`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', join(dir, '%05d.jpg'), '-vf', vf,
    '-c:v', 'libx264', '-crf', '27', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', base + '.mp4']);
  execFileSync('magick', [join(dir, '00000.jpg'), '-resize', d.scale.split(':')[0] + 'x', '-quality', '70', base + '-poster.webp']);
  rmSync(dir, { recursive: true, force: true });
  return { frames: frames.length, secs: (t1 - t0).toFixed(1) };
}

for (const [id, url] of PROJECTS) {
  try {
    const mob = await record(id, url, 'mobile');
    const dsk = await record(id, url, 'desktop');
    console.log(`✓ ${id}  desktop ${dsk.secs}s/${dsk.frames}f  mobile ${mob.secs}s/${mob.frames}f`);
  } catch (err) {
    console.log(`✗ ${id}: ${err.message}`);
  }
}
await browser.close();
