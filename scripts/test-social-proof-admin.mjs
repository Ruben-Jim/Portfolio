#!/usr/bin/env node
/**
 * Admin → Testimonials → Social proof (assets/js/social-proof-admin.js), pure parts.
 *   node scripts/test-social-proof-admin.mjs
 *
 * Guards: the list shows the built-ins until the database has entries; a save
 * writes the public entry and its private details together; saving from the
 * built-ins copies all of them in order; reordering renumbers cleanly; deleting
 * the last entry warns that the built-ins come back; the check-in email asks
 * for one number and the client's OK to share it.
 */
import fs from 'node:fs';
import vm from 'node:vm';

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };
const win = { document: { getElementById: () => null, addEventListener() {} } };
win.window = win;
vm.runInNewContext(fs.readFileSync(new URL('../assets/js/social-proof.js', import.meta.url), 'utf8'), { window: win });
vm.runInNewContext(fs.readFileSync(new URL('../assets/js/social-proof-admin.js', import.meta.url), 'utf8'), { window: win, document: win.document, setTimeout, console });
const T = win.CWR_SOCIAL_PROOF && win.CWR_SOCIAL_PROOF._test;
ok(!!T, 'CWR_SOCIAL_PROOF._test is exposed');
if (!T) process.exit();

// rowsFrom
let rows = T.rowsFrom(null, null);
ok(rows.length === 3 && rows.every((r) => r.builtIn) && rows[0].id === 'builtin-rizo', 'empty database → the 3 built-ins');
rows = T.rowsFrom({ b: { client: 'B', order: 20, published: true }, a: { client: 'A', order: 10, published: false } }, { a: { kind: 'count', count: '86' } });
ok(rows.map((r) => r.id).join() === 'a,b' && !rows[0].builtIn, 'database rows sorted by order');
ok(rows[0].details.kind === 'count' && rows[1].details.kind === 'none', 'details joined by id (missing → none)');

// writePaths
const wp = T.writePaths('x1', { client: 'X' }, { kind: 'none' });
ok(Object.keys(wp).sort().join() === 'socialProof/x1,socialProofDetails/x1', 'save writes public + private together');

// builtInCopyPaths
const built = T.rowsFrom(null, null);
const copy = T.builtInCopyPaths(built, 1000);
ok(Object.keys(copy).length === 6, 'built-in copy writes 3 entries + 3 details');
ok(copy['socialProof/builtin-rizo'].order === 10 && copy['socialProof/builtin-procleaning'].order === 30, 'order kept');
ok(copy['socialProof/builtin-shelton'].updatedAt === 1000 && copy['socialProofDetails/builtin-shelton'].createdAt === 1000, 'timestamps set');
ok(!('id' in copy['socialProof/builtin-rizo']), 'no id field in the stored entry (rules forbid extras)');

// reorder
const re = T.reorder(built, 2, -1);
ok(re.map((r) => r.id).join() === 'builtin-rizo,builtin-procleaning,builtin-shelton', 'move ProCleaning up one');
ok(re.map((r) => r.entry.order).join() === '10,20,30', 'orders renumbered 10, 20, 30');
ok(T.reorder(built, 0, -1).map((r) => r.id).join() === built.map((r) => r.id).join(), 'moving the first row up does nothing');

// deletePaths + confirm text
const dp = T.deletePaths('a');
ok(dp['socialProof/a'] === null && dp['socialProofDetails/a'] === null, 'delete removes both');
ok(/built-in clients will show again/i.test(T.confirmDeleteText({ id: 'a', entry: { client: 'A' } }, [{ id: 'a', builtIn: false }])), 'last entry: warns built-ins come back');
ok(!/built-in/i.test(T.confirmDeleteText({ id: 'a', entry: { client: 'A' } }, [{ id: 'a', builtIn: false }, { id: 'b', builtIn: false }])), 'not last: plain confirm');

// checkInEmail
const m = T.checkInEmail({ client: "Rizo's Pizzeria" });
ok(m.subject === "Quick check-in on Rizo's Pizzeria", 'subject names the client');
ok(/rough number is perfect/i.test(m.message) && /only share it on my site with your OK/i.test(m.message), 'asks for one number and consent');

// ── Social proof tab: prefill helpers ──
const tdoc = T.testimonialFromDoc('t1', { name: ' Roberto Rizo ', title: 'Owner', company: "Rizo's Pizzeria", text: 'Ruben built it.\n\nMore.', rating: 5, createdAt: { toMillis: () => 1234 }, private: { privateNotes: 'secret' } });
ok(tdoc.id === 't1' && tdoc.name === 'Roberto Rizo' && tdoc.createdMs === 1234 && !('private' in tdoc), 'testimonialFromDoc keeps public fields only (no private answers)');
ok(T.testimonialFromDoc('t2', { createdAt: { seconds: 5 } }).createdMs === 5000 && T.testimonialFromDoc('t3', {}).createdMs === 0, 'createdMs from seconds / missing');
const pt = T.prefillFromTestimonial(tdoc);
ok(pt.summary === 'Ruben built it.' && pt.tagline === "Roberto Rizo · Owner, Rizo's Pizzeria", 'use testimonial: their words + who said it');
ok(T.prefillFromOutcome({ outcome: 'Orders online.\n\nMore.' }).summary === 'Orders online.' && !('tagline' in T.prefillFromOutcome({ outcome: 'x' })), 'use outcome: quote only, bottom line untouched');
const nt = T.newEntryFromTestimonial(tdoc);
ok(nt.client === "Rizo's Pizzeria" && nt.published === false && nt.tagline === pt.tagline, 'add testimonial: new draft named after the business');
ok(T.newEntryFromTestimonial({ name: 'Solo Person', text: 'Hi' }).client === 'Solo Person', 'add testimonial with no business: uses the person');
const no = T.newEntryFromOutcome({ id: 'p2', title: 'Shelton Springs HOA', outcome: 'One portal.' });
ok(no.client === 'Shelton Springs HOA' && no.projectId === 'p2' && no.summary === 'One portal.' && no.published === false, 'add outcome: new draft linked to the project');

// Using a testimonial on an entry that shows a number: the quote is filled, but the bottom
// line under the number stays (otherwise the number reads as reported by that person).
ok(JSON.stringify(T.testimonialPrefillFor({ stat: '86' }, tdoc)) === JSON.stringify({ summary: 'Ruben built it.' }), 'number entry: Use testimonial fills the quote only');
ok(T.testimonialPrefillFor({ stat: '' }, tdoc).tagline === "Roberto Rizo · Owner, Rizo's Pizzeria", 'no number: quote + credit');
ok(T.prefillFromOutcome({ id: 'p9', outcome: 'x' }).projectId === 'p9', 'use outcome also links its project (saved on Save)');
