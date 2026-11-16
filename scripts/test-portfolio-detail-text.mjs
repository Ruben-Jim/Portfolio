// Popup text (description, Outcome, Admin Page) → paragraphs and bullet lists.
// Run: node scripts/test-portfolio-detail-text.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PortfolioDetailShared: D } = require('../assets/js/portfolio-detail-shared.js');

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const p = (text) => ({ type: 'p', text });
const ul = (...items) => ({ type: 'ul', items });

ok(same(D.textBlocks(''), []), 'empty text has no blocks');
ok(same(D.textBlocks(null), []), 'missing text has no blocks');
ok(same(D.textBlocks('One line.'), [p('One line.')]), 'a single line is a paragraph');
ok(same(D.textBlocks('Intro.\n\n· Customers book\n· Owners run jobs'), [p('Intro.'), ul('Customers book', 'Owners run jobs')]),
  'dot lines after a blank line become a list');
ok(same(D.textBlocks('For takeout shops\nOrder without an account\nLive status page'), [ul('For takeout shops', 'Order without an account', 'Live status page')]),
  'two or more plain lines in one block are jot dots: a list');
ok(same(D.textBlocks('What you get:\n· a\n· b'), [p('What you get:'), ul('a', 'b')]), 'a plain lead-in line stays a paragraph before its list');
ok(same(D.textBlocks('•a\n- b\n– c\n* d'), [ul('a', 'b', 'c', 'd')]), 'every bullet marker is stripped');
ok(same(D.textBlocks('-5% off this week'), [p('-5% off this week')]), 'a dash with no space after it is not a bullet');
ok(same(D.textBlocks('· a\nnote\n· b'), [ul('a'), p('note'), ul('b')]), 'a plain line between bullets splits the list');
ok(same(D.textBlocks('Line one.\r\n\r\n· a\r\n· b'), [p('Line one.'), ul('a', 'b')]), 'Windows line breaks work');
ok(same(D.textBlocks('·\n· a'), [ul('a')]), 'an empty bullet is dropped');
