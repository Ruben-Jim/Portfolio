#!/usr/bin/env node
/**
 * Testimonial form (testimonial.html) and its Firestore rule.
 *   node scripts/test-testimonial-form.mjs
 *
 * Guards: on step 1 only "Your name" is required; job title and business name
 * are optional in the form, in its validation, and in the rule that saves it
 * (a blank one must not be rejected on Submit). The quote and name stay required.
 */
import fs from 'node:fs';

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };
const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const html = read('testimonial.html');
const rules = read('firestore.rules');

const input = (id) => (html.match(new RegExp('<input[^>]*id="' + id + '"[^>]*>')) || [''])[0];
ok(/\brequired\b/.test(input('t-name')), 'your name stays required');
ok(!/\brequired\b/.test(input('t-title')) && !/\brequired\b/.test(input('t-company')), 'job title and business name inputs are not required');
ok(/for="t-title">Job title <span class="t-optional">\(optional\)<\/span>/.test(html) && /for="t-company">Business name <span class="t-optional">\(optional\)<\/span>/.test(html), 'their labels say (optional)');
ok(!html.includes('Please enter your job title.') && !html.includes('Please enter your business name.'), 'step 1 no longer blocks on them');
ok(html.includes('Please enter your name.'), 'step 1 still asks for a name');

let create = rules.slice(rules.indexOf('match /testimonials/{testimonialId}'), rules.indexOf('allow update', rules.indexOf('match /testimonials/{testimonialId}')));
ok(/isOptionalString\(request\.resource\.data\.title, 120\)/.test(create) && /isOptionalString\(request\.resource\.data\.company, 160\)/.test(create), 'rule accepts a blank title / business name');
ok(/isValidString\(request\.resource\.data\.name, 120\)/.test(create) && /isValidString\(request\.resource\.data\.text, 5000\)/.test(create), 'rule still requires name and quote');
ok(/function isOptionalString\(field, maxLen\)\s*\{\s*return field is string && field\.size\(\) <= maxLen;\s*\}/.test(rules), 'isOptionalString: a string up to the limit (blank allowed)');

// ── Every answer may be used publicly, and the form says so ──
ok(!/only Ruben sees this|for Ruben only|Ruben only\?|leaves the admin panel|last private questions/i.test(html), 'no "private / only Ruben" wording left on the form');
ok((html.match(/May appear with your testimonial/g) || []).length === 4, 'steps 2–5 say their answers may appear with the testimonial');
ok(/id="t-intro-hint"[^>]*>[^<]*may be shared on rubenjimenez\.dev/i.test(html), 'step 1 says up front that answers may be shared');
ok(/for="t-private-notes">Anything else you’d like to add\?/.test(html), 'the notes box is no longer "for Ruben only"');

// ── Adding a testimonial from an email (admin only) ──
const shell = read('index.html');
const script = read('assets/js/script.js');
ok(/id="admin-testimonial-from-email-btn"/.test(shell) && /id="admin-testimonial-email-modal"[^>]*data-layer="modal"|data-layer="modal"[^>]*id="admin-testimonial-email-modal"/.test(shell), 'Admin → Testimonials has "Add from an email" and its form (on the modal layer)');
ok(['admin-testimonial-email-name', 'admin-testimonial-email-title', 'admin-testimonial-email-company', 'admin-testimonial-email-text', 'admin-testimonial-email-rating'].every((id) => shell.includes('id="' + id + '"')), 'the form has name, job title, business, their words, and an optional rating');
ok(/source:\s*'email'/.test(script) && /addDoc\(window\.collection\(window\.db, ['"]testimonials['"]\)/.test(script), 'it saves to testimonials with source "email"');
ok(/Added from an email/.test(script), 'the admin list labels it "Added from an email"');
const emailRule = (rules.match(/function validEmailTestimonial\(\)\s*\{[\s\S]*?\n    \}/) || [''])[0];
ok(/source == 'email'/.test(emailRule) && /hasOnly\(/.test(emailRule) && /isValidString\(d\.name, 120\)/.test(emailRule) && /isValidString\(d\.text, 5000\)/.test(emailRule), 'rule: an email testimonial needs a name and their words, source "email", nothing extra');
ok(/!d\.keys\(\)\.hasAny\(\['rating'\]\) \|\|/.test(emailRule), 'rule: the rating is optional for an email testimonial');
ok(/allow create: if[\s\S]*\(isPortfolioAdmin\(\) && validEmailTestimonial\(\)\)/.test(create = rules.slice(rules.indexOf('match /testimonials/{testimonialId}'), rules.indexOf('allow update', rules.indexOf('match /testimonials/{testimonialId}')))), 'rule: only the admin can add one this way');
ok(/function testimonialsStarHtml\(rating\) \{\s*var n = [^\n]*\n\s*if \(!n\) return '';/.test(script), 'no rating → no stars on the card');
const emailForm = shell.slice(shell.indexOf('id="admin-testimonial-email-modal"'), shell.indexOf('</form>', shell.indexOf('id="admin-testimonial-email-modal"')));
const formIds = (emailForm.match(/\sid="([^"]+)"/g) || []).map((m) => m.slice(5, -1));
ok(formIds.length > 5 && formIds.every((id) => shell.split('id="' + id + '"').length === 2), 'every id in the email form is unique on the page (duplicates: ' + formIds.filter((id) => shell.split('id="' + id + '"').length !== 2).join(', ') + ')');
