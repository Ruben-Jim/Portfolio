#!/usr/bin/env node
/**
 * "What's included" rules (assets/js/portfolio-features.js). Run: node scripts/test-portfolio-features.mjs
 * Guards: one shared list (defaults + any name a project added), the same
 * order and spelling on every card, cleaning on save, and the card's 6 + "more".
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const F = require('../assets/js/portfolio-features.js');

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };

ok(F.DEFAULTS.includes('Client portal') && F.DEFAULTS.includes('CRM') && F.DEFAULTS.includes('Online booking'), 'the starting list has Client portal, CRM, Online booking');

const cleaned = F.clean(['  Client   portal ', 'client portal', 'CRM', '', null, 'x'.repeat(60)]);
ok(cleaned.length === 3 && cleaned[0] === 'Client portal' && cleaned[2].length === 40, 'save cleans spaces, drops blanks and repeats, caps names at 40');
ok(F.clean('CRM').length === 0 && F.clean(undefined).length === 0, 'anything but a list saves as none');
ok(F.clean(Array.from({ length: 30 }, (_, i) => 'Feature ' + i)).length === 16, 'at most 16 per project');

const projects = [{ features: ['Fleet tracking', 'crm'] }, { features: ['Fleet tracking', 'Gift cards'] }, {}];
const master = F.masterList(projects);
ok(master.slice(0, F.DEFAULTS.length).join() === F.DEFAULTS.join(), 'the shared list starts with the defaults in order');
ok(master.slice(F.DEFAULTS.length).join() === 'Fleet tracking,Gift cards', 'a name any project added joins the list once, in first-seen order');

ok(F.ordered(['Live chat', 'Gift cards', 'client portal', 'Online booking'], master).join() === 'Online booking,Client portal,Live chat,Gift cards',
  "a card lists features in the shared list's order, with the list's spelling");

const many = ['Online booking', 'Online payments', 'Client portal', 'CRM', 'Admin dashboard', 'Mobile app', 'Reviews', 'Live chat'];
const card = F.cardView(many, master);
ok(card.shown.length === 6 && card.more === 2 && card.shown[0] === 'Online booking', 'a card shows 6 and counts the rest');
ok(F.cardView(['CRM'], master).more === 0 && F.cardView([], master).shown.length === 0, 'short and empty lists show as they are');
ok(F.slug('Invoices & estimates') === 'invoices-and-estimates', 'names match on a simple slug (& reads as "and")');

// Package demos: each package's demo has its own (shorter) list, kept only where there's a demo link.
const pf = F.cleanPackageFeatures(
  { growth: ['CRM', ' crm ', 'Online payments'], starter: ['Online booking'], website: ['Reviews'], bogus: ['X'] },
  { growth: 'https://x--growth.expo.app', starter: 'https://x--website-app.expo.app' }
);
ok(pf.growth.join() === 'CRM,Online payments' && pf.starter.join() === 'Online booking', 'each package with a demo link keeps its own cleaned list');
ok(!('website' in pf) && !('bogus' in pf), 'a package without a demo link (or an unknown one) keeps nothing');
ok(Object.keys(F.cleanPackageFeatures(null, null)).length === 0, 'nothing saved when there is nothing');
