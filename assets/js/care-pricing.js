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

  /** Tokens the services page strings use, e.g. {ess_annual}. */
  function i18nVars() {
    var e = quote('essential'), s = quote('standard'), p = quote('priority');
    var promo = config.promo;
    return {
      yearly_pct: pctLabel(e.pct),
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
    };
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

  /** Reads /agencyPricing once per page. Falls back to defaults if offline. */
  function load() {
    if (loadPromise) return loadPromise;
    loadPromise = waitForRtdb(15000).then(function (ok) {
      if (!ok) return config;
      return window.rtdbGet(window.rtdbRef(window.rtdb, PATH)).then(function (snap) {
        var raw = snap && snap.val();
        config = normalizeConfig(raw);
        packageOffers = normalizeOffers(raw && raw.packageOffers);
        notify();
        return config;
      }).catch(function (err) {
        console.warn('Care pricing: using defaults', err);
        return config;
      });
    });
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
  // Regular prices match llms.txt / the Services page. Offers live at
  // /agencyPricing/packageOffers/<id> = { enabled, price, endsAt, spots, claimed }.

  var PACKAGES = [
    { id: 'linktree', name: 'Link Tree', price: 99, max: 199, projectType: 'web', offerable: true },
    { id: 'starter-page', name: 'Starter Page', price: 499, projectType: 'web', offerable: true },
    { id: 'website', name: 'Business Website', price: 999, projectType: 'web', offerable: true },
    { id: 'starter', name: 'Starter Presence', price: 1500, projectType: 'both', offerable: true },
    { id: 'growth', name: 'Growth Platform', price: 3500, projectType: 'both', offerable: true },
    { id: 'agency', name: 'Business Platform', price: 6000, max: 12000, projectType: 'both', offerable: false },
    { id: 'studio', name: 'Studio Build', price: 15000, max: 40000, projectType: 'both', offerable: false }
  ];

  var packageOffers = {};

  function packageById(id) {
    for (var i = 0; i < PACKAGES.length; i++) if (PACKAGES[i].id === id) return PACKAGES[i];
    return null;
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
   * "our Business Website package is $999" or
   * "our Business Website package is $499 (normally $999) until Oct 31".
   */
  function packagePhrase(id) {
    var p = packageById(id);
    if (!p) return '';
    var offer = activeOffer(id);
    if (offer) {
      var limit = offerLimitText(offer, 'en');
      return 'our ' + p.name + ' package is ' + money(offer.price) + ' (normally ' + regularLabel(p) + ')' + (limit ? ' ' + limit : '');
    }
    return 'our ' + p.name + ' package ' + (p.max ? 'runs ' + regularLabel(p) : 'is ' + money(p.price));
  }

  /** Dropdown label, e.g. "Business Website — $499 offer (normally $999)". */
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
    // "Choose $999 Package" → "Choose $499 Package" while an offer runs. The
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
    PACKAGES: PACKAGES,
    get offers() { return packageOffers; },
    packageById: packageById,
    activeOffer: activeOffer,
    packagePrice: packagePrice,
    packagePhrase: packagePhrase,
    packageOptionLabel: packageOptionLabel,
    regularLabel: regularLabel,
    offerLimitText: offerLimitText,
    priceHtml: priceHtml,
    applyToPage: applyPackagesToPage,
    save: savePackageOffers,
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
