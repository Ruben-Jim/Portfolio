/**
 * Instant reply in the customer's chat after a contact or Hire Me form message.
 *
 * Customers can't write messages as CWR (database rules), so the autoReplyOnInquiry
 * trigger in index.js writes it with the Admin SDK. Texts are edited in Admin →
 * Messages → Replies (agencyInboxReplies/auto); these defaults are used until then.
 * Keep DEFAULT_AUTO_REPLIES in sync with assets/js/inbox-replies.js (test-inbox-replies).
 */
"use strict";

const DEFAULT_AUTO_REPLIES = {
  enabled: true,
  contact:
    "Hi {name}! Thanks for reaching out to CodeWithRuben. I got your message and will reply right here within a day (usually sooner). If you think of anything else, just add it below.",
  hireMe:
    "Hi {name}! Thanks for your project inquiry. I'm looking it over and will reply here within a day with next steps. Want to talk it through sooner? Book a quick call: https://rubenjimenez.dev/schedule",
};

/** One automatic reply per conversation per 12 hours (a second form send won't repeat it). */
const COOLDOWN_MS = 12 * 60 * 60 * 1000;
const MAX_LEN = 1200;

function isInquiryMessage(msg) {
  if (!msg || msg.senderRole !== "customer") return false;
  const source = String(msg.source || "").toLowerCase();
  return source === "contact" || source === "hire-me";
}

function firstName(name) {
  const first = String(name || "").trim().split(/\s+/)[0] || "";
  return /^customer$/i.test(first) ? "" : first;
}

/** {name} → their first name, or "there" when we don't have one. */
function fillTemplate(template, vars) {
  const name = firstName(vars && vars.name) || "there";
  return String(template || "").replace(/\{name\}/g, name).trim().slice(0, MAX_LEN);
}

/**
 * The reply to send for this message, or null.
 * settings: agencyInboxReplies/auto ({ enabled, contact, hireMe }) or null for defaults.
 */
function autoReplyFor({ msg, meta, settings, now }) {
  if (!isInquiryMessage(msg)) return null;
  if (!meta || typeof meta !== "object") return null; // conversation gone
  const s = Object.assign({}, DEFAULT_AUTO_REPLIES, settings || {});
  if (s.enabled === false) return null;
  const last = Number(meta.autoReplyAt || 0);
  if (last && Number(now) - last < COOLDOWN_MS) return null;
  const source = String(msg.source).toLowerCase();
  const raw = String((source === "hire-me" ? s.hireMe : s.contact) || "").trim() ||
    (source === "hire-me" ? DEFAULT_AUTO_REPLIES.hireMe : DEFAULT_AUTO_REPLIES.contact);
  const body = fillTemplate(raw, { name: meta.customerName || msg.senderName });
  return body ? { body } : null;
}

module.exports = { DEFAULT_AUTO_REPLIES, COOLDOWN_MS, isInquiryMessage, firstName, fillTemplate, autoReplyFor };
