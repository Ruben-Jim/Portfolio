#!/usr/bin/env node
/**
 * Claude Code usage per day → Admin → Studio Costs → Claude usage.
 *
 *   cd ~/Dev/Apps/Portfolio && npm run claude-usage   # last 30 days: print + upload
 *   node scripts/claude-usage.mjs            # same, from the Portfolio folder
 *   npm run claude-usage:all                 # every log still on this Mac
 *   node scripts/claude-usage.mjs --days 90  # further back
 *
 * Claude Code deletes its logs after 30 days, so run this at least every ~3 weeks:
 * uploaded days are kept for good (each run only adds or replaces its own days),
 * which is what lets Studio Costs compare months and years.
 *   node scripts/claude-usage.mjs --dry      # print only, upload nothing
 *
 * Free: it reads the session logs Claude Code already keeps on this Mac
 * (~/.claude/projects) and adds up numbers locally. It never calls Claude, so it
 * uses no tokens and none of the plan. Run it yourself in a terminal.
 *
 * Only counts leave the Mac (tokens, replies, sessions, per project folder and
 * model), never message text. They go to agencyStudioCosts/_claudeUsage/days,
 * which the rules already keep admin-only.
 *
 * Upload sign-in is the same as scripts/set-admin-claim.mjs:
 *   gcloud auth application-default login      (once)
 */
import { createReadStream, readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { aggregate, dayOf, dayTotal, short } from './lib/claude-usage.mjs';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const daysArg = Number(args[args.indexOf('--days') + 1]);
// --all: every log still on this Mac. Claude Code deletes logs after 30 days
// (cleanupPeriodDays), so older history only lives in what was uploaded before.
const ALL = args.includes('--all');
const DAYS = args.includes('--days') && daysArg > 0 ? Math.min(3650, Math.round(daysArg)) : 30;
const WINDOW = ALL ? 'all logs on this Mac' : `last ${DAYS} days`;
const ROOT = join(homedir(), '.claude', 'projects');
const PATH = 'agencyStudioCosts/_claudeUsage';

function logFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) out.push(...logFiles(p));
    else if (name.endsWith('.jsonl')) out.push({ path: p, mtime: st.mtimeMs });
  }
  return out;
}

const since = new Date();
since.setDate(since.getDate() - (DAYS - 1));
const sinceDay = ALL ? '' : dayOf(since);
const sinceMs = ALL ? 0 : new Date(since.getFullYear(), since.getMonth(), since.getDate()).getTime();

// Files untouched since before the window can't hold days in it.
const files = logFiles(ROOT).filter((f) => f.mtime >= sinceMs);
const entries = [];
for (const f of files) {
  const folder = relative(ROOT, f.path).split(sep)[0];
  const rl = createInterface({ input: createReadStream(f.path, 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) {
    // Cheap filter before parsing: only assistant replies carry usage.
    if (!line.includes('"assistant"') || !line.includes('"usage"')) continue;
    try {
      const o = JSON.parse(line);
      if (o.type !== 'assistant') continue;
      // Keep only what the totals need; drop message content right away.
      entries.push({
        folder,
        entry: {
          type: o.type, timestamp: o.timestamp, sessionId: o.sessionId, cwd: o.cwd, requestId: o.requestId,
          message: { id: o.message && o.message.id, model: o.message && o.message.model, usage: o.message && o.message.usage }
        }
      });
    } catch { /* a half-written last line */ }
  }
}

const days = aggregate(entries, sinceDay);
const dates = Object.keys(days).sort();
if (!dates.length) {
  console.log(`No Claude Code usage found (${WINDOW}, ${ROOT}).`);
  process.exit(0);
}

console.log(`Claude Code usage, ${WINDOW} (${files.length} log files)\n`);
console.log('Date        Replies  Sessions  Tokens   Output  Top project');
for (const d of dates) {
  const day = days[d];
  const top = Object.entries(day.byProject).sort((a, b) => b[1] - a[1])[0];
  console.log(
    d.padEnd(12) + String(day.messages).padStart(7) + String(day.sessions).padStart(10) +
    short(dayTotal(day)).padStart(8) + short(day.output).padStart(9) + '  ' + (top ? top[0] : '')
  );
}

// Plan limits, saved by the status line (scripts/claude-statusline.mjs) from what
// Claude Code already knows. Free: no API call. Missing until the status line has run.
let limits = null;
try {
  const raw = JSON.parse(readFileSync(join(homedir(), '.claude', 'cwr-plan-limits.json'), 'utf8'));
  const clean = (w) => (w && Number.isFinite(Number(w.usedPct))
    ? { usedPct: Number(w.usedPct), resetsAt: Number(w.resetsAt) || null } : null);
  limits = { week: clean(raw.week), fiveHour: clean(raw.fiveHour), savedAt: Number(raw.savedAt) || null };
  if (!limits.week && !limits.fiveHour) limits = null;
} catch { /* no status line data yet */ }
if (limits && limits.week) {
  const left = Math.round(100 - limits.week.usedPct);
  const when = limits.week.resetsAt ? new Date(limits.week.resetsAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric' }) : '?';
  console.log(`\nWeekly plan: ${left}% left, resets ${when} (as of ${new Date(limits.savedAt).toLocaleString('en-US')})`);
} else {
  console.log('\nWeekly plan: no data yet (it comes from the Claude Code status line in the terminal).');
}

if (dry) {
  console.log('\n--dry: nothing uploaded.');
  process.exit(0);
}

const require = createRequire(import.meta.url);
// firebase-admin is already installed for Cloud Functions.
let admin;
try {
  admin = require('../functions/node_modules/firebase-admin');
} catch {
  console.error('\nfirebase-admin missing: run `npm install` in functions/ first.');
  process.exit(1);
}
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://portfolio-2578e-default-rtdb.firebaseio.com'
  });
  const patch = { updatedAt: Date.now() };
  for (const d of dates) patch['days/' + d] = Object.assign({}, days[d], { updatedAt: Date.now() });
  if (limits) patch.limits = limits;
  await admin.database().ref(PATH).update(patch);
  console.log(`\nUploaded ${dates.length} days. Admin → Studio Costs → Claude usage.`);
  await admin.app().delete();
} catch (err) {
  console.error('\nUpload failed:', err.message);
  console.error('Sign in once with: gcloud auth application-default login');
  process.exit(1);
}
