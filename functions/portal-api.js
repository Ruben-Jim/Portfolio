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
 *   requestPlan   { token, planTier, billingPreference, hoursIncluded, slaHours, promoPct, promoMonthsLeft }
 *   submitTicket  { token, title, area, details }            → { ticket }
 *   signContract  { token, docId, signedByName, agreedToTerms, userAgent }
 */

// Internal hub fields the client never needs to see.
const PRIVATE_PROJECT_FIELDS = [
  "notes", "buildHoursEstimate", "buildHoursSpent", "firebaseProjectId", "leadId",
  "portalToken", "clientRepoUrl", "repoUrl", "demoBranch",
];

const PLAN_TIERS = ["essential", "standard", "priority"];

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
    const existing = maintenanceForHub((await db.ref("agencyMaintenance").once("value")).val(), ctx.projectId, ctx.hub);
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
      promoPct: billing === "monthly" && Number(body.promoPct) > 0 ? num(body.promoPct, 0, 90) : null,
      promoMonthsLeft: billing === "monthly" && Number(body.promoMonthsLeft) > 0 ? num(body.promoMonthsLeft, 0, 24) : null,
      updatedAt: now,
    };
    let maintId;
    if (existing) {
      maintId = existing.id;
      await db.ref("agencyMaintenance/" + maintId).update(payload);
    } else {
      const ref = db.ref("agencyMaintenance").push();
      maintId = ref.key;
      await ref.set(Object.assign(payload, { hoursUsed: 0, renewalDate: "", notes: "", createdAt: now }));
    }
    return { maintId };
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

module.exports = { handle, PortalError, docsForHub, maintenanceForHub, makeTicketRef, publicHub, PRIVATE_PROJECT_FIELDS };
