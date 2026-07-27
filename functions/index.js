"use strict";

const admin = require("firebase-admin");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const { Resend } = require("resend");

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
const resendFrom = defineString("RESEND_FROM", {
  default: "Portfolio <onboarding@resend.dev>",
});
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

    const from = resendFrom.value();
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
            description: "Discovery call with CodeWithRuben (" + callTypeLabel + ").",
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
          replyTo: notifyTo || ADMIN_ALLOWLIST_EMAILS[0],
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
        const replyTo = notifyToEmail.value().trim() || ADMIN_ALLOWLIST_EMAILS[0];
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
          replyTo: notifyTo || ADMIN_ALLOWLIST_EMAILS[0],
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
          from_name: String(payload.from_name || "Ruben Jimenez"),
          subject,
          message,
          timestamp: String(payload.timestamp || ""),
        });
        const { data, error } = await resend.emails.send({
          from,
          to: [toEmail],
          replyTo: notifyTo || ADMIN_ALLOWLIST_EMAILS[0],
          subject,
          html,
        });
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
