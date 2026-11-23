#!/usr/bin/env node
/**
 * Claude Code status line (set in ~/.claude/settings.json → statusLine).
 *
 * Claude Code pipes session info to this script as JSON each time the status line
 * refreshes, including `rate_limits`: how much of the 5-hour and weekly plan windows
 * is used, and when each resets. That's local data Claude Code already has, so
 * reading it is free: no API call, no tokens.
 *
 * It saves the latest limits to ~/.claude/cwr-plan-limits.json, which
 * `npm run claude-usage` uploads to Studio Costs, and prints one short line.
 * Never fails loudly: a broken status line would just show nothing.
 */
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const OUT = join(homedir(), '.claude', 'cwr-plan-limits.json');

/** resets_at may be epoch seconds, epoch ms or an ISO string → epoch ms (or null). */
function toMs(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v < 1e12 ? v * 1000 : v;
  const n = Date.parse(v);
  return Number.isFinite(n) ? n : null;
}

function windowOf(w) {
  if (!w || typeof w !== 'object') return null;
  const used = Number(w.used_percentage);
  if (!Number.isFinite(used)) return null;
  return { usedPct: Math.max(0, Math.min(100, Math.round(used * 10) / 10)), resetsAt: toMs(w.resets_at) };
}

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { /* keep {} */ }

const rl = input.rate_limits || {};
const week = windowOf(rl.seven_day);
const five = windowOf(rl.five_hour);

if (week || five) {
  try {
    const tmp = OUT + '.tmp';
    writeFileSync(tmp, JSON.stringify({ week, fiveHour: five, savedAt: Date.now() }));
    renameSync(tmp, OUT);
  } catch { /* status line must never break */ }
}

const parts = [];
const model = input.model && (input.model.display_name || input.model.id);
if (model) parts.push(model);
if (week) parts.push(`week ${Math.round(100 - week.usedPct)}% left`);
if (five) parts.push(`5h ${Math.round(100 - five.usedPct)}% left`);
process.stdout.write(parts.join(' · '));
