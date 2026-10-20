#!/usr/bin/env node
/**
 * Admin popups and layers (assets/js/admin-ui.js + scripts/lib/native-dialogs.mjs).
 *   node scripts/test-admin-ui.mjs
 *
 * Guards: admin code uses the site's own popups (CwrUI) instead of the
 * browser's confirm()/alert()/prompt(), and the guard that enforces it finds
 * real calls (bare or via window/global/self/globalThis) but not method calls,
 * look-alike names or comments.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findNativeDialogs, adminDialogFiles, findNativeDialogsInFile } from './lib/native-dialogs.mjs';

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ── The guard ──
let r = findNativeDialogs("if (!confirm('x')) return;");
ok(r.length === 1 && r[0].call === 'confirm' && r[0].line === 1, 'bare confirm( is found');
r = findNativeDialogs("window.alert('a');\nglobal.prompt('b');\nself.confirm('c');\nglobalThis.alert('d');");
ok(r.map((x) => x.line + x.call).join() === '1alert,2prompt,3confirm,4alert', 'window./global./self./globalThis. calls are found');
ok(findNativeDialogs("CwrUI.confirm({});\nx.alert(1);\nisConfirmed();\nconfirmDelete();\nvar promptText = 1;").length === 0, 'method calls and look-alike names are ignored');
ok(findNativeDialogs("// confirm('x')\n/* alert('y')\n prompt('z') */\nvar s = 'ok'; // alert('later')").length === 0, 'comments are ignored');
ok(findNativeDialogs("var u = 'https://x.com'; alert('after a url');").length === 1, 'a // inside a string is not a comment');
ok(findNativeDialogs("var esc = s.replace(/[&<>\"']/g, '');\nif (!global.confirm('x')) return;").length === 1, 'a regex with quote characters does not hide later calls');
ok(findNativeDialogs("var a = b / 2; alert('x'); var c = d / 4;").length === 1, 'division is not mistaken for a regex');

const files = adminDialogFiles(ROOT);
ok(['assets/js/script.js', 'assets/js/agency-tools.js', 'assets/js/post-builder/library.js', 'index.html'].every((f) => files.includes(f)), 'admin files are scanned (script.js, agency-tools.js, post-builder, index.html)');
ok(!files.includes('assets/js/client-portal.js') && !files.includes('assets/js/hire-me-booking.js') && !files.includes('assets/js/admin-ui.js'), 'client portal, public booking page and the kit itself are not scanned');

// ── The 13 plain confirm copies are gone (they use CwrUI.confirm now) ──
import fs from 'node:fs';
const readRepo = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const shell = readRepo('index.html');
const scriptJs = readRepo('assets/js/script.js');
const agencyJs = readRepo('assets/js/agency-tools.js');
const COPIES = ['delete-contact-confirm-modal', 'delete-dm-conversation-confirm-modal', 'delete-blog-confirm-modal', 'delete-portfolio-confirm-modal', 'delete-document-confirm-modal', 'delete-hub-confirm-modal', 'delete-maint-confirm-modal', 'delete-time-entry-confirm-modal', 'email-clear-day-confirm-modal', 'delete-lead-confirm-modal', 'cancel-booking-confirm-modal', 'delete-referral-confirm-modal', 'delete-testimonial-confirm-modal'];
const left = COPIES.filter((id) => shell.includes('id="' + id + '"'));
ok(left.length === 0, 'the 13 plain confirm copies are gone from index.html' + (left.length ? ' (left: ' + left.join(', ') + ')' : ''));
const OPENERS = ['openDeleteBlogConfirmModal', 'openDeleteContactConfirmModal', 'openDeleteDmConversationConfirmModal', 'openDeleteDocumentConfirmModal', 'openDeleteHubConfirmModal', 'openDeleteLeadConfirmModal', 'openDeleteMaintConfirmModal', 'openDeletePortfolioConfirmModal', 'openDeleteReferralConfirmModal', 'openDeleteTestimonialConfirmModal', 'openDeleteTimeEntryConfirmModal', 'openCancelBookingConfirmModal', 'openEmailClearDayConfirm'];
const leftFns = OPENERS.filter((f) => scriptJs.includes(f) || agencyJs.includes(f));
ok(leftFns.length === 0, 'their open functions are gone' + (leftFns.length ? ' (left: ' + leftFns.join(', ') + ')' : ''));
ok(['graduate-client-confirm-modal', 'portfolio-unsaved-confirm-modal', 'blog-unsaved-confirm-modal'].every((id) => shell.includes('id="' + id + '"')), 'the confirms with extra fields or three buttons stay as their own modals');

// Each migrated delete asks with its own wording, then runs the same delete code as before.
const funcBody = (src, name) => {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) return '';
  let depth = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}' && --depth === 0) return src.slice(i, k + 1);
  }
  return '';
};
const MIGRATED = [
  [scriptJs, 'confirmDeleteBlogPost', 'Delete blog post?', 'deleteBlogPostConfirmed(postId)'],
  [scriptJs, 'confirmDeleteContactMessage', 'Delete submission?', 'deleteContactMessageConfirmed(messageId)'],
  [scriptJs, 'confirmDeleteTestimonialItem', 'Remove review?', 'deleteTestimonialItemConfirmed(kind, id)'],
  [scriptJs, 'confirmDeleteDmConversation', 'Delete conversation?', 'deleteDmConversationConfirmed('],
  [scriptJs, 'confirmDeleteBusinessDocument', 'Delete document?', 'deleteBusinessDocumentConfirmed(documentId)'],
  [scriptJs, 'confirmDeletePortfolioProject', 'Delete portfolio project?', 'deletePortfolioProjectDoc(id)'],
  [scriptJs, 'confirmDeletePipelineLead', 'Delete pipeline lead?', 'performDeletePipelineLead(leadId)'],
  [scriptJs, 'confirmCancelAgencyBooking', 'Cancel this booking?', 'performCancelAgencyBooking(booking.id)'],
  [scriptJs, 'confirmEmailClearDay', 'Hide these threads?', 'applyEmailClearDay(dayKey)'],
  [agencyJs, 'confirmDeleteProjectHub', 'Delete project hub?', 'performDeleteProjectHub(id)'],
  [agencyJs, 'confirmDeleteMaintenance', 'Delete maintenance client?', 'performDeleteMaintenance(id)'],
  [agencyJs, 'confirmDeleteReferral', 'Delete referral partner?', 'performDeleteReferral(id)'],
  [agencyJs, 'confirmDeleteTimeEntry', 'Delete time entry?', 'deleteTimeEntry(id)'],
];
for (const [src, name, title, runs] of MIGRATED) {
  const body = funcBody(src, name);
  const askAt = body.indexOf('CwrUI.confirm(');
  ok(!!body && askAt > 0 && body.includes(title) && body.indexOf(runs) > askAt, `${name}: asks "${title}" first, then runs ${runs.replace(/\(.*$/, '')}`);
}
ok(funcBody(scriptJs, 'confirmCancelAgencyBooking').includes("cancelLabel: 'Keep booking'"), 'cancel booking keeps its "Keep booking" button');

// ── No browser popups left anywhere in admin code ──
for (const f of adminDialogFiles(ROOT)) {
  const found = findNativeDialogsInFile(ROOT, f);
  ok(found.length === 0, `${f}: no browser popups` + (found.length ? ' (' + found.map((x) => x.line + ':' + x.call).join(' ') + ')' : ''));
}

// ── Layers: every admin overlay sits on a named layer ──
const LAYERS = {
  drawer: ['tc-timer-drawer', 'cp-client-drawer', 'lead-detail-drawer', 'admin-contact-detail', 'admin-testimonial-detail', 'ops-doc-sheet-root'],
  modal: ['admin-client-email-preview-modal', 'admin-testimonial-request-modal', 'admin-login-modal', 'reply-modal', 'lead-modal', 'social-proof-modal', 'business-doc-modal', 'add-blog-modal', 'edit-blog-modal', 'portfolio-project-modal', 'template-matcher-modal', 'new-client-modal', 'project-hub-editor-modal', 'case-study-modal', 'maintenance-editor-modal', 'content-repurpose-modal', 'referral-editor-modal', 'studio-cost-editor-modal', 'studio-cost-paid-modal', 'ops-doc-editor-modal', 'snippet-edit-modal', 'tc-add-drawer'],
  confirm: ['admin-email-reply-confirm-modal', 'admin-client-email-sent-modal', 'graduate-client-confirm-modal', 'portfolio-unsaved-confirm-modal', 'blog-unsaved-confirm-modal'],
};
const shellNow = readRepo('index.html');
for (const [layer, ids] of Object.entries(LAYERS)) {
  const wrong = ids.filter((id) => !new RegExp('<[a-z]+\\b[^>]*\\bid="' + id + '"[^>]*\\bdata-layer="' + layer + '"|<[a-z]+\\b[^>]*\\bdata-layer="' + layer + '"[^>]*\\bid="' + id + '"').test(shellNow));
  ok(wrong.length === 0, `${layer} layer set on ${ids.length} overlays` + (wrong.length ? ' (missing: ' + wrong.join(', ') + ')' : ''));
}
const scriptNow = readRepo('assets/js/script.js');
ok(/className = 'admin-email-drawer';\s*\n[^\n]*setAttribute\('data-layer', 'drawer'\)/.test(scriptNow), 'the email drawer (built by script.js) is on the drawer layer');
ok(/id = 'reschedule-booking-modal';\s*\n[^\n]*setAttribute\('data-layer', 'modal'\)/.test(scriptNow), 'the reschedule popup (built by script.js) is on the modal layer');
ok(/className = 'blog-tiptap-image-modal';\s*\n[^\n]*setAttribute\('data-layer', 'modal-raised'\)/.test(readRepo('assets/js/blog-tiptap-editor.js')), 'the blog image modal sits above the blog editor');

// ── Layer values and rules ──
const styleCss = readRepo('assets/css/style.css');
const vars = {};
for (const m of styleCss.matchAll(/--z-(float|drawer|modal|modal-raised|fullscreen|confirm|toast):\s*(\d+)\s*;/g)) vars[m[1]] = Number(m[2]);
ok(JSON.stringify(vars) === JSON.stringify({ float: 100, drawer: 10000, modal: 10100, 'modal-raised': 10150, fullscreen: 100010, confirm: 100100, toast: 100200 }), 'layer values: ' + JSON.stringify(vars));
const pbCss = readRepo('assets/css/post-builder.css');
const pbNumbers = [...pbCss.matchAll(/z-index:\s*(\d+)/g)].map((m) => Number(m[1]));
ok(vars.confirm > 99999 && pbNumbers.every((n) => n < vars.confirm), `confirm (${vars.confirm}) is above the cookie banner and every post-builder layer (max ${Math.max(0, ...pbNumbers)})`);
ok(/\.pb-editor\s*\{[^}]*z-index:\s*var\(--z-fullscreen\)/.test(pbCss) && /\.pb-modal\s*\{[^}]*z-index:\s*calc\(var\(--z-fullscreen\)/.test(pbCss), 'post builder uses the full-screen layer (its new-design dialog just under the editor, as before)');
for (const layer of ['drawer', 'modal', 'modal-raised', 'confirm']) {
  ok(new RegExp('body \\[data-layer="' + layer + '"\\]\\s*\\{\\s*z-index:\\s*var\\(--z-' + layer + '\\)').test(styleCss), `rule: body [data-layer="${layer}"] uses --z-${layer}`);
}
ok(/body\.cwr-overlay-open \[data-float\]\s*\{[^}]*visibility:\s*hidden[^}]*pointer-events:\s*none/.test(styleCss), 'floating buttons hide while an overlay is open');
ok(!readRepo('assets/css/agency-tools.css').includes('body.admin-email-drawer-open > .tc-timer-chip'), 'the old hard-coded timer hide list is gone');
ok(/id="tc-timer-chip"[^>]*data-float|data-float[^>]*id="tc-timer-chip"/.test(shellNow), 'the timer chip is marked data-float');
