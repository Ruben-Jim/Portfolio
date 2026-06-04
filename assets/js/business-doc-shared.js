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

  /**
   * One list item per non-empty line (project scope & add-on descriptions are jot lists).
   * @param {string} listClass e.g. scope-feature-list | addon-desc-list
   */
  function linesToBulletListHtml(raw, listClass) {
    if (raw == null || String(raw).trim() === '') return '';
    var lines = String(raw).split(/\r?\n/);
    var items = [];
    for (var i = 0; i < lines.length; i++) {
      var item = stripLeadingBulletMarker(lines[i]);
      if (item) items.push(item);
    }
    if (!items.length) return '';
    var html = '<ul class="' + listClass + '">';
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
    var inner = linesToBulletListHtml(raw, 'scope-feature-list');
    if (!inner) return emptyHint;
    return wrapScope(inner);
  }

  function buildAddonDescriptionPdfHtml(raw) {
    return linesToBulletListHtml(raw, 'addon-desc-list');
  }

  /**
   * Builds optional add-ons block for PDF/print HTML (empty string if none).
   * @param {BusinessDocument} doc
   */
  function buildAddOnsPdfHtml(doc) {
    if (!doc || !doc.addOns || !Array.isArray(doc.addOns) || doc.addOns.length === 0) return '';
    var parts = [];
    for (var i = 0; i < doc.addOns.length; i++) {
      var addon = doc.addOns[i];
      if (!addon || !addon.name) continue;
      var opts = addon.priceOptions && Array.isArray(addon.priceOptions) ? addon.priceOptions : [];
      if (!opts.length) continue;
      var nameEsc = escapeHtml(addon.name);
      var descInner = buildAddonDescriptionPdfHtml(addon.description || '');
      var tierRows = '';
      for (var j = 0; j < opts.length; j++) {
        var o = opts[j];
        var amt = typeof o.amount === 'number' && !isNaN(o.amount) ? o.amount : 0;
        tierRows +=
          '<div class="addon-tier-row addon-tier-only">' +
          '<div class="addon-tier-solo">' +
          '<span class="addon-tier-price">' +
          escapeHtml(formatCurrency(amt)) +
          '</span></div>' +
          '</div>';
      }
      parts.push(
        '<div class="addon-card">' +
          '<div class="addon-card-title">' +
          nameEsc +
          '</div>' +
          (descInner
            ? '<div class="addon-card-desc">' + descInner + '</div>'
            : '') +
          '<div class="addon-tier-rows">' +
          tierRows +
          '</div>' +
          '</div>'
      );
    }
    if (!parts.length) return '';
    return (
      '    <hr class="divider">\n' +
      '    <div class="section-title">Optional upgrades for the proposed site</div>\n' +
      '    <p class="addons-section-intro">Optional ways to enhance or extend the proposed build—your customer can choose any tier to upgrade beyond the base scope above.</p>\n' +
      '    <div class="addon-cards-grid">' +
      parts.join('') +
      '</div>\n'
    );
  }

  /**
   * HTML generator for business documents. Produces print-optimized HTML
   * Params: { customer, typeLabel, created, due, scope, totalFormatted, proposedSiteUrl, addOnsBlockHtml }
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
      '@media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } body { padding: 12px 16px !important; } .doc { page-break-inside: avoid; transform-origin: top center; } .header-tag { padding: 4px 10px; font-size: 10px; margin-bottom: 8px; } .doc-title { font-size: 20px; margin-bottom: 4px; } .doc-subtitle { font-size: 11px; margin-bottom: 12px; } .divider { margin: 10px 0 !important; } .section-title { font-size: 11px; margin-bottom: 6px; } .addons-section-intro { font-size: 10px; margin: -2px 0 10px 0; } .scope-frame { box-shadow: none !important; } .scope-frame-inner { padding: 10px 12px !important; } .scope-kicker { font-size: 12px !important; padding-bottom: 8px !important; margin-bottom: 10px !important; } .scope-feature-list li { font-size: 11px; padding: 6px 8px !important; margin-bottom: 4px !important; } .scope-feature-list li::before { width: 5px; height: 5px; margin-top: 5px; } .addon-cards-grid { gap: 10px; margin-top: 8px; } .addon-card { padding: 12px 14px; } .addon-card-title { font-size: 12px; } .addon-card-desc { font-size: 11px; margin-bottom: 8px; } .addon-desc-list li { font-size: 11px; padding: 5px 0; } .addon-tier-solo { padding: 10px 14px; } .addon-tier-price { font-size: 17px; } .features-grid { gap: 12px; margin-top: 6px; } .feature-title { font-size: 11px; margin-bottom: 2px; } .feature-desc { font-size: 11px; line-height: 1.35; } .pricing-grid { gap: 12px; margin-top: 6px; } .price-card { padding: 12px 16px; } .price-card-primary .price-label { font-size: 10px; margin-bottom: 4px; } .price-card-primary .price-amt { font-size: 28px; } .price-card-primary .price-meta { font-size: 11px; margin-top: 8px; line-height: 1.35; } .price-card-secondary .price-label { font-size: 10px; margin-bottom: 4px; } .price-card-secondary .price-meta { font-size: 11px; line-height: 1.4; } .why-list { margin-top: 6px; padding-left: 16px; font-size: 12px; line-height: 1.45; } .why-list li { margin-bottom: 4px; } .next-steps-grid { gap: 12px; margin-top: 6px; } .next-step-num { font-size: 16px; margin-bottom: 4px; padding-bottom: 4px; } .next-step-title { font-size: 12px; margin-bottom: 2px; } .next-step-link { font-size: 11px; } .footer-buttons { margin-top: 12px; gap: 8px; } .btn-primary, .btn-outline { padding: 8px 16px; font-size: 11px; } .footer-meta { margin-top: 12px; padding-top: 10px; font-size: 10px; } }\n' +
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
      '.scope-feature-list li { display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px; margin-bottom: 6px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); background: rgba(0,0,0,0.18); font-size: 13px; line-height: 1.5; font-weight: 500; color: ' + C.dark.text + '; }\n' +
      '.scope-feature-list li:last-child { margin-bottom: 0; }\n' +
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

  function buildBusinessDocHtml(doc) {
    var created = formatDateDisplay(doc.createdAt);
    var due = doc.dueDate ? formatDateDisplay(doc.dueDate) : '—';
    var typeLabel =
      doc.type === 'proposal' ? 'PROPOSAL' :
      doc.type === 'estimate' ? 'ESTIMATE' :
      doc.type === 'invoice' ? 'INVOICE' : 'DOCUMENT';
    var items = [{ description: typeLabel + ' Total', amount: doc.total || 0 }];
    var addOnsBlockHtml = buildAddOnsPdfHtml(doc);
    return getBusinessDocumentHtml({
      customer: { name: doc.clientName || '', email: doc.clientEmail || '' },
      items: items,
      typeLabel: typeLabel,
      created: created,
      due: due,
      scope: doc.notes || '',
      proposedSiteUrl: doc.proposedSiteUrl || '',
      totalFormatted: formatCurrency(doc.total || 0),
      id: doc.id || '',
      addOnsBlockHtml: addOnsBlockHtml
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
    openPrintWindow: openPrintWindow
  };
})();
