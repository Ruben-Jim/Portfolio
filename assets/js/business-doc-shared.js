/**
 * Business document print HTML — shared by admin (script.js) and client portal.
 */
(function (global) {
  'use strict';

  function formatCurrency(amount) {
    if (isNaN(amount)) return '$0.00';
    return '$' + Number(amount).toFixed(2);
  }

  function formatDateDisplay(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function typeLabelFor(doc) {
    if (!doc) return 'DOCUMENT';
    if (doc.type === 'proposal') return 'PROPOSAL';
    if (doc.type === 'estimate') return 'ESTIMATE';
    if (doc.type === 'invoice') return 'INVOICE';
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

  /** Portal catalog — keep in sync with client-portal.js MAINTENANCE_PLANS. */
  var MAINTENANCE_PLANS = [
    {
      id: 'standard',
      badge: 'Standard',
      title: 'Web + Mobile App',
      monthly: '$150/mo',
      annual: '$990/yr',
      monthlyNote: 'Billed monthly',
      annualNote: 'Save 45% vs monthly',
      annualEquiv: '~$83/mo equivalent · billed once per year',
      slaLabel: '72 business hours',
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
      title: 'Web + Mobile App',
      monthly: '$300/mo',
      annual: '$1,980/yr',
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
    } else if (type === 'estimate' || type === 'invoice') {
      var plan = findMaintenancePlan(doc.maintenancePlanId);
      if (!plan) return '';
      var billing = String(doc.maintenanceBilling || 'monthly').toLowerCase();
      var priceMode = billing === 'annual' ? 'annual' : 'both';
      intro =
        priceMode === 'annual'
          ? 'Selected maintenance plan for this ' +
            type +
            ' (annual billing).'
          : 'Selected maintenance plan for this ' +
            type +
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
   * @param {{ compactSingle?: boolean }=} options - proposal: one upgrade → centered compact card
   */
  function buildAddOnsPdfHtml(doc, options) {
    if (!doc || !doc.addOns || !Array.isArray(doc.addOns) || doc.addOns.length === 0) return '';
    var items = [];
    for (var i = 0; i < doc.addOns.length; i++) {
      var addon = doc.addOns[i];
      if (!addon || !addon.name) continue;
      var opts = addon.priceOptions && Array.isArray(addon.priceOptions) ? addon.priceOptions : [];
      if (!opts.length) continue;
      items.push({
        name: addon.name,
        description: addon.description || '',
        amounts: opts.map(function (o) {
          return typeof o.amount === 'number' && !isNaN(o.amount) ? o.amount : 0;
        })
      });
    }
    if (!items.length) return '';
    var compactSingle = !!(options && options.compactSingle && items.length === 1);
    var parts = [];
    for (var k = 0; k < items.length; k++) {
      var it = items[k];
      var nameEsc = escapeHtml(it.name);
      var descInner = buildAddonDescriptionPdfHtml(it.description);
      var tierRows = '';
      if (compactSingle) {
        // S2: pill price instead of full-width bar
        for (var p = 0; p < it.amounts.length; p++) {
          tierRows +=
            '<div class="addon-price-pill">' +
            '<span class="addon-tier-price">' +
            escapeHtml(formatCurrency(it.amounts[p])) +
            '</span></div>';
        }
      } else {
        for (var j = 0; j < it.amounts.length; j++) {
          tierRows +=
            '<div class="addon-tier-row addon-tier-only">' +
            '<div class="addon-tier-solo">' +
            '<span class="addon-tier-price">' +
            escapeHtml(formatCurrency(it.amounts[j])) +
            '</span></div>' +
            '</div>';
        }
      }
      parts.push(
        '<div class="addon-card' +
          (compactSingle ? ' addon-card--compact' : '') +
          '">' +
          '<div class="addon-card-title">' +
          nameEsc +
          '</div>' +
          (descInner
            ? '<div class="addon-card-desc">' + descInner + '</div>'
            : '') +
          '<div class="addon-tier-rows' +
          (compactSingle ? ' addon-tier-rows--pill' : '') +
          '">' +
          tierRows +
          '</div>' +
          '</div>'
      );
    }
    var gridClass = 'addon-cards-grid' + (compactSingle ? ' addon-cards-grid--single' : '');
    // S3: shorter / omit long intro when only one upgrade
    var introHtml = compactSingle
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
    var C = {
      primary: '#eab308',
      dark: { bg: '#0f172a', card: '#0f141a', text: '#e8e6df', muted: '#94a3b8' }
    };
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

    return '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <title>' + typeLabel + ' — ' + (customer.name || '') + '</title>\n  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">\n  <style>\n' +
      '@page { size: A4; margin: 12mm; }\n' +
      '@media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } body { padding: 12px 16px !important; } .doc { page-break-inside: avoid; transform-origin: top center; } .header-tag { padding: 4px 10px; font-size: 10px; margin-bottom: 8px; } .doc-title { font-size: 20px; margin-bottom: 4px; } .doc-subtitle { font-size: 11px; margin-bottom: 12px; } .divider { margin: 10px 0 !important; } .section-title { font-size: 11px; margin-bottom: 6px; } .addons-section-intro { font-size: 10px; margin: -2px 0 10px 0; } .scope-frame { box-shadow: none !important; } .scope-frame-inner { padding: 10px 12px !important; } .scope-kicker { font-size: 12px !important; padding-bottom: 8px !important; margin-bottom: 10px !important; } .scope-feature-list li { font-size: 11px; padding: 6px 8px !important; margin-bottom: 4px !important; } .scope-feature-list.is-multi-col { gap: 4px 8px; } .scope-feature-list.is-multi-col li { margin-bottom: 0 !important; padding: 5px 7px !important; font-size: 10px; } .scope-feature-list li::before { width: 5px; height: 5px; margin-top: 5px; } .addon-cards-grid { gap: 10px; margin-top: 8px; } .addon-card { padding: 12px 14px; } .addon-card-title { font-size: 12px; } .addon-card-desc { font-size: 11px; margin-bottom: 8px; } .addon-desc-list li { font-size: 11px; padding: 5px 0; } .addon-tier-solo { padding: 10px 14px; } .addon-tier-price { font-size: 17px; } .maint-plans-grid { gap: 10px; margin-top: 8px; } .maint-plan-card { padding: 12px 14px; } .maint-plan-badge { font-size: 9px; padding: 3px 8px; } .maint-plan-title { font-size: 12px; } .maint-plan-sla { font-size: 10px; margin-bottom: 8px; } .maint-price-main { font-size: 16px; } .maint-price-note, .maint-price-equiv { font-size: 10px; } .maint-feature-list li { font-size: 10px; padding: 4px 0; } .features-grid { gap: 12px; margin-top: 6px; } .feature-title { font-size: 11px; margin-bottom: 2px; } .feature-desc { font-size: 11px; line-height: 1.35; } .pricing-grid { gap: 12px; margin-top: 6px; } .price-card { padding: 12px 16px; } .price-card-primary .price-label { font-size: 10px; margin-bottom: 4px; } .price-card-primary .price-amt { font-size: 28px; } .price-card-primary .price-meta { font-size: 11px; margin-top: 8px; line-height: 1.35; } .price-card-secondary .price-label { font-size: 10px; margin-bottom: 4px; } .price-card-secondary .price-meta { font-size: 11px; line-height: 1.4; } .why-list { margin-top: 6px; padding-left: 16px; font-size: 12px; line-height: 1.45; } .why-list li { margin-bottom: 4px; } .next-steps-grid { gap: 12px; margin-top: 6px; } .next-step-num { font-size: 16px; margin-bottom: 4px; padding-bottom: 4px; } .next-step-title { font-size: 12px; margin-bottom: 2px; } .next-step-link { font-size: 11px; } .footer-buttons { margin-top: 12px; gap: 8px; } .btn-primary, .btn-outline { padding: 8px 16px; font-size: 11px; } .footer-meta { margin-top: 12px; padding-top: 10px; font-size: 10px; } }\n' +
      '* { box-sizing: border-box; }\n' +
      'body { margin: 0; padding: 40px 32px; font-family: \'Inter\', sans-serif; background: ' + C.dark.bg + '; color: ' + C.dark.text + '; font-size: 14px; }\n' +
      '.doc { max-width: 800px; margin: 0 auto; }\n' +
      '.header-tag { display: inline-block; padding: 6px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; background: ' + C.primary + '; color: ' + C.dark.bg + '; margin-bottom: 12px; }\n' +
      '.doc-title { font-family: \'Playfair Display\', serif; font-size: 24px; font-weight: 700; color: ' + C.primary + '; letter-spacing: 0.02em; text-transform: uppercase; line-height: 1.2; margin: 0 0 8px 0; }\n' +
      '.doc-subtitle { font-size: 12px; color: ' + C.dark.muted + '; margin-bottom: 24px; }\n' +
      '.doc-subtitle a { color: ' + C.primary + '; text-decoration: underline; }\n' +
      '.divider { border: none; height: 1px; background: rgba(255,255,255,0.1); margin: 24px 0; }\n' +
      '.section-title { font-family: \'Playfair Display\', serif; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: ' + C.primary + '; margin-bottom: 12px; }\n' +
      '.addons-section-intro { font-size: 12px; line-height: 1.55; color: ' + C.dark.muted + '; margin: -4px 0 14px 0; max-width: 58ch; }\n' +
      '.scope-block { margin-top: 4px; }\n' +
      '.scope-frame { padding: 2px; border-radius: 14px; background: linear-gradient(145deg, ' + C.primary + ' 0%, rgba(234,179,8,0.35) 18%, rgba(15,23,42,0.95) 55%, ' + C.dark.bg + ' 100%); box-shadow: 0 16px 48px rgba(0,0,0,0.4); }\n' +
      '.scope-frame-inner { border-radius: 12px; padding: 18px 20px 16px; background: linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.2) 100%); border: 1px solid rgba(255,255,255,0.1); }\n' +
      '.scope-kicker { margin: 0 0 16px 0; padding: 0 0 12px 0; border-bottom: 1px solid rgba(234,179,8,0.45); font-family: \'Playfair Display\', serif; font-size: 15px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #facc15; text-shadow: 0 1px 2px rgba(0,0,0,0.45); }\n' +
      '.scope-feature-list { list-style: none; margin: 0; padding: 0; }\n' +
      '.scope-feature-list.is-multi-col { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; align-items: stretch; }\n' +
      '.scope-feature-list.is-multi-col li { margin-bottom: 0; height: 100%; }\n' +
      '@media (max-width: 560px) { .scope-feature-list.is-multi-col { grid-template-columns: 1fr; } }\n' +
      '.scope-feature-list li { display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px; margin-bottom: 6px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); background: rgba(0,0,0,0.18); font-size: 13px; line-height: 1.5; font-weight: 500; color: ' + C.dark.text + '; }\n' +
      '.scope-feature-list li:last-child { margin-bottom: 0; }\n' +
      '.scope-feature-list.is-multi-col li:last-child { margin-bottom: 0; }\n' +
      '.scope-feature-list li::before { content: \'\'; flex-shrink: 0; width: 7px; height: 7px; margin-top: 6px; border-radius: 2px; background: linear-gradient(145deg, ' + C.primary + ', #ca8a04); box-shadow: 0 0 0 1px rgba(234,179,8,0.4); }\n' +
      '.bullet-li-text { flex: 1; min-width: 0; letter-spacing: 0.01em; }\n' +
      '.addon-cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 12px; }\n' +
      '.addon-desc-list { list-style: none; margin: 0; padding: 0; }\n' +
      '.addon-desc-list li { display: flex; align-items: flex-start; gap: 10px; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; line-height: 1.5; color: ' + C.dark.muted + '; }\n' +
      '.addon-desc-list li:first-child { padding-top: 0; }\n' +
      '.addon-desc-list li:last-child { border-bottom: none; padding-bottom: 0; }\n' +
      '.addon-desc-list li::before { content: \'\'; flex-shrink: 0; width: 5px; height: 5px; margin-top: 6px; border-radius: 50%; background: ' + C.primary + '; opacity: 0.95; }\n' +
      '.addon-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; min-height: 100%; }\n' +
      '.addon-card-title { font-size: 13px; font-weight: 600; letter-spacing: 0.02em; color: ' + C.primary + '; margin-bottom: 10px; line-height: 1.35; }\n' +
      '.addon-card-desc { font-size: 12px; color: ' + C.dark.muted + '; line-height: 1.55; margin-bottom: 14px; }\n' +
      '.addon-tier-rows { margin-top: auto; display: flex; flex-direction: column; gap: 10px; }\n' +
      '.addon-tier-row { border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); background: linear-gradient(165deg, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.22) 100%); }\n' +
      '.addon-tier-row.addon-tier-only { display: block; }\n' +
      '.addon-tier-solo { display: flex; align-items: center; justify-content: center; padding: 14px 18px; border-left: 3px solid ' + C.primary + '; background: rgba(234,179,8,0.13); }\n' +
      '.addon-tier-price { font-family: \'Playfair Display\', serif; font-size: 22px; font-weight: 700; color: ' + C.primary + '; white-space: nowrap; line-height: 1; }\n' +
      '.maint-plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-top: 12px; }\n' +
      '.maint-plan-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 18px 18px 16px; display: flex; flex-direction: column; }\n' +
      '.maint-plan-badge { display: inline-block; align-self: flex-start; padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; background: ' + C.primary + '; color: ' + C.dark.bg + '; margin-bottom: 10px; }\n' +
      '.maint-plan-title { font-size: 14px; font-weight: 600; color: ' + C.dark.text + '; margin-bottom: 4px; }\n' +
      '.maint-plan-sla { font-size: 11px; color: ' + C.dark.muted + '; margin-bottom: 14px; }\n' +
      '.maint-price-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }\n' +
      '.maint-price-row { border-radius: 10px; padding: 12px 12px 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.18); }\n' +
      '.maint-price-row--highlight { border-color: rgba(234,179,8,0.45); background: rgba(234,179,8,0.12); }\n' +
      '.maint-price-row--annual { margin-bottom: 14px; border-left: 3px solid ' + C.primary + '; }\n' +
      '.maint-price-label { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: ' + C.primary + '; margin-bottom: 4px; }\n' +
      '.maint-price-main { font-family: \'Playfair Display\', serif; font-size: 20px; font-weight: 700; color: ' + C.primary + '; line-height: 1.1; }\n' +
      '.maint-price-note { font-size: 11px; color: ' + C.dark.muted + '; margin-top: 4px; }\n' +
      '.maint-price-equiv { font-size: 11px; color: ' + C.dark.text + '; margin-top: 2px; opacity: 0.9; }\n' +
      '.maint-feature-list { list-style: none; margin: 0; padding: 0; }\n' +
      '.maint-feature-list li { display: flex; align-items: flex-start; gap: 10px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; line-height: 1.45; color: ' + C.dark.muted + '; }\n' +
      '.maint-feature-list li:last-child { border-bottom: none; padding-bottom: 0; }\n' +
      '.maint-feature-list li::before { content: \'\'; flex-shrink: 0; width: 5px; height: 5px; margin-top: 6px; border-radius: 50%; background: ' + C.primary + '; }\n' +
      '.features-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 12px; }\n' +
      '.feature-col { }\n' +
      '.feature-title { font-size: 12px; font-weight: 600; color: ' + C.dark.text + '; margin-bottom: 6px; }\n' +
      '.feature-desc { font-size: 12px; line-height: 1.5; color: ' + C.dark.muted + '; }\n' +
      '.feature-desc-muted { color: ' + C.dark.muted + '; }\n' +
      '.feature-desc-link { color: ' + C.primary + '; font-weight: 500; text-decoration: none; word-break: break-all; border-bottom: 1px solid rgba(234,179,8,0.45); }\n' +
      '.pricing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 12px; }\n' +
      '.price-card { padding: 20px; border-radius: 12px; }\n' +
      '.price-card-primary { background: ' + C.primary + '; color: ' + C.dark.bg + '; }\n' +
      '.price-card-primary .price-label { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(15,23,42,0.8); margin-bottom: 8px; }\n' +
      '.price-card-primary .price-amt { font-family: \'Playfair Display\', serif; font-size: 36px; font-weight: 700; line-height: 1; }\n' +
      '.price-card-primary .price-meta { font-size: 12px; margin-top: 12px; line-height: 1.5; color: rgba(15,23,42,0.85); }\n' +
      '.price-card-secondary { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }\n' +
      '.price-card-secondary .price-label { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: ' + C.primary + '; margin-bottom: 8px; }\n' +
      '.price-card-secondary .price-meta { font-size: 12px; color: ' + C.dark.muted + '; line-height: 1.6; }\n' +
      '.why-list { margin: 12px 0 0 0; padding-left: 20px; font-size: 14px; line-height: 1.7; color: ' + C.dark.text + '; }\n' +
      '.why-list li { margin-bottom: 8px; }\n' +
      '.why-list li strong { color: ' + C.primary + '; }\n' +
      '.next-steps-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 12px; }\n' +
      '.next-step { }\n' +
      '.next-step-num { font-family: \'Playfair Display\', serif; font-size: 20px; font-weight: 700; color: ' + C.primary + '; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid ' + C.primary + '; }\n' +
      '.next-step-title { font-size: 13px; font-weight: 600; color: ' + C.dark.text + '; margin-bottom: 4px; }\n' +
      '.next-step-blurb { font-size: 12px; line-height: 1.5; color: ' + C.dark.muted + '; display: block; margin-top: 2px; }\n' +
      '.next-step-link { font-size: 12px; color: ' + C.primary + '; text-decoration: underline; }\n' +
      '.footer-buttons { display: flex; gap: 12px; margin-top: 28px; flex-wrap: wrap; }\n' +
      '.btn-primary { display: inline-block; padding: 12px 24px; background: ' + C.primary + '; color: ' + C.dark.bg + '; font-family: \'Inter\', sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; text-decoration: none; border-radius: 8px; border: none; }\n' +
      '.btn-outline { display: inline-block; padding: 12px 24px; background: transparent; color: ' + C.primary + '; font-family: \'Inter\', sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; text-decoration: none; border-radius: 8px; border: 2px solid ' + C.primary + '; }\n' +
      '.footer-meta { margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 11px; color: ' + C.dark.muted + '; }\n' +
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

  /** Compact dual maintenance cards for proposal pricing row. */
  function buildProposalMaintCompactHtml() {
    var cards = [];
    for (var i = 0; i < MAINTENANCE_PLANS.length; i++) {
      var plan = MAINTENANCE_PLANS[i];
      var feat = (plan.features || []).slice(0, 3);
      var lis = '';
      for (var j = 0; j < feat.length; j++) {
        lis += '<li>' + escapeHtml(feat[j]) + '</li>';
      }
      cards.push(
        '<div class="pc-maint-card">' +
          '<div class="pc-maint-badge">' + escapeHtml(plan.badge) + '</div>' +
          '<div class="pc-maint-price">' + escapeHtml(plan.monthly) + '</div>' +
          '<div class="pc-maint-annual">' + escapeHtml(plan.annual) + ' · ' + escapeHtml(plan.annualNote) + '</div>' +
          '<ul class="pc-maint-feats">' + lis + '</ul>' +
        '</div>'
      );
    }
    return '<div class="pc-maint-dual">' + cards.join('') + '</div>';
  }

  /**
   * Pro Cleaning–style one-page proposal layout.
   */
  function getProposalDocumentHtml(doc) {
    var C = {
      primary: '#eab308',
      dark: { bg: '#0f172a', text: '#e8e6df', muted: '#94a3b8' }
    };
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

    return '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <title>PROPOSAL — ' + escapeHtml(clientName) + '</title>\n  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">\n  <style>\n' +
      '@page { size: A4; margin: 10mm; }\n' +
      '@media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } body { padding: 10px 14px !important; } .doc { page-break-inside: avoid; } .doc-title { font-size: 22px; } .section-title { font-size: 11px; margin-bottom: 8px; } .pc-body { font-size: 12px; margin-bottom: 0; } .pc-core-grid { gap: 12px; } .pc-core-title { font-size: 11px; } .pc-core-desc { font-size: 11px; } .pc-pricing-row { gap: 12px; } .pc-gold { padding: 14px 16px; } .pc-gold-amt { font-size: 28px; } .pc-gold-list li { font-size: 11px; } .pc-maint-card { padding: 10px 12px; } .pc-maint-price { font-size: 16px; } .pc-maint-feats li { font-size: 10px; } .why-list { font-size: 12px; } .next-steps-grid { gap: 12px; } .footer-buttons { margin-top: 14px; } .divider { margin: 12px 0 !important; } .addon-cards-grid--single .addon-card { padding: 12px 14px; } }\n' +
      '* { box-sizing: border-box; }\n' +
      'body { margin: 0; padding: 36px 28px; font-family: \'Inter\', sans-serif; background: ' + C.dark.bg + '; color: ' + C.dark.text + '; font-size: 14px; }\n' +
      '.doc { max-width: 820px; margin: 0 auto; }\n' +
      '.header-tag { display: inline-block; padding: 5px 12px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; background: ' + C.primary + '; color: ' + C.dark.bg + '; margin-bottom: 14px; }\n' +
      '.doc-title { font-family: \'Playfair Display\', serif; font-size: 26px; font-weight: 700; color: ' + C.primary + '; letter-spacing: 0.02em; text-transform: uppercase; line-height: 1.15; margin: 0 0 8px 0; }\n' +
      '.doc-subtitle { font-size: 12px; color: ' + C.dark.muted + '; margin-bottom: 8px; }\n' +
      '.doc-subtitle a { color: ' + C.primary + '; text-decoration: underline; }\n' +
      '.divider { border: none; height: 1px; background: rgba(255,255,255,0.12); margin: 18px 0; }\n' +
      '.section-title { font-family: \'Playfair Display\', serif; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: ' + C.primary + '; margin: 0 0 10px 0; }\n' +
      '.pc-body { font-size: 13px; line-height: 1.65; color: ' + C.dark.text + '; margin: 0; max-width: 72ch; }\n' +
      '.pc-core-grid { display: grid; gap: 18px; margin-top: 4px; }\n' +
      '.pc-core-grid--1 { grid-template-columns: 1fr; }\n' +
      '.pc-core-grid--2 { grid-template-columns: 1fr 1fr; }\n' +
      '.pc-core-grid--3 { grid-template-columns: 1fr 1fr 1fr; }\n' +
      '.pc-core-grid--4 { grid-template-columns: 1fr 1fr 1fr 1fr; }\n' +
      '.pc-core-title { font-size: 12px; font-weight: 600; color: ' + C.primary + '; margin-bottom: 6px; line-height: 1.3; }\n' +
      '.pc-core-desc { font-size: 12px; line-height: 1.5; color: ' + C.dark.muted + '; }\n' +
      '.pc-pricing-row { display: grid; grid-template-columns: 1.15fr 1fr; gap: 16px; align-items: stretch; margin-top: 4px; }\n' +
      '.pc-gold { background: ' + C.primary + '; color: ' + C.dark.bg + '; border-radius: 10px; padding: 18px 20px; }\n' +
      '.pc-gold-label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.85; margin-bottom: 6px; }\n' +
      '.pc-gold-amt { font-family: \'Playfair Display\', serif; font-size: 34px; font-weight: 700; line-height: 1; margin-bottom: 12px; }\n' +
      '.pc-gold-included { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 6px; }\n' +
      '.pc-gold-list { margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.45; }\n' +
      '.pc-gold-list li { margin-bottom: 3px; }\n' +
      '.pc-maint-dual { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; height: 100%; }\n' +
      '.pc-maint-card { border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 12px 12px 10px; background: rgba(255,255,255,0.03); display: flex; flex-direction: column; }\n' +
      '.pc-maint-badge { display: inline-block; align-self: flex-start; font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: ' + C.dark.bg + '; background: ' + C.primary + '; padding: 3px 8px; border-radius: 4px; margin-bottom: 8px; }\n' +
      '.pc-maint-price { font-family: \'Playfair Display\', serif; font-size: 18px; font-weight: 700; color: ' + C.primary + '; line-height: 1.1; }\n' +
      '.pc-maint-annual { font-size: 10px; color: ' + C.dark.muted + '; margin: 4px 0 8px; line-height: 1.35; }\n' +
      '.pc-maint-feats { list-style: none; margin: auto 0 0; padding: 0; }\n' +
      '.pc-maint-feats li { position: relative; padding: 3px 0 3px 12px; font-size: 10px; line-height: 1.35; color: ' + C.dark.muted + '; }\n' +
      '.pc-maint-feats li::before { content: \'\'; position: absolute; left: 0; top: 8px; width: 5px; height: 5px; border-radius: 50%; background: ' + C.primary + '; }\n' +
      '.why-list { margin: 10px 0 0; padding-left: 18px; font-size: 13px; line-height: 1.55; color: ' + C.dark.text + '; }\n' +
      '.why-list li { margin-bottom: 6px; }\n' +
      '.next-steps-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 6px; }\n' +
      '.next-steps-grid--two { grid-template-columns: 1fr 1fr; max-width: none; width: 100%; }\n' +
      '.next-step-num { font-family: \'Playfair Display\', serif; font-size: 18px; font-weight: 700; color: ' + C.primary + '; margin-bottom: 6px; padding-bottom: 5px; border-bottom: 1px solid ' + C.primary + '; }\n' +
      '.next-step-title { font-size: 12px; font-weight: 600; color: ' + C.dark.text + '; margin-bottom: 4px; }\n' +
      '.next-step-blurb { font-size: 11px; line-height: 1.45; color: ' + C.dark.muted + '; display: block; }\n' +
      '.next-step-link { color: ' + C.primary + '; text-decoration: underline; overflow-wrap: anywhere; word-break: normal; }\n' +
      '.footer-buttons { display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap; }\n' +
      '.btn-primary { display: inline-block; padding: 10px 20px; background: ' + C.primary + '; color: ' + C.dark.bg + '; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; text-decoration: none; border-radius: 6px; }\n' +
      '.btn-outline { display: inline-block; padding: 10px 20px; background: transparent; color: ' + C.primary + '; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; text-decoration: none; border-radius: 6px; border: 2px solid ' + C.primary + '; }\n' +
      '.footer-meta { margin-top: 18px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 10px; color: ' + C.dark.muted + '; }\n' +
      '.addon-cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-top: 10px; }\n' +
      '.addon-cards-grid--single { display: block; max-width: 280px; margin: 8px auto 0; }\n' +
      '.addon-cards-grid--single .addon-card--compact { padding: 12px 14px 12px; text-align: left; }\n' +
      '.addon-cards-grid--single .addon-card-title { font-size: 12px; margin-bottom: 6px; }\n' +
      '.addon-cards-grid--single .addon-card-desc { font-size: 11px; margin-bottom: 10px; }\n' +
      '.addon-tier-rows--pill { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 2px; }\n' +
      '.addon-price-pill { display: inline-flex; align-items: center; justify-content: center; padding: 6px 14px; border-radius: 999px; border: 1px solid rgba(234,179,8,0.45); background: rgba(234,179,8,0.14); }\n' +
      '.addon-price-pill .addon-tier-price { font-size: 15px; }\n' +
      '.addons-section-intro { font-size: 11px; color: ' + C.dark.muted + '; margin: -2px 0 10px; }\n' +
      '.addon-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 14px; }\n' +
      '.addon-card-title { font-size: 12px; font-weight: 600; color: ' + C.primary + '; margin-bottom: 8px; }\n' +
      '.addon-tier-solo { display: flex; justify-content: center; padding: 10px; border-left: 3px solid ' + C.primary + '; background: rgba(234,179,8,0.12); border-radius: 8px; }\n' +
      '.addon-tier-price { font-family: \'Playfair Display\', serif; font-size: 18px; font-weight: 700; color: ' + C.primary + '; }\n' +
      '@media (max-width: 700px) { .pc-core-grid--3, .pc-core-grid--4 { grid-template-columns: 1fr 1fr; } .pc-pricing-row { grid-template-columns: 1fr; } .next-steps-grid, .next-steps-grid--two { grid-template-columns: 1fr; max-width: none; } }\n' +
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

  function buildBusinessDocHtml(doc) {
    if (doc && String(doc.type || '').toLowerCase() === 'proposal') {
      return getProposalDocumentHtml(doc);
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
      addOnsBlockHtml: addOnsBlockHtml,
      maintenanceBlockHtml: maintenanceBlockHtml
    });
  }

  function openPrintWindow(doc) {
    if (!doc) return;
    var html = buildBusinessDocHtml(doc);
    var win = global.open('', '_blank');
    if (!win) return false;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(function () {
      try {
        win.print();
      } catch (e) {
        console.warn('print failed', e);
      }
    }, 800);
    return true;
  }

  global.BusinessDocShared = {
    formatCurrency: formatCurrency,
    formatDateDisplay: formatDateDisplay,
    typeLabelFor: typeLabelFor,
    buildPrintHtml: buildBusinessDocHtml,
    openPrintWindow: openPrintWindow,
    maintenancePlans: MAINTENANCE_PLANS
  };
})(typeof window !== 'undefined' ? window : this);
