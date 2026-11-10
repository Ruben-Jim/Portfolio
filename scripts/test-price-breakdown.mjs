#!/usr/bin/env node
/**
 * Price breakdown on proposals and contracts (assets/js/business-doc-shared.js).
 *   node scripts/test-price-breakdown.mjs
 *
 * Guards: "Label: amount" lines (commas, $, minus for discounts, bullets) read
 * right; a line without an amount is a note; the section shows only when the
 * breakdown has lines; the Total row is the document's total; on a contract it
 * sits in Clause 2 above the payment schedule; text is escaped.
 */
import fs from 'node:fs';
import vm from 'node:vm';

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };

const window = {};
vm.runInNewContext(fs.readFileSync(new URL('../assets/js/business-doc-shared.js', import.meta.url), 'utf8'), { window, console });
const B = window.BusinessDocShared;

ok(typeof B.parsePriceBreakdown === 'function', 'parsePriceBreakdown is shared with the editor');
if (typeof B.parsePriceBreakdown !== 'function') process.exit(1);

const RAW = 'Website build: 2,500\n• Booking system: $800\nLaunch offer: -300\nHosting is billed by the provider';
const p = B.parsePriceBreakdown(RAW);
ok(p.rows.length === 4 && p.rows[0].label === 'Website build' && p.rows[0].amount === 2500, '"Website build: 2,500" reads as $2,500');
ok(p.rows[1].label === 'Booking system' && p.rows[1].amount === 800, 'bullets and $ are fine');
ok(p.rows[2].amount === -300, 'a minus sign makes a discount');
ok(p.rows[3].amount === null && p.rows[3].label === 'Hosting is billed by the provider', 'a line without an amount is a note');
ok(p.sum === 3000, 'the lines add up (notes count as nothing)');
ok(B.parsePriceBreakdown('').rows.length === 0 && B.parsePriceBreakdown(null).sum === 0, 'empty means no breakdown');
ok(B.parsePriceBreakdown('Design: 1,200.50').rows[0].amount === 1200.5, 'cents are kept');
ok(B.parsePriceBreakdown('Step 1: plan the pages').rows[0].amount === null, '"Label: words" is a note, not a price');

const base = { id: 'p1', clientName: 'Maria', total: 3000, createdAt: '2026-11-09T00:00:00Z' };
const proposal = B.buildPrintHtml(Object.assign({ type: 'proposal', priceBreakdown: RAW }, base));
ok(/Price Breakdown/.test(proposal), 'a proposal with a breakdown shows a Price Breakdown section');
ok(proposal.indexOf('Price Breakdown') > proposal.indexOf('Turn-Key Pricing'), 'it sits under the pricing card');
ok(/Website build[\s\S]*?\$2,500/.test(proposal) && /Launch offer[\s\S]*?−\$300/.test(proposal), 'items show their amount; a discount shows as −$300');
ok(/Hosting is billed by the provider/.test(proposal), 'notes show as their own line');
ok(/class="pb-total"[\s\S]*?Total[\s\S]*?\$3,000/.test(proposal), 'the Total row is the document total');
ok(!/Price Breakdown/.test(B.buildPrintHtml(Object.assign({ type: 'proposal' }, base))), 'no breakdown, no section');

const contract = B.buildPrintHtml(Object.assign({ type: 'contract', priceBreakdown: RAW, notes: 'Website' }, base));
const clause2 = contract.indexOf('2 &middot; Fees');
const covers = contract.indexOf('What the fee covers');
const schedule = contract.indexOf('<table class="contract-pay-table"');
ok(covers > clause2 && covers < schedule, 'on a contract it sits in Clause 2, above the payment schedule');
ok(!/What the fee covers/.test(B.buildPrintHtml(Object.assign({ type: 'contract', notes: 'Website' }, base))), 'a contract without a breakdown is unchanged');
ok(!/What the fee covers|Price Breakdown/.test(B.buildPrintHtml(Object.assign({ type: 'invoice', priceBreakdown: RAW }, base))), 'invoices keep their own line items');

const evil = B.buildPrintHtml(Object.assign({ type: 'proposal', priceBreakdown: '<img src=x onerror=alert(1)>: 100' }, base));
ok(!/<img src=x/.test(evil) && /&lt;img src=x/.test(evil), 'labels are escaped');
