"use strict";

const admin = require("firebase-admin");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const { Resend } = require("resend");
const { Webhook } = require("svix");

if (!admin.apps.length) {
  admin.initializeApp();
}

/** Must match ADMIN_ALLOWLIST_EMAILS (config.js), isPortfolioAdmin() (firestore.rules), RTDB rules. */
const ADMIN_ALLOWLIST_EMAILS = ["ruben.jim.co@gmail.com"];

async function verifyAdminBearer(req) {
  const authHeader = String(req.headers.authorization || "");
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (!match) return null;
  try {
    const decoded = await admin.auth().verifyIdToken(match[1]);
    const email = String(decoded.email || "")
      .trim()
      .toLowerCase();
    if (!email || !ADMIN_ALLOWLIST_EMAILS.includes(email)) return null;
    return decoded;
  } catch (err) {
    console.warn("verifyAdminBearer:", err.message || err);
    return null;
  }
}
const {
  buildContactNotificationHtml,
  buildHireMeNotificationHtml,
  buildTestimonialRequestHtml,
  buildPortalInviteHtml,
  buildAdminReplyHtml,
  buildBookingConfirmationHtml,
  buildBookingMeetLinkHtml,
  buildBookingAdminNotificationHtml,
} = require("./emailTemplates");

function icsEscapeText(s) {
  return String(s || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function icsDateStamp(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function buildBookingIcs({ uid, startISO, endISO, summary, description, organizerEmail, attendeeName, attendeeEmail }) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CodeWithRuben//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:" + uid + "@rubenjimenez.dev",
    "DTSTAMP:" + icsDateStamp(new Date()),
    "DTSTART:" + icsDateStamp(startISO),
    "DTEND:" + icsDateStamp(endISO),
    "SUMMARY:" + icsEscapeText(summary),
    "DESCRIPTION:" + icsEscapeText(description),
    "ORGANIZER;CN=CodeWithRuben:mailto:" + organizerEmail,
    "ATTENDEE;CN=" + icsEscapeText(attendeeName) + ";RSVP=FALSE:mailto:" + attendeeEmail,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

const resendApiKey = defineSecret("RESEND_API_KEY");
const resendWebhookSecret = defineSecret("RESEND_WEBHOOK_SECRET");
const resendOutboundWebhookSecret = defineSecret("RESEND_OUTBOUND_WEBHOOK_SECRET");
const DEFAULT_RESEND_FROM = "CodeWithRuben <contact@rubenjimenez.dev>";
const resendFrom = defineString("RESEND_FROM", {
  default: DEFAULT_RESEND_FROM,
});
const RESEND_INBOUND_DOMAIN = "ouuldeaulk.resend.app";
// Client-facing mail replies here so responses come back through Resend's
// inbound webhook and thread in the Email tab. Admin notification emails keep
// replyTo = the customer's address, so replying from Gmail still reaches them.
const RESEND_REPLY_TO = "replies@" + RESEND_INBOUND_DOMAIN;
const notifyToEmail = defineString("NOTIFY_TO_EMAIL", { default: "" });

const MAX_BODY_BYTES = 48 * 1024;
const MAX_MESSAGE_LEN = 20000;

function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function validEmail(v) {
  if (!isNonEmptyString(v)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function resolveResendFrom(raw) {
  const value = String(raw || "").trim();
  if (!value) return DEFAULT_RESEND_FROM;
  // Guard against legacy no-reply sender leaking into customer-visible emails.
  if (/noreply@/i.test(value) || /no-reply@/i.test(value)) {
    return DEFAULT_RESEND_FROM;
  }
  return value;
}

function parseFromHeader(raw) {
  const value = String(raw || "").trim();
  if (!value) return { from: "", fromEmail: "", fromName: "" };
  const angle = /^(.+?)\s*<([^>]+)>$/.exec(value);
  if (angle) {
    const name = angle[1].replace(/^["']|["']$/g, "").trim();
    const email = angle[2].trim().toLowerCase();
    return {
      from: value,
      fromEmail: email,
      fromName: name || email,
    };
  }
  const email = value.toLowerCase();
  return { from: value, fromEmail: email, fromName: email };
}

function getHeaderValue(headers, name) {
  if (!headers || typeof headers !== "object") return "";
  const target = String(name || "").toLowerCase();
  const direct = headers[target];
  if (direct != null && String(direct).trim()) return String(direct).trim();
  const keys = Object.keys(headers);
  for (let i = 0; i < keys.length; i += 1) {
    const key = String(keys[i] || "");
    if (key.toLowerCase() === target) {
      const val = headers[key];
      if (val != null && String(val).trim()) return String(val).trim();
    }
  }
  return "";
}

function isResendInboundAddress(addr) {
  const email = String(addr || "").trim().toLowerCase();
  return email.endsWith("@" + RESEND_INBOUND_DOMAIN);
}

function hasResendInboundRecipient(list) {
  if (!Array.isArray(list)) return false;
  return list.some(isResendInboundAddress);
}

async function fetchReceivedEmailBody(emailId, apiKey) {
  const res = await fetch("https://api.resend.com/emails/receiving/" + encodeURIComponent(emailId), {
    method: "GET",
    headers: {
      Authorization: "Bearer " + apiKey,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const errText = await res.text().catch(function () {
      return "";
    });
    throw new Error("Receiving API " + res.status + ": " + (errText || res.statusText));
  }
  return res.json();
}

/**
 * Body of an email WE sent. Resend's webhook payload carries only metadata, so
 * the thread had a subject and no message. Mirrors fetchReceivedEmailBody().
 */
async function fetchSentEmailBody(emailId, apiKey) {
  const res = await fetch("https://api.resend.com/emails/" + encodeURIComponent(emailId), {
    method: "GET",
    headers: {
      Authorization: "Bearer " + apiKey,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const errText = await res.text().catch(function () {
      return "";
    });
    throw new Error("Emails API " + res.status + ": " + (errText || res.statusText));
  }
  return res.json();
}

function normalizePublicOrigin(raw) {
  const fallback = "https://rubenjimenez.dev";
  const value = String(raw || "").trim();
  if (!value) return fallback;
  if (!/^https?:\/\//i.test(value)) return fallback;
  try {
    const parsed = new URL(value);
    return parsed.origin.replace(/\/$/, "");
  } catch (err) {
    return fallback;
  }
}

function isPortalTokenActive(row, nowMs) {
  if (!row || typeof row !== "object") return false;
  const expiresAt = Number(row.expiresAt || 0);
  if (!expiresAt) return true;
  return expiresAt > nowMs;
}

exports.sendPortfolioEmail = onRequest(
  {
    region: "us-central1",
    cors: true,
    /** Allow browser / curl without Google-signed identity (required for portfolio forms). */
    invoker: "public",
    secrets: [resendApiKey],
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }

    const rawLen = req.rawBody ? req.rawBody.length : JSON.stringify(req.body || {}).length;
    if (rawLen > MAX_BODY_BYTES) {
      res.status(413).json({ ok: false, error: "Payload too large" });
      return;
    }

    const body = parseBody(req);
    if (!body || typeof body !== "object") {
      res.status(400).json({ ok: false, error: "Invalid JSON body" });
      return;
    }

    const type = body.type;
    const payload = body.payload && typeof body.payload === "object" ? body.payload : {};

    const from = resolveResendFrom(resendFrom.value());
    const notifyTo = notifyToEmail.value().trim();
    const resend = new Resend(resendApiKey.value());

    try {
      if (type === "contact") {
        if (!notifyTo) {
          res.status(503).json({
            ok: false,
            error: "NOTIFY_TO_EMAIL is not configured on the server",
          });
          return;
        }
        const fullname = String(payload.fullname || "").trim();
        const email = String(payload.email || "").trim();
        const message = String(payload.message || "");
        if (!fullname || !validEmail(email) || !message.trim()) {
          res.status(400).json({ ok: false, error: "Missing fullname, email, or message" });
          return;
        }
        if (message.length > MAX_MESSAGE_LEN) {
          res.status(400).json({ ok: false, error: "Message too long" });
          return;
        }
        const subject = String(payload.subject || "New Contact Form Submission - Portfolio");
        const html = buildContactNotificationHtml({
          fullname,
          email,
          message,
          subject,
          timestamp: String(payload.timestamp || ""),
          website: String(payload.website || ""),
          user_agent: String(payload.user_agent || ""),
        });
        const { data, error } = await resend.emails.send({
          from,
          to: [notifyTo],
          replyTo: email,
          subject,
          html,
        });
        if (error) {
          console.error("Resend error (contact):", error);
          res.status(502).json({ ok: false, error: error.message || "Resend failed" });
          return;
        }
        res.status(200).json({ ok: true, id: data && data.id });
        return;
      }

      if (type === "hire_me") {
        if (!notifyTo) {
          res.status(503).json({
            ok: false,
            error: "NOTIFY_TO_EMAIL is not configured on the server",
          });
          return;
        }
        const fullname = String(payload.fullname || "").trim();
        const email = String(payload.email || "").trim();
        const message = String(payload.message || "");
        if (!fullname || !validEmail(email) || !message.trim()) {
          res.status(400).json({ ok: false, error: "Missing fullname, email, or message" });
          return;
        }
        if (message.length > MAX_MESSAGE_LEN) {
          res.status(400).json({ ok: false, error: "Message too long" });
          return;
        }
        const subject = String(payload.subject || "New Hire Me Inquiry - Portfolio");
        const html = buildHireMeNotificationHtml({
          fullname,
          email,
          message,
          subject,
          project_type: String(payload.project_type || ""),
          budget: String(payload.budget || ""),
          timestamp: String(payload.timestamp || ""),
          website: String(payload.website || ""),
          user_agent: String(payload.user_agent || ""),
        });
        const { data, error } = await resend.emails.send({
          from,
          to: [notifyTo],
          replyTo: email,
          subject,
          html,
        });
        if (error) {
          console.error("Resend error (hire_me):", error);
          res.status(502).json({ ok: false, error: error.message || "Resend failed" });
          return;
        }
        res.status(200).json({ ok: true, id: data && data.id });
        return;
      }

      if (type === "booking_confirmation") {
        const name = String(payload.name || "").trim();
        const email = String(payload.email || "").trim();
        const callTypeLabel = String(payload.call_type_label || "").trim();
        const startDisplay = String(payload.start_display || "").trim();
        const timezoneLabel = String(payload.timezone_label || "").trim();
        const startISO = String(payload.start_iso || "").trim();
        const endISO = String(payload.end_iso || "").trim();
        const meetUrl = String(payload.meet_url || "").trim();
        if (!name || !validEmail(email) || !callTypeLabel || !startDisplay) {
          res.status(400).json({
            ok: false,
            error: "Missing name, email, call_type_label, or start_display",
          });
          return;
        }

        const clientHtml = buildBookingConfirmationHtml({
          to_name: name,
          to_email: email,
          call_type_label: callTypeLabel,
          start_display: startDisplay,
          timezone_label: timezoneLabel,
          meet_url: meetUrl,
        });

        let icsAttachment = null;
        const startDate = new Date(startISO);
        const endDate = new Date(endISO);
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          const icsContent = buildBookingIcs({
            uid: "booking-" + startDate.getTime(),
            startISO: startDate,
            endISO: endDate,
            summary: callTypeLabel + " with CodeWithRuben",
            description:
              "Discovery call with CodeWithRuben (" +
              callTypeLabel +
              ")." +
              (meetUrl ? " Meet: " + meetUrl : ""),
            organizerEmail: notifyTo || ADMIN_ALLOWLIST_EMAILS[0],
            attendeeName: name,
            attendeeEmail: email,
          });
          icsAttachment = {
            filename: "call-with-codewithruben.ics",
            content: Buffer.from(icsContent, "utf-8"),
          };
        } else {
          console.warn("booking_confirmation: missing/invalid start_iso or end_iso, skipping .ics attachment");
        }

        const { error: clientError } = await resend.emails.send({
          from,
          to: [email],
          replyTo: RESEND_REPLY_TO,
          subject: "Your call with CWR is booked",
          html: clientHtml,
          attachments: icsAttachment ? [icsAttachment] : undefined,
        });
        if (clientError) {
          console.error("Resend error (booking_confirmation client):", clientError);
          res.status(502).json({ ok: false, error: clientError.message || "Resend failed" });
          return;
        }

        if (notifyTo) {
          const adminHtml = buildBookingAdminNotificationHtml({
            name,
            email,
            call_type_label: callTypeLabel,
            start_display: startDisplay,
          });
          const { error: adminError } = await resend.emails.send({
            from,
            to: [notifyTo],
            replyTo: email,
            subject: "New call booked: " + name,
            html: adminHtml,
          });
          if (adminError) {
            console.error("Resend error (booking_confirmation admin):", adminError);
            // Client confirmation already sent — don't fail the request over the admin copy.
          }
        }

        res.status(200).json({ ok: true });
        return;
      }

      if (type === "booking_meet_link") {
        const adminUser = await verifyAdminBearer(req);
        if (!adminUser) {
          res.status(401).json({ ok: false, error: "Unauthorized" });
          return;
        }
        const name = String(payload.name || "").trim();
        const email = String(payload.email || "").trim();
        const callTypeLabel = String(payload.call_type_label || "").trim();
        const startDisplay = String(payload.start_display || "").trim();
        const meetUrl = String(payload.meet_url || "").trim();
        if (!name || !validEmail(email) || !meetUrl || !/^https?:\/\//i.test(meetUrl)) {
          res.status(400).json({
            ok: false,
            error: "Missing name, email, or valid meet_url",
          });
          return;
        }

        const html = buildBookingMeetLinkHtml({
          to_name: name,
          to_email: email,
          call_type_label: callTypeLabel || "call",
          start_display: startDisplay,
          meet_url: meetUrl,
        });
        const { data, error } = await resend.emails.send({
          from,
          to: [email],
          replyTo: RESEND_REPLY_TO,
          subject: "Your Google Meet link for our call",
          html,
        });
        if (error) {
          console.error("Resend error (booking_meet_link):", error);
          res.status(502).json({ ok: false, error: error.message || "Resend failed" });
          return;
        }
        res.status(200).json({ ok: true, id: data && data.id });
        return;
      }

      if (type === "testimonial_request") {
        const adminUser = await verifyAdminBearer(req);
        if (!adminUser) {
          res.status(401).json({ ok: false, error: "Unauthorized" });
          return;
        }
        const toEmail = String(payload.to_email || "").trim();
        const toName = String(payload.to_name || "Customer").trim();
        const product = String(payload.product || "my software").trim();
        const testimonialUrl = String(payload.testimonial_url || "").trim();
        const subject = String(
          payload.subject || "You’re invited to share a quick testimonial"
        ).trim();
        if (!validEmail(toEmail) || !testimonialUrl || !/^https?:\/\//i.test(testimonialUrl)) {
          res.status(400).json({
            ok: false,
            error: "Missing to_email or valid testimonial_url",
          });
          return;
        }
        const html = buildTestimonialRequestHtml({
          to_name: toName,
          to_email: toEmail,
          product,
          testimonial_url: testimonialUrl,
          subject,
        });
        const replyTo = RESEND_REPLY_TO;
        const { data, error } = await resend.emails.send({
          from,
          to: [toEmail],
          replyTo,
          subject,
          html,
        });
        if (error) {
          console.error("Resend error (testimonial_request):", error);
          res.status(502).json({ ok: false, error: error.message || "Resend failed" });
          return;
        }
        res.status(200).json({ ok: true, id: data && data.id });
        return;
      }

      if (type === "portal_invite") {
        const adminUser = await verifyAdminBearer(req);
        if (!adminUser) {
          res.status(401).json({ ok: false, error: "Unauthorized" });
          return;
        }
        const toEmail = String(payload.to_email || "").trim();
        const toName = String(payload.to_name || "Customer").trim();
        const portalUrl = String(payload.portal_url || "").trim();
        const projectTitle = String(payload.project_title || "your project").trim();
        const subject = String(payload.subject || "Your project portal is ready").trim();
        if (!validEmail(toEmail) || !portalUrl || !/^https?:\/\//i.test(portalUrl)) {
          res.status(400).json({
            ok: false,
            error: "Missing to_email or valid portal_url",
          });
          return;
        }
        const html = buildPortalInviteHtml({
          to_name: toName,
          to_email: toEmail,
          portal_url: portalUrl,
          project_title: projectTitle,
          subject,
          from_name: String(payload.from_name || "Ruben Jimenez"),
        });
        const { data, error } = await resend.emails.send({
          from,
          to: [toEmail],
          replyTo: RESEND_REPLY_TO,
          subject,
          html,
        });
        if (error) {
          console.error("Resend error (portal_invite):", error);
          res.status(502).json({ ok: false, error: error.message || "Resend failed" });
          return;
        }
        res.status(200).json({ ok: true, id: data && data.id });
        return;
      }

      if (type === "portal_recover") {
        const email = String(payload.email || "")
          .trim()
          .toLowerCase();
        if (!validEmail(email)) {
          res.status(400).json({ ok: false, error: "Missing valid email" });
          return;
        }

        const db = admin.database();
        const now = Date.now();
        const publicOrigin = normalizePublicOrigin(payload.origin);

        let matchedHub = null;
        let matchedProjectId = "";
        try {
          const projectSnap = await db.ref("agencyProjects").once("value");
          const projects = projectSnap.val() || {};
          Object.keys(projects).some((projectId) => {
            const row = projects[projectId] || {};
            const rowEmail = String(row.clientEmail || "")
              .trim()
              .toLowerCase();
            if (!rowEmail || rowEmail !== email) return false;
            matchedHub = row;
            matchedProjectId = projectId;
            return true;
          });
        } catch (err) {
          console.error("portal_recover: load agencyProjects failed", err);
        }

        if (!matchedHub || !matchedProjectId) {
          res.status(200).json({ ok: true });
          return;
        }

        let token = "";
        let tokenRow = null;
        try {
          const portalSnap = await db.ref("agencyClientPortals").once("value");
          const portals = portalSnap.val() || {};

          const hubToken = String(matchedHub.portalToken || "").trim();
          if (
            hubToken &&
            portals[hubToken] &&
            String(portals[hubToken].projectId || "") === matchedProjectId &&
            isPortalTokenActive(portals[hubToken], now)
          ) {
            token = hubToken;
            tokenRow = portals[hubToken];
          } else {
            let bestToken = "";
            let bestExpires = 0;
            Object.keys(portals).forEach((tok) => {
              const row = portals[tok];
              if (!row || String(row.projectId || "") !== matchedProjectId) return;
              if (!isPortalTokenActive(row, now)) return;
              const exp = Number(row.expiresAt || 0);
              if (!bestToken || exp > bestExpires) {
                bestToken = tok;
                bestExpires = exp;
              }
            });
            if (bestToken) {
              token = bestToken;
              tokenRow = portals[bestToken];
            }
          }
        } catch (err) {
          console.error("portal_recover: load agencyClientPortals failed", err);
        }

        if (!token || !tokenRow) {
          res.status(200).json({ ok: true });
          return;
        }

        const portalUrl = publicOrigin + "/portal.html?token=" + encodeURIComponent(token);
        const toName = String(matchedHub.clientName || "there").trim();
        const projectTitle = String(
          matchedHub.title || matchedHub.clientName || "your project"
        ).trim();
        const subject = "Your client portal link";
        const html = buildPortalInviteHtml({
          to_name: toName,
          to_email: email,
          portal_url: portalUrl,
          project_title: projectTitle,
          subject,
          from_name: "Ruben Jimenez",
        });
        const { data, error } = await resend.emails.send({
          from,
          to: [email],
          replyTo: RESEND_REPLY_TO,
          subject,
          html,
        });
        if (error) {
          console.error("Resend error (portal_recover):", error);
          res.status(502).json({ ok: false, error: error.message || "Resend failed" });
          return;
        }
        res.status(200).json({ ok: true, id: data && data.id });
        return;
      }

      if (type === "admin_reply") {
        const adminUser = await verifyAdminBearer(req);
        if (!adminUser) {
          res.status(401).json({ ok: false, error: "Unauthorized" });
          return;
        }
        const toEmail = String(payload.to_email || "").trim();
        const subject = String(payload.subject || "").trim();
        const message = String(payload.message || "");
        if (!validEmail(toEmail) || !subject || !message.trim()) {
          res.status(400).json({ ok: false, error: "Missing to_email, subject, or message" });
          return;
        }
        if (message.length > MAX_MESSAGE_LEN) {
          res.status(400).json({ ok: false, error: "Message too long" });
          return;
        }
        const html = buildAdminReplyHtml({
          to_email: toEmail,
          to_name: String(payload.to_name || "Customer"),
          from_name: String(payload.from_name || "CodeWithRuben"),
          subject,
          message,
          cta_label: String(payload.cta_label || "").trim(),
          header_subtitle: String(payload.header_subtitle || "").trim(),
          timestamp: String(payload.timestamp || ""),
        });
        const sendOpts = {
          from,
          to: [toEmail],
          replyTo: RESEND_REPLY_TO,
          subject,
          html,
        };
        const inReplyTo = String(payload.in_reply_to || "").trim();
        const references = String(payload.references || "").trim();
        if (inReplyTo || references) {
          sendOpts.headers = {};
          if (inReplyTo) sendOpts.headers["In-Reply-To"] = inReplyTo;
          if (references) sendOpts.headers["References"] = references;
        }
        const { data, error } = await resend.emails.send(sendOpts);
        if (error) {
          console.error("Resend error (admin_reply):", error);
          res.status(502).json({ ok: false, error: error.message || "Resend failed" });
          return;
        }
        res.status(200).json({ ok: true, id: data && data.id });
        return;
      }

      res.status(400).json({ ok: false, error: "Unknown type" });
    } catch (err) {
      console.error("sendPortfolioEmail:", err);
      res.status(500).json({ ok: false, error: err.message || "Server error" });
    }
  }
);

/** Makes a string safe to use as a Realtime Database key. */
function rtdbSafeKey(value) {
  return String(value || "")
    .replace(/[.#$/[\]]/g, "_")
    .slice(0, 200);
}

exports.resendInboundWebhook = onRequest(
  {
    region: "us-central1",
    cors: false,
    invoker: "public",
    secrets: [resendApiKey, resendWebhookSecret],
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    const rawBody = req.rawBody
      ? req.rawBody.toString("utf8")
      : typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body || {});

    let event;
    try {
      const wh = new Webhook(resendWebhookSecret.value());
      event = wh.verify(rawBody, {
        "svix-id": req.headers["svix-id"],
        "svix-timestamp": req.headers["svix-timestamp"],
        "svix-signature": req.headers["svix-signature"],
      });
    } catch (err) {
      console.warn("resendInboundWebhook verify:", err.message || err);
      res.status(401).send("Invalid webhook");
      return;
    }

    if (!event || event.type !== "email.received") {
      res.status(200).json({ ok: true, skipped: true });
      return;
    }

    const data = event.data && typeof event.data === "object" ? event.data : {};
    const emailId = String(data.email_id || "").trim();
    const toList = Array.isArray(data.to) ? data.to.map(String) : [];

    if (!emailId || !hasResendInboundRecipient(toList)) {
      res.status(200).json({ ok: true, skipped: true });
      return;
    }

    const db = admin.database();
    // Sanitised for the same reason as the outbound key — an id with a dot in
    // it would throw here and 500 the webhook.
    const dedupeRef = db.ref("agencyInboundDedupe/" + rtdbSafeKey(emailId));

    try {
      const dedupeSnap = await dedupeRef.once("value");
      if (dedupeSnap.exists()) {
        res.status(200).json({ ok: true, duplicate: true });
        return;
      }

      const apiKey = resendApiKey.value();
      const full = await fetchReceivedEmailBody(emailId, apiKey);
      const headers = full && full.headers && typeof full.headers === "object" ? full.headers : {};
      const fromParsed = parseFromHeader(headers.from || full.from || data.from || "");
      const receivedAt =
        String(full.created_at || data.created_at || event.created_at || "").trim() ||
        new Date().toISOString();
      const subject = String(full.subject || data.subject || "").trim();
      const text = full.text != null ? String(full.text) : "";
      const html = full.html != null ? String(full.html) : "";
      const recipients = Array.isArray(full.to) && full.to.length ? full.to.map(String) : toList;
      const messageId =
        getHeaderValue(headers, "message-id")
          .replace(/^<|>$/g, "")
          .trim() || String(full.message_id || "").trim();
      const references = getHeaderValue(headers, "references");

      const record = {
        from: fromParsed.from || String(data.from || "").trim(),
        fromEmail: fromParsed.fromEmail,
        fromName: fromParsed.fromName,
        to: recipients,
        subject,
        text,
        html,
        messageId,
        references,
        receivedAt,
        createdAt: admin.database.ServerValue.TIMESTAMP,
      };

      const inboundRef = db.ref("agencyInboundEmails").push();
      await inboundRef.set(record);
      await dedupeRef.set({
        inboundId: inboundRef.key,
        createdAt: admin.database.ServerValue.TIMESTAMP,
      });

      res.status(200).json({ ok: true, id: inboundRef.key });
    } catch (err) {
      console.error("resendInboundWebhook ingest:", err);
      res.status(500).json({ ok: false, error: err.message || "Ingest failed" });
    }
  }
);

exports.resendOutboundWebhook = onRequest(
  {
    region: "us-central1",
    cors: false,
    invoker: "public",
    secrets: [resendOutboundWebhookSecret, resendApiKey],
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    const rawBody = req.rawBody
      ? req.rawBody.toString("utf8")
      : typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body || {});

    let event;
    try {
      const wh = new Webhook(resendOutboundWebhookSecret.value());
      event = wh.verify(rawBody, {
        "svix-id": req.headers["svix-id"],
        "svix-timestamp": req.headers["svix-timestamp"],
        "svix-signature": req.headers["svix-signature"],
      });
    } catch (err) {
      console.warn("resendOutboundWebhook verify:", err.message || err);
      res.status(401).send("Invalid webhook");
      return;
    }

    const type = String((event && event.type) || "");
    // email.sent is what puts a composer-sent message in the Emails tab at all —
    // delivered/bounced/complained only add status on top of it. Subscribe to
    // email.sent in the Resend dashboard or nothing will appear.
    const supported = {
      "email.sent": true,
      "email.delivered": true,
      "email.bounced": true,
      "email.complained": true,
    };
    if (!supported[type]) {
      res.status(200).json({ ok: true, skipped: true });
      return;
    }

    const data = event && typeof event.data === "object" && event.data ? event.data : {};
    const emailId = String(data.email_id || "").trim();
    // RTDB keys cannot contain . # $ [ ] or / — and every event type has a dot
    // in it ("email.delivered"). Building the key raw made db.ref() throw before
    // the event was ever written, so every webhook call 500'd and nothing
    // reached agencyOutboundEvents. That is also what got the webhook disabled.
    const dedupeKey = rtdbSafeKey(type + ":" + emailId);

    try {
      const db = admin.database();
      if (emailId) {
        const dedupeRef = db.ref("agencyOutboundDedupe/" + dedupeKey);
        const dedupeSnap = await dedupeRef.once("value");
        if (dedupeSnap.exists()) {
          res.status(200).json({ ok: true, duplicate: true });
          return;
        }
        await dedupeRef.set({
          createdAt: admin.database.ServerValue.TIMESTAMP,
        });
      }

      const record = {
        type,
        emailId,
        from: String(data.from || ""),
        to: Array.isArray(data.to) ? data.to.map(String) : [],
        subject: String(data.subject || ""),
        createdAt: admin.database.ServerValue.TIMESTAMP,
        eventAt: String(data.created_at || event.created_at || ""),
      };
      if (data.bounce) {
        record.bounce = data.bounce;
      }
      if (data.complaint) {
        record.complaint = data.complaint;
      }

      // Only on email.sent — the later delivered/bounced events describe the
      // same message, so one fetch per email is enough. Best-effort: a failure
      // here must not 500 the webhook and get it disabled again.
      if (type === "email.sent" && emailId) {
        try {
          const full = await fetchSentEmailBody(emailId, resendApiKey.value());
          if (full && typeof full === "object") {
            if (full.html) record.html = String(full.html);
            if (full.text) record.text = String(full.text);
            if (!record.subject && full.subject) record.subject = String(full.subject);
          }
        } catch (bodyErr) {
          console.warn("resendOutboundWebhook body fetch:", bodyErr.message || bodyErr);
        }
      }

      const outRef = db.ref("agencyOutboundEvents").push();
      await outRef.set(record);
      res.status(200).json({ ok: true, id: outRef.key });
    } catch (err) {
      console.error("resendOutboundWebhook ingest:", err);
      res.status(500).json({ ok: false, error: err.message || "Ingest failed" });
    }
  }
);
