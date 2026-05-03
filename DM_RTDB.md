# Professional DM (Realtime Database)

The inbox, thread messages, customer presence, and optional legacy magic-link tokens live under **`dm/`** in Firebase **Realtime Database** (not Firestore).

## Paths

| Path | Purpose |
|------|---------|
| `dm/meta/{conversationId}` | Conversation metadata (customer, status, `updatedAt`, unread counts, tags, …) |
| `dm/threadMessages/{conversationId}/{messageId}` | Thread messages (`push()` keys) |
| `dm/presence/{conversationId}/admin` | Admin presence / typing |
| `dm/presence/{conversationId}/customer` | Customer presence / typing |
| `dm/magicLinks/{token}` | **Legacy** magic-link rows (old `?dm_token=` links only; the portal no longer creates new tokens) |

Firestore **`messages`** (legacy contact form) and **`blogPosts`** are unchanged. Firestore **`conversations`** and **`magicLinks`** are **denied** in `firestore.rules`; use RTDB only for DM.

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

- **Admin:** Log in, open Contact Messages tab: conversation list loads from `dm/meta`. Open a thread, send a message, optional “Send email copy”, save tags/status, load older messages if more than one page.
- **Customer:** On the Messages page, enter name + email → **Open my conversation** → send and receive; presence updates; **Use different email** clears session. Reload: session restores from `localStorage` when present.
- **Legacy:** A bookmark with `?dm_token=` for a valid, unexpired `dm/magicLinks` row still opens once and strips the query param.
- **Migration:** Shuffle migrate button: legacy Firestore `messages` rows without `conversationId` get `dm/meta` + `dm/threadMessages` entries and `conversationId` set on the legacy doc.

## Frontend

- Firebase modular SDK is loaded once in [`index.html`](index.html) (and [`404.html`](404.html)): Firestore + Auth + Realtime Database helpers on `window` (`rtdbRef`, `rtdbOnValue`, `rtdbServerTimestamp`, …).
- [`assets/js/script.js`](assets/js/script.js) initializes `window.rtdb` via `getDatabase(app)` when `databaseURL` is present.
- Optional standalone migration: [`assets/js/dm-migration.js`](assets/js/dm-migration.js) exposes `window.dmMigration.migrateLegacyMessagesToConversations()` (same RTDB layout as the admin migrate button).
- Feature flags: [`assets/js/config.js`](assets/js/config.js) — `enableCustomerDmPortal` (preferred) and deprecated `enableCustomerMagicLinks` (both gate the customer portal when set to `false`).

## How the DM system works (end-to-end)

### Customer (Messages page)

1. Enter **name** and **email**, then **Open my conversation**. The app finds or creates one conversation per email in **`dm/meta`** (query on `customerEmail`).
2. A small session (`conversationId`, `customerEmail`, `customerName`) is stored in **`localStorage`**; the UI subscribes to **`dm/threadMessages/{conversationId}`** for real-time messages. **No email is sent.**
3. Sending a message **`push()`**es into the thread and updates **`dm/meta`** (last message, unread counts for admin).
4. **Legacy:** If the URL contains **`?dm_token=`**, a one-time validation against **`dm/magicLinks/{token}`** can still open the thread (then the param is removed).

### Admin (Contact Messages tab, logged in)

1. **`subscribeConversations`** listens to **`dm/meta`** ordered by **`updatedAt`** (latest conversations first).
2. Selecting a conversation listens to **`dm/threadMessages/{id}`** (latest window + load older), marks messages read, and updates **`dm/presence/.../admin`** for typing/online hints.
3. Replies **`push()`** admin messages, bump **`unreadCustomer`** on meta, and optionally trigger **`sendReplyEmail`** (Resend) for an email copy.

### Legacy contact forms

Public **Contact** / **Hire Me** submissions still save to Firestore **`messages`** for the classic admin grid. The optional **migrate** control copies those rows into **`dm/meta`** + **`dm/threadMessages`** and sets **`conversationId`** on the legacy doc.
