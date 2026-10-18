#!/usr/bin/env node
/**
 * Homepage social proof rules (assets/js/social-proof.js).
 *   node scripts/test-social-proof.mjs
 *
 * Guards: results are computed honestly (% from before/after, counts as typed),
 * every number carries a source and month, public entries only hold display
 * fields, drafts never show, the built-in clients show until the database has
 * entries, and "Check-in due" fires 60 days after launch.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SP = require('../assets/js/social-proof.js');

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };
const MINUS = '−';

// Numbers people type
ok(SP.num('1,200') === 1200 && SP.num('$40') === 40 && SP.num(' 55 ') === 55, 'num: commas, $ and spaces are fine');
ok(SP.num('') === null && SP.num('abc') === null && SP.num(null) === null && SP.num(NaN) === null, 'num: blank / text → null');
ok(SP.num(12.5) === 12.5 && SP.num('12.5') === 12.5, 'num: decimals');

// % change
ok(SP.percentChange(40, 55) === '+38%', '40 → 55 is +38%');
ok(SP.percentChange('40', '30') === MINUS + '25%', '40 → 30 is −25% (real minus sign)');
ok(SP.percentChange(10, 10) === '+0%', 'no change is +0%');
ok(SP.percentChange(10, 130) === '+1,200%', 'big % gets a thousands separator');
ok(SP.percentChange(0, 10) === '' && SP.percentChange(-5, 10) === '', 'before must be above 0');
ok(SP.percentChange(10, -1) === '' && SP.percentChange(10, '') === '' && SP.percentChange('x', 5) === '', 'bad after / text → no %');

// Counts
ok(SP.formatCount('1240') === '1,240' && SP.formatCount('1,240') === '1,240', 'digits get separators');
ok(SP.formatCount(' 86+ ') === '86+', 'other text kept as typed, trimmed');
ok(SP.formatCount('') === '', 'blank → blank');

// statFor
ok(SP.statFor({ kind: 'change', before: 40, after: 55 }) === '+38%', 'statFor change');
ok(SP.statFor({ kind: 'count', count: '86' }) === '86', 'statFor count');
ok(SP.statFor({ kind: 'none', count: '86' }) === '' && SP.statFor(null) === '', 'statFor none / missing');

// Labels
ok(SP.sourceLabel('app', 'en') === 'From the app' && SP.sourceLabel('client', 'en') === 'Client-reported', 'source labels EN');
ok(SP.sourceLabel('app', 'es') === 'Desde la app' && SP.sourceLabel('client', 'es') === 'Según el cliente', 'source labels ES');
ok(SP.sourceLabel('other', 'en') === '', 'unknown source → blank');
ok(SP.monthLabel('2026-09', 'en') === 'Sep 2026' && SP.monthLabel('2026-09', 'es') === 'sep 2026', 'month labels');
ok(SP.monthLabel('2026-13', 'en') === '' && SP.monthLabel('', 'en') === '', 'bad month → blank');
ok(SP.metaLine({ client: "Rizo's Pizzeria", source: 'app', asOf: '2026-09' }, 'en') === "Rizo's Pizzeria · From the app · Sep 2026", 'meta line');
ok(SP.metaLine({ client: 'Shop', source: '', asOf: '' }, 'en') === 'Shop', 'meta line skips blanks');
ok(SP.metaLine({ client: "Rizo's Pizzeria", tagline: 'Restaurant · online ordering', source: 'app', asOf: '2026-09' }, 'en') === 'Restaurant · online ordering · From the app · Sep 2026', 'bottom line leads with the tagline (industry · what we built)');
ok(SP.metaLine({ client: "Rizo's Pizzeria", tagline: '  ', source: '', asOf: '' }, 'en') === "Rizo's Pizzeria", 'blank tagline falls back to the client name');

// Logo URLs (same rules the portfolio field had)
ok(SP.cleanLogoUrl('/assets/images/logo/logo-3-color.png') === '/assets/images/logo/logo-3-color.png', 'asset path kept');
ok(SP.cleanLogoUrl('./assets/a.png') === '/assets/a.png' && SP.cleanLogoUrl('assets/a.png') === '/assets/a.png', 'relative asset paths normalized');
ok(SP.cleanLogoUrl('https://cdn.example.com/l.png') === 'https://cdn.example.com/l.png', 'https kept');
for (const bad of ['javascript:alert(1)', 'http://x.com/l.png', 'data:image/png;base64,AA', '/assets/x" onerror="y', '//evil.com/x.png', 'https://x.com/a b.png', '/assets/' + 'a'.repeat(600)]) {
  ok(SP.cleanLogoUrl(bad) === '', `logo rejects ${JSON.stringify(bad.slice(0, 40))}`);
}

// sanitizeEntry: only display fields, all limits applied
const e = SP.sanitizeEntry({
  client: '  ' + 'C'.repeat(90), logoUrl: 'javascript:x', stat: '+38%-too-long-value', label: 'L'.repeat(90), tagline: 'T'.repeat(90),
  source: 'friend', asOf: '2026-9', summary: 'S'.repeat(250), projectId: 'bad/id', published: 'true',
  order: 'x', updatedAt: -1, before: 40, note: 'secret',
});
ok(Object.keys(e).sort().join() === 'asOf,client,label,logoUrl,order,projectId,published,source,stat,summary,tagline,updatedAt', 'entry keeps only display fields (no before/after/note)');
ok(e.client.length === 80 && e.label.length === 80 && e.summary.length === 200 && e.stat.length === 12 && e.tagline.length === 60, 'lengths capped');
ok(e.logoUrl === '' && e.source === '' && e.asOf === '' && e.projectId === '', 'bad values dropped');
ok(e.published === false && e.order === 0 && e.updatedAt === 0, 'published only when true; numbers default to 0');
ok(SP.sanitizeEntry({ projectId: '-OaBc_12-x' }).projectId === '-OaBc_12-x', 'RTDB push ids allowed');

// sanitizeDetails
const d = SP.sanitizeDetails({ kind: 'change', before: '1,000', after: '$1,250', count: 'x', note: 'N'.repeat(600), launchDate: '2026-08-01', createdAt: 5 });
ok(d.kind === 'change' && d.before === 1000 && d.after === 1250 && d.count === '', 'change keeps before/after only');
ok(d.note.length === 500 && d.launchDate === '2026-08-01' && d.createdAt === 5, 'note capped, date + createdAt kept');
const dc = SP.sanitizeDetails({ kind: 'count', count: ' 86 ', before: 3 });
ok(dc.kind === 'count' && dc.count === '86' && dc.before === null, 'count keeps count only');
ok(SP.sanitizeDetails({ kind: 'weird', launchDate: 'soon' }).kind === 'none' && SP.sanitizeDetails({}).launchDate === '', 'unknown kind → none; bad date dropped');

// validate
const good = { client: 'Rizo', label: 'more online orders per week', source: 'app', asOf: '2026-09', published: true, summary: '' };
ok(SP.validate(good, { kind: 'change', before: 40, after: 55 }).length === 0, 'valid % entry');
ok(SP.validate({ ...good, client: ' ' }, { kind: 'none' }).includes("Add the client's name."), 'client required');
ok(SP.validate(good, { kind: 'change', before: 0, after: 5 }).includes('Before must be a number above 0.'), 'before > 0');
ok(SP.validate(good, { kind: 'change', before: 5, after: null }).includes('After must be a number, 0 or more.'), 'after required');
ok(SP.validate(good, { kind: 'count', count: '' }).includes('Add the count.'), 'count required');
ok(SP.validate(good, { kind: 'count', count: '1234567890123' }).includes('Keep the count to 12 characters or fewer.'), 'count length');
ok(SP.validate({ ...good, label: '' }, { kind: 'count', count: '86' }).includes('Say what the number measures.'), 'label required with a number');
ok(SP.validate({ ...good, source: '' }, { kind: 'count', count: '86' }).includes('Pick where the number came from.'), 'source required with a number');
ok(SP.validate({ ...good, asOf: '' }, { kind: 'count', count: '86' }).includes('Pick the month the number is from.'), 'month required with a number');
ok(SP.validate({ client: 'Shop', published: true, summary: '' }, { kind: 'none' }).includes('Add a number or a what-we-built line before publishing.'), 'published needs a number or summary');
ok(SP.validate({ client: 'Shop', published: false, summary: '' }, { kind: 'none' }).length === 0, 'drafts can be bare');
// Kickoff draft: the before number now, the after at the check-in
ok(SP.validate({ client: 'New', published: false }, { kind: 'change', before: 40, after: null }).length === 0, 'kickoff draft: before alone saves while unpublished');
ok(SP.validate({ client: 'New', published: false }, { kind: 'change', before: 0, after: null }).includes('Before must be a number above 0.'), 'kickoff draft still needs a valid before');
ok(SP.validate({ client: 'New', published: true, summary: 'x' }, { kind: 'change', before: 40, after: null }).includes('After must be a number, 0 or more.'), 'publishing a % entry needs the after number');
ok(SP.validate({ client: 'New', published: false }, { kind: 'change', before: 40, after: 55 }).includes('Say what the number measures.'), 'once after is in, label/source/month are required even for a draft');

// visibleEntries
const db = [
  { id: 'b', client: 'B', published: true, order: 20 },
  { id: 'a', client: 'A', published: true, order: 10 },
  { id: 'd', client: 'Draft', published: false, order: 5 },
];
ok(SP.visibleEntries(db, SP.BUILT_IN).map((x) => x.id).join() === 'a,b', 'database: published only, by order');
ok(SP.visibleEntries(null, SP.BUILT_IN).length === 3 && SP.visibleEntries([], SP.BUILT_IN).length === 3, 'not loaded / empty → built-ins');
ok(SP.visibleEntries([{ id: 'd', client: 'D', published: false, order: 1 }], SP.BUILT_IN).length === 0, 'entries but none published → nothing (section hides)');
ok(SP.visibleEntries(Array.from({ length: 9 }, (_, i) => ({ id: 'x' + i, client: 'X', published: true, order: i })), SP.BUILT_IN).length === SP.MAX, `at most ${SP.MAX}`);

// Built-ins
ok(SP.BUILT_IN.map((b) => b.id).join() === 'builtin-rizo,builtin-shelton,builtin-procleaning', 'three built-ins in order');
ok(SP.BUILT_IN.every((b) => b.published === true && b.stat === '' && b.summary && b.logoUrl.startsWith('/assets/images/logo/')), 'built-ins: published, no invented numbers, logo + summary');
ok(SP.BUILT_IN.map((b) => b.tagline).join(' | ') === 'Restaurant · online ordering | HOA · management portal | Cleaning · field service', 'built-ins keep their old bottom lines');
ok(SP.BUILT_IN.every(({ id, ...rest }) => JSON.stringify(SP.sanitizeEntry(rest)) === JSON.stringify(rest)), 'built-ins are already in sanitized shape');

// checkInDue (launch 2026-08-01; Aug 1 + 60 days = Sep 30)
const det = { launchDate: '2026-08-01' };
ok(SP.checkInDue(det, { stat: '' }, new Date(2026, 8, 29)) === false, '59 days: not due');
ok(SP.checkInDue(det, { stat: '' }, new Date(2026, 8, 30)) === true, '60 days: due');
ok(SP.checkInDue(det, { stat: '' }, new Date(2026, 9, 1)) === true, '61 days: due');
ok(SP.checkInDue(det, { stat: '+38%' }, new Date(2026, 9, 1)) === false, 'already has a number: not due');
ok(SP.checkInDue({ launchDate: '' }, { stat: '' }, new Date(2026, 9, 1)) === false, 'no launch date: not due');

// ── Social proof tab: matching (tab Task 1) ──
ok(SP.nameKey("Rizo's Pizzeria") === 'rizos pizzeria' && SP.nameKey('Rizo’s  Pizzeria!') === 'rizos pizzeria', 'nameKey: apostrophes, punctuation, spaces');
ok(SP.nameKey('The Acme Co.') === 'acme co' && SP.nameKey('Café Ñandú') === 'cafe nandu', 'nameKey: leading "the", accents');
ok(SP.nameKey('') === '' && SP.nameKey(null) === '', 'nameKey: blank');

const T = [
  { id: 't1', name: 'Roberto Rizo', title: 'Owner', company: 'Rizo’s Pizzeria', text: 'Great.', rating: 5, createdMs: 100 },
  { id: 't2', name: 'Ana Rizo', title: '', company: "rizos pizzeria", text: 'Fast.', rating: 5, createdMs: 200 },
  { id: 't3', name: 'Jane Doe', title: 'CEO', company: 'Acme Co', text: 'Solid.', rating: 4, createdMs: 50 },
  { id: 't4', name: 'No Company', title: '', company: '', text: 'Hi.', rating: 5, createdMs: 10 },
];
ok(SP.testimonialsFor({ client: "Rizo's Pizzeria" }, T).map((t) => t.id).join() === 't2,t1', 'testimonialsFor: matched by business name, newest first');
ok(SP.testimonialsFor({ client: '' }, T).length === 0, 'testimonialsFor: blank client matches nothing (not the blank-company testimonial)');

const P = [
  { id: 'p1', title: "Rizo's Pizzeria", outcome: 'Orders now come in online.', visibility: 'private' },
  { id: 'p2', title: 'Shelton Springs HOA', outcome: 'One portal for the board.' },
  { id: 'p3', title: 'Lawn Care Platform', outcome: 'Template outcome.', isTemplate: true },
  { id: 'p4', title: 'No Outcome', outcome: '   ' },
];
ok(SP.outcomeFor({ projectId: 'p1' }, P).id === 'p1', 'outcomeFor: linked project');
ok(SP.outcomeFor({ projectId: 'p4' }, P) === null && SP.outcomeFor({ projectId: '' }, P) === null && SP.outcomeFor({ projectId: 'zz' }, P) === null, 'outcomeFor: blank outcome / no link / missing project → null');

const u = SP.unusedProof([{ client: "Rizo's Pizzeria", projectId: 'p1' }], T, P);
ok(u.testimonials.map((t) => t.id).join() === 't3,t4', 'unused testimonials: the ones no entry matches (newest first)');
ok(u.outcomes.map((p) => p.id).join() === 'p2', 'unused outcomes: not linked, not templates, not blank');

// Quote + credit
ok(SP.quoteFromText('First paragraph\nwraps.\n\nSecond.') === 'First paragraph wraps.', 'quoteFromText: first paragraph, joined');
const longQ = SP.quoteFromText('word '.repeat(80));
ok(longQ.length <= 200 && longQ.endsWith('…') && !/\s…$/.test(longQ), `quoteFromText: long text cut at a word (${longQ.length})`);
ok(SP.quoteFromText('') === '' && SP.quoteFromText(null) === '', 'quoteFromText: blank');
ok(SP.creditFromTestimonial(T[0]) === 'Roberto Rizo · Owner, Rizo’s Pizzeria', 'credit: name · title, business');
ok(SP.creditFromTestimonial(T[1]) === 'Ana Rizo · rizos pizzeria', 'credit: no title');
ok(SP.creditFromTestimonial({ name: 'N'.repeat(40), title: 'T'.repeat(30), company: 'C' }).length <= 60, 'credit: capped at 60');
ok(SP.creditFromTestimonial({}) === '', 'credit: blank');

// ── Homepage wiring (Task 3) ──
const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const script = read('assets/js/script.js');
const shell = read('index.html');
ok(!/homeSpotlight|clientLogoUrl|resultStat|resultLabel|landingSpotlightProjects|portfolioSanitizeLogoUrl/.test(script), 'script.js: portfolio-field spotlight is gone');
ok(!/portfolio-project-home-spotlight|portfolio-project-client-logo|portfolio-project-result-stat/.test(shell), 'index.html: portfolio-editor spotlight fields are gone');
ok(/window\.SocialProof/.test(script) && /SP\.visibleEntries\(landingSocialProofDb, SP\.BUILT_IN\)/.test(script), 'homepage renders through SocialProof.visibleEntries');
ok(/rtdbRef\(window\.rtdb, 'socialProof'\)/.test(script), 'homepage reads socialProof');
ok(/<blockquote class="cwr-landing-spotlight-quote">/.test(script) && !/cwr-landing-spotlight-name/.test(script), 'slides use the old order: logo → quote → bottom line (no "Client project" + name)');
const spTag = shell.indexOf('/assets/js/social-proof.js?v=');
ok(spTag > 0 && spTag < shell.indexOf('/assets/js/script.js?v='), 'index.html loads social-proof.js before script.js');
ok(/cwr:langchange/.test(read('assets/js/i18n.js')) && /'cwr:langchange'/.test(script), 'language switch redraws the spotlight');
ok(!fs.existsSync(new URL('../scripts/test-landing-spotlight.mjs', import.meta.url)), 'old landing-spotlight test removed');

// ── Social proof tab: wiring (tab Task 3) ──
const tabBtnAt = shell.indexOf('id="admin-tab-social-proof"');
ok(tabBtnAt > shell.indexOf('id="admin-tab-testimonials"') && /data-admin-tab="social-proof" data-admin-content-sub/.test(shell), 'Social proof tab button sits after Testimonials in Content');
const panelAt = shell.indexOf('id="admin-panel-social-proof"');
const sectionAt = shell.indexOf('id="social-proof-admin-section"');
ok(panelAt > 0 && sectionAt > panelAt && sectionAt > shell.indexOf('<!-- /admin-panel-testimonials -->'), 'section moved out of Testimonials into its own panel');
ok(/id="admin-social-proof-unused-list"/.test(shell) && /id="social-proof-number-note"/.test(shell), 'not-yet list + number note markup');
ok((script.match(/CONTENT_SUB_TABS = \{[^}]*'social-proof': 1/g) || []).length === 2, "both CONTENT_SUB_TABS maps include 'social-proof'");
ok(/CONTENT_SUB_TAB_IDS = \[[^\]]*'social-proof'/.test(script) && /'social-proof': \{ label: 'Proof', icon: 'ribbon-outline' \}/.test(script), 'mobile sub-tab bar lists Social proof');
ok(/tabId === 'social-proof' && window\.CWR_SOCIAL_PROOF/.test(script) && !/tabId === 'testimonials' && window\.CWR_SOCIAL_PROOF/.test(script), 'opening the tab loads social proof (not the Testimonials tab)');
ok(/getElementById\('admin-panel-social-proof'\)/.test(read('assets/js/social-proof-admin.js')), 'admin script auto-opens on the new panel');
ok(/var VALID = \{[^}]*'social-proof': 1/.test(script), "activate() accepts 'social-proof' (otherwise the tab can't open)");

// ── Follow-up: one card per client (possessives, other apostrophes, Outcomes matched by name) ──
ok(SP.nameKey('Rizo‘s Pizzeria') === 'rizos pizzeria' && SP.nameKey('Rizoʼs Pizzeria') === 'rizos pizzeria', 'nameKey: ‘ and ʼ apostrophes too');
ok(SP.testimonialsFor({ client: "Rizo's Pizzeria" }, [{ id: 'a', company: 'Rizo Pizzeria' }]).length === 1, 'possessive and plain spellings match (Rizo\'s ≈ Rizo)');
const PN = [
  { id: 'r1', title: "Rizo's Pizzeria", outcome: 'Online orders up.' },
  { id: 'tp', title: "Rizo's Pizzeria", outcome: 'Template.', isTemplate: true },
];
ok((SP.outcomeFor({ client: "Rizo's Pizzeria", projectId: '' }, PN) || {}).id === 'r1', 'an unlinked card shows the same-name client project Outcome (not the template)');
ok(SP.outcomeFor({ client: "Rizo's Pizzeria", projectId: 'other' }, PN) === null, 'an explicit project link wins over the name');
ok(SP.unusedProof([{ client: "Rizo's Pizzeria", projectId: '' }], [], PN).outcomes.length === 0, 'a name-matched Outcome is not offered as "not on the homepage yet" (no duplicate card)');
