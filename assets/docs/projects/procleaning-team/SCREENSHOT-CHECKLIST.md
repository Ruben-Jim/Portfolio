# ProCleaning Team — Screenshot checklist

Capture from the **live** apps/sites. Save as **WebP** using the exact filenames below.

---

## Status legend

- **DONE** — captured into this repo
- **NEED DEVICE** — requires Android phone with ProCleaning Team open + USB debugging (`adb devices` must show the phone)

---

## Access guide (`screenshots/access/`)

| Filename | Status | Source |
|----------|--------|--------|
| `01-play-closed-testing.webp` | NEED DEVICE / Play Console | Closed testing opt-in or Play listing |
| `02-sign-in.webp` | DONE | Live web `/admin` (mobile viewport) |
| `03-loading-brand.webp` | NEED DEVICE | Staff app loading / brand screen |
| `04-admin-overview.webp` | DONE | Your Android Overview screenshot (Aug 14) |
| `05-worker-my-jobs.webp` | NEED DEVICE | Worker My Jobs |
| `06-enable-notifications-admin.webp` | NEED DEVICE | Admin Inbox |
| `07-enable-notifications-worker.webp` | NEED DEVICE | Worker Account |
| `08-update-ready.webp` | NEED DEVICE | After a newer OTA is downloaded |

---

## Tap to Pay (`screenshots/tap-to-pay/`)

| Filename | Status |
|----------|--------|
| `01-hero.webp` | NEED DEVICE |
| `02-enable-card.webp` | NEED DEVICE |
| `03-education.webp` | NEED DEVICE |
| `04-collect-payment.webp` | NEED DEVICE |
| `05-payment-success.webp` | NEED DEVICE |

---

## Walkthrough — public (`screenshots/walkthrough/public/`)

| Filename | Status |
|----------|--------|
| `01-home.webp` | DONE (live site, cookie banner dismissed) |
| `02-services.webp` | DONE |
| `03-our-work.webp` | DONE |
| `04-testimonials.webp` | DONE |
| `05-contact.webp` | DONE |
| `06-quote-or-booking.webp` | DONE (`/booking`) |
| `07-checkout.webp` | DONE |
| `08-my-orders.webp` | DONE |
| `09-subscriptions.webp` | DONE |
| `10-privacy.webp` | DONE |

---

## Walkthrough — admin (`screenshots/walkthrough/admin/`)

| Filename | Status |
|----------|--------|
| `01-overview.webp` | DONE (same as access Overview) |
| `02-orders.webp` | NEED DEVICE (or signed-in web `/admin?tab=orders`) |
| `03-manage-job.webp` | NEED DEVICE |
| `04-subscriptions.webp` | NEED DEVICE |
| `05-calendar.webp` | NEED DEVICE |
| `06-quotes.webp` | NEED DEVICE |
| `07-customers.webp` | NEED DEVICE |
| `08-inbox.webp` | NEED DEVICE |
| `09-documents.webp` | NEED DEVICE |
| `10-reports.webp` | NEED DEVICE |
| `11-dash.webp` | NEED DEVICE |
| `12-more-sheet.webp` | NEED DEVICE |

---

## Walkthrough — worker (`screenshots/walkthrough/worker/`)

| Filename | Status |
|----------|--------|
| `01-my-jobs.webp` | NEED DEVICE |
| `02-timesheet.webp` | NEED DEVICE |
| `03-job-detail.webp` | NEED DEVICE |
| `04-account.webp` | NEED DEVICE |

---

## How to finish NEED DEVICE shots

1. Plug in the Android phone (USB debugging on).  
2. Confirm: `adb devices` shows the device.  
3. Open each screen in ProCleaning Team, then run:

```bash
OUT="/Users/ruben/Dev/Apps/Portfolio/assets/docs/projects/procleaning-team/screenshots"
adb exec-out screencap -p > /tmp/pc.png && cwebp -q 82 /tmp/pc.png -o "$OUT/<folder>/<filename>.webp"
```

Example for Orders:

```bash
adb exec-out screencap -p > /tmp/pc.png && cwebp -q 82 /tmp/pc.png -o "$OUT/walkthrough/admin/02-orders.webp"
```

Or tell Cursor “device is connected — capture remaining screenshots” and navigate the app while captures run.
