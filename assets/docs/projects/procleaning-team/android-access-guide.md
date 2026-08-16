# ProCleaning Team — Android Access Guide

**ProCleaning Seattle** · Staff app on Google Play (Closed testing) · Admins & field workers

This guide is for day-to-day use of the **ProCleaning Team** Android app. It is **not** the public website customers use to book or request quotes.

---

## What this app is

| App | Who uses it | Purpose |
|---|---|---|
| **ProCleaning Team** (Android / iOS) | Admins & workers | Jobs, inbox, schedule, Tap to Pay, CMS tools |
| **procleaningseattle.com** (website) | Customers | Marketing, quotes, booking, checkout |

Staff sign in with a company Google or Microsoft account (or an approved email login when provided). After sign-in:

- **Admins** land on **Overview**
- **Workers** land on **My Jobs**

---

## How to get the app (Android) — first time

The official live build is **Google Play Closed testing**. It will not show up if you search the public Play Store.

Use the **same Google account** on the phone’s Play Store for steps 1–3. App sign-in (Google / Microsoft) can be a different company account.

### 1. Get on the tester list

Ask an owner to add the Gmail on your Android phone to Closed testing. Until that is done, the links below will ask you to sign in and then say you don’t have access.

### 2. Become a tester (do this first)

Open this on a computer **or** in Chrome on the phone, signed into that Gmail:

**[Join Closed testing — Become a tester](https://play.google.com/apps/testing/com.procleaning.app)**

Tap **Become a tester** / **Accept**.

### 3. Install on the phone

Then open this on the Android phone (same Google account):

**[Install ProCleaning Team on Google Play](https://play.google.com/store/apps/details?id=com.procleaning.app)**

Tap **Install**. After that, updates can come from Play (new binary) or in-app (see Restart below).

![Play Closed testing](screenshots/access/01-play-closed-testing.webp)

| Where | Link |
|---|---|
| **Web** (join the test) | [play.google.com/apps/testing/com.procleaning.app](https://play.google.com/apps/testing/com.procleaning.app) |
| **Android** (install) | [play.google.com/store/apps/details?id=com.procleaning.app](https://play.google.com/store/apps/details?id=com.procleaning.app) |

---

## First open & updates

**1. Open the app**  
You may briefly see the ProCleaning brand screen while the app loads.

**2. If you see “Update ready”**  
Tap **Restart app**. That applies the latest in-app update (fixes and improvements without waiting for a new Play install).

![Update ready](screenshots/access/08-update-ready.webp)

**3. Sign in**  
Use **Google** or **Microsoft**. Use email/password only if an owner gave you a demo or review login.

![Sign in](screenshots/access/02-sign-in.webp)

**4. Wait through “Successfully signed in” → “Loading…”**  
The app stays on the brand loading screen until Overview or My Jobs data is ready. That is normal.

![Loading](screenshots/access/03-loading-brand.webp)

---

## After sign-in — who sees what

### Admin

You see **Admin Dashboard** with a bottom tab bar (Overview, Orders, Calendar, Quotes, Customers, More, …).

![Admin Overview](screenshots/access/04-admin-overview.webp)

### Worker

You see **My Jobs** with tabs for jobs and timesheet. No full admin CMS.

![Worker My Jobs](screenshots/access/05-worker-my-jobs.webp)

---

## Enable notifications (recommended)

Push alerts are how you hear about new messages, jobs, quotes, and payments on the phone.

### Admin

**1.** Open **More** → tap the **Account** icon (person).  
**2.** Tap **Enable notifications** and allow permission when Android asks.

![Enable notifications — admin](screenshots/access/06-enable-notifications-admin.webp)

### Worker

**1.** Open **Account** (tap your name / avatar at the top).  
**2.** Tap **Enable notifications** and allow permission.

![Enable notifications — worker](screenshots/access/07-enable-notifications-worker.webp)

### What you may get notified about

| Role | Typical push alerts |
|---|---|
| **Admin** | New customer message, new quote, new estimate from quote, new booking, job completed, payment received, price-mismatch scan results |
| **Worker** | Newly assigned job; Tap to Pay announcement when first enabled on that account |

---

## Language & account

- **EN / ES** — language toggle in the admin header (and worker account area).
- **Logout** — signs you out of this device.
- **Delete account** — removes *your* staff login access. Job and customer records stay with the business. Only use if an owner directed you to.

---

## Daily habits

1. Open the app at the start of the day (or after a long time closed) so updates and notifications stay current.  
2. If something looks “stuck” or missing a recent fix, force-close the app and reopen (or tap **Restart** if Update ready appears).  
3. Keep notifications enabled on the phone you carry on jobs.  
4. Workers: confirm you are assigned on the job before starting; use Manage Job for clock / notes / payment as trained.

---

## Troubleshooting

| Symptom | What to try |
|---|---|
| **OAuth setup needed** | App build is missing sign-in config. Ask the owner for a newer Play build / update, then restart. |
| Can’t install from Play | Confirm the phone’s Play account was added as a tester, then open the [web join link](https://play.google.com/apps/testing/com.procleaning.app) → Become a tester, then the [Play install link](https://play.google.com/store/apps/details?id=com.procleaning.app). |
| Signed in but empty screen for a while | Wait for Loading to finish; check network. |
| No push notifications | Re-open Enable notifications; check Android app notification settings; confirm you granted permission. |
| Old UI after an update was announced | Force-close → reopen, or Restart when prompted. |
| Expo Go / simulator | Staff push and Tap to Pay need a real installed Play/App Store (or EAS) build on a physical device. |

---

## Related guides

- [Tap to Pay guide](./tap-to-pay-guide.md) — taking contactless payments on Android & iOS  
- [App walkthrough](./admin-app-walkthrough.md) — public site, admin tabs, and worker screens
