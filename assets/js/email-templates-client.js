/**
 * Client-facing outbound email HTML (shared by Firebase functions + admin preview).
 * UMD: Node module.exports + browser global CwrClientEmailTemplates.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.CwrClientEmailTemplates = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var T = {
    bodyBg: "#f5f5f5",
    cardBg: "#ffffff",
    cardBorder: "#e0e0e0",
    cardRadius: "20px",
    subtitle: "#666666",
    infoValue: "#333333",
    footerBg: "#f8f9fa",
    footerBorder: "#e0e0e0",
    contact: {
      headerOuter: "linear-gradient(135deg, #ffc107 0%, #ff9800 100%)",
    },
    dark: {
      bodyBg: "#0f0f0f",
      cardBg: "#1a1a1a",
      cardBorder: "#3a3a3a",
      infoValue: "#e8e8e8",
      subtitle: "#a8a8a8",
      footerBg: "#141414",
      footerBorder: "#333333",
      footerText: "#9a9a9a",
    },
  };

  var ADMIN_REPLY_LOGO = "https://rubenjimenez.dev/assets/images/logo/logo.jpg";
  var ADMIN_REPLY_SITE = "https://rubenjimenez.dev";

  var ADMIN_REPLY = {
    bodyBg: "#fffdf8",
    cardShadow: "0 4px 24px rgba(0, 0, 0, 0.06)",
    link: "#c9920a",
    buttonBg: "#e6a800",
    buttonText: "#1a1a1a",
    footerText: "#888888",
    fieldsBg: "#f8f9fa",
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

  function clientEmailHeadStyles() {
    var d = T.dark;
    return (
      '<meta name="color-scheme" content="light dark">' +
      '<meta name="supported-color-schemes" content="light dark">' +
      "<style>" +
      ":root{color-scheme:light dark;}" +
      ".email-admin-reply-card{box-shadow:" +
      ADMIN_REPLY.cardShadow +
      "!important;}" +
      ".email-admin-reply-body{color:" +
      T.infoValue +
      "!important;}" +
      ".email-subtitle-text{color:" +
      T.subtitle +
      "!important;}" +
      ".email-admin-reply-footer-text{color:" +
      ADMIN_REPLY.footerText +
      "!important;}" +
      ".email-admin-notify-fields{background:" +
      ADMIN_REPLY.fieldsBg +
      "!important;}" +
      ".email-admin-notify-message-box{background:" +
      ADMIN_REPLY.fieldsBg +
      "!important;color:" +
      T.infoValue +
      "!important;border-color:" +
      T.cardBorder +
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
      ".email-subtitle-text{color:" +
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
      ".email-admin-notify-fields{background:" +
      d.footerBg +
      "!important;border-color:" +
      d.cardBorder +
      "!important;}" +
      ".email-admin-notify-message-box{background:" +
      d.footerBg +
      "!important;color:" +
      d.infoValue +
      "!important;border-color:" +
      d.cardBorder +
      "!important;}" +
      "}" +
      "</style>"
    );
  }

  function clientEmailHeader(fromName) {
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
      "</td></tr></table></td></tr>"
    );
  }

  function clientCtaButton(url, label) {
    var btnLabel = label || "Open your portal &#8594;";
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
      btnLabel +
      "</a></td></tr></table></td></tr></table>"
    );
  }

  function clientLinkFallback(url) {
    return (
      '<p class="email-subtitle-text" style="margin:16px 0 8px;font-size:13px;color:' +
      T.subtitle +
      ';line-height:1.6;">If the button doesn\u2019t work, copy and paste this link into your browser:</p>' +
      '<p style="margin:0 0 4px;word-break:break-all;font-size:13px;line-height:1.5;">' +
      '<a href="' +
      escapeHtml(url) +
      '" style="color:' +
      ADMIN_REPLY.link +
      ';text-decoration:underline;font-weight:500;">' +
      escapeHtml(url) +
      "</a></p>"
    );
  }

  function linkifyLine(line) {
    var s = String(line || "");
    var parts = [];
    var last = 0;
    var re = /https?:\/\/[^\s<]+[^\s<.,;:!?]/gi;
    var m;
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

  function buildMessageBodyHtml(messageText, options) {
    options = options || {};
    var defaultCtaLabel = options.defaultCtaLabel || "Open your portal &#8594;";
    var lines = String(messageText || "").split(/\r?\n/);
    var htmlParts = [];
    var ctaUrls = [];
    var seen = new Set();

    function addCta(url) {
      var u = String(url || "").trim();
      if (!u || seen.has(u) || !/^https?:\/\//i.test(u)) return;
      seen.add(u);
      ctaUrls.push(u);
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var linkLine = line.match(/^Link:\s*(.+)$/i);
      if (linkLine) {
        var val = linkLine[1].trim();
        if (!/^\(add your portal/i.test(val)) addCta(val);
        continue;
      }
      var trimmed = line.trim();
      if (/^https?:\/\/\S+$/i.test(trimmed)) {
        addCta(trimmed);
        continue;
      }
      htmlParts.push(linkifyLine(line));
    }

    var bodyHtml = htmlParts.join("<br />");
    var buttons = ctaUrls
      .map(function (url) {
        return clientCtaButton(url, defaultCtaLabel);
      })
      .join("");
    return bodyHtml + buttons;
  }

  function clientMessageBlock(messageHtml) {
    return (
      '<tr><td style="padding:0;">' +
      '<div class="email-admin-reply-body" style="color:' +
      T.infoValue +
      ';font-size:16px;line-height:1.6;font-weight:400;">' +
      messageHtml +
      "</div></td></tr>"
    );
  }

  function clientFooterHtml() {
    return (
      '<a href="' +
      escapeHtml(ADMIN_REPLY_SITE) +
      '" style="color:' +
      ADMIN_REPLY.footerText +
      ';text-decoration:none;font-weight:500;">rubenjimenez.dev</a>' +
      ' <span style="color:' +
      ADMIN_REPLY.footerText +
      ';">&middot; Reply directly to this email</span>'
    );
  }

  function wrapClientEmail(innerRows, footerNoteHtml, preheader, pageTitle) {
    var pre =
      '<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;color:transparent;">' +
      escapeHtml(preheader) +
      "</div>";
    return (
      '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
      clientEmailHeadStyles() +
      "<title>" +
      escapeHtml(pageTitle || "Message from Ruben") +
      "</title></head>" +
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

  function firstLinePreheader(message, subject) {
    var fromMsg = String(message || "")
      .split(/\r?\n/)
      .map(function (line) {
        return line.trim();
      })
      .find(Boolean);
    return (fromMsg || subject || "Message from Ruben").slice(0, 140);
  }

  function adminNotificationHeader(title, subtitle) {
    return (
      '<tr><td style="padding:0 0 20px 0;">' +
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
      escapeHtml(title) +
      "</p>" +
      '<p class="email-subtitle-text" style="margin:2px 0 0;font-size:13px;color:' +
      T.subtitle +
      ';">' +
      escapeHtml(subtitle) +
      "</p>" +
      "</td></tr></table></td></tr>"
    );
  }

  function adminNotificationPill(text) {
    return (
      '<tr><td style="padding:0 0 16px 0;">' +
      '<span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600;color:' +
      ADMIN_REPLY.link +
      ";background:hsla(45,68%,56%,0.12);border:1px solid hsla(45,55%,52%,0.28);\">" +
      escapeHtml(text) +
      "</span></td></tr>"
    );
  }

  function formatNotificationValue(raw) {
    var trimmed = String(raw == null ? "" : raw).trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return (
        '<a href="mailto:' +
        escapeHtml(trimmed) +
        '" style="color:' +
        ADMIN_REPLY.link +
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
        ADMIN_REPLY.link +
        ';text-decoration:underline;font-weight:500;">' +
        escapeHtml(trimmed) +
        "</a>"
      );
    }
    return escapeHtml(raw);
  }

  function formatNotificationDate(raw) {
    if (!raw) return "—";
    try {
      var d = new Date(raw);
      if (isNaN(d.getTime())) return escapeHtml(String(raw));
      return escapeHtml(
        d.toLocaleString([], {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      );
    } catch (e) {
      return escapeHtml(String(raw));
    }
  }

  function adminNotificationFieldRow(label, valueHtml, isFirst) {
    var border = isFirst ? "" : "border-top:1px solid " + T.cardBorder + ";";
    return (
      '<tr><td style="padding:10px 0;' +
      border +
      '">' +
      '<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>' +
      '<td width="88" style="width:88px;vertical-align:top;">' +
      '<span style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:' +
      ADMIN_REPLY.link +
      ';">' +
      escapeHtml(label) +
      "</span></td>" +
      '<td style="vertical-align:top;padding-left:12px;font-size:15px;line-height:1.5;color:' +
      T.infoValue +
      ';word-break:break-word;font-weight:400;">' +
      valueHtml +
      "</td></tr></table></td></tr>"
    );
  }

  function adminNotificationFieldsPanel(rowsInner) {
    return (
      '<tr><td style="padding:0 0 20px 0;">' +
      '<table width="100%" cellpadding="0" cellspacing="0" role="presentation" class="email-admin-notify-fields" style="background:' +
      ADMIN_REPLY.fieldsBg +
      ";border:1px solid " +
      T.cardBorder +
      ';border-radius:12px;">' +
      '<tr><td style="padding:14px 16px;">' +
      '<table width="100%" cellpadding="0" cellspacing="0">' +
      rowsInner +
      "</table></td></tr></table></td></tr>"
    );
  }

  function adminNotificationMessageBlock(message) {
    return (
      '<tr><td style="padding:0 0 16px 0;">' +
      '<p style="margin:0 0 8px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:' +
      ADMIN_REPLY.link +
      ';">Message</p>' +
      '<div class="email-admin-notify-message-box" style="padding:14px 16px;border-radius:10px;border:1px solid ' +
      T.cardBorder +
      ";background:" +
      ADMIN_REPLY.fieldsBg +
      ";font-size:15px;line-height:1.6;color:" +
      T.infoValue +
      ';white-space:pre-wrap;font-weight:400;">' +
      escapeHtml(message) +
      "</div></td></tr>"
    );
  }

  function adminNotificationMetaHtml(website, userAgent) {
    var parts = [];
    if (website) {
      parts.push(
        '<span style="color:' +
          T.subtitle +
          ';">Website:</span> ' +
          formatNotificationValue(website)
      );
    }
    if (userAgent) {
      var ua = String(userAgent).slice(0, 500);
      parts.push(
        '<span style="color:' +
          T.subtitle +
          ';">User agent:</span> ' +
          escapeHtml(ua)
      );
    }
    if (!parts.length) return "";
    return (
      '<tr><td style="padding:0 0 8px 0;">' +
      '<p class="email-subtitle-text" style="margin:0;font-size:12px;color:' +
      T.subtitle +
      ';line-height:1.55;">' +
      parts.join("<br />") +
      "</p></td></tr>"
    );
  }

  function adminNotificationFooter(note) {
    return (
      '<a href="' +
      escapeHtml(ADMIN_REPLY_SITE) +
      '" style="color:' +
      ADMIN_REPLY.footerText +
      ';text-decoration:none;font-weight:500;">rubenjimenez.dev</a>' +
      ' <span style="color:' +
      ADMIN_REPLY.footerText +
      ';">&middot; ' +
      escapeHtml(note) +
      "</span>"
    );
  }

  function buildReplyMailto(email, subject) {
    var subj = "Re: " + String(subject || "Your inquiry").trim();
    return (
      "mailto:" +
      encodeURIComponent(String(email || "").trim()) +
      "?subject=" +
      encodeURIComponent(subj)
    );
  }

  /**
   * Hybrid admin inbox notification — testimonial-style card + labeled form fields.
   * @param {Record<string, string>} p
   * @param {{ kind: "contact" | "hire_me", title: string, headerSubtitle: string, pill: string, footerNote: string }} config
   */
  function buildAdminFormNotificationHtml(p, config) {
    var fullname = String(p.fullname || "").trim() || "Customer";
    var email = String(p.email || "").trim();
    var message = String(p.message || "");
    var subject = String(p.subject || config.title || "Portfolio submission").trim();
    var fieldRows =
      adminNotificationFieldRow("Name", formatNotificationValue(fullname), true) +
      adminNotificationFieldRow("Email", formatNotificationValue(email), false) +
      adminNotificationFieldRow("Date", formatNotificationDate(p.timestamp), false);
    if (config.kind === "hire_me") {
      if (p.project_type) {
        fieldRows += adminNotificationFieldRow(
          "Project",
          formatNotificationValue(p.project_type),
          false
        );
      }
      if (p.budget) {
        fieldRows += adminNotificationFieldRow("Budget", formatNotificationValue(p.budget), false);
      }
    }
    var inner =
      adminNotificationHeader(config.title, config.headerSubtitle) +
      adminNotificationPill(config.pill) +
      adminNotificationFieldsPanel(fieldRows) +
      adminNotificationMessageBlock(message) +
      adminNotificationMetaHtml(p.website || "", p.user_agent || "") +
      clientCtaButton(buildReplyMailto(email, subject), "Reply to " + fullname);
    var preheader = String(message || subject)
      .trim()
      .slice(0, 140);
    return wrapClientEmail(
      inner,
      adminNotificationFooter(config.footerNote),
      preheader,
      subject
    );
  }

  function buildContactNotificationHtml(p) {
    return buildAdminFormNotificationHtml(p, {
      kind: "contact",
      title: String(p.subject || "New Contact Form Submission").trim(),
      headerSubtitle: "Portfolio · Contact form",
      pill: "Contact form submission",
      footerNote: "Portfolio contact notification",
    });
  }

  function buildHireMeNotificationHtml(p) {
    return buildAdminFormNotificationHtml(p, {
      kind: "hire_me",
      title: String(p.subject || "New Hire Me Inquiry").trim(),
      headerSubtitle: "Portfolio · Hire inquiry",
      pill: "Hire Me submission",
      footerNote: "Portfolio Hire Me inquiry",
    });
  }

  function buildAdminReplyHtml(p) {
    var fromName = p.from_name || "Ruben Jimenez";
    var subject = String(p.subject || "Message from Ruben").trim();
    var message = String(p.message || "");
    var inner =
      clientEmailHeader(fromName) +
      clientMessageBlock(
        buildMessageBodyHtml(message, {
          defaultCtaLabel: p.cta_label || "Open your portal &#8594;",
        })
      );
    return wrapClientEmail(inner, clientFooterHtml(), firstLinePreheader(message, subject), "Message from Ruben");
  }

  function buildTestimonialRequestHtml(p) {
    var name = escapeHtml(p.to_name || "there");
    var product = escapeHtml(p.product || "my software");
    var url = String(p.testimonial_url || "").trim();
    var subject = String(p.subject || "You\u2019re invited to share a testimonial").trim();
    var bodyHtml =
      '<p style="margin:0 0 16px;">Hi ' +
      name +
      ",</p>" +
      '<p style="margin:0 0 16px;">Ruben would love a short testimonial about <strong style="color:' +
      ADMIN_REPLY.link +
      ';">' +
      product +
      "</strong>. It only takes a minute \u2014 your words help others decide if the product is a good fit.</p>" +
      clientCtaButton(url, "Share your testimonial") +
      clientLinkFallback(url);
    var inner = clientEmailHeader("Ruben Jimenez") + clientMessageBlock(bodyHtml);
    return wrapClientEmail(
      inner,
      clientFooterHtml(),
      "Share a quick testimonial about " + String(p.product || "my software"),
      subject
    );
  }

  function buildPortalInviteHtml(p) {
    var name = String(p.to_name || "there").trim();
    var projectTitle = String(p.project_title || "your project").trim();
    var url = String(p.portal_url || "").trim();
    var subject = String(p.subject || "Your project portal is ready").trim();
    var message =
      "Hi " +
      name +
      ",\n\nYour project portal for " +
      projectTitle +
      " is ready \u2014 view milestones, docs, and updates in one place.\n\nLink: " +
      url +
      "\n\nThanks,\nRuben";
    return buildAdminReplyHtml({
      from_name: p.from_name || "Ruben Jimenez",
      subject: subject,
      message: message,
      cta_label: "Open your portal &#8594;",
    });
  }

  return {
    escapeHtml: escapeHtml,
    buildContactNotificationHtml: buildContactNotificationHtml,
    buildHireMeNotificationHtml: buildHireMeNotificationHtml,
    buildAdminReplyHtml: buildAdminReplyHtml,
    buildTestimonialRequestHtml: buildTestimonialRequestHtml,
    buildPortalInviteHtml: buildPortalInviteHtml,
  };
});
