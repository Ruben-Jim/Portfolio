#!/usr/bin/env node
/**
 * Admin push notifications (functions/admin-push.js, admin-sw.js, rules).
 *   node scripts/test-admin-push.mjs
 *
 * Guards: each event turns into the right short notification (or none), the
 * per-type switches are honoured, dead device tokens are dropped, the morning
 * reminder only fires when something is due, the service worker always shows
 * a notification and opens admin on the item, and the push data is admin-only.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const P = require('../functions/admin-push.js');

let fails = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails += 1; };
const NOW = Date.parse('2026-10-30T16:00:00Z'); // 9:00 AM Pacific

// ── Switches ─────────────────────────────────────────────────────────────
ok(P.prefOn(null, 'messages') === true, 'a missing switch counts as on');
ok(P.prefOn({ bookings: false }, 'bookings') === false, 'a switch set off is off');
ok(P.prefOn({ bookings: false }, 'messages') === true, 'other switches stay on');

// ── Messages ─────────────────────────────────────────────────────────────
const chat = P.forDmMessage('C1', { senderRole: 'customer', senderName: 'Maria Lopez', body: 'Do you build booking sites for barbers? I have two shops and want one site for both of them plus a deposit', createdAt: NOW - 2000 }, {}, NOW);
ok(chat && chat.type === 'messages', 'a customer chat message is a Messages alert');
ok(chat && chat.title === 'Message from Maria Lopez', 'chat title names the sender');
ok(chat && chat.body.length <= 101 && chat.body.endsWith('…'), 'long bodies are clipped to ~100 characters');
ok(chat && chat.url === '/admin?open=conversation&id=C1', 'chat opens that conversation');
ok(chat && chat.tag === 'dm-C1', 'messages in one thread replace each other');
ok(P.forDmMessage('C1', { senderRole: 'admin', body: 'hi', createdAt: NOW }, {}, NOW) === null, 'your own replies never push');
ok(P.forDmMessage('C1', { senderRole: 'customer', body: 'old', createdAt: NOW - 11 * 60e3 }, {}, NOW) === null, 'old / migrated messages never push');
ok(P.forDmMessage('C2', { senderRole: 'customer', senderName: 'Tony', body: 'Need a site', source: 'hire-me', createdAt: NOW }, {}, NOW).title === 'Hire Me request · Tony', 'Hire Me gets its own title');
ok(P.forDmMessage('C3', { senderRole: 'customer', senderName: 'Ana', body: 'Hello', source: 'contact', createdAt: NOW }, {}, NOW).title === 'Contact message · Ana', 'contact form gets its own title');
ok(P.forDmMessage('C4', { senderRole: 'customer', body: '', attachmentUrl: 'https://x/y.png', createdAt: NOW }, { customerName: 'Sam' }, NOW).body === 'Sent a file', 'an attachment says so; name falls back to the thread');

const mail = P.forInboundEmail('E1', { fromName: 'Ana Ruiz', fromEmail: 'ana@ruiz.test', subject: 'Invoice question', text: 'Hi Ruben,\n\nquick one about the invoice' });
ok(mail.type === 'messages' && mail.title === 'Email · Ana Ruiz', 'inbound email names the sender');
ok(mail.body.startsWith('Invoice question'), 'inbound email body starts with the subject');
ok(mail.url === '/admin?open=email&id=E1&from=ana%40ruiz.test', "inbound email opens that sender's thread");
ok(P.forInboundEmail('E2', { fromEmail: 'x@y.test', subject: '' }).title === 'Email · x@y.test', 'no name: the address');

ok(P.forOutboundEvent({ type: 'email.delivered', to: ['a@b.test'] }) === null, 'delivered emails are quiet');
const bounce = P.forOutboundEvent({ type: 'email.bounced', to: ['a@b.test'], subject: 'Your proposal' });
ok(bounce && bounce.type === 'messages' && /bounced/i.test(bounce.title) && bounce.body.includes('a@b.test'), 'a bounce pushes with the address');

// ── Bookings ─────────────────────────────────────────────────────────────
const book = P.forBooking('B1', { name: 'Lee Tacos', email: 'sam@tacos.test', callTypeLabel: 'Discovery call', startISO: '2026-11-04T18:00:00Z' });
ok(book.type === 'bookings' && book.title === 'Call booked · Lee Tacos', 'a booking names the person');
ok(/Wed, Nov 4/.test(book.body) && /10:00\sAM/.test(book.body), 'booking time is shown in Pacific time');
ok(book.body.includes('Discovery call'), 'booking shows the call type');
ok(book.url === '/admin?open=booking&id=B1', 'booking opens the planner');

// ── Client portal ────────────────────────────────────────────────────────
const tk = P.forPortal({ action: 'submitTicket', clientName: 'Shelton Springs', projectId: 'PA', ref: 'SS-007', title: 'Gate code broken' });
ok(tk.type === 'portal' && tk.title === 'New ticket · Shelton Springs' && tk.body === 'SS-007 · Gate code broken', 'a new ticket names client, ref and subject');
ok(tk.url === '/admin?open=client&id=PA', 'portal alerts open the client');
ok(/still not working/i.test(P.forPortal({ action: 'replyTicket', clientName: 'X', projectId: 'P', ref: 'R1', verdict: 'not-working' }).body), 'a "still not working" reply says so');
ok(/looks good/i.test(P.forPortal({ action: 'replyTicket', clientName: 'X', projectId: 'P', ref: 'R1', verdict: 'ok' }).body), 'a "looks good" reply says so');
ok(P.forPortal({ action: 'signContract', clientName: 'X', projectId: 'P', signedByName: 'Jane' }).title === 'Contract signed · X', 'contract signed');
ok(/Standard/.test(P.forPortal({ action: 'requestPlan', clientName: 'X', projectId: 'P', tier: 'standard', billing: 'annual' }).body), 'care plan request names the plan');
ok(P.forPortal({ action: 'load', clientName: 'X' }) === null, 'just opening the portal is quiet');

// ── Reviews ──────────────────────────────────────────────────────────────
const rev = P.forReview('T1', { name: 'Rizo', rating: 5, text: 'Orders doubled after launch.' });
ok(rev.type === 'reviews' && rev.title === 'New review · Rizo' && rev.body.startsWith('★★★★★'), 'a review shows its stars');

// ── Morning reminder ─────────────────────────────────────────────────────
const today = P.pacificTodayKey(NOW);
ok(today === '2026-10-30', 'today is computed in Pacific time');
ok(P.pacificTodayKey(Date.parse('2026-10-31T05:30:00Z')) === '2026-10-30', 'late evening Pacific is still today');
ok(P.dailyDigest({ leads: {}, studioCosts: {} }, today) === null, 'nothing due: no reminder');
const digest = P.dailyDigest({
  leads: {
    L1: { name: 'Maria Lopez', stage: 'lead', followUpAt: '2026-10-28' },
    L2: { company: 'Ruiz Cleaning', stage: 'proposal', followUpAt: '2026-10-30' },
    L3: { name: 'Later', stage: 'lead', followUpAt: '2026-11-02' },
    L4: { name: 'Won', stage: 'deposit', followUpAt: '2026-10-01' }
  },
  studioCosts: {
    S1: { name: 'EAS Production', amount: 99, status: 'active', renewalDate: '2026-11-03' },
    S2: { name: 'Paused tool', amount: 10, status: 'paused', renewalDate: '2026-11-01' },
    S3: { name: 'Far off', amount: 5, status: 'active', renewalDate: '2026-12-30' }
  }
}, today);
ok(digest && digest.type === 'daily', 'something due: a reminder');
ok(digest && digest.title === 'Today: 2 follow-ups · 1 renewal', 'reminder title counts follow-ups and renewals');
ok(digest && digest.body.includes('Maria Lopez') && digest.body.includes('2d overdue') && digest.body.includes('Ruiz Cleaning'), 'reminder lists who to follow up');
ok(digest && digest.body.includes('EAS Production') && !digest.body.includes('Paused tool') && !digest.body.includes('Far off'), 'only active costs renewing within 7 days');
ok(digest && !digest.body.includes('Won') && !digest.body.includes('Later'), 'won leads and future follow-ups are left out');

// ── FCM message ──────────────────────────────────────────────────────────
const msg = P.toFcmMessage('tok', chat);
ok(msg.token === 'tok', 'message goes to the device token');
ok(Object.values(msg.data).every((v) => typeof v === 'string'), 'every data value is a string (FCM rule)');
ok(msg.data.title === chat.title && msg.data.url === chat.url && msg.data.tag === chat.tag, 'data carries title, url and tag for the worker');
ok(msg.webpush && msg.webpush.headers && msg.webpush.headers.Urgency === 'high', 'web push urgency is high');
ok(!msg.notification && !(msg.webpush && msg.webpush.notification), 'data-only: the worker shows it (no double notification)');

// ── Sending ──────────────────────────────────────────────────────────────
function fakeDb(data) {
  const removed = [];
  const at = (p) => p.split('/').filter(Boolean).reduce((o, k) => (o == null ? undefined : o[k]), data);
  return {
    removed,
    ref(p) {
      return {
        once: async () => ({ val: () => (at(p) === undefined ? null : JSON.parse(JSON.stringify(at(p)))) }),
        remove: async () => { removed.push(p); },
        update: async () => {}
      };
    }
  };
}
function fakeMessaging(deadTokens) {
  const sent = [];
  return {
    sent,
    async send(m) {
      if (deadTokens.includes(m.token)) {
        const e = new Error('gone'); e.code = 'messaging/registration-token-not-registered'; throw e;
      }
      sent.push(m);
      return 'id';
    }
  };
}
{
  const db = fakeDb({ adminPushDevices: { d1: { token: 't1' }, d2: { token: 't2' }, d3: { token: '' } }, adminPushPrefs: { bookings: false } });
  const fm = fakeMessaging(['t2']);
  const r = await P.sendAdminPush(db, fm, chat);
  ok(fm.sent.length === 1 && fm.sent[0].token === 't1', 'sends to each live device');
  ok(r.sent === 1 && r.removed === 1, 'reports sent and removed');
  ok(db.removed.includes('adminPushDevices/d2'), 'a dead token is removed');
  const fm2 = fakeMessaging([]);
  const r2 = await P.sendAdminPush(db, fm2, book);
  ok(fm2.sent.length === 0 && r2.skipped === 'off', 'a switched-off type sends nothing');
  const fm3 = fakeMessaging([]);
  await P.sendAdminPush(db, fm3, Object.assign({}, book), { ignorePrefs: true });
  ok(fm3.sent.length === 2, 'the test push ignores the switches');
  const r4 = await P.sendAdminPush(fakeDb({}), fakeMessaging([]), chat);
  ok(r4.sent === 0 && r4.skipped === 'no-devices', 'no devices: nothing sent, no error');
  const r5 = await P.sendAdminPush(db, fakeMessaging([]), null);
  ok(r5.sent === 0, 'no notification: nothing sent');
  const boom = { async send() { const e = new Error('quota'); e.code = 'messaging/internal-error'; throw e; } };
  const r6 = await P.sendAdminPush(fakeDb({ adminPushDevices: { d1: { token: 't1' } } }), boom, chat);
  ok(r6.sent === 0 && r6.removed === 0, 'other send errors keep the device');
}

// ── Service worker ───────────────────────────────────────────────────────
{
  const src = fs.readFileSync(new URL('../admin-sw.js', import.meta.url), 'utf8');
  const handlers = {};
  const shown = [];
  const posted = [];
  const opened = [];
  let windows = [];
  const self = {
    location: { origin: 'https://rubenjimenez.dev' },
    addEventListener: (t, fn) => { handlers[t] = fn; },
    registration: { showNotification: async (title, opts) => { shown.push({ title, opts }); } },
    clients: {
      matchAll: async () => windows,
      openWindow: async (u) => { opened.push(u); },
      claim: async () => {}
    },
    skipWaiting: () => {}
  };
  vm.runInNewContext(src, { self, URL, console });
  const run = async (type, ev) => {
    let p = null;
    ev.waitUntil = (x) => { p = x; };
    handlers[type](ev);
    await p;
  };
  ok(typeof handlers.push === 'function' && typeof handlers.notificationclick === 'function', 'worker listens for push and taps');
  await run('push', { data: { json: () => ({ data: { title: 'Message from Maria', body: 'Hi', url: '/admin?open=conversation&id=C1', tag: 'dm-C1' }, from: '980239353589' }) } });
  ok(shown.length === 1 && shown[0].title === 'Message from Maria' && shown[0].opts.body === 'Hi', 'a push shows its title and text');
  ok(shown[0].opts.data && shown[0].opts.data.url === '/admin?open=conversation&id=C1' && shown[0].opts.tag === 'dm-C1', 'the notification keeps the link and tag');
  await run('push', { data: { json: () => { throw new Error('not json'); } } });
  ok(shown.length === 2 && shown[1].title === 'CWR Admin', 'an unreadable push still shows something (iOS rule)');
  await run('push', { data: { json: () => ({ notification: { title: 'N', body: 'B' } }) } });
  ok(shown[2].title === 'N' && shown[2].opts.body === 'B', 'a notification-style payload works too');

  const closed = [];
  const tap = (url) => ({ notification: { data: { url }, close: () => closed.push(1) } });
  windows = [{ url: 'https://rubenjimenez.dev/admin', focus: async () => {}, postMessage: (m) => posted.push(m) }];
  await run('notificationclick', tap('/admin?open=email&id=E1'));
  ok(closed.length === 1, 'a tap closes the notification');
  ok(posted.length === 1 && posted[0].type === 'cwr-push-open' && posted[0].url === '/admin?open=email&id=E1', 'an open admin window is told where to go (no reload)');
  windows = [];
  await run('notificationclick', tap('/admin?open=booking&id=B1'));
  ok(opened.length === 1 && opened[0] === 'https://rubenjimenez.dev/admin?open=booking&id=B1', 'no admin window: opens one on the item');
  await run('notificationclick', tap('https://evil.test/phish'));
  ok(opened[1] === 'https://rubenjimenez.dev/admin', 'links outside admin are never opened');
}

// ── Rules ────────────────────────────────────────────────────────────────
{
  const rules = JSON.parse(fs.readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8')).rules;
  const adminRead = rules.pipelineLeads['.read'];
  const adminWrite = rules.pipelineLeads['.write'];
  for (const k of ['adminPushDevices', 'adminPushPrefs']) {
    ok(!!rules[k] && rules[k]['.read'] === adminRead && rules[k]['.write'] === adminWrite, k + ': admin-only read and write');
  }
  ok(!!rules.adminPushTest && rules.adminPushTest['.write'] === adminWrite && !rules.adminPushTest['.read'], 'adminPushTest: admin writes, nobody reads');
}

if (fails) {
  console.error(`\n${fails} failing`);
  process.exit(1);
}
console.log('\nAll admin push checks pass.');
