"use strict";

const clientEmail = require("./email-templates-client.js");

/**
 * HTML email bodies — admin form notifications use hybrid layout (testimonial-style
 * card + labeled fields); client outbound emails share email-templates-client.js.
 */

function escapeHtml(s) {
  return clientEmail.escapeHtml(s);
}

function buildContactNotificationHtml(p) {
  return clientEmail.buildContactNotificationHtml(p);
}

function buildHireMeNotificationHtml(p) {
  return clientEmail.buildHireMeNotificationHtml(p);
}

function buildTestimonialRequestHtml(p) {
  return clientEmail.buildTestimonialRequestHtml(p);
}

function buildPortalInviteHtml(p) {
  return clientEmail.buildPortalInviteHtml(p);
}

function buildAdminReplyHtml(p) {
  return clientEmail.buildAdminReplyHtml(p);
}

module.exports = {
  escapeHtml,
  buildContactNotificationHtml,
  buildHireMeNotificationHtml,
  buildTestimonialRequestHtml,
  buildPortalInviteHtml,
  buildAdminReplyHtml,
};
