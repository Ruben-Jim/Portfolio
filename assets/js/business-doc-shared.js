/**
 * Business document print HTML — shared by admin (script.js) and client portal.
 */
(function (global) {
  'use strict';

  function formatCurrency(amount) {
    if (isNaN(amount)) return '$0.00';
    var n = Number(amount);
    try {
      return (
        '$' +
        n.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
      );
    } catch (e) {
      return '$' + n.toFixed(2);
    }
  }

  function formatInvoiceNumber(docOrId) {
    if (docOrId && typeof docOrId === 'object') {
      var stored = String(docOrId.invoiceNumber || '').trim();
      if (/^INV-\d{4}-\d{4,}$/i.test(stored)) return stored.toUpperCase();
      return formatInvoiceNumberFromId(docOrId.id);
    }
    return formatInvoiceNumberFromId(docOrId);
  }

  function formatInvoiceNumberFromId(docId) {
    var raw = String(docId || '').trim();
    if (!raw) return '—';
    var cleaned = raw.replace(/^doc[_-]?/i, '').replace(/[^a-zA-Z0-9]/g, '');
    if (cleaned.length > 8) cleaned = cleaned.slice(-8);
    return 'INV-' + cleaned.toUpperCase();
  }

  function formatDateDisplay(iso) {
    if (!iso) return '—';
    var raw = String(iso).trim();
    var ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    var d;
    if (ymd) {
      d = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    } else {
      d = new Date(raw);
    }
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /** Blob/print windows can't resolve site-root paths like /assets/... */
  function toAbsoluteAssetUrl(path) {
    var s = String(path || '').trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s) || s.indexOf('data:') === 0 || s.indexOf('blob:') === 0) {
      return s;
    }
    if (s.charAt(0) === '/' && global.location && global.location.origin) {
      return global.location.origin + s;
    }
    return s;
  }

  function typeLabelFor(doc) {
    if (!doc) return 'DOCUMENT';
    if (doc.type === 'proposal') return 'PROPOSAL';
    if (doc.type === 'estimate') return 'ESTIMATE';
    if (doc.type === 'invoice') return 'INVOICE';
    if (doc.type === 'contract') return 'CONTRACT';
    return 'DOCUMENT';
  }

  function escapeHtml(str) {
    if (str == null || str === '') return '';
    var s = String(str);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Strips leading jot/bullet markers and numbered prefixes from one line. */
  function stripLeadingBulletMarker(line) {
    var s = String(line).replace(/^\s+/, '');
    s = s.replace(/^\d+[\.\)]\s+/, '');
    s = s.replace(/^[\u2022\u2023\u25E6\u25AA\u2043\u2219\u00B7\u25CF\-\*•·▪◦]\s*/, '');
    return s.trim();
  }

  /** Portal catalog — keep in sync with client-portal.js MAINTENANCE_PLANS + Services & Pricing. */
  var MAINTENANCE_PLANS = [
    {
      id: 'essential',
      badge: 'Essential',
      title: 'Keep it healthy',
      monthly: '$79/mo',
      annual: '$522/yr',
      monthlyAmount: 79,
      annualAmount: 522,
      monthlyNote: 'Billed monthly',
      annualNote: 'Save 45% vs monthly',
      annualEquiv: '~$44/mo equivalent · billed once per year',
      slaLabel: '5 business days',
      features: [
        'Response within 5 business days',
        '1 maintenance window per month',
        'Hosting, updates, monitoring, minor fixes',
        'Web + iOS + Android support'
      ]
    },
    {
      id: 'standard',
      badge: 'Standard',
      title: 'Recommended for live ops',
      monthly: '$150/mo',
      annual: '$990/yr',
      monthlyAmount: 150,
      annualAmount: 990,
      monthlyNote: 'Billed monthly',
      annualNote: 'Save 45% vs monthly',
      annualEquiv: '~$83/mo equivalent · billed once per year',
      slaLabel: '72 business hours',
      recommended: true,
      features: [
        'Response within 72 business hours',
        '1 maintenance window per month',
        'Hosting, updates, monitoring, minor fixes',
        'Web + iOS + Android support'
      ]
    },
    {
      id: 'priority',
      badge: 'Priority',
      title: 'Faster turnaround',
      monthly: '$300/mo',
      annual: '$1,980/yr',
      monthlyAmount: 300,
      annualAmount: 1980,
      monthlyNote: 'Billed monthly',
      annualNote: 'Save 45% vs monthly',
      annualEquiv: '~$165/mo equivalent · billed once per year',
      slaLabel: '24 business hours',
      features: [
        'Response within 24 business hours',
        '2 maintenance windows per month',
        'Hosting, updates, monitoring, minor fixes',
        'Web + iOS + Android support'
      ]
    }
  ];

  var SCOPE_MULTI_COL_THRESHOLD = 8;

  /**
   * One list item per non-empty line (project scope & add-on descriptions are jot lists).
   * @param {string} listClass e.g. scope-feature-list | addon-desc-list
   * @param {{ multiColThreshold?: number }=} options
   */
  function linesToBulletListHtml(raw, listClass, options) {
    if (raw == null || String(raw).trim() === '') return '';
    var lines = String(raw).split(/\r?\n/);
    var items = [];
    for (var i = 0; i < lines.length; i++) {
      var item = stripLeadingBulletMarker(lines[i]);
      if (item) items.push(item);
    }
    if (!items.length) return '';
    var threshold =
      options && typeof options.multiColThreshold === 'number'
        ? options.multiColThreshold
        : 0;
    var className = listClass;
    if (threshold > 0 && items.length >= threshold) {
      className += ' is-multi-col';
    }
    var html = '<ul class="' + className + '">';
    for (var j = 0; j < items.length; j++) {
      html += '<li><span class="bullet-li-text">' + escapeHtml(items[j]) + '</span></li>';
    }
    html += '</ul>';
    return html;
  }

  function normalizeProposedSiteHref(url) {
    var s = (url || '').trim();
    if (!s) return '';
    if (/^mailto:/i.test(s)) return s;
    if (/^https?:\/\//i.test(s)) return s;
    return 'https://' + s.replace(/^\/+/, '');
  }

  function formatProposedSitePdfHtml(url) {
    var s = (url || '').trim();
    if (!s) {
      return '<span class="feature-desc-muted">—</span>';
    }
    var href = escapeHtml(normalizeProposedSiteHref(s));
    var label = escapeHtml(s.replace(/^https?:\/\//i, ''));
    return '<a href="' + href + '" class="feature-desc-link">' + label + '</a>';
  }

  /**
   * Value Proposition / scope: framed block + kicker (matches modal “proposed scope”) + jot list.
   */
  function buildScopeBodyHtml(raw) {
    var wrapScope = function (listInner) {
      return (
        '<div class="scope-block">' +
        '<div class="scope-frame">' +
        '<div class="scope-frame-inner">' +
        '<p class="scope-kicker">Proposed scope &amp; deliverables</p>' +
        listInner +
        '</div></div></div>'
      );
    };
    var emptyHint =
      wrapScope(
        '<ul class="scope-feature-list">' +
          '<li><span class="bullet-li-text">Outline the project scope, deliverables, and key terms here.</span></li>' +
          '</ul>'
      );
    var inner = linesToBulletListHtml(raw, 'scope-feature-list', {
      multiColThreshold: SCOPE_MULTI_COL_THRESHOLD
    });
    if (!inner) return emptyHint;
    return wrapScope(inner);
  }

  function findMaintenancePlan(planId) {
    var id = String(planId || '').toLowerCase();
    for (var i = 0; i < MAINTENANCE_PLANS.length; i++) {
      if (MAINTENANCE_PLANS[i].id === id) return MAINTENANCE_PLANS[i];
    }
    return null;
  }

  /**
   * @param {object} plan
   * @param {'both'|'monthly'|'annual'} priceMode
   *   both = monthly + annual (proposal, or estimate/invoice when monthly selected)
   *   annual = annual only
   */
  function buildMaintenancePlanCardHtml(plan, priceMode) {
    if (!plan) return '';
    var featureLis = '';
    var feats = plan.features || [];
    for (var i = 0; i < feats.length; i++) {
      featureLis +=
        '<li><span class="bullet-li-text">' + escapeHtml(feats[i]) + '</span></li>';
    }
    var priceRows = '';
    if (priceMode === 'annual') {
      priceRows =
        '<div class="maint-price-row maint-price-row--annual">' +
        '<div class="maint-price-main">' +
        escapeHtml(plan.annual) +
        '</div>' +
        '<div class="maint-price-note">' +
        escapeHtml(plan.annualNote) +
        '</div>' +
        '<div class="maint-price-equiv">' +
        escapeHtml(plan.annualEquiv) +
        '</div></div>';
    } else {
      priceRows =
        '<div class="maint-price-grid">' +
        '<div class="maint-price-row">' +
        '<div class="maint-price-label">Monthly</div>' +
        '<div class="maint-price-main">' +
        escapeHtml(plan.monthly) +
        '</div>' +
        '<div class="maint-price-note">' +
        escapeHtml(plan.monthlyNote) +
        '</div></div>' +
        '<div class="maint-price-row maint-price-row--highlight">' +
        '<div class="maint-price-label">Annual</div>' +
        '<div class="maint-price-main">' +
        escapeHtml(plan.annual) +
        '</div>' +
        '<div class="maint-price-note">' +
        escapeHtml(plan.annualNote) +
        '</div>' +
        '<div class="maint-price-equiv">' +
        escapeHtml(plan.annualEquiv) +
        '</div></div></div>';
    }
    return (
      '<div class="maint-plan-card">' +
      '<div class="maint-plan-badge">' +
      escapeHtml(plan.badge) +
      '</div>' +
      '<div class="maint-plan-title">' +
      escapeHtml(plan.title) +
      '</div>' +
      '<div class="maint-plan-sla">Response target: ' +
      escapeHtml(plan.slaLabel) +
      '</div>' +
      priceRows +
      '<ul class="maint-feature-list">' +
      featureLis +
      '</ul></div>'
    );
  }

  /**
   * Separate PDF section for maintenance plans.
   * Proposal → all plans, both monthly + annual.
   * Estimate/invoice → selected plan; monthly billing shows both prices (savings);
   * annual billing shows annual only. Empty if no plan selected.
   * @param {BusinessDocument} doc
   */
  function buildMaintenancePdfHtml(doc) {
    if (!doc) return '';
    var type = String(doc.type || '').toLowerCase();
    var cards = [];
    var intro = '';

    if (type === 'proposal') {
      // Proposal PDF embeds compact dual plans beside turn-key pricing.
      return '';
    } else if (type === 'estimate' || type === 'invoice' || type === 'contract') {
      var plan = findMaintenancePlan(doc.maintenancePlanId);
      if (!plan) return '';
      var billing = String(doc.maintenanceBilling || 'monthly').toLowerCase();
      var priceMode = billing === 'annual' ? 'annual' : 'both';
      var typeNoun = type === 'contract' ? 'agreement' : type;
      intro =
        priceMode === 'annual'
          ? 'Selected maintenance plan for this ' +
            typeNoun +
            ' (annual billing).'
          : 'Selected maintenance plan for this ' +
            typeNoun +
            '. Annual pricing is shown so you can see the savings vs monthly.';
      cards.push(buildMaintenancePlanCardHtml(plan, priceMode));
    } else {
      return '';
    }

    if (!cards.length) return '';
    return (
      '    <hr class="divider">\n' +
      '    <div class="section-title">Maintenance plans</div>\n' +
      '    <p class="addons-section-intro">' +
      escapeHtml(intro) +
      '</p>\n' +
      '    <div class="maint-plans-grid">' +
      cards.join('') +
      '</div>\n'
    );
  }

  function buildAddonDescriptionPdfHtml(raw) {
    return linesToBulletListHtml(raw, 'addon-desc-list');
  }

  /**
   * Builds optional add-ons block for PDF/print HTML (empty string if none).
   * @param {BusinessDocument} doc
   * @param {{ compactSingle?: boolean }=} options - legacy; single add-on always uses compact layout
   */
  function buildAddOnsPdfHtml(doc, options) {
    if (!doc || !doc.addOns || !Array.isArray(doc.addOns) || doc.addOns.length === 0) return '';
    var items = [];
    for (var i = 0; i < doc.addOns.length; i++) {
      var addon = doc.addOns[i];
      if (!addon || !addon.name) continue;
      var opts = addon.priceOptions && Array.isArray(addon.priceOptions) ? addon.priceOptions : [];
      if (!opts.length) continue;
      var includesUsage = !!addon.includesUsage;
      var usageLimits =
        includesUsage && Array.isArray(addon.usageLimits)
          ? addon.usageLimits.filter(function (lim) {
              return lim && (String(lim.label || '').trim() || String(lim.details || '').trim());
            })
          : [];
      items.push({
        name: addon.name,
        description: addon.description || '',
        includesUsage: includesUsage,
        usageLimits: usageLimits,
        amounts: opts.map(function (o) {
          return typeof o.amount === 'number' && !isNaN(o.amount) ? o.amount : 0;
        })
      });
    }
    if (!items.length) return '';
    var isSingle = items.length === 1;
    var parts = [];
    for (var k = 0; k < items.length; k++) {
      var it = items[k];
      var nameEsc = escapeHtml(it.name);
      var descInner = buildAddonDescriptionPdfHtml(it.description);
      var tierRows = '';
      for (var j = 0; j < it.amounts.length; j++) {
        var priceLabel =
          formatCurrency(it.amounts[j]) + (it.includesUsage ? ' + usage' : '');
        tierRows +=
          '<div class="addon-price-pill">' +
          '<span class="addon-tier-price">' +
          escapeHtml(priceLabel) +
          '</span></div>';
      }
      var usageHtml = '';
      if (it.includesUsage && it.usageLimits.length) {
        usageHtml =
          '<ul class="addon-usage-list">' +
          it.usageLimits
            .map(function (lim) {
              var label = String((lim && lim.label) || '').trim();
              var details = String((lim && lim.details) || '').trim();
              if (!label && !details) return '';
              return (
                '<li><span class="addon-usage-label">' +
                escapeHtml(label || 'Limit') +
                '</span>' +
                (details
                  ? '<span class="addon-usage-details">' + escapeHtml(details) + '</span>'
                  : '') +
                '</li>'
              );
            })
            .join('') +
          '</ul>';
      }
      parts.push(
        '<div class="addon-card' +
          (isSingle ? ' addon-card--compact' : '') +
          '">' +
          '<div class="addon-card-head">' +
          '<div class="addon-card-title">' +
          nameEsc +
          '</div>' +
          '<div class="addon-tier-rows addon-tier-rows--pill">' +
          tierRows +
          '</div></div>' +
          (descInner
            ? '<div class="addon-card-desc">' + descInner + '</div>'
            : '') +
          usageHtml +
          '</div>'
      );
    }
    var gridClass =
      'addon-cards-grid' +
      (isSingle ? ' addon-cards-grid--single' : ' addon-cards-grid--multi');
    if (!isSingle && items.length === 2) gridClass += ' addon-cards-grid--two';
    if (!isSingle && items.length >= 3) gridClass += ' addon-cards-grid--many';
    var introHtml = isSingle
      ? ''
      : '    <p class="addons-section-intro">Optional ways to enhance or extend the proposed build—your customer can choose any tier to upgrade beyond the base scope above.</p>\n';
    return (
      '    <hr class="divider">\n' +
      '    <div class="section-title">Optional upgrades for the proposed site</div>\n' +
      introHtml +
      '    <div class="' +
      gridClass +
      '">' +
      parts.join('') +
      '</div>\n'
    );
  }

  /**
   * HTML generator for business documents. Produces print-optimized HTML
   * Params: { customer, typeLabel, created, due, scope, totalFormatted, proposedSiteUrl, addOnsBlockHtml, maintenanceBlockHtml }
   */
  function getBusinessDocumentHtml(params) {
    var customer = params.customer || {};
    var C = resolveDocTheme(params.theme || 'cwr');
    var scopeHtml = buildScopeBodyHtml(params.scope);
    var clientName = escapeHtml((customer.name || 'Client').toString().toUpperCase());
    var typeLabel = escapeHtml(params.typeLabel || 'DOCUMENT');
    var created = escapeHtml(params.created || '');
    var due = escapeHtml(params.due || '—');
    var totalFormatted = escapeHtml(params.totalFormatted || '$0.00');
    var id = escapeHtml(params.id || '');
    var addOnsBlockHtml = params.addOnsBlockHtml || '';
    var maintenanceBlockHtml = params.maintenanceBlockHtml || '';
    var proposedSiteCell = formatProposedSitePdfHtml(params.proposedSiteUrl || '');
    var proposedSiteFooterBtn = '';
    var proposalUrlTrim = (params.proposedSiteUrl || '').trim();
    if (proposalUrlTrim) {
      proposedSiteFooterBtn =
        '      <a href="' +
        escapeHtml(normalizeProposedSiteHref(proposalUrlTrim)) +
        '" class="btn-primary" target="_blank" rel="noopener noreferrer">View proposed site</a>\n';
    }

    var nextStepsHtml =
      '    <hr class="divider">\n' +
      '    <div class="section-title">Proposed next steps</div>\n' +
      '    <div class="next-steps-grid">\n' +
      '      <div class="next-step"><div class="next-step-num">01</div><div class="next-step-title">Review</div><span class="next-step-blurb">Confirm scope, investment, and deliverables match your goals.' +
      (proposalUrlTrim
        ? ' <a href="' +
          escapeHtml(normalizeProposedSiteHref(proposalUrlTrim)) +
          '" class="next-step-link" target="_blank" rel="noopener noreferrer">Open proposed site</a>.'
        : '') +
      '</span></div>\n' +
      '      <div class="next-step"><div class="next-step-num">02</div><div class="next-step-title">Discuss</div><span class="next-step-blurb">Questions or adjustments? Reach out before you approve.</span></div>\n' +
      '      <div class="next-step"><div class="next-step-num">03</div><div class="next-step-title">Approve</div><span class="next-step-blurb">Confirm acceptance in writing so kickoff, timeline, and next milestones can be scheduled.</span></div>\n' +
      '    </div>\n';

    return '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=820">\n  <title>' + typeLabel + ' — ' + (customer.name || '') + '</title>\n  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">\n  <style>\n' +
      '@page { size: A4; margin: 12mm; }\n' +
      '@media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } body { padding: 12px 16px !important; } .doc { page-break-inside: avoid; transform-origin: top center; } .header-tag { padding: 4px 10px; font-size: 10px; margin-bottom: 8px; } .doc-title { font-size: 20px; margin-bottom: 4px; } .doc-subtitle { font-size: 11px; margin-bottom: 12px; } .divider { margin: 10px 0 !important; } .section-title { font-size: 11px; margin-bottom: 6px; } .addons-section-intro { font-size: 10px; margin: -2px 0 10px 0; } .scope-frame { box-shadow: none !important; } .scope-frame-inner { padding: 10px 12px !important; } .scope-kicker { font-size: 12px !important; padding-bottom: 8px !important; margin-bottom: 10px !important; } .scope-feature-list li { font-size: 11px; padding: 6px 8px !important; margin-bottom: 4px !important; } .scope-feature-list.is-multi-col { gap: 4px 8px; } .scope-feature-list.is-multi-col li { margin-bottom: 0 !important; padding: 5px 7px !important; font-size: 10px; } .scope-feature-list li::before { width: 5px; height: 5px; margin-top: 5px; } .addon-cards-grid { gap: 10px; margin-top: 8px; } .addon-card { padding: 12px 14px; } .addon-card-title { font-size: 12px; } .addon-card-desc { font-size: 11px; margin-bottom: 8px; } .addon-desc-list li { font-size: 11px; padding: 5px 0; } .addon-tier-solo { padding: 10px 14px; } .addon-tier-price { font-size: 17px; } .maint-plans-grid { gap: 10px; margin-top: 8px; } .maint-plan-card { padding: 12px 14px; } .maint-plan-badge { font-size: 9px; padding: 3px 8px; } .maint-plan-title { font-size: 12px; } .maint-plan-sla { font-size: 10px; margin-bottom: 8px; } .maint-price-main { font-size: 16px; } .maint-price-note, .maint-price-equiv { font-size: 10px; } .maint-feature-list li { font-size: 10px; padding: 4px 0; } .features-grid { gap: 12px; margin-top: 6px; } .feature-title { font-size: 11px; margin-bottom: 2px; } .feature-desc { font-size: 11px; line-height: 1.35; } .pricing-grid { gap: 12px; margin-top: 6px; } .price-card { padding: 12px 16px; } .price-card-primary .price-label { font-size: 10px; margin-bottom: 4px; } .price-card-primary .price-amt { font-size: 28px; } .price-card-primary .price-meta { font-size: 11px; margin-top: 8px; line-height: 1.35; } .price-card-secondary .price-label { font-size: 10px; margin-bottom: 4px; } .price-card-secondary .price-meta { font-size: 11px; line-height: 1.4; } .why-list { margin-top: 6px; padding-left: 16px; font-size: 12px; line-height: 1.45; } .why-list li { margin-bottom: 4px; } .next-steps-grid { gap: 12px; margin-top: 6px; } .next-step-num { font-size: 16px; margin-bottom: 4px; padding-bottom: 4px; } .next-step-title { font-size: 12px; margin-bottom: 2px; } .next-step-link { font-size: 11px; } .footer-buttons { margin-top: 12px; gap: 8px; } .btn-primary, .btn-outline { padding: 8px 16px; font-size: 11px; } .footer-meta { margin-top: 12px; padding-top: 10px; font-size: 10px; } }\n' +
      '* { box-sizing: border-box; }\n' +
      'body { margin: 0; padding: 40px 32px; font-family: \'Inter\', sans-serif; background: ' + C.bg + '; color: ' + C.text + '; font-size: 14px; }\n' +
      '.doc { max-width: 800px; margin: 0 auto; }\n' +
      '.header-tag { display: inline-block; padding: 6px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; background: ' + C.primary + '; color: ' + C.bg + '; margin-bottom: 12px; }\n' +
      '.doc-title { font-family: \'Playfair Display\', serif; font-size: 24px; font-weight: 700; color: ' + C.primary + '; letter-spacing: 0.02em; text-transform: uppercase; line-height: 1.2; margin: 0 0 8px 0; }\n' +
      '.doc-subtitle { font-size: 12px; color: ' + C.muted + '; margin-bottom: 24px; }\n' +
      '.doc-subtitle a { color: ' + C.primary + '; text-decoration: underline; }\n' +
      '.divider { border: none; height: 1px; background: rgba(255,255,255,0.1); margin: 24px 0; }\n' +
      '.section-title { font-family: \'Playfair Display\', serif; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: ' + C.primary + '; margin-bottom: 12px; }\n' +
      '.addons-section-intro { font-size: 12px; line-height: 1.55; color: ' + C.muted + '; margin: -4px 0 14px 0; max-width: 58ch; }\n' +
      '.scope-block { margin-top: 4px; }\n' +
      '.scope-frame { padding: 2px; border-radius: 14px; background: linear-gradient(145deg, ' + C.primary + ' 0%, ' + C.a(0.35) + ' 18%, rgba(15,23,42,0.95) 55%, ' + C.bg + ' 100%); box-shadow: 0 16px 48px rgba(0,0,0,0.4); }\n' +
      '.scope-frame-inner { border-radius: 12px; padding: 18px 20px 16px; background: linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.2) 100%); border: 1px solid rgba(255,255,255,0.1); }\n' +
      '.scope-kicker { margin: 0 0 16px 0; padding: 0 0 12px 0; border-bottom: 1px solid ' + C.a(0.45) + '; font-family: \'Playfair Display\', serif; font-size: 15px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ' + C.primaryBright + '; text-shadow: 0 1px 2px rgba(0,0,0,0.45); }\n' +
      '.scope-feature-list { list-style: none; margin: 0; padding: 0; }\n' +
      '.scope-feature-list.is-multi-col { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; align-items: stretch; }\n' +
      '.scope-feature-list.is-multi-col li { margin-bottom: 0; height: 100%; }\n' +
      '.scope-feature-list li { display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px; margin-bottom: 6px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); background: rgba(0,0,0,0.18); font-size: 13px; line-height: 1.5; font-weight: 500; color: ' + C.text + '; }\n' +
      '.scope-feature-list li:last-child { margin-bottom: 0; }\n' +
      '.scope-feature-list.is-multi-col li:last-child { margin-bottom: 0; }\n' +
      '.scope-feature-list li::before { content: \'\'; flex-shrink: 0; width: 7px; height: 7px; margin-top: 6px; border-radius: 2px; background: linear-gradient(145deg, ' + C.primary + ', ' + C.primaryDeep + '); box-shadow: 0 0 0 1px ' + C.a(0.4) + '; }\n' +
      '.bullet-li-text { flex: 1; min-width: 0; letter-spacing: 0.01em; }\n' +
      '.addon-cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 22px 32px; margin-top: 12px; align-items: start; }\n' +
      '.addon-cards-grid--single { display: block; max-width: 320px; margin: 8px auto 0; }\n' +
      '.addon-cards-grid--two { grid-template-columns: 1fr 1fr; }\n' +
      '.addon-cards-grid--many { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }\n' +
      '.addon-desc-list { list-style: none; margin: 0; padding: 0; }\n' +
      '.addon-desc-list li { display: flex; align-items: flex-start; gap: 10px; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; line-height: 1.5; color: ' + C.muted + '; }\n' +
      '.addon-desc-list li:first-child { padding-top: 0; }\n' +
      '.addon-desc-list li:last-child { border-bottom: none; padding-bottom: 0; }\n' +
      '.addon-desc-list li::before { content: \'\'; flex-shrink: 0; width: 5px; height: 5px; margin-top: 6px; border-radius: 50%; background: ' + C.primary + '; opacity: 0.95; }\n' +
      '.addon-card { background: transparent; border: none; border-radius: 0; padding: 0; display: flex; flex-direction: column; min-height: 0; }\n' +
      '.addon-card-head { display: flex; align-items: center; justify-content: flex-start; gap: 8px 10px; flex-wrap: wrap; margin-bottom: 8px; }\n' +
      '.addon-card-title { font-size: 13px; font-weight: 600; letter-spacing: 0.02em; color: ' + C.primary + '; margin: 0; line-height: 1.35; flex: 0 1 auto; min-width: 0; max-width: 100%; }\n' +
      '.addon-card-desc { font-size: 12px; color: ' + C.muted + '; line-height: 1.55; margin-bottom: 8px; }\n' +
      '.addon-tier-rows { margin-top: auto; display: flex; flex-direction: column; gap: 10px; }\n' +
      '.addon-tier-rows--pill { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; flex: 0 0 auto; align-items: center; }\n' +
      '.addon-price-pill { display: inline-flex; align-items: center; justify-content: center; padding: 5px 12px; border-radius: 999px; border: 1px solid ' + C.a(0.45) + '; background: ' + C.a(0.14) + '; }\n' +
      '.addon-price-pill .addon-tier-price { font-size: 14px; }\n' +
      '.addon-tier-row { border-radius: 10px; overflow: hidden; border: none; background: ' + C.a(0.12) + '; }\n' +
      '.addon-tier-row.addon-tier-only { display: block; }\n' +
      '.addon-tier-solo { display: flex; align-items: center; justify-content: center; padding: 12px 16px; border-left: 3px solid ' + C.primary + '; background: transparent; }\n' +
      '.addon-tier-price { font-family: \'Playfair Display\', serif; font-size: 22px; font-weight: 700; color: ' + C.primary + '; white-space: nowrap; line-height: 1; }\n' +
      '.addon-usage-list { list-style: none; margin: 10px 0 0; padding: 0; }\n' +
      '.addon-usage-list li { display: flex; flex-direction: column; gap: 2px; padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.06); font-size: 12px; line-height: 1.45; }\n' +
      '.addon-usage-list li:first-child { border-top: none; padding-top: 0; }\n' +
      '.addon-usage-label { font-weight: 600; color: ' + C.text + '; }\n' +
      '.addon-usage-details { color: ' + C.muted + '; }\n' +
      '.maint-plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-top: 12px; }\n' +
      '.maint-plan-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 18px 18px 16px; display: flex; flex-direction: column; }\n' +
      '.maint-plan-badge { display: inline-block; align-self: flex-start; padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; background: ' + C.primary + '; color: ' + C.bg + '; margin-bottom: 10px; }\n' +
      '.maint-plan-title { font-size: 14px; font-weight: 600; color: ' + C.text + '; margin-bottom: 4px; }\n' +
      '.maint-plan-sla { font-size: 11px; color: ' + C.muted + '; margin-bottom: 14px; }\n' +
      '.maint-price-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }\n' +
      '.maint-price-row { border-radius: 10px; padding: 12px 12px 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.18); }\n' +
      '.maint-price-row--highlight { border-color: ' + C.a(0.45) + '; background: ' + C.a(0.12) + '; }\n' +
      '.maint-price-row--annual { margin-bottom: 14px; border-left: 3px solid ' + C.primary + '; }\n' +
      '.maint-price-label { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: ' + C.primary + '; margin-bottom: 4px; }\n' +
      '.maint-price-main { font-family: \'Playfair Display\', serif; font-size: 20px; font-weight: 700; color: ' + C.primary + '; line-height: 1.1; }\n' +
      '.maint-price-note { font-size: 11px; color: ' + C.muted + '; margin-top: 4px; }\n' +
      '.maint-price-equiv { font-size: 11px; color: ' + C.text + '; margin-top: 2px; opacity: 0.9; }\n' +
      '.maint-feature-list { list-style: none; margin: 0; padding: 0; }\n' +
      '.maint-feature-list li { display: flex; align-items: flex-start; gap: 10px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; line-height: 1.45; color: ' + C.muted + '; }\n' +
      '.maint-feature-list li:last-child { border-bottom: none; padding-bottom: 0; }\n' +
      '.maint-feature-list li::before { content: \'\'; flex-shrink: 0; width: 5px; height: 5px; margin-top: 6px; border-radius: 50%; background: ' + C.primary + '; }\n' +
      '.features-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 12px; }\n' +
      '.feature-col { }\n' +
      '.feature-title { font-size: 12px; font-weight: 600; color: ' + C.text + '; margin-bottom: 6px; }\n' +
      '.feature-desc { font-size: 12px; line-height: 1.5; color: ' + C.muted + '; }\n' +
      '.feature-desc-muted { color: ' + C.muted + '; }\n' +
      '.feature-desc-link { color: ' + C.primary + '; font-weight: 500; text-decoration: none; word-break: break-all; border-bottom: 1px solid ' + C.a(0.45) + '; }\n' +
      '.pricing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 12px; }\n' +
      '.price-card { padding: 20px; border-radius: 12px; }\n' +
      '.price-card-primary { background: ' + C.primary + '; color: ' + C.bg + '; }\n' +
      '.price-card-primary .price-label { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(15,23,42,0.8); margin-bottom: 8px; }\n' +
      '.price-card-primary .price-amt { font-family: \'Playfair Display\', serif; font-size: 36px; font-weight: 700; line-height: 1; }\n' +
      '.price-card-primary .price-meta { font-size: 12px; margin-top: 12px; line-height: 1.5; color: rgba(15,23,42,0.85); }\n' +
      '.price-card-secondary { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }\n' +
      '.price-card-secondary .price-label { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: ' + C.primary + '; margin-bottom: 8px; }\n' +
      '.price-card-secondary .price-meta { font-size: 12px; color: ' + C.muted + '; line-height: 1.6; }\n' +
      '.why-list { margin: 12px 0 0 0; padding-left: 20px; font-size: 14px; line-height: 1.7; color: ' + C.text + '; }\n' +
      '.why-list li { margin-bottom: 8px; }\n' +
      '.why-list li strong { color: ' + C.primary + '; }\n' +
      '.next-steps-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 12px; }\n' +
      '.next-step { }\n' +
      '.next-step-num { font-family: \'Playfair Display\', serif; font-size: 20px; font-weight: 700; color: ' + C.primary + '; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid ' + C.primary + '; }\n' +
      '.next-step-title { font-size: 13px; font-weight: 600; color: ' + C.text + '; margin-bottom: 4px; }\n' +
      '.next-step-blurb { font-size: 12px; line-height: 1.5; color: ' + C.muted + '; display: block; margin-top: 2px; }\n' +
      '.next-step-link { font-size: 12px; color: ' + C.primary + '; text-decoration: underline; }\n' +
      '.footer-buttons { display: flex; gap: 12px; margin-top: 28px; flex-wrap: wrap; }\n' +
      '.btn-primary { display: inline-block; padding: 12px 24px; background: ' + C.primary + '; color: ' + C.bg + '; font-family: \'Inter\', sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; text-decoration: none; border-radius: 8px; border: none; }\n' +
      '.btn-outline { display: inline-block; padding: 12px 24px; background: transparent; color: ' + C.primary + '; font-family: \'Inter\', sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; text-decoration: none; border-radius: 8px; border: 2px solid ' + C.primary + '; }\n' +
      '.footer-meta { margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 11px; color: ' + C.muted + '; }\n' +
      'a { color: ' + C.primary + '; }\n' +
      '</style>\n</head>\n<body>\n  <div class="doc">\n' +
      '    <div class="header-tag">PROFESSIONAL SYSTEM</div>\n' +
      '    <h1 class="doc-title">' + clientName + ': ' + typeLabel + '</h1>\n' +
      '    <div class="doc-subtitle">Designed & Built by Ruben Jimenez | <a href="https://rubenjimenez.dev">rubenjimenez.dev</a></div>\n' +
      '    <hr class="divider">\n' +
      scopeHtml + '\n' +
      '    <hr class="divider">\n' +
      '    <div class="section-title">Document Summary</div>\n' +
      '    <div class="features-grid">\n' +
      '      <div class="feature-col"><div class="feature-title">Client</div><div class="feature-desc">' + escapeHtml(customer.name || '—') + '</div></div>\n' +
      '      <div class="feature-col"><div class="feature-title">Due Date</div><div class="feature-desc">' + due + '</div></div>\n' +
      '      <div class="feature-col"><div class="feature-title">Proposed Site</div><div class="feature-desc">' + proposedSiteCell + '</div></div>\n' +
      '    </div>\n' +
      '    <hr class="divider">\n' +
      '    <div class="section-title">Turn-Key Pricing</div>\n' +
      '    <div class="pricing-grid">\n' +
      '      <div class="price-card price-card-primary">\n' +
      '        <div class="price-label">' + typeLabel + ' Total</div>\n' +
      '        <div class="price-amt">' + totalFormatted + '</div>\n' +
      '        <div class="price-meta">Includes scope outlined above. Final terms confirmed on acceptance.</div>\n' +
      '      </div>\n' +
      '      <div class="price-card price-card-secondary">\n' +
      '        <div class="price-label">Created</div>\n' +
      '        <div class="price-meta">' + created + '</div>\n' +
      '      </div>\n' +
      '    </div>\n' +
      maintenanceBlockHtml +
      addOnsBlockHtml +
      '    <hr class="divider">\n' +
      '    <div class="section-title">Why This Document</div>\n' +
      '    <ul class="why-list">\n' +
      '      <li><strong>Scope:</strong> Deliverables and key terms clearly defined above.</li>\n' +
      '      <li><strong>Pricing:</strong> Total and details at a glance.</li>\n' +
      '      <li><strong>Ready:</strong> Professional format for review and acceptance.</li>\n' +
      '    </ul>\n' +
      nextStepsHtml +
      '    <hr class="divider">\n' +
      '    <div class="footer-buttons">\n' +
      proposedSiteFooterBtn +
      '      <a href="https://rubenjimenez.dev" class="btn-outline">View Portfolio</a>\n' +
      '      <a href="mailto:Ruben.Jim.co@gmail.com" class="btn-outline">Contact Me</a>\n' +
      '    </div>\n' +
      '    <div class="footer-meta">Generated from rubenjimenez.dev | ' + '</div>\n' +
      '  </div>\n</body>\n</html>';
  }


  var DOC_THEME_IDS = ['cwr', 'slate', 'ocean', 'forest', 'coral', 'violet', 'mono'];

  var DOC_THEME_META = {
    cwr: { label: 'CWR', swatch: '#ffdb70' },
    slate: { label: 'Slate', swatch: '#94a3b8' },
    ocean: { label: 'Ocean', swatch: '#38bdf8' },
    forest: { label: 'Forest', swatch: '#34d399' },
    coral: { label: 'Coral', swatch: '#fb7185' },
    violet: { label: 'Violet', swatch: '#a78bfa' },
    mono: { label: 'Mono', swatch: '#a3a3a3' }
  };

  var DOC_THEME_ACCENTS = {
    // Match site --orange-yellow-crayola / --vegas-gold
    cwr: { primary: '#ffdb70', deep: '#ceb15a', bright: '#ffe08a' },
    slate: { primary: '#94a3b8', deep: '#64748b', bright: '#cbd5e1' },
    ocean: { primary: '#38bdf8', deep: '#0284c7', bright: '#7dd3fc' },
    forest: { primary: '#34d399', deep: '#059669', bright: '#6ee7b7' },
    coral: { primary: '#fb7185', deep: '#e11d48', bright: '#fda4af' },
    violet: { primary: '#a78bfa', deep: '#7c3aed', bright: '#c4b5fd' },
    mono: { primary: '#a3a3a3', deep: '#525252', bright: '#e5e5e5' }
  };

  // Shared defaults for non-CWR palettes
  var DOC_THEME_SURFACES = {
    dark: { bg: '#0f172a', card: '#0f141a', text: '#e8e6df', muted: '#94a3b8' },
    light: { bg: '#f8fafc', card: '#ffffff', text: '#0f172a', muted: '#64748b' }
  };

  // CWR surfaces match site tokens:
  // dark: --smoky-black / --eerie-black-2 / --white-2 / --light-gray
  // light: light theme body / --eerie-black-2 / --white-1 / --light-gray
  var DOC_THEME_SURFACES_BY_ID = {
    cwr: {
      dark: { bg: '#121212', card: '#1e1e1f', text: '#fafafa', muted: '#d6d6d6' },
      light: { bg: '#f0f0f0', card: '#ffffff', text: '#1a1a1a', muted: '#404040' }
    }
  };

  function normalizeDocThemeId(id) {
    var key = String(id || 'cwr').toLowerCase().trim();
    return DOC_THEME_IDS.indexOf(key) >= 0 ? key : 'cwr';
  }

  function listDocThemes() {
    return DOC_THEME_IDS.map(function (id) {
      return {
        id: id,
        label: DOC_THEME_META[id].label,
        swatch: DOC_THEME_META[id].swatch
      };
    });
  }

  function resolveColorMode(options) {
    var opts = options && typeof options === 'object' ? options : {};
    if (opts.colorMode === 'light' || opts.colorMode === 'dark') return opts.colorMode;
    try {
      var attr =
        (typeof document !== 'undefined' &&
          document.documentElement &&
          document.documentElement.getAttribute('data-theme')) ||
        '';
      if (attr === 'light' || attr === 'dark') return attr;
    } catch (e) { /* ignore */ }
    try {
      if (typeof window !== 'undefined' && window.matchMedia) {
        if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
      }
    } catch (e2) { /* ignore */ }
    return 'dark';
  }

  function hexToRgb(hex) {
    var h = String(hex || '').replace('#', '').trim();
    if (h.length === 3) {
      h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    }
    if (h.length !== 6) return { r: 234, g: 179, b: 8 };
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  }

  function resolveDocTheme(docOrTheme, options) {
    var themeId = 'cwr';
    if (typeof docOrTheme === 'string') themeId = docOrTheme;
    else if (docOrTheme && typeof docOrTheme === 'object') themeId = docOrTheme.theme;
    themeId = normalizeDocThemeId(themeId);
    var mode = resolveColorMode(options);
    var accents = DOC_THEME_ACCENTS[themeId] || DOC_THEME_ACCENTS.cwr;
    var surfaceSet = DOC_THEME_SURFACES_BY_ID[themeId] || DOC_THEME_SURFACES;
    var surfaces = surfaceSet[mode] || surfaceSet.dark || DOC_THEME_SURFACES.dark;
    // Mono flips accent contrast for readability on light/dark paper.
    if (themeId === 'mono') {
      accents =
        mode === 'light'
          ? { primary: '#171717', deep: '#404040', bright: '#525252' }
          : { primary: '#e5e5e5', deep: '#a3a3a3', bright: '#f5f5f5' };
    }
    var rgb = hexToRgb(accents.primary);
    return {
      id: themeId,
      mode: mode,
      primary: accents.primary,
      primaryDeep: accents.deep,
      primaryBright: accents.bright,
      bg: surfaces.bg,
      card: surfaces.card,
      text: surfaces.text,
      muted: surfaces.muted,
      a: function (alpha) {
        return 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + alpha + ')';
      }
    };
  }


  function jotLines(raw) {
    if (raw == null || String(raw).trim() === '') return [];
    var lines = String(raw).split(/\r?\n/);
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var item = stripLeadingBulletMarker(lines[i]);
      if (item) out.push(item);
    }
    return out;
  }

  function formatMoneyShort(amount) {
    var n = Number(amount);
    if (isNaN(n)) return '$0';
    if (Math.abs(n - Math.round(n)) < 0.001) return '$' + Math.round(n).toLocaleString();
    return formatCurrency(n);
  }

  function normalizeCoreFeatures(doc) {
    var list = [];
    if (doc && Array.isArray(doc.coreFeatures)) {
      for (var i = 0; i < doc.coreFeatures.length && list.length < 4; i++) {
        var f = doc.coreFeatures[i] || {};
        var title = String(f.title || '').trim();
        var description = String(f.description || '').trim();
        if (title || description) list.push({ title: title || 'Feature', description: description });
      }
    }
    return list;
  }

  function includedLinesForProposal(doc) {
    var fromIncluded = jotLines(doc && doc.includedItems);
    if (fromIncluded.length) return fromIncluded;
    return jotLines(doc && doc.notes);
  }

  /** Compact maintenance cards for proposal pricing row. */
  function buildProposalMaintCompactHtml() {
    var cards = [];
    for (var i = 0; i < MAINTENANCE_PLANS.length; i++) {
      var plan = MAINTENANCE_PLANS[i];
      var feat = (plan.features || []).slice(0, 3);
      var lis = '';
      for (var j = 0; j < feat.length; j++) {
        lis += '<li>' + escapeHtml(feat[j]) + '</li>';
      }
      var rec =
        plan.recommended
          ? '<div class="pc-maint-rec">Recommended</div>'
          : '';
      cards.push(
        '<div class="pc-maint-card' + (plan.recommended ? ' is-recommended' : '') + '">' +
          '<div class="pc-maint-badge">' + escapeHtml(plan.badge) + '</div>' +
          rec +
          '<div class="pc-maint-price">' + escapeHtml(plan.monthly) + '</div>' +
          '<div class="pc-maint-annual">' + escapeHtml(plan.annual) + ' · ' + escapeHtml(plan.annualNote) + '</div>' +
          '<ul class="pc-maint-feats">' + lis + '</ul>' +
        '</div>'
      );
    }
    return '<div class="pc-maint-dual pc-maint-dual--' + MAINTENANCE_PLANS.length + '">' + cards.join('') + '</div>';
  }

  /**
   * Pro Cleaning–style one-page proposal layout.
   */
  function getProposalDocumentHtml(doc) {
    var C = resolveDocTheme(doc);
    var clientName = String((doc && doc.clientName) || 'Client').trim() || 'Client';
    var headlineRaw = String((doc && doc.proposalHeadline) || '').trim();
    if (!headlineRaw) {
      headlineRaw = clientName.toUpperCase() + ': HIGH-PERFORMANCE TURN-KEY SYSTEM';
    }
    var headline = escapeHtml(headlineRaw.toUpperCase());
    var valueProp = String((doc && doc.valueProposition) || '').trim();
    if (!valueProp) {
      valueProp =
        'A fast, reliable system built for real-world use—clear workflows, branded client experience, and cloud-backed data without the friction of clunky generic tools.';
    }
    var cores = normalizeCoreFeatures(doc);
    var coreHtml = '';
    if (cores.length) {
      var cols = '';
      for (var c = 0; c < cores.length; c++) {
        cols +=
          '<div class="pc-core-col">' +
          '<div class="pc-core-title">' + escapeHtml(cores[c].title) + '</div>' +
          '<div class="pc-core-desc">' + escapeHtml(cores[c].description) + '</div>' +
          '</div>';
      }
      coreHtml =
        '    <hr class="divider">\n' +
        '    <div class="section-title">System Core Features</div>\n' +
        '    <div class="pc-core-grid pc-core-grid--' + cores.length + '">' + cols + '</div>\n';
    }

    var included = includedLinesForProposal(doc);
    var includedLis = '';
    if (!included.length) {
      included = ['Full app deployment', 'Custom branding', 'Cloud integration', 'Admin workflows', '12 months technical support'];
    }
    for (var i = 0; i < included.length; i++) {
      includedLis += '<li>' + escapeHtml(included[i]) + '</li>';
    }

    var totalFormatted = escapeHtml(formatMoneyShort(doc && doc.total));
    var maintCompact = buildProposalMaintCompactHtml();

    var whyIntro = String((doc && doc.whyDifferentIntro) || '').trim();
    var whyLines = jotLines(doc && doc.whyDifferent);
    if (!whyIntro && !whyLines.length) {
      whyIntro = 'Built as a production-ready system—not a template with extras bolted on.';
      whyLines = [
        'Tech stack: modern web/mobile foundations with cloud sync and offline-friendly patterns where it matters.',
        'Design standards: smooth motion and clear hierarchy so the product feels intentional in the field.',
        'Speed: local-first patterns where useful, with reliable cloud backup for leads and ops data.'
      ];
    }
    var whyLis = '';
    for (var w = 0; w < whyLines.length; w++) {
      whyLis += '<li>' + escapeHtml(whyLines[w]) + '</li>';
    }
    var whyHtml =
      '    <hr class="divider">\n' +
      '    <div class="section-title">Why This Build Is Different</div>\n' +
      (whyIntro ? '    <p class="pc-body">' + escapeHtml(whyIntro) + '</p>\n' : '') +
      (whyLis ? '    <ul class="why-list">' + whyLis + '</ul>\n' : '');

    var demoUrl = String((doc && doc.proposedSiteUrl) || '').trim();
    var foundationUrl = String((doc && doc.foundationUrl) || '').trim();
    var demoHref = demoUrl ? escapeHtml(normalizeProposedSiteHref(demoUrl)) : '';
    var demoLabel = demoUrl ? escapeHtml(demoUrl.replace(/^https?:\/\//i, '')) : '';
    var foundationHref = foundationUrl ? escapeHtml(normalizeProposedSiteHref(foundationUrl)) : '';
    var foundationLabel = foundationUrl ? escapeHtml(foundationUrl.replace(/^https?:\/\//i, '')) : '';

    var step1 =
      '<div class="next-step"><div class="next-step-num">01</div><div class="next-step-title">View the Demo</div><span class="next-step-blurb">' +
      (demoHref
        ? 'Explore the proposed build at <a class="next-step-link" href="' + demoHref + '" target="_blank" rel="noopener noreferrer">' + demoLabel + '</a>.'
        : 'Review the proposed experience and confirm it matches your workflow.') +
      '</span></div>';
    var stepLaunch =
      '<div class="next-step"><div class="next-step-num">' +
      (foundationHref ? '03' : '02') +
      '</div><div class="next-step-title">Book a Launch Call</div><span class="next-step-blurb">Ready to proceed? Email <a class="next-step-link" href="mailto:Ruben.Jim.co@gmail.com">Ruben.Jim.co@gmail.com</a> to lock timeline and deposit.</span></div>';
    var nextStepsInner = step1;
    var nextStepsGridClass = 'next-steps-grid';
    if (foundationHref) {
      nextStepsInner +=
        '<div class="next-step"><div class="next-step-num">02</div><div class="next-step-title">Review the Foundation</div><span class="next-step-blurb">' +
        'Inspect the technical foundation at <a class="next-step-link" href="' +
        foundationHref +
        '" target="_blank" rel="noopener noreferrer">' +
        foundationLabel +
        '</a>.</span></div>';
      nextStepsInner += stepLaunch;
    } else {
      // F1: no foundation URL → hide middle step and renumber launch to 02
      nextStepsGridClass += ' next-steps-grid--two';
      nextStepsInner += stepLaunch;
    }

    var footerDemo = demoHref
      ? '      <a href="' + demoHref + '" class="btn-primary" target="_blank" rel="noopener noreferrer">View Demo</a>\n'
      : '';

    var addOnsBlockHtml = buildAddOnsPdfHtml(doc, { compactSingle: true });

    return '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=820">\n  <title>PROPOSAL — ' + escapeHtml(clientName) + '</title>\n  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">\n  <style>\n' +
      '@page { size: A4; margin: 10mm; }\n' +
      '@media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } body { padding: 10px 14px !important; } .doc { page-break-inside: avoid; } .doc-title { font-size: 22px; } .section-title { font-size: 11px; margin-bottom: 8px; } .pc-body { font-size: 12px; margin-bottom: 0; } .pc-core-grid { gap: 12px; } .pc-core-title { font-size: 11px; } .pc-core-desc { font-size: 11px; } .pc-pricing-row { gap: 12px; grid-template-columns: 1fr; } .pc-gold { padding: 14px 16px; } .pc-gold-amt { font-size: 28px; } .pc-gold-list { columns: 2; font-size: 11px; } .pc-maint-dual { grid-template-columns: 1fr 1fr 1fr; height: auto; } .pc-maint-card { padding: 10px 12px; } .pc-maint-price { font-size: 16px; } .pc-maint-feats li { font-size: 10px; } .why-list { font-size: 12px; } .next-steps-grid { gap: 12px; } .footer-buttons { margin-top: 14px; } .divider { margin: 12px 0 !important; } .addon-cards-grid--single .addon-card { padding: 0; } }\n' +
      '* { box-sizing: border-box; }\n' +
      'body { margin: 0; padding: 36px 28px; font-family: \'Inter\', sans-serif; background: ' + C.bg + '; color: ' + C.text + '; font-size: 14px; }\n' +
      '.doc { max-width: 820px; margin: 0 auto; }\n' +
      '.header-tag { display: inline-block; padding: 5px 12px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; background: ' + C.primary + '; color: ' + C.bg + '; margin-bottom: 14px; }\n' +
      '.doc-title { font-family: \'Playfair Display\', serif; font-size: 26px; font-weight: 700; color: ' + C.primary + '; letter-spacing: 0.02em; text-transform: uppercase; line-height: 1.15; margin: 0 0 8px 0; }\n' +
      '.doc-subtitle { font-size: 12px; color: ' + C.muted + '; margin-bottom: 8px; }\n' +
      '.doc-subtitle a { color: ' + C.primary + '; text-decoration: underline; }\n' +
      '.divider { border: none; height: 1px; background: rgba(255,255,255,0.12); margin: 18px 0; }\n' +
      '.section-title { font-family: \'Playfair Display\', serif; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: ' + C.primary + '; margin: 0 0 10px 0; }\n' +
      '.pc-body { font-size: 13px; line-height: 1.65; color: ' + C.text + '; margin: 0; max-width: 72ch; }\n' +
      '.pc-core-grid { display: grid; gap: 18px; margin-top: 4px; }\n' +
      '.pc-core-grid--1 { grid-template-columns: 1fr; }\n' +
      '.pc-core-grid--2 { grid-template-columns: 1fr 1fr; }\n' +
      '.pc-core-grid--3 { grid-template-columns: 1fr 1fr 1fr; }\n' +
      '.pc-core-grid--4 { grid-template-columns: 1fr 1fr 1fr 1fr; }\n' +
      '.pc-core-title { font-size: 12px; font-weight: 600; color: ' + C.primary + '; margin-bottom: 6px; line-height: 1.3; }\n' +
      '.pc-core-desc { font-size: 12px; line-height: 1.5; color: ' + C.muted + '; }\n' +
      '.pc-pricing-row { display: grid; grid-template-columns: 1fr; gap: 14px; align-items: stretch; margin-top: 4px; }\n' +
      '.pc-gold { background: ' + C.primary + '; color: ' + C.bg + '; border-radius: 10px; padding: 18px 20px; }\n' +
      '.pc-gold-label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.85; margin-bottom: 6px; }\n' +
      '.pc-gold-amt { font-family: \'Playfair Display\', serif; font-size: 34px; font-weight: 700; line-height: 1; margin-bottom: 12px; }\n' +
      '.pc-gold-included { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 6px; }\n' +
      '.pc-gold-list { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.5; columns: 2; column-gap: 28px; }\n' +
      '.pc-gold-list li { margin-bottom: 5px; break-inside: avoid; }\n' +
      '.pc-maint-dual { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; height: auto; }\n' +
      '.pc-maint-dual--3 { grid-template-columns: 1fr 1fr 1fr; }\n' +
      '.pc-maint-card { border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 16px 16px 14px; background: rgba(255,255,255,0.03); display: flex; flex-direction: column; min-height: 0; }\n' +
      '.pc-maint-card.is-recommended { border-color: ' + C.a(0.45) + '; background: ' + C.a(0.08) + '; }\n' +
      '.pc-maint-badge { display: inline-block; align-self: flex-start; font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: ' + C.bg + '; background: ' + C.primary + '; padding: 3px 8px; border-radius: 4px; margin-bottom: 6px; }\n' +
      '.pc-maint-rec { font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: ' + C.primary + '; margin: 0 0 6px; }\n' +
      '.pc-maint-price { font-family: \'Playfair Display\', serif; font-size: 22px; font-weight: 700; color: ' + C.primary + '; line-height: 1.1; }\n' +
      '.pc-maint-annual { font-size: 12px; color: ' + C.muted + '; margin: 6px 0 10px; line-height: 1.4; }\n' +
      '.pc-maint-feats { list-style: none; margin: auto 0 0; padding: 0; }\n' +
      '.pc-maint-feats li { position: relative; padding: 4px 0 4px 12px; font-size: 12px; line-height: 1.4; color: ' + C.muted + '; }\n' +
      '.pc-maint-feats li::before { content: \'\'; position: absolute; left: 0; top: 9px; width: 5px; height: 5px; border-radius: 50%; background: ' + C.primary + '; }\n' +
      '.why-list { margin: 10px 0 0; padding-left: 18px; font-size: 13px; line-height: 1.55; color: ' + C.text + '; }\n' +
      '.why-list li { margin-bottom: 6px; }\n' +
      '.next-steps-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 6px; }\n' +
      '.next-steps-grid--two { grid-template-columns: 1fr 1fr; max-width: none; width: 100%; }\n' +
      '.next-step-num { font-family: \'Playfair Display\', serif; font-size: 18px; font-weight: 700; color: ' + C.primary + '; margin-bottom: 6px; padding-bottom: 5px; border-bottom: 1px solid ' + C.primary + '; }\n' +
      '.next-step-title { font-size: 12px; font-weight: 600; color: ' + C.text + '; margin-bottom: 4px; }\n' +
      '.next-step-blurb { font-size: 11px; line-height: 1.45; color: ' + C.muted + '; display: block; }\n' +
      '.next-step-link { color: ' + C.primary + '; text-decoration: underline; overflow-wrap: anywhere; word-break: normal; }\n' +
      '.footer-buttons { display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap; }\n' +
      '.btn-primary { display: inline-block; padding: 10px 20px; background: ' + C.primary + '; color: ' + C.bg + '; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; text-decoration: none; border-radius: 6px; }\n' +
      '.btn-outline { display: inline-block; padding: 10px 20px; background: transparent; color: ' + C.primary + '; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; text-decoration: none; border-radius: 6px; border: 2px solid ' + C.primary + '; }\n' +
      '.footer-meta { margin-top: 18px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 10px; color: ' + C.muted + '; }\n' +
      '.addon-cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px 28px; margin-top: 10px; align-items: start; }\n' +
      '.addon-cards-grid--single { display: block; max-width: 300px; margin: 8px auto 0; }\n' +
      '.addon-cards-grid--two { grid-template-columns: 1fr 1fr; }\n' +
      '.addon-cards-grid--many { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }\n' +
      '.addon-cards-grid--single .addon-card--compact { padding: 0; text-align: left; }\n' +
      '.addon-cards-grid--single .addon-card-title { font-size: 12px; margin: 0; }\n' +
      '.addon-cards-grid--single .addon-card-desc { font-size: 11px; margin-bottom: 8px; }\n' +
      '.addon-tier-rows--pill { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; flex: 0 0 auto; align-items: center; }\n' +
      '.addon-price-pill { display: inline-flex; align-items: center; justify-content: center; padding: 5px 12px; border-radius: 999px; border: 1px solid ' + C.a(0.45) + '; background: ' + C.a(0.14) + '; }\n' +
      '.addon-price-pill .addon-tier-price { font-size: 13px; }\n' +
      '.addons-section-intro { font-size: 11px; color: ' + C.muted + '; margin: -2px 0 10px; }\n' +
      '.addon-card { background: transparent; border: none; border-radius: 0; padding: 0; }\n' +
      '.addon-card-head { display: flex; align-items: center; justify-content: flex-start; gap: 8px 10px; flex-wrap: wrap; margin-bottom: 8px; }\n' +
      '.addon-card-title { font-size: 12px; font-weight: 600; color: ' + C.primary + '; margin: 0; line-height: 1.35; flex: 0 1 auto; min-width: 0; max-width: 100%; }\n' +
      '.addon-card-desc { font-size: 11px; color: ' + C.muted + '; margin-bottom: 8px; line-height: 1.5; }\n' +
      '.addon-tier-solo { display: flex; justify-content: center; padding: 10px; border-left: 3px solid ' + C.primary + '; background: ' + C.a(0.12) + '; border-radius: 8px; }\n' +
      '.addon-tier-price { font-family: \'Playfair Display\', serif; font-size: 18px; font-weight: 700; color: ' + C.primary + '; }\n' +
      '.addon-usage-list { list-style: none; margin: 10px 0 0; padding: 0; text-align: left; }\n' +
      '.addon-usage-list li { display: flex; flex-direction: column; gap: 2px; padding: 6px 0; border-top: 1px solid rgba(255,255,255,0.06); font-size: 11px; line-height: 1.45; }\n' +
      '.addon-usage-list li:first-child { border-top: none; padding-top: 0; }\n' +
      '.addon-usage-label { font-weight: 600; color: ' + C.text + '; }\n' +
      '.addon-usage-details { color: ' + C.muted + '; }\n' +
      '</style>\n</head>\n<body>\n  <div class="doc">\n' +
      '    <div class="header-tag">PROFESSIONAL SYSTEM</div>\n' +
      '    <h1 class="doc-title">' + headline + '</h1>\n' +
      '    <div class="doc-subtitle">Designed & Built by Ruben Jimenez | <a href="https://rubenjimenez.dev">rubenjimenez.dev</a></div>\n' +
      '    <hr class="divider">\n' +
      '    <div class="section-title">The Value Proposition</div>\n' +
      '    <p class="pc-body">' + escapeHtml(valueProp) + '</p>\n' +
      coreHtml +
      '    <hr class="divider">\n' +
      '    <div class="section-title">Turn-Key Pricing</div>\n' +
      '    <div class="pc-pricing-row">\n' +
      '      <div class="pc-gold">\n' +
      '        <div class="pc-gold-label">Base Turn-Key System</div>\n' +
      '        <div class="pc-gold-amt">' + totalFormatted + '</div>\n' +
      '        <div class="pc-gold-included">Included:</div>\n' +
      '        <ul class="pc-gold-list">' + includedLis + '</ul>\n' +
      '      </div>\n' +
      maintCompact +
      '    </div>\n' +
      whyHtml +
      '    <hr class="divider">\n' +
      '    <div class="section-title">The Next Steps</div>\n' +
      '    <div class="' + nextStepsGridClass + '">' + nextStepsInner + '</div>\n' +
      addOnsBlockHtml +
      '    <hr class="divider">\n' +
      '    <div class="footer-buttons">\n' +
      footerDemo +
      '      <a href="mailto:Ruben.Jim.co@gmail.com" class="btn-outline">Contact Me</a>\n' +
      '    </div>\n' +
      '    <div class="footer-meta">Generated from rubenjimenez.dev</div>\n' +
      '  </div>\n</body>\n</html>';
  }

  /** Legacy default for contracts saved before per-contract payment stages existed. */
  var DEFAULT_CONTRACT_PAYMENT_STAGES = [
    { label: 'Deposit — due on signing', percent: 50 },
    { label: 'Milestone — due at build review', percent: 25 },
    { label: 'Final — due at launch', percent: 25 }
  ];

  /** Converts {label, percent}[] into dollar amounts that sum exactly to total (last stage absorbs rounding). */
  function computeContractPaymentAmounts(total, stages) {
    var t = Number(total) || 0;
    var list = Array.isArray(stages) && stages.length ? stages : DEFAULT_CONTRACT_PAYMENT_STAGES;
    var amounts = [];
    var running = 0;
    for (var i = 0; i < list.length; i++) {
      var pct = Number(list[i] && list[i].percent);
      if (isNaN(pct) || pct < 0) pct = 0;
      var amt;
      if (i === list.length - 1) {
        amt = Math.round((t - running) * 100) / 100;
      } else {
        amt = Math.round(t * (pct / 100) * 100) / 100;
        running += amt;
      }
      amounts.push({ label: (list[i] && list[i].label) || 'Payment', amount: amt });
    }
    return amounts;
  }

  function buildContractPaymentTableHtml(total, stages) {
    var rows = computeContractPaymentAmounts(total, stages);
    var rowsHtml = rows
      .map(function (r) {
        return '<tr><td>' + escapeHtml(r.label) + '</td><td class="amt">' + escapeHtml(formatCurrency(r.amount)) + '</td></tr>';
      })
      .join('');
    return (
      '<table class="contract-pay-table">' +
      '<thead><tr><th>Milestone</th><th class="amt">Amount</th></tr></thead>' +
      '<tbody>' +
      rowsHtml +
      '<tr class="contract-pay-total"><td>Total</td><td class="amt">' + escapeHtml(formatCurrency(total)) + '</td></tr>' +
      '</tbody></table>'
    );
  }

  function buildContractOwnershipClauseHtml(mode) {
    if (String(mode || '').toLowerCase() === 'buyout') {
      return (
        '<p>Upon receipt of final payment in full, all ownership of the source code, design assets, and related ' +
        'intellectual property developed under this Agreement transfers to Client. No license or ownership ' +
        'interest transfers before final payment clears.</p>'
      );
    }
    return (
      '<p>CWR retains ownership of the underlying source code, design system, and reusable components. Upon final ' +
      'payment, Client receives a perpetual, non-exclusive license to use the delivered application for its ' +
      'business. Full ownership transfer of source code and design assets is available separately via CWR’s IP ' +
      'Buyout add-on. In all cases, no license or ownership interest transfers until final payment has cleared in full.</p>'
    );
  }

  function buildMaintenanceLapseClauseHtml(doc) {
    var plan = findMaintenancePlan(doc && doc.maintenancePlanId);
    if (!plan) {
      return (
        '<p>No maintenance plan is attached to this Agreement. CWR’s warranty support under Clause 9 covers defects ' +
        'reported within 14 days of launch; beyond that window, CWR has no obligation to continue hosting, updating, ' +
        'or supporting the delivered application unless Client purchases a maintenance plan separately.</p>'
      );
    }
    return (
      '<p>CWR hosts and maintains the delivered application under the maintenance plan selected above (' +
      escapeHtml(plan.title) + ' &mdash; ' + escapeHtml(plan.badge) + '), billed on the cycle stated in that plan. ' +
      'If a payment is not received by its due date, the following schedule applies:</p>' +
      '<ul class="scope-feature-list">' +
      '<li><span class="bullet-li-text"><strong>Days 1&ndash;14 (grace period):</strong> CWR notifies Client by email. Hosting and support continue uninterrupted.</span></li>' +
      '<li><span class="bullet-li-text"><strong>Day 15:</strong> Support response times and scheduled maintenance windows under the plan above are paused until payment is received. The application remains live.</span></li>' +
      '<li><span class="bullet-li-text"><strong>Day 30:</strong> Hosting is suspended and the application is taken offline until payment is received in full, plus a reactivation fee equal to one month of the plan above.</span></li>' +
      '<li><span class="bullet-li-text"><strong>Day 60:</strong> If payment still has not been received, CWR may archive Client’s data, remove the application from CWR’s hosting, and close the account.</span></li>' +
      '</ul>' +
      '<p>Because Client holds a license to the delivered application under Clause 5 independent of maintenance status, Client ' +
      'may at any time &mdash; including during or after a lapse &mdash; request an export of the application’s source code and ' +
      'data to self-host or migrate to another provider, subject to CWR’s standard export/migration fee. If Client has separately ' +
      'purchased the IP Buyout under Clause 5, no export fee applies.</p>'
    );
  }

  function buildContractSignatureBlockHtml(signature) {
    var clientLineHtml, clientSubHtml, clientProvHtml;
    if (signature && signature.signedByName) {
      clientLineHtml =
        '<div class="contract-sig-line contract-sig-signed">' + escapeHtml(signature.signedByName) + '</div>';
      clientSubHtml =
        '<div class="contract-sig-sub">' + escapeHtml(formatDateDisplay(signature.signedAt)) + '</div>';
      clientProvHtml =
        '<div class="contract-sig-provenance">Signed electronically via CWR Client Portal' +
        (signature.portalToken
          ? ' &middot; token ' + escapeHtml(String(signature.portalToken).slice(0, 10)) + '&hellip;'
          : '') +
        '</div>';
    } else {
      clientLineHtml =
        '<div class="contract-sig-line contract-sig-blank">This contract must be signed electronically via the ' +
        'CWR Client Portal before work begins.</div>';
      clientSubHtml = '';
      clientProvHtml = '';
    }
    return (
      '<div class="contract-sig-block">' +
      '<div class="contract-sig-grid">' +
      '<div><div class="contract-sig-title">Developer</div>' +
      '<div class="contract-sig-line contract-sig-signed">Ruben Jimenez</div>' +
      '<div class="contract-sig-sub">CodeWithRuben</div></div>' +
      '<div><div class="contract-sig-title">Client</div>' + clientLineHtml + clientSubHtml + clientProvHtml + '</div>' +
      '</div></div>'
    );
  }

  /**
   * CWR Service Agreement — legal contract layout with fees/payment schedule,
   * IP/ownership, termination, and a signature block (unsigned or signed state).
   * @param {BusinessDocument} doc
   * @param {{signedByName: string, signedAt: string, portalToken?: string}=} signature
   */
  function getContractDocumentHtml(doc, signature) {
    var C = resolveDocTheme(doc);
    var clientName = String((doc && doc.clientName) || 'Client').trim() || 'Client';
    var clientEmail = String((doc && doc.clientEmail) || '').trim();
    var effectiveDate = formatDateDisplay(doc && doc.createdAt);
    var targetDate = doc && doc.dueDate ? formatDateDisplay(doc.dueDate) : '';
    var total = (doc && doc.total) || 0;
    var scopeHtml = buildScopeBodyHtml(doc && doc.notes);
    var contractId = escapeHtml((doc && doc.id) || '');
    var ownershipHtml = buildContractOwnershipClauseHtml(doc && doc.ipTransferMode);
    var sigBlockHtml = buildContractSignatureBlockHtml(signature);
    var maintenanceBlockHtml = buildMaintenancePdfHtml(doc);
    var maintenanceLapseHtml = buildMaintenanceLapseClauseHtml(doc);

    var timelineHtml = targetDate
      ? '<p>Target completion date: <strong>' + escapeHtml(targetDate) + '</strong>. Delays caused by late Client ' +
        'feedback, content, or approvals extend this date on a day-for-day basis and do not constitute a breach by CWR.</p>'
      : '<p>Timeline is estimated from Client feedback and approval turnaround. Delays caused by late Client ' +
        'feedback, content, or approvals extend the delivery date on a day-for-day basis and do not constitute a breach by CWR.</p>';

    return '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=820">\n  <title>CWR Service Agreement — ' + escapeHtml(clientName) + '</title>\n  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">\n  <style>\n' +
      '@page { size: A4; margin: 12mm; }\n' +
      '@media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } body { padding: 12px 16px !important; } .contract-clause { page-break-inside: avoid; } }\n' +
      '* { box-sizing: border-box; }\n' +
      'body { margin: 0; padding: 40px 32px; font-family: \'Inter\', sans-serif; background: ' + C.bg + '; color: ' + C.text + '; font-size: 14px; }\n' +
      '.doc { max-width: 800px; margin: 0 auto; }\n' +
      '.contract-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding-bottom: 18px; border-bottom: 2px solid ' + C.primary + '; margin-bottom: 22px; }\n' +
      '.contract-brand { font-family: \'Playfair Display\', serif; font-size: 17px; font-weight: 700; color: ' + C.text + '; }\n' +
      '.contract-brand span { color: ' + C.primary + '; }\n' +
      '.contract-head-meta { text-align: right; font-size: 11px; color: ' + C.muted + '; }\n' +
      '.contract-head-meta div + div { margin-top: 2px; }\n' +
      '.doc-title { font-family: \'Playfair Display\', serif; font-size: 26px; font-weight: 700; color: ' + C.primary + '; text-align: center; letter-spacing: 0.02em; margin: 0 0 6px 0; }\n' +
      '.doc-subtitle { text-align: center; font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: ' + C.muted + '; margin-bottom: 28px; }\n' +
      '.contract-parties { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px; }\n' +
      '.contract-party { padding: 14px 16px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }\n' +
      '.contract-party-label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: ' + C.primary + '; margin-bottom: 6px; }\n' +
      '.contract-party-name { font-weight: 700; font-size: 14px; color: ' + C.text + '; }\n' +
      '.contract-party-detail { font-size: 12px; color: ' + C.muted + '; margin-top: 2px; }\n' +
      '.contract-clause { margin-bottom: 22px; }\n' +
      '.contract-clause h3 { font-family: \'Playfair Display\', serif; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ' + C.primary + '; margin: 0 0 8px 0; }\n' +
      '.contract-clause p { margin: 0 0 8px 0; font-size: 13px; line-height: 1.65; color: ' + C.text + '; }\n' +
      '.contract-clause p:last-child { margin-bottom: 0; }\n' +
      '.contract-pay-table { width: 100%; border-collapse: collapse; margin: 8px 0 10px; font-size: 13px; }\n' +
      '.contract-pay-table th, .contract-pay-table td { text-align: left; padding: 7px 8px; border-bottom: 1px solid rgba(255,255,255,0.08); }\n' +
      '.contract-pay-table th { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: ' + C.muted + '; font-weight: 700; }\n' +
      '.contract-pay-table td.amt, .contract-pay-table th.amt { text-align: right; }\n' +
      '.contract-pay-total td { border-bottom: none; font-weight: 700; color: ' + C.primary + '; }\n' +
      '.contract-callout { padding: 10px 14px; background: ' + C.a(0.1) + '; border-left: 3px solid ' + C.primary + '; border-radius: 0 8px 8px 0; font-size: 12px; color: ' + C.text + '; margin: 8px 0 10px; }\n' +
      '.contract-sig-block { margin-top: 32px; padding-top: 22px; border-top: 1px solid rgba(255,255,255,0.12); }\n' +
      '.contract-sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }\n' +
      '.contract-sig-title { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: ' + C.muted + '; margin-bottom: 10px; }\n' +
      '.contract-sig-line { font-family: \'Playfair Display\', serif; font-size: 17px; font-style: italic; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 8px; margin-bottom: 6px; min-height: 1.3em; }\n' +
      '.contract-sig-signed { color: ' + C.text + '; }\n' +
      '.contract-sig-blank { color: ' + C.muted + '; font-style: normal; font-family: \'Inter\', sans-serif; font-size: 12px; }\n' +
      '.contract-sig-sub { font-size: 11px; color: ' + C.muted + '; }\n' +
      '.contract-sig-provenance { font-size: 10px; color: ' + C.muted + '; margin-top: 4px; }\n' +
      '.divider { border: none; height: 1px; background: rgba(255,255,255,0.1); margin: 22px 0; }\n' +
      '.section-title { font-family: \'Playfair Display\', serif; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: ' + C.primary + '; margin-bottom: 12px; }\n' +
      '.addons-section-intro { font-size: 12px; line-height: 1.55; color: ' + C.muted + '; margin: -4px 0 14px 0; max-width: 58ch; }\n' +
      '.maint-plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-top: 12px; }\n' +
      '.maint-plan-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 18px 18px 16px; display: flex; flex-direction: column; }\n' +
      '.maint-plan-badge { display: inline-block; align-self: flex-start; padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; background: ' + C.primary + '; color: ' + C.bg + '; margin-bottom: 10px; }\n' +
      '.maint-plan-title { font-size: 14px; font-weight: 600; color: ' + C.text + '; margin-bottom: 4px; }\n' +
      '.maint-plan-sla { font-size: 11px; color: ' + C.muted + '; margin-bottom: 14px; }\n' +
      '.maint-price-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }\n' +
      '.maint-price-row { border-radius: 10px; padding: 12px 12px 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.18); }\n' +
      '.maint-price-row--highlight { border-color: ' + C.a(0.45) + '; background: ' + C.a(0.12) + '; }\n' +
      '.maint-price-row--annual { margin-bottom: 14px; border-left: 3px solid ' + C.primary + '; }\n' +
      '.maint-price-label { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: ' + C.primary + '; margin-bottom: 4px; }\n' +
      '.maint-price-main { font-family: \'Playfair Display\', serif; font-size: 20px; font-weight: 700; color: ' + C.primary + '; line-height: 1.1; }\n' +
      '.maint-price-note { font-size: 11px; color: ' + C.muted + '; margin-top: 4px; }\n' +
      '.maint-price-equiv { font-size: 11px; color: ' + C.text + '; margin-top: 2px; opacity: 0.9; }\n' +
      '.maint-feature-list { list-style: none; margin: 0; padding: 0; }\n' +
      '.maint-feature-list li { display: flex; align-items: flex-start; gap: 10px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; line-height: 1.45; color: ' + C.muted + '; }\n' +
      '.maint-feature-list li:last-child { border-bottom: none; padding-bottom: 0; }\n' +
      '.maint-feature-list li::before { content: \'\'; flex-shrink: 0; width: 5px; height: 5px; margin-top: 6px; border-radius: 50%; background: ' + C.primary + '; }\n' +
      '.footer-meta { margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 11px; color: ' + C.muted + '; text-align: center; }\n' +
      'a { color: ' + C.primary + '; }\n' +
      '</style>\n</head>\n<body>\n  <div class="doc">\n' +
      '    <div class="contract-head">\n' +
      '      <div class="contract-brand">Code<span>With</span>Ruben</div>\n' +
      '      <div class="contract-head-meta"><div>Contract No. ' + contractId + '</div><div>Effective Date: ' + escapeHtml(effectiveDate) + '</div></div>\n' +
      '    </div>\n' +
      '    <h1 class="doc-title">CWR Service Agreement</h1>\n' +
      '    <div class="doc-subtitle">Web &amp; mobile application development</div>\n' +
      '    <div class="contract-parties">\n' +
      '      <div class="contract-party"><div class="contract-party-label">Developer</div><div class="contract-party-name">Ruben Jimenez, doing business as CodeWithRuben (&ldquo;CWR&rdquo;)</div><div class="contract-party-detail">Fresno, California</div></div>\n' +
      '      <div class="contract-party"><div class="contract-party-label">Client</div><div class="contract-party-name">' + escapeHtml(clientName) + '</div>' + (clientEmail ? '<div class="contract-party-detail">' + escapeHtml(clientEmail) + '</div>' : '') + '</div>\n' +
      '    </div>\n' +
      '    <div class="contract-clause"><h3>1 &middot; Scope of work</h3>' + scopeHtml + '<p>Work not described above is out of scope and subject to a separate change order under Clause 4.</p></div>\n' +
      '    <div class="contract-clause"><h3>2 &middot; Fees &amp; payment schedule</h3>' +
      buildContractPaymentTableHtml(total, doc && doc.paymentStages) +
      '<div class="contract-callout">Work begins once the first payment above clears; each later payment is due per this schedule regardless of delays caused by Client.' +
      (doc && doc.paymentMethods ? ' Accepted payment methods: ' + escapeHtml(doc.paymentMethods) + '.' : '') +
      '</div></div>\n' +
      '    <div class="contract-clause"><h3>3 &middot; Timeline</h3>' + timelineHtml + '</div>\n' +
      '    <div class="contract-clause"><h3>4 &middot; Revisions</h3><p>Two structured revision rounds are included per milestone during the build. Once delivered, ongoing changes and support are covered under the maintenance plan below if one is selected; without an active plan, changes outside the scope in Clause 1 are billed at CWR’s standard change-order rate.</p></div>\n' +
      maintenanceBlockHtml +
      '    <div class="contract-clause"><h3>5 &middot; Ownership &amp; intellectual property</h3>' + ownershipHtml + '</div>\n' +
      '    <div class="contract-clause"><h3>6 &middot; Termination</h3><p>Either party may terminate this Agreement in writing. If Client terminates before completion, the deposit is non-refundable, and Client owes for any milestone work completed beyond the deposit, pro-rated to work actually delivered.</p></div>\n' +
      '    <div class="contract-clause"><h3>7 &middot; Maintenance &amp; hosting continuity</h3>' + maintenanceLapseHtml + '</div>\n' +
      '    <div class="contract-clause"><h3>8 &middot; Confidentiality</h3><p>Each party will keep the other’s non-public business, technical, and financial information confidential, and use it only to perform this Agreement.</p></div>\n' +
      '    <div class="contract-clause"><h3>9 &middot; Warranty &amp; liability</h3><p>CWR warrants the delivered work will substantially match the agreed scope and will correct material defects reported within 14 days of launch at no charge. Beyond that window, the work is provided as-is. CWR’s total liability under this Agreement is capped at the total fees paid by Client, and CWR is not liable for indirect or consequential damages.</p></div>\n' +
      '    <div class="contract-clause"><h3>10 &middot; Governing law</h3><p>This Agreement is governed by the laws of the State of California. Any dispute will be resolved in the state or federal courts of Fresno County, California.</p></div>\n' +
      sigBlockHtml + '\n' +
      '    <div class="footer-meta">CWR-' + contractId + (doc && doc.sourceProposalId ? ' &middot; Generated from Proposal ' + escapeHtml(doc.sourceProposalId) : '') + '</div>\n' +
      '  </div>\n</body>\n</html>';
  }

  /**
   * Line items for classic invoice bills.
   * Prefers addOns (priced rows). Project scope in notes becomes ONE billed row
   * with the jot list as detail bullets — never one $0 row per note line.
   * @returns {{ description: string, detail: string, amount: number }[]}
   */
  function collectInvoiceLineItems(doc) {
    var lines = [];
    if (doc && Array.isArray(doc.addOns)) {
      for (var i = 0; i < doc.addOns.length; i++) {
        var addon = doc.addOns[i];
        if (!addon || !String(addon.name || '').trim()) continue;
        var opts = addon.priceOptions && Array.isArray(addon.priceOptions) ? addon.priceOptions : [];
        var amount = 0;
        if (opts.length) {
          for (var j = 0; j < opts.length; j++) {
            var n = Number(opts[j] && opts[j].amount);
            if (!isNaN(n)) amount += n;
          }
        }
        lines.push({
          description: String(addon.name).trim(),
          detail: String(addon.description || '').trim(),
          amount: amount
        });
      }
    }
    if (lines.length) return lines;

    var notes = String((doc && doc.notes) || '').trim();
    var noteLines = notes
      ? notes.split(/\r?\n/).map(function (l) { return stripLeadingBulletMarker(l); }).filter(Boolean)
      : [];
    var total = Number(doc && doc.total) || 0;
    if (noteLines.length === 1) {
      lines.push({ description: noteLines[0], detail: '', amount: total });
    } else if (noteLines.length > 1) {
      lines.push({
        description: 'Project services',
        detail: noteLines.join('\n'),
        amount: total
      });
    } else {
      lines.push({ description: 'Services', detail: '', amount: total });
    }
    return lines;
  }

  function buildInvoiceLineDetailHtml(detail) {
    var raw = String(detail || '').trim();
    if (!raw) return '';
    var parts = raw.split(/\r?\n/).map(function (l) { return stripLeadingBulletMarker(l); }).filter(Boolean);
    if (!parts.length) return '';
    if (parts.length === 1) {
      return '<div class="inv-line-detail">' + escapeHtml(parts[0]) + '</div>';
    }
    return (
      '<ul class="inv-line-scope">' +
      parts
        .map(function (p) {
          return '<li>' + escapeHtml(p) + '</li>';
        })
        .join('') +
      '</ul>'
    );
  }

  function buildInvoiceLineItemsTableHtml(doc) {
    var items = collectInvoiceLineItems(doc);
    var rows = '';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var detailHtml = buildInvoiceLineDetailHtml(it.detail);
      rows +=
        '<tr>' +
        '<td class="inv-col-desc"><div class="inv-line-name">' +
        escapeHtml(it.description) +
        '</div>' +
        detailHtml +
        '</td>' +
        '<td class="inv-col-amt">' +
        escapeHtml(formatCurrency(it.amount)) +
        '</td></tr>';
    }
    return (
      '<table class="inv-table" role="table">' +
      '<thead><tr><th class="inv-col-desc">Description</th><th class="inv-col-amt">Amount</th></tr></thead>' +
      '<tbody>' +
      rows +
      '</tbody></table>'
    );
  }

  function buildInvoicePlanFootnoteHtml(doc) {
    var planId = String((doc && doc.maintenancePlanId) || '').toLowerCase();
    if (planId !== 'essential' && planId !== 'standard' && planId !== 'priority') return '';
    var plan = findMaintenancePlan(planId);
    var billing =
      String((doc && doc.maintenanceBilling) || '').toLowerCase() === 'annual' ? 'Annual' : 'Monthly';
    var label = (plan && plan.badge) || planId;
    return (
      '<p class="inv-plan-note">Referenced plan: <strong>' +
      escapeHtml(label) +
      '</strong> · ' +
      escapeHtml(billing) +
      ' billing</p>'
    );
  }

  /**
   * Classic bill layout for invoices — theme colors, clear line items, amount due.
   * No estimate-style marketing sections or maintenance upsell cards.
   */
  function getInvoiceDocumentHtml(doc) {
    var C = resolveDocTheme(doc && doc.theme ? doc.theme : 'cwr');
    var clientName = String((doc && doc.clientName) || 'Client').trim();
    var clientEmail = String((doc && doc.clientEmail) || '').trim();
    var clientLogo = String((doc && doc.clientLogo) || '').trim();
    if (clientLogo.indexOf('/assets/images/logo/') !== 0 || clientLogo.indexOf('..') >= 0) {
      clientLogo = '';
    } else {
      clientLogo = toAbsoluteAssetUrl(clientLogo);
    }
    var created = formatDateDisplay(doc && doc.createdAt);
    var status = String((doc && doc.status) || 'draft').toLowerCase();
    var isPaid = status === 'paid';
    var paidRaw =
      (doc && (doc.paidAt || doc.datePaid || doc.dueDate)) ||
      (isPaid ? doc && (doc.updatedAt || doc.createdAt) : '') ||
      '';
    var dueOrPaidLabel = isPaid ? 'Date paid' : 'Due';
    var dueOrPaidValue = isPaid
      ? paidRaw
        ? formatDateDisplay(paidRaw)
        : '—'
      : doc && doc.dueDate
        ? formatDateDisplay(doc.dueDate)
        : 'Upon receipt';
    var invoiceId = String((doc && doc.id) || '').trim();
    var displayId = formatInvoiceNumber(doc);
    var totalFormatted = formatCurrency(Number(doc && doc.total) || 0);
    var statusLabel =
      isPaid ? 'Paid' : status === 'accepted' ? 'Accepted' : status === 'sent' ? 'Due' : 'Draft';
    var amountLabel = isPaid ? 'Amount paid' : 'Amount due';
    var tableHtml = buildInvoiceLineItemsTableHtml(doc);
    var planNote = buildInvoicePlanFootnoteHtml(doc);
    var notesRaw = String((doc && doc.notes) || '').trim();
    var hasAddOns = !!(doc && Array.isArray(doc.addOns) && doc.addOns.length);
    var memoHtml = '';
    if (hasAddOns && notesRaw) {
      var noteLines = notesRaw
        .split(/\r?\n/)
        .map(function (l) {
          return stripLeadingBulletMarker(l);
        })
        .filter(Boolean);
      var addonNames = (doc.addOns || [])
        .map(function (a) {
          return String((a && a.name) || '')
            .trim()
            .toLowerCase();
        })
        .filter(Boolean);
      var memoLines = noteLines.filter(function (line) {
        return addonNames.indexOf(line.toLowerCase()) === -1;
      });
      if (memoLines.length) {
        memoHtml =
          '<div class="inv-memo"><div class="inv-memo-label">Memo</div><p>' +
          escapeHtml(memoLines.join('\n')).replace(/\n/g, '<br>') +
          '</p></div>';
      }
    }

    var borderSoft = C.a(0.22);
    var borderStrong = C.a(0.45);
    var rowBg = C.a(0.06);
    var payDueCopy = isPaid
      ? 'Payment received — thank you.'
      : doc && doc.dueDate
        ? 'Please pay by <strong>' + escapeHtml(formatDateDisplay(doc.dueDate)) + '</strong>.'
        : 'Payment is due upon receipt.';

    return (
      '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=820">\n  <title>INVOICE — ' +
      escapeHtml(clientName) +
      '</title>\n  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">\n  <style>\n' +
      '@page { size: A4; margin: 12mm; }\n' +
      '@media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } body { padding: 12px 16px !important; } }\n' +
      '* { box-sizing: border-box; }\n' +
      'body { margin: 0; padding: 40px 32px; font-family: \'Inter\', sans-serif; background: ' +
      C.bg +
      '; color: ' +
      C.text +
      '; font-size: 14px; }\n' +
      '.doc { max-width: 800px; margin: 0 auto; }\n' +
      '.inv-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; flex-wrap: wrap; margin-bottom: 24px; }\n' +
      '.inv-brand { font-family: \'Playfair Display\', serif; font-size: 22px; font-weight: 700; color: ' +
      C.primary +
      '; letter-spacing: 0.02em; }\n' +
      '.inv-brand span { color: ' +
      C.text +
      '; font-weight: 600; }\n' +
      '.inv-brand-sub { font-size: 11px; color: ' +
      C.muted +
      '; margin-top: 4px; }\n' +
      '.inv-badge-wrap { text-align: right; }\n' +
      '.inv-badge { display: inline-block; padding: 6px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; background: ' +
      C.primary +
      '; color: ' +
      C.bg +
      '; }\n' +
      '.inv-meta-grid { display: grid; grid-template-columns: 1.15fr 1fr; gap: 16px; margin-bottom: 28px; align-items: stretch; }\n' +
      '@media (max-width: 640px) { .inv-meta-grid { grid-template-columns: 1fr; } }\n' +
      '.inv-panel { border: 1px solid ' +
      borderSoft +
      '; border-radius: 12px; padding: 16px 18px; background: rgba(255,255,255,0.03); display: flex; flex-direction: column; justify-content: flex-start; }\n' +
      '.inv-panel-label { font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: ' +
      C.primary +
      '; margin: 0 0 12px; }\n' +
      '.inv-bill-row { display: flex; align-items: center; gap: 12px; }\n' +
      '.inv-client-logo { width: 56px; height: 56px; padding: 7px; box-sizing: border-box; object-fit: contain; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid ' +
      borderSoft +
      '; flex-shrink: 0; }\n' +
      '.inv-bill-text { min-width: 0; flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 3px; }\n' +
      '.inv-panel-name { font-size: 15px; font-weight: 600; color: ' +
      C.text +
      '; margin: 0; line-height: 1.25; }\n' +
      '.inv-panel-detail { font-size: 12px; color: ' +
      C.muted +
      '; line-height: 1.4; margin: 0; }\n' +
      '.inv-panel-detail a { color: ' +
      C.primary +
      '; text-decoration: none; border-bottom: 1px solid ' +
      C.a(0.35) +
      '; }\n' +
      '.inv-kv { display: grid; grid-template-columns: auto 1fr; gap: 7px 16px; font-size: 13px; align-items: baseline; align-content: start; margin: 0; }\n' +
      '.inv-kv dt { color: ' +
      C.muted +
      '; }\n' +
      '.inv-kv dd { margin: 0; color: ' +
      C.text +
      '; font-weight: 500; text-align: right; }\n' +
      '.inv-kv dd.is-status { font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; font-size: 12px; color: ' +
      C.primary +
      '; }\n' +
      '.inv-section-title { font-family: \'Playfair Display\', serif; font-size: 13px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: ' +
      C.primary +
      '; margin: 0 0 10px; }\n' +
      '.inv-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }\n' +
      '.inv-table th { text-align: left; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: ' +
      C.muted +
      '; padding: 10px 12px; border-bottom: 1px solid ' +
      borderStrong +
      '; }\n' +
      '.inv-table td { padding: 14px 12px; border-bottom: 1px solid ' +
      borderSoft +
      '; vertical-align: top; }\n' +
      '.inv-table tbody tr:nth-child(even) td { background: ' +
      rowBg +
      '; }\n' +
      '.inv-col-desc { width: 72%; }\n' +
      '.inv-col-amt { width: 28%; text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; font-weight: 600; }\n' +
      '.inv-table th.inv-col-amt { text-align: right; font-weight: 700; }\n' +
      '.inv-line-name { font-size: 14px; font-weight: 600; color: ' +
      C.text +
      '; }\n' +
      '.inv-line-detail { font-size: 12px; color: ' +
      C.muted +
      '; margin-top: 4px; line-height: 1.45; }\n' +
      '.inv-line-scope { list-style: none; margin: 8px 0 0; padding: 0; }\n' +
      '.inv-line-scope li { position: relative; padding: 4px 0 4px 14px; font-size: 12px; line-height: 1.45; color: ' +
      C.muted +
      '; }\n' +
      '.inv-line-scope li::before { content: \'\'; position: absolute; left: 0; top: 9px; width: 5px; height: 5px; border-radius: 50%; background: ' +
      C.primary +
      '; }\n' +
      '.inv-totals { margin-top: 16px; display: flex; justify-content: flex-end; }\n' +
      '.inv-total-box { min-width: 240px; border-radius: 12px; padding: 16px 18px; background: ' +
      C.primary +
      '; color: ' +
      C.bg +
      '; }\n' +
      '.inv-total-label { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.85; margin-bottom: 6px; }\n' +
      '.inv-total-amt { font-family: \'Playfair Display\', serif; font-size: 32px; font-weight: 700; line-height: 1; }\n' +
      '.inv-plan-note { font-size: 12px; color: ' +
      C.muted +
      '; margin: 16px 0 0; }\n' +
      '.inv-plan-note strong { color: ' +
      C.primary +
      '; font-weight: 600; }\n' +
      '.inv-memo { margin-top: 20px; padding: 14px 16px; border-radius: 10px; border: 1px solid ' +
      borderSoft +
      '; background: rgba(255,255,255,0.03); }\n' +
      '.inv-memo-label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: ' +
      C.primary +
      '; margin-bottom: 6px; }\n' +
      '.inv-memo p { margin: 0; font-size: 13px; line-height: 1.55; color: ' +
      C.muted +
      '; }\n' +
      '.inv-pay { margin-top: 24px; padding-top: 16px; border-top: 1px solid ' +
      borderSoft +
      '; font-size: 13px; line-height: 1.55; color: ' +
      C.muted +
      '; }\n' +
      '.inv-pay strong { color: ' +
      C.text +
      '; }\n' +
      '.inv-pay a { color: ' +
      C.primary +
      '; }\n' +
      '.inv-footer { margin-top: 24px; padding-top: 14px; border-top: 1px solid ' +
      borderSoft +
      '; font-size: 11px; color: ' +
      C.muted +
      '; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }\n' +
      'a { color: ' +
      C.primary +
      '; }\n' +
      '</style>\n</head>\n<body>\n  <div class="doc">\n' +
      '    <div class="inv-top">\n' +
      '      <div><div class="inv-brand">Code<span>With</span>Ruben</div><div class="inv-brand-sub">rubenjimenez.dev</div></div>\n' +
      '      <div class="inv-badge-wrap"><div class="inv-badge">Invoice</div></div>\n' +
      '    </div>\n' +
      '    <div class="inv-meta-grid">\n' +
      '      <div class="inv-panel"><div class="inv-panel-label">Bill to</div><div class="inv-bill-row">' +
      (clientLogo
        ? '<img class="inv-client-logo" src="' +
          escapeHtml(clientLogo) +
          '" alt="' +
          escapeHtml(clientName) +
          ' logo">'
        : '') +
      '<div class="inv-bill-text"><div class="inv-panel-name">' +
      escapeHtml(clientName) +
      '</div>' +
      (clientEmail
        ? '<div class="inv-panel-detail"><a href="mailto:' +
          escapeHtml(clientEmail) +
          '">' +
          escapeHtml(clientEmail) +
          '</a></div>'
        : '') +
      '</div></div></div>\n' +
      '      <div class="inv-panel"><div class="inv-panel-label">Invoice details</div><dl class="inv-kv">' +
      '<dt>Invoice #</dt><dd>' +
      escapeHtml(displayId) +
      '</dd>' +
      '<dt>Status</dt><dd class="is-status">' +
      escapeHtml(statusLabel) +
      '</dd>' +
      '<dt>Issued</dt><dd>' +
      escapeHtml(created) +
      '</dd>' +
      '<dt>' +
      escapeHtml(dueOrPaidLabel) +
      '</dt><dd>' +
      escapeHtml(dueOrPaidValue) +
      '</dd></dl></div>\n' +
      '    </div>\n' +
      '    <div class="inv-section-title">Line items</div>\n' +
      tableHtml +
      '\n' +
      '    <div class="inv-totals"><div class="inv-total-box"><div class="inv-total-label">' +
      escapeHtml(amountLabel) +
      '</div><div class="inv-total-amt">' +
      escapeHtml(totalFormatted) +
      '</div></div></div>\n' +
      planNote +
      memoHtml +
      '    <div class="inv-pay"><strong>Payment</strong> — ' +
      payDueCopy +
      ' Questions or confirmation: ' +
      '<a href="mailto:Ruben.Jim.co@gmail.com">Ruben.Jim.co@gmail.com</a>.</div>\n' +
      '    <div class="inv-footer"><span>CodeWithRuben · Invoice</span><span>' +
      escapeHtml(displayId) +
      '</span></div>\n' +
      '  </div>\n</body>\n</html>'
    );
  }

  function buildBusinessDocHtml(doc, signature) {
    if (doc && String(doc.type || '').toLowerCase() === 'proposal') {
      return getProposalDocumentHtml(doc);
    }
    if (doc && String(doc.type || '').toLowerCase() === 'contract') {
      return getContractDocumentHtml(doc, signature);
    }
    if (doc && String(doc.type || '').toLowerCase() === 'invoice') {
      return getInvoiceDocumentHtml(doc);
    }
    var created = formatDateDisplay(doc.createdAt);
    var due = doc.dueDate ? formatDateDisplay(doc.dueDate) : '—';
    var typeLabel =
      doc.type === 'estimate' ? 'ESTIMATE' :
      doc.type === 'invoice' ? 'INVOICE' : 'DOCUMENT';
    var addOnsBlockHtml = buildAddOnsPdfHtml(doc);
    var maintenanceBlockHtml = buildMaintenancePdfHtml(doc);
    return getBusinessDocumentHtml({
      customer: { name: doc.clientName || '', email: doc.clientEmail || '' },
      typeLabel: typeLabel,
      created: created,
      due: due,
      scope: doc.notes || '',
      proposedSiteUrl: doc.proposedSiteUrl || '',
      totalFormatted: formatCurrency(doc.total || 0),
      id: doc.id || '',
      theme: doc.theme || 'cwr',
      addOnsBlockHtml: addOnsBlockHtml,
      maintenanceBlockHtml: maintenanceBlockHtml
    });
  }

  function documentTabTitle(doc) {
    var type = typeLabelFor(doc);
    var client = String((doc && doc.clientName) || '').trim();
    if (doc && String(doc.type || '').toLowerCase() === 'contract') {
      return client ? 'Service Agreement — ' + client : 'CWR Service Agreement';
    }
    return client ? type + ' — ' + client : type;
  }

  function openPrintWindow(doc, signature, options) {
    if (!doc) return;
    var opts = options && typeof options === 'object' ? options : {};
    var autoPrint = opts.autoPrint !== false;
    var html = buildBusinessDocHtml(doc, signature);
    var title = documentTabTitle(doc);
    var win = null;
    var objectUrl = '';

    try {
      var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      objectUrl = URL.createObjectURL(blob);
      win = global.open(objectUrl, '_blank');
    } catch (e) {
      console.warn('blob document open failed, falling back', e);
    }

    if (!win) {
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch (e2) { /* ignore */ }
        objectUrl = '';
      }
      win = global.open('', '_blank');
      if (!win) return false;
      win.document.open();
      win.document.write(html);
      win.document.close();
    }

    try {
      win.document.title = title;
    } catch (e3) { /* ignore cross-origin / timing */ }

    // Blob windows load async — re-assert title once the document is ready.
    try {
      win.addEventListener('load', function () {
        try {
          win.document.title = title;
        } catch (e4) { /* ignore */ }
      });
    } catch (e5) { /* ignore */ }

    if (objectUrl) {
      setTimeout(function () {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch (e6) { /* ignore */ }
      }, 60000);
    }

    win.focus();
    if (autoPrint) {
      setTimeout(function () {
        try {
          win.print();
        } catch (e) {
          console.warn('print failed', e);
        }
      }, 800);
    }
    return true;
  }

  global.BusinessDocShared = {
    formatCurrency: formatCurrency,
    formatDateDisplay: formatDateDisplay,
    typeLabelFor: typeLabelFor,
    buildPrintHtml: buildBusinessDocHtml,
    openPrintWindow: openPrintWindow,
    maintenancePlans: MAINTENANCE_PLANS,
    listDocThemes: listDocThemes,
    normalizeDocThemeId: normalizeDocThemeId,
    resolveDocTheme: resolveDocTheme,
    resolveColorMode: resolveColorMode
  };
})(typeof window !== 'undefined' ? window : this);
