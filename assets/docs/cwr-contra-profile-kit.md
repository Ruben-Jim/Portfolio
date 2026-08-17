# CWR Contra Profile Kit

Copy-paste content for building the CodeWithRuben profile on [contra.com](https://contra.com).

Everything here is drawn from the live site, `cwr-agency-overview.md`, and `portfolio-built-in-data.js`. Anything that needs a decision from you is marked **DECIDE**. Anything I could not verify is marked **CONFIRM** — do not publish those until you check them.

Contra's completion checklist is: profile photo, cover image, one-liner, bio, hourly rate, 4 portfolio pieces, 2 services, 2 social links, custom URL, identity verification + wallet. Profiles that generate inbound take a few hours to build, not twenty minutes — the platform's discovery is profile-driven, so the profile *is* the funnel.

---

## 0. Three decisions to make first

### DECIDE 1 — Ownership model on Contra

This is the big one. CWR's default is a **license**: client pays a setup package plus monthly care, and CWR owns the product, hosting, and store accounts until an $8k–$15k buyout. That works for local businesses you sell to face-to-face.

On Contra it will hurt you. Marketplace buyers assume they own what they commission, and "I keep your app until you pay me another $8,000" is the kind of thing that ends a conversation before the discovery call. It also invites disputes, since Contra's contract tooling assumes deliverables change hands.

Two workable paths:

**Option A — Sell build-only on Contra, client owns the deliverable.** Price the packages higher to make up for no recurring care revenue, and offer care as a genuinely optional add-on. Cleanest fit for the platform. This is what the copy below is written for.

**Option B — Keep the license model and say so plainly** in every service description and FAQ. Fewer inquiries, but the ones you get already accepted the terms. If you pick this, add the FAQ block in section 4.5 to every service.

Pick one before writing anything. Everything downstream depends on it.

### DECIDE 2 — Your hourly rate

Contra requires an hourly rate even when your services are fixed-price, because the algorithm uses it as a signal. You do not have one anywhere in the repo (the change-order rate is still "To confirm" in the agency overview).

What your current packages imply:

| Package | Price | Marketing timeline | Rough implied rate |
|---|---|---|---|
| Business Website | $799 | 1–2 weeks | ~$40/hr |
| Growth Platform | $3,500 | 3–4 weeks | ~$33/hr |

That is well under market for React Native and Firebase work. Listing $33/hr on Contra signals "junior" and attracts the worst clients on the platform.

**Recommendation: list $75/hr.** Keep selling the fixed packages as your main offer — the hourly number is mostly a positioning signal and a basis for change orders. If $75 feels like a stretch, $65 is the floor I would go to. It also gives you a real answer for the change-order rate that is still open in the agency overview.

### DECIDE 3 — Which contact details are canonical

The site currently disagrees with itself:

| | Main site | linktree.html |
|---|---|---|
| Email | `Ruben.Jim.co@gmail.com` | `contact@rubenjimenez.dev` |
| LinkedIn | `/in/rubenjimenezavila/` | `/in/rubenjimenez` |

Pick one of each before you add social links. `contact@rubenjimenez.dev` reads far more professional than a Gmail address on a marketplace profile — if that inbox works, use it everywhere and fix the main site to match. One of those LinkedIn URLs is wrong; verify which one actually resolves.

---

## 1. Account basics

### Custom URL

Claim early, these go fast:

1. `contra.com/codewithruben` — first choice, matches the brand
2. `contra.com/rubenjimenez` — fallback
3. `contra.com/cwrstudio`

### Profile photo

A real photo of you, not the CWR logo. Contra is an independent-talent platform and "local founder builds it, no offshore handoff" is your single strongest differentiator — a face sells that, a logo undercuts it.

### Cover image

Do not leave the default, it costs completion points. Best option you already have: a clean composite of the ProCleaning app running on a phone next to the admin dashboard on a laptop. That one image carries the whole pitch — real app, real back office. Use the CWR gold accent (`#ffdb70` family) to stay on brand.

### One-liner

**Recommended:**

> React Native + Firebase apps for service businesses — web, iOS, and Android from one Fresno studio

Alternates:

> I build the website, the crew app, and the admin dashboard that runs a service business

> Web & mobile apps for local service businesses — React Native, Firebase, Stripe

Lead with the stack. Contra's discovery leans on it, and buyers filter by tool.

---

## 2. Bio

Adapted from your About section, with location and stack pulled forward the way Contra recommends.

```
Self-taught developer based in Fresno, California, running CodeWithRuben — a
one-person studio building web and mobile apps for service businesses.

I build the whole thing: a branded website for customers, iOS and Android apps
for the crew, and an admin dashboard the owner actually runs day to day. Stack
is React Native, Expo, Firebase, and Node.js, with Stripe for payments, tips,
and recurring billing.

Live work includes ProCleaning, a field-service app on the App Store with
booking, Stripe payments, and worker management, and a restaurant ordering
system with a real-time kitchen dashboard that lifted online orders 40%.

You talk directly to the person writing the code — no project manager, no
overseas handoff. Available for new projects.
```

Trim to fit if Contra's field is shorter than this. The first two paragraphs are the ones that matter.

---

## 3. Skills and topics

Tag these, roughly in this order:

**Core:** React Native · Firebase · Node.js · Expo · JavaScript · TypeScript
**Delivery:** Mobile App Development · iOS Development · Android Development · Web Development · Full Stack Development
**Product:** Stripe · Payment Integration · Admin Dashboards · Booking Systems · Realtime Database
**Context:** Small Business · Field Service · SaaS

Do not import the percentage bars from your resume page. They undersell you badly — JavaScript displays at 40% while C++ shows 90%, which for a React Native developer reads as backwards. See section 8.

---

## 4. Services

Contra wants at least two. Four gives you more surface area in search. Each needs a title naming the outcome and a tool, numbered deliverables, a realistic timeline with buffer, and FAQs.

Timelines below add a buffer to your marketing timelines on purpose — Contra buyers treat a missed date as a dispute, whereas a local client just texts you.

### 4.1 Service — Growth Platform (lead with this one)

**Title:** Branded Website + Crew App + Admin Dashboard for Service Businesses

**Rate:** $3,500 fixed

**Timeline:** 4–5 weeks

**Description:**

```
Housecall Pro, Jobber, and tools like them rent you a template — monthly fees,
their rules, and a workflow that never quite matches how you run jobs. This is
the alternative: a branded system built around your actual operation.

You get one website for customers, iOS and Android apps for your crew, and an
admin dashboard where you run leads, jobs, money, and the team. Same build I
shipped for ProCleaning, which is live on the App Store today.
```

**Deliverables:**

1. Branded customer website — services, work gallery, reviews, quote requests, live chat, click-to-call, English and Spanish
2. Staff iOS and Android app, published to the App Store and Google Play
3. Admin dashboard for leads, jobs, calendar, customers, and inbox
4. Stripe payments including tips, tax, and recurring subscriptions
5. Tap to Pay on phone for in-person collection
6. Crew hour tracking and before/after photo submission with owner approval
7. Automated booking reminders
8. PDF estimates and invoices
9. Branded link-in-bio page for Instagram and TikTok
10. Launch, hosting setup, and a training walkthrough

**FAQs:**

- *Do I need to be in Fresno?* No. Most of the work happens over calls and shared previews. Being Fresno-based means you get Pacific-hours responses from the person writing the code.
- *Who pays Stripe fees?* Payments run through your own Stripe account, so revenue lands directly with you and Stripe's standard rates apply.
- *What if I only need part of this?* Start with the website package below and add the app later. The build is designed for that path.
- *How many revision rounds?* Two structured rounds per milestone during the build.

### 4.2 Service — Starter Presence

**Title:** Branded Website + iOS & Android App for Your Team (React Native)

**Rate:** $1,500 fixed

**Timeline:** 3–4 weeks

**Description:**

```
A branded site your customers use, plus iOS and Android for you and your team.
Quotes and chat, without the full jobs-and-payments dashboard. The right step
when you want to be reachable on your phone but are not ready to run every job
through software yet.
```

**Deliverables:**

1. Branded customer website with quote forms and live chat
2. iOS and Android app for you and your team
3. Quote handling and customer messaging in-app
4. Gallery and reviews, English and Spanish
5. Push alerts on new inquiries
6. App Store and Google Play setup and submission
7. Branded link-in-bio page
8. Hosting setup and launch

**FAQs:**

- *What is the difference from the $3,500 package?* This one has no jobs, calendar, crew, or payments admin. It is quotes and chat. If you need to run jobs and take money in-app, start with Growth.
- *Can I upgrade later?* Yes, this is built on the same foundation.

### 4.3 Service — Business Website

**Title:** Bilingual Marketing Website for Local Service Businesses

**Rate:** $799 fixed

**Timeline:** 2 weeks

**Description:**

```
A branded site so customers find you, see your work, and request a quote. No
app, no admin dashboard — just a fast, well-built site that turns searches into
phone calls. English and Spanish included.
```

**Deliverables:**

1. 1–3 page branded website
2. Quote and booking forms
3. Live chat plus click-to-call and click-to-text
4. Work gallery and reviews section
5. Full English and Spanish versions
6. SEO setup and analytics
7. Hosting setup and launch
8. Branded link-in-bio page

**FAQs:**

- *Is Spanish really included?* Yes, both languages ship at no extra cost. It is standard on every site I build.
- *Can you add an app later?* Yes. The site is built so the app packages extend it rather than replace it.

### 4.4 Service — Link Tree

**Title:** Branded Link-in-Bio Page for Instagram & TikTok

**Rate:** $149 fixed

**Timeline:** 5 days

**Description:**

```
One polished link-in-bio page in your brand — avatar, bio, stacked action
links, and social icons. Sends people to book, call, or visit your site. For
when you only need the bio link, not a full website.
```

**Deliverables:**

1. Custom-branded page with your colors, logo, and avatar
2. Stacked action links: book, call, text, directions, socials
3. Mobile-first, fast-loading build
4. One revision round
5. Hosting setup help

**FAQs:**

- *Can I edit the links myself later?* CONFIRM — decide whether the client gets an editor or sends you changes.

Your site prices this at $99–$199 scoped by brand and link count. Contra wants one number, so $149 sits mid-range. Use it as a low-friction entry point that turns into bigger work.

### 4.5 Ownership FAQ — only if you chose Option B

Add to every service:

```
Who owns the finished product?

CodeWithRuben hosts and maintains the product under a license, with a monthly
care plan covering hosting, updates, and support. Full ownership — code,
store listings, and accounts — transfers through a one-time buyout, priced
$8,000–$15,000 depending on scope. After a buyout, CWR no longer hosts or
supports the product.
```

Say it in the service description too, not just the FAQ. Burying it costs you trust when it surfaces later.

---

## 5. Portfolio projects

Contra wants four minimum, structured as mini case studies: **Problem → What I Built → Result**. Screenshots without copy do not count.

> **CONFIRM before publishing:** your site claims "3+ paid builds" and "3 Apps shipped" but `portfolio-built-in-data.js` lists eleven projects. Work out which were paid client work and which were self-initiated builds or demos. Label the self-initiated ones honestly as personal or concept projects — marketplace buyers check, and getting caught inflating is far more expensive than a thinner portfolio.

### Project 1 — ProCleaning (lead with this)

**Title:** ProCleaning — Field Service App on the App Store

**Problem:**
```
Cleaning companies run on texts, paper schedules, and chasing payments after
the job. Off-the-shelf field-service tools charge monthly, force their own
workflow, and still leave the owner doing double entry.
```

**What I built:**
```
A full field-service platform: a customer-facing booking site, a React Native
crew app for iOS and Android, and an admin dashboard for the owner. Job
scheduling and assignment, customer management, service tracking, Stripe
payments with tips and recurring billing, crew hour tracking, and before/after
photo submission the owner approves before it goes public. Built on React
Native, Expo, and Firebase.
```

**Result:**
```
Live on the App Store and in daily production use. The owner runs bookings,
crews, and payments without calling a developer for routine changes.
```

CONFIRM — add real numbers if you have them: jobs booked, payments processed, crew size, hours saved. Contra portfolio pieces with specific numbers materially outperform ones without.

### Project 2 — Rizo Pizzeria

**Title:** Rizo Pizzeria — Online Ordering with a Real-Time Kitchen Dashboard

**Problem:**
```
Phone orders tie up staff during the rush, and handwritten tickets get lost
between the counter and the kitchen.
```

**What I built:**
```
A dual-interface ordering system. Customers browse the menu, order, and track
status in real time. Kitchen staff work from a Cook Dashboard that moves
orders from Pending to Completed live, so the floor and the kitchen always
see the same thing. React Native, Expo, and Firebase.
```

**Result:**
```
Online orders up 40%, with higher customer satisfaction from real-time
tracking and a faster ordering flow.
```

Attach the client quote — it is the strongest social proof you own:

> "Ruben was hired to create an ordering ecosystem featuring dual interfaces for customers and kitchen staff. Customers enjoy a seamless experience with real-time order tracking and menu browsing, while the Cook Dashboard empowers staff to manage orders from Pending to Completed in real time." — Roberto

### Project 3 — Shelton Springs HOA

**Title:** Shelton Springs HOA — Community Management App

**Problem:**
```
HOA boards run on email chains and paper notices. Residents miss announcements,
documents are scattered, and the board fields the same questions repeatedly.
```

**What I built:**
```
A mobile app for community management with real-time notifications, shared
document access, and direct resident communication. React Native, Expo, and
Firebase.
```

**Result:**
```
Deployed and in active use by the Shelton Springs HOA, with streamlined
operations and measurably better resident engagement.
```

CONFIRM — "improved resident engagement" is vague for a marketplace. Add a number if you have one: households onboarded, notices sent, response rate.

### Project 4 — Barber Shop

**Title:** Barber Shop Booking & Management App

**Problem:**
```
Barbers lose chair time to phone tag and no-shows, and most booking tools
charge per seat for features a single shop never uses.
```

**What I built:**
```
Dual-role app covering owner and customer flows. Owners get admin login, a
dashboard, appointments, services, customers, and messages. Customers book and
message directly. Built with Expo Router, React Native, NativeWind, and
Firebase Realtime Database, with bcrypt-secured admin credentials and Stripe
prepared for activation.
```

**Result:**
```
Production-ready web and mobile build with real-time bookings and messaging.
```

CONFIRM — is this live with a real shop, or a template build? Label accordingly.

### Project 5 — Grippy Socks

**Title:** Grippy Socks — Expo + Firebase E-Commerce with Admin Order Management

**Problem:**
```
A small apparel brand needed to sell online without handing a percentage to a
marketplace or committing to a monthly storefront platform before proving
demand.
```

**What I built:**
```
A soccer-themed storefront with a single-page shop and cart flow, plus admin
order management. Checkout ships as Cash on Delivery with Stripe card payments
wired and ready to switch on. React Native, Expo, Firebase Realtime Database
for live orders, Firestore for products.
```

**Result:**
```
Live production demo handling orders in real time, with a checkout foundation
that flips to Stripe without a rebuild.
```

### Optional sixth — the studio's own back office

Worth adding once the four above are up, because it demonstrates range beyond client apps:

**Title:** CWR Studio — Client Portal, CRM, and Document System

Covers the admin dashboard, client pipeline, e-signature contracts, proposals and invoices with PDF generation, realtime client messaging, maintenance tracking, and the client portal — all of which you actually built and run on `rubenjimenez.dev`. It is proof you build back-office software, not just front ends.

---

## 6. Social links

Add two minimum. Contra prefers one to be LinkedIn.

| Platform | URL | Note |
|---|---|---|
| Portfolio | `https://rubenjimenez.dev` | Your strongest link — a working product |
| LinkedIn | `/in/rubenjimenezavila/` | Resolve the URL conflict from DECIDE 3 first |
| GitHub | `https://github.com/Ruben-Jim` | CONFIRM the profile has pinned repos worth landing on |

---

## 7. Verification and payments

1. Complete Contra's identity verification (KYC) — the profile is not fully discoverable without it
2. Set up the Stripe Connect wallet inside Contra so payments can actually flow
3. Payments through Contra are commission-free, but confirm current terms yourself before quoting anyone

---

## 8. Fixes worth making on your own site first

Found while pulling this content. Each one is visible to anyone who follows your Contra profile back to `rubenjimenez.dev`.

1. **Skill bars misrepresent you.** JavaScript displays at 40% while C++ shows 90%. For someone selling React Native work, that reads as a developer who is strongest in a language they never mention. The markup also disagrees with itself — `data value="60"` on the JavaScript bar while the label renders 40%. Either fix the numbers or drop the percentage bars entirely; they are a dated pattern that can only cost you.

2. **Education copy is stale.** The resume section says "This fall, I will complete my final course, Engineering Electric Circuits, to earn my Associate of Science in Software Engineering" against a 2021–2025 date range. It is now August 2026. Update to the completed degree, or adjust the wording.

3. **Contact details conflict** between the main site and `linktree.html` — two different emails and two different LinkedIn URLs. See DECIDE 3.

4. **Your Security+ certification is missing** from the public site. It only appears buried in the CART education paragraph. For clients who care about handling payments and customer data, it is worth surfacing.

5. **Testimonials are thin** — one quote, from Roberto, reused on Home and About. You have a testimonial invite system in the admin already. Sending it to the ProCleaning and Shelton Springs owners before you launch the Contra profile would give you quotes to attach to those case studies.

---

*Generated for internal CWR use. Companion to `cwr-agency-overview.md` — update both when packages or positioning change.*
