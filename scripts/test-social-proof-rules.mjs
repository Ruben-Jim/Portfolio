#!/usr/bin/env node
/**
 * RTDB rules for social proof (database.rules.json).
 *   node scripts/test-social-proof-rules.mjs
 *
 * Guards: anyone can read socialProof (the homepage needs it) but only the
 * admin writes it; its fields match exactly what SocialProof.sanitizeEntry
 * writes, so a save is never rejected and nothing extra can be stored;
 * socialProofDetails (raw before/after numbers, notes) is admin-only.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SP = require('../assets/js/social-proof.js');

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };
const rules = JSON.parse(fs.readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8')).rules;
const ADMIN = rules.agencyInstallPages['.write'];

const pub = rules.socialProof;
ok(!!pub, 'socialProof node exists');
if (!pub) process.exit();
ok(pub['.read'] === true, 'socialProof: anyone can read (homepage)');
ok(pub['.write'] === ADMIN, 'socialProof: only the admin writes');
const item = pub.$id || {};
ok(/hasChildren\(\['client', 'published', 'order'\]\)/.test(item['.validate'] || ''), 'entry needs client, published, order');
const ruleFields = Object.keys(item).filter((k) => !k.startsWith('.') && k !== '$other').sort();
const writtenFields = Object.keys(SP.sanitizeEntry({})).sort();
ok(ruleFields.join() === writtenFields.join(), `rule fields match sanitizeEntry (${writtenFields.join(', ')})`);
ok(ruleFields.every((k) => typeof item[k]['.validate'] === 'string'), 'every field is validated');
ok(item.$other && item.$other['.validate'] === false, 'no other fields allowed');
ok(/<= 80/.test(item.client['.validate']) && /length > 0/.test(item.client['.validate']), 'client 1–80');
ok(/<= 12/.test(item.stat['.validate']) && /<= 200/.test(item.summary['.validate']) && /<= 500/.test(item.logoUrl['.validate']), 'stat / summary / logo limits');
ok(/app\|client/.test(item.source['.validate']), 'source is app | client | blank');
ok(/<= 60/.test((item.tagline || {})['.validate'] || ''), 'tagline (bottom line) up to 60');
ok(/isBoolean/.test(item.published['.validate']) && /isNumber/.test(item.order['.validate']), 'published boolean, order number');

const det = rules.socialProofDetails;
ok(!!det && det['.read'] === ADMIN && det['.write'] === ADMIN, 'socialProofDetails: admin only');
