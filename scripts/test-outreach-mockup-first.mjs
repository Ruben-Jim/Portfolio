#!/usr/bin/env node
/**
 * "Mockup first" outreach scripts (assets/js/outreach-scripts-seed.js), the
 * Hormozi-style ones for the newer niches. Run: node scripts/test-outreach-mockup-first.mjs
 *
 * Guards: give before asking (a free mockup, then "Want me to send it?"), no
 * price and no link before they say yes, a line about the business that Ruben
 * rewrites per prospect, short emails with an opt-out, and the follow-ups.
 */
import fs from 'node:fs';
import vm from 'node:vm';

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };

const window = {};
vm.runInNewContext(fs.readFileSync(new URL('../assets/js/outreach-scripts-seed.js', import.meta.url), 'utf8'), { window });
const byId = Object.fromEntries(window.OUTREACH_SCRIPT_SEEDS.map((s) => [s.id, s]));

const NICHES = {
  'mf-contractors': 'https://generalcontractor.expo.app',
  'mf-event-rentals': 'https://rentals.expo.app',
  'mf-junk': 'https://junk.expo.app',
  'mf-roadside': 'https://roadsidefix.expo.app'
};
const FOLLOW_UPS = ['mf-bump', 'mf-last-check'];
const ALL = [...Object.keys(NICHES), 'mf-mockup-ready', ...FOLLOW_UPS];
const all = (s) => [s.text, s.subject, s.email, s.call].join('\n');

const missing = ALL.filter((id) => !byId[id]);
ok(!missing.length, 'all 7 Mockup-first scripts exist' + (missing.length ? ' (missing: ' + missing.join(', ') + ')' : ''));
if (missing.length) process.exit(1);

ok(ALL.every((id) => ['label', 'tag', 'vertical', 'text', 'subject', 'email', 'call'].every((f) => String(byId[id][f] || '').trim())),
  'each has a label, tag, niche, text, subject, email and call');
ok(Object.entries(NICHES).every(([id, url]) => byId[id].demoLink === url), "each niche script carries its vertical's demo link");

// Before they say yes: no price, no link.
const firstTouch = [...Object.keys(NICHES), ...FOLLOW_UPS];
const priced = firstTouch.filter((id) => /\$\s?\d|\{pkg_|\[package/.test(all(byId[id])));
ok(!priced.length, 'no price before the walkthrough call' + (priced.length ? ' (' + priced.join(', ') + ')' : ''));
const linked = firstTouch.filter((id) => /\[demo link\]|\[demo line\]|https?:\/\/|\.expo\.app|rubenjimenez\.dev/.test(all(byId[id])));
ok(!linked.length, 'no link before they say yes' + (linked.length ? ' (' + linked.join(', ') + ')' : ''));

// Give, then a tiny ask.
const gives = Object.keys(NICHES).filter((id) => {
  const s = byId[id];
  return [s.text, s.email].every((t) => /free mockup/i.test(t) && /\[Company\]/.test(t) && /Want me to send it( over)?\?/.test(t));
});
ok(gives.length === 4, 'each niche text and email offers a free mockup with their name on it, then asks "Want me to send it?"');
ok(Object.keys(NICHES).every((id) => /\[What you noticed/.test(byId[id].text) && /\[What you noticed/.test(byId[id].email)),
  'each niche text and email has a "[What you noticed …]" line to rewrite per prospect');
ok(Object.keys(NICHES).every((id) => /cold call/i.test(byId[id].call) && /Voicemail/.test(byId[id].call)),
  'each call opener says it is a cold call, and has a voicemail');

// Channel rules.
ok(ALL.every((id) => /Reply STOP to opt out\.$/.test(byId[id].text.trim())), 'every text ends with "Reply STOP to opt out."');
const subjectWords = ALL.map((id) => [id, byId[id].subject.replace(/^Subject:\s*/, '').trim().split(/\s+/).length]);
ok(ALL.every((id) => /^Subject: /.test(byId[id].subject)) && subjectWords.every(([, n]) => n >= 2 && n <= 4),
  'subjects are 2–4 words: ' + subjectWords.map(([id, n]) => id.replace('mf-', '') + ' ' + n).join(', '));
const words = ALL.map((id) => [id, byId[id].email.replace(/\[What you noticed[^\]]*\]/g, 'x x x x x x x x x x x x').split(/\s+/).filter(Boolean).length]);
ok(words.every(([, n]) => n <= 120), 'emails are 120 words or fewer: ' + words.map(([id, n]) => id.replace('mf-', '') + ' ' + n).join(', '));
ok(ALL.every((id) => /Reply “no” and I won’t email again\./.test(byId[id].email)), 'every email offers an opt-out (reply “no”)');
ok(ALL.every((id) => !/^Subject: Re:/i.test(byId[id].subject)), 'no fake "Re:" subjects');

// After yes: the mockup, then the call where price and deposit come up.
const ready = byId['mf-mockup-ready'];
ok(/\[demo link\]/.test(ready.text) && /\[demo link\]/.test(ready.email), 'Mockup ready sends the mockup link');
ok(/15 minutes/.test(ready.text) && /15 minutes/.test(ready.email), 'Mockup ready asks for a 15-minute walkthrough');
ok(/\[package\]/.test(ready.call) && /\$250 deposit/.test(ready.call), 'the walkthrough call gives the price ([package]) and the $250 deposit');
ok(/still taking on new jobs/i.test(byId['mf-last-check'].text), 'the day-14 check-in asks if they are still taking on new jobs');

// Picker group: everything mf- sits under "Mockup first".
const composer = fs.readFileSync(new URL('../assets/js/outreach-composer.js', import.meta.url), 'utf8');
const fnStart = composer.indexOf('function scriptGroup(');
let depth = 0, end = -1;
for (let i = composer.indexOf('{', fnStart); i < composer.length; i++) {
  if (composer[i] === '{') depth++;
  else if (composer[i] === '}' && --depth === 0) { end = i + 1; break; }
}
const scriptGroup = vm.runInNewContext('(' + composer.slice(fnStart, end) + ')');
ok(ALL.every((id) => scriptGroup({ id }) === 'Mockup first') && scriptGroup({ id: 'carpet' }) === 'By niche', 'the picker files them under "Mockup first"; old scripts stay where they were');
const demoBlock = composer.slice(composer.indexOf('var DEMOS = ['), composer.indexOf('];', composer.indexOf('var DEMOS = [')));
ok(Object.values(NICHES).every((url) => demoBlock.includes("'" + url + "'")), 'the Demo picker lists the contractor, rentals, junk and roadside demos');
