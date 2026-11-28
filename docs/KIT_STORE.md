# Kit store — selling CWR template kits on rubenjimenez.dev

Handoff notes (Nov 25, 2026). Read this before touching anything under `kits/`, `assets/js/kits-catalog.js`,
`functions/kit-store.js`, or the kit functions in `functions/index.js`.

## What it is

Ruben sells **frontend-only** versions of his CWR Expo templates to developers. The first one is
**Courses Kit Pro** ($39 launch, $49 regular). Each paid kit has:

- a **free Lite version** on a public GitHub repo (MIT) that links back to the sales page;
- a **Pro version** in a private GitHub repo; buyers get read-only access after paying.

More `...-pro` kits will follow (barber, event rentals, trades, etc.), so everything is built to take
more kits without new code: one shared catalog, one shared checkout, one webhook.

Kit source folders on Ruben's Mac (not in this repo):
`~/Dev/Templates/for-sale/Courses-Kit/courses-kit-pro` and `.../courses-kit-lite`.
`SELLING-NOTES.md` sits next to them.

## How a sale works

1. Sales page `/kits/courses` → Buy → shared checkout `/kits/checkout?kit=courses`.
2. Buyer enters email + GitHub username. Stripe **Payment Element** (deferred-intent flow) renders the
   card / Apple Pay / Google Pay form on our page. Stripe is the processor only; there is no Stripe-hosted
   checkout and no Payment Link.
3. On submit the page calls `createKitCheckout` (Firebase Function). It validates input, checks the
   GitHub user exists, and creates a PaymentIntent **with the server-side price** and
   `metadata: { kit, github, email }`. Returns the client secret.
4. `stripe.confirmPayment` → redirect to `/kits/thanks?kit=…`, which shows succeeded / processing / failed.
5. Stripe sends `payment_intent.succeeded` to `stripeKitWebhook`. It verifies the signature, claims the
   order once (RTDB transaction on `kitOrders/{paymentIntentId}`, so Stripe retries never double-invite),
   invites the buyer to the kit's private repo with `permission: pull`, emails the buyer the accept link
   (Resend), and notifies Ruben (admin push + `NOTIFY_TO_EMAIL`). A failed invite is recorded as
   `invite_failed` and the notification says so, so Ruben can add the buyer by hand.

## Files

| File | Role |
| --- | --- |
| `assets/js/kits-catalog.js` | **One list of kits** for the browser: name, display price, sale price, page, image, bullets. Also holds the Stripe **publishable** key (`pk_test_…` now) and `functionsBase`. `fillPrices(id)` fills prices and Buy links on a sales page. |
| `kits/courses.html` | Courses Kit sales page (standalone, own inline CSS, gold/smoky-black brand). Prices and Buy links come from the catalog. |
| `kits/checkout.html` | **Shared** checkout for every kit (`?kit=<id>`). Unknown id → "couldn't find that kit". |
| `kits/thanks.html` | Shared return page; reads kit names + key from the catalog. |
| `kits/index.html` | `/kits/`: one card per kit in the catalog. Nothing to edit when a kit is added. |
| Admin → Studio Costs → **Kit sales** | `agency-tools.js` `renderKitSales`. Reads `kitOrders` (admin-read rule in the Realtime Database rules). Totals count only live orders (`livemode: true`); test orders show a "Test" chip. **Retry invite** on failed orders calls `retryKitInvite`. "After costs" = this month's sales minus the Studio Costs monthly estimate. |
| `functions/kit-store.js` | Server logic, dependency-injected for tests. `KITS` table = **the charged price (cents) and the private repo per kit**. `createCheckout`, `handleStripeEvent`, `buyerEmail`, `saleNotice`. |
| `functions/index.js` (bottom) | `createKitCheckout` (public JSON endpoint, uses `jsonEndpoint` + `PUBLIC_JSON`, rate-limited), `stripeKitWebhook` (raw-body signature check) and `retryKitInvite` (admin bearer token only). |
| `scripts/test-kit-store.mjs` | Checks with fake Stripe / GitHub / RTDB (checkout, webhook, rate limit, retry invite). Runs in preflight. |
| `assets/images/kits/courses/*.webp` | Screenshots used by the sales + checkout pages. |
| `scripts/build-site.mjs` | `kits` is in `PUBLIC`. |
| `serve.json` | Rewrites `/kits/courses|checkout|thanks` → `.html` for local `npx serve -c serve.json` (port 3000). Python `http.server` does NOT do this and 404s. |

## Rate limit

`createKitCheckout` allows **5 checkouts per visitor (IP) per 10 minutes** and **10 per email per day**
(`RATE_LIMITS` in `kit-store.js`). Counters live in `kitRateLimits/{ip|email}/{sha256}`: one small node per
visitor that resets itself, server-only (no rule), $0. Blocked calls never reach Stripe or GitHub.

## Lite repo and Buy Me a Coffee links

Courses Lite is public (`liteUrl` set Nov 25). The coffee page isn't up yet.
- `kits.<id>.liteUrl` empty → "Get Lite" shows "Lite: coming soon", the Lite hint hides, and /kits shows only "See Pro".
- `coffeeUrl` empty → the coffee button stays hidden.

## How visitors reach the store (Lite first)

The flow is aimed at developers and leads with the free Lite version:
- **Top menu** ("Kits", after Pricing, in every page's menu) and **footer** ("Template kits") → `/kits/`.
- **Matching project page:** a kit's `project` (a portfolio slug, e.g. `courses-platform`) puts "Developer? Get this design as a template kit" in that project page's call-to-action box, linking to the kit page.
- **/kits/** cards: "Try Lite free" (GitHub) first, then "See Pro".
- **Kit page** hero: "Try Lite free on GitHub" first, then "Get Pro · $price". The closing section leads with Pro and offers Lite second.

Every entry point on the main site carries `data-kits-entry` and stays hidden until the store is open
(`CWR_KITS.isOpen()`), except for the signed-in admin (`window.syncKitsEntryPoints` in script.js; CSS rule
`html:not(.kits-entry-on) [data-kits-entry]`). The main site loads `kits-catalog.js` for this.

## Admin only while in test mode

While `stripePublishableKey` is a `pk_test_` key, `CWR_KITS.isOpen()` is false. In that state:
- **Pages:** `assets/js/kits-gate.js`, loaded in the `<head>` of every kit page after `config.js` and the catalog, hides the page. It shows the page only to the signed-in admin: the same Google sign-in as `/admin`, in the same browser, checked by the `admin` claim or the allowlist. Everyone else sees a short "<Kit> is coming soon" page with a "Message me to get it early" button.
- **Server:** `createKitCheckout` refuses everyone but the admin (403) while its secret is an `sk_test_` key. The checkout page sends the admin's token.
- **Google:** `/kits/` and `/kits/courses` carry `noindex` and are not in `sitemap.xml`.

Putting the `pk_live_` key in the catalog opens the pages, and the `sk_live_` secret opens the server. Nothing else needs changing for that.

## Going live (checklist)

Do these in order; test mode keeps working until step 4.
1. Stripe Dashboard → switch to **Live** → Developers → API keys. Copy the live **publishable** key (`pk_live_…`).
2. `firebase functions:secrets:set STRIPE_SECRET_KEY` → paste the live **secret** key at the terminal prompt
   (never in chat or a file).
3. Stripe (Live) → Workbench → Webhooks → **new** event destination: Your account, Snapshot,
   `payment_intent.succeeded`, URL `https://us-central1-portfolio-2578e.cloudfunctions.net/stripeKitWebhook`.
   Copy its signing secret → `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET`.
4. Put `pk_live_…` in `assets/js/kits-catalog.js` (`stripePublishableKey`), at the same time as step 5.
   This also opens the pages to everyone (see "Admin only while in test mode"). In the same change,
   remove `<meta name="robots" content="noindex" />` from `kits/courses.html` and `kits/index.html`,
   and add `https://rubenjimenez.dev/kits/` and `https://rubenjimenez.dev/kits/courses` back to `sitemap.xml`.
5. `firebase deploy --only functions:createKitCheckout,functions:stripeKitWebhook,functions:retryKitInvite`
   (ask first), then push the site.
6. Buy once with a real card. Check the invite, the email and the Kit sales row (no "Test" chip), then refund it in Stripe.
7. Google Cloud → Secret Manager: disable the old (test) secret versions once live works.
8. Delete the test-mode webhook destination in Stripe if you no longer want test events.

## Rules that must hold

- **Secret keys never go in a file.** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GITHUB_KIT_TOKEN` are
  Firebase secrets (`firebase functions:secrets:set …`). Only the publishable key lives in the catalog.
- **Price lives in two places and they must match:** `KITS[id].amount` in `functions/kit-store.js` (cents,
  what's charged) and `price` in `assets/js/kits-catalog.js` (display + the Payment Element `amount`).
  A mismatch makes `confirmPayment` fail.
- **The Pro kit repos contain no Stripe or store code.** They are the product buyers receive.
- **CWR infra stays at $0/month.** No paid services; Stripe/Resend per-transaction fees only.
- Per `CLAUDE.md`: **ask Ruben before any `firebase deploy`**; the site goes live when he pushes.
- Webhook payload style must be **Snapshot** (the handler reads `event.data.object`).

## Adding a kit

1. Add `<id>` to `kits` in `assets/js/kits-catalog.js`, with `liteUrl` and, if a portfolio project shows the
   same design, its slug in `project`.
2. Add `<id>` to `KITS` in `functions/kit-store.js` (amount in cents + private repo), add the repo to the
   GitHub fine-grained token's repository list, deploy the two functions.
3. Copy `kits/courses.html` → `kits/<id>.html`, change copy/screenshots, call `fillPrices('<id>')`.
4. Add `/kits/<id>` to `serve.json` rewrites and `sitemap.xml`, and its name to `KIT_NAMES` in
   `agency-tools.js` (Kit sales labels). `/kits/` lists it automatically.

## Status (Nov 25, 2026, test mode)

Verified Nov 25: private repo, token and webhook done; `createKitCheckout` and `stripeKitWebhook` deployed;
all three secrets exist (STRIPE_WEBHOOK_SECRET has 2 enabled versions: disable v1 once v2 is confirmed);
1 test order in `kitOrders`.

Built Nov 25, **needs deploy** (ask first): the `kitOrders` admin-read rule, and
`firebase deploy --only database,functions:createKitCheckout,functions:stripeKitWebhook,functions:retryKitInvite`
(rate limit, `livemode` on orders, retry invite). Until then the Kit sales panel can't read orders.

Earlier status:

Done:
- Kits built: courses-kit-pro (23 screens, mock services) and courses-kit-lite (home + catalog + course pages).
- Sales page, shared checkout, thanks page, server functions, tests. Preflight passes.
- `stripe` added to `functions/package.json`; `pk_test_…` in the catalog; `STRIPE_SECRET_KEY` (test) set.

In progress / not confirmed:
- Private repo `Ruben-Jim/courses-kit-pro` created + kit pushed?
- GitHub fine-grained token (Administration: read & write on the kit repo) → `GITHUB_KIT_TOKEN`.
- `firebase deploy --only functions:createKitCheckout,functions:stripeKitWebhook`.
- Stripe Workbench → Webhooks → event destination (Your account, Snapshot, `payment_intent.succeeded`,
  URL `https://us-central1-portfolio-2578e.cloudfunctions.net/stripeKitWebhook`) → `STRIPE_WEBHOOK_SECRET` → redeploy webhook.
- End-to-end test purchase with card 4242… and a GitHub account that is NOT the repo owner.

Still to do / open questions:
- Public repo `Ruben-Jim/courses-kit-lite`, then set `liteUrl` in the catalog.
- Buy Me a Coffee page, then set `coffeeUrl` in the catalog.
- Go live: follow "Going live" above (step 4 puts `/kits/` and `/kits/courses` back in `sitemap.xml` and drops `noindex`).
- Sales tax not handled (Stripe Tax could be added later).
- Higgsfield demo videos in the kit: confirm the plan allows commercial redistribution.
