# Professional DM (Realtime Database)

The inbox, thread messages, and customer presence live under **`dm/`** in Firebase **Realtime Database** (not Firestore).

**Contact form** and **Hire Me** write **RTDB only** (one conversation per email). Hire Me still sends a notification email via Resend; it does **not** create a Firestore `messages` inbox row.

## Paths

| Path | Purpose |
|------|---------|
| `dm/meta/{conversationId}` | Conversation metadata (customer, status, intake fields, unread, tags, …) |
| `dm/threadMessages/{conversationId}/{messageId}` | Thread messages (`push()` keys) |
| `dm/presence/{conversationId}/admin` | Admin presence / typing |
| `dm/presence/{conversationId}/customer` | Customer presence / typing |
| `dm/magicLinks/{token}` | **Legacy** magic-link rows (old `?dm_token=` links only; the portal no longer creates new tokens) |

Firestore **`blogPosts`** and other non-inbox collections are unchanged. Firestore **`conversations`** and **`magicLinks`** are **denied** in `firestore.rules`; use RTDB only for DM.

## Conversation model

- **One thread per email** — Contact, Hire Me, and client portal share the same timeline when the visitor uses the same email.
- **`source`** — latest channel that wrote (`contact` \| `hire-me` \| `client-portal` \| `portal`).
- **`originSource`** — first channel that created the thread (set once; never overwritten).
- **Intake lead fields on meta** (Hire Me): `projectType`, `budget`, `subject`.
- Contact sets `subject: "Contact message"`; Hire Me sets `subject: "New Hire Me Inquiry"` plus project/budget.
- Client portal may set `agencyProjectId` and tags `client-portal`.

### Meta fields (common)

`customerName`, `customerEmail`, `source`, `originSource`, `subject`, `projectType`, `budget`, `status`, `priority`, `tags`, `assignee`, `agencyProjectId`, `unreadAdmin`, `unreadCustomer`, `lastMessage`, `lastMessageAt`, `createdAt`, `updatedAt`.

### Message fields

`senderRole`, `senderName`, `body`, `createdAt`, `type`, read flags, optional `attachmentUrl`, optional message `source` (`contact` / `hire-me`) for badges. Hire Me opening messages may also store `project_type` / `budget` for history; **admin drawer lead tiles read meta**.

## Deploy rules and indexes

1. Enable **Realtime Database** in the Firebase console (same project as `databaseURL` in `assets/js/config.js`).
2. From the repo root:

   ```bash
   firebase deploy --only database
   ```

3. Rules file: [`database.rules.json`](database.rules.json). It declares `.indexOn` for:
   - `dm/meta`: `updatedAt`, `customerEmail`
   - `dm/threadMessages/$conversationId`: `createdAt` (customer thread query)

4. Deploy Firestore rules after changes:

   ```bash
   firebase deploy --only firestore:rules
   ```

## Security note

Rules under `dm/` are permissive for development parity with the previous Firestore DM rules. For production hardening, restrict reads/writes (e.g. Firebase Auth, custom claims, or Cloud Functions as the only writers).

**Customer portal (email-only):** Opening a thread uses **name + email** in the browser. That is **not** proof the visitor owns the email—anyone who enters an address can open that conversation in this model. Acceptable for low-stakes portfolio DMs; tighten later with verified auth or server-mediated access if needed.

## Smoke tests

- **Admin:** Log in, open Conversations: list loads from `dm/meta` with source labels `contact` / `hire-me` / `client-portal`. Open a Hire Me thread — Project type + Budget tiles appear from meta. Reply, optional email copy, save tags/status.
- **Contact form:** Submit → RTDB thread only; admin source `contact`.
- **Hire Me:** Submit → email notify + RTDB thread; meta has `projectType` / `budget`; **no** new Firestore inbox doc.
- **Customer:** Messages page — name + email → open thread (unchanged).
- **Client portal:** Open conversation with `source: client-portal`; same email merges into the existing thread.
- **Legacy:** A bookmark with `?dm_token=` for a valid, unexpired `dm/magicLinks` row still opens once and strips the query param.

## Frontend

- Firebase modular SDK is loaded once in [`index.html`](index.html) (and [`404.html`](404.html)): Firestore + Auth + Realtime Database helpers on `window` (`rtdbRef`, `rtdbOnValue`, `rtdbServerTimestamp`, …).
- [`assets/js/script.js`](assets/js/script.js) initializes `window.rtdb` via `getDatabase(app)` when `databaseURL` is present; admin Conversations + `customerDmApi.sendFromContactForm` / `sendFromHireMeForm`.
- [`assets/js/customer-dm-shared.js`](assets/js/customer-dm-shared.js) — `getOrCreateConversationForEmail`, customer thread subscribe/send (Messages page + client portal).
- Feature flags: [`assets/js/config.js`](assets/js/config.js) — `enableCustomerDmPortal` (preferred) and deprecated `enableCustomerMagicLinks`.

## How the DM system works (end-to-end)

### Customer (Messages page)

1. Enter **name** and **email**, then **Open my conversation**. The app finds or creates one conversation per email in **`dm/meta`** (query on `customerEmail`).
2. A small session (`conversationId`, `customerEmail`, `customerName`) is stored in **`localStorage`** (`customerDmSession`); the UI subscribes to **`dm/threadMessages/{conversationId}`** for real-time messages. **No email is sent.**
3. Sending a message **`push()`**es into the thread and updates **`dm/meta`** (last message, unread counts for admin).
4. **Legacy:** If the URL contains **`?dm_token=`**, a one-time validation against **`dm/magicLinks/{token}`** can still open the thread (then the param is removed).

### Customer (client portal)

1. On [`portal.html`](portal.html), the **Maintenance & support** section includes inline messaging when `enableCustomerDmPortal` is true.
2. Uses the same **`customerDmSession`** and **`getOrCreateConversationForEmail`** flow (one thread per email).
3. Opens may include `source: 'client-portal'`, tags, and optional **`agencyProjectId`** on **`dm/meta`**.

### Contact / Hire Me forms

1. **Contact** → `customerDmApi.sendFromContactForm` → RTDB message + meta (`source: contact`). Success UI on Contact page.
2. **Hire Me** → Resend email notify → `customerDmApi.sendFromHireMeForm` → RTDB message + meta (`source: hire-me`, `projectType`, `budget`, `subject`). Success card + optional schedule call / View inquiry overlay.
3. Same email → same conversation; `source` updates to the latest channel; `originSource` stays the first.

### Admin (Conversations tab)

1. **`subscribeConversations`** listens to **`dm/meta`** ordered by **`updatedAt`**.
2. Selecting a conversation opens the DM detail drawer, shows lead tiles from meta when present, listens to **`dm/threadMessages/{id}`**, marks read, updates presence.
3. Replies **`push()`** admin messages, bump **`unreadCustomer`**, optional **`sendReplyEmail`**.
