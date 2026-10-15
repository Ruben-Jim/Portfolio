/**
 * Client portal API — the only way the portal reads or writes client data.
 *
 * The portal link carries a secret token (agencyClientPortals/{token}). Every
 * action checks that token server-side and touches ONLY the project it points
 * to, so one client can never see another client's invoices, contracts, or
 * care plan. The browser no longer reads agencyBusinessDocuments,
 * agencyContractSignatures, agencyMaintenance, or agencyProjects directly —
 * those paths are admin-only in database.rules.json.
 *
 * Actions (POST JSON):
 *   load          { token }                                  → project + that client's docs, signatures, plan
 *   requestPlan   { token, planTier, billingPreference, hoursIncluded, slaHours } → { maintId, invoice }
 *   submitTicket  { token, title, area, details }            → { ticket }
 *   signContract  { token, docId, signedByName, agreedToTerms, userAgent }
 */

// Internal hub fields the client never needs to see.
const PRIVATE_PROJECT_FIELDS = [
  "notes", "buildHoursEstimate", "buildHoursSpent", "firebaseProjectId", "leadId",
  "portalToken", "clientRepoUrl", "repoUrl", "demoBranch",
];

const crypto = require("crypto");

const PLAN_TIERS = ["essential", "standard", "priority"];
const PLAN_TITLES = { essential: "Essential Care", standard: "Standard Care", priority: "Priority Care" };

// Care plan prices. Keep in sync with assets/js/care-pricing.js — the browser
// shows prices with that file, the server bills with this one, and
// test-portal-api.mjs fails if the two ever disagree.
const CARE_MONTHLY = { essential: 79, standard: 150, priority: 300 };
const CARE_DEFAULTS = { yearlyDiscountPct: 45, promoMonths: 3, promoPct: 50 };
const INVOICE_DUE_DAYS = 15;
const CWR_TIME_ZONE = "America/Los_Angeles";

class PortalError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function str(v, max) { return String(v == null ? "" : v).trim().slice(0, max); }

async function resolveToken(db, token, now) {
  const t = str(token, 200);
  if (!/^[A-Za-z0-9_-]{16,200}$/.test(t)) throw new PortalError(403, "This client link is invalid or expired.");
  const link = (await db.ref("agencyClientPortals/" + t).once("value")).val();
  if (!link || !link.projectId || (link.expiresAt && Number(link.expiresAt) < now)) {
    throw new PortalError(403, "This client link is invalid or expired.");
  }
  const hub = (await db.ref("agencyProjects/" + link.projectId).once("value")).val();
  if (!hub) throw new PortalError(404, "This client link is invalid or expired.");
  return { token: t, link, projectId: String(link.projectId), hub };
}

function publicHub(hub) {
  const out = Object.assign({}, hub);
  PRIVATE_PROJECT_FIELDS.forEach((f) => delete out[f]);
  return out;
}

/** Same matching the portal used client-side: the hub's business doc, or docs with this client's name. */
function docsForHub(all, deletes, hub) {
  const bid = str(hub.businessDocId, 200);
  const cn = str(hub.clientName, 200).toLowerCase();
  const out = [];
  Object.keys(all || {}).forEach((key) => {
    if (deletes && deletes[key]) return;
    const d = Object.assign({ id: key }, all[key] || {});
    if (String(d.status || "").toLowerCase() === "draft") return;
    if ((bid && d.id === bid) || (cn && String(d.clientName || "").toLowerCase().trim() === cn)) out.push(d);
  });
  return out;
}

/** The project's care plan, by projectId first, then by client name (legacy rows). */
function maintenanceForHub(all, projectId, hub) {
  const rows = Object.keys(all || {}).map((id) => Object.assign({ id }, all[id]));
  const byProject = rows.find((m) => m.projectId === projectId);
  if (byProject) return byProject;
  const cn = str(hub.clientName, 200).toLowerCase();
  return cn ? rows.find((m) => String(m.clientName || "").toLowerCase().trim() === cn) || null : null;
}

function ticketClientTag(maint) {
  const name = String((maint && maint.clientName) || "").toUpperCase();
  const words = name.replace(/[^A-Z ]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length >= 3) return words[0][0] + words[1][0] + words[2][0];
  if (words.length === 2) return (words[0].slice(0, 2) + words[1][0]).slice(0, 3);
  if (words.length === 1 && words[0].length >= 3) return words[0].slice(0, 3);
  const id = String((maint && maint.id) || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return (id.slice(-3) || "CLI").padStart(3, "X");
}

function makeTicketRef(maint, existing) {
  let highest = 0;
  (existing || []).forEach((t) => {
    const m = String((t && t.ref) || "").match(/(\d+)\s*$/);
    if (m) highest = Math.max(highest, parseInt(m[1], 10));
  });
  return "CWR-" + ticketClientTag(maint) + "-" + String(highest + 1).padStart(3, "0");
}

function clampPct(v) {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(v);
  if (!isFinite(n) || n < 0 || n > 90) return null;
  return Math.round(n * 10) / 10;
}

/** agencyPricing as care-pricing.js reads it: site yearly discount + optional first-months promo. */
function carePricingConfig(raw) {
  raw = raw || {};
  const promo = raw.promo || {};
  const yearly = clampPct(raw.yearlyDiscountPct);
  const promoPct = clampPct(promo.pct);
  const months = Math.round(Number(promo.months));
  return {
    yearlyDiscountPct: yearly === null ? CARE_DEFAULTS.yearlyDiscountPct : yearly,
    promo: {
      enabled: promo.enabled === true || promo.enabled === "true",
      months: months >= 1 && months <= 24 ? months : CARE_DEFAULTS.promoMonths,
      pct: promoPct === null || promoPct === 0 ? CARE_DEFAULTS.promoPct : promoPct,
    },
  };
}

/** Whole dollars, rounded up the way care-pricing.js does it (integer math, no float drift). */
function discounted(amount, pct) {
  return Math.ceil((amount * (1000 - pct * 10)) / 1000 - 1e-9);
}

/**
 * What the first invoice charges: the whole year (the project's own yearly
 * rate wins over the site's), or one month at the promo price while a promo runs.
 */
function carePlanPrice(tier, billing, pricingRaw, hub) {
  const monthly = CARE_MONTHLY[tier] || CARE_MONTHLY.standard;
  const cfg = carePricingConfig(pricingRaw);
  if (billing === "annual") {
    const own = clampPct(hub && hub.yearlyDiscountPct);
    return discounted(monthly * 12, own === null ? cfg.yearlyDiscountPct : own);
  }
  return cfg.promo.enabled ? discounted(monthly, cfg.promo.pct) : monthly;
}

/** Fresno wall-clock time as [year, month, day, hour, minute, second]. Invoices follow CWR's calendar, not UTC. */
function pacificParts(ms) {
  const parts = {};
  new Intl.DateTimeFormat("en-US", {
    timeZone: CWR_TIME_ZONE, hourCycle: "h23",
    year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
  }).formatToParts(new Date(ms)).forEach((p) => { parts[p.type] = Number(p.value); });
  return [parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second];
}

const pacificDate = (ms) => pacificParts(ms).slice(0, 3);

/**
 * The same moment as an ISO string carrying Fresno's offset. Invoices print
 * the date part of createdAt, and a UTC string reads as tomorrow after 5pm.
 */
function pacificIso(ms) {
  const [y, mo, d, h, mi, s] = pacificParts(ms);
  const offsetMin = Math.round((Date.UTC(y, mo - 1, d, h, mi, s) - Math.floor(ms / 1000) * 1000) / 60000);
  const pad = (n) => String(Math.abs(n)).padStart(2, "0");
  return y + "-" + pad(mo) + "-" + pad(d) + "T" + pad(h) + ":" + pad(mi) + ":" + pad(s) +
    (offsetMin < 0 ? "-" : "+") + pad(Math.trunc(offsetMin / 60)) + ":" + pad(offsetMin % 60);
}

/** Calendar math in UTC so no time zone can shift the day. Overflowing days roll into the next month. */
function ymdPlus(ymd, years, days) {
  return new Date(Date.UTC(ymd[0] + years, ymd[1] - 1, ymd[2] + days));
}

const isoDay = (d) => d.toISOString().slice(0, 10);
const longDay = (d) => d.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });

function nextInvoiceNumber(allDocs, year) {
  let max = 0;
  const re = new RegExp("^INV-" + year + "-(\\d+)$", "i");
  Object.keys(allDocs || {}).forEach((id) => {
    const d = allDocs[id] || {};
    if (String(d.type || "").toLowerCase() !== "invoice") return;
    const m = String(d.invoiceNumber || "").trim().match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return "INV-" + year + "-" + String(max + 1).padStart(4, "0");
}

/**
 * The unpaid invoice a client gets the moment they pick a care plan, so a
 * board or bookkeeper has something to approve before paying. Same fields
 * admin's createPaidMaintenanceInvoiceFromPlan uses, so "Mark paid" can flip
 * this one instead of writing a second invoice.
 */
function carePlanInvoice({ tier, billing, total, maintId, hub, now }) {
  const today = pacificDate(now);
  const start = ymdPlus(today, 0, 0);
  const title = PLAN_TITLES[tier];
  const billingLabel = billing === "annual" ? "Annual" : "Monthly";
  const description = billing === "annual"
    ? "Care plan, " + longDay(start) + " – " + longDay(ymdPlus(today, 1, -1))
    : "Care plan, first month (starts " + longDay(start) + ")";
  const period = billing === "annual" ? today[0] + "-annual" : today[0] + "-" + String(today[1]).padStart(2, "0");
  return {
    type: "invoice",
    clientName: str(hub.clientName, 120),
    clientEmail: str(hub.clientEmail, 200),
    total,
    status: "sent",
    dueDate: isoDay(ymdPlus(today, 0, INVOICE_DUE_DAYS)),
    theme: "cwr",
    notes: "",
    maintenancePlanId: tier,
    maintenanceBilling: billing,
    maintenanceInvoiceKind: "setup",
    maintenancePaymentKey: maintId + ":" + period,
    sourceMaintenanceId: maintId,
    addOns: [{ name: title + " — " + billingLabel, description, priceOptions: [{ label: billingLabel, amount: total }] }],
    updatedAt: pacificIso(now),
  };
}

async function handle(db, body, now) {
  now = now || Date.now();
  const action = str(body && body.action, 40);
  const ctx = await resolveToken(db, body && body.token, now);

  if (action === "load") {
    const [docsSnap, delSnap, sigSnap, maintSnap] = await Promise.all([
      db.ref("agencyBusinessDocuments").once("value"),
      db.ref("agencyBusinessDocDeletes").once("value"),
      db.ref("agencyContractSignatures").once("value"),
      db.ref("agencyMaintenance").once("value"),
    ]);
    const docs = docsForHub(docsSnap.val(), delSnap.val(), ctx.hub);
    const allSigs = sigSnap.val() || {};
    const signatures = {};
    docs.forEach((d) => { if (allSigs[d.id]) signatures[d.id] = allSigs[d.id]; });
    const maint = maintenanceForHub(maintSnap.val(), ctx.projectId, ctx.hub);
    return {
      link: { projectId: ctx.projectId, expiresAt: ctx.link.expiresAt || null },
      hub: publicHub(ctx.hub),
      businessDocs: docs,
      contractSignatures: signatures,
      maintenance: maint ? [maint] : [],
    };
  }

  if (action === "requestPlan") {
    const tier = str(body.planTier, 20).toLowerCase();
    if (PLAN_TIERS.indexOf(tier) < 0) throw new PortalError(400, "Pick a care plan.");
    const billing = str(body.billingPreference, 20) === "annual" ? "annual" : "monthly";
    const num = (v, lo, hi) => Math.min(hi, Math.max(lo, Number(v) || 0));
    const [maintSnap, docsSnap, delSnap, pricingSnap] = await Promise.all([
      db.ref("agencyMaintenance").once("value"),
      db.ref("agencyBusinessDocuments").once("value"),
      db.ref("agencyBusinessDocDeletes").once("value"),
      db.ref("agencyPricing").once("value"),
    ]);
    const existing = maintenanceForHub(maintSnap.val(), ctx.projectId, ctx.hub);
    const maintRef = existing ? db.ref("agencyMaintenance/" + existing.id) : db.ref("agencyMaintenance").push();
    const maintId = existing ? existing.id : maintRef.key;
    const promo = carePricingConfig(pricingSnap.val()).promo;
    const promoOn = billing === "monthly" && promo.enabled;

    // Picking again before paying edits the same invoice, so its number stays put.
    const allDocs = docsSnap.val() || {};
    const pendingId = existing ? str(existing.pendingInvoiceId, 200) : "";
    const pending = pendingId && !(delSnap.val() || {})[pendingId] ? allDocs[pendingId] : null;
    const reuse = !!pending && String(pending.status || "").toLowerCase() !== "paid";
    const invoiceId = reuse ? pendingId : "doc_" + now.toString(36) + "_" + crypto.randomBytes(3).toString("hex");
    const invoice = Object.assign(
      reuse ? pending : { createdAt: pacificIso(now), invoiceNumber: nextInvoiceNumber(allDocs, pacificDate(now)[0]) },
      carePlanInvoice({ tier, billing, total: carePlanPrice(tier, billing, pricingSnap.val(), ctx.hub), maintId, hub: ctx.hub, now }),
      { id: invoiceId }
    );

    // Status and money fields are set here, never taken from the browser.
    const payload = {
      projectId: ctx.projectId,
      clientName: str(ctx.hub.clientName, 160),
      planTier: tier,
      billingPreference: billing,
      planStatus: "active",
      paymentStatus: "awaiting",
      planRequestedAt: now,
      hoursIncluded: num(body.hoursIncluded, 0, 40),
      slaHours: num(body.slaHours, 1, 240),
      promoPct: promoOn ? promo.pct : null,
      promoMonthsLeft: promoOn ? promo.months : null,
      pendingInvoiceId: invoiceId,
      updatedAt: now,
    };
    // Plan first: if the invoice write fails, a retry finds no pending invoice and makes a fresh one.
    if (existing) {
      await maintRef.update(payload);
    } else {
      await maintRef.set(Object.assign(payload, { hoursUsed: 0, renewalDate: "", notes: "", createdAt: now }));
    }
    await db.ref("agencyBusinessDocuments/" + invoiceId).set(invoice);
    return { maintId, invoice };
  }

  if (action === "submitTicket") {
    const title = str(body.title, 120);
    if (!title) throw new PortalError(400, "Add a subject for your request.");
    const ref = db.ref("agencyMaintenance");
    const maint = maintenanceForHub((await ref.once("value")).val(), ctx.projectId, ctx.hub);
    if (!maint) throw new PortalError(400, "Start a care plan before opening a request.");
    let ticket = null;
    // Transaction so two submits can't claim the same reference number.
    await db.ref("agencyMaintenance/" + maint.id + "/tickets").transaction((cur) => {
      const list = Array.isArray(cur) ? cur.slice() : [];
      ticket = {
        ref: makeTicketRef(maint, list),
        title,
        area: str(body.area, 60),
        details: str(body.details, 1200),
        status: "open",
        createdAt: new Date(now).toISOString(),
      };
      list.push(ticket);
      return list;
    });
    await db.ref("agencyMaintenance/" + maint.id + "/updatedAt").set(now);
    return { ticket };
  }

  if (action === "signContract") {
    const docId = str(body.docId, 200);
    const name = str(body.signedByName, 160);
    if (!docId || !name || body.agreedToTerms !== true) throw new PortalError(400, "Enter your full legal name and check the agreement box.");
    const [docsSnap, delSnap] = await Promise.all([
      db.ref("agencyBusinessDocuments").once("value"),
      db.ref("agencyBusinessDocDeletes").once("value"),
    ]);
    const doc = docsForHub(docsSnap.val(), delSnap.val(), ctx.hub).find((d) => d.id === docId);
    if (!doc) throw new PortalError(403, "That document isn't part of your project.");
    const sigRef = db.ref("agencyContractSignatures/" + docId);
    if ((await sigRef.once("value")).exists()) throw new PortalError(409, "This contract is already signed.");
    const signature = {
      docId,
      signedByName: name,
      agreedToTerms: true,
      signedAt: now,
      userAgent: str(body.userAgent, 300),
      projectId: ctx.projectId,
    };
    await sigRef.set(signature);
    return { signature };
  }

  throw new PortalError(400, "Unknown action.");
}

module.exports = { handle, PortalError, docsForHub, maintenanceForHub, makeTicketRef, publicHub, PRIVATE_PROJECT_FIELDS, carePlanPrice };
