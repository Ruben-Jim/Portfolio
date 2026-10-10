/**
 * Website inquiries → Leads Pipeline.
 *
 * Hire Me, Contact, and Schedule-a-call are written by the public site, which
 * can't touch admin-only `pipelineLeads`. These triggers (wired in index.js)
 * create the lead, or link to the one that already exists, with the same
 * matching rules the admin uses (lead-match.js):
 *
 *   Hire Me inquiry   → stage Lead, package + live offer price, DM thread link
 *   Contact message   → stage Lead, DM thread link (once per conversation)
 *   Call booked       → stage Discovery call, follow-up on the call date
 *
 * A matching prospect is marked "In pipeline" and its touches carry over.
 * Inbound events only ever move a lead forward, never back.
 */
const M = require("./lead-match");

// Regular package prices + project types. Mirrors PACKAGES in
// assets/js/care-pricing.js — scripts/test-inbound-leads.mjs fails if they drift.
const PACKAGES = {
  linktree: { name: "Link Tree", price: 99, projectType: "web" },
  "starter-page": { name: "Starter Page", price: 499, projectType: "web" },
  website: { name: "Business Website", price: 999, projectType: "web" },
  starter: { name: "Starter Presence", price: 1500, projectType: "both" },
  growth: { name: "Growth Platform", price: 3500, projectType: "both" },
  agency: { name: "Business Platform", price: 6000, projectType: "both" },
  studio: { name: "Studio Build", price: 15000, projectType: "both" },
};

function dateKey(d) {
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

/** Pacific date for "today" / call dates — the business runs on Fresno time. */
function pacificDateKey(ms) {
  const s = new Date(ms).toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
  return dateKey(new Date(s));
}

/** Same rules as PackagePricing.activeOffer(), on the raw RTDB row. */
function activeOffer(pkgId, raw, now) {
  const p = PACKAGES[pkgId];
  const o = raw || {};
  if (!p || o.enabled !== true) return null;
  const price = Math.round(Number(o.price) || 0);
  if (!(price > 0 && price < p.price)) return null;
  if (o.endsAt && pacificDateKey(now) > o.endsAt) return null;
  const spots = Math.round(Number(o.spots) || 0);
  if (spots && Math.round(Number(o.claimed) || 0) >= spots) return null;
  return { price };
}

function listOf(val) {
  return Object.keys(val || {}).map((id) => Object.assign({ id }, val[id]));
}

/**
 * @param {object} db   firebase-admin database (or a test double with ref().once/update/push/set)
 * @param {object} ev   { kind: 'hire-me'|'contact'|'booking', name, email, phone, packageId,
 *                        message, projectType, budget, conversationId, bookingId, callLabel, startISO }
 * @param {number} now  ms
 * @returns {Promise<{leadId: string, created: boolean, skipped?: string}>}
 */
async function upsertInboundLead(db, ev, now) {
  now = now || Date.now();
  const email = M.normEmail(ev.email);
  if (!email && !M.digits(ev.phone)) return { leadId: "", created: false, skipped: "no contact info" };

  const [leadsSnap, prospectsSnap] = await Promise.all([
    db.ref("pipelineLeads").once("value"),
    db.ref("agencyProspects").once("value"),
  ]);
  const leads = listOf(leadsSnap.val());
  const prospects = listOf(prospectsSnap.val());
  const probe = { email, phone: ev.phone || "", company: ev.company || "" };
  let lead = M.findMatch(probe, leads);

  // Contact sends a new message each time; only the first one makes a lead.
  if (ev.kind === "contact" && lead && lead.dmConversationId === ev.conversationId) {
    return { leadId: lead.id, created: false, skipped: "conversation already linked" };
  }

  const pkg = PACKAGES[ev.packageId] ? ev.packageId : "";
  let offer = null;
  if (pkg) {
    const offerSnap = await db.ref("agencyPricing/packageOffers/" + pkg).once("value");
    offer = activeOffer(pkg, offerSnap.val(), now);
  }
  const stage = ev.kind === "booking" ? "discovery-call" : "lead";
  const callDay = ev.startISO ? pacificDateKey(Date.parse(ev.startISO)) : "";
  const historyKind = ev.kind === "booking" ? "booked-call" : ev.kind === "hire-me" ? "inquiry" : "contact";
  const label = ev.kind === "booking" ? "Booked " + (ev.callLabel || "a call") + (callDay ? " for " + callDay : "")
    : ev.kind === "hire-me" ? "Hire Me inquiry" + (pkg ? " · " + PACKAGES[pkg].name : "")
    : "Contact message";
  const noteLines = [label + " · " + pacificDateKey(now)];
  if (ev.projectType && ev.projectType !== "Not specified") noteLines.push("Project: " + ev.projectType);
  if (ev.budget && ev.budget !== "Not specified") noteLines.push("Budget: " + ev.budget);
  if (ev.message) noteLines.push(String(ev.message).slice(0, 1500));
  const note = noteLines.join("\n");
  const historyEntry = { at: now, kind: historyKind, note: label, from: "website" };

  const prospect = M.findMatch(probe, prospects.filter((p) => !p.leadId || (lead && p.leadId === lead.id)));

  let leadId;
  let created = false;
  if (lead) {
    leadId = lead.id;
    const patch = M.fillBlanks(lead, {
      name: ev.name,
      email,
      phone: ev.phone,
      packageId: pkg,
      packageOfferPrice: offer ? offer.price : null,
      value: pkg ? (offer ? offer.price : PACKAGES[pkg].price) : 0,
      projectType: pkg ? PACKAGES[pkg].projectType : "",
      dmConversationId: ev.conversationId,
      bookingId: ev.bookingId,
    });
    patch.stage = M.laterStage(lead.stage || "lead", stage);
    patch.notes = (lead.notes ? String(lead.notes) + "\n\n" : "") + note;
    patch["history/h" + now + "_" + historyKind] = historyEntry;
    if (callDay) patch.followUpAt = callDay;
    patch.updatedAt = now;
    await db.ref("pipelineLeads/" + leadId).update(patch);
  } else {
    const ref = db.ref("pipelineLeads").push();
    leadId = ref.key;
    created = true;
    const history = prospect ? M.mergeHistory(null, prospect.touches, "prospect") : {};
    history["h" + now + "_" + historyKind] = historyEntry;
    await ref.set({
      name: String(ev.name || email).slice(0, 120),
      email,
      phone: ev.phone || (prospect && prospect.phone) || "",
      company: (prospect && prospect.business) || "",
      projectType: pkg ? PACKAGES[pkg].projectType : "web",
      value: pkg ? (offer ? offer.price : PACKAGES[pkg].price) : 0,
      packageId: pkg || null,
      packageOfferPrice: offer ? offer.price : null,
      stage,
      source: prospect ? "cold" : "website",
      inboundSource: ev.kind,
      notes: note,
      outreach: prospect ? M.outreachFromTouches(prospect.touches) : null,
      history,
      prospectId: prospect ? prospect.id : null,
      outreachScriptId: prospect && prospect.scriptId ? prospect.scriptId : null,
      dmConversationId: ev.conversationId || null,
      bookingId: ev.bookingId || null,
      followUpAt: callDay || pacificDateKey(now),
      createdAt: now,
      updatedAt: now,
    });
  }

  // Links both ways, so the inbox and bookings can open the lead.
  const links = {};
  if (ev.conversationId) links["dm/meta/" + ev.conversationId + "/leadId"] = leadId;
  if (ev.bookingId) links["agencyBookings/" + ev.bookingId + "/leadId"] = leadId;
  if (prospect && !prospect.leadId) {
    links["agencyProspects/" + prospect.id + "/leadId"] = leadId;
    links["agencyProspects/" + prospect.id + "/status"] = "promoted";
    links["agencyProspects/" + prospect.id + "/updatedAt"] = now;
  }
  if (Object.keys(links).length) await db.ref().update(links);
  return { leadId, created };
}

/** dm/threadMessages/{conversationId}/{messageId} → event, or null to ignore. */
async function eventFromMessage(db, conversationId, msg) {
  if (!msg || msg.senderRole !== "customer") return null;
  if (msg.source !== "hire-me" && msg.source !== "contact") return null;
  const metaSnap = await db.ref("dm/meta/" + conversationId).once("value");
  const meta = metaSnap.val() || {};
  return {
    kind: msg.source,
    name: meta.customerName || msg.senderName || "",
    email: meta.customerEmail || "",
    phone: meta.customerPhone || "",
    packageId: msg.package_id || meta.packageId || "",
    projectType: msg.project_type || meta.projectType || "",
    budget: msg.budget || meta.budget || "",
    message: msg.body || "",
    conversationId,
  };
}

function eventFromBooking(bookingId, b) {
  if (!b || !b.email) return null;
  return {
    kind: "booking",
    name: b.name || "",
    email: b.email,
    phone: b.phone || "",
    projectType: b.leadProjectType || "",
    budget: b.leadBudget || "",
    callLabel: b.callTypeLabel || "call",
    startISO: b.startISO || "",
    bookingId,
  };
}

module.exports = { upsertInboundLead, eventFromMessage, eventFromBooking, activeOffer, PACKAGES };
