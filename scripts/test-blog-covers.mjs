#!/usr/bin/env node
/**
 * Blog category covers. Run from the repo root:
 *   node scripts/test-blog-covers.mjs
 *
 * Guards: every admin category has a cover file, a post with no image or a
 * template placeholder shows its category cover, a real custom image wins,
 * and an unknown category still gets a cover instead of a broken image.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const window = {};
vm.runInNewContext(fs.readFileSync('assets/js/blog-covers.js', 'utf8'), { window });
const BC = window.BlogCovers;
assert.ok(BC, 'window.BlogCovers is defined');

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log('  ok', name);
}

// The category list the admin picker offers (index.html, blog-category options).
const html = fs.readFileSync('index.html', 'utf8');
const adminCategories = [...new Set(
  [...html.matchAll(/data-select-name="blog-category"[\s\S]*?<\/div>\s*<input/g)]
    .flatMap((m) => [...m[0].matchAll(/data-value="([^"]+)"/g)].map((v) => v[1]))
)];

test('admin offers the 9 known categories', () => {
  assert.deepEqual(adminCategories.sort(), [
    'Backend', 'Frontend', 'Full-Stack', 'Learning Journey', 'Projects',
    'Software Engineering', 'Tech Stack', 'Tutorial', 'Web Development'
  ]);
});

test('every admin category maps to a cover file that exists', () => {
  for (const cat of adminCategories) {
    const url = BC.categoryCover(cat);
    assert.match(url, /^\/assets\/images\/blog\/category\/[a-z-]+\.webp$/, cat);
    assert.ok(fs.existsSync('.' + url), `${cat} → ${url} is missing`);
  }
});

test('the picker list holds one cover per category', () => {
  assert.equal(BC.CATEGORIES.length, 9);
  // Spread first: the module's arrays come from the vm realm, so strict deepEqual would compare prototypes.
  assert.deepEqual([...BC.CATEGORIES].map((c) => c.name).sort(), [...adminCategories].sort());
});

test('a post with no image shows its category cover', () => {
  assert.equal(BC.coverFor({ category: 'Tutorial', image: '' }), '/assets/images/blog/category/tutorial.webp');
  assert.equal(BC.coverFor({ category: 'Backend' }), '/assets/images/blog/category/backend.webp');
});

test('template placeholders count as no image', () => {
  for (const ph of [
    '/assets/images/blog/blog-1.jpg',
    '/assets/images/blog/blog-6.jpg',
    'https://rubenjimenez.dev/assets/images/blog/blog-2.jpg',
    './assets/images/blog/blog-3.jpg',
    '/assets/images/projects/project-comingsoon.svg',
    '  '
  ]) {
    assert.equal(BC.coverFor({ category: 'Projects', image: ph }), '/assets/images/blog/category/projects.webp', ph);
  }
});

test('a real custom image wins over the category cover', () => {
  const custom = '/assets/images/blog/my-special-post.webp';
  assert.equal(BC.coverFor({ category: 'Projects', image: custom }), custom);
  assert.equal(BC.coverFor({ category: 'Tutorial', image: 'data:image/png;base64,AAAA' }), 'data:image/png;base64,AAAA');
});

test('an unknown or missing category falls back to Web Development', () => {
  assert.equal(BC.categoryCover('Cooking'), '/assets/images/blog/category/web-development.webp');
  assert.equal(BC.coverFor({ image: '' }), '/assets/images/blog/category/web-development.webp');
});

test('category matching ignores case and extra spaces', () => {
  assert.equal(BC.categoryCover('  tech stack '), '/assets/images/blog/category/tech-stack.webp');
});

console.log(`blog covers: ${passed} passed`);
