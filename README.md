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

- **URL:** Open `/admin` on the main site ([`index.html`](index.html)), not the 404 page.
- **Sign-in:** **Sign in with Google** using an email listed in `ADMIN_ALLOWLIST_EMAILS` in [`assets/js/config.js`](assets/js/config.js) (must match `firestore.rules`, `database.rules.json`, and `functions/index.js`).
- **Firebase Console (project `portfolio-2578e`):** Authentication → Sign-in method → **Google** enabled; **Authorized domains** include your live host (e.g. `rubenjimenez.dev`) and `localhost` for local dev.
- **Auth module:** [`assets/js/admin-auth.js`](assets/js/admin-auth.js) handles popup sign-in with redirect fallback if the popup is blocked.
- **Features:** Contact messages, blog/portfolio admin, pipeline CRM, testimonial invites, DM inbox (where enabled).

Deploy rules, RTDB rules, functions, and hosting after changing allowlists:

```bash
firebase deploy --only firestore:rules,database,functions,hosting
```

Admin-only emails (`admin_reply`, `testimonial_request`) require a valid Firebase ID token; public contact/hire-me forms stay unauthenticated.

### Troubleshooting

- **Messages not showing:** Check browser console for Firebase errors; confirm you are signed in with an allowlisted Google account.
- **Google sign-in blocked:** Add your site host under Firebase **Authorized domains**; allow popups for your domain (or complete the redirect flow); disable ad blockers for Firebase/Google scripts; ensure API key HTTP referrers allow your domain.
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
