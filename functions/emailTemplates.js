"use strict";

/**
 * HTML email bodies — aligned with portfolio templates under templates/emails/
 * (table + inline styles for client compatibility).
 */

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function row(label, value) {
  return (
    "<tr><td style=\"padding:8px 0;border-bottom:1px solid #e8e8e8;\">" +
    "<span style=\"color:#ffc107;font-weight:600;font-size:13px;text-transform:uppercase;\">" +
    escapeHtml(label) +
    "</span><br/>" +
    "<span style=\"color:#333;font-size:15px;font-weight:500;\">" +
    escapeHtml(value) +
    "</span></td></tr>"
  );
}

function wrapEmail(title, accent, innerRows, footerNote) {
  return (
    "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>" +
    escapeHtml(title) +
    "</title></head><body style=\"margin:0;padding:24px;background:#f5f5f5;font-family:Poppins,Arial,sans-serif;\">" +
    "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e0e0e0;box-shadow:0 8px 24px rgba(0,0,0,0.08);\">" +
    "<tr><td style=\"padding:28px 24px;text-align:center;background:linear-gradient(135deg," +
    accent +
    ");\">" +
    "<h1 style=\"margin:0;font-size:22px;font-weight:600;color:#1a1a1a;letter-spacing:0.5px;\">" +
    escapeHtml(title) +
    "</h1></td></tr>" +
    "<tr><td style=\"padding:28px 24px 20px;\"><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">" +
    innerRows +
    "</table></td></tr>" +
    "<tr><td style=\"padding:16px 24px 24px;background:#fafafa;border-top:1px solid #e0e0e0;\">" +
    "<p style=\"margin:0;font-size:12px;color:#666;text-align:center;\">" +
    escapeHtml(footerNote) +
    "</p></td></tr></table></body></html>"
  );
}

/** @param {Record<string, string>} p */
function buildContactNotificationHtml(p) {
  const inner =
    row("Name", p.fullname) +
    row("Email", p.email) +
    "<tr><td style=\"padding:16px 0 8px;\"><span style=\"color:#ffc107;font-weight:600;font-size:13px;text-transform:uppercase;\">Message</span></td></tr>" +
    "<tr><td style=\"padding:0 0 12px;\"><div style=\"background:#f8f9fa;border:1px solid #e0e0e0;border-radius:10px;padding:16px;color:#333;font-size:15px;line-height:1.6;white-space:pre-wrap;\">" +
    escapeHtml(p.message) +
    "</div></td></tr>" +
    row("Submitted", p.timestamp || "") +
    row("Page", p.website || "") +
    row("User agent", (p.user_agent || "").slice(0, 500));
  return wrapEmail(
    p.subject || "New Contact Form Submission",
    "#ffc107 0%,#ff9800 100%",
    inner,
    "Portfolio contact notification — Ruben Jimenez"
  );
}

/** @param {Record<string, string>} p */
function buildHireMeNotificationHtml(p) {
  const inner =
    row("Name", p.fullname) +
    row("Email", p.email) +
    (p.project_type ? row("Project type", p.project_type) : "") +
    (p.budget ? row("Budget", p.budget) : "") +
    "<tr><td style=\"padding:16px 0 8px;\"><span style=\"color:#e65100;font-weight:600;font-size:13px;text-transform:uppercase;\">Message</span></td></tr>" +
    "<tr><td style=\"padding:0 0 12px;\"><div style=\"background:#fff8e8;border:1px solid #e0e0e0;border-radius:10px;padding:16px;color:#333;font-size:15px;line-height:1.6;white-space:pre-wrap;\">" +
    escapeHtml(p.message) +
    "</div></td></tr>" +
    row("Submitted", p.timestamp || "") +
    row("Page", p.website || "") +
    row("User agent", (p.user_agent || "").slice(0, 500));
  return wrapEmail(
    p.subject || "New Hire Me Inquiry",
    "#ffb300 0%,#f57c00 100%",
    inner,
    "Portfolio Hire Me inquiry — Ruben Jimenez"
  );
}

/** @param {Record<string, string>} p */
function buildAdminReplyHtml(p) {
  const inner =
    row("To", (p.to_name || "Customer") + " <" + p.to_email + ">") +
    row("From", p.from_name || "Ruben Jimenez") +
    "<tr><td style=\"padding:16px 0 8px;\"><span style=\"color:#ffc107;font-weight:600;font-size:13px;text-transform:uppercase;\">" +
    "Message</span></td></tr>" +
    "<tr><td style=\"padding:0 0 12px;\"><div style=\"background:#f8f9fa;border:1px solid #e0e0e0;border-radius:10px;padding:16px;color:#333;font-size:15px;line-height:1.6;white-space:pre-wrap;\">" +
    escapeHtml(p.message) +
    "</div></td></tr>" +
    row("Sent", p.timestamp || "");
  return wrapEmail(
    p.subject || "Message from Ruben",
    "#ffc107 0%,#ff9800 100%",
    inner,
    "Reply from your conversation with Ruben Jimenez"
  );
}

module.exports = {
  escapeHtml,
  buildContactNotificationHtml,
  buildHireMeNotificationHtml,
  buildAdminReplyHtml,
};
