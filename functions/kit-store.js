/**
 * Template kit store — custom checkout on rubenjimenez.dev/kits/<kit>, Stripe as the processor.
 *
 *   1. createKitCheckout (public POST)  { kit, email, github }  → { clientSecret, amount, currency }
 *      Prices live HERE, never in the browser. Checks the GitHub username exists, then creates a
 *      PaymentIntent with the order details in its metadata.
 *   2. The page confirms the payment with Stripe's Payment Element (card data never touches us).
 *   3. stripeKitWebhook (Stripe → us)  payment_intent.succeeded
 *      → claim the order once (RTDB transaction on kitOrders/{paymentIntentId})
 *      → invite the buyer to the kit's private GitHub repo (read-only)
 *      → email the buyer the invite link + notify Ruben (push + email).
 *
 * Secrets (set with `firebase functions:secrets:set NAME`, never in code):
 *   STRIPE_SECRET_KEY      sk_test_… (test) / sk_live_… (live)
 *   STRIPE_WEBHOOK_SECRET  whsec_… from the Stripe webhook endpoint
 *   GITHUB_KIT_TOKEN       fine-grained token, repo access: the kit repos, permission Administration: read & write
 *
 * Everything below takes its clients as arguments so scripts/test-kit-store.mjs can run it with fakes.
 */

const KITS = {
  courses: {
    name: "Courses Kit Pro",
    amount: 3900, // cents. Change the price here (and the display price in kits/courses.html).
    currency: "usd",
    repo: "Ruben-Jim/courses-kit-pro",
    page: "https://rubenjimenez.dev/kits/courses",
  },
};

const GITHUB_USER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function cleanInput(body) {
  const kitId = String((body && body.kit) || "").trim().toLowerCase();
  const email = String((body && body.email) || "").trim().toLowerCase();
  const github = String((body && body.github) || "").trim().replace(/^@/, "");
  const kit = Object.prototype.hasOwnProperty.call(KITS, kitId) ? KITS[kitId] : null;
  if (!kit) throw httpError(400, "Unknown kit.");
  if (!EMAIL_RE.test(email) || email.length > 254) throw httpError(400, "Enter a valid email address.");
  if (!GITHUB_USER_RE.test(github)) throw httpError(400, "Enter a valid GitHub username.");
  return { kitId, kit, email, github };
}

/** GET a GitHub API path with the kit token. Returns { status, json }. */
async function githubRequest(fetchImpl, token, method, path, body) {
  const res = await fetchImpl("https://api.github.com" + path, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "rubenjimenez-dev-kit-store",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { json = null; }
  return { status: res.status, json };
}

/**
 * Step 1: { kit, email, github } → PaymentIntent client secret.
 * deps: { stripe, fetch, githubToken }
 */
async function createCheckout(deps, body) {
  const { kitId, kit, email, github } = cleanInput(body);

  const user = await githubRequest(deps.fetch, deps.githubToken, "GET", "/users/" + encodeURIComponent(github));
  if (user.status === 404) throw httpError(400, "We couldn't find that GitHub username. Check the spelling.");
  if (user.status !== 200 || !user.json || !user.json.login) throw httpError(502, "Couldn't check GitHub right now. Try again in a minute.");

  const intent = await deps.stripe.paymentIntents.create({
    amount: kit.amount,
    currency: kit.currency,
    automatic_payment_methods: { enabled: true },
    receipt_email: email,
    description: kit.name,
    metadata: { kit: kitId, github: user.json.login, email },
  });
  return { clientSecret: intent.client_secret, amount: kit.amount, currency: kit.currency };
}

/**
 * Step 3: a verified Stripe event. Only payment_intent.succeeded for a kit does anything.
 * deps: { db (RTDB admin), fetch, githubToken, sendEmail(msg), notify(order), now }
 * Returns a short status string for the log.
 */
async function handleStripeEvent(deps, event) {
  if (!event || event.type !== "payment_intent.succeeded") return "ignored:" + (event && event.type);
  const pi = event.data && event.data.object;
  const meta = (pi && pi.metadata) || {};
  const kit = Object.prototype.hasOwnProperty.call(KITS, meta.kit) ? KITS[meta.kit] : null;
  if (!kit || !meta.github) return "ignored:not-a-kit";
  if (pi.amount_received < kit.amount) return "ignored:underpaid";

  // Stripe retries webhooks; claim each payment exactly once.
  const ref = deps.db.ref("kitOrders/" + pi.id);
  const claim = await ref.transaction((cur) => (cur ? undefined : {
    kit: meta.kit,
    github: meta.github,
    email: meta.email || pi.receipt_email || "",
    amount: pi.amount_received,
    currency: pi.currency,
    status: "paid",
    createdAt: deps.now,
  }));
  if (!claim.committed) return "duplicate";

  // Never throw past the claim: a retry would see "duplicate" and skip the invite.
  // A failed invite is recorded and Ruben is told to add the buyer by hand.
  let invite;
  try {
    invite = await githubRequest(
      deps.fetch, deps.githubToken, "PUT",
      "/repos/" + kit.repo + "/collaborators/" + encodeURIComponent(meta.github),
      { permission: "pull" }
    );
  } catch (err) {
    console.error("kit invite request failed", pi.id, err && err.message);
    invite = { status: 0, json: null };
  }
  // 201 = invitation created, 204 = already a collaborator.
  const invited = invite.status === 201 || invite.status === 204;
  await ref.update({ status: invited ? "invited" : "invite_failed", inviteStatus: invite.status, updatedAt: deps.now });

  const order = { id: pi.id, kitName: kit.name, repo: kit.repo, github: meta.github, email: meta.email || pi.receipt_email || "", amount: pi.amount_received, invited };
  if (order.email) {
    try { await deps.sendEmail(buyerEmail(order)); } catch (err) { console.error("kit buyer email failed", pi.id, err && err.message); }
  }
  try { await deps.notify(order); } catch (err) { console.error("kit notify failed", pi.id, err && err.message); }
  return invited ? "invited" : "invite_failed:" + invite.status;
}

function money(cents) {
  return "$" + (cents / 100).toFixed(2).replace(/\.00$/, "");
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** The buyer's email: where to accept the GitHub invite. */
function buyerEmail(order) {
  const inviteUrl = "https://github.com/" + order.repo + "/invitations";
  const subject = order.kitName + " — your access is ready";
  const lead = order.invited
    ? "Thanks for buying " + order.kitName + "! We've invited <b>@" + esc(order.github) + "</b> to the private repository."
    : "Thanks for buying " + order.kitName + "! Your payment went through. We're adding <b>@" + esc(order.github) + "</b> to the private repository by hand and will email you within 24 hours.";
  const html =
    '<div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.6;color:#111">' +
    "<p>" + lead + "</p>" +
    (order.invited
      ? '<p><a href="' + inviteUrl + '" style="display:inline-block;background:#cfae55;color:#111;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">Accept your GitHub invite</a></p>' +
        "<p>Then clone it and run <code>npm install</code> and <code>npx expo start</code>. The README walks you through rebranding.</p>"
      : "") +
    "<p>Order " + esc(order.id) + " · " + money(order.amount) + "</p>" +
    "<p>Questions? Just reply to this email.<br>— Ruben, CodeWithRuben</p></div>";
  const text =
    lead.replace(/<[^>]+>/g, "") + "\n\n" +
    (order.invited ? "Accept your invite: " + inviteUrl + "\n\n" : "") +
    "Order " + order.id + " · " + money(order.amount) + "\nQuestions? Just reply to this email.\n— Ruben, CodeWithRuben";
  return { to: order.email, subject, html, text };
}

/** Admin push notice for a sale (admin-push.js shape). */
function saleNotice(order) {
  return {
    type: "portal",
    title: (order.invited ? "Kit sold · " : "Kit sold — invite FAILED · ") + order.kitName,
    body: money(order.amount) + " · @" + order.github + " · " + order.email,
    url: "/admin",
    tag: "kit-" + order.id,
  };
}

module.exports = { KITS, GITHUB_USER_RE, cleanInput, createCheckout, handleStripeEvent, buyerEmail, saleNotice, httpError };
