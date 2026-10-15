/**
 * Blog category covers: the default image for a post, picked by its category.
 * Images live in assets/images/blog/category/ (house style: docs/blog-covers.md).
 *
 * A post's own image wins unless it's empty or a leftover template placeholder.
 * Tested by scripts/test-blog-covers.mjs.
 */
(function (window) {
  var DIR = '/assets/images/blog/category/';
  var FALLBACK = 'web-development';

  var CATEGORIES = [
    { name: 'Web Development', slug: 'web-development' },
    { name: 'Software Engineering', slug: 'software-engineering' },
    { name: 'Full-Stack', slug: 'full-stack' },
    { name: 'Frontend', slug: 'frontend' },
    { name: 'Backend', slug: 'backend' },
    { name: 'Learning Journey', slug: 'learning-journey' },
    { name: 'Projects', slug: 'projects' },
    { name: 'Tutorial', slug: 'tutorial' },
    { name: 'Tech Stack', slug: 'tech-stack' }
  ];
  CATEGORIES.forEach(function (c) { c.image = DIR + c.slug + '.webp'; });

  // Template images that were never real covers.
  var PLACEHOLDER = /\/assets\/images\/(blog\/blog-[1-6]\.jpg|projects\/project-comingsoon\.svg)$/;

  function categoryCover(category) {
    var key = String(category || '').trim().toLowerCase();
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].name.toLowerCase() === key) return CATEGORIES[i].image;
    }
    return DIR + FALLBACK + '.webp';
  }

  function isPlaceholder(image) {
    var src = String(image || '').trim();
    return !src || PLACEHOLDER.test(src.split(/[?#]/)[0]);
  }

  function coverFor(post) {
    var p = post || {};
    return isPlaceholder(p.image) ? categoryCover(p.category) : String(p.image).trim();
  }

  window.BlogCovers = {
    CATEGORIES: CATEGORIES,
    categoryCover: categoryCover,
    isPlaceholder: isPlaceholder,
    coverFor: coverFor
  };
})(window);
