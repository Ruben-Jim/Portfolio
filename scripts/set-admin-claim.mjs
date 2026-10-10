#!/usr/bin/env node
/**
 * Give an account the `admin` custom claim (Firebase Auth). Run once:
 *
 *   # Option A — your Google login, no key file:
 *   gcloud auth application-default login
 *   node scripts/set-admin-claim.mjs ruben.jim.co@gmail.com
 *
 *   # Option B — a service-account key for portfolio-2578e kept OUTSIDE the repo:
 *   GOOGLE_APPLICATION_CREDENTIALS=~/keys/portfolio-serviceAccount.json \
 *     node scripts/set-admin-claim.mjs ruben.jim.co@gmail.com
 *
 * Then sign out of /admin and back in (claims ride on a fresh ID token).
 * `--check` prints the account's current claims without changing anything.
 * `--remove` takes the claim away.
 *
 * Every rule file and verifyAdminBearer() accept `auth.token.admin == true`.
 * Once this is confirmed, the email fallback can be removed — see the security notes (~/Dev/Apps/blueprints/portfolio-security.md, kept out of this public repo).
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// firebase-admin is already installed for Cloud Functions.
const admin = require('../functions/node_modules/firebase-admin');

const PROJECT_ID = 'portfolio-2578e';
const args = process.argv.slice(2);
const email = (args.find((a) => !a.startsWith('--')) || '').trim().toLowerCase();
const check = args.includes('--check');
const remove = args.includes('--remove');

if (!email) {
  console.error('Usage: node scripts/set-admin-claim.mjs <email> [--check | --remove]');
  process.exit(1);
}

admin.initializeApp({ projectId: PROJECT_ID, credential: admin.credential.applicationDefault() });

try {
  const user = await admin.auth().getUserByEmail(email);
  const claims = user.customClaims || {};
  if (check) {
    console.log(email, '→ uid', user.uid, '· claims', JSON.stringify(claims), '· emailVerified', user.emailVerified);
    process.exit(0);
  }
  const next = Object.assign({}, claims);
  if (remove) delete next.admin; else next.admin = true;
  await admin.auth().setCustomUserClaims(user.uid, next);
  console.log((remove ? 'Removed admin from ' : 'Set admin on ') + email + ' (uid ' + user.uid + ').');
  console.log('Sign out of /admin and back in so your session picks it up.');
} catch (err) {
  console.error('Failed:', err.message || err);
  if (/credential|default credentials|ADC/i.test(String(err.message))) {
    console.error('→ Run `gcloud auth application-default login` first, or set GOOGLE_APPLICATION_CREDENTIALS.');
  }
  process.exit(1);
}
