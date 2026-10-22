#!/usr/bin/env node
/**
 * Rules for ticket private notes and screenshots (database.rules.json,
 * storage.rules).
 *   node scripts/test-ticket-rules.mjs
 *
 * Guards: debug notes (agencyTicketNotes) and screenshots (ticketFiles/) are
 * admin-only, exactly like the care plans they belong to, so nothing written
 * there can reach a client.
 */
import fs from 'node:fs';

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };
const rules = JSON.parse(fs.readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8')).rules;

const notes = rules.agencyTicketNotes || {};
ok(!!rules.agencyTicketNotes, 'agencyTicketNotes node exists');
ok(notes['.read'] === rules.agencyMaintenance['.read'], 'agencyTicketNotes: only the admin reads (same as care plans)');
ok(notes['.write'] === rules.agencyMaintenance['.write'], 'agencyTicketNotes: only the admin writes');

const storage = fs.readFileSync(new URL('../storage.rules', import.meta.url), 'utf8');
const start = storage.indexOf('match /ticketFiles/{maintId}/{ref}/{fileName}');
ok(start >= 0, 'storage: ticketFiles/{maintId}/{ref}/{fileName} block exists');
// The block ends at the first closing brace after its opening `{fileName} {`.
const open = storage.indexOf('{', storage.indexOf('{fileName}', start) + 10);
const block = start >= 0 ? storage.slice(start, storage.indexOf('}', open)) : '';
ok(/allow read: if isPortfolioAdmin\(\);/.test(block), 'storage: only the admin reads screenshots');
ok(/allow delete: if isPortfolioAdmin\(\);/.test(block), 'storage: only the admin deletes screenshots');
ok(/allow write: if isPortfolioAdmin\(\)/.test(block) && block.includes('12 * 1024 * 1024') && block.includes("image/.*"), 'storage: admin writes images under 12 MB');
ok(!/if true/.test(block), 'storage: nothing public');
