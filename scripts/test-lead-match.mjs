#!/usr/bin/env node
/**
 * Shared lead matching. Run from the repo root:
 *   node scripts/test-lead-match.mjs
 *
 * Guards: the same business matches across prospects / leads / inquiries by
 * phone, email or business name (never a person's name alone), prospect
 * touches carry over without duplicates, fill-blanks never overwrites, stages
 * only move forward — and functions/lead-match.js is an exact copy.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const M = require('../assets/js/lead-match.js');

let fails = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails += 1; };

ok(M.isSame({ phone: '+1 (559) 555-0101' }, { phone: '5595550101' }), 'phone matches across formats');
ok(M.isSame({ email: 'Owner@Shop.com ' }, { email: 'owner@shop.com' }), 'email matches case-insensitively');
ok(M.isSame({ business: 'Valley Lawn Co.' }, { company: 'valley lawn' }), 'prospect business matches lead company');
ok(M.isSame({ business: 'A & B Pressure Washing' }, { company: 'A and B Pressure Washing' }), '& and "and" match');
ok(!M.isSame({ name: 'Maria' }, { name: 'Maria' }), 'a person name alone is not a match');
ok(!M.isSame({ phone: '555-0101' }, { phone: '555-0101' }), 'short phone numbers are not a match');
ok(!M.isSame({ business: 'Shack In The Back' }, { company: 'Bark Avenue' }), 'different businesses do not match');

const pool = [{ id: 'a', company: 'Bark Avenue' }, { id: 'b', email: 'hi@shack.com' }];
ok(M.findMatch({ email: 'HI@shack.com', business: 'Shack' }, pool).id === 'b', 'findMatch returns the matching record');
ok(M.findMatch({ business: 'Nope' }, pool) === null, 'findMatch returns null with no match');

const touches = {
  t1: { at: 1000, kind: 'texted' },
  t2: { at: 3000, kind: 'texted', note: 'bump' },
  t3: { at: 2000, kind: 'voicemail' },
  t4: { at: 2500, kind: 'dm' },
  t5: { at: 4000, kind: 'replied' }
};
const out = M.outreachFromTouches(touches, { email: 500 });
ok(out.text === 3000 && out.call === 2000 && out.dm === 2500 && out.email === 500, 'touches become latest-per-method outreach, keeping existing');
const hist = M.mergeHistory(null, touches, 'prospect');
ok(Object.keys(hist).length === 5, 'history carries every touch');
ok(Object.values(hist).every(h => h.from === 'prospect'), 'carried history is marked from prospect');
const again = M.mergeHistory(hist, touches, 'prospect');
ok(Object.keys(again).length === 5, 'merging the same touches twice does not duplicate');

ok(JSON.stringify(M.fillBlanks({ name: 'Ann', phone: '', value: 0 }, { name: 'Bob', phone: '559', value: 699 })) === '{"phone":"559","value":699}',
  'fillBlanks only fills empty fields');
ok(M.laterStage('discovery-call', 'lead') === 'discovery-call', 'stage never moves backward');
ok(M.laterStage('lead', 'discovery-call') === 'discovery-call', 'stage moves forward');

const a = fs.readFileSync('assets/js/lead-match.js', 'utf8');
const b = fs.existsSync('functions/lead-match.js') ? fs.readFileSync('functions/lead-match.js', 'utf8') : '';
ok(a === b, 'functions/lead-match.js is an exact copy (run: cp assets/js/lead-match.js functions/)');

if (fails) { console.log(`\n${fails} failed`); process.exit(1); }
