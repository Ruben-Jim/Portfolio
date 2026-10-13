// Record live laptop + phone clips of each demo for the hero showcase and the Reels.
// Usage: npm i --no-save puppeteer-core && node scripts/record-hero-showcase.mjs assets/video/showcase /tmp/rec [id,id]
//
// Per project: hold on the hero (typewriter / hero video plays), then both devices scroll their
// whole page to the footer over the same time, set by the phone's page length.
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
  ['tradeservice', 'https://tradeservice.expo.app'],
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
const PHONE_SPEED = 200;   // CSS px/s on the phone; it sets each project's length
const MIN_SCROLL = 10, MAX_SCROLL = 40; // clamp per project (seconds)
// Both devices scroll their WHOLE page over the same time, so they reach the footer together.
const FPS = 30;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DEVICES = {
  desktop: { viewport: { width: 1440, height: 900, deviceScaleFactor: 1 }, scale: '960:600' },
  mobile: {
    // iPhone 15 in Safari: 393×852 screen at 3×; the page sees 852 minus the status bar (59)
    // and Safari's bottom bar (83) = 393×710. Same UA as iOS 18 Safari on an iPhone.
    viewport: { width: 393, height: 710, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
    scale: '393:710'
  }
};

// In-page: find the element that actually scrolls (RN-web pages use an inner scroller).
const MARK_SCROLLER = () => {
  const se = document.scrollingElement;
  if (se.scrollHeight > innerHeight + 80) { se.setAttribute('data-rec-scroller', '1'); return; }
  let best = null, bestH = 0;
  document.querySelectorAll('*').forEach((e) => {
    const cs = getComputedStyle(e);
    const d = e.scrollHeight - e.clientHeight;
    if (d > bestH && /(auto|scroll)/.test(cs.overflowY) && e.clientHeight > innerHeight * 0.6) { best = e; bestH = d; }
  });
  (best || se).setAttribute('data-rec-scroller', '1');
};
const HIDE_COOKIES = () => document.querySelectorAll('body *').forEach((e) => {
  const cs = getComputedStyle(e);
  if ((cs.position === 'fixed' || cs.position === 'sticky') && e.offsetHeight < innerHeight * 0.6 &&
      /cookie|consent|we use analytics|privacy choices/i.test(e.textContent || '')) e.style.display = 'none';
});

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required']
});

async function record(id, url, kind, scrollSecs) {
  const d = DEVICES[kind];
  const page = await browser.newPage();
  if (d.ua) await page.setUserAgent(d.ua);
  await page.setViewport(d.viewport);

  // Warm-up pass: scroll through once so every lazy image is cached.
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
  await sleep(2500);
  await page.evaluate(MARK_SCROLLER);
  for (let y = 0; y <= 20000; y += 250) {
    const at = await page.evaluate((y) => { const el = document.querySelector('[data-rec-scroller]'); el.scrollTop = y; return el.scrollTop; }, y);
    await sleep(220);
    if (at < y - 250) break; // reached the footer
  }

  // Real take: reload so the hero animation starts fresh, then hold + scroll at a steady speed.
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
  await page.evaluate(HIDE_COOKIES);
  await page.evaluate(MARK_SCROLLER);
  await page.evaluate(HIDE_COOKIES);

  const dir = join(TMP, `${id}-${kind}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const s = await page.createCDPSession();
  const frames = [];
  s.on('Page.screencastFrame', async (f) => {
    frames.push({ t: f.metadata.timestamp, data: f.data });
    await s.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await s.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 1440, maxHeight: 2200 });
  const t0 = Date.now() / 1000;
  const range = await page.evaluate(() => { const el = document.querySelector('[data-rec-scroller]'); return el.scrollHeight - el.clientHeight; });
  const secs = scrollSecs || Math.max(MIN_SCROLL, Math.min(MAX_SCROLL, range / PHONE_SPEED));
  await page.evaluate((hold, secs, endHold) => new Promise((resolve) => {
    const el = document.querySelector('[data-rec-scroller]');
    el.scrollTop = 0;
    const start = performance.now();
    const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    (function tick(now) {
      const t = (now - start) / 1000;
      const max = el.scrollHeight - el.clientHeight; // re-read: late content can grow the page
      if (t > hold) el.scrollTop = max * ease(Math.min(1, (t - hold) / secs));
      if (t < hold + secs + endHold) requestAnimationFrame(tick); else resolve();
    })(start);
  }), HOLD, secs, END_HOLD);
  await sleep(150);
  const t1 = Date.now() / 1000;
  await s.send('Page.stopScreencast');
  await page.close();

  // Resample the screencast to a constant 30fps using the real frame timestamps.
  const n = Math.round((t1 - t0) * FPS);
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const t = t0 + i / FPS;
    while (idx + 1 < frames.length && frames[idx + 1].t <= t) idx++;
    writeFileSync(join(dir, `${String(i).padStart(5, '0')}.jpg`), Buffer.from(frames[idx].data, 'base64'));
  }
  const vf = `scale=${d.scale}:force_original_aspect_ratio=increase,crop=${d.scale.replace(':', ':')},format=yuv420p`;
  const base = join(OUT, `${id}-${kind}`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', join(dir, '%05d.jpg'), '-vf', vf,
    '-c:v', 'libx264', '-crf', '27', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', base + '.mp4']);
  execFileSync('magick', [join(dir, '00000.jpg'), '-resize', d.scale.split(':')[0] + 'x', '-quality', '70', base + '-poster.webp']);
  rmSync(dir, { recursive: true, force: true });
  return { frames: frames.length, secs: (t1 - t0).toFixed(1), scrollSecs: secs };
}

for (const [id, url] of PROJECTS) {
  try {
    // Phone first: its page length sets the scroll time; the laptop then uses the same time.
    const mob = await record(id, url, 'mobile');
    const dsk = await record(id, url, 'desktop', mob.scrollSecs);
    console.log(`✓ ${id}  desktop ${dsk.secs}s/${dsk.frames}f  mobile ${mob.secs}s/${mob.frames}f`);
  } catch (err) {
    console.log(`✗ ${id}: ${err.message}`);
  }
}
await browser.close();
