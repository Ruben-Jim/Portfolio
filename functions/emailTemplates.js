"use strict";

/**
 * HTML email bodies — dark theme aligned with portfolio CSS (eerie-black, jet, gold accents).
 * Table layout + inline styles for email clients.
 */

/** Dark palette (approximates :root dark theme in assets/css/style.css) */
const DM = {
  bgPage: "#0d0d0f",
  bgCard: "#161618",
  bgFooter: "#101012",
  bgMessage: "rgba(0,0,0,0.42)",
  bgMessageHire: "rgba(255, 152, 0, 0.07)",
  border: "rgba(255,255,255,0.1)",
  borderRow: "rgba(255,255,255,0.07)",
  textTitle: "#ffc107",
  textBody: "#fafafa",
  textMuted: "#a1a1aa",
  accentLabel: "hsl(45, 100%, 72%)",
  accentLabelHire: "#ffb74d",
  messageBorderLeft: "#ffc107",
  messageBorderLeftHire: "#ff9800",
  shadow: "0 16px 40px rgba(0,0,0,0.45)",
};

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Format plain email / URL as clickable mailto or https link when applicable */
function formatValueHtml(raw) {
  const s = String(raw == null ? "" : raw);
  const trimmed = s.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return (
      '<a href="mailto:' +
      escapeHtml(trimmed) +
      '" style="color:' +
      DM.accentLabel +
      ';text-decoration:none;font-weight:500;">' +
      escapeHtml(trimmed) +
      "</a>"
    );
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return (
      '<a href="' +
      escapeHtml(trimmed) +
      '" style="color:' +
      DM.accentLabel +
      ';text-decoration:underline;font-weight:500;">' +
      escapeHtml(trimmed) +
      "</a>"
    );
  }
  return escapeHtml(s);
}

function row(label, valueHtmlOrRaw, labelColor) {
  const lc = labelColor || DM.accentLabel;
  const inner =
    typeof valueHtmlOrRaw === "string" && valueHtmlOrRaw.includes("<a ")
      ? valueHtmlOrRaw
      : formatValueHtml(valueHtmlOrRaw);
  return (
    '<tr><td style="padding:12px 0;border-bottom:1px solid ' +
    DM.borderRow +
    ';">' +
    '<span style="color:' +
    lc +
    ';font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.04em;">' +
    escapeHtml(label) +
    "</span><br/>" +
    '<span style="color:' +
    DM.textBody +
    ';font-size:15px;font-weight:400;line-height:1.55;">' +
    inner +
    "</span></td></tr>"
  );
}

/**
 * @param {string} title
 * @param {string} headerBgCss - full CSS background for header strip (gradient)
 * @param {string} innerRows - HTML table rows
 * @param {string} footerNote
 */
function wrapEmail(title, headerBgCss, innerRows, footerNote) {
  return (
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="color-scheme" content="dark">' +
    '<meta name="supported-color-schemes" content="dark"><title>' +
    escapeHtml(title) +
    "</title></head>" +
    '<body style="margin:0;padding:28px 16px;background:' +
    DM.bgPage +
    ';font-family:Poppins,-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:' +
    DM.bgCard +
    ";border-radius:16px;overflow:hidden;border:1px solid " +
    DM.border +
    ";box-shadow:" +
    DM.shadow +
    ';">' +
    '<tr><td style="padding:26px 22px;text-align:center;background:' +
    headerBgCss +
    ';border-bottom:1px solid ' +
    DM.border +
    ';">' +
    '<h1 style="margin:0;font-size:21px;font-weight:600;color:' +
    DM.textTitle +
    ';letter-spacing:0.03em;line-height:1.3;">' +
    escapeHtml(title) +
    "</h1></td></tr>" +
    '<tr><td style="padding:24px 22px 20px;background:' +
    DM.bgCard +
    ';"><table width="100%" cellpadding="0" cellspacing="0">' +
    innerRows +
    "</table></td></tr>" +
    '<tr><td style="padding:18px 22px 22px;background:' +
    DM.bgFooter +
    ";border-top:1px solid " +
    DM.border +
    ';">' +
    '<p style="margin:0;font-size:12px;color:' +
    DM.textMuted +
    ';text-align:center;line-height:1.5;">' +
    escapeHtml(footerNote) +
    "</p></td></tr></table></body></html>"
  );
}

function messageBlock(messageText, hireVariant) {
  const bg = hireVariant ? DM.bgMessageHire : DM.bgMessage;
  const left = hireVariant ? DM.messageBorderLeftHire : DM.messageBorderLeft;
  const labColor = hireVariant ? DM.accentLabelHire : DM.accentLabel;
  return (
    '<tr><td style="padding:14px 0 8px;"><span style="color:' +
    labColor +
    ';font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.04em;">Message</span></td></tr>' +
    '<tr><td style="padding:0 0 14px;"><div style="background:' +
    bg +
    ";border:1px solid " +
    DM.border +
    ";border-left:3px solid " +
    left +
    ';border-radius:10px;padding:16px 18px;color:' +
    DM.textBody +
    ';font-size:15px;line-height:1.65;white-space:pre-wrap;">' +
    escapeHtml(messageText) +
    "</div></td></tr>"
  );
}

/** @param {Record<string, string>} p */
function buildContactNotificationHtml(p) {
  const inner =
    row("Name", p.fullname) +
    row("Email", p.email) +
    messageBlock(p.message, false) +
    row("Submitted", p.timestamp || "") +
    row("Page", p.website || "") +
    row("User agent", (p.user_agent || "").slice(0, 500));
  const headerBg =
    "linear-gradient(135deg,#2a2618 0%,#141311 55%,#121214 100%)";
  return wrapEmail(
    p.subject || "New Contact Form Submission",
    headerBg,
    inner,
    "Portfolio contact notification — Ruben Jimenez"
  );
}

/** @param {Record<string, string>} p */
function buildHireMeNotificationHtml(p) {
  let inner =
    row("Name", p.fullname) +
    row("Email", p.email, DM.accentLabelHire);
  if (p.project_type) inner += row("Project type", p.project_type, DM.accentLabelHire);
  if (p.budget) inner += row("Budget", p.budget, DM.accentLabelHire);
  inner +=
    messageBlock(p.message, true) +
    row("Submitted", p.timestamp || "", DM.accentLabelHire) +
    row("Page", p.website || "", DM.accentLabelHire) +
    row("User agent", (p.user_agent || "").slice(0, 500), DM.accentLabelHire);
  const headerBg =
    "linear-gradient(135deg,#3d2818 0%,#1f1610 55%,#121210 100%)";
  return wrapEmail(
    p.subject || "New Hire Me Inquiry",
    headerBg,
    inner,
    "Portfolio Hire Me inquiry — Ruben Jimenez"
  );
}

/** @param {Record<string, string>} p */
function buildAdminReplyHtml(p) {
  const inner =
    row("To", (p.to_name || "Customer") + " <" + p.to_email + ">") +
    row("From", p.from_name || "Ruben Jimenez") +
    messageBlock(p.message, false) +
    row("Sent", p.timestamp || "");
  const headerBg =
    "linear-gradient(135deg,#2a2618 0%,#141311 55%,#121214 100%)";
  return wrapEmail(
    p.subject || "Message from Ruben",
    headerBg,
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
