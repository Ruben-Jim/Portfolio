// Capture matched desktop (tall, stitched) + mobile screenshots for the hero showcase.
// Usage: npm i --no-save puppeteer-core && node scripts/capture-hero-showcase.mjs assets/images/hero/showcase /tmp/cap [id,id]
// Uses your installed Google Chrome. Later frames lose their top 130px so in-scroller headers don't repeat at the seams.
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2];
const TMP = process.argv[3];
const ONLY = process.argv[4] ? process.argv[4].split(',') : null;
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const PROJECTS = [
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
  ['photographer', 'https://photographer.expo.app'],
  ['aimnshoot', 'https://aimnshootrecords.expo.app']
].filter(([id]) => !ONLY || ONLY.includes(id));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// In-page helpers
const HIDE_COOKIES = () => {
  document.querySelectorAll('body *').forEach((e) => {
    const cs = getComputedStyle(e);
    if ((cs.position === 'fixed' || cs.position === 'sticky') && e.offsetHeight < innerHeight * 0.6 &&
        /cookie|consent|we use analytics/i.test(e.textContent || '')) e.style.display = 'none';
  });
};
// Wait until the main headline stops changing for 900ms (typewriters pause on a full word).
const WAIT_STABLE = async () => {
  const read = () => [...document.querySelectorAll('h1, h2')].slice(0, 2).map((h) => h.innerText).join('|');
  let last = read(), since = performance.now(), start = performance.now();
  while (performance.now() - start < 12000) {
    await new Promise((r) => setTimeout(r, 100));
    const now = read();
    if (now !== last) { last = now; since = performance.now(); }
    else if (performance.now() - since > 900 && now.replace(/\|/g, '').trim().length > 3) return now;
  }
  return 'timeout:' + last;
};
const FIND_SCROLLER = () => {
  const se = document.scrollingElement;
  if (se.scrollHeight > innerHeight + 80) return 'window';
  let best = null, bestH = 0;
  document.querySelectorAll('*').forEach((e) => {
    const cs = getComputedStyle(e);
    const d = e.scrollHeight - e.clientHeight;
    if (d > bestH && /(auto|scroll)/.test(cs.overflowY) && e.clientHeight > innerHeight * 0.6) { best = e; bestH = d; }
  });
  if (!best) return 'none';
  best.setAttribute('data-cap-scroller', '1');
  return 'element';
};

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  // Headless Chrome doesn't paint some lazy RN-web images; CAP_HEADFUL=1 runs a real
  // (off-screen) window, which does.
  headless: process.env.CAP_HEADFUL ? false : 'new',
  args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', '--window-position=-3000,0', '--window-size=1460,1000']
});

for (const [id, url] of PROJECTS) {
  try {
    // ——— desktop: 3 screens stitched (skip with CAP_MOBILE_ONLY=1) ———
    let mode = 'skipped', parts = [], head = '';
    if (!process.env.CAP_MOBILE_ONLY) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
    await sleep(3500);
    await page.evaluate(HIDE_COOKIES);
    mode = await page.evaluate(FIND_SCROLLER);
    const scrollTo = (y) => page.evaluate((y) => {
      const el = document.querySelector('[data-cap-scroller]');
      if (el) el.scrollTop = y; else window.scrollTo(0, y);
      return el ? el.scrollTop : window.scrollY;
    }, y);
    if (mode !== 'none') {
      for (const y of [900, 1800]) {
        const actual = await scrollTo(y);
        await sleep(1400);
        if (parts.length && actual < y - 450) break; // reached the bottom early
        // fixed/sticky chrome only belongs in the first frame
        await page.evaluate(() => document.querySelectorAll('body *').forEach((e) => {
          const p = getComputedStyle(e).position;
          if ((p === 'fixed' || p === 'sticky') && !e.hasAttribute('data-cap-scroller')) e.style.visibility = 'hidden';
        }));
        const f = join(TMP, `${id}-d${y}.png`);
        await page.screenshot({ path: f });
        parts.push(f);
      }
      await page.evaluate(() => document.querySelectorAll('body *').forEach((e) => { e.style.visibility = ''; }));
      await scrollTo(0);
      await sleep(1200);
    }
    head = await page.evaluate(WAIT_STABLE);
    const top = join(TMP, `${id}-d0.png`);
    await page.screenshot({ path: top });
    await page.close();
    // Headers that live inside the scroll container would repeat at each seam: trim them off later frames.
    const trimmed = mode === 'element'
      ? parts.map((f) => { const t = f.replace('.png', '-t.png'); execFileSync('magick', [f, '-crop', '1440x770+0+130', '+repage', t]); return t; })
      : parts;
    execFileSync('magick', [top, ...trimmed, '-append', '-resize', '960x', '-quality', '70', join(OUT, `${id}-desktop.webp`)]);
    }

    // ——— mobile: 3 iPhone screens stitched ———
    const m = await browser.newPage();
    await m.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
    await m.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await m.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
    await sleep(3500);
    await m.evaluate(HIDE_COOKIES);
    // Sticky bottom action bars and chat bubbles would land mid-image once stitched.
    const hideBottomChrome = () => m.evaluate(() => document.querySelectorAll('body *').forEach((e) => {
      const cs = getComputedStyle(e);
      const pos = cs.position;
      if (pos !== 'fixed' && pos !== 'sticky' && pos !== 'absolute') return;
      if (e.querySelector('[data-cap-scroller]')) return;
      const r = e.getBoundingClientRect();
      if (r.bottom < innerHeight * 0.55) return;
      // RN-web renders every image as absolutely positioned layers, so absolute elements are
      // only hidden when they look like floating chrome: an edge-hugging round button
      // (chat, back-to-top) or a full-width bar on the bottom edge (Book / Call).
      const floatingButton = r.width < 90 && r.height < 90 && (r.left < 30 || r.right > innerWidth - 30);
      const bottomBar = r.width > innerWidth * 0.6 && r.height < 140 && r.bottom > innerHeight - 12;
      const fixedChrome = pos !== 'absolute' && r.height < innerHeight * 0.35 && r.top > innerHeight * 0.62;
      if (floatingButton || bottomBar || fixedChrome) e.style.visibility = 'hidden';
    }));
    const mmode = await m.evaluate(FIND_SCROLLER);
    const mScroll = (y) => m.evaluate((y) => {
      const el = document.querySelector('[data-cap-scroller]');
      if (el) el.scrollTop = y; else window.scrollTo(0, y);
      return el ? el.scrollTop : window.scrollY;
    }, y);
    const mparts = [];
    if (mmode !== 'none') {
      // Headless Chrome skips off-screen image loads: pre-load every image URL the page
      // references (img src + CSS background-image) so frames paint immediately.
      await m.evaluate(async () => {
        const urls = new Set();
        document.querySelectorAll('img').forEach((i) => { if (i.currentSrc || i.src) urls.add(i.currentSrc || i.src); });
        document.querySelectorAll('*').forEach((e) => {
          const bg = getComputedStyle(e).backgroundImage;
          const m = bg && bg.match(/url\(["']?([^"')]+)["']?\)/);
          if (m) urls.add(m[1]);
        });
        await Promise.all([...urls].map((u) => new Promise((res) => {
          const im = new Image(); im.onload = im.onerror = res; im.src = u; setTimeout(res, 8000);
        })));
      });
      // Force lazy images to load, then walk down slowly so scroll-reveal animations have run.
      await m.evaluate(() => document.querySelectorAll('img').forEach((i) => { i.loading = 'eager'; if (i.dataset.src && !i.src) i.src = i.dataset.src; }));
      for (let y = 0; y <= 2200; y += 160) { await mScroll(y); await sleep(450); }
      await mScroll(0);
      await sleep(800);
      for (const y of [700, 1400]) {
        // Walk into the frame (images load as they enter view, and may reload when they re-enter).
        for (let w = Math.max(0, y - 450); w < y; w += 150) { await mScroll(w); await sleep(400); }
        const actual = await mScroll(y);
        await sleep(5000);
        if (mparts.length && actual < y - 350) break;
        await m.evaluate(() => document.querySelectorAll('body *').forEach((e) => {
          const p = getComputedStyle(e).position;
          if ((p === 'fixed' || p === 'sticky') && !e.hasAttribute('data-cap-scroller')) e.style.visibility = 'hidden';
        }));
        await hideBottomChrome();
        const f = join(TMP, `${id}-m${y}.png`);
        await m.screenshot({ path: f });
        mparts.push(f);
      }
      await m.evaluate(() => document.querySelectorAll('body *').forEach((e) => { e.style.visibility = ''; }));
      await mScroll(0);
      await sleep(1200);
    }
    await hideBottomChrome();
    const mhead = await m.evaluate(WAIT_STABLE);
    const mf = join(TMP, `${id}-m.png`);
    await m.screenshot({ path: mf });
    await m.close();
    // Each later frame repeats 144px (CSS) of the previous one: 844 viewport, 700 step.
    // In-scroller headers also repeat, so element-mode frames lose their top 144px either way.
    const mtrim = mparts.map((f) => { const t = f.replace('.png', '-t.png'); execFileSync('magick', [f, '-crop', '780x1400+0+288', '+repage', t]); return t; });
    execFileSync('magick', [mf, ...mtrim, '-append', '-resize', '360x', '-quality', '72', join(OUT, `${id}-mobile.webp`)]);
    console.log(`✓ ${id}  desktop:${mode}+${parts.length}  mobile:${mmode}+${mparts.length}  head:"${head.slice(0, 50)}"  mobile:"${mhead.slice(0, 50)}"`);
  } catch (err) {
    console.log(`✗ ${id}: ${err.message}`);
  }
}
await browser.close();
