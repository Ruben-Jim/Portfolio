/**
 * Admin push notifications — what each event says, and sending it to every
 * phone / computer Ruben turned on in admin (Overview → Phone notifications).
 *
 * Devices: adminPushDevices/<id> = { token, label, createdAt, lastSeenAt }
 * Switches: adminPushPrefs = { messages, bookings, portal, reviews, daily }
 *           (a missing switch is on)
 *
 * Messages are data-only: admin-sw.js shows them, so there is never a second
 * notification from the browser. Every builder returns null when the event
 * shouldn't buzz. Pure except sendAdminPush, which takes db + messaging.
 */
const TYPES = ["messages", "bookings", "portal", "reviews", "daily"];
const PACIFIC = "America/Los_Angeles";
// A message older than this when its trigger runs was migrated or replayed.
const STALE_MS = 10 * 60 * 1000;
const DEAD_TOKEN_CODES = [
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
];

function str(v) {
  return String(v == null ? "" : v);
}

/** One line, at most n characters, with an ellipsis when cut. */
function clip(v, n) {
  const s = str(v).replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n).trimEnd() + "…" : s;
}

function prefOn(prefs, type) {
  return !(prefs && prefs[type] === false);
}

function forDmMessage(convId, msg, meta, now) {
  if (!msg || str(msg.senderRole).toLowerCase() !== "customer") return null;
  const at = Number(msg.createdAt);
  if (at && now - at > STALE_MS) return null;
  const name = clip(msg.senderName || (meta && meta.customerName) || "Customer", 60);
  const source = str(msg.source).toLowerCase();
  const title =
    source === "hire-me" ? "Hire Me request · " + name :
    source === "contact" ? "Contact message · " + name :
    "Message from " + name;
  return {
    type: "messages",
    title,
    body: clip(msg.body, 100) || (msg.attachmentUrl ? "Sent a file" : "New message"),
    url: "/admin?open=conversation&id=" + encodeURIComponent(convId),
    tag: "dm-" + convId,
  };
}

function forInboundEmail(id, rec) {
  rec = rec || {};
  const who = clip(rec.fromName || rec.fromEmail || rec.from || "Someone", 60);
  const subject = clip(rec.subject, 80) || "(no subject)";
  const preview = clip(rec.text, 80);
  return {
    type: "messages",
    title: "Email · " + who,
    body: preview ? subject + " — " + preview : subject,
    url: "/admin?open=email&id=" + encodeURIComponent(id) +
      (rec.fromEmail ? "&from=" + encodeURIComponent(str(rec.fromEmail).toLowerCase()) : ""),
    tag: "email-" + id,
  };
}

function forOutboundEvent(rec) {
  if (!rec) return null;
  const type = str(rec.type);
  if (type !== "email.bounced" && type !== "email.complained") return null;
  const to = (Array.isArray(rec.to) ? rec.to : [rec.to]).filter(Boolean).join(", ") || "a client";
  return {
    type: "messages",
    title: type === "email.bounced" ? "Email bounced" : "Email marked as spam",
    body: clip(to + (rec.subject ? " · " + rec.subject : ""), 100),
    url: "/admin?open=email",
    tag: "outbound-" + type + "-" + (rec.emailId || to),
  };
}

function pacificWhen(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const day = d.toLocaleDateString("en-US", { timeZone: PACIFIC, weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { timeZone: PACIFIC, hour: "numeric", minute: "2-digit" });
  return day + " · " + time;
}

function forBooking(id, b) {
  if (!b) return null;
  const when = pacificWhen(b.startISO);
  const kind = clip(b.callTypeLabel || "Call", 40);
  return {
    type: "bookings",
    title: "Call booked · " + clip(b.name || b.email || "Someone", 60),
    body: when ? when + " · " + kind : kind,
    url: "/admin?open=booking&id=" + encodeURIComponent(id),
    tag: "booking-" + id,
  };
}

function cap(s) {
  s = str(s);
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function forPortal(ev) {
  if (!ev) return null;
  const client = clip(ev.clientName || "A client", 60);
  const url = "/admin?open=client&id=" + encodeURIComponent(str(ev.projectId));
  const tag = "portal-" + str(ev.projectId) + "-" + str(ev.ref || ev.action);
  if (ev.action === "submitTicket") {
    return { type: "portal", title: "New ticket · " + client, body: clip(str(ev.ref) + " · " + str(ev.title), 100), url, tag };
  }
  if (ev.action === "replyTicket") {
    const verdict = ev.verdict === "ok" ? "Looks good" : "Still not working";
    const note = clip(ev.note, 70);
    return { type: "portal", title: "Ticket reply · " + client, body: str(ev.ref) + " · " + verdict + (note ? " — " + note : ""), url, tag };
  }
  if (ev.action === "signContract") {
    return { type: "portal", title: "Contract signed · " + client, body: "Signed by " + clip(ev.signedByName || "the client", 60), url, tag };
  }
  if (ev.action === "requestPlan") {
    return { type: "portal", title: "Care plan requested · " + client, body: cap(ev.tier) + " · " + (ev.billing === "annual" ? "yearly" : "monthly"), url, tag };
  }
  return null;
}

function forReview(id, t) {
  if (!t) return null;
  const rating = Math.max(0, Math.min(5, Math.round(Number(t.rating) || 0)));
  const stars = rating ? "★".repeat(rating) + "☆".repeat(5 - rating) + " " : "";
  return {
    type: "reviews",
    title: "New review · " + clip(t.name || "A client", 60),
    body: stars + clip(t.text, 90),
    url: "/admin?open=review&id=" + encodeURIComponent(id),
    tag: "review-" + id,
  };
}

/** YYYY-MM-DD for the given moment in Pacific time. */
function pacificTodayKey(now) {
  return new Date(now).toLocaleDateString("en-CA", { timeZone: PACIFIC });
}

function daysBetween(fromKey, toKey) {
  return Math.round((Date.parse(toKey + "T00:00:00Z") - Date.parse(fromKey + "T00:00:00Z")) / 86400000);
}

function plural(n, word) {
  return n + " " + word + (n === 1 ? "" : "s");
}

/** Morning list: follow-ups due or late, active costs renewing within 7 days. */
function dailyDigest(data, todayKey) {
  data = data || {};
  const follow = Object.keys(data.leads || {})
    .map((id) => data.leads[id])
    .filter((l) => l && l.stage !== "deposit" && l.followUpAt && str(l.followUpAt).slice(0, 10) <= todayKey)
    .sort((a, b) => (str(a.followUpAt) < str(b.followUpAt) ? -1 : 1));
  const renew = Object.keys(data.studioCosts || {})
    .map((id) => data.studioCosts[id])
    .filter((c) => {
      if (!c || str(c.status || "active").toLowerCase() !== "active" || !c.renewalDate) return false;
      const d = daysBetween(todayKey, str(c.renewalDate).slice(0, 10));
      return d >= 0 && d <= 7;
    })
    .sort((a, b) => (str(a.renewalDate) < str(b.renewalDate) ? -1 : 1));
  if (!follow.length && !renew.length) return null;

  const parts = [];
  if (follow.length) parts.push(plural(follow.length, "follow-up"));
  if (renew.length) parts.push(plural(renew.length, "renewal"));
  const lines = follow.slice(0, 3).map((l) => {
    const late = daysBetween(str(l.followUpAt).slice(0, 10), todayKey);
    return "Follow up: " + clip(l.name || l.company || "Untitled", 40) + (late > 0 ? " (" + late + "d overdue)" : "");
  });
  if (follow.length > 3) lines.push("+" + (follow.length - 3) + " more follow-ups");
  renew.slice(0, 2).forEach((c) => {
    const d = new Date(str(c.renewalDate).slice(0, 10) + "T12:00:00Z");
    const day = d.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short" });
    const amount = Number(c.amount) ? " $" + Math.round(Number(c.amount)) : "";
    lines.push("Renews " + day + ": " + clip(c.name || "Studio cost", 40) + amount);
  });
  return {
    type: "daily",
    title: "Today: " + parts.join(" · "),
    body: lines.join("\n"),
    url: "/admin?open=overview",
    tag: "daily-" + todayKey,
  };
}

function testNotice() {
  return {
    type: "test",
    title: "CWR Admin",
    body: "Notifications are on for this device.",
    url: "/admin?open=overview",
    tag: "test",
  };
}

function toFcmMessage(token, n) {
  return {
    token,
    data: { title: str(n.title), body: str(n.body), url: str(n.url || "/admin"), tag: str(n.tag), type: str(n.type) },
    webpush: { headers: { Urgency: "high", TTL: n.type === "daily" ? "21600" : "86400" } },
  };
}

function isDeadToken(err) {
  return !!err && DEAD_TOKEN_CODES.indexOf(err.code || (err.errorInfo && err.errorInfo.code)) >= 0;
}

/**
 * Send one notification to every device. Never throws for a send failure —
 * a push must not break the message, booking or ticket that caused it.
 */
async function sendAdminPush(db, messaging, n, opts) {
  opts = opts || {};
  if (!n) return { sent: 0, removed: 0, skipped: "none" };
  if (!opts.ignorePrefs && TYPES.indexOf(n.type) >= 0) {
    const prefs = (await db.ref("adminPushPrefs").once("value")).val();
    if (!prefOn(prefs, n.type)) return { sent: 0, removed: 0, skipped: "off" };
  }
  const devices = (await db.ref("adminPushDevices").once("value")).val() || {};
  const ids = Object.keys(devices).filter((id) => devices[id] && devices[id].token);
  if (!ids.length) return { sent: 0, removed: 0, skipped: "no-devices" };
  let sent = 0;
  let removed = 0;
  await Promise.all(ids.map(async (id) => {
    try {
      await messaging.send(toFcmMessage(devices[id].token, n));
      sent += 1;
    } catch (err) {
      if (isDeadToken(err)) {
        await db.ref("adminPushDevices/" + id).remove();
        removed += 1;
      } else {
        console.error("admin push failed", id, err && (err.code || err.message));
      }
    }
  }));
  return { sent, removed };
}

module.exports = {
  TYPES,
  clip,
  prefOn,
  forDmMessage,
  forInboundEmail,
  forOutboundEvent,
  forBooking,
  forPortal,
  forReview,
  pacificTodayKey,
  dailyDigest,
  testNotice,
  toFcmMessage,
  isDeadToken,
  sendAdminPush,
};
