# DLS Lawn Services Admin Guide


All admin changes save to Firebase Realtime Database and update the live app immediately.

---

## How to Access Admin

Navigate directly to `/admin` on your domain.  
Admin is URL-based and intended for team use.

---

## Site Structure

| Route | Page | What admin controls |
|---|---|---|
| `/` | Homepage | Hero, services, trust content, contact details, quote + booking entry points |
| `/admin` | Admin panel | Orders, calendar, subscriptions, quotes, inbox, documents, customers, dashboard content |
| Worker view (role-based) | My Jobs / Timesheet | Worker-assigned jobs and logged hours (from Admin assignments) |

---

## Admin Panel — Main Tabs

Top-level admin tabs include: **Overview**, **Orders**, **Calendar**, **Subscriptions**, **Quotes**, **Inbox**, **Documents**, **Customers**, and **Dash**.

---

## Tab — Overview

Use this tab for quick business visibility and recent activity.

### What you can do
- View at-a-glance performance and activity
- Jump into customer records, jobs, and conversations
- Track operational status without switching tabs repeatedly

---

## Tab — Orders

Use this tab to run day-to-day jobs from scheduled through complete.

### Steps

**1. Search and filter orders**  
Use search + status filters to narrow the list.

**2. Open an order card**  
Review customer details, services, schedule, and current status.

**3. Manage job lifecycle**  
Update job state (scheduled / in progress / done), add notes, and track work progress.

**4. Handle payment workflow**  
Send payment links, record offline payment methods (cash/check), and finalize billing flow.

---

## Tab — Calendar

Use this tab to manage schedule by date.

### What you can do
- View appointments by calendar day/week context
- Open related jobs directly from calendar entries
- Coordinate worker assignments against scheduled work

---

## Tab — Subscriptions

Use this tab to manage recurring service customers.

### What you can do
- Create and edit recurring plans
- Pause, resume, skip, or cancel subscriptions
- Generate and track linked recurring orders

---

## Tab — Quotes

Use this tab to process inbound leads and quote requests.

### Steps

**1. Review new quote requests**  
See customer contact info, address, and scope details.

**2. Update quote status**  
Move requests through pending/contacted/completed workflow.

**3. Start customer communication**  
Send follow-ups from the inbox workflow when needed.

---

## Tab — Inbox

Use this tab for customer communication and follow-up.

### What you can do
- View customer/admin message threads
- Send replies and reminders
- Keep communication tied to real customers and jobs

---

## Tab — Documents

Use this tab to handle professional estimates and invoices.

### Sub-sections
- **Estimates**: build from quotes or saved records
- **Invoices**: generate from orders and payment state

### What you can do
- Preview PDF documents
- Share, download, and email estimates/invoices
- Keep documents linked to customer/job history

---

## Tab — Customers

Use this tab to manage customer records and service context.

### What you can do
- View customer history (orders, quotes, estimates)
- Edit customer details and service location info
- Launch job creation or chat directly from customer detail

---

## Tab — Dash

Use this tab for business content and configuration blocks.

### Dash sub-tabs
- **Services** — service catalog, pricing structure, add-ons
- **Our Work** — portfolio entries / project showcase
- **Workers** — team members, hours view, worker setup
- **Testimonials** — approve/reject/manage testimonials

---

## Payments and Billing Notes

- Stripe payment-link workflow is supported in admin flows
- Offline methods (cash/check) can be tracked in order/payment handling
- Estimate + invoice PDFs are available in Documents
- Job/payment state updates are reflected across customer and order views

---

## Worker Experience (Role-Based)

Workers can access a dedicated **My Jobs** interface with:
- Assigned order list
- Job detail access
- Timesheet / hours visibility

Assignments and operational state are controlled from Admin.

---

## Quick Reference

| Task | Tab | Where |
|---|---|---|
| Create or manage a scheduled job | Orders | Order cards / job actions |
| Find work by date | Calendar | Date cell → order detail |
| Manage recurring service | Subscriptions | Subscription actions |
| Process new lead request | Quotes | Quote list + status |
| Reply to customer | Inbox | Conversation thread |
| Create estimate PDF | Documents | Estimates section |
| Create invoice PDF | Documents | Invoices section |
| Edit customer info | Customers | Customer detail panel |
| Update service offerings | Dash | Services sub-tab |
| Manage portfolio items | Dash | Our Work sub-tab |
| Manage worker setup/hours | Dash | Workers sub-tab |
| Moderate testimonials | Dash | Testimonials sub-tab |

---

## Public Experience Reference

### Homepage `/`
Customer-facing one-page site with:
- Hero content
- Service presentation
- Trust messaging
- Contact + lead capture paths (Quote / Book Now)

### Admin `/admin`
Internal control center for:
- Lead intake
- Scheduling
- Job execution
- Payments
- Documents
- Customer and team operations

---

*Generated for DLS Lawn Services template · 2026*