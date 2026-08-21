/**
 * Per-route titles, descriptions, canonicals, and robots.
 * Loaded synchronously in <head> so it runs from the URL before paint.
 * switchToPage() calls CWR_SEO.apply(pageName) on in-app navigation.
 */
(function (window, document) {
  var ORIGIN = 'https://rubenjimenez.dev';
  var OG_IMAGE = ORIGIN + '/assets/images/og/og-card.jpg';
  var INDEX = 'index, follow';
  var NOINDEX = 'noindex, nofollow';

  var PAGES = {
    home: {
      path: '/',
      title: 'CodeWithRuben — Web & Mobile Dev Studio | Fresno, CA',
      description:
        'Fresno studio that builds web and mobile apps for local businesses. React Native, Firebase, Node. Available for new projects.',
      robots: INDEX
    },
    about: {
      path: '/about',
      title: 'About CodeWithRuben | Fresno Web & Mobile Studio',
      description:
        'Meet Ruben Jimenez and the Fresno studio behind CodeWithRuben — custom web apps, iOS/Android, and admin dashboards for service businesses.',
      robots: INDEX
    },
    portfolio: {
      path: '/portfolio',
      title: 'Work — Apps & Sites We’ve Built | CodeWithRuben',
      description:
        'Client builds: booking, ordering, cleaning ops, and mobile apps. See what the studio ships for Fresno and remote businesses.',
      robots: INDEX
    },
    'services-pricing': {
      path: '/services-pricing',
      title: 'Services & Pricing | Web & Mobile Apps from $499',
      description:
        'Starter Page, website, and app packages from $499. Year 1 maintenance included. Clear pricing before we start.',
      robots: INDEX
    },
    'business-systems': {
      path: '/business-systems',
      title: 'What We Build — Booking, Payments & Admin | CodeWithRuben',
      description:
        'Custom systems: booking, payments, staff dashboards, and customer apps — built to replace spreadsheets and DMs.',
      robots: INDEX
    },
    contact: {
      path: '/contact',
      title: 'Contact CodeWithRuben | Fresno, CA',
      description:
        'Ask about a web or mobile app for your business. Fresno-based, typically replies within 24 hours.',
      robots: INDEX
    },
    'hire-me': {
      path: '/hire-me',
      title: 'Start a Project | Hire CodeWithRuben',
      description:
        'Tell us what you need — site, mobile app, or full operations system. Packages from $499. Remote-friendly.',
      robots: INDEX
    },
    resume: {
      path: '/resume',
      title: 'Experience | CodeWithRuben',
      description: 'Background and experience from the CodeWithRuben studio.',
      robots: NOINDEX
    },
    blog: {
      path: '/blog',
      title: 'Blog | CodeWithRuben',
      description: 'Notes from CodeWithRuben.',
      robots: NOINDEX
    },
    schedule: {
      path: '/schedule',
      title: 'Schedule a Call | CodeWithRuben',
      description: 'Book a time to talk about a web or mobile project.',
      robots: NOINDEX
    },
    messages: {
      path: '/messages',
      title: 'Messages | CodeWithRuben',
      description: 'Private client messages.',
      robots: NOINDEX
    },
    admin: {
      path: '/admin',
      title: 'Admin | CodeWithRuben',
      description: 'Studio admin.',
      robots: NOINDEX
    }
  };

  var ALIASES = {
    'service-pricing': 'services-pricing',
    home: 'home'
  };

  function setMeta(attr, key, value) {
    var el = document.head.querySelector('meta[' + attr + '="' + key + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', value);
  }

  function setCanonical(href) {
    var el = document.head.querySelector('link[rel="canonical"]');
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', 'canonical');
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  }

  function pageFromPath(pathname) {
    var raw = String(pathname || '').split('?')[0].split('#')[0];
    var slug = raw.replace(/^\/+|\/+$/g, '') || '';
    if (!slug || slug === 'index.html' || slug === 'home') return 'home';
    if (ALIASES[slug]) return ALIASES[slug];
    return slug;
  }

  function resolve(pageName) {
    var key = ALIASES[pageName] || pageName;
    if (PAGES[key]) return PAGES[key];
    return {
      path: '/' + String(pageName || '').replace(/^\/+|\/+$/g, ''),
      title: 'CodeWithRuben',
      description:
        'Fresno studio that builds web and mobile apps for local businesses.',
      robots: NOINDEX
    };
  }

  function apply(pageName) {
    if (!document.head) return resolve(pageName);
    var seo = resolve(pageName);
    var url = ORIGIN + seo.path;
    document.title = seo.title;
    setMeta('name', 'title', seo.title);
    setMeta('name', 'description', seo.description);
    setMeta('name', 'robots', seo.robots);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:title', seo.title);
    setMeta('property', 'og:description', seo.description);
    setMeta('property', 'og:image', OG_IMAGE);
    setMeta('property', 'og:image:width', '1200');
    setMeta('property', 'og:image:height', '630');
    setMeta('property', 'og:image:type', 'image/jpeg');
    setMeta('property', 'og:image:alt', 'CodeWithRuben — Web & Mobile Dev Studio');
    setMeta('property', 'og:site_name', 'CodeWithRuben');
    setMeta('property', 'og:locale', 'en_US');
    setMeta('property', 'twitter:card', 'summary_large_image');
    setMeta('property', 'twitter:url', url);
    setMeta('property', 'twitter:title', seo.title);
    setMeta('property', 'twitter:description', seo.description);
    setMeta('property', 'twitter:image', OG_IMAGE);
    setCanonical(url);
    return seo;
  }

  function applyFromLocation() {
    return apply(pageFromPath(window.location && window.location.pathname));
  }

  window.CWR_SEO = {
    ORIGIN: ORIGIN,
    OG_IMAGE: OG_IMAGE,
    PAGES: PAGES,
    pageFromPath: pageFromPath,
    resolve: resolve,
    apply: apply,
    applyFromLocation: applyFromLocation
  };

  applyFromLocation();
})(window, document);
