#!/usr/bin/env node
/**
 * Admin → Reviews: form testimonials, emailed reviews and hand-added Google
 * reviews in one list, each with an "On site" switch.
 *   node scripts/test-reviews.mjs
 *
 * Guards: the Firestore rules for added reviews, the switch and client
 * spoofing; the pure list/validation rules in assets/js/reviews-admin.js;
 * the admin markup; and the public site (hidden reviews, Google cards, names).
 */
import fs from 'node:fs';

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };
const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

// ── Firestore rules ──
const rules = read('firestore.rules');
const fn = (rules.match(/function validAdminReview\(d\)\s*\{[\s\S]*?\n    \}/) || [''])[0];
const block = rules.slice(rules.indexOf('match /testimonials/{testimonialId}'));
const create = block.slice(0, block.indexOf('allow update'));
const update = block.slice(block.indexOf('allow update'), block.indexOf('allow delete'));
ok(fn.length > 0, 'rule: validAdminReview(d) exists');
ok(fn.includes("d.source in ['email', 'google']"), 'rule: admin review sources are email or google');
ok(fn.includes("(d.source != 'google' || d.keys().hasAny(['rating']))"), 'rule: Google needs stars');
ok(/reviewUrl/.test(fn) && fn.includes("matches('^https://") && fn.includes("d.source == 'google'"), 'rule: review link is Google-only https');
ok(fn.includes('d.hidden is bool'), 'rule: hidden is a boolean');
ok(!fn.includes('isAvatarFile') && /d\.avatar is string && d\.avatar\.size\(\) > 0 && d\.avatar\.size\(\) <= 500/.test(fn), 'rule: admin review avatar is any short string');
ok(fn.includes('d.createdAt is timestamp'), 'rule: createdAt is a timestamp');
const only = (fn.match(/hasOnly\(\[([^\]]*)\]\)/) || ['', ''])[1].split(',').map((x) => x.trim().replace(/'/g, '')).sort().join(',');
ok(only === ['name', 'title', 'company', 'product', 'text', 'rating', 'avatar', 'source', 'reviewUrl', 'hidden', 'createdAt'].sort().join(','), 'rule: hasOnly lists exactly the review fields (' + only + ')');
ok(create.includes('(isPortfolioAdmin() && validAdminReview(request.resource.data))'), 'rule: admin can add a review');
ok(create.includes("!request.resource.data.keys().hasAny(['source', 'hidden', 'reviewUrl'])"), "rule: a client can't set source/hidden/reviewUrl");
ok(/affectedKeys\(\)\.hasOnly\(\['hidden'\]\)\s*&&\s*request\.resource\.data\.hidden is bool/.test(update), 'rule: switch changes only hidden');
ok(update.includes("resource.data.get('source', '') in ['email', 'google']") && update.includes('request.resource.data.source == resource.data.source') && update.includes('validAdminReview(request.resource.data)'), 'rule: full edit only for added reviews, source unchanged');
ok(/affectedKeys\(\)\.hasOnly\(\['avatar'\]\)/.test(update) && /affectedKeys\(\)\.hasOnly\(\['text'\]\)/.test(update), 'rule: avatar-only and text-only edits still allowed');
ok(!rules.includes('validEmailTestimonial'), 'rule: old validEmailTestimonial is gone');

// ── Pure rules (assets/js/reviews-admin.js → CWR_REVIEWS._test) ──
import vm from 'node:vm';
const win = { document: { getElementById: () => null, addEventListener() {} } };
win.window = win;
try {
  vm.runInNewContext(read('assets/js/reviews-admin.js'), { window: win, document: win.document, setTimeout, console });
} catch (e) { console.log('  (reviews-admin.js did not load: ' + e.message + ')'); }
const T = win.CWR_REVIEWS && win.CWR_REVIEWS._test;
ok(!!T, 'CWR_REVIEWS._test is exposed');
if (T) {
  const at = (y, m, d) => new Date(y, m - 1, d, 12).getTime();
  const tokens = [
    { id: 'tokA', data: { name: 'Rizo', email: 'r@x.com', product: 'Ordering', used: true, createdAt: at(2026, 10, 1) } },
    { id: 'tokB', data: { name: 'New Client', email: 'n@x.com', used: false, createdAt: { toMillis: () => at(2026, 10, 20) } } },
    { id: 'tokC', data: { name: 'Gone', used: true, createdAt: at(2026, 9, 1) } },
  ];
  const testimonials = [
    { id: 't1', data: { name: 'Rizo', text: 'Great', rating: 5, token: 'tokA', createdAt: { toMillis: () => at(2026, 10, 2) } } },
    { id: 't2', data: { name: 'Shelton', text: 'Emailed', source: 'email', createdAt: { seconds: at(2026, 10, 18) / 1000 } } },
    { id: 't3', data: { name: 'G', text: 'On Google', rating: 4, source: 'google', hidden: true, reviewUrl: 'https://g.co/r', createdAt: new Date(at(2026, 10, 10)) } },
  ];
  const rows = T.buildRows(tokens, testimonials);
  const kinds = rows.map((r) => r.kind + ':' + (r.id || r.tokenId)).join(' ');
  ok(kinds === 'waiting:tokB email:t2 google:t3 form:t1', 'buildRows: one row per testimonial, newest first (' + kinds + ')');
  const form = rows.find((r) => r.id === 't1');
  ok(form && form.tokenId === 'tokA' && form.email === 'r@x.com' && form.product === 'Ordering' && form.rating === 5 && form.shown === true, 'buildRows: a form row takes its invite code and email from the invite');
  const wait = rows.find((r) => r.kind === 'waiting');
  ok(wait && wait.id === '' && wait.tokenId === 'tokB' && wait.name === 'New Client', 'buildRows: unused invite without a testimonial is waiting');
  ok(!rows.some((r) => r.tokenId === 'tokC'), 'buildRows: used invite whose testimonial was removed has no row');
  const old = T.buildRows([], [{ id: 'o1', data: { name: 'Old', text: 'Hi', rating: 5 } }, { id: 'o2', data: { name: 'Off', text: 'Hi', rating: 5, hidden: true } }]);
  ok(old[0].kind === 'form' && old[0].shown === true && old[1].shown === false, 'buildRows: old docs are form rows, on site (hidden: true → off)');
  ok(rows.find((r) => r.id === 't3').reviewUrl === 'https://g.co/r', 'buildRows: a Google row keeps its review link');

  const c = T.countRows([{ kind: 'form', shown: true }, { kind: 'email', shown: false }, { kind: 'google', shown: true }, { kind: 'waiting', shown: false }]);
  ok(JSON.stringify(c) === JSON.stringify({ all: 4, onSite: 2, google: 1, waiting: 1 }), 'countRows: All 4 · On site 2 · Google 1 · Waiting on 1 (' + JSON.stringify(c) + ')');
  const ids = (f) => T.filterRows(rows, f).map((r) => r.id || r.tokenId).join(',');
  ok(ids('all') === 'tokB,t2,t3,t1' && ids('on-site') === 't2,t1' && ids('google') === 't3' && ids('waiting') === 'tokB', 'filterRows: each filter returns its rows; on-site leaves out waiting rows');

  const base = { source: 'google', name: 'Ann', title: '', company: '', product: '', text: 'Great', rating: '5', reviewUrl: '', date: '' };
  const v = (o, now) => T.validateReview(Object.assign({}, base, o), now);
  ok(v({ name: '  ' }).error === 'Add their name.', 'validateReview: blank name → "Add their name."');
  ok(v({ text: ' ' }).error === 'Add their words.', 'validateReview: blank words → "Add their words."');
  ok(v({ rating: '' }).error === 'Pick their stars. Every Google review has them.', 'validateReview: Google without stars is refused');
  ok(v({ date: '2999-01-01' }).error === "Date posted can't be in the future.", 'validateReview: a future date is refused');
  ok(v({ reviewUrl: 'javascript:alert(1)' }).error === 'The review link must start with https://' && v({ reviewUrl: 'http://x.com' }).error === 'The review link must start with https://', 'validateReview refuses a non-https link');
  const good = v({ name: ' Ann ', text: ' Great ', reviewUrl: ' https://maps.app.goo.gl/x ' });
  ok(good.ok && good.fields.name === 'Ann' && good.fields.text === 'Great' && good.fields.rating === 5 && good.fields.reviewUrl === 'https://maps.app.goo.gl/x' && good.fields.source === 'google', 'validateReview: trims, numbers the stars, keeps a Google link');
  const em = v({ source: 'email', rating: '', reviewUrl: 'https://x.com' });
  ok(em.ok && !('rating' in em.fields) && !('reviewUrl' in em.fields), 'validateReview: email may skip stars, a link is dropped for email');

  const fresh = T.editPayload(null, good.fields, '2026-05-04');
  ok(fresh.avatar === 'avatar-1.png' && !('hidden' in fresh) && Object.prototype.toString.call(fresh.createdAt) === '[object Date]' && fresh.createdAt.getTime() === at(2026, 5, 4), 'editPayload: new review — stock avatar, on site by default, date at local noon');
  ok(!('createdAt' in T.editPayload(null, good.fields, '')), 'editPayload: new review without a date leaves createdAt to the server');
  const stamp = { toMillis: () => at(2026, 3, 9) + 3600000 };
  const existing = { name: 'Ann', text: 'Old', avatar: '/assets/images/custom/ann.png', hidden: true, createdAt: stamp, rating: 3, reviewUrl: 'https://old', source: 'google' };
  const kept = T.editPayload(existing, good.fields, T.dateInputValue(at(2026, 3, 9) + 3600000));
  ok(kept.createdAt === stamp && kept.avatar === '/assets/images/custom/ann.png' && kept.hidden === true, 'editPayload keeps createdAt when the date is unchanged (and the photo and switch)');
  ok(T.editPayload(existing, good.fields, '2026-04-01').createdAt.getTime() === at(2026, 4, 1), 'editPayload: changed date replaces createdAt');
  const cleared = T.editPayload(existing, em.fields, '');
  ok(!('rating' in cleared) && !('reviewUrl' in cleared) && cleared.title === '' && cleared.source === 'email', 'editPayload: a full replace drops stars/link the form no longer has');
  ok(T.dateInputValue(at(2026, 5, 4)) === '2026-05-04' && T.dateInputValue(0) === '', 'dateInputValue: YYYY-MM-DD, blank for none');

  // Final review #1: "today" is never the future, whatever the time of day.
  const nine = new Date(2026, 2, 10, 9).getTime();
  ok(v({ date: '2026-03-10' }, nine).ok === true && T.validateReview(Object.assign({}, base, { date: '2026-03-11' }), nine).error === "Date posted can't be in the future.", 'validateReview: today is fine at 9:00, tomorrow is the future');
  ok(!('createdAt' in T.editPayload(null, good.fields, '2026-03-10', nine)), 'editPayload: picking today uses server time, not noon');
  const morning = { name: 'Ann', text: 'Old', avatar: 'avatar-1.png', source: 'google', rating: 5, createdAt: { toMillis: () => new Date(2026, 2, 10, 8, 30).getTime() } };
  ok(T.validateReview(Object.assign({}, base, { date: T.dateInputValue(new Date(2026, 2, 10, 8, 30).getTime()) }), nine).ok === true && T.editPayload(morning, good.fields, '2026-03-10', nine).createdAt === morning.createdAt, 'Edit of a review added at 8:30 today saves at 9:00 and keeps its time');
  // Final review #2: added reviews can still reach the photo picker (questionnaire drawer).
  ['email', 'google'].forEach((kind) => {
    const html = T.rowHtml({ kind, id: 'x1', tokenId: '', name: 'N', email: '', product: '', text: 'w', rating: 5, shown: true, createdMs: 0, reviewUrl: '', data: {} });
    ok(/data-action="view-testimonial" data-view-testimonial="x1"[^>]*>Change photo</.test(html), kind + ' rows have "Change photo" (opens the drawer with the photo picker)');
  });
  const mail = T.googleAskEmail({ name: 'Roberto Rizo', text: 'Fast <b>and</b> easy.' });
  ok(mail.subject === 'A quick favor: your review on Google', 'googleAskEmail: subject');
  ok(mail.message.startsWith('Hi Roberto Rizo,') && mail.message.includes('“Fast <b>and</b> easy.”') && mail.message.includes('The button below opens my Google review page.') && mail.message.endsWith('Ruben Jimenez\nCodeWithRuben'), 'googleAskEmail: their own words, plain text, signed');
  ok(T.inviteUrl('Ab3dK9xQ', 'https://rubenjimenez.dev/') === 'https://rubenjimenez.dev/review/Ab3dK9xQ', 'inviteUrl: /review/<code> on the public site');
}

// ── Admin → Reviews markup and wiring ──
const shell = read('index.html');
const script = read('assets/js/script.js');
const admin = read('assets/js/reviews-admin.js');
const tabBtn = (shell.match(/<button[^>]*id="admin-tab-testimonials"[\s\S]*?<\/button>/) || [''])[0];
ok(/aria-label="Reviews"/.test(tabBtn) && /admin-tab-label-desktop">Reviews</.test(tabBtn), 'admin tab says Reviews');
ok(/<h3 class="h3 admin-panel-title">Reviews<\/h3>/.test(shell) && shell.includes('Testimonials, Google reviews, and emailed ones. Switch on what shows on the site.'), 'Reviews heading and lead');
ok(/id="admin-review-add-btn"[^>]*>[\s\S]{0,120}Add review/.test(shell) && !shell.includes('admin-testimonial-from-email-btn') && !script.includes('admin-testimonial-from-email-btn'), 'Add review button replaces Add from an email');
ok(/id="admin-review-filters"[^>]*role="toolbar"/.test(shell) && !shell.includes('Invites & submissions'), 'filter chips replace the "Invites & submissions" heading');
const modal = shell.slice(shell.indexOf('id="admin-review-modal"'), shell.indexOf('</form>', shell.indexOf('id="admin-review-modal"')));
ok(/id="admin-review-modal"[^>]*data-layer="modal"/.test(shell) && /aria-labelledby="admin-review-heading"/.test(modal), 'review modal is on the modal layer');
const fieldIds = ['admin-review-form', 'admin-review-heading', 'admin-review-source', 'admin-review-name', 'admin-review-title', 'admin-review-company', 'admin-review-product', 'admin-review-text', 'admin-review-rating', 'admin-review-url', 'admin-review-url-wrap', 'admin-review-date', 'admin-review-status', 'admin-review-save'];
ok(fieldIds.every((id) => modal.includes('id="' + id + '"')) && /data-review-source="google"/.test(modal) && /data-review-source="email"/.test(modal), 'review modal has every field (' + fieldIds.filter((id) => !modal.includes('id="' + id + '"')).join(', ') + ')');
const modalIds = (modal.match(/\sid="([^"]+)"/g) || []).map((m) => m.slice(5, -1));
ok(modalIds.length > 10 && modalIds.every((id) => shell.split('id="' + id + '"').length === 2), 'every id in the review modal is unique on the page (duplicates: ' + modalIds.filter((id) => shell.split('id="' + id + '"').length !== 2).join(', ') + ')');
ok(/\{ src: '\/assets\/js\/reviews-admin\.js\?v=reviews-tab-20261020' \}/.test(shell) && !/<script[^>]*reviews-admin\.js/.test(shell), 'reviews-admin.js is in the admin bundle, not a public script tag');
const loader = script.slice(script.indexOf('async function loadTestimonialAdminPanel'), script.indexOf('window.loadTestimonialAdminPanel = loadTestimonialAdminPanel'));
ok(loader.includes('window.CWR_REVIEWS.renderList(combined, tRows, pRows)') && loader.includes('window.loadAdminBundle()') && !loader.includes('function appendActions'), 'loadTestimonialAdminPanel hands rendering to CWR_REVIEWS');
ok(!script.includes('Add a testimonial a client sent by email') && !script.includes('admin-testimonial-email-'), 'the old email form code is gone from script.js');
ok(['data-action="view-testimonial"', 'data-view-testimonial', 'data-view-testimonial-token', 'data-view-invite-only', 'data-delete-testimonial-token', 'data-delete-published-testimonial', 'admin-testimonial-combined-row--interactive', 'admin-testimonial-combined-main'].every((a) => admin.includes(a)), 'rows keep the View / Delete link / Remove hooks');
ok(['data-review-toggle', 'role="switch"', 'aria-checked', 'data-review-edit', 'data-review-ask-google', 'data-review-copy-link', 'data-review-open-google'].every((a) => admin.includes(a)), 'rows have the switch, Edit, Ask for a Google review, Copy link, Open on Google');
ok(/(?:window|global)\.CwrUI\.toast\("Couldn't change it\. If this is the first time, deploy the Firestore rules\.", \{ tone: 'error' \}\)/.test(admin), 'a failed switch shows an error notice');
ok(/buttonLabel: 'Post on Google →'/.test(admin) && /link: global\.CWR_GOOGLE_REVIEW_URL/.test(admin), 'Ask for a Google review opens Compose with your review link');
const removeConfirm = script.slice(script.indexOf('async function confirmDeleteTestimonialItem'), script.indexOf('async function confirmDeleteTestimonialItem') + 1200);
ok(/"Remove review\?"/.test(removeConfirm) && /On site switch/.test(removeConfirm), 'Remove asks "Remove review?" and points to the On site switch for hiding');

// ── Public site: hidden reviews, Google cards, names ──
const dyn = script.slice(script.indexOf('async function loadDynamicTestimonials'), script.indexOf('window.loadDynamicTestimonials = loadDynamicTestimonials'));
const hideAt = dyn.search(/\.hidden === true/);
ok(hideAt > 0 && hideAt < dyn.indexOf('rows.slice(0, 40)') && hideAt < dyn.indexOf('fillHeroQuote(rows)'), 'public list leaves out hidden reviews before the 40 cut, the Home 2 and the hero quote');
const hrefFn = (script.match(/function testimonialGoogleHref\(d\) \{[\s\S]*?\n  \}/) || [''])[0];
ok(/\^https:\\\/\\\//.test(hrefFn) && hrefFn.includes('window.CWR_GOOGLE_PROFILE_URL'), 'public Google link is https only, else your Google listing');
ok(dyn.includes('testimonials-google-tag') && dyn.includes('Posted on Google ↗') && /target="_blank" rel="noopener"/.test(dyn), 'a Google card gets the Google tag and "Posted on Google ↗"');
const cfg = read('assets/js/config.js');
ok(cfg.includes('const GOOGLE_PROFILE_URL = "https://www.google.com/maps/place/?q=place_id:ChIJK4OmDZEA9EUREUdNK2vpLZE";') && cfg.includes('window.CWR_GOOGLE_PROFILE_URL = GOOGLE_PROFILE_URL;'), 'config holds the Google listing link');
const i18n = read('assets/js/i18n.js');
ok(/'nav\.testimonials':\s*'Reviews',/.test(i18n) && /'nav\.testimonials':\s*'Reseñas',/.test(i18n), 'nav says Reviews / Reseñas');
ok((i18n.match(/'home\.testimonials_kicker':\s*'Reviews & Testimonials',/g) || []).length === 1 && (i18n.match(/'testimonials\.title':\s*'Reviews & Testimonials',/g) || []).length === 1, 'Home kicker and page title say Reviews & Testimonials (en)');
ok(/'home\.testimonials_kicker':\s*'Reseñas y testimonios',/.test(i18n) && /'testimonials\.title':\s*'Reseñas y testimonios',/.test(i18n), '… and Reseñas y testimonios (es)');
ok(/title: 'Reviews & Testimonials \| CodeWithRuben'/.test(read('assets/js/seo.js')), 'SEO title Reviews & Testimonials');
ok(!/data-i18n="nav\.testimonials">Testimonials</.test(shell) && /data-i18n="nav\.testimonials">Reviews</.test(shell) && shell.includes('data-i18n="home.testimonials_kicker">Reviews &amp; Testimonials<') && shell.includes('data-i18n="testimonials.title">Reviews &amp; Testimonials<'), 'index.html default texts renamed');
ok(/<title>Reviews (&amp;|&) Testimonials \| CodeWithRuben<\/title>/.test(read('testimonials/index.html')), 'the /testimonials page shell title updated');
const v = (file, src) => (file.match(new RegExp(src.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '\\?v=([^"\']+)')) || [])[1];
ok(['/assets/js/config.js', '/assets/js/i18n.js', '/assets/js/seo.js', '/assets/js/script.js', '/assets/css/style.css', '/assets/js/social-proof-admin.js', '/assets/js/reviews-admin.js'].every((f) => v(shell, f) === 'reviews-tab-20261020'), 'index.html loads every changed file at ?v=reviews-tab-20261020 (' + ['config.js', 'i18n.js', 'seo.js', 'script.js', 'style.css', 'social-proof-admin.js'].map((f) => f + '=' + v(shell, '/assets/' + (f.endsWith('.css') ? 'css/' : 'js/') + f)).join(' ') + ')');
const tHtml = read('testimonial.html');
ok(v(tHtml, './assets/js/config.js') === 'reviews-tab-20261020', 'testimonial.html loads the new config.js');
const spa = read('assets/js/social-proof-admin.js');
ok(/hidden: x\.hidden === true/.test(spa) && /t\.hidden \? ' · Hidden' : ''/.test(spa) && spa.includes('Open in Reviews') && !spa.includes('Open in Testimonials'), 'Social proof: hidden reviews are tagged Hidden; link says Open in Reviews');
