/*
 * Template kits for sale on rubenjimenez.dev — ONE list for every kit page, the shared
 * checkout (/kits/checkout?kit=<id>) and the thank-you page (/kits/thanks).
 *
 * Add a kit:
 *   1. Add it here (id = the key).
 *   2. Add the same id to KITS in functions/kit-store.js with its amount (cents) and private repo,
 *      then deploy createKitCheckout + stripeKitWebhook. The SERVER amount is what's charged;
 *      `price` here must match it or the payment form will refuse to confirm.
 *   3. Make its sales page (copy kits/courses.html) and point Buy buttons to /kits/checkout?kit=<id>.
 */
(function () {
  window.CWR_KITS = {
    /* pk_test_… while testing, pk_live_… for launch. Publishable keys are meant to be public.
       NEVER put a secret key (sk_…) in this file. Empty = checkout shows "opens soon". */
    stripePublishableKey: 'pk_test_51RmkEwPsgWZjiR8FCcQBYmewRXlnOkZ0NrY8WbnTCCBZWI92qOAE99S6ikwT58NEBY9sJGGdMBXm0MG3C5Uh6wX400B8OOUNtF',
    functionsBase: 'https://us-central1-portfolio-2578e.cloudfunctions.net',
    /* Buy Me a Coffee page. Empty = the coffee buttons stay hidden (the page isn't up yet). */
    coffeeUrl: '',

    kits: {
      courses: {
        name: 'Courses Kit Pro',
        tagline: 'Course & coaching platform for iOS, Android and web',
        price: 39,
        regularPrice: 49,
        priceNote: 'Launch price',
        page: '/kits/courses',
        /* Public Lite repo. Empty = "Lite: coming soon". */
        liteUrl: 'https://github.com/Ruben-Jim/courses-kit-lite',
        /* Portfolio project page (/portfolio/<slug>/) that shows this kit's design: it gets a
           "Get this as a template kit" link. Empty = no link. */
        project: 'courses-platform',
        image: '/assets/images/kits/courses/home.webp',
        includes: [
          'Full source code, all 23 screens',
          'Private GitHub repo with future updates',
          'License for one end product'
        ]
      }
    },

    /**
     * Open to everyone only with the LIVE key. With pk_test_ (or no key) the pages show just to
     * the signed-in admin (assets/js/kits-gate.js) and createKitCheckout takes admin calls only.
     */
    isOpen: function () { return /^pk_live_/.test(this.stripePublishableKey || ''); },

    /** The kit id whose `project` is this portfolio slug, or null. */
    forProject: function (slug) {
      if (!slug) return null;
      for (var id in this.kits) {
        if (Object.prototype.hasOwnProperty.call(this.kits, id) && this.kits[id].project === slug) return id;
      }
      return null;
    },

    /** The kit for an id, or null. */
    get: function (id) {
      var kits = this.kits;
      return Object.prototype.hasOwnProperty.call(kits, id) ? kits[id] : null;
    },

    /** "$39" */
    money: function (n) { return '$' + n; },

    /** Fill price elements on a sales page: data-kit-price, data-kit-price-old, data-kit-price-note. */
    fillPrices: function (id, root) {
      var kit = this.get(id);
      if (!kit) return;
      var scope = root || document;
      var onSale = kit.regularPrice && kit.regularPrice > kit.price;
      scope.querySelectorAll('[data-kit-price]').forEach(function (el) { el.textContent = '$' + kit.price; });
      scope.querySelectorAll('[data-kit-price-old]').forEach(function (el) { el.textContent = onSale ? '$' + kit.regularPrice : ''; });
      scope.querySelectorAll('[data-kit-price-note]').forEach(function (el) { el.textContent = onSale ? kit.priceNote : ''; });
      scope.querySelectorAll('[data-kit-buy]').forEach(function (a) { a.setAttribute('href', '/kits/checkout?kit=' + encodeURIComponent(id)); });
      this.fillLinks(id, scope);
    },

    /** Lite and coffee links: point them at the catalog URLs, or switch them off until those exist. */
    fillLinks: function (id, root) {
      var kit = this.get(id) || {};
      var scope = root || document;
      scope.querySelectorAll('[data-kit-lite]').forEach(function (a) {
        if (kit.liteUrl) { a.setAttribute('href', kit.liteUrl); return; }
        var soon = document.createElement('span');
        soon.className = a.className + ' is-soon';
        soon.setAttribute('aria-disabled', 'true');
        soon.textContent = 'Lite: coming soon';
        a.replaceWith(soon);
      });
      scope.querySelectorAll('[data-kit-lite-hint]').forEach(function (el) { el.hidden = !kit.liteUrl; });
      var coffee = this.coffeeUrl;
      scope.querySelectorAll('[data-coffee]').forEach(function (a) {
        if (coffee) a.setAttribute('href', coffee);
        a.hidden = !coffee;
      });
    }
  };
})();
