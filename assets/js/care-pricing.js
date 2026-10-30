/**
 * Care plan pricing — one source for every yearly price, saving and promo on
 * the site, the client portal, proposals and admin invoices.
 *
 * Monthly prices are fixed here. The yearly discount and the "first N months"
 * promo live in RTDB at /agencyPricing so admin can change them without a
 * deploy. A client can carry their own yearly discount on their project
 * record (agencyProjects/<id>.yearlyDiscountPct) — that is how the first
 * clients keep 45% after the public rate drops.
 *
 * Load this before i18n.js, business-doc-shared.js and client-portal.js: it
 * publishes defaults synchronously so nothing renders a blank price while
 * /agencyPricing is still loading.
 */
(function () {
  'use strict';

  var PATH = 'agencyPricing';
  var MONTHLY = { essential: 79, standard: 150, priority: 300 };
  var TIERS = ['essential', 'standard', 'priority'];
  var DEFAULTS = { yearlyDiscountPct: 45, promo: { enabled: false, months: 3, pct: 50 } };

  var config = normalizeConfig(null);
  var listeners = [];
  var loadPromise = null;

  function clampPct(v) {
    if (v === null || v === undefined || String(v).trim() === '') return null;
    var n = Number(v);
    if (!isFinite(n) || n < 0 || n > 90) return null;
    return Math.round(n * 10) / 10;
  }

  function normalizeConfig(raw) {
    raw = raw || {};
    var promoRaw = raw.promo || {};
    var yearly = clampPct(raw.yearlyDiscountPct);
    var promoPct = clampPct(promoRaw.pct);
    var months = Math.round(Number(promoRaw.months));
    return {
      yearlyDiscountPct: yearly === null ? DEFAULTS.yearlyDiscountPct : yearly,
      promo: {
        enabled: promoRaw.enabled === true || promoRaw.enabled === 'true',
        months: months >= 1 && months <= 24 ? months : DEFAULTS.promo.months,
        pct: promoPct === null || promoPct === 0 ? DEFAULTS.promo.pct : promoPct
      }
    };
  }

  /** Client override wins when it is a real percentage; otherwise the site rate. */
  function yearlyPct(override) {
    var o = clampPct(override);
    return o === null ? config.yearlyDiscountPct : o;
  }

  function monthlyFor(tier) {
    return MONTHLY[String(tier || '').toLowerCase()] || MONTHLY.standard;
  }

  /**
   * Whole-dollar math, rounded up so 45% keeps today's $522 Essential price.
   * Done in integers — 1800 * 0.7 is 1259.9999… in floating point.
   */
  function quote(tier, pctOverride) {
    var monthly = monthlyFor(tier);
    var pct = yearlyPct(pctOverride);
    var full = monthly * 12;
    var annual = Math.ceil((full * (1000 - pct * 10)) / 1000 - 1e-9);
    return {
      tier: String(tier || 'standard').toLowerCase(),
      pct: pct,
      monthly: monthly,
      annual: annual,
      perMonth: Math.round(annual / 12),
      save: full - annual
    };
  }

  function promoMonthly(tier) {
    var p = config.promo;
    return Math.ceil((monthlyFor(tier) * (1000 - p.pct * 10)) / 1000 - 1e-9);
  }

  function money(n) {
    return '$' + Number(n || 0).toLocaleString('en-US');
  }

  function pctLabel(pct) {
    return String(pct).replace(/\.0$/, '') + '%';
  }

  /**
   * Rewrites the price fields on a MAINTENANCE_PLANS array in place, so every
   * existing reader (cards, pay amounts, invoices) picks up the new numbers.
   * style 'portal' → "save $426"; style 'doc' → "Save $426 vs. paying monthly".
   */
  function applyToPlans(plans, pctOverride, style) {
    if (!Array.isArray(plans)) return plans;
    var quotes = {};
    TIERS.forEach(function (t) { quotes[t] = quote(t, pctOverride); });
    plans.forEach(function (plan) {
      var q = quotes[plan.id];
      if (!q) return;
      plan.monthly = money(q.monthly) + '/mo';
      plan.monthlyAmount = q.monthly;
      plan.annual = money(q.annual) + '/yr';
      plan.annualAmount = q.annual;
      plan.annualNote = 'Just ' + money(q.perMonth) + '/mo, paid yearly';
      plan.annualEquiv = style === 'doc' ? 'Save ' + money(q.save) + ' vs. paying monthly' : 'save ' + money(q.save);
      if (plan.compareLead && plan.id === 'standard') {
        var d1 = q.annual - quotes.essential.annual;
        var m1 = Math.round(d1 / 12);
        plan.compareLead =
          'The difference is ' + money(d1) + ' a year — about ' + money(m1) + ' a month. What that ' + money(m1) + ' buys:';
      }
      if (plan.compareLead && plan.id === 'priority') {
        var d2 = q.annual - quotes.standard.annual;
        plan.compareLead =
          money(d2) + ' a year more than Standard — about ' + money(Math.round(d2 / 12)) + ' a month. What it buys:';
      }
    });
    return plans;
  }

  /** Tokens the services page strings use, e.g. {ess_annual}, plus the {pkg_*} package prices. */
  function i18nVars() {
    var e = quote('essential'), s = quote('standard'), p = quote('priority');
    var promo = config.promo;
    return Object.assign(priceTokens(), {
      yearly_pct: pctLabel(e.pct),
      // Month-to-month prices (Services FAQ).
      ess_mo: money(e.monthly), std_mo: money(s.monthly), pri_mo: money(p.monthly),
      ess_annual: money(e.annual), ess_permo: money(e.perMonth), ess_save: money(e.save),
      std_annual: money(s.annual), std_permo: money(s.perMonth), std_save: money(s.save),
      pri_annual: money(p.annual), pri_permo: money(p.perMonth), pri_save: money(p.save),
      std_diff_year: money(s.annual - e.annual), std_diff_month: money(Math.round((s.annual - e.annual) / 12)),
      pri_diff_year: money(p.annual - s.annual), pri_diff_month: money(Math.round((p.annual - s.annual) / 12)),
      promo_months: String(promo.months),
      promo_period_en: promo.months === 1 ? 'your first month' : 'your first ' + promo.months + ' months',
      promo_card_en: promo.months === 1 ? 'First month' : 'First ' + promo.months + ' months',
      promo_card_es: promo.months === 1 ? 'Primer mes' : 'Primeros ' + promo.months + ' meses',
      promo_period_es: promo.months === 1 ? 'tu primer mes' : 'tus primeros ' + promo.months + ' meses',
      promo_pct: pctLabel(promo.pct),
      promo_ess: money(promoMonthly('essential')),
      promo_std: money(promoMonthly('standard')),
      promo_pri: money(promoMonthly('priority'))
    });
  }

  function publishVars() {
    window.CWR_I18N_VARS = Object.assign({}, window.CWR_I18N_VARS || {}, i18nVars());
  }

  /** Services page: the yearly price figures and the promo line. */
  function applyToServicesPage() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('[data-care-annual]').forEach(function (el) {
      var q = quote(el.getAttribute('data-care-annual'));
      el.innerHTML = money(q.annual) + '<span class="enterprise-price-period">/yr</span>';
    });
    document.querySelectorAll('[data-care-promo]').forEach(function (el) {
      el.hidden = !config.promo.enabled;
    });
  }

  function notify() {
    publishVars();
    if (typeof window.cwrSetLang === 'function' && typeof window.cwrGetLang === 'function') {
      window.cwrSetLang(window.cwrGetLang());
    }
    applyToServicesPage();
    applyPackagesToPage();
    // Titles and descriptions that quote a package price (seo.js).
    if (window.CWR_SEO && typeof window.CWR_SEO.applyFromLocation === 'function' && typeof document !== 'undefined' && document.head) {
      try { window.CWR_SEO.applyFromLocation(); } catch (e) { /* seo is best-effort */ }
    }
    listeners.forEach(function (fn) {
      try { fn(config); } catch (e) { console.warn(e); }
    });
  }

  function waitForRtdb(timeoutMs) {
    return new Promise(function (resolve) {
      var waited = 0;
      (function tick() {
        if (window.rtdb && window.rtdbRef && window.rtdbGet) return resolve(true);
        if (waited >= timeoutMs) return resolve(false);
        waited += 200;
        setTimeout(tick, 200);
      })();
    });
  }

  function applyStored(raw) {
    config = normalizeConfig(raw);
    packageOffers = normalizeOffers(raw && raw.packageOffers);
    applyPackagePrices(raw && raw.packagePrices);
    notify();
    return config;
  }

  function loadFromSdk() {
    return waitForRtdb(15000).then(function (ok) {
      if (!ok) return config;
      return window.rtdbGet(window.rtdbRef(window.rtdb, PATH)).then(function (snap) {
        return applyStored(snap && snap.val());
      }).catch(function (err) {
        console.warn('Care pricing: using defaults', err);
        return config;
      });
    });
  }

  // /agencyPricing is public-read, so pages without the Firebase SDK (Link
  // Tree, the examples) and the SPA before Firebase boots read it over REST.
  var DATABASE_URL = 'https://portfolio-2578e-default-rtdb.firebaseio.com';

  function loadFromRest() {
    var base = String((window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.databaseURL) || DATABASE_URL).replace(/\/$/, '');
    return window.fetch(base + '/' + PATH + '.json').then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(applyStored);
  }

  /** Reads /agencyPricing once per page. Falls back to defaults if offline. */
  function load() {
    if (loadPromise) return loadPromise;
    var sdkReady = !!(window.rtdb && window.rtdbRef && window.rtdbGet);
    loadPromise = !sdkReady && typeof window.fetch === 'function'
      ? loadFromRest().catch(loadFromSdk)
      : loadFromSdk();
    return loadPromise;
  }

  /** Admin only — the RTDB rule limits writes to the admin account. */
  function save(next) {
    var clean = normalizeConfig(next);
    var payload = {
      yearlyDiscountPct: clean.yearlyDiscountPct,
      promo: clean.promo,
      updatedAt: Date.now()
    };
    // update, not set: /agencyPricing also holds packageOffers.
    return window.rtdbUpdate(window.rtdbRef(window.rtdb, PATH), payload).then(function () {
      config = clean;
      notify();
      return config;
    });
  }

  // ——— Setup packages + limited-time offers ———
  // Regular prices are edited in the admin Pricing tab and live at
  // /agencyPricing/packagePrices/<id> = { price, max? }. The prices below are
  // the defaults until that loads, and what every typed copy in the site files
  // shows: `node scripts/sync-prices.mjs` rewrites them (and those copies) from
  // the live prices, and the pre-push gate fails while they differ.
  // Offers live at /agencyPricing/packageOffers/<id> = { enabled, price, endsAt, spots, claimed }.

  // `summary` is the one-line "what's included" used in outreach DMs. Keep it
  // in step with the package bullets in llms.txt and the Services page.
  // sync-prices: begin defaults
  var PACKAGES = [
    { id: 'linktree', name: 'Link Tree', price: 99, max: 199, projectType: 'web', offerable: true,
      summary: 'a branded link-in-bio page with your logo, links, and social icons' },
    { id: 'starter-page', name: 'Starter Package', price: 499, projectType: 'web', offerable: true,
      summary: 'one page plus an owner admin for quotes, messages, and jobs, in English and Spanish' },
    { id: 'website', name: 'Multi-Page Package', price: 999, projectType: 'web', offerable: true,
      summary: '1–3 pages, live chat, gallery, SEO, hosting, and a branded Link Tree' },
    { id: 'starter', name: 'Website + App Package', price: 1500, projectType: 'both', offerable: true,
      summary: 'everything in Multi-Page Package, plus iOS and Android apps for you and your team' },
    { id: 'growth', name: 'Growth Package', price: 3500, projectType: 'both', offerable: true,
      summary: 'a website for customers, iOS and Android for your crew, and an admin for leads, jobs, and payments' },
    { id: 'agency', name: 'Business Platform', price: 6000, max: 12000, projectType: 'both', offerable: false,
      summary: 'a website plus a mobile app for your field crew, with owner and worker logins' },
    { id: 'studio', name: 'Studio Build', price: 15000, max: 40000, projectType: 'both', offerable: false,
      summary: 'a full custom platform, from quote to invoice, with recurring billing and multi-location' }
  ];
  // sync-prices: end defaults

  var packageOffers = {};

  function packageById(id) {
    for (var i = 0; i < PACKAGES.length; i++) if (PACKAGES[i].id === id) return PACKAGES[i];
    return null;
  }

  // The prices the code (and so every typed copy in the files) ships with.
  var DEFAULT_PRICES = {};
  PACKAGES.forEach(function (p) {
    DEFAULT_PRICES[p.id] = p.max ? { price: p.price, max: p.max } : { price: p.price };
  });

  /** A typed amount ("12,345", "$12345", 12345.4) as whole dollars; anything else → NaN. */
  function wholeDollars(v) {
    var n = Number(String(v == null ? '' : v).replace(/[$,\s]/g, ''));
    return String(v == null ? '' : v).trim() === '' ? NaN : n;
  }

  /**
   * Stored prices made safe to show: a missing or unusable price is the code
   * default, a "to" at or below "from" is dropped rather than shown backwards,
   * and only packages that are ranges by default carry a "to".
   */
  function normalizePrices(raw) {
    var out = {};
    PACKAGES.forEach(function (p) {
      var d = DEFAULT_PRICES[p.id];
      var o = (raw && raw[p.id]) || {};
      var price = Math.round(wholeDollars(o.price));
      if (!(price >= 1)) price = d.price;
      var row = { price: price };
      if (d.max) {
        var max = o.max == null ? d.max : Math.round(wholeDollars(o.max));
        if (max > price) row.max = max;
      }
      out[p.id] = row;
    });
    return out;
  }

  /** Writes prices onto the PACKAGES objects, so every reference stays live. */
  function applyPackagePrices(raw) {
    var clean = normalizePrices(raw);
    PACKAGES.forEach(function (p) {
      p.price = clean[p.id].price;
      if (clean[p.id].max) p.max = clean[p.id].max;
      else delete p.max;
    });
  }

  /** What the admin is about to save, in plain words; empty when it's fine. */
  function validatePricing(prices, offers) {
    var errors = [];
    PACKAGES.forEach(function (p) {
      var row = (prices && prices[p.id]) || {};
      var price = wholeDollars(row.price);
      if (!(price >= 1)) {
        errors.push(p.name + ': the price must be at least $1.');
        return;
      }
      if (price !== Math.round(price)) {
        errors.push(p.name + ': use whole dollars.');
        return;
      }
      if (DEFAULT_PRICES[p.id].max) {
        var max = wholeDollars(row.max);
        if (!(max > price) || max !== Math.round(max)) {
          errors.push(p.name + ': the "to" price must be a whole dollar amount above the "from" price.');
        }
      }
      var o = offers && offers[p.id];
      var offer = o ? wholeDollars(o.price) : NaN;
      if (o && o.enabled && !(offer > 0 && offer < price)) {
        errors.push(p.name + ': the offer price must be above $0 and below the regular price (' + money(price) + ').');
      }
    });
    return errors;
  }

  /** Admin only: prices and offers in one write, so they never disagree. */
  function savePricing(prices, offers) {
    var cleanPrices = normalizePrices(prices);
    var cleanOffers = normalizeOffers(offers);
    return window.rtdbUpdate(window.rtdbRef(window.rtdb, PATH), {
      packagePrices: cleanPrices,
      packageOffers: cleanOffers,
      updatedAt: Date.now()
    }).then(function () {
      applyPackagePrices(cleanPrices);
      packageOffers = cleanOffers;
      notify();
      return cleanPrices;
    });
  }

  /** Packages whose live price differs from the one the site files carry. */
  function filesBehind() {
    return PACKAGES.filter(function (p) {
      var d = DEFAULT_PRICES[p.id];
      return d.price !== p.price || (d.max || 0) !== (p.max || 0);
    }).map(function (p) {
      var d = DEFAULT_PRICES[p.id];
      return { id: p.id, name: p.name, files: regularLabel(d), live: regularLabel(p) };
    });
  }

  /**
   * {pkg_*} tokens for i18n strings, templates and markers:
   * pkg_<id> (the price), pkg_<id>_max and pkg_<id>_range for ranges ("from–to"),
   * pkg_<id>_k shorthand ("6k"), and pkg_from, the cheapest website package.
   */
  function priceTokens() {
    var out = {};
    var from = Infinity;
    PACKAGES.forEach(function (p) {
      var key = 'pkg_' + p.id.replace(/-/g, '_');
      out[key] = money(p.price);
      out[key + '_k'] = moneyK(p.price);
      out[key + '_range'] = regularLabel(p);
      if (p.max) {
        out[key + '_max'] = money(p.max);
        out[key + '_max_k'] = moneyK(p.max);
      }
      if (p.id !== 'linktree') from = Math.min(from, p.price);
    });
    out.pkg_from = money(from);
    return out;
  }

  /** Thousands as "k" with at most one decimal; under 1,000 it is just the price. */
  function moneyK(n) {
    if (n < 1000) return money(n);
    return '$' + String(Math.round(n / 100) / 10) + 'k';
  }

  function fillPrices(text) {
    var tokens = priceTokens();
    return String(text == null ? '' : text).replace(/\{(pkg_[a-z_]+)\}/g, function (m, k) {
      return tokens[k] != null ? tokens[k] : m;
    });
  }

  function normalizeOffers(raw) {
    var out = {};
    PACKAGES.forEach(function (p) {
      var o = (raw && raw[p.id]) || {};
      out[p.id] = {
        enabled: o.enabled === true,
        price: Math.max(0, Math.round(Number(o.price) || 0)),
        endsAt: /^\d{4}-\d{2}-\d{2}$/.test(String(o.endsAt || '')) ? String(o.endsAt) : '',
        spots: Math.max(0, Math.round(Number(o.spots) || 0)),
        claimed: Math.max(0, Math.round(Number(o.claimed) || 0))
      };
    });
    return out;
  }

  packageOffers = normalizeOffers(null);

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /** The offer if it is on, cheaper, not past its date, and has spots left. */
  function activeOffer(id) {
    var p = packageById(id);
    var o = packageOffers[id];
    if (!p || !p.offerable || !o || !o.enabled) return null;
    if (!(o.price > 0 && o.price < p.price)) return null;
    if (o.endsAt && todayKey() > o.endsAt) return null;
    if (o.spots && o.claimed >= o.spots) return null;
    return {
      price: o.price,
      endsAt: o.endsAt,
      spots: o.spots,
      claimed: o.claimed,
      spotsLeft: o.spots ? o.spots - o.claimed : 0
    };
  }

  /** "Growth Package" stays as-is; "Link Tree" becomes "Link Tree package". */
  function withPackageWord(name) {
    var n = String(name || '').trim();
    return /\bpackage$/i.test(n) ? n : n + ' package';
  }

  function regularLabel(p) {
    return p.max ? money(p.price) + '–' + money(p.max) : money(p.price);
  }

  function shortDate(key) {
    if (!key) return '';
    var parts = key.split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /** "until Oct 31", "for the next 3 clients", or both. */
  function offerLimitText(offer, lang) {
    var es = lang === 'es';
    var bits = [];
    if (offer.endsAt) bits.push((es ? 'hasta el ' : 'until ') + shortDate(offer.endsAt));
    if (offer.spots) {
      bits.push(es
        ? (offer.spotsLeft === 1 ? 'para el próximo cliente' : 'para los próximos ' + offer.spotsLeft + ' clientes')
        : (offer.spotsLeft === 1 ? 'for the next client' : 'for the next ' + offer.spotsLeft + ' clients'));
    }
    if (bits.length === 2) return bits.join(es ? ' o ' : ' or ') + (es ? ', lo que ocurra primero' : ', whichever comes first');
    return bits[0] || '';
  }

  /** Effective price for charging / pipeline value. */
  function packagePrice(id) {
    var p = packageById(id);
    if (!p) return 0;
    var offer = activeOffer(id);
    return offer ? offer.price : p.price;
  }

  /**
   * What [package] / {{package}} becomes in a message, e.g.
   * "our Multi-Page Package is <price>" or
   * "our Multi-Page Package is <offer> (normally <price>) until Oct 31".
   */
  function packagePhrase(id) {
    var p = packageById(id);
    if (!p) return '';
    var offer = activeOffer(id);
    if (offer) {
      var limit = offerLimitText(offer, 'en');
      return 'our ' + withPackageWord(p.name) + ' is ' + money(offer.price) + ' (normally ' + regularLabel(p) + ')' + (limit ? ' ' + limit : '');
    }
    return 'our ' + withPackageWord(p.name) + ' ' + (p.max ? 'runs ' + regularLabel(p) : 'is ' + money(p.price));
  }

  /** Dropdown label, e.g. "Multi-Page Package — <offer> offer (normally <price>)". */
  function packageOptionLabel(id) {
    var p = packageById(id);
    if (!p) return '';
    var offer = activeOffer(id);
    return offer
      ? p.name + ' — ' + money(offer.price) + ' offer (normally ' + regularLabel(p) + ')'
      : p.name + ' — ' + regularLabel(p);
  }

  /** Services page + Hire Me: crossed-out price, offer price, badge. */
  function priceHtml(id, lang) {
    var p = packageById(id);
    if (!p) return '';
    var offer = activeOffer(id);
    if (!offer) return regularLabel(p);
    var limit = offerLimitText(offer, lang);
    return (
      '<s class="package-price-was">' + regularLabel(p) + '</s> ' +
      '<span class="package-price-now">' + money(offer.price) + '</span>' +
      '<span class="package-offer-badge">' + (lang === 'es' ? 'Oferta por tiempo limitado' : 'Limited-time offer') +
      (limit ? ' · ' + limit : '') + '</span>'
    );
  }

  function applyPackagesToPage() {
    if (typeof document === 'undefined') return;
    var lang = typeof window.cwrGetLang === 'function' ? window.cwrGetLang() : 'en';
    document.querySelectorAll('[data-package-price]').forEach(function (el) {
      var id = el.getAttribute('data-package-price');
      el.innerHTML = priceHtml(id, lang);
      el.classList.toggle('has-package-offer', !!activeOffer(id));
    });
    // Typed copies marked with a template: "Starter Package ({pkg_starter_page}) demo".
    // data-price-attr names an attribute to fill instead of the text (meta tags).
    // Custom dropdowns are skipped: their owners rebuild options and label from
    // the live prices, and rewriting a trigger label here could name the wrong
    // package. scripts/sync-prices.mjs writes the same templates into the files.
    document.querySelectorAll('[data-price-template]').forEach(function (el) {
      if (el.closest('.business-doc-select')) return;
      var text = fillPrices(el.getAttribute('data-price-template'));
      var attr = el.getAttribute('data-price-attr');
      if (attr) el.setAttribute(attr, text);
      else el.textContent = text;
    });
    // "Choose <price> Package" → "Choose <offer> Package" while an offer runs. The
    // regular text comes from i18n, which re-renders before this runs.
    document.querySelectorAll('[data-package-cta]').forEach(function (el) {
      var p = packageById(el.getAttribute('data-package-cta'));
      var offer = p && activeOffer(p.id);
      if (!offer) return;
      el.innerHTML = el.innerHTML.split(money(p.price)).join(money(offer.price));
    });
  }

  function savePackageOffers(next) {
    var clean = normalizeOffers(next);
    return window.rtdbUpdate(window.rtdbRef(window.rtdb, PATH), { packageOffers: clean, updatedAt: Date.now() })
      .then(function () {
        packageOffers = clean;
        notify();
        return clean;
      });
  }

  /** Counts one claimed spot (called when a lead on an offer pays a deposit). */
  function claimPackageSpot(id) {
    var o = packageOffers[id];
    if (!o || !window.rtdbUpdate) return Promise.resolve();
    var claimed = o.claimed + 1;
    var patch = {};
    patch['packageOffers/' + id + '/claimed'] = claimed;
    return window.rtdbUpdate(window.rtdbRef(window.rtdb, PATH), patch).then(function () {
      o.claimed = claimed;
      notify();
    });
  }

  window.PackagePricing = {
    packagePhrase: packagePhrase,
    withPackageWord: withPackageWord,
    PACKAGES: PACKAGES,
    get offers() { return packageOffers; },
    packageById: packageById,
    activeOffer: activeOffer,
    packagePrice: packagePrice,
    packageOptionLabel: packageOptionLabel,
    regularLabel: regularLabel,
    offerLimitText: offerLimitText,
    priceHtml: priceHtml,
    applyToPage: applyPackagesToPage,
    save: savePackageOffers,
    savePricing: savePricing,
    normalizePrices: normalizePrices,
    validatePricing: validatePricing,
    filesBehind: filesBehind,
    DEFAULT_PRICES: DEFAULT_PRICES,
    tokens: priceTokens,
    fill: fillPrices,
    claimSpot: claimPackageSpot,
    load: function () { return load(); }
  };

  publishVars();

  window.CarePricing = {
    TIERS: TIERS,
    MONTHLY: MONTHLY,
    DEFAULTS: DEFAULTS,
    get config() { return config; },
    clampPct: clampPct,
    yearlyPct: yearlyPct,
    quote: quote,
    promoMonthly: promoMonthly,
    money: money,
    pctLabel: pctLabel,
    applyToPlans: applyToPlans,
    applyToServicesPage: applyToServicesPage,
    i18nVars: i18nVars,
    load: load,
    save: save,
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); }
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { applyToServicesPage(); applyPackagesToPage(); load(); });
    } else {
      applyToServicesPage();
      applyPackagesToPage();
      load();
    }
  }
})();
