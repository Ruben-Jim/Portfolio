#!/usr/bin/env node
/**
 * Which received emails the Resend inbound webhook keeps. Run from the repo root:
 *   node scripts/test-inbound-address.mjs
 *
 * Guards: mail to the Resend inbound domain or to any @rubenjimenez.dev
 * address lands in the admin Email tab; lookalike domains and subdomains
 * don't.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const A = require('../functions/inbound-address.js');

let fails = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails += 1; };

ok(A.isInboundAddress('replies@ouuldeaulk.resend.app'), 'the Resend inbound domain is kept');
ok(A.isInboundAddress('contact@rubenjimenez.dev'), 'contact@rubenjimenez.dev is kept');
ok(A.isInboundAddress(' Contact@RubenJimenez.dev '), 'case and spaces are ignored');
ok(!A.isInboundAddress('someone@gmail.com'), 'other domains are skipped');
ok(!A.isInboundAddress('contact@notrubenjimenez.dev'), 'a lookalike domain is skipped');
ok(!A.isInboundAddress('bounce@send.rubenjimenez.dev'), 'a subdomain is skipped');
ok(!A.isInboundAddress(''), 'an empty address is skipped');

ok(A.hasInboundRecipient(['someone@gmail.com', 'contact@rubenjimenez.dev']), 'one kept address in the list is enough');
ok(!A.hasInboundRecipient(['someone@gmail.com']), 'a list with no kept address is skipped');
ok(!A.hasInboundRecipient(null), 'a missing list is skipped');

if (fails) {
  console.error(`\n${fails} failing`);
  process.exit(1);
}
console.log('\nAll inbound address checks pass.');
