"use strict";

/**
 * HTML email bodies — colors and structure match templates/emails/*.html (portfolio reference).
 * Table layout + inline styles for email clients.
 */

/** Exact palette from templates/emails/emailjs-template-contact.html & emailjs-template-hire-me.html */
const T = {
  bodyBg: "#f5f5f5",
  /** .email-container */
  cardBg: "linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)",
  cardBorder: "#e0e0e0",
  cardRadius: "20px",
  cardShadow: "0 16px 40px rgba(0, 0, 0, 0.1)",
  /** Shared */
  subtitle: "#666666",
  infoValue: "#333333",
  messageInnerBg: "#f8f9fa",
  messageInnerBorder: "#e0e0e0",
  technicalBg: "#f8f9fa",
  techLabel: "#b0b0b0",
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
    '<span style="color:' +
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
    '<td style="vertical-align:top;color:' +
    T.techLabel +
    ';min-width:100px;font-weight:500;width:100px;">' +
    escapeHtml(label) +
    "</td>" +
    '<td style="vertical-align:top;color:' +
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
function wrapPanel(rowsInner, background, extraTdStyle) {
  const extra = extraTdStyle ? ";" + extraTdStyle : "";
  return (
    '<tr><td style="padding:0 0 30px 0;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:' +
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
  return wrapPanel(heading + rowsInner, T.technicalBg, "");
}

/**
 * @param {"contact" | "hire"} variant
 * @param {string} messageLabel - "Message" or "Full details"
 */
function messageBlock(messageText, variant, messageLabel) {
  const accent = variant === "hire" ? T.hire : T.contact;
  const outerBg =
    variant === "hire" ? T.hire.messagePanelBg : T.contact.panelBg;
  const inner = escapeHtml(messageText);
  return (
    '<tr><td style="padding:0 0 30px 0;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:' +
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
    '<div style="color:' +
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
    '<tr><td style="padding:30px;text-align:center;background:' +
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
    '<meta name="color-scheme" content="light">' +
    "<title>" +
    escapeHtml(title) +
    "</title></head>" +
    '<body style="margin:0;padding:0;font-family:Poppins,-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;background-color:' +
    T.bodyBg +
    ';color:' +
    T.infoValue +
    ';line-height:1.6;-webkit-font-smoothing:antialiased;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:28px 16px;">' +
    '<tr><td align="center">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:' +
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
    '<tr><td style="padding:20px 30px;text-align:center;background:' +
    T.footerBg +
    ";border-top:1px solid " +
    T.footerBorder +
    ';">' +
    '<p style="margin:0;font-size:12px;color:' +
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
      ""
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
    wrapPanel(contactRows, T.hire.contactPanelBg, "") +
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
    '<p style="margin:0;color:' +
    T.infoValue +
    ';font-size:16px;line-height:1.7;font-weight:400;">' +
    "Hi " +
    name +
    ",</p></td></tr>" +
    '<tr><td style="padding:0 0 20px 0;">' +
    '<p style="margin:0;color:' +
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
    '<p style="margin:0;color:' +
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
      '<span style="color:#e8e8e8;font-size:16px;font-weight:500;line-height:1.6;word-break:break-word;">' +
      product +
      "</span></td></tr></table></td></tr>",
      T.contact.panelBg,
      ""
    );
  return wrapEmail(
    "contact",
    p.subject || "You’re invited to share a testimonial",
    inner,
    "Testimonial request — Ruben Jimenez"
  );
}

/** @param {Record<string, string>} p */
function buildAdminReplyHtml(p) {
  const inner =
    wrapPanel(
      infoRow("contact", "To", (p.to_name || "Customer") + " <" + p.to_email + ">") +
        infoRow("contact", "From", p.from_name || "Ruben Jimenez"),
      T.contact.panelBg,
      ""
    ) +
    messageBlock(p.message, "contact", "Message") +
    wrapPanel(
      infoRow("contact", "Sent", p.timestamp || ""),
      T.contact.panelBg,
      ""
    );
  return wrapEmail(
    "contact",
    p.subject || "Message from Ruben",
    inner,
    "Reply from your conversation with Ruben Jimenez"
  );
}

module.exports = {
  escapeHtml,
  buildContactNotificationHtml,
  buildHireMeNotificationHtml,
  buildTestimonialRequestHtml,
  buildAdminReplyHtml,
};
