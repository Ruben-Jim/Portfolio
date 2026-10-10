/**
 * Customer inbox sessions (Hire Me, Contact, client-portal chat).
 *
 * Replaces the browser querying dm/meta by email. This finds or creates the
 * one conversation for an email and returns a Firebase custom token whose
 * claims name THAT conversation (dmConv). database.rules.json then lets the
 * customer read and post in their own thread only — no listing every
 * conversation, no deleting threads, no posting as admin.
 *
 * Decision (2026-10-10): no email code. Whoever knows an email can open that
 * one thread. Recorded in the security notes (~/Dev/Apps/blueprints/portfolio-security.md, kept out of this public repo); an email-code step can sit on top later.
 *
 * POST { email, name?, source?, subject?, projectType?, budget?, tags?, portalToken?, lookupOnly? }
 *   → { conversation: {...} | null, token?: string }
 */
const crypto = require("crypto");

const SOURCES = ["contact", "hire-me", "client-portal", "portal"];
const RATE_LIMIT_PER_HOUR = 30;

class DmError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function str(v, max) { return String(v == null ? "" : v).trim().slice(0, max); }
function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 160; }
function hash(v) { return crypto.createHash("sha256").update(String(v)).digest("hex"); }

/** Per-IP hourly counter. Slows down anyone trying emails to find threads. */
async function rateLimit(db, ip, now) {
  const bucket = Math.floor(now / 3600000);
  const ref = db.ref("agencyRateLimits/dmSession/" + hash(ip || "unknown").slice(0, 32) + "/" + bucket);
  const res = await ref.transaction((n) => (Number(n) || 0) + 1);
  if ((res.snapshot.val() || 0) > RATE_LIMIT_PER_HOUR) throw new DmError(429, "Too many requests. Try again in a little while.");
}

/** Client-portal chat links to its project only when the portal token is real. */
async function projectFromPortalToken(db, token, now) {
  const t = str(token, 200);
  if (!/^[A-Za-z0-9_-]{16,200}$/.test(t)) return "";
  const link = (await db.ref("agencyClientPortals/" + t).once("value")).val();
  if (!link || !link.projectId || (link.expiresAt && Number(link.expiresAt) < now)) return "";
  return String(link.projectId);
}

function publicConversation(id, m) {
  return {
    id,
    customerName: m.customerName || "",
    customerEmail: m.customerEmail || "",
    source: m.source || "",
    originSource: m.originSource || "",
    subject: m.subject || "",
    projectType: m.projectType || "",
    budget: m.budget || "",
    agencyProjectId: m.agencyProjectId || "",
  };
}

/**
 * @param {object} deps { db, auth } — firebase-admin database + auth (or test doubles)
 */
async function handle(deps, body, ip, now) {
  now = now || Date.now();
  const { db, auth } = deps;
  const email = str(body && body.email, 160).toLowerCase();
  if (!validEmail(email)) throw new DmError(400, "Enter a valid email.");
  await rateLimit(db, ip, now);

  const name = str(body.name, 120);
  const source = SOURCES.indexOf(str(body.source, 20)) >= 0 ? str(body.source, 20) : "portal";
  const projectId = body.portalToken ? await projectFromPortalToken(db, body.portalToken, now) : "";

  const q = await db.ref("dm/meta").orderByChild("customerEmail").equalTo(email).limitToFirst(1).once("value");
  const found = q.val() || {};
  let id = Object.keys(found)[0] || "";
  let meta = id ? found[id] : null;

  if (!id && body.lookupOnly) return { conversation: null };

  if (id) {
    const patch = {};
    if (name && name !== meta.customerName) patch.customerName = name;
    if (body.source != null) patch.source = source;
    if (!meta.originSource) patch.originSource = source;
    if (body.subject != null) patch.subject = str(body.subject, 160);
    if (body.projectType != null) patch.projectType = str(body.projectType, 120);
    if (body.budget != null) patch.budget = str(body.budget, 80);
    if (projectId && !meta.agencyProjectId) patch.agencyProjectId = projectId;
    if (Object.keys(patch).length && !body.lookupOnly) {
      patch.updatedAt = now;
      await db.ref("dm/meta/" + id).update(patch);
      meta = Object.assign({}, meta, patch);
    }
  } else {
    const ref = db.ref("dm/meta").push();
    id = ref.key;
    const tags = Array.isArray(body.tags) ? body.tags.map((t) => str(t, 30)).filter(Boolean).slice(0, 6) : [source];
    meta = {
      customerName: name,
      customerEmail: email,
      source,
      originSource: source,
      subject: str(body.subject, 160),
      projectType: str(body.projectType, 120),
      budget: str(body.budget, 80),
      status: "open",
      priority: "normal",
      tags,
      assignee: "Admin",
      agencyProjectId: projectId,
      unreadAdmin: 0,
      unreadCustomer: 0,
      lastMessage: "",
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(meta);
  }

  // One email = one conversation, so the uid is stable per email.
  const uid = "dm_" + hash(email).slice(0, 24);
  const token = await auth.createCustomToken(uid, { dmConv: id, dmEmail: email });
  return { conversation: publicConversation(id, meta), token };
}

module.exports = { handle, DmError, RATE_LIMIT_PER_HOUR };
