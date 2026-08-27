import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = process.env.IG_ROOT || __dirname;
const chrome =
  process.env.CHROME ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const projects = JSON.parse(
  await readFile(path.join(root, "projects.json"), "utf8")
);

const only = (process.env.PROJECT || "").trim();
const device = (process.env.DEVICE || "").trim(); // laptop | phone | both
const list = only ? projects.filter((p) => p.id === only) : projects;
if (!list.length) {
  console.error("No matching project. Set PROJECT=id");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: "new",
  args: ["--hide-scrollbars", "--disable-gpu", "--autoplay-policy=no-user-gesture-required"],
});

async function waitReady(page, readyText) {
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || "";
      return t.length > 80 && !/Loading your experience/i.test(t);
    },
    { timeout: 60000 }
  );
  await page.evaluate(() => {
    document.querySelectorAll('[class*="cookie" i], [id*="cookie" i]').forEach((el) => {
      el.style.setProperty("display", "none", "important");
    });
  });
  if (readyText) {
    await page.waitForFunction(
      (needle) => (document.body?.innerText || "").includes(needle),
      { timeout: 25000 },
      readyText
    );
    await page.evaluate(() => {
      document.querySelectorAll("*").forEach((el) => {
        try {
          el.style.animationPlayState = "paused";
        } catch (e) {}
      });
    });
    await sleep(300);
  } else {
    await sleep(1800);
  }
}

async function waitForAlso(page, alsoReady) {
  if (!alsoReady) return;
  try {
    await page.waitForFunction(
      (needle) => (document.body?.innerText || "").includes(needle),
      { timeout: 15000 },
      alsoReady
    );
  } catch (e) {}
}

async function showFeaturedAndReels(page, viewport) {
  await sleep(800);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(400);
}

/** Zoom the homepage so YouTube + Instagram posts/reels fit in the viewport (same crop on laptop and phone). */
async function fitHomeSections(page, viewport) {
  const stats = await page.evaluate((viewH) => {
    document.documentElement.style.zoom = "1";
    const textOf = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();
    const scrollers = [...document.querySelectorAll("div")].filter((el) => {
      const oy = getComputedStyle(el).overflowY;
      return (oy === "auto" || oy === "scroll") && el.scrollHeight > 2000;
    });
    scrollers.sort((a, b) => b.scrollHeight - a.scrollHeight);
    const s = scrollers[0];
    if (!s) return { err: "no scroller" };
    s.style.zoom = "1";
    s.scrollTop = 0;

    let bottom = 0;
    for (const el of s.querySelectorAll("a,button,div,span")) {
      const t = textOf(el);
      if (/^@\S+ on Instagram$/i.test(t)) {
        const yr = el.getBoundingClientRect().bottom - s.getBoundingClientRect().top + s.scrollTop;
        if (yr > bottom) bottom = yr;
      }
    }
    if (!bottom) {
      for (const el of s.querySelectorAll("a,button,div,span")) {
        const t = textOf(el);
        if (/^View reel on Instagram/i.test(t)) {
          const yr = el.getBoundingClientRect().bottom - s.getBoundingClientRect().top + s.scrollTop;
          if (yr > bottom) bottom = yr;
        }
      }
      bottom += 200;
    } else {
      bottom += 48;
    }

    const zoom = Math.min(1, Math.max(0.28, (viewH * 0.96) / bottom));
    s.style.zoom = String(zoom);
    s.scrollTop = 0;
    return { zoom, bottom, sh: s.scrollHeight, ch: s.clientHeight };
  }, viewport.height);
  console.log("fitHome", viewport.width + "x" + viewport.height, stats);
  await sleep(900);
}

async function openPublicHome(page) {
  await sleep(400);
  await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll("button, a, [role='button']"));
    const closer = nodes.find((el) => {
      const t = (el.textContent || "").trim();
      const al = (el.getAttribute("aria-label") || "").toLowerCase();
      return t === "×" || t === "✕" || t === "X" || al.includes("close");
    });
    if (closer) closer.click();
  });
  await sleep(500);
  await page.evaluate(() => {
    const t = document.body?.innerText || "";
    const offHome =
      /staff login|create your account|sign up|upcoming pop-up|choose your stylist|choose your barber/i.test(
        t
      );
    if (!offHome) return;

    const clickHome = () => {
      const home = Array.from(document.querySelectorAll("*")).find(
        (el) => /^home$/i.test((el.textContent || "").trim()) && el.childElementCount === 0
      );
      if (!home) return false;
      home.click();
      if (home.parentElement) home.parentElement.click();
      return true;
    };
    if (clickHome()) return;

    const els = Array.from(document.querySelectorAll("button, [role='button'], div"));
    let burger = null;
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (
        r.top > 4 &&
        r.top < 72 &&
        r.right > window.innerWidth - 88 &&
        r.width >= 28 &&
        r.width <= 72 &&
        r.height >= 28 &&
        r.height <= 72
      ) {
        burger = el;
      }
    }
    if (burger) burger.click();
  });
  await sleep(700);
  await page.evaluate(() => {
    const t = document.body?.innerText || "";
    if (/your beauty|precision cuts/i.test(t) && !/staff login|choose your stylist/i.test(t)) return;
    const home = Array.from(document.querySelectorAll("*")).find(
      (el) => /^home$/i.test((el.textContent || "").trim()) && el.childElementCount === 0
    );
    if (!home) return;
    home.click();
    if (home.parentElement) home.parentElement.click();
  });
  await sleep(1800);
}

async function shoot(page, project, outPath, viewport) {
  await page.setViewport(viewport);
  await page.goto(project.url, { waitUntil: "networkidle2", timeout: 90000 });
  await waitReady(page, "");
  await page.keyboard.press("Escape").catch(() => {});
  await sleep(300);
  await page.keyboard.press("Escape").catch(() => {});
  await openPublicHome(page);
  if (project.ready) {
    await waitReady(page, project.ready);
  }
  await waitForAlso(page, project.alsoReady || "");
  await sleep(project.fitHome ? 2500 : 0);
  if (project.ready === "Featured Video") {
    await showFeaturedAndReels(page, viewport);
  }
  // Phone only: zoom the stacked homepage into the frame. Laptop stays a real desktop crop.
  if (project.fitHome && viewport.width <= 500) {
    await fitHomeSections(page, viewport);
  }
  await sleep(1200);
  await page.screenshot({ path: outPath, type: "png" });
  console.log("wrote", outPath);
}

try {
  for (const project of list) {
    const dir = path.join(root, "captures", project.id);
    await mkdir(dir, { recursive: true });
    console.log("capturing", project.id, project.url);
    try {
      if (device !== "phone") {
        const desktop = await browser.newPage();
        await shoot(desktop, project, path.join(dir, "laptop.png"), {
          width: 1440,
          height: 900,
          deviceScaleFactor: 2,
        });
        await desktop.close();
      }

      if (device !== "laptop") {
        const phone = await browser.newPage();
        if (!project.phoneUseDesktopUa) {
          await phone.setUserAgent(
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
          );
        }
        await shoot(phone, project, path.join(dir, "phone.png"), {
          width: 390,
          height: 844,
          deviceScaleFactor: 3,
          isMobile: !project.phoneUseDesktopUa,
          hasTouch: true,
        });
        await phone.close();
      }
    } catch (err) {
      console.error("FAILED", project.id, err && err.message ? err.message : err);
    }
  }
} finally {
  await browser.close();
}
