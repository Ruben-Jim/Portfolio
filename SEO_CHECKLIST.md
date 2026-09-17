# SEO & AI Visibility — remaining manual steps

Code fixes are done and committed to the working tree. These four steps live
outside the repo and have to be done in dashboards. Step 1 is the one that
matters most — until it's done, the robots.txt changes in this repo have **no
effect**, because Cloudflare overrides the served file and blocks AI crawlers
at the edge with a 403 before robots.txt is ever consulted.

---

## 1. Cloudflare — stop 403ing AI answer bots ⚠️ highest impact

**Verified problem (2026-09-11):**

```
Googlebot      200      GPTBot          403
bingbot        200      OAI-SearchBot   403
DuckDuckBot    200      ChatGPT-User    403
YandexBot      200      ClaudeBot       403
                        PerplexityBot   403
                        Perplexity-User 403
```

`https://rubenjimenez.dev/robots.txt` currently serves a **Cloudflare managed
file**, not the one in this repo, and it disallows GPTBot, ClaudeBot, CCBot,
Google-Extended, Bytespider, meta-externalagent, Applebot-Extended and
Amazonbot.

**Do this:**

1. Cloudflare dashboard → select `rubenjimenez.dev`.
2. Go to **AI Crawl Control** (older accounts: "AI Audit"). Set the AI crawler
   policy to **Allow** for the answer/search bots and keep **Block** on the
   training-only ones:
   - Allow: `OAI-SearchBot`, `ChatGPT-User`, `Claude-User`, `Claude-SearchBot`,
     `PerplexityBot`, `Perplexity-User`, `Google-Extended`, `Applebot`
   - Keep blocked: `GPTBot`, `ClaudeBot`, `CCBot`, `Bytespider`, `Amazonbot`,
     `Applebot-Extended`, `meta-externalagent`
3. Go to **Security → Bots**. Turn **off** the "Block AI Scrapers and Crawlers"
   / "AI Labyrinth" toggle if it's on — it 403s regardless of robots.txt.
4. Still in AI Crawl Control, **disable the managed `robots.txt`** (look for
   "Manage robots.txt" or "Content Signals Policy") so the repo's
   [`robots.txt`](robots.txt) is served instead.
5. Check **Security → WAF** for any managed rule or rate limit matching bot
   user-agents.

> Menu labels move between Cloudflare releases. The goal, whatever it's called:
> named AI answer bots get 200, and your own robots.txt is the file served.

**Note on `Google-Extended`:** it does *not* affect Google Search ranking — it
gates whether Gemini can ground answers on your site. Allowing it is what makes
you citable in Gemini. Blocking it costs you Gemini visibility and gains nothing
in Search.

**Verify (should all print 200 when correct):**

```bash
for ua in "OAI-SearchBot/1.0" "ChatGPT-User/1.0" "PerplexityBot/1.0" \
          "Claude-User/1.0" "Googlebot/2.1" "bingbot/2.0"; do
  printf "%-22s %s\n" "$ua" \
    "$(curl -s -o /dev/null -w '%{http_code}' -A "Mozilla/5.0 (compatible; $ua)" https://rubenjimenez.dev/)"
done

# And confirm YOUR robots.txt is being served (should show the CWR header):
curl -s https://rubenjimenez.dev/robots.txt | head -3
```

---

## 2. Google Search Console — confirm the damage cleared

You may already have a property; if not, create one.

1. https://search.google.com/search-console → add property **`rubenjimenez.dev`**
   (Domain type, verified by DNS TXT — covers www and http automatically).
2. **Sitemaps** → submit `https://rubenjimenez.dev/sitemap.xml`.
3. **Pages** report → look at *"Alternate page with proper canonical tag"* and
   *"Duplicate, Google chose different canonical than user"*. Your 6 money pages
   should currently be sitting in there. That's the bug this repo's fix
   addresses — the count should drain over the following few weeks.
4. **URL Inspection** → test `https://rubenjimenez.dev/services-pricing/`,
   confirm "User-declared canonical" now reads `/services-pricing/` and not `/`,
   then **Request Indexing**. Repeat for `/business-systems/`, `/portfolio/`,
   `/hire-me/`, `/about/`, `/contact/`.

---

## 3. Bing Webmaster Tools — feeds Bing *and* Copilot

1. https://www.bing.com/webmasters → **Import from Google Search Console**
   (about 2 minutes once step 2 is done).
2. Submit the same sitemap.
3. Use **URL Submission** for the 6 pages — Bing's quota is generous and it's
   the index behind Microsoft Copilot.

---

## 4. Google Business Profile — biggest local lever

You think you have one. Confirm it, because for *"web developer Fresno"* the
map pack outranks every on-page fix on this list combined.

1. https://business.google.com → confirm **CodeWithRuben** exists and is
   **verified** (unverified profiles don't show in the map pack).
2. Make these match [`index.html`](index.html)'s LocalBusiness schema **exactly**
   — name, phone `+1-559-653-7380`, and the site URL `https://rubenjimenez.dev`.
   Mismatched NAP data is the most common reason a profile underperforms.
3. Primary category: **Website Designer**. Secondary: **Software Company**.
4. Add services matching your packages, and post the portfolio work as photos.
5. Ask past clients for reviews — review count is the strongest map-pack signal
   you can actually influence.

**Then get listed where the Fresno SERP already sends people:** the current
top results are Digital Attic, Bitcot, Verlua, IKONIC and an
[Expertise.com listicle](https://www.expertise.com/business/web-developers/california/fresno).
Getting into that listicle and into Clutch costs nothing but time.

---

## What's already fixed in the repo

| Fix | Where |
|---|---|
| Per-route `<title>`, description, canonical, `og:*`, `twitter:*`, robots stamped into raw HTML | [`scripts/sync-spa-shells.mjs`](scripts/sync-spa-shells.mjs) |
| Exactly one unique `<h1>` per route | same script (`moveH1`) |
| `/service-pricing/` cross-canonicals to `/services-pricing/` | same script |
| Route paths use trailing slashes (canonicals no longer point at 301s) | [`assets/js/seo.js`](assets/js/seo.js) |
| Sitemap lists final non-redirecting URLs | [`sitemap.xml`](sitemap.xml) |
| Answer bots allowed, training bots blocked | [`robots.txt`](robots.txt) |
| Structured summary for AI assistants | [`llms.txt`](llms.txt) |
| `404.html` marked noindex | sync script |

**Important:** `index.html` is the template. After editing it, always run:

```bash
./scripts/sync-spa-shells.sh
```

The script fails loudly (non-zero exit) if any tag can't be stamped, so a
refactor that renames the canonical link or an article heading won't silently
go back to shipping 14 identical homepages.

## Still open (deliberately)

- **`/blog` stays `noindex` + disallowed** per your call. To publish later:
  delete the two `Disallow: /blog` lines in [`robots.txt`](robots.txt), flip
  `blog.robots` to `INDEX` in [`assets/js/seo.js`](assets/js/seo.js), add the
  URLs to [`sitemap.xml`](sitemap.xml), and re-run the sync script.
- **Full content split** — every route still ships all 12 articles in its HTML.
  Canonical + unique h1 fixes the indexing collapse, but genuinely unique page
  bodies would do better. That's a larger job touching how the SPA boots.
