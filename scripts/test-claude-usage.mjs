// Daily Claude Code usage from local logs. Run: node scripts/test-claude-usage.mjs
import { aggregate, dayOf, safeKey, projectOf, dayTotal, short } from './lib/claude-usage.mjs';

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };

const at = (y, mo, d, h = 12) => new Date(y, mo - 1, d, h).toISOString();
const reply = (id, ts, usage, extra = {}) => ({
  entry: Object.assign({ type: 'assistant', requestId: 'r' + id, timestamp: ts, sessionId: 's1', cwd: '/Users/me/Dev/Apps/Portfolio',
    message: { id: 'm' + id, model: 'claude-opus-5-5', usage } }, extra),
  folder: '-Users-me-Dev-Apps-Portfolio'
});
const U = (i, o, w, r) => ({ input_tokens: i, output_tokens: o, cache_creation_input_tokens: w, cache_read_input_tokens: r });

const days = aggregate([
  reply(1, at(2026, 11, 20), U(10, 20, 30, 40)),
  reply(1, at(2026, 11, 20), U(10, 20, 30, 40)), // same reply, second content block
  reply(2, at(2026, 11, 20, 18), U(1, 2, 3, 4), { sessionId: 's2', cwd: '/Users/me/Dev/rizomx' }),
  reply(3, at(2026, 11, 21), U(5, 5, 0, 0), { message: { id: 'm3', model: 'claude-sonnet-5-5', usage: U(5, 5, 0, 0) } }),
  { entry: { type: 'user', timestamp: at(2026, 11, 20), message: { usage: U(999, 0, 0, 0) } }, folder: 'x' },
  reply(4, at(2026, 11, 20), U(7, 0, 0, 0), { message: { id: 'm4', model: '<synthetic>', usage: U(7, 0, 0, 0) } })
]);
const d20 = days['2026-11-20'];
ok(Object.keys(days).sort().join() === '2026-11-20,2026-11-21', 'one entry per local day');
ok(d20.messages === 2, 'a reply logged twice counts once; user lines and synthetic replies are skipped');
ok(d20.input === 11 && d20.output === 22 && d20.cacheWrite === 33 && d20.cacheRead === 44, 'token kinds add up');
ok(d20.sessions === 2, 'distinct sessions per day');
ok(d20.byProject.Portfolio === 100 && d20.byProject.rizomx === 10, 'tokens per project folder');
ok(dayTotal(d20) === 110, 'day total is all four kinds');
ok(days['2026-11-21'].byModel['claude-sonnet-5-5'] === 10, 'tokens per model');
ok(Object.keys(aggregate([reply(9, at(2026, 11, 1), U(1, 1, 1, 1))], '2026-11-10')).length === 0, 'days before --since are left out');

ok(dayOf('nope') === '' && dayOf(at(2026, 1, 2)) === '2026-01-02', 'dayOf: local date or blank');
ok(safeKey('a.b/c#d$e[f]') === 'a_b_c_d_e_f_' && safeKey('') === 'unknown', 'safeKey: database-safe');
ok(projectOf({}, '-Users-me-Dev-Apps-Portfolio') === 'Dev-Apps-Portfolio' && projectOf({ cwd: '/a/b/' }, 'x') === 'b', 'projectOf: cwd folder, else the log folder');
ok(short(1234) === '1.2k' && short(12345678) === '12.3M' && short(12) === '12', 'short numbers');
