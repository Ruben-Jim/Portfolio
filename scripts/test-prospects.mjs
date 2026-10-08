#!/usr/bin/env node
/**
 * Prospects logic test. Run from the repo root:
 *   node scripts/test-prospects.mjs
 *
 * Guards: CSV/TSV parsing (quotes, commas, BOM), header mapping, "NONE"
 * websites, dedupe against prospects + pipeline + the import itself, and the
 * follow-up cadence (3 days → day 7 → nurture 30 days).
 */
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = vm.createContext({ console, Date, setTimeout });
vm.runInContext('var window = this;' + fs.readFileSync('assets/js/prospects.js', 'utf8'), ctx);
const T = ctx.CWR_PROSPECTS._test;

let fails = 0;
function ok(cond, msg) {
  console.log((cond ? '✓ ' : '✗ ') + msg);
  if (!cond) fails += 1;
}

// ——— parsing ———
const csv = '﻿#,Niche,Business,Phone,Google reviews,Website,What we found,Script,How to contact\n' +
  '1,Tree,Maldonado Brothers Tree Service,(559) 550-4950,539 (4.9),maldonadobrothers.com,"Biggest crew, Google Sites",tree-fresno,Call 7:30-9am\n' +
  '2,Groomer,Poodle Town USA,(559) 222-3749,170 (4.6),NONE,No website,no-site-ig,WALK IN\n' +
  'BACKUP,Exterior,Larry\'s Can Cleaning,(559) 301-7811,none,NONE,No website,no-site-ig-trades,\n' +
  '12,Exterior,Pristine Appearance,(559) 575-4917,35 (5.0),pristineappearance.us,Site error,site-down (if broken),Call\n';
const rows = T.parseTable(csv);
ok(rows.length === 5, 'parses header + 4 rows (got ' + rows.length + ')');
ok(rows[1][6] === 'Biggest crew, Google Sites', 'quoted comma stays in one field');

const { records, error } = T.rowsToProspects(rows, { city: 'Fresno', list: 'test' });
ok(!error && records.length === 4, 'maps 4 records');
ok(records[0].business === 'Maldonado Brothers Tree Service' && records[0].scriptId === 'tree-fresno', 'business + script mapped');
ok(records[0].city === 'Fresno', 'default city filled');
ok(records[1].website === '', '"NONE" website becomes empty');
ok(records[2].order >= 900, 'BACKUP row sorts after numbered rows');
ok(records[3].scriptId === 'site-down', 'script note "(if broken)" stripped');

const tsv = 'Business\tPhone\tNiche\nValley Tree Co\t559-555-0100\tTree\n';
const t = T.rowsToProspects(T.parseTable(tsv), {});
ok(t.records.length === 1 && t.records[0].phone === '559-555-0100', 'tab-separated paste parses');

ok(T.rowsToProspects(T.parseTable('Phone,Niche\n1,2\n'), {}).error !== '', 'missing Business header is an error');

// Real list from the 2026-10-08 session, if it's on disk.
const real = process.argv[2];
if (real && fs.existsSync(real)) {
  const r = T.rowsToProspects(T.parseTable(fs.readFileSync(real, 'utf8')), { city: 'Fresno' });
  ok(!r.error && r.records.length === 33, 'real lead list imports 33 rows (got ' + r.records.length + ')');
}

// ——— dedupe ———
const existing = [{ id: 'a', business: 'Poodle Town USA', phone: '' }];
const leads = [{ id: 'L1', company: 'Other Name', phone: '559.550.4950' }];
const extra = Object.assign({}, records[3], { business: 'Pristine Appearance LLC' });
const d = T.dedupe(records.concat([extra]), existing, leads);
ok(d.dupes.length === 3, 'dupes: by name, by pipeline phone, and within the import (got ' + d.dupes.length + ')');
ok(d.fresh.length === 2, 'two fresh rows left (got ' + d.fresh.length + ')');

// ——— cadence ———
const day = (s) => new Date(s + 'T10:00:00');
const at = (s) => day(s).getTime();
let p = { status: 'new', touches: {} };
let r1 = T.applyOutcome(p, 'no-answer', day('2026-10-08'));
ok(r1.status === 'working' && r1.nextAt === '2026-10-11', 'first touch → follow up in 3 days');

p = { status: 'working', touches: { x: { at: at('2026-10-08'), kind: 'no-answer' } } };
r1 = T.applyOutcome(p, 'texted', day('2026-10-08'));
ok(r1.nextAt === '2026-10-11', 'second touch the same day still counts as day 1');

r1 = T.applyOutcome(p, 'texted', day('2026-10-11'));
ok(r1.status === 'working' && r1.nextAt === '2026-10-15', 'second day → day 7');

p.touches.y = { at: at('2026-10-11'), kind: 'texted' };
r1 = T.applyOutcome(p, 'voicemail', day('2026-10-15'));
ok(r1.status === 'nurture' && r1.nextAt === '2026-11-14', 'third day → nurture 30 days');

ok(T.applyOutcome(p, 'wants-mockup', day('2026-10-15')).status === 'mockup', 'wants mockup → mockup');
ok(T.applyOutcome(p, 'not-interested', day('2026-10-15')).nextAt === '', 'not interested → closed, no follow-up');
ok(T.applyOutcome({ status: 'replied', touches: {} }, 'texted', day('2026-10-15')).status === 'replied',
  'outbound touch never downgrades a reply');

// ——— due + scoreboard ———
const today = '2026-10-15';
ok(T.isDue({ status: 'new' }, today), 'new is due');
ok(T.isDue({ status: 'working', nextAt: '2026-10-14' }, today), 'overdue follow-up is due');
ok(!T.isDue({ status: 'working', nextAt: '2026-10-16' }, today), 'future follow-up not due');
ok(!T.isDue({ status: 'dead', nextAt: '2026-10-01' }, today), 'closed is never due');

const sorted = T.sortProspects([
  { id: 'n2', status: 'new', order: 2 },
  { id: 'f', status: 'working', nextAt: '2026-10-14' },
  { id: 'n1', status: 'new', order: 1 },
  { id: 'later', status: 'working', nextAt: '2026-10-20' }
], today).map((x) => x.id).join(',');
ok(sorted === 'f,n1,n2,later', 'sort: due follow-ups, then new by order, then later (got ' + sorted + ')');

const now = new Date();
const sb = T.scoreboard([
  { niche: 'Tree', status: 'replied', touches: { a: { at: now.getTime(), kind: 'talked' } } },
  { niche: 'Tree', status: 'working', touches: { a: { at: now.getTime(), kind: 'no-answer' } } },
  { niche: 'Groomer', status: 'new' }
], now);
ok(sb.contactedToday === 2 && sb.repliesToday === 1, 'scoreboard counts businesses contacted + replies today');
const tree = sb.niches.find((n) => n.niche === 'Tree');
ok(tree.contacted === 2 && tree.replied === 1, 'per-niche contacted / replied');

const out = T.toCsv([{ business: 'A, "B"', status: 'new', touches: {} }]);
ok(out.split('\n')[1].startsWith('"A, ""B"""'), 'export escapes commas and quotes');

console.log(fails ? '\n' + fails + ' failed' : '\nall passed');
process.exit(fails ? 1 : 0);
