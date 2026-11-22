// Daily Claude Code usage from its local session logs (~/.claude/projects/**/*.jsonl).
// Pure: no files, no network. Reads only usage numbers, model, time, folder and
// session id — never message text. Tests: scripts/test-claude-usage.mjs.

/** Local YYYY-MM-DD for a log timestamp, or '' when it isn't a date. */
export function dayOf(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/** A database-safe key: no . / # $ [ ], at most 60 chars. */
export function safeKey(s) {
  const k = String(s || '').replace(/[.#$/[\]]/g, '_').trim().slice(0, 60);
  return k || 'unknown';
}

/** The project's folder name (last part of cwd), else the log folder. */
export function projectOf(entry, logFolder) {
  const cwd = String((entry && entry.cwd) || '').replace(/\/+$/, '');
  if (cwd) return cwd.split('/').pop();
  return String(logFolder || '').replace(/^-Users-[^-]+-/, '') || 'unknown';
}

function emptyDay(date) {
  return { date, messages: 0, sessions: 0, input: 0, output: 0, cacheWrite: 0, cacheRead: 0, byProject: {}, byModel: {} };
}

const n = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.round(Number(v)) : 0);

/**
 * entries: [{ entry, folder }] — parsed log lines with the log folder they came from.
 * Counts each assistant reply once (a reply is logged once per content block, with
 * the same usage). Returns { 'YYYY-MM-DD': day } for days on or after `sinceDay`.
 */
export function aggregate(entries, sinceDay = '') {
  const seen = new Set();
  const sessions = {};
  const days = {};
  for (const { entry, folder } of entries || []) {
    if (!entry || entry.type !== 'assistant' || !entry.message || !entry.message.usage) continue;
    const model = String(entry.message.model || '');
    if (!model || model === '<synthetic>') continue;
    const id = (entry.message.id || '') + '|' + (entry.requestId || '');
    if (id !== '|') {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    const date = dayOf(entry.timestamp);
    if (!date || (sinceDay && date < sinceDay)) continue;
    const u = entry.message.usage;
    const day = days[date] || (days[date] = emptyDay(date));
    const input = n(u.input_tokens);
    const output = n(u.output_tokens);
    const cacheWrite = n(u.cache_creation_input_tokens);
    const cacheRead = n(u.cache_read_input_tokens);
    const total = input + output + cacheWrite + cacheRead;
    day.messages += 1;
    day.input += input;
    day.output += output;
    day.cacheWrite += cacheWrite;
    day.cacheRead += cacheRead;
    const pk = safeKey(projectOf(entry, folder));
    day.byProject[pk] = (day.byProject[pk] || 0) + total;
    const mk = safeKey(model);
    day.byModel[mk] = (day.byModel[mk] || 0) + total;
    if (entry.sessionId) (sessions[date] || (sessions[date] = new Set())).add(String(entry.sessionId));
  }
  for (const date of Object.keys(days)) days[date].sessions = sessions[date] ? sessions[date].size : 0;
  return days;
}

/** Total tokens of a day (all four kinds). */
export function dayTotal(d) {
  return (d.input || 0) + (d.output || 0) + (d.cacheWrite || 0) + (d.cacheRead || 0);
}

/** "12.3M", "45.6k", "789". */
export function short(v) {
  const x = Number(v) || 0;
  if (x >= 1e9) return (Math.round(x / 1e8) / 10) + 'B';
  if (x >= 1e6) return (Math.round(x / 1e5) / 10) + 'M';
  if (x >= 1e3) return (Math.round(x / 1e2) / 10) + 'k';
  return String(Math.round(x));
}
