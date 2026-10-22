#!/usr/bin/env node
/**
 * Ticket rules shared by Admin → client drawer and the client portal
 * (assets/js/ticket-shared.js).
 *   node scripts/test-tickets.mjs
 *
 * Guards: both sides read status, source, kind, reply time, reference numbers
 * and linked hours the same way; old tickets (plain strings, no source/kind)
 * still read; the portal's reference numbers match the server's.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const T = require('../assets/js/ticket-shared.js');
const { makeTicketRef } = require('../functions/portal-api.js');

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };

// ── Status ──
ok(T.statusKey('done') === 'resolved' && T.statusKey('closed') === 'resolved', 'old done/closed read as resolved');
ok(T.statusKey('progress') === 'in-progress', 'old progress reads as in-progress');
ok(T.statusKey('check') === 'check', 'check is its own status');
ok(T.statusKey(undefined) === 'open' && T.statusKey('weird') === 'open', 'missing or unknown status reads as open');
ok(T.STATUSES.join() === 'open,in-progress,check,resolved', 'four statuses in order');
ok(T.statusLabel('check') === 'Ready for you to check', 'check label');
ok(T.statusLabel('in-progress') === 'In progress' && T.statusLabel('resolved') === 'Resolved' && T.statusLabel() === 'Open', 'existing labels kept');
const cycle = ['open', 'in-progress', 'check', 'resolved'].map((s) => T.nextStatus(s).key + '/' + T.nextStatus(s).label);
ok(cycle.join() === 'in-progress/Start,check/Ready to check,resolved/Resolve,open/Reopen', 'drawer button cycles Start → Ready to check → Resolve → Reopen');

// ── Source and kind ──
ok(T.sourceKey('') === 'portal' && T.sourceKey(undefined) === 'portal', 'no source means the portal (old tickets)');
ok(T.sourceKey('text') === 'text' && T.sourceKey('fax') === 'portal', 'known sources kept, unknown ones fall back');
ok(T.sourceLabel('in-person') === 'In person' && T.sourceLabel('text') === 'Text', 'source labels');
ok(T.SOURCES.map((s) => s.key).join() === 'text,email,call,in-person,portal', 'source choices in step order');
ok(T.kindKey('nope') === '' && T.kindKey('bug') === 'bug', 'unknown kind is blank');
ok(T.kindLabel('bug') === 'Bug fix' && T.kindLabel('change') === 'Change request' && T.kindLabel('question') === 'Question' && T.kindLabel('') === '', 'kind labels');
ok(T.AREAS.length === 7 && T.AREAS[0] === 'Booking / scheduling' && T.AREAS[6] === 'Something else', 'the portal\'s seven areas');

// ── Reply time ──
ok(T.slaWords(48) === 'Reply within 2 business days', '48h → 2 business days');
ok(T.slaWords(3) === 'Reply within 3 business hours' && T.slaWords(1) === 'Reply within 1 business hour', 'business hours');
ok(T.slaWords(24) === 'Reply within 24 hours' && T.slaWords(30) === 'Reply within 30 hours', '24h and odd hours');
ok(T.slaWords(0, 'X') === 'X' && T.slaWords(0) === 'No response time set', 'no hours → fallback');
ok(T.responseWords({ down: true }, { planTier: 'standard', slaHours: 48 }) === 'Reply within 4 hours', 'down on Standard → 4 hours');
ok(T.responseWords({ down: true }, { planTier: 'essential', slaHours: 120 }) === 'Reply within 1 business day', 'down on Essential → 1 business day');
ok(T.responseWords({ down: true }, { planTier: 'priority', slaHours: 3 }) === 'Reply within 2 hours', 'down on Priority → 2 hours');
ok(T.responseWords({ down: false }, { planTier: 'standard', slaHours: 48 }) === 'Reply within 2 business days', 'not down → the plan\'s regular reply time');

// ── Reference numbers match the server ──
ok(T.makeRef({ clientName: 'Pro Cleaning' }, [{ ref: 'CWR-PRC-003' }]) === 'CWR-PRC-004', 'next number after the highest');
[
  [{ clientName: 'Shelton Springs HOA' }, [{ ref: 'CWR-SSH-009' }, { ref: 'CWR-SSH-002' }]],
  [{ clientName: 'Rizo' }, []],
  [{ clientName: '', id: '-Nab12' }, ['plain old string']]
].forEach(([m, list]) => ok(T.makeRef(m, list) === makeTicketRef(m, list), 'same ref as the server for "' + m.clientName + '"'));

// ── Normalizing ──
const s = T.normalizeTicket('Old string');
ok(s.title === 'Old string' && s.status === 'open' && s.source === 'portal', 'a plain-string ticket still reads');
ok(T.normalizeTicket({}).shareWriteup === true && T.normalizeTicket({}).title === 'Ticket', 'write-up shown by default, title fallback');
ok(T.normalizeTicket({ shareWriteup: false }).shareWriteup === false, 'write-up switch off is kept');
ok(T.normalizeTicket({ title: 'x'.repeat(200) }).title.length === 120, 'title clamped to 120');
ok(T.normalizeTicket({ found: 'f'.repeat(3000) }).found.length === 2000, 'write-up clamped to 2000');
ok(T.normalizeTicket({ down: 'yes' }).down === false && T.normalizeTicket({ down: true }).down === true, 'down only when true');
ok(T.normalizeTicket({ subject: 'Legacy' }).title === 'Legacy', 'legacy subject field read as title');

// ── List order ──
const rows = T.listRows([
  { ref: 'A', status: 'resolved', createdAt: '2026-10-20T10:00:00Z' },
  { ref: 'B', status: 'open', createdAt: '2026-10-01T10:00:00Z' },
  { ref: 'C', status: 'check', createdAt: '2026-10-10T10:00:00Z' }
]);
ok(rows.map((r) => r.ref + r.i).join() === 'C2,B1,A0', 'unresolved first, newest first, original index kept');

ok(T.findTicketIndex([{ ref: 'A' }, { ref: 'B' }], 'B') === 1 && T.findTicketIndex([{ ref: 'A' }], 'Z') === -1, 'find by ref');
ok(T.findTicketIndex(['plain', null, { ref: 'B' }], 'B') === 2, 'find by ref skips old string entries');

// ── Write-up sections ──
const secs = T.writeupSections({ details: 'd', found: 'f', howToCheck: '' }, { includeReport: true });
ok(secs.map((x) => x.label).join() === 'You told us,What we found', 'only filled sections, in order');
ok(T.writeupSections({ details: 'd', fixed: 'x' }).map((x) => x.label).join() === 'What we fixed', 'report left out unless asked for');

// ── Linked hours ──
const entries = [
  { kind: 'maint', maintenanceId: 'M', ticketRef: 'R', loggedHours: 1.25 },
  { kind: 'maint', maintenanceId: 'M', ticketRef: 'R', loggedHours: 0.3 },
  { kind: 'maint', maintenanceId: 'M', ticketRef: 'X', loggedHours: 5 },
  { kind: 'maint', maintenanceId: 'N', ticketRef: 'R', loggedHours: 7 },
  { kind: 'build', maintenanceId: 'M', ticketRef: 'R', loggedHours: 9 }
];
ok(T.ticketHours(entries, 'M', 'R') === 1.6, 'hours = this plan\'s maint entries linked to this ticket, rounded like the planner');
ok(T.ticketHours([], 'M', 'R') === 0 && T.ticketHours(null, 'M', 'R') === 0, 'no entries → 0');
