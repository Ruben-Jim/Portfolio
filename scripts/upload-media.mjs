#!/usr/bin/env node
/**
 * Uploads project videos to Firebase Storage (media/…), so they can leave the repo.
 *
 *   npm run upload-media            # upload new or changed clips
 *   npm run upload-media -- --dry   # list what would upload, change nothing
 *
 * Covers every .mp4/.webm/.mov under assets/images/projects/ and assets/video/.
 * Each file goes to media/<path after assets/> (see assets/js/media-url.js), and a
 * clip whose contents haven't changed is skipped (MD5 compare), so re-running is cheap.
 * Posters (.webp) stay in the repo.
 *
 * Run it after record-hero-showcase.mjs or after adding a project video.
 * Sign-in is the same as scripts/claude-usage.mjs: `gcloud auth application-default login` once.
 */
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const { objectName, BUCKET } = require('../assets/js/media-url.js');
const DIRS = ['assets/images/projects', 'assets/video'];
const VIDEO = /\.(mp4|webm|mov)$/i;
const TYPES = { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };
const dry = process.argv.includes('--dry');

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (VIDEO.test(name)) out.push({ path: p, size: st.size });
  }
  return out;
}

const files = DIRS.flatMap((d) => walk(join(ROOT, d)));
const mb = (n) => (n / 1048576).toFixed(1) + 'MB';
console.log(`${files.length} videos, ${mb(files.reduce((s, f) => s + f.size, 0))}`);

let admin;
try {
  admin = require('../functions/node_modules/firebase-admin');
} catch {
  console.error('firebase-admin missing: run `npm install` in functions/ first.');
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.applicationDefault(), storageBucket: BUCKET });
const bucket = admin.storage().bucket();

let uploaded = 0, skipped = 0, failed = 0;
for (const f of files) {
  const webPath = '/' + relative(ROOT, f.path).split(sep).join('/');
  const name = objectName(webPath);
  const md5 = createHash('md5').update(readFileSync(f.path)).digest('base64');
  try {
    const file = bucket.file(name);
    const [exists] = await file.exists();
    if (exists) {
      const [meta] = await file.getMetadata();
      if (meta.md5Hash === md5) { skipped++; continue; }
    }
    if (dry) { console.log('would upload', name, mb(f.size)); uploaded++; continue; }
    await bucket.upload(f.path, {
      destination: name,
      resumable: f.size > 8 * 1048576,
      metadata: {
        contentType: TYPES[f.path.split('.').pop().toLowerCase()],
        // A day, like the site's own files. Re-recorded clips also get a new ?v= in the code.
        cacheControl: 'public, max-age=86400'
      }
    });
    console.log('uploaded', name, mb(f.size));
    uploaded++;
  } catch (err) {
    console.error('failed', name, err.message);
    failed++;
  }
}
console.log(`\n${dry ? 'Would upload' : 'Uploaded'} ${uploaded}, unchanged ${skipped}, failed ${failed}.`);
await admin.app().delete();
if (failed) process.exit(1);
