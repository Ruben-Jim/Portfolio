# Resend email (Firebase Cloud Function)

Portfolio forms and admin “send email copy” no longer use EmailJS. The browser calls a **Firebase HTTPS function** that sends mail through [Resend](https://resend.com/) using a **secret API key** stored in Google Cloud (never in `config.js`).

## What you need

1. A [Resend](https://resend.com/) account and API key (`re_...`).
2. A **verified sender** in Resend (domain DNS or use `onboarding@resend.dev` only for testing — see Resend docs for limits).
3. Firebase CLI logged into project **`portfolio-2578e`** (see [`.firebaserc`](.firebaserc)).

## One-time: secrets and parameters

From the repo root:

```bash
cd functions && npm install
```

Set the API key as a secret (v2 functions):

```bash
firebase functions:secrets:set RESEND_API_KEY
# paste your Resend API key when prompted
```

Set **non-secret** parameters (Firebase Console → Functions → your function → **Environment** / **Parameters**, or use `.env` files as described in [Firebase parameterized configuration](https://firebase.google.com/docs/functions/config-env)):

| Parameter          | Example                                      | Purpose |
|--------------------|-----------------------------------------------|---------|
| `RESEND_FROM`      | `Portfolio <noreply@yourdomain.com>`         | `from` address (must be allowed in Resend). |
| `NOTIFY_TO_EMAIL`  | `you@example.com`                             | Inbox that receives **Contact** and **Hire Me** notifications. |

If `NOTIFY_TO_EMAIL` is empty, contact and hire-me requests return **503** until you set it.

Defaults in code: `RESEND_FROM` defaults to `Portfolio <onboarding@resend.dev>` for quick tests.

## Deploy the function

```bash
firebase deploy --only functions:sendPortfolioEmail
```


After deploy, copy the function URL (shape):

`https://us-central1-portfolio-2578e.cloudfunctions.net/sendPortfolioEmail`

## Wire the static site

In [`assets/js/config.js`](assets/js/config.js), set:

```js
const RESEND_EMAIL_CONFIG = {
  apiUrl: "https://us-central1-portfolio-2578e.cloudfunctions.net/sendPortfolioEmail"
};
```

Redeploy or refresh your site. **Contact**, **Hire Me**, and **admin reply / email copy** all POST JSON to this URL.

## Request contract (reference)

`POST` JSON body:

- **Contact:** `{ "type": "contact", "payload": { "fullname", "email", "message", "subject", "timestamp", "website", "user_agent" } }`
- **Hire Me:** `{ "type": "hire_me", "payload": { same fields + "project_type", "budget" } }` (message is the composed body string).
- **Admin / customer copy:** `{ "type": "admin_reply", "payload": { "to_email", "to_name", "subject", "message", "timestamp", "from_name" } }`

Success: `{ "ok": true, "id": "..." }`. Errors: `{ "ok": false, "error": "..." }` with 4xx/5xx.

## HTML templates

Server-rendered HTML lives in [`functions/emailTemplates.js`](functions/emailTemplates.js), aligned with the visual language of [`templates/emails/`](templates/emails/). Edit there if you change branding.

## Local emulator (optional)

```bash
cd functions
firebase emulators:start --only functions
```

You must provide `RESEND_API_KEY` (and params) to the emulator environment per Firebase docs; without them, sends will fail.

## Billing note

Outbound email from Cloud Functions requires a **Blaze** Firebase plan for the function to reach Resend’s API.
