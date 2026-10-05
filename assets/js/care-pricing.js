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
        config = normalizeConfig(snap && snap.val());
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
    return window.rtdbSet(window.rtdbRef(window.rtdb, PATH), payload).then(function () {
      config = clean;
      notify();
      return config;
    });
  }

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
      document.addEventListener('DOMContentLoaded', function () { applyToServicesPage(); load(); });
    } else {
      applyToServicesPage();
      load();
    }
  }
})();
