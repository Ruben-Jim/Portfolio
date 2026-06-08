"use strict";

/**
 * HTML email bodies — colors and structure match templates/emails/*.html (portfolio reference).
 * Table layout + inline styles (light default) + <head> CSS for prefers-color-scheme: dark.
 */

/** Light palette (default inline styles) */
const T = {
  bodyBg: "#f5f5f5",
  cardBg: "#ffffff",
  cardBorder: "#e0e0e0",
  cardRadius: "20px",
  cardShadow: "0 16px 40px rgba(0, 0, 0, 0.08)",
  subtitle: "#666666",
  infoValue: "#333333",
  messageInnerBg: "#f8f9fa",
  messageInnerBorder: "#e0e0e0",
  technicalBg: "#f8f9fa",
  techLabel: "#888888",
  techValue: "#333333",
  footerBg: "#f8f9fa",
  footerText: "#666666",
  footerBorder: "#e0e0e0",
  /** Contact (gold) — template-contact */
  contact: {
    headerOuter: "linear-gradient(135deg, #ffc107 0%, #ff9800 100%)",
    headerInner: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
    title: "#ffc107",
    panelBg:
      "linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 152, 0, 0.05) 100%)",
    label: "#ffc107",
    link: "#ffc107",
  },
  /** Hire — template-hire-me */
  hire: {
    headerOuter: "linear-gradient(135deg, #ffb300 0%, #f57c00 100%)",
    headerInner: "linear-gradient(135deg, #fffdf8 0%, #fff8e8 100%)",
    title: "#e65100",
    contactPanelBg:
      "linear-gradient(135deg, rgba(255, 179, 0, 0.12) 0%, rgba(245, 124, 0, 0.06) 100%)",
    messagePanelBg:
      "linear-gradient(135deg, rgba(255, 179, 0, 0.1) 0%, rgba(245, 124, 0, 0.05) 100%)",
    label: "#e65100",
    link: "#e65100",
  },
  dark: {
    bodyBg: "#0f0f0f",
    cardBg: "#1a1a1a",
    cardBorder: "#3a3a3a",
    cardShadow: "0 16px 40px rgba(0, 0, 0, 0.45)",
    subtitle: "#a8a8a8",
    infoValue: "#e8e8e8",
    messageInnerBg: "#252525",
    messageInnerBorder: "#404040",
    technicalBg: "#222222",
    techLabel: "#9a9a9a",
    techValue: "#d8d8d8",
    footerBg: "#141414",
    footerText: "#9a9a9a",
    footerBorder: "#333333",
    contact: {
      headerInner: "linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%)",
      panelBg:
        "linear-gradient(135deg, rgba(255, 193, 7, 0.14) 0%, rgba(255, 152, 0, 0.08) 100%)",
    },
    hire: {
      headerInner: "linear-gradient(135deg, #2a2618 0%, #1f1c14 100%)",
      contactPanelBg:
        "linear-gradient(135deg, rgba(255, 179, 0, 0.16) 0%, rgba(245, 124, 0, 0.1) 100%)",
      messagePanelBg:
        "linear-gradient(135deg, rgba(255, 179, 0, 0.14) 0%, rgba(245, 124, 0, 0.08) 100%)",
    },
  },
};

function emailHeadStyles() {
  const d = T.dark;
  return (
    '<meta name="color-scheme" content="light dark">' +
    '<meta name="supported-color-schemes" content="light dark">' +
    "<style>" +
    ":root{color-scheme:light dark;}" +
    "body,.email-body-outer{background-color:" +
    T.bodyBg +
    "!important;}" +
    ".email-card{background:" +
    T.cardBg +
    "!important;border-color:" +
    T.cardBorder +
    "!important;}" +
    ".email-info-value{color:" +
    T.infoValue +
    "!important;}" +
    ".email-subtitle-text{color:" +
    T.subtitle +
    "!important;}" +
    ".email-message-inner{color:" +
    T.infoValue +
    "!important;background:" +
    T.messageInnerBg +
    "!important;border-color:" +
    T.messageInnerBorder +
    "!important;}" +
    ".email-panel--technical{background:" +
    T.technicalBg +
    "!important;}" +
    ".email-tech-label{color:" +
    T.techLabel +
    "!important;}" +
    ".email-tech-value{color:" +
    T.techValue +
    "!important;}" +
    ".email-footer{background:" +
    T.footerBg +
    "!important;border-top-color:" +
    T.footerBorder +
    "!important;}" +
    ".email-footer-text{color:" +
    T.footerText +
    "!important;}" +
    ".email-panel--contact{background:" +
    T.contact.panelBg +
    "!important;}" +
    ".email-panel--hire-contact{background:" +
    T.hire.contactPanelBg +
    "!important;}" +
    ".email-panel--hire-message{background:" +
    T.hire.messagePanelBg +
    "!important;}" +
    ".email-panel{border-color:" +
    T.cardBorder +
    "!important;}" +
    "@media (prefers-color-scheme:dark){" +
    "body,.email-body-outer{background-color:" +
    d.bodyBg +
    "!important;}" +
    ".email-card{background:" +
    d.cardBg +
    "!important;border-color:" +
    d.cardBorder +
    "!important;box-shadow:" +
    d.cardShadow +
    "!important;}" +
    ".email-header-inner--contact{background:" +
    d.contact.headerInner +
    "!important;}" +
    ".email-header-inner--hire{background:" +
    d.hire.headerInner +
    "!important;}" +
    ".email-info-value{color:" +
    d.infoValue +
    "!important;}" +
    ".email-subtitle-text{color:" +
    d.subtitle +
    "!important;}" +
    ".email-message-inner{color:" +
    d.infoValue +
    "!important;background:" +
    d.messageInnerBg +
    "!important;border-color:" +
    d.messageInnerBorder +
    "!important;}" +
    ".email-panel--technical{background:" +
    d.technicalBg +
    "!important;}" +
    ".email-tech-label{color:" +
    d.techLabel +
    "!important;}" +
    ".email-tech-value{color:" +
    d.techValue +
    "!important;}" +
    ".email-footer{background:" +
    d.footerBg +
    "!important;border-top-color:" +
    d.footerBorder +
    "!important;}" +
    ".email-footer-text{color:" +
    d.footerText +
    "!important;}" +
    ".email-panel--contact{background:" +
    d.contact.panelBg +
    "!important;}" +
    ".email-panel--hire-contact{background:" +
    d.hire.contactPanelBg +
    "!important;}" +
    ".email-panel--hire-message{background:" +
    d.hire.messagePanelBg +
    "!important;}" +
    ".email-panel{border-color:" +
    d.cardBorder +
    "!important;}" +
    "}" +
    "</style>"
  );
}

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** @param {{ label: string; link: string }} accent */
function formatValueHtml(raw, accent) {
  const linkColor = accent.link;
  const s = String(raw == null ? "" : raw);
  const trimmed = s.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return (
      '<a href="mailto:' +
      escapeHtml(trimmed) +
      '" style="color:' +
      linkColor +
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
      linkColor +
      ';text-decoration:underline;font-weight:500;">' +
      escapeHtml(trimmed) +
      "</a>"
    );
  }
  return escapeHtml(s);
}

/**
 * @param {"contact" | "hire"} variant
 * @param {string} label
 * @param {string} valueHtmlOrRaw
 */
function infoRow(variant, label, valueHtmlOrRaw) {
  const accent = variant === "hire" ? T.hire : T.contact;
  const inner =
    typeof valueHtmlOrRaw === "string" && valueHtmlOrRaw.includes("<a ")
      ? valueHtmlOrRaw
      : formatValueHtml(valueHtmlOrRaw, accent);
  return (
    '<tr><td style="padding:0 0 15px 0;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>' +
    '<td style="vertical-align:top;width:90px;">' +
    '<span style="color:' +
    accent.label +
    ';font-weight:600;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;">' +
    escapeHtml(label) +
    "</span></td>" +
    '<td style="vertical-align:top;padding-left:15px;">' +
    '<span class="email-info-value" style="color:' +
    T.infoValue +
    ';font-size:16px;font-weight:500;line-height:1.6;word-break:break-word;">' +
    inner +
    "</span></td></tr></table></td></tr>"
  );
}

function techRow(label, valueHtmlOrRaw, variant) {
  const accent = variant === "hire" ? T.hire : T.contact;
  const inner =
    typeof valueHtmlOrRaw === "string" && valueHtmlOrRaw.includes("<a ")
      ? valueHtmlOrRaw
      : formatValueHtml(valueHtmlOrRaw, accent);
  return (
    '<tr><td style="padding:0 0 8px;font-size:12px;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>' +
    '<td class="email-tech-label" style="vertical-align:top;color:' +
    T.techLabel +
    ';min-width:100px;font-weight:500;width:100px;">' +
    escapeHtml(label) +
    "</td>" +
    '<td class="email-tech-value" style="vertical-align:top;color:' +
    T.techValue +
    ';word-break:break-all;font-weight:400;">' +
    inner +
    "</td></tr></table></td></tr>"
  );
}

/**
 * @param {string} rowsInner - table rows only
 * @param {string} background
 * @param {string} [extraTdStyle]
 */
function wrapPanel(rowsInner, background, extraTdStyle, panelClass) {
  const extra = extraTdStyle ? ";" + extraTdStyle : "";
  const cls = panelClass ? ' class="email-panel ' + panelClass + '"' : ' class="email-panel"';
  return (
    '<tr><td style="padding:0 0 30px 0;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" role="presentation"' +
    cls +
    ' style="background:' +
    background +
    ";border:1px solid " +
    T.cardBorder +
    ";border-radius:12px;" +
    '">' +
    '<tr><td style="padding:25px' +
    extra +
    '">' +
    '<table width="100%" cellpadding="0" cellspacing="0">' +
    rowsInner +
    "</table></td></tr></table></td></tr>"
  );
}

/**
 * @param {"contact" | "hire"} variant
 */
function technicalBlock(variant, rowsInner) {
  const accent = variant === "hire" ? T.hire : T.contact;
  const heading =
    '<tr><td style="padding:0 0 15px 0;">' +
    '<h4 style="margin:0;color:' +
    accent.label +
    ";font-size:14px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;\">" +
    "Technical Details</h4></td></tr>";
  return wrapPanel(heading + rowsInner, T.technicalBg, "", "email-panel--technical");
}

/**
 * @param {"contact" | "hire"} variant
 * @param {string} messageLabel - "Message" or "Full details"
 */
function messageBlock(messageText, variant, messageLabel) {
  const accent = variant === "hire" ? T.hire : T.contact;
  const outerBg =
    variant === "hire" ? T.hire.messagePanelBg : T.contact.panelBg;
  const panelClass =
    variant === "hire" ? "email-panel--hire-message" : "email-panel--contact";
  const inner = escapeHtml(messageText);
  return (
    '<tr><td style="padding:0 0 30px 0;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" class="email-panel ' +
    panelClass +
    '" style="background:' +
    outerBg +
    ";border:1px solid " +
    T.cardBorder +
    ";border-radius:12px;" +
    '">' +
    '<tr><td style="padding:25px;">' +
    '<span style="display:block;color:' +
    accent.label +
    ';font-weight:600;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:15px;">' +
    escapeHtml(messageLabel) +
    "</span>" +
    '<div class="email-message-inner" style="color:' +
    T.infoValue +
    ";font-size:16px;line-height:1.7;white-space:pre-wrap;background:" +
    T.messageInnerBg +
    ";padding:20px;border-radius:8px;border:1px solid " +
    T.messageInnerBorder +
    ';font-weight:400;">' +
    inner +
    "</div></td></tr></table></td></tr>"
  );
}

/**
 * @param {"contact" | "hire"} variant
 */
function emailHeader(variant, title) {
  const h = variant === "hire" ? T.hire : T.contact;
  const innerClass =
    variant === "hire" ? "email-header-inner--hire" : "email-header-inner--contact";
  return (
    '<tr><td style="padding:0;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" role="presentation">' +
    '<tr><td style="padding:1px;background:' +
    h.headerOuter +
    ';border-radius:' +
    T.cardRadius +
    " " +
    T.cardRadius +
    ' 0 0;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" role="presentation">' +
    '<tr><td class="' +
    innerClass +
    '" style="padding:30px;text-align:center;background:' +
    h.headerInner +
    ';">' +
    '<h1 style="margin:0 0 10px 0;font-size:24px;font-weight:600;color:' +
    h.title +
    ';text-transform:uppercase;letter-spacing:1px;line-height:1.3;">' +
    escapeHtml(title) +
    "</h1></td></tr></table></td></tr></table></td></tr>"
  );
}

/**
 * @param {"contact" | "hire"} variant
 * @param {string} innerRows
 * @param {string} footerNote
 */
function wrapEmail(variant, title, innerRows, footerNote) {
  return (
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
    emailHeadStyles() +
    "<title>" +
    escapeHtml(title) +
    "</title></head>" +
    '<body class="email-body-outer" style="margin:0;padding:0;font-family:Poppins,-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;background-color:' +
    T.bodyBg +
    ';color:' +
    T.infoValue +
    ';line-height:1.6;-webkit-font-smoothing:antialiased;">' +
    '<table class="email-body-outer" role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="' +
    T.bodyBg +
    '" style="padding:28px 16px;background-color:' +
    T.bodyBg +
    ';">' +
    '<tr><td align="center">' +
    '<table class="email-card" role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="' +
    T.cardBg +
    '" style="max-width:600px;background:' +
    T.cardBg +
    ";border:1px solid " +
    T.cardBorder +
    ";border-radius:" +
    T.cardRadius +
    ";overflow:hidden;box-shadow:" +
    T.cardShadow +
    ';">' +
    emailHeader(variant, title) +
    '<tr><td style="padding:40px 30px;">' +
    '<table width="100%" cellpadding="0" cellspacing="0">' +
    innerRows +
    "</table></td></tr>" +
    '<tr><td class="email-footer" style="padding:20px 30px;text-align:center;background:' +
    T.footerBg +
    ";border-top:1px solid " +
    T.footerBorder +
    ';">' +
    '<p class="email-footer-text" style="margin:0;font-size:12px;color:' +
    T.footerText +
    ';font-weight:400;line-height:1.5;">' +
    escapeHtml(footerNote) +
    "</p></td></tr></table></td></tr></table></body></html>"
  );
}

/** @param {Record<string, string>} p */
function buildContactNotificationHtml(p) {
  const innerContact =
    wrapPanel(
      infoRow("contact", "Name", p.fullname) +
        infoRow("contact", "Email", p.email) +
        infoRow("contact", "Date", p.timestamp || ""),
      T.contact.panelBg,
      "",
      "email-panel--contact"
    ) +
    messageBlock(p.message, "contact", "Message") +
    technicalBlock(
      "contact",
      techRow("Website", p.website || "", "contact") +
        techRow("User agent", (p.user_agent || "").slice(0, 500), "contact")
    );
  return wrapEmail(
    "contact",
    p.subject || "New Contact Form Submission",
    innerContact,
    "Portfolio contact notification — Ruben Jimenez"
  );
}

/** @param {Record<string, string>} p */
function buildHireMeNotificationHtml(p) {
  let contactRows =
    infoRow("hire", "Name", p.fullname) +
    infoRow("hire", "Email", p.email) +
    infoRow("hire", "Date", p.timestamp || "");
  if (p.project_type)
    contactRows += infoRow("hire", "Project", p.project_type);
  if (p.budget) contactRows += infoRow("hire", "Budget", p.budget);
  const innerHire =
    wrapPanel(contactRows, T.hire.contactPanelBg, "", "email-panel--hire-contact") +
    messageBlock(p.message, "hire", "Message") +
    technicalBlock(
      "hire",
      techRow("Website", p.website || "", "hire") +
        techRow("User agent", (p.user_agent || "").slice(0, 500), "hire")
    );
  return wrapEmail(
    "hire",
    p.subject || "New Hire Me Inquiry",
    innerHire,
    "Portfolio Hire Me inquiry — Ruben Jimenez"
  );
}

/** Outbound invite: customer receives link to leave a testimonial. */
function buildTestimonialRequestHtml(p) {
  const accent = T.contact;
  const name = escapeHtml(p.to_name || "there");
  const product = escapeHtml(p.product || "my software");
  const url = escapeHtml(p.testimonial_url || "");
  const inner =
    '<tr><td style="padding:0 0 20px 0;">' +
    '<p class="email-info-value" style="margin:0;color:' +
    T.infoValue +
    ';font-size:16px;line-height:1.7;font-weight:400;">' +
    "Hi " +
    name +
    ",</p></td></tr>" +
    '<tr><td style="padding:0 0 20px 0;">' +
    '<p class="email-info-value" style="margin:0;color:' +
    T.infoValue +
    ';font-size:16px;line-height:1.7;font-weight:400;">' +
    "Ruben would love a short testimonial about <strong style=\"color:" +
    accent.label +
    ';\">' +
    product +
    "</strong>. It only takes a minute — your words help others decide if the product is a good fit.</p></td></tr>" +
    '<tr><td style="padding:0 0 30px 0;text-align:center;">' +
    '<a href="' +
    url +
    '" style="display:inline-block;padding:14px 28px;background:' +
    accent.headerOuter +
    ";color:#1a1a1a;font-weight:600;font-size:16px;text-decoration:none;border-radius:10px;letter-spacing:0.3px;\">" +
    "Share your testimonial</a></td></tr>" +
    '<tr><td style="padding:0 0 12px 0;">' +
    '<p class="email-subtitle-text" style="margin:0;color:' +
    T.subtitle +
    ';font-size:13px;line-height:1.6;">' +
    "If the button doesn’t work, copy and paste this link into your browser:</p></td></tr>" +
    '<tr><td style="padding:0 0 30px 0;word-break:break-all;">' +
    '<a href="' +
    url +
    '" style="color:' +
    accent.link +
    ';font-size:13px;">' +
    url +
    "</a></td></tr>" +
    wrapPanel(
      '<tr><td style="padding:0 0 15px 0;">' +
      '<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>' +
      '<td style="vertical-align:top;width:90px;">' +
      '<span style="color:' +
      accent.label +
      ';font-weight:600;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;">' +
      "Product</span></td>" +
      '<td style="vertical-align:top;padding-left:15px;">' +
      '<span class="email-info-value" style="color:' +
      T.infoValue +
      ';font-size:16px;font-weight:500;line-height:1.6;word-break:break-word;">' +
      product +
      "</span></td></tr></table></td></tr>",
      T.contact.panelBg,
      "",
      "email-panel--contact"
    );
  return wrapEmail(
    "contact",
    p.subject || "You’re invited to share a testimonial",
    inner,
    "Testimonial request — Ruben Jimenez"
  );
}

const ADMIN_REPLY_LOGO = "https://rubenjimenez.dev/assets/images/logo/logo.jpg";
const ADMIN_REPLY_SITE = "https://rubenjimenez.dev";

/** Client email — modern light palette overrides */
const ADMIN_REPLY = {
  bodyBg: "#fffdf8",
  cardShadow: "0 4px 24px rgba(0, 0, 0, 0.06)",
  link: "#c9920a",
  buttonBg: "#e6a800",
  buttonText: "#1a1a1a",
  footerText: "#888888",
};

function adminReplyHeadStyles() {
  const d = T.dark;
  return (
    "<style>" +
    ".email-admin-reply-card{box-shadow:" +
    ADMIN_REPLY.cardShadow +
    "!important;}" +
    ".email-admin-reply-body{color:" +
    T.infoValue +
    "!important;}" +
    ".email-admin-reply-subject{color:" +
    T.subtitle +
    "!important;}" +
    ".email-admin-reply-footer-text{color:" +
    ADMIN_REPLY.footerText +
    "!important;}" +
    "@media (prefers-color-scheme:dark){" +
    ".email-admin-reply-outer,.email-admin-reply-outer>tbody>tr>td{background-color:" +
    d.bodyBg +
    "!important;}" +
    ".email-admin-reply-card{background:" +
    d.cardBg +
    "!important;border-color:" +
    d.cardBorder +
    "!important;}" +
    ".email-admin-reply-body{color:" +
    d.infoValue +
    "!important;}" +
    ".email-admin-reply-subject{color:" +
    d.subtitle +
    "!important;}" +
    ".email-admin-reply-footer{background:" +
    d.footerBg +
    "!important;border-top-color:" +
    d.footerBorder +
    "!important;}" +
    ".email-admin-reply-footer-text{color:" +
    d.footerText +
    "!important;}" +
    "}" +
    "</style>"
  );
}

/** @param {string} fromName @param {string} subject */
function adminReplyHeader(fromName, subject) {
  const subjectRow = subject
    ? '<p class="email-admin-reply-subject" style="margin:6px 0 0;font-size:14px;font-weight:500;color:' +
      T.subtitle +
      ';line-height:1.4;">' +
      escapeHtml(subject) +
      "</p>"
    : "";
  return (
    '<tr><td style="padding:0 0 28px 0;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>' +
    '<td width="56" style="width:56px;vertical-align:top;padding-top:2px;">' +
    '<img src="' +
    escapeHtml(ADMIN_REPLY_LOGO) +
    '" alt="CodeWithRuben" width="48" height="48" style="display:block;border-radius:50%;object-fit:cover;" />' +
    "</td>" +
    '<td style="vertical-align:top;padding-left:14px;text-align:left;">' +
    '<p style="margin:0;font-size:20px;font-weight:600;color:' +
    T.infoValue +
    ';line-height:1.3;">' +
    escapeHtml(fromName) +
    "</p>" +
    '<p class="email-subtitle-text" style="margin:2px 0 0;font-size:13px;color:' +
    T.subtitle +
    ';">CodeWithRuben</p>' +
    subjectRow +
    "</td></tr></table></td></tr>"
  );
}

/** @param {string} url */
function adminReplyCtaButton(url) {
  return (
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0 4px 0;">' +
    '<tr><td align="center">' +
    '<table role="presentation" cellpadding="0" cellspacing="0"><tr>' +
    '<td align="center" bgcolor="' +
    ADMIN_REPLY.buttonBg +
    '" style="background-color:' +
    ADMIN_REPLY.buttonBg +
    ';border-radius:10px;">' +
    '<a href="' +
    escapeHtml(url) +
    '" target="_blank" style="display:inline-block;padding:14px 28px;color:' +
    ADMIN_REPLY.buttonText +
    ';font-weight:600;font-size:15px;text-decoration:none;border-radius:10px;line-height:1.2;">' +
    "Open your portal &#8594;" +
    "</a></td></tr></table></td></tr></table>"
  );
}

/** @param {string} line */
function adminReplyLinkifyLine(line) {
  const s = String(line || "");
  const parts = [];
  let last = 0;
  const re = /https?:\/\/[^\s<]+[^\s<.,;:!?]/gi;
  let m;
  while ((m = re.exec(s)) !== null) {
    parts.push(escapeHtml(s.slice(last, m.index)));
    parts.push(
      '<a href="' +
        escapeHtml(m[0]) +
        '" style="color:' +
        ADMIN_REPLY.link +
        ';text-decoration:underline;font-weight:500;">' +
        escapeHtml(m[0]) +
        "</a>"
    );
    last = m.index + m[0].length;
  }
  parts.push(escapeHtml(s.slice(last)));
  return parts.join("");
}

/** @param {string} messageText */
function buildAdminReplyMessageHtml(messageText) {
  const lines = String(messageText || "").split(/\r?\n/);
  const htmlParts = [];
  const ctaUrls = [];
  const seen = new Set();

  function addCta(url) {
    const u = String(url || "").trim();
    if (!u || seen.has(u) || !/^https?:\/\//i.test(u)) return;
    seen.add(u);
    ctaUrls.push(u);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const linkLine = line.match(/^Link:\s*(.+)$/i);
    if (linkLine) {
      const val = linkLine[1].trim();
      if (!/^\(add your portal/i.test(val)) addCta(val);
      continue;
    }
    const trimmed = line.trim();
    if (/^https?:\/\/\S+$/i.test(trimmed)) {
      addCta(trimmed);
      continue;
    }
    htmlParts.push(adminReplyLinkifyLine(line));
  }

  const bodyHtml = htmlParts.join("<br />");
  const buttons = ctaUrls.map(function (url) {
    return adminReplyCtaButton(url);
  }).join("");
  return bodyHtml + buttons;
}

/** @param {string} messageHtml */
function adminReplyMessageBlock(messageHtml) {
  return (
    '<tr><td style="padding:0;">' +
    '<div class="email-admin-reply-body" style="color:' +
    T.infoValue +
    ';font-size:16px;line-height:1.6;font-weight:400;">' +
    messageHtml +
    "</div></td></tr>"
  );
}

/** @param {string} raw — formatted in US Pacific (PST/PDT via America/Los_Angeles) */
function formatEmailTimestamp(raw) {
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  try {
    return d.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Los_Angeles",
      timeZoneName: "short",
    });
  } catch (e) {
    return d.toISOString();
  }
}

/**
 * Client-facing admin reply — modern layout, CTA buttons, warm palette.
 * @param {string} innerRows
 * @param {string} footerNoteHtml — already escaped or safe HTML snippet
 * @param {string} preheader
 */
function wrapAdminReplyEmail(innerRows, footerNoteHtml, preheader) {
  const pre =
    '<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;color:transparent;">' +
    escapeHtml(preheader) +
    "</div>";
  return (
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
    emailHeadStyles() +
    adminReplyHeadStyles() +
    "<title>Message from Ruben</title></head>" +
    '<body class="email-body-outer email-admin-reply-outer" style="margin:0;padding:0;font-family:Poppins,-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;background-color:' +
    ADMIN_REPLY.bodyBg +
    ';color:' +
    T.infoValue +
    ';line-height:1.6;-webkit-font-smoothing:antialiased;">' +
    pre +
    '<table class="email-body-outer email-admin-reply-outer" role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="' +
    ADMIN_REPLY.bodyBg +
    '" style="padding:28px 16px;background-color:' +
    ADMIN_REPLY.bodyBg +
    ';">' +
    '<tr><td align="center">' +
    '<table class="email-card email-admin-reply-card" role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="' +
    T.cardBg +
    '" style="max-width:600px;background:' +
    T.cardBg +
    ";border:1px solid " +
    T.cardBorder +
    ";border-radius:" +
    T.cardRadius +
    ";overflow:hidden;box-shadow:" +
    ADMIN_REPLY.cardShadow +
    ';">' +
    '<tr><td style="height:4px;background:' +
    T.contact.headerOuter +
    ';font-size:0;line-height:0;">&nbsp;</td></tr>' +
    '<tr><td style="padding:36px 30px 28px 30px;">' +
    '<table width="100%" cellpadding="0" cellspacing="0">' +
    innerRows +
    "</table></td></tr>" +
    '<tr><td class="email-footer email-admin-reply-footer" style="padding:20px 30px;text-align:center;background:' +
    T.footerBg +
    ";border-top:1px solid " +
    T.footerBorder +
    ';">' +
    '<p class="email-footer-text email-admin-reply-footer-text" style="margin:0;font-size:13px;color:' +
    ADMIN_REPLY.footerText +
    ';font-weight:400;line-height:1.5;">' +
    footerNoteHtml +
    "</p></td></tr></table></td></tr></table></body></html>"
  );
}

/** @param {Record<string, string>} p */
function buildAdminReplyHtml(p) {
  const fromName = p.from_name || "Ruben Jimenez";
  const subject = String(p.subject || "Message from Ruben").trim();
  const message = String(p.message || "");
  const preheader =
    message
      .split(/\r?\n/)
      .map(function (line) {
        return line.trim();
      })
      .find(Boolean) || subject;
  const footerNoteHtml =
    '<a href="' +
    escapeHtml(ADMIN_REPLY_SITE) +
    '" style="color:' +
    ADMIN_REPLY.footerText +
    ';text-decoration:none;font-weight:500;">rubenjimenez.dev</a>' +
    ' <span style="color:' +
    ADMIN_REPLY.footerText +
    ';">&middot; Reply directly to this email</span>';
  const inner =
    adminReplyHeader(fromName, subject) +
    adminReplyMessageBlock(buildAdminReplyMessageHtml(message));
  return wrapAdminReplyEmail(inner, footerNoteHtml, preheader.slice(0, 140));
}

module.exports = {
  escapeHtml,
  buildContactNotificationHtml,
  buildHireMeNotificationHtml,
  buildTestimonialRequestHtml,
  buildAdminReplyHtml,
};
