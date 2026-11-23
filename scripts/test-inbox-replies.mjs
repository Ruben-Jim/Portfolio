// Instant replies + saved replies. Run: node scripts/test-inbox-replies.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const auto = require('../functions/inbox-auto-reply.js');
const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };

const now = Date.UTC(2026, 10, 23, 18);
const meta = { customerName: 'Sam Rivera', customerEmail: 'sam@example.com' };
const contactMsg = { senderRole: 'customer', source: 'contact', body: 'Hi' };
const hireMsg = { senderRole: 'customer', source: 'hire-me', body: 'Need a site' };

ok(auto.isInquiryMessage(contactMsg) && auto.isInquiryMessage(hireMsg), 'contact + Hire Me form messages count');
ok(!auto.isInquiryMessage({ senderRole: 'customer', body: 'follow-up' }), 'a normal chat follow-up does not');
ok(!auto.isInquiryMessage({ senderRole: 'admin', source: 'contact' }), 'your own messages never trigger it');

const c = auto.autoReplyFor({ msg: contactMsg, meta, settings: null, now });
ok(c && c.body.startsWith('Hi Sam!') && !c.body.includes('{name}'), 'contact reply uses the default text with their first name');
const h = auto.autoReplyFor({ msg: hireMsg, meta, settings: null, now });
ok(h && /rubenjimenez\.dev\/schedule/.test(h.body), 'Hire Me reply ends with the booking link');

ok(auto.autoReplyFor({ msg: contactMsg, meta, settings: { enabled: false }, now }) === null, 'switched off → nothing sent');
ok(auto.autoReplyFor({ msg: contactMsg, meta: null, settings: null, now }) === null, 'deleted conversation → nothing sent');
ok(auto.autoReplyFor({ msg: contactMsg, meta: Object.assign({ autoReplyAt: now - 60e3 }, meta), now }) === null, 'within 12 h of the last one → nothing sent');
ok(!!auto.autoReplyFor({ msg: contactMsg, meta: Object.assign({ autoReplyAt: now - 13 * 3600e3 }, meta), now }), 'after 12 h → sends again');

const custom = auto.autoReplyFor({ msg: contactMsg, meta, settings: { contact: 'Yo {name}, {name}!' }, now });
ok(custom && custom.body === 'Yo Sam, Sam!', 'edited text from admin is used, every {name} filled');
ok(auto.fillTemplate('Hi {name}', { name: 'Customer' }) === 'Hi there' && auto.fillTemplate('Hi {name}', {}) === 'Hi there', 'no real name → "there"');
ok(auto.fillTemplate('x'.repeat(5000), {}).length === 1200, 'capped at 1200 characters');
const blank = auto.autoReplyFor({ msg: hireMsg, meta, settings: { hireMe: '   ' }, now });
ok(blank && blank.body === auto.fillTemplate(auto.DEFAULT_AUTO_REPLIES.hireMe, { name: 'Sam' }), 'an empty saved text falls back to the default');

// The admin file carries the same defaults (shown in the Replies window before first save).
const src = readFileSync(new URL('../assets/js/inbox-replies.js', import.meta.url), 'utf8');
const ctx = { window: {}, document: { addEventListener() {} }, console };
vm.runInNewContext(src, ctx);
const api = ctx.window.CWR_INBOX_REPLIES;
ok(api.DEFAULT_AUTO.contact === auto.DEFAULT_AUTO_REPLIES.contact && api.DEFAULT_AUTO.hireMe === auto.DEFAULT_AUTO_REPLIES.hireMe,
  'admin and server default texts match');
ok(api.savedList().length >= 4 && api.savedList().every((r) => r.title && r.body), 'saved replies start with ready-made defaults');
ok(api.fill('Hi {name}', 'Ana Lopez') === 'Hi Ana', 'saved reply fills their first name');
ok(!api.savedList().some((r) => /\$\s?\d/.test(r.body)), 'saved replies never hand-type a price');
