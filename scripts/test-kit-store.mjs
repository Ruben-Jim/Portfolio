#!/usr/bin/env node
/**
 * Template kit store (functions/kit-store.js) with fake Stripe, GitHub and database.
 *   node scripts/test-kit-store.mjs
 *
 * Guards: prices come from the server table, bad input is rejected before Stripe is called,
 * an unknown GitHub user is rejected, a paid order invites the buyer exactly once even when
 * Stripe retries the webhook, a failed invite is recorded and reported, and other events are ignored.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const K = require('../functions/kit-store.js');

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  ✓ ' + msg); else { failures++; console.log('  ✗ ' + msg); } };
const rejects = async (p, status, msg) => {
  try { await p; ok(false, msg + ' (did not throw)'); } catch (e) { ok(e.status === status, msg + ` → ${e.status} ${e.message}`); }
};

function fakeFetch(routes, calls) {
  return async (url, init) => {
    calls.push({ url, method: init.method, body: init.body });
    const path = url.replace('https://api.github.com', '');
    const hit = routes[`${init.method} ${path}`];
    const r = hit || { status: 404, json: { message: 'Not Found' } };
    return { status: r.status, json: async () => r.json };
  };
}

function fakeDb() {
  const data = {};
  return {
    data,
    ref(path) {
      return {
        async transaction(fn) {
          const next = fn(data[path] || null);
          if (next === undefined) return { committed: false };
          data[path] = next;
          return { committed: true };
        },
        async update(patch) { data[path] = Object.assign({}, data[path], patch); },
      };
    },
  };
}

console.log('kit store');

// --- createCheckout ---------------------------------------------------------
const created = [];
const stripe = { paymentIntents: { create: async (p) => { created.push(p); return { client_secret: 'pi_123_secret_abc' }; } } };
const ghCalls = [];
const fetch1 = fakeFetch({ 'GET /users/octocat': { status: 200, json: { login: 'Octocat' } } }, ghCalls);
const deps1 = { stripe, fetch: fetch1, githubToken: 't' };

const out = await K.createCheckout(deps1, { kit: 'courses', email: ' Buyer@Example.com ', github: '@octocat', amount: 1 });
ok(out.clientSecret === 'pi_123_secret_abc', 'returns the client secret');
ok(created[0].amount === K.KITS.courses.amount, 'charges the server price, ignoring any amount sent by the browser');
ok(created[0].metadata.github === 'Octocat' && created[0].metadata.email === 'buyer@example.com', 'stores the canonical GitHub login and a cleaned email');
ok(created[0].receipt_email === 'buyer@example.com', 'Stripe sends the receipt to the buyer');

await rejects(K.createCheckout(deps1, { kit: 'nope', email: 'a@b.co', github: 'octocat' }), 400, 'unknown kit');
await rejects(K.createCheckout(deps1, { kit: 'courses', email: 'not-an-email', github: 'octocat' }), 400, 'bad email');
await rejects(K.createCheckout(deps1, { kit: 'courses', email: 'a@b.co', github: 'bad name!' }), 400, 'bad GitHub username');
await rejects(K.createCheckout(deps1, { kit: 'courses', email: 'a@b.co', github: 'ghost-user' }), 400, 'GitHub user that does not exist');
ok(created.length === 1, 'Stripe is never called for rejected input');
await rejects(K.createCheckout(deps1, { kit: '__proto__', email: 'a@b.co', github: 'octocat' }), 400, 'prototype keys are not kits');

// --- handleStripeEvent --------------------------------------------------------
function event(over) {
  return {
    type: 'payment_intent.succeeded',
    data: { object: Object.assign({ id: 'pi_1', amount_received: 3900, currency: 'usd', receipt_email: 'buyer@example.com',
      metadata: { kit: 'courses', github: 'Octocat', email: 'buyer@example.com' } }, over) },
  };
}

const db = fakeDb();
const emails = [];
const notices = [];
const calls2 = [];
const deps2 = {
  db, githubToken: 't', now: 1000,
  fetch: fakeFetch({ 'PUT /repos/Ruben-Jim/courses-kit-pro/collaborators/Octocat': { status: 201, json: {} } }, calls2),
  sendEmail: async (m) => emails.push(m),
  notify: async (o) => notices.push(o),
};

ok(await K.handleStripeEvent(deps2, event()) === 'invited', 'paid order → invited');
ok(JSON.parse(calls2[0].body).permission === 'pull', 'invite is read-only');
ok(db.data['kitOrders/pi_1'].status === 'invited', 'order recorded as invited');
ok(emails.length === 1 && emails[0].to === 'buyer@example.com' && emails[0].html.includes('/invitations'), 'buyer gets the invite link');
ok(notices.length === 1 && notices[0].invited, 'Ruben is notified');
ok(await K.handleStripeEvent(deps2, event()) === 'duplicate', 'Stripe retry → no second invite');
ok(calls2.length === 1 && emails.length === 1, 'nothing sent twice');

ok((await K.handleStripeEvent(deps2, event({ id: 'pi_2', amount_received: 100 }))) === 'ignored:underpaid', 'underpaid intent ignored');
ok((await K.handleStripeEvent(deps2, event({ id: 'pi_3', metadata: {} }))) === 'ignored:not-a-kit', 'non-kit payment ignored');
ok((await K.handleStripeEvent(deps2, { type: 'charge.refunded', data: { object: {} } })).startsWith('ignored'), 'other event types ignored');

const db3 = fakeDb();
const notices3 = [];
const deps3 = Object.assign({}, deps2, { db: db3, fetch: fakeFetch({}, []), notify: async (o) => notices3.push(o), sendEmail: async () => {} });
const s3 = await K.handleStripeEvent(deps3, event({ id: 'pi_4' }));
ok(s3.startsWith('invite_failed') && db3.data['kitOrders/pi_4'].status === 'invite_failed', 'failed invite is recorded');
ok(notices3.length === 1 && notices3[0].invited === false, 'Ruben is told the invite failed');
ok(K.saleNotice(notices3[0]).title.includes('FAILED'), 'push says FAILED');

const db4 = fakeDb();
const deps4 = Object.assign({}, deps2, { db: db4, fetch: async () => { throw new Error('network'); }, sendEmail: async () => {}, notify: async () => {} });
ok((await K.handleStripeEvent(deps4, event({ id: 'pi_5' }))).startsWith('invite_failed'), 'network error on invite does not throw');

const html = K.buyerEmail({ id: 'pi_x', kitName: 'Courses Kit Pro', repo: 'a/b', github: '<script>', email: 'x@y.z', amount: 3900, invited: true }).html;
ok(!html.includes('<script>') && html.includes('$39'), 'buyer email escapes input and shows the price');

if (failures) { console.log(`\n✗ ${failures} kit store check(s) failed`); process.exit(1); }
console.log('\n✓ kit store');
