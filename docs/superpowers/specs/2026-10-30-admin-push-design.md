# Admin home-screen app + push notifications — design

Date: 2026-10-30 · Status: approved in chat (Ruben), building

## Intent
Ruben runs the studio from his phone. He wants the admin dashboard on his Home
Screen like an app (no App Store) and a buzz when something needs him: a new
message, a booking, a client in the portal, a review, plus a morning list of
what's due.

## Decisions (Ruben's)
- Home-screen web app only. No App Store, no native build.
- Push goes through **Firebase Cloud Messaging Web Push** (Expo's push service
  can't reach a home-screen web app; checked against Expo's docs).
- Alerts for: messages (DM, Hire Me, contact, inbound email), bookings, client
  portal, daily reminders, "emails, etc."
- Web Push public key (VAPID): `BJNO4b9KxXdp_BeaZAu538bvjLUsgZKkgWJue0_8cZHbt7MQ3_NGZpeDOGomd7t6-UuP5746cz2gsqDWBPV5Vt0`

## What gets built
1. **Installable admin.** `admin.webmanifest` ("CWR Admin", start `/admin`,
   scope `/admin`, standalone, black). The link is added by the admin bundle
   only, so the public site never offers to install admin.
2. **Service worker** `admin-sw.js` at the site root, registered with scope
   `/admin`. It shows every push (iOS revokes silent pushes) and, on tap,
   focuses or opens admin on the item.
3. **Phone notifications card** on Overview (`assets/js/admin-push.js`, in the
   lazy admin bundle): turn on for this device, a switch per alert type, the
   list of devices with Remove, and Send test. On iPhone outside the Home
   Screen app it explains Share → Add to Home Screen first.
4. **Data (RTDB, admin-only):** `adminPushDevices/<id>` = { token, label,
   createdAt, lastSeenAt }, `adminPushPrefs` = { messages, bookings, portal,
   reviews, daily } (missing = on), `adminPushTest/<id>` (write-only request).
5. **Senders (Cloud Functions):** `functions/admin-push.js` builds each
   notification (pure, tested) and sends to every device, dropping tokens FCM
   says are dead.
   - Messages: new `dm/threadMessages` from a customer (chat, Hire Me,
     contact); inbound email; an outbound email that bounced.
   - Bookings: new `agencyBookings` entry. (Only admin can cancel, so no
     cancel alert.)
   - Client portal: ticket opened, ticket reply, contract signed, care plan
     requested.
   - Reviews: new Firestore `testimonials` doc.
   - Daily: 8:00 AM Pacific — lead follow-ups due or overdue and studio costs
     renewing within 7 days; nothing due = no push.
   - Test: `adminPushTest` request → test push to every device, ignores prefs.
6. **Deep links:** `/admin?open=<kind>&id=<id>` opens the tab (and the item
   where an opener exists). The worker posts the link to an open admin window
   instead of reloading it.

## Calls made (Claude's)
- Card lives on Overview; prefs are shared by all devices, devices are turned
  on/off one at a time.
- Lock-screen text: sender + first ~100 characters.
- Migrated / old DM messages (older than 10 minutes when the trigger runs)
  don't push.
- Push failures never break the thing that triggered them (logged only).

## Needs from Ruben
- Deploy: `firebase deploy --only database,functions` (rules first, per the
  security file). This also moves every function to Node 22.
- Then on the iPhone: Safari → rubenjimenez.dev/admin → Share → Add to Home
  Screen → open CWR Admin → Overview → Turn on.

## As built (2026-10-30)
- `admin.webmanifest`, `admin-sw.js` (root; in `PUBLIC` in `build-site.mjs`),
  icons in `assets/images/app/`.
- `assets/js/admin-push.js` (lazy admin bundle) + `#admin-push-card` on
  Overview; styles at the end of `agency-tools.css`.
- The shell's inline loader saves `/admin?open=…` as `window.__adminPushLink`
  because the router rewrites the URL before the admin bundle loads.
- `functions/admin-push.js` (builders + sender), triggers in `index.js`:
  `pushOnDmMessage`, `pushOnInboundEmail`, `pushOnOutboundEvent`,
  `pushOnBooking`, `pushOnReview` (Firestore), `pushTest`, `pushDailyDigest`
  (8:00 AM Pacific). Portal events via `portal-api.js handle(…, notify)`.
- Tests: `scripts/test-admin-push.mjs` (builders, sender, worker, rules),
  portal cases in `scripts/test-portal-api.mjs`.
