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

// ── Reviews Ruben adds himself (form and list checks live in test-reviews.mjs) ──
const shell = read('index.html');
const script = read('assets/js/script.js');
const emailRule = (rules.match(/function validAdminReview\(d\)\s*\{[\s\S]*?\n    \}/) || [''])[0];
ok(/d\.source in \['email', 'google'\]/.test(emailRule) && /hasOnly\(/.test(emailRule) && /isValidString\(d\.name, 120\)/.test(emailRule) && /isValidString\(d\.text, 5000\)/.test(emailRule), 'rule: an emailed review needs a name and their words, source "email" (or "google"), nothing extra');
ok(/!d\.keys\(\)\.hasAny\(\['rating'\]\) \|\|/.test(emailRule), 'rule: the rating is optional for an emailed review');
ok(/allow create: if[\s\S]*\(isPortfolioAdmin\(\) && validAdminReview\(request\.resource\.data\)\)/.test(create = rules.slice(rules.indexOf('match /testimonials/{testimonialId}'), rules.indexOf('allow update', rules.indexOf('match /testimonials/{testimonialId}')))), 'rule: only the admin can add one this way');
ok(/function testimonialsStarHtml\(rating\) \{\s*var n = [^\n]*\n\s*if \(!n\) return '';/.test(script), 'no rating → no stars on the card');

// ── After sending: "sent" screen + ask everyone for a Google review ──
const config = read('assets/js/config.js');
ok(/GOOGLE_REVIEW_URL = "https:\/\/g\.page\/r\/CRFHTStr6S2REBM\/review"/.test(config) && /window\.CWR_GOOGLE_REVIEW_URL = GOOGLE_REVIEW_URL/.test(config), 'config.js holds the Google review link (window.CWR_GOOGLE_REVIEW_URL)');
ok(!/'Private feedback'/.test(html) && /'Last questions'/.test(html), 'step 5 header says "Last questions", not "Private feedback"');
const thanks = html.slice(html.indexOf('id="t-state-thanks"'), html.indexOf('end shell'));
ok(/Your testimonial has been sent/.test(thanks) && !/has been published/.test(thanks), 'finish screen says the testimonial has been sent');
ok(/id="t-google-review"[^>]*hidden/.test(thanks) && /Would you also post it on Google\?/.test(thanks), 'finish screen has the Google review ask (hidden until a link is set)');
ok(/<a[^>]*id="t-google-review-link"[^>]*target="_blank"[^>]*rel="noopener"|<a[^>]*target="_blank"[^>]*rel="noopener"[^>]*id="t-google-review-link"/.test(thanks), 'the Google button opens the review page in a new tab');
const googleJs = html.slice(html.indexOf('function showGoogleAsk'), html.indexOf('function showGoogleAsk') + 1800);
ok(googleJs.length > 100 && !/rating\s*(>=|>|===|==|<)/.test(googleJs), 'the Google ask is shown to everyone, whatever the rating (Google forbids asking only happy clients)');
ok(/textContent = /.test(googleJs) && !/innerHTML/.test(googleJs), 'their words are shown as text, never HTML');
const styleVer = (s) => (s.match(/style\.css\?v=([^"]+)"/) || [])[1];
ok(styleVer(html) && styleVer(html) === styleVer(shell), 'testimonial.html loads the same style.css version as the site (' + styleVer(html) + ' vs ' + styleVer(shell) + ')');
