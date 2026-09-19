#!/usr/bin/env node
/**
 * Post builder logic tests. Run from the repo root:
 *   node scripts/test-post-builder.mjs
 *
 * Guards the pure parts: the design model (defaults, RTDB round-trips, duplication,
 * brand-locked validation), undo/redo history, and the generated starters.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FORMATS, ELEMENT_TYPES, MAX_SLIDES, createDesign, createElement, createSlide, duplicateDesign,
  duplicateElement, normalizeDesign, validateDesign, summarize
} from '../assets/js/post-builder/model.js';
import { createHistory } from '../assets/js/post-builder/history.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ✓ ' + name);
  } catch (err) {
    failed++;
    console.error('  ✗ ' + name + '\n    ' + err.message);
  }
}

function ids(design) {
  return [design.id, ...design.slides.flatMap((s) => [s.id, ...s.elements.map((e) => e.id)])];
}

console.log('model');

test('createDesign starts with one CWR-glow slide and falls back to 3:4', () => {
  const d = createDesign('nope', 'Test');
  assert.equal(d.format, 'feed34');
  assert.equal(d.slides.length, 1);
  assert.equal(d.slides[0].background.preset, 'glow');
  assert.deepEqual(validateDesign(d), []);
});

test('every element type creates a valid, centered element', () => {
  for (const format of Object.keys(FORMATS)) {
    const d = createDesign(format);
    for (const type of Object.keys(ELEMENT_TYPES)) {
      const el = createElement(type, {}, format);
      assert.ok(el.x >= 0 && el.x + el.w <= FORMATS[format].w, `${type} x inside ${format}`);
      d.slides[0].elements.push(el);
    }
    assert.deepEqual(validateDesign(d), [], format);
  }
});

test('normalizeDesign restores what RTDB drops (empty arrays, index-keyed objects)', () => {
  const raw = {
    id: 'd1', name: 'x', format: 'story', updatedAt: 5,
    slides: { 0: { id: 's1', background: { preset: 'navy' } }, 1: { id: 's2', elements: { 0: { id: 'e1', type: 'checklist', x: 1, y: 2, w: 300, h: 40, props: { items: { 0: 'a', 1: 'b' } } } } } }
  };
  const d = normalizeDesign(raw);
  assert.equal(d.slides.length, 2);
  assert.deepEqual(d.slides[0].elements, []);
  assert.deepEqual(d.slides[1].elements[0].props.items, ['a', 'b']);
  assert.deepEqual(d.assets, []);
  assert.equal(d.slides[1].background.preset, 'glow');
});

test('normalizeDesign drops unknown element types and keeps known ones', () => {
  const d = normalizeDesign({ format: 'square', slides: [{ elements: [{ type: 'hack' }, { type: 'text', props: { text: 'hi' } }] }] });
  assert.equal(d.slides[0].elements.length, 1);
  assert.equal(d.slides[0].elements[0].props.text, 'hi');
  assert.equal(d.slides[0].elements[0].props.preset, 'headline');
});

test('duplicateDesign gives fresh ids everywhere and leaves the original alone', () => {
  const d = createDesign('feed34', 'Original');
  d.slides[0].elements.push(createElement('text'), createElement('device', { kind: 'combo' }));
  d.slides.push(createSlide('gold'));
  const before = JSON.stringify(d);
  const copy = duplicateDesign(d);
  assert.equal(JSON.stringify(d), before);
  assert.equal(copy.name, 'Original copy');
  const a = new Set(ids(d));
  assert.ok(ids(copy).every((id) => !a.has(id)), 'no shared ids');
  assert.equal(copy.slides[0].elements[1].props.kind, 'combo');
});

test('duplicateElement offsets by 24px and unlocks', () => {
  const el = createElement('shape', { x: 10, y: 20 });
  el.locked = true;
  const copy = duplicateElement(el);
  assert.notEqual(copy.id, el.id);
  assert.deepEqual([copy.x, copy.y, copy.locked], [34, 44, false]);
});

test('validateDesign enforces brand colors, numbers and the slide limit', () => {
  const d = createDesign('feed34');
  const el = createElement('text');
  el.props.color = '#ff0000';
  el.x = NaN;
  d.slides[0].elements.push(el);
  const errors = validateDesign(d);
  assert.ok(errors.some((e) => /not a brand color/.test(e)));
  assert.ok(errors.some((e) => /x is not a number/.test(e)));
  d.slides = Array.from({ length: MAX_SLIDES + 1 }, () => createSlide());
  assert.ok(validateDesign(d).some((e) => /more than/.test(e)));
});

test('summarize keeps just what the library needs', () => {
  const d = createDesign('story', 'Promo');
  assert.deepEqual(Object.keys(summarize(d)).sort(), ['format', 'id', 'name', 'slides', 'source', 'thumbUrl', 'updatedAt']);
  assert.equal(summarize(d).slides, 1);
});

console.log('history');

test('undo / redo walk snapshots in order', () => {
  const h = createHistory(10);
  h.checkpoint('A');
  h.checkpoint('B');
  assert.equal(h.undo('C'), 'B');
  assert.equal(h.undo('B'), 'A');
  assert.equal(h.undo('A'), null);
  assert.equal(h.redo('A'), 'B');
  assert.equal(h.redo('B'), 'C');
  assert.equal(h.canRedo(), false);
});

test('identical checkpoints collapse and a new checkpoint clears redo', () => {
  const h = createHistory(10);
  h.checkpoint('A');
  h.checkpoint('A');
  assert.equal(h.undo('B'), 'A');
  assert.equal(h.canUndo(), false);
  h.checkpoint('X');
  assert.equal(h.canRedo(), false);
});

test('history keeps at most `limit` steps', () => {
  const h = createHistory(3);
  ['1', '2', '3', '4', '5'].forEach((s) => h.checkpoint(s));
  assert.equal(h.undo('6'), '5');
  assert.equal(h.undo('5'), '4');
  assert.equal(h.undo('4'), '3');
  assert.equal(h.undo('3'), null);
});

console.log('starters');

const startersPath = join(ROOT, 'assets/js/post-builder/starters.json');
test('starters.json has the four services sets', () => {
  assert.ok(existsSync(startersPath), 'run node scripts/build-post-starters.mjs');
  const { sets } = JSON.parse(readFileSync(startersPath, 'utf8'));
  assert.deepEqual(sets.map((s) => s.id).sort(), ['services-carousel-en', 'services-carousel-es', 'services-stories-en', 'services-stories-es']);
  for (const set of sets) {
    assert.equal(set.slides.length, set.id.includes('carousel') ? 6 : 4, set.id);
    assert.equal(set.format, set.id.includes('carousel') ? 'feed34' : 'story', set.id);
    assert.equal(set.boards.length, set.slides.length, set.id);
  }
});

test('every starter is a valid design and every image it uses exists', () => {
  const { sets } = JSON.parse(readFileSync(startersPath, 'utf8'));
  for (const set of sets) {
    const d = normalizeDesign({ format: set.format, slides: set.slides });
    assert.deepEqual(validateDesign(d), [], set.id);
    const srcs = set.slides.flatMap((s) => s.elements).filter((e) => e.type === 'device').flatMap((e) => [e.props.src, e.props.src2]).filter(Boolean);
    const thumbs = set.boards.map((b) => b.thumb);
    for (const src of [...srcs, ...thumbs]) assert.ok(existsSync(join(ROOT, src)), `${set.id}: missing ${src}`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
