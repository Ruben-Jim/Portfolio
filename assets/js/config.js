// Firebase Configuration
// Replace with your actual Firebase API key
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCaklIEadgb9ZckNGOyr6SDiaZvbOYZqBY",
  // Use Firebase hosting domain for authDomain (always authorized)
  // Your custom domain (rubenjimenez.dev) should be in Authorized domains list
  authDomain: "portfolio-2578e.firebaseapp.com",
  databaseURL: "https://portfolio-2578e-default-rtdb.firebaseio.com",
  projectId: "portfolio-2578e",
  storageBucket: "portfolio-2578e.firebasestorage.app",
  messagingSenderId: "980239353589",
  appId: "1:980239353589:web:f61de65bd802c9db5267bc"
};

/**
 * Resend is called from a Firebase HTTPS function (never put your Resend API key here).
 * Deploy: `cd functions && npm install` then from repo root `firebase deploy --only functions:sendPortfolioEmail`
 * Set secrets: `firebase functions:secrets:set RESEND_API_KEY`
 * Set params: `firebase functions:config:set` (legacy) — use `.env` / Firebase console **Parameters** for:
 *   RESEND_FROM (e.g. "Portfolio <noreply@yourdomain.com>")
 *   NOTIFY_TO_EMAIL (your inbox for contact + hire-me notifications)
 *
 * Paste the deployed function URL below (see RESEND_SETUP.md).
 */
const RESEND_EMAIL_CONFIG = {
  /** Full URL to sendPortfolioEmail, e.g. https://us-central1-portfolio-2578e.cloudfunctions.net/sendPortfolioEmail */
  apiUrl: "https://us-central1-portfolio-2578e.cloudfunctions.net/sendPortfolioEmail"
};

const DM_FEATURE_FLAGS = {
  enableProfessionalInbox: true,
  /** Customer Messages page: name + email opens RTDB thread (no email sent). */
  enableCustomerDmPortal: true,
  /** @deprecated Use enableCustomerDmPortal. If only this is set, it still gates the portal. */
  enableCustomerMagicLinks: true
};

/**
 * Public site origin for links in outbound emails (testimonial invites, etc.).
 * Set to your live domain so invites work when sent from localhost or staging.
 * Leave "" to use the current browser origin (fine if you only send invites from production).
 */
const PORTFOLIO_PUBLIC_ORIGIN = "https://rubenjimenez.dev";

/**
 * Logo shown for customer-submitted testimonials on the Home page (dynamic cards).
 * Use a square-ish PNG/WebP/SVG under assets/images/. Change when you add your file.
 */
const TESTIMONIAL_BRAND_LOGO = "./assets/images/logo.svg";

// Make it available globally
window.FIREBASE_CONFIG = FIREBASE_CONFIG;
window.RESEND_EMAIL_CONFIG = RESEND_EMAIL_CONFIG;
window.DM_FEATURE_FLAGS = DM_FEATURE_FLAGS;
window.PORTFOLIO_PUBLIC_ORIGIN = PORTFOLIO_PUBLIC_ORIGIN;
window.TESTIMONIAL_BRAND_LOGO = TESTIMONIAL_BRAND_LOGO;