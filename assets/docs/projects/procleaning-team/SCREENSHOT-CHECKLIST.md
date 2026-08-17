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
| `01-play-closed-testing.webp` | DONE / Play Console | Closed testing opt-in or Play listing |
| `09-become-tester-play.webp` | DONE | Animated WebP: portal Google Play → Become a tester → Instalar. Cropped to the phone frame. |
| `02-sign-in.webp` | DONE | Live web `/admin` (mobile viewport) |
| `03-loading-brand.webp` | DONE | Staff app loading / brand screen |
| `04-admin-overview.webp` | DONE | Your Android Overview screenshot (Aug 14) |
| `05-worker-my-jobs.webp` | DONE | Worker My Jobs |
| `06-more-sheet.webp` | DONE | Admin **More** bottom sheet |
| `07-account-settings.webp` | DONE | Account modal (Enable notifications). Drop next to More, side by side in the guides |
| `08-update-ready.webp` | DONE | After a newer OTA is downloaded |

---

## Tap to Pay (`screenshots/tap-to-pay/`)

| Filename | Status |
|----------|--------|
| `01-hero.webp` | DONE | First-time intro |
| `02-enable-card.webp` | optional | Replaced in guides by Account modal (`access/07-account-settings.webp`) |
| `03-education.webp` | DONE | How Tap to Pay works |
| `04-collect-payment.webp` | DONE | Ready to pay → Collect payment |
| `05-payment-success.webp` | NEED DEVICE | Do not capture with a live customer charge |

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
| `02-orders.webp` | DONE |
| `03-manage-job.webp` | DONE |
| `04-subscriptions.webp` | DONE |
| `05-calendar.webp` | DONE |
| `06-quotes.webp` | DONE |
| `07-customers.webp` | DONE |
| `08-inbox.webp` | DONE |
| `09-documents.webp` | DONE |
| `10-reports.webp` | DONE |
| `11-dash.webp` | DONE |
| `12-more-sheet.webp` | optional | Guides now use `access/06-more-sheet.webp` next to Account |

---

## Walkthrough — worker (`screenshots/walkthrough/worker/`)

| Filename | Status |
|----------|--------|
| `01-my-jobs.webp` | DONE | Worker preview (Omar Mendoza) |
| `02-timesheet.webp` | DONE | Worker preview |
| `03-job-detail.webp` | DONE | Worker preview → View details / Job management |
| `04-account.webp` | NEED DEVICE | Worker preview has no Account screen |

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
