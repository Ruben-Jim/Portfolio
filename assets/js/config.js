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

// EmailJS Configuration
const EMAILJS_CONFIG = {
  serviceId: "service_portfolio", // You'll need to create this in EmailJS
  templateId: "portfolio_template", // You'll need to create this in EmailJS
  replyTemplateId: "reply_template", // Dedicated template for admin replies
  publicKey: "G0WAMInPaotIyePKR" // You'll get this from EmailJS
};

const DM_FEATURE_FLAGS = {
  enableProfessionalInbox: true,
  enableCustomerMagicLinks: true,
  enableLegacyMigration: true
};

// Make it available globally
window.FIREBASE_CONFIG = FIREBASE_CONFIG;
window.EMAILJS_CONFIG = EMAILJS_CONFIG;
window.DM_FEATURE_FLAGS = DM_FEATURE_FLAGS;