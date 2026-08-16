# ProCleaning — Product Walkthrough

**ProCleaning Seattle** · Public website + ProCleaning Team staff app (admin & worker)

This is a visual map of how the business runs in the product — **no code**. Use it to train staff or as a reminder of what each screen is for.

Screenshots: drop WebPs into `screenshots/walkthrough/` using names in [SCREENSHOT-CHECKLIST.md](./SCREENSHOT-CHECKLIST.md).

---

## Big picture

| Surface | Audience | Main jobs |
|---|---|---|
| **Public website** | Customers | Learn services, request quotes, book, pay online |
| **Admin (ProCleaning Team)** | Owners / office | Run jobs, inbox, quotes, customers, documents, site content |
| **Worker (ProCleaning Team)** | Field crew | See assigned jobs, log time, manage job on site, Tap to Pay |

Admin changes (services, portfolio, tax, etc.) save to the live database and show on the site / apps quickly.

---

## Part A — Public website (customers)

Customers use the marketing site (e.g. procleaningseattle.com), not the staff app.

### Home

Brand, hero, services highlights, trust, and entry points to quote / book / contact.

![Home](screenshots/walkthrough/public/01-home.webp)

### Services

Service catalog and details customers browse before requesting work.

![Services](screenshots/walkthrough/public/02-services.webp)

### Our Work

Before/after and portfolio proof managed from Admin → Dash → Our Work.

![Our Work](screenshots/walkthrough/public/03-our-work.webp)

### Testimonials

Reviews / testimonials shown publicly; moderated from Admin → Dash.

![Testimonials](screenshots/walkthrough/public/04-testimonials.webp)

### Contact

Phone, form, and ways to reach the business.

![Contact](screenshots/walkthrough/public/05-contact.webp)

### Quote or booking

Lead capture (quote) or scheduling a job (booking). Creates records admins see under Quotes / Orders.

![Quote or booking](screenshots/walkthrough/public/06-quote-or-booking.webp)

### Checkout

Customer pays online (card) for a booking or invoice-style checkout when linked.

![Checkout](screenshots/walkthrough/public/07-checkout.webp)

### My Orders (customer)

If enabled for logged-in customers: their orders and status.

![My Orders](screenshots/walkthrough/public/08-my-orders.webp)

### Subscriptions (customer)

Recurring service plans from the customer side when offered.

![Subscriptions](screenshots/walkthrough/public/09-subscriptions.webp)

### Privacy

Privacy policy and related legal copy.

![Privacy](screenshots/walkthrough/public/10-privacy.webp)

---

## Part B — Admin app (ProCleaning Team)

Sign in as an **admin**. Bottom tabs (and **More**) open the tools below.

### Overview

At-a-glance stats (pending orders, active jobs, quotes, inbox count), **Today’s Jobs**, **Previous Jobs**, and shortcuts into customers / messages.

![Overview](screenshots/walkthrough/admin/01-overview.webp)

**Use it to:** start the day, see what’s on the calendar today, jump into a job or customer without hunting tabs.

---

### Orders

Full job list: search, sort, filters. Open a card for details, team, payment, and **Manage Job**.

![Orders](screenshots/walkthrough/admin/02-orders.webp)

#### Manage Job

Lifecycle hub for one order: status, workers, notes, clock, cash/check, Tap to Pay, payment links, invoice views.

![Manage Job](screenshots/walkthrough/admin/03-manage-job.webp)

**Use it to:** run a job from scheduled → in progress → complete → paid.

---

### Subscriptions

Recurring customers and linked job orders. Create, edit, pause, or cancel plans; track upcoming charges / visits.

![Subscriptions](screenshots/walkthrough/admin/04-subscriptions.webp)

---

### Calendar

Month / day view of appointments across orders and subscriptions. Select a day to see that day’s jobs.

![Calendar](screenshots/walkthrough/admin/05-calendar.webp)

---

### Quotes

Inbound quote requests. Filter pending / contacted / completed, search, open detail, update status, convert toward estimate / booking.

![Quotes](screenshots/walkthrough/admin/06-quotes.webp)

---

### Customers

Customer list built from orders, quotes, and estimates. Open a customer for addresses, history, chat, and new work.

![Customers](screenshots/walkthrough/admin/07-customers.webp)

---

### Inbox

In-app customer conversations only (open a thread from the list). Notification and Tap to Pay setup are **not** in Inbox — they are asked after sign-in, with a backup under **More → Account**.

![Inbox](screenshots/walkthrough/admin/08-inbox.webp)

---

### Documents

Estimates and invoices: create from quotes or on site, edit line items, generate PDF, track saved documents.

![Documents](screenshots/walkthrough/admin/09-documents.webp)

---

### Reports

Business reporting and tools such as **price mismatch scan** (finds orders whose stored total doesn’t match expected tax).

![Reports](screenshots/walkthrough/admin/10-reports.webp)

---

### Dash

Content and ops settings for the business:

| Sub-area | What it controls |
|---|---|
| **Services** | Catalog, pricing ranges, features, add-ons, discounts |
| **Our Work** | Portfolio images on the public site |
| **Workers** | Worker roster / colors; open worker preview |
| **Testimonials** | Approve / manage public testimonials |
| **Receipts** | Payment receipt tools |
| **Tax** | Built-in locations + custom tax presets |

![Dash](screenshots/walkthrough/admin/11-dash.webp)

---

### More

Bottom sheet for tabs that are not on the primary bar (e.g. Messages, Documents, Dash). Same drag-to-dismiss feel as the inbox chat sheet. The **Account** icon in the header is where you can retry **notifications** or **Tap to Pay** if the post–sign-in sheets were missed.

![More sheet](screenshots/walkthrough/admin/12-more-sheet.webp)

---

## Part C — Worker app (ProCleaning Team)

Sign in as a **worker** (not admin). You only see work assigned to you.

### My Jobs

List of assigned jobs (today, upcoming, past). Expand a card for details; open Manage Job–style actions when available.

![My Jobs](screenshots/walkthrough/worker/01-my-jobs.webp)

### Timesheet

Hours for the week from job timers and logged shifts.

![Timesheet](screenshots/walkthrough/worker/02-timesheet.webp)

### Job on site

Start / clock, notes, navigation to address, complete job, and payment options (including Tap to Pay after this phone has accepted the post–sign-in terms).

![Job detail](screenshots/walkthrough/worker/03-job-detail.webp)

### Account

Language, logout, delete access. **This phone** can show Enable notifications / Enable Tap to Pay **only if** those were skipped or denied after sign-in — you should not need them on a normal first login.

![Account](screenshots/walkthrough/worker/04-account.webp)

---

## Part D — Owner reminders (ops memory)

Keep these in mind; details live in the access & Tap to Pay guides.

### Distribution

- **Android “live” for staff** = Google Play **Closed testing** (not public Production unless you intentionally go public).
- Invite each staff **Play Store Gmail** to Closed testing, then send:
  - Web (Become a tester): [play.google.com/apps/testing/com.procleaning.app](https://play.google.com/apps/testing/com.procleaning.app)
  - Android (Install): [play.google.com/store/apps/details?id=com.procleaning.app](https://play.google.com/store/apps/details?id=com.procleaning.app)
- **iOS** uses your App Store / TestFlight staff build process separately.

### Updates

- **In-app (EAS) updates** — JS/UI fixes; staff may see **Update ready → Restart**.
- **New Play/App Store build** — needed for native changes, Tap to Pay SDK, OAuth baked into the binary, or first-install polish.

### Roles

| Role | How it’s decided | Lands on |
|---|---|---|
| Admin | Allowed admin emails / company domain rules | Overview |
| Worker | Listed as worker in the roster | My Jobs |

### Notifications vs email

- Prefer **push on phones** for staff day-to-day. After sign-in the app asks for notifications (then Tap to Pay) automatically.
- Customer emails (booking confirmations, receipts, reminders) still go through the normal email path.
- If push never arrived, retry from **More → Account** (admin) or **Account** (worker).

### Data truth

- Orders, quotes, messages, services, and portfolio live in the shared backend.
- What you change in Dash / Orders is what customers and workers see (after refresh / update).

### Safety

- Don’t put the staff app on the **public** Play track unless you want anyone to find it.
- Use test customers when capturing screenshots for these docs.
- Deleting a staff account removes login access only — not company job history.

---

## Related guides

- [Android access guide](./android-access-guide.md) — install, sign-in, notifications  
- [Tap to Pay guide](./tap-to-pay-guide.md) — contactless payments on Android & iOS  
- [Screenshot checklist](./SCREENSHOT-CHECKLIST.md) — filenames for every image above
