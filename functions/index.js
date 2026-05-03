"use strict";

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const { Resend } = require("resend");
const {
  buildContactNotificationHtml,
  buildHireMeNotificationHtml,
  buildAdminReplyHtml,
} = require("./emailTemplates");

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

      if (type === "admin_reply") {
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
