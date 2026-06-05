# vCard - Personal portfolio

![GitHub repo size](https://img.shields.io/github/repo-size/codewithsadee/vcard-personal-portfolio)
![GitHub stars](https://img.shields.io/github/stars/codewithsadee/vcard-personal-portfolio?style=social)
![GitHub forks](https://img.shields.io/github/forks/codewithsadee/vcard-personal-portfolio?style=social)
[![Twitter Follow](https://img.shields.io/twitter/follow/codewithsadee_?style=social)](https://twitter.com/intent/follow?screen_name=codewithsadee_)
[![YouTube Video Views](https://img.shields.io/youtube/views/SoxmIlgf2zM?style=social)](https://youtu.be/SoxmIlgf2zM)

vCard is a fully responsive personal portfolio website, responsive for all devices, built using HTML, CSS, and JavaScript.

## Admin Dashboard Setup

### Firebase Configuration

1. **Deploy Firestore Rules:**
   - Go to Firebase Console → Firestore Database → Rules
   - Copy the contents of `firestore.rules` and paste them
   - Click "Publish"

2. **Testing Locally:**
   - The app works locally but Firestore may have CORS issues with `file://` protocol
   - For full functionality, deploy to a web server or use `python -m http.server` for local testing

### Admin Access

- **URL:** Open `/admin` on the main site ([`index.html`](index.html)). On GitHub Pages, `/admin` is served via `404.html` (HTTP 404 status is normal); keep `404.html` in sync with `index.html` after admin changes (see below).
- **Sign-in:** Username **`admin`** / password **`admin123`** (configured in `ADMIN_CREDENTIALS` in [`assets/js/config.js`](assets/js/config.js)). Session is stored in the browser (`sessionStorage`).
- **Firebase data:** Contact messages (Firestore), DM inbox (RTDB `dm/*`), pipeline, and portfolio admin writes use **open rules** while auth is local-only. The admin UI is still gated by `ADMIN_CREDENTIALS`. Deploy rules after changes: `firebase deploy --only firestore:rules,database`.
- **Security:** Anyone with your Firebase web API key could read/write admin collections until you re-enable Firebase Auth and tighten `firestore.rules` / `database.rules.json`.
- **Cloud Functions:** Testimonial invites and admin reply email still require a Firebase ID token (`getAdminIdToken`) — those stay unavailable until Firebase admin sign-in is added back.
- **Features:** Contact messages, blog/portfolio admin, pipeline CRM, testimonial invites, DM inbox (where enabled).

Deploy rules, RTDB rules, functions, and hosting after changing allowlists:

```bash
firebase deploy --only firestore:rules,database,functions,hosting
```

Admin-only emails (`admin_reply`, `testimonial_request`) require a valid Firebase ID token; public contact/hire-me forms stay unauthenticated.

### GitHub Pages SPA routes (`/admin`, `/portfolio`, …)

`rubenjimenez.dev` uses GitHub Pages (see [`CNAME`](CNAME)). Unlike Firebase Hosting, GH Pages cannot rewrite `/admin` → `index.html`. Instead:

- `/about` → serves [`404.html`](404.html) unless [`about/index.html`](about/index.html) exists (browser may log a 404; the app still runs).
- `/about/` → serves [`about/index.html`](about/index.html) (HTTP 200).
- `/admin` → serves [`404.html`](404.html) (browser may log a 404; the app still runs using the URL path).
- `/admin/` → serves [`admin/index.html`](admin/index.html) (HTTP 200).

After editing [`index.html`](index.html), sync copies before deploy:

```bash
cp index.html 404.html && cp index.html about/index.html && cp index.html admin/index.html
```

For clean **HTTP 200** SPA routes on the custom domain, connect it to [Firebase Hosting](https://firebase.google.com/docs/hosting/custom-domain) (`firebase deploy --only hosting`) — rewrites in [`firebase.json`](firebase.json) already map `/about`, `/admin`, etc. to `index.html`. Verify: `https://portfolio-2578e.web.app/about` returns 200.

### Troubleshooting

- **`Failed to load resource: 404` on `/about` or `/admin`:** Expected on GitHub Pages when the path has no trailing slash (falls back to `404.html`). Use `/about/` or `/admin/` for HTTP 200, or run the `cp` commands above so `about/index.html` exists, then redeploy. Prefer Firebase Hosting on the custom domain to remove 404s on all routes.
- **Messages not showing:** Sign in with `ADMIN_CREDENTIALS`, run `firebase deploy --only firestore:rules,database`, then hard refresh.
- **DM inbox empty:** Deploy database rules; confirm `databaseURL` in config.js; use **Open DM inbox** after admin sign-in.
- **Invalid username/password:** Uses `ADMIN_CREDENTIALS` (default `admin` / `admin123`).
- **CORS issues:** Deploy to a web server instead of running locally with `file://`
- **Permission errors:** Deploy `firestore.rules` and `database.rules.json` (`firebase deploy --only firestore:rules,database`)

## Demo

![vCard Desktop Demo](./website-demo-image/desktop.png "Desktop Demo")
![vCard Mobile Demo](./website-demo-image/mobile.png "Mobile Demo")

## Prerequisites

Before you begin, ensure you have met the following requirements:

* [Git](https://git-scm.com/downloads "Download Git") must be installed on your operating system.

## Installing vCard

To install **vCard**, follow these steps:

Linux and macOS:

```bash
sudo git clone https://github.com/codewithsadee/vcard-personal-portfolio.git
```

Windows:

```bash
git clone https://github.com/codewithsadee/vcard-personal-portfolio.git
```

## Contact

If you want to contact me you can reach me at [Twitter](https://www.x.com/codewithsadee_).

## License

MIT
