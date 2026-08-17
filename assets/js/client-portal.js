/**
 * Public client project portal — /portal/{token}
 * Loaded only from portal.html (no admin UI).
 */
(function () {
  'use strict';

  var PATH_PORTALS = 'agencyClientPortals';
  var PATH_PROJECTS = 'agencyProjects';
  var PATH_PORTFOLIO = 'portfolioProjects';
  var PATH_BUSINESS_DOCS = 'agencyBusinessDocuments';
  var PATH_CONTRACT_SIGNATURES = 'agencyContractSignatures';
  var PATH_MAINTENANCE = 'agencyMaintenance';

  /**
   * How CWR receives invoice payments in the portal (Zelle / PayPal / Venmo).
   * Update handles here when accounts change — keep in sync with invoice PDF copy
   * in business-doc-shared.js (CWR_INVOICE_PAYMENT_METHODS).
   */
  var PORTAL_PAYMENT_METHODS = [
    {
      id: 'zelle',
      label: 'Zelle',
      handleLabel: 'Email',
      handle: 'ruben.jim.co@gmail.com',
      altHandleLabel: 'Or phone',
      altHandle: '559 653 7380',
      hint: 'Open your bank app → Zelle → Send. Use the invoice # as the memo.'
    },
    {
      id: 'paypal',
      label: 'PayPal',
      handleLabel: 'Send to',
      handle: 'jruben447@gmail.com',
      hint: 'PayPal → Send. Include the invoice # in the note.',
      link: ''
    },
    {
      id: 'venmo',
      label: 'Venmo',
      handleLabel: 'Username',
      handle: '@RubenDEV',
      hint: 'Venmo → Pay. Include the invoice # in the note.',
      link: 'https://venmo.com/RubenDEV'
    }
  ];

  /** Keep in sync with business-doc-shared.js MAINTENANCE_PLANS + Services & Pricing. */
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
      hoursIncluded: 2,
      slaHours: 120,
      features: [
        'If you’re down, we reply within 1 business day (weekdays)',
        'Bug fixes after Standard and Priority',
        'Store updates 4×/year',
        'New features quoted separately'
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
      slaLabel: '3 business days',
      hoursIncluded: 6,
      slaHours: 72,
      recommended: true,
      features: [
        'If you’re down, we reply within 4 hours (nights and weekends too)',
        'Monthly store + content updates',
        'New features and improvements each month',
        'A bigger addition each quarter · one major app or site overhaul each year'
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
      slaLabel: '24 hours',
      hoursIncluded: 10,
      slaHours: 24,
      features: [
        'First in line · if you’re down, we reply within 2 hours (nights and weekends too)',
        'Store updates as needed · weekly content',
        'New features and improvements each month · a bigger addition each quarter',
        'A major app or site overhaul every 6 months'
      ]
    }
  ];

  var portalDmSubscription = null;
  var portalDmFabMetaUnsub = null;

  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function rtdbReady() {
    return !!(window.rtdb && window.rtdbRef && window.rtdbGet);
  }

  function rtdbWriteReady() {
    return rtdbReady() && window.rtdbSet && window.rtdbPush && window.rtdbUpdate;
  }

  function inferMaintenancePlanStatus(row) {
    var ps = String((row && row.planStatus) || '').toLowerCase();
    if (ps === 'pending' || ps === 'active' || ps === 'none') return ps;
    if (row && (row.renewalDate || Number(row.hoursIncluded) > 0)) return 'active';
    return 'none';
  }

  function planDefaultsForTier(tier) {
    var t = String(tier || 'standard').toLowerCase();
    for (var i = 0; i < MAINTENANCE_PLANS.length; i++) {
      if (MAINTENANCE_PLANS[i].id === t) {
        return {
          hoursIncluded: MAINTENANCE_PLANS[i].hoursIncluded,
          slaHours: MAINTENANCE_PLANS[i].slaHours
        };
      }
    }
    return { hoursIncluded: 6, slaHours: 72 };
  }

  function normalizeMaintenanceRecord(id, row) {
    row = row || {};
    var defs = planDefaultsForTier(row.planTier);
    var m = {
      id: id,
      clientName: String(row.clientName || '').slice(0, 120),
      projectId: String(row.projectId || ''),
      planTier: String(row.planTier || 'standard').slice(0, 40),
      planStatus: String(row.planStatus || '').toLowerCase().slice(0, 20),
      billingPreference: String(row.billingPreference || 'monthly').slice(0, 20),
      planRequestedAt: row.planRequestedAt || null,
      hoursIncluded: Number(row.hoursIncluded) || defs.hoursIncluded,
      hoursUsed: Number(row.hoursUsed) || 0,
      renewalDate: String(row.renewalDate || ''),
      slaHours: Number(row.slaHours) || defs.slaHours
    };
    m.effectivePlanStatus = inferMaintenancePlanStatus(m);
    return m;
  }

  function findMaintenanceForHub(hubRow, projectId, allMaint) {
    if (!allMaint || !allMaint.length) return null;
    var pid = String(projectId || hubRow.id || '').trim();
    var byProject = allMaint.find(function (m) {
      return m.projectId === pid;
    });
    if (byProject) return byProject;
    var cn = String(hubRow.clientName || '').toLowerCase().trim();
    if (!cn) return null;
    return (
      allMaint.find(function (m) {
        return (m.clientName || '').toLowerCase().trim() === cn;
      }) || null
    );
  }

  async function loadAllMaintenanceRecords() {
    if (!rtdbReady()) return [];
    try {
      var snap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATH_MAINTENANCE));
    } catch (err) {
      console.warn('Could not load maintenance records for portal:', err);
      return [];
    }
    var val = snap.val();
    if (!val || typeof val !== 'object') return [];
    return Object.keys(val).map(function (key) {
      return normalizeMaintenanceRecord(key, val[key]);
    });
  }

  function formatMaintTimestamp(value) {
    if (!value) return '';
    if (typeof value === 'object' && value.seconds != null) {
      return formatDocDate(new Date(value.seconds * 1000).toISOString());
    }
    if (typeof value === 'number') {
      return formatDocDate(new Date(value).toISOString());
    }
    return formatDocDate(String(value));
  }

  function planTierLabel(tier) {
    var t = String(tier || 'standard').toLowerCase();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function maintenancePlanPriceNote(plan, billing) {
    if (billing === 'annual') {
      return plan.annualNote + (plan.annualEquiv ? ' · ' + plan.annualEquiv : '');
    }
    return plan.monthlyNote || '';
  }

  function updatePortalMaintPlanPrices(pickerEl) {
    if (!pickerEl) pickerEl = document.getElementById('portal-maint-picker');
    if (!pickerEl) return;
    var billInput = pickerEl.querySelector('input[name="portal-billing-pref"]:checked');
    var billing = billInput && billInput.value === 'annual' ? 'annual' : 'monthly';
    MAINTENANCE_PLANS.forEach(function (plan) {
      var priceMain = pickerEl.querySelector(
        '.client-portal-plan-price[data-maint-plan="' + plan.id + '"] .client-portal-plan-price-main'
      );
      var noteEl = pickerEl.querySelector('.client-portal-plan-note[data-maint-plan="' + plan.id + '"]');
      if (priceMain) priceMain.textContent = billing === 'annual' ? plan.annual : plan.monthly;
      if (noteEl) {
        var note = maintenancePlanPriceNote(plan, billing);
        noteEl.textContent = note;
        noteEl.hidden = !note;
      }
    });
  }

  function renderMaintenancePlanCards(selectedTier) {
    return (
      '<div class="client-portal-plan-grid">' +
      MAINTENANCE_PLANS.map(function (plan) {
        var checked = selectedTier === plan.id ? ' checked' : '';
        // Non-recommended cards keep an invisible pill so every card's badge
        // row is the same height and the titles below stay aligned.
        var recBadge = plan.recommended
          ? '<span class="client-portal-plan-rec">Recommended</span>'
          : '<span class="client-portal-plan-rec" aria-hidden="true">Recommended</span>';
        return (
          '<label class="client-portal-plan-card' +
          (plan.recommended ? ' is-recommended' : '') +
          (plan.id === 'priority' ? ' client-portal-plan-card--wide' : '') +
          '">' +
          '<input type="radio" name="portal-plan-tier" value="' +
          esc(plan.id) +
          '"' +
          checked +
          '>' +
          '<span class="client-portal-plan-head">' +
          '<span class="client-portal-plan-headline">' +
          '<span class="client-portal-plan-badges">' +
          '<span class="client-portal-plan-badge">' +
          esc(plan.badge) +
          '</span>' +
          recBadge +
          '</span>' +
          '<strong class="client-portal-plan-title">' +
          esc(plan.title) +
          '</strong>' +
          '<p class="client-portal-plan-price" data-maint-plan="' +
          esc(plan.id) +
          '">' +
          '<span class="client-portal-plan-price-main">' +
          esc(plan.monthly) +
          '</span></p>' +
          '<p class="client-portal-plan-note" data-maint-plan="' +
          esc(plan.id) +
          '">' +
          esc(plan.monthlyNote || '') +
          '</p>' +
          '</span>' +
          // Response time was already in the data but never shown — it is the
          // thing a client most wants to compare between tiers.
          (plan.slaLabel
            ? '<p class="client-portal-plan-sla">' +
              '<span class="client-portal-plan-sla-label">We reply in</span>' +
              '<span class="client-portal-plan-sla-value">' +
              esc(plan.slaLabel) +
              '</span>' +
              '</p>'
            : '') +
          '</span>' +
          '<ul class="client-portal-plan-features">' +
          plan.features
            .map(function (f) {
              return '<li>' + esc(f) + '</li>';
            })
            .join('') +
          '</ul></label>'
        );
      }).join('') +
      '</div>'
    );
  }

  function renderMaintenanceBlock(maint, project) {
    var status = maint ? maint.effectivePlanStatus : 'none';

    if (status === 'active' && maint) {
      return (
        '<div class="client-portal-maint-block">' +
        '<h3 class="client-portal-support-subhead">Your maintenance plan</h3>' +
        '<p class="client-portal-maint-active">' +
        '<strong>' +
        esc(planTierLabel(maint.planTier)) +
        '</strong> · ' +
        esc(maint.hoursUsed) +
        ' of ' +
        esc(maint.hoursIncluded) +
        ' hours used' +
        (maint.renewalDate ? ' · Renews ' + esc(formatDocDate(maint.renewalDate)) : '') +
        '</p>' +
        '<p class="client-portal-maint-meta">We reply within ' +
        esc((function () {
          var t = String(maint.planTier || 'standard').toLowerCase();
          for (var i = 0; i < MAINTENANCE_PLANS.length; i++) {
            if (MAINTENANCE_PLANS[i].id === t) return MAINTENANCE_PLANS[i].slaLabel;
          }
          return String(maint.slaHours) + ' hours';
        })()) +
        '. Repair uses leftover hours. Custom work beyond the add-on cadence is quoted separately.</p></div>'
      );
    }

    if (status === 'pending' && maint) {
      return (
        '<div class="client-portal-maint-block">' +
        '<h3 class="client-portal-support-subhead">Maintenance plan request</h3>' +
        '<p class="client-portal-maint-pending" role="status">' +
        'We received your request for <strong>' +
        esc(planTierLabel(maint.planTier)) +
        '</strong> (' +
        esc(maint.billingPreference === 'annual' ? 'annual billing' : 'monthly billing') +
        ')' +
        (maint.planRequestedAt ? ' on ' + esc(formatMaintTimestamp(maint.planRequestedAt)) : '') +
        '. Your contact will confirm and activate billing.</p></div>'
      );
    }

    return (
      '<div class="client-portal-maint-block" id="portal-maint-picker">' +
      '<h3 class="client-portal-support-subhead">Choose a maintenance plan</h3>' +
      '<p class="client-portal-maint-lead">After your first included month, ongoing support keeps hosting, updates, and minor fixes on track.</p>' +
      '<fieldset class="client-portal-billing-pref">' +
      '<legend>Billing preference</legend>' +
      '<div class="client-portal-billing-toggle">' +
      '<label><input type="radio" name="portal-billing-pref" value="monthly" checked><span>Monthly</span></label>' +
      '<label><input type="radio" name="portal-billing-pref" value="annual"><span>Annual <em class="client-portal-billing-save">Save 45%</em></span></label>' +
      '</div>' +
      '</fieldset>' +
      renderMaintenancePlanCards('standard') +
      '<button type="button" class="btn btn-primary" id="portal-request-plan-btn">Request this plan</button>' +
      '<p class="client-portal-maint-feedback" id="portal-maint-feedback" role="status"></p></div>'
    );
  }

  function isPortalDmAvailable() {
    return (
      window.CustomerDmShared &&
      window.CustomerDmShared.isCustomerDmPortalEnabled() &&
      rtdbWriteReady() &&
      window.rtdbOnValue
    );
  }

  function renderPortalDmOverlayHtml(prefillName) {
    return (
      '<div id="portal-dm-sheet-root" class="portal-dm-sheet-root" aria-hidden="true">' +
      '<div class="portal-dm-sheet-backdrop" id="portal-dm-sheet-backdrop"></div>' +
      '<div class="portal-dm-sheet" role="dialog" aria-modal="true" aria-labelledby="portal-dm-sheet-title">' +
      '<div class="portal-dm-sheet-grabber" id="portal-dm-sheet-grabber" role="separator" aria-orientation="horizontal" aria-label="Drag to resize" tabindex="0"></div>' +
      '<div class="portal-dm-sheet-head">' +
      '<h2 id="portal-dm-sheet-title" class="portal-dm-sheet-title">Messages</h2>' +
      '<button type="button" class="portal-dm-sheet-close" id="portal-dm-sheet-close" aria-label="Close messages">×</button>' +
      '</div>' +
      '<div class="portal-dm-sheet-body has-scrollbar">' +
      '<div id="portal-dm-auth" class="portal-dm-auth">' +
      '<p class="portal-dm-auth-lead">Use your name and email to open your thread. Same conversation as our Messages page when you use the same email.</p>' +
      '<form id="portal-dm-open-form" class="portal-dm-auth-form">' +
      '<input type="text" id="portal-dm-name" class="portal-dm-input" placeholder="Your name" required value="' +
      esc(prefillName) +
      '">' +
      '<input type="email" id="portal-dm-email" class="portal-dm-input" placeholder="Your email" required>' +
      '<p id="portal-dm-status" class="portal-dm-status" role="status" aria-live="polite"></p>' +
      '<button type="submit" class="btn btn-primary btn-block">Open conversation</button></form></div>' +
      '<div id="portal-dm-conversation" class="portal-dm-conversation" hidden>' +
      '<div id="portal-dm-status-badges" class="portal-dm-badges" role="status"></div>' +
      '<div id="portal-dm-message-list" class="portal-dm-message-list has-scrollbar" aria-live="polite"></div>' +
      '<form id="portal-dm-composer" class="portal-dm-composer">' +
      '<div class="portal-dm-composer-row">' +
      '<textarea id="portal-dm-message" class="portal-dm-input portal-dm-textarea" rows="2" placeholder="Describe the issue or question…" required></textarea>' +
      '<button type="submit" class="btn btn-primary portal-dm-send" aria-label="Send message">Send</button></div></form></div></div></div></div>'
    );
  }

  function renderMaintenanceSupportSection(maint, project) {
    return (
      '<details class="client-portal-support-footer" open>' +
      '<summary>Maintenance &amp; support</summary>' +
      '<div class="client-portal-support-body">' +
      renderMaintenanceBlock(maint, project) +
      '</div></details>'
    );
  }

  async function submitMaintenancePlanRequest(ctx, tier, billingPref) {
    if (!rtdbWriteReady() || !ctx) return;
    var feedback = document.getElementById('portal-maint-feedback');
    if (feedback) {
      feedback.textContent = 'Submitting…';
      feedback.classList.remove('is-error');
    }
    var defs = planDefaultsForTier(tier);
    var payload = {
      clientName: ctx.clientName || '',
      projectId: ctx.projectId || '',
      planTier: tier,
      billingPreference: billingPref,
      planStatus: 'pending',
      planRequestedAt: window.rtdbServerTimestamp(),
      hoursIncluded: defs.hoursIncluded,
      hoursUsed: 0,
      renewalDate: '',
      slaHours: defs.slaHours,
      notes: '',
      tickets: [],
      updatedAt: window.rtdbServerTimestamp()
    };
    try {
      if (ctx.maintId) {
        delete payload.tickets;
        await window.rtdbUpdate(
          window.rtdbRef(window.rtdb, PATH_MAINTENANCE + '/' + ctx.maintId),
          payload
        );
      } else {
        payload.createdAt = window.rtdbServerTimestamp();
        var ref = window.rtdbPush(window.rtdbRef(window.rtdb, PATH_MAINTENANCE));
        await window.rtdbSet(ref, payload);
        ctx.maintId = ref.key;
      }
      if (feedback) feedback.textContent = 'Request sent. We will confirm your plan soon.';
      var allMaint = await loadAllMaintenanceRecords();
      var hubRow = { clientName: ctx.clientName, id: ctx.projectId };
      var maint = findMaintenanceForHub(hubRow, ctx.projectId, allMaint);
      var picker = document.getElementById('portal-maint-picker');
      if (picker && picker.parentNode) {
        picker.outerHTML = renderMaintenanceBlock(maint, { clientName: ctx.clientName });
      }
    } catch (err) {
      console.error(err);
      if (feedback) {
        feedback.textContent = (err && err.message) || 'Could not submit request.';
        feedback.classList.add('is-error');
      }
    }
  }

  function stopPortalDmSubscription() {
    if (portalDmSubscription && typeof portalDmSubscription.stop === 'function') {
      portalDmSubscription.stop();
    }
    portalDmSubscription = null;
  }

  var PORTAL_DM_SHEET_VH_KEY = 'portalDmSheetMaxHeightVh';
  var PORTAL_DM_SHEET_MIN_VH = 40;
  var PORTAL_DM_SHEET_MAX_VH = 100;
  var PORTAL_DM_SHEET_DEFAULT_VH = 88;

  function readPortalDmSheetMaxVh() {
    try {
      var n = parseFloat(localStorage.getItem(PORTAL_DM_SHEET_VH_KEY));
      if (!isNaN(n)) return Math.max(PORTAL_DM_SHEET_MIN_VH, Math.min(PORTAL_DM_SHEET_MAX_VH, n));
    } catch (e) {}
    return PORTAL_DM_SHEET_DEFAULT_VH;
  }

  function applyPortalDmSheetMaxVh(sheetEl, vh) {
    if (!sheetEl) return;
    var v = Math.max(PORTAL_DM_SHEET_MIN_VH, Math.min(PORTAL_DM_SHEET_MAX_VH, vh));
    sheetEl.style.setProperty('--portal-dm-sheet-max-vh', String(v));
  }

  function showPortalDmPanel(mode) {
    var auth = document.getElementById('portal-dm-auth');
    var conv = document.getElementById('portal-dm-conversation');
    if (auth) auth.hidden = mode !== 'auth';
    if (conv) conv.hidden = mode !== 'conversation';
  }

  function openPortalDmSheet() {
    var root = document.getElementById('portal-dm-sheet-root');
    if (!root) return;
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('portal-dm-sheet-open');
    var sheet = root.querySelector('.portal-dm-sheet');
    if (sheet) applyPortalDmSheetMaxVh(sheet, readPortalDmSheetMaxVh());
    var session = window.portalDmSession || (window.CustomerDmShared && window.CustomerDmShared.readCustomerSession());
    if (session && session.conversationId) {
      startPortalDmConversation(session);
    } else {
      showPortalDmPanel('auth');
    }
  }

  function closePortalDmSheet() {
    var root = document.getElementById('portal-dm-sheet-root');
    if (!root) return;
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('portal-dm-sheet-open');
  }

  function startPortalDmConversation(session) {
    var DM = window.CustomerDmShared;
    if (!DM || !session || !session.conversationId) return;
    DM.writeCustomerSession(session);
    window.portalDmSession = session;
    showPortalDmPanel('conversation');
    stopPortalDmSubscription();
    var listEl = document.getElementById('portal-dm-message-list');
    var badgesEl = document.getElementById('portal-dm-status-badges');
    portalDmSubscription = DM.subscribeCustomerThread(session, {
      onMessages: function (messages) {
        DM.renderMessagesToElement(listEl, messages, { showReadState: true });
      },
      onMeta: function (meta) {
        if (badgesEl) badgesEl.innerHTML = DM.renderStatusBadgesHtml(meta);
      }
    });
  }

  function initPortalDmSheetResize() {
    var sheet = document.querySelector('#portal-dm-sheet-root .portal-dm-sheet');
    var grabber = document.getElementById('portal-dm-sheet-grabber');
    if (!sheet || !grabber) return;
    applyPortalDmSheetMaxVh(sheet, readPortalDmSheetMaxVh());
    var dragging = false;
    var startY = 0;
    var startVh = 0;

    function endDrag() {
      dragging = false;
      grabber.classList.remove('is-dragging');
      grabber.removeAttribute('aria-grabbed');
      sheet.classList.remove('is-resizing');
      try {
        localStorage.setItem(PORTAL_DM_SHEET_VH_KEY, String(readPortalDmSheetMaxVhFromDom(sheet)));
      } catch (e) {}
    }

    function readPortalDmSheetMaxVhFromDom(el) {
      var raw = el.style.getPropertyValue('--portal-dm-sheet-max-vh').trim();
      if (raw) {
        var p = parseFloat(raw);
        if (!isNaN(p)) return Math.max(PORTAL_DM_SHEET_MIN_VH, Math.min(PORTAL_DM_SHEET_MAX_VH, p));
      }
      return readPortalDmSheetMaxVh();
    }

    function onPointerDown(e) {
      if (window.matchMedia && window.matchMedia('(min-width: 900px)').matches) return;
      dragging = true;
      startY = e.clientY;
      startVh = readPortalDmSheetMaxVhFromDom(sheet);
      grabber.classList.add('is-dragging');
      grabber.setAttribute('aria-grabbed', 'true');
      sheet.classList.add('is-resizing');
      if (grabber.setPointerCapture) grabber.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e) {
      if (!dragging) return;
      var deltaPx = startY - e.clientY;
      var deltaVh = (deltaPx / window.innerHeight) * 100;
      applyPortalDmSheetMaxVh(sheet, startVh + deltaVh);
      e.preventDefault();
    }

    grabber.addEventListener('pointerdown', onPointerDown);
    grabber.addEventListener('pointermove', onPointerMove);
    grabber.addEventListener('pointerup', endDrag);
    grabber.addEventListener('pointercancel', endDrag);
  }

  function updatePortalDmFabBadge(fab, count) {
    if (!fab) return;
    var badge = fab.querySelector('.portal-dm-fab-badge');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'portal-dm-fab-badge';
        fab.appendChild(badge);
      }
      badge.textContent = count > 9 ? '9+' : String(count);
    } else if (badge) {
      badge.remove();
    }
  }

  function mountPortalDmChrome(project, ctx) {
    if (!isPortalDmAvailable()) return;
    var existingFab = document.getElementById('portal-dm-fab');
    if (existingFab) existingFab.remove();
    var existingRoot = document.getElementById('portal-dm-sheet-root');
    if (existingRoot) existingRoot.remove();
    stopPortalDmSubscription();
    if (typeof portalDmFabMetaUnsub === 'function') {
      portalDmFabMetaUnsub();
      portalDmFabMetaUnsub = null;
    }

    var prefillName = project.clientName || project.title || '';
    var fab = document.createElement('button');
    fab.type = 'button';
    fab.id = 'portal-dm-fab';
    fab.className = 'portal-dm-fab';
    fab.setAttribute('aria-label', 'Open messages');
    fab.innerHTML = '<span class="portal-dm-fab-label">Messages</span>';
    document.body.appendChild(fab);

    var wrap = document.createElement('div');
    wrap.innerHTML = renderPortalDmOverlayHtml(prefillName);
    var overlay = wrap.firstElementChild;
    if (overlay) document.body.appendChild(overlay);

    window.portalDmCtx = ctx;
    var DM = window.CustomerDmShared;
    var saved = DM.readCustomerSession();
    if (saved && saved.conversationId) {
      window.portalDmSession = saved;
      // Peek at unread count without subscribing to the thread itself — the thread
      // subscription (see subscribeCustomerThread) marks messages as read as a side
      // effect, which would clear the badge before the client ever opens the sheet.
      if (window.rtdbOnValue && DM.rtdbMetaRef) {
        portalDmFabMetaUnsub = window.rtdbOnValue(DM.rtdbMetaRef(saved.conversationId), function (snap) {
          var meta = snap.val() || {};
          updatePortalDmFabBadge(fab, Number(meta.unreadCustomer || 0));
        });
      }
      // Belt-and-suspenders: a session restored from localStorage may predate this
      // project, come from a flow that never captured a real name, or already carry
      // the generic "Customer" placeholder — any of which bakes that same generic
      // name into every message and into the admin's conversation "From" column.
      // Self-heal it using the project's own client name whenever the stored name
      // is missing or is itself just the literal word "Customer".
      var storedName = String(saved.customerName || '').trim();
      var nameLooksGeneric = !storedName || /^customer$/i.test(storedName);
      if (nameLooksGeneric && prefillName && saved.customerEmail) {
        DM.getOrCreateConversationForEmail(saved.customerEmail, prefillName, {
          source: 'client-portal',
          agencyProjectId: (ctx && ctx.projectId) || ''
        })
          .then(function (conv) {
            var fixed = Object.assign({}, saved, { customerName: conv.customerName || prefillName });
            DM.writeCustomerSession(fixed);
            window.portalDmSession = fixed;
          })
          .catch(function () {});
      }
    } else {
      window.portalDmSession = null;
    }

    var openForm = document.getElementById('portal-dm-open-form');
    var statusEl = document.getElementById('portal-dm-status');
    var composer = document.getElementById('portal-dm-composer');
    var msgInput = document.getElementById('portal-dm-message');

    function setDmStatus(msg, isError) {
      if (!statusEl) return;
      statusEl.textContent = msg || '';
      statusEl.classList.toggle('is-error', !!isError);
    }

    fab.addEventListener('click', function () {
      openPortalDmSheet();
    });

    var backdrop = document.getElementById('portal-dm-sheet-backdrop');
    var closeBtn = document.getElementById('portal-dm-sheet-close');
    if (backdrop) backdrop.addEventListener('click', closePortalDmSheet);
    if (closeBtn) closeBtn.addEventListener('click', closePortalDmSheet);

    document.addEventListener('keydown', function portalDmEsc(e) {
      if (e.key !== 'Escape') return;
      var root = document.getElementById('portal-dm-sheet-root');
      if (!root || !root.classList.contains('is-open')) return;
      closePortalDmSheet();
    });

    if (openForm) {
      openForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var activeCtx = window.portalDmCtx || ctx;
        var nameEl = document.getElementById('portal-dm-name');
        var emailEl = document.getElementById('portal-dm-email');
        var name = nameEl ? nameEl.value.trim() : '';
        var email = emailEl ? emailEl.value.trim() : '';
        if (!name || !email) {
          setDmStatus('Please enter your name and email.', true);
          return;
        }
        setDmStatus('Opening…', false);
        DM.getOrCreateConversationForEmail(email, name, {
          source: 'client-portal',
          subject: 'Client portal message',
          tags: ['client-portal'],
          agencyProjectId: activeCtx.projectId || ''
        })
          .then(function (conv) {
            startPortalDmConversation({
              conversationId: conv.id,
              customerEmail: (conv.customerEmail || email).toLowerCase(),
              customerName: conv.customerName || name
            });
            setDmStatus('', false);
          })
          .catch(function (err) {
            setDmStatus(DM.formatRtdbPortalError(err), true);
          });
      });
    }

    if (composer && msgInput) {
      composer.addEventListener('submit', function (e) {
        e.preventDefault();
        var session = window.portalDmSession || DM.readCustomerSession();
        if (!session || !session.conversationId) {
          setDmStatus('Open your conversation with name and email first.', true);
          showPortalDmPanel('auth');
          return;
        }
        var text = msgInput.value.trim();
        if (!text) return;
        DM.sendCustomerMessage(session.conversationId, session, text, '')
          .then(function () {
            msgInput.value = '';
          })
          .catch(function (err) {
            alert('Failed to send: ' + (err && err.message ? err.message : 'Error'));
          });
      });

      msgInput.addEventListener('input', function () {
        var session = window.portalDmSession || DM.readCustomerSession();
        if (!session || !session.conversationId) return;
        DM.setCustomerTyping(session.conversationId, true).catch(function () {});
        clearTimeout(mountPortalDmChrome._typingTimer);
        mountPortalDmChrome._typingTimer = setTimeout(function () {
          DM.setCustomerTyping(session.conversationId, false).catch(function () {});
        }, 1200);
      });
    }

    initPortalDmSheetResize();
  }

  function bindMaintenanceSupportSection(root, ctx, project, maint) {
    if (!root) return;
    var picker = root.querySelector('#portal-maint-picker');
    if (picker) {
      updatePortalMaintPlanPrices(picker);
      picker.querySelectorAll('input[name="portal-billing-pref"]').forEach(function (radio) {
        radio.addEventListener('change', function () {
          updatePortalMaintPlanPrices(picker);
        });
      });
    }
    var requestBtn = root.querySelector('#portal-request-plan-btn');
    if (requestBtn) {
      requestBtn.addEventListener('click', function () {
        var tierInput = root.querySelector('input[name="portal-plan-tier"]:checked');
        var billInput = root.querySelector('input[name="portal-billing-pref"]:checked');
        var tier = tierInput ? tierInput.value : 'standard';
        var billing = billInput ? billInput.value : 'monthly';
        ctx.maintId = maint && maint.id ? maint.id : ctx.maintId;
        submitMaintenancePlanRequest(ctx, tier, billing);
      });
    }
  }

  function normalizePortalGuides(row) {
    row = row || {};
    var out = [];
    var seen = {};
    function pushGuide(url, title) {
      var normalized =
        window.PortfolioDetailShared && window.PortfolioDetailShared.normalizeCanvasDocUrl
          ? window.PortfolioDetailShared.normalizeCanvasDocUrl(url)
          : String(url || '').trim();
      if (!normalized || seen[normalized]) return;
      seen[normalized] = true;
      out.push({
        url: normalized.slice(0, 500),
        title: String(title || 'Project guide').trim().slice(0, 120) || 'Project guide'
      });
    }
    if (Array.isArray(row.portalGuides)) {
      row.portalGuides.forEach(function (g) {
        if (!g || typeof g !== 'object') return;
        pushGuide(g.url || g.portalCanvasDocUrl, g.title || g.portalCanvasDocTitle);
      });
    }
    if (!out.length && row.portalCanvasDocUrl) {
      pushGuide(row.portalCanvasDocUrl, row.portalCanvasDocTitle);
    }
    return out.slice(0, 8);
  }

  function normalizeProject(id, row) {
    row = row || {};
    var milestones = Array.isArray(row.milestones) ? row.milestones : [];
    var guides = normalizePortalGuides(row);
    var stage = String(row.deliveryStage || 'demo').toLowerCase();
    if (stage !== 'client' && stage !== 'converting') stage = 'demo';
    return {
      id: id,
      clientName: String(row.clientName || '').slice(0, 120),
      title: String(row.title || '').slice(0, 200),
      expoUrl: String(row.expoUrl || '').slice(0, 500),
      clientLogo: String(row.clientLogo || '').slice(0, 200),
      // The portal builds its own whitelisted view of the hub record — a field
      // not listed here never reaches the page, however well it saved.
      appStoreUrl: String(row.appStoreUrl || '').slice(0, 500),
      playStoreUrl: String(row.playStoreUrl || '').slice(0, 500),
      deliveryStage: stage,
      portfolioProjectId: String(row.portfolioProjectId || '').slice(0, 80),
      businessDocId: String(row.businessDocId || '').slice(0, 80),
      portalGuides: guides,
      portalCanvasDocUrl: guides[0] ? guides[0].url : '',
      portalCanvasDocTitle: guides[0] ? guides[0].title : 'Project guide',
      showMaintenanceInPortal: row.showMaintenanceInPortal !== false,
      milestones: milestones.map(function (m, i) {
        return {
          id: m.id || 'm' + i,
          label: String(m.label || '').slice(0, 120),
          done: !!m.done
        };
      })
    };
  }

  function getPortalToken() {
    var params = new URLSearchParams(location.search);
    var fromQuery = params.get('token');
    if (fromQuery) return fromQuery.replace(/[^a-f0-9]/gi, '').slice(0, 64);

    var parts = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    var portalIdx = parts.indexOf('portal');
    if (portalIdx >= 0 && parts[portalIdx + 1] && parts[portalIdx + 1] !== 'portal.html') {
      return parts[portalIdx + 1].replace(/[^a-f0-9]/gi, '').slice(0, 64);
    }
    return '';
  }

  async function loadPortfolioRecord(id) {
    if (!id) return null;
    var snap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATH_PORTFOLIO + '/' + id));
    if (!snap.val()) return null;
    return Object.assign({ id: id }, snap.val());
  }

  async function resolveShowcaseRaw(hubRow) {
    if (!hubRow || !hubRow.portfolioProjectId) return null;
    return loadPortfolioRecord(hubRow.portfolioProjectId);
  }

  function normalizePortalUrl(url) {
    return String(url || '')
      .trim()
      .replace(/\/+$/, '');
  }

  function ensureAbsolutePortalUrl(url) {
    var u = normalizePortalUrl(url);
    if (!u || u === '#') return '';
    if (/^https?:\/\//i.test(u)) return u;
    if (/^\/\//.test(u)) return 'https:' + u;
    return 'https://' + u;
  }

  function isUsablePortalUrl(url) {
    return !!ensureAbsolutePortalUrl(url);
  }

  function looksLikeDemoUrl(url) {
    return /expo\.app|expo\.dev|web\.app|firebaseapp\.com|vercel\.app|netlify\.app|onrender\.com|\/demo\b/i.test(
      String(url || '')
    );
  }

  function collectProjectVisitLinks(project, detailRecord, options) {
    options = options || {};
    var stage = String((project && project.deliveryStage) || 'demo').toLowerCase();
    var isClientLive = stage === 'client';
    var hubUrl = ensureAbsolutePortalUrl(project && project.expoUrl);
    var liveUrl = '';
    if (window.PortfolioDetailShared && detailRecord) {
      liveUrl = ensureAbsolutePortalUrl(
        window.PortfolioDetailShared.resolveLiveUrl(detailRecord, options)
      );
    }

    var links = [];

    // Client delivery stage: hub URL is live product — never label it "View demo".
    // The hub URL is the Expo *web* build, so it is labelled "Open web app" —
    // the native apps now have their own App Store / Play Store badges, and
    // calling this one "the app" alongside them was ambiguous.
    if (isClientLive) {
      if (liveUrl && hubUrl && normalizePortalUrl(liveUrl) !== normalizePortalUrl(hubUrl)) {
        links.push({ url: liveUrl, label: 'View website', primary: true });
        links.push({ url: hubUrl, label: 'Open web app', primary: false });
        return links;
      }
      var site = liveUrl || hubUrl;
      if (!site) return links;
      links.push({
        url: site,
        label: looksLikeDemoUrl(site) ? 'Open web app' : 'View website',
        primary: true
      });
      return links;
    }

    var demoUrl = hubUrl;
    if (demoUrl && liveUrl && normalizePortalUrl(demoUrl) !== normalizePortalUrl(liveUrl)) {
      links.push({ url: demoUrl, label: 'View demo', primary: true });
      links.push({ url: liveUrl, label: 'View website', primary: false });
      return links;
    }

    var only = demoUrl || liveUrl;
    if (!only) return links;
    links.push({
      url: only,
      label: looksLikeDemoUrl(only) ? 'View demo' : 'View website',
      primary: true
    });
    return links;
  }

  var STORE_BADGES = [
    {
      key: 'appStoreUrl',
      name: 'App Store',
      src: 'https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg',
      cls: 'client-portal-store-badge--apple'
    },
    {
      key: 'playStoreUrl',
      name: 'Google Play',
      src: 'https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png',
      cls: 'client-portal-store-badge--play'
    }
  ];

  /**
   * Both badges always render. An unset one is shown disabled rather than
   * omitted, so a client on one platform can see the other is still to come.
   */
  function renderStoreBadges(project) {
    return (
      '<div class="client-portal-store-badges">' +
      STORE_BADGES.map(function (badge) {
        var url = ensureAbsolutePortalUrl(project && project[badge.key]);
        var img =
          '<img src="' +
          esc(badge.src) +
          '" alt="' +
          esc(url ? 'Get it on ' + badge.name : badge.name + ' — not published yet') +
          '" loading="lazy">';
        if (!url) {
          return (
            '<span class="client-portal-store-badge ' +
            badge.cls +
            ' is-disabled" aria-disabled="true" title="' +
            esc(badge.name + ' link not available yet') +
            '">' +
            img +
            '</span>'
          );
        }
        return (
          '<a class="client-portal-store-badge ' +
          badge.cls +
          '" href="' +
          esc(url) +
          '" target="_blank" rel="noopener noreferrer">' +
          img +
          '</a>'
        );
      }).join('') +
      '</div>'
    );
  }

  function installPageUrl(projectId) {
    if (!projectId) return '';
    // Query form: the site is static GitHub Pages with no rewrite support, so
    // /get/<id> 404s into 404.html. Mirrors the /portal.html?token=… convention.
    var base = String(window.PORTFOLIO_PUBLIC_ORIGIN || location.origin || '').replace(/\/$/, '');
    return base + '/get.html?id=' + encodeURIComponent(projectId);
  }

  /**
   * Lets the client hand the app to their own crew without coming through us.
   * Deliberately NOT their portal link — that carries invoices, contracts and
   * milestones. The /get page shows only the store buttons and the web app.
   */
  function renderTeamShareSection(project) {
    if (!project || project.deliveryStage !== 'client') return '';
    var hasSomething =
      project.appStoreUrl || project.playStoreUrl || project.expoUrl;
    if (!hasSomething) return '';
    var url = installPageUrl(project.id);
    if (!url) return '';
    return (
      '<details class="client-portal-share-footer" open data-install-url="' +
      esc(url) +
      '">' +
      '<summary>Share the app with your team</summary>' +
      '<div class="client-portal-share-body">' +
      '<p class="client-portal-share-lead">Send this link to your crew. It opens a simple page with the download buttons — no billing or project details.</p>' +
      // The URL itself is never shown — it is an opaque id nobody needs to read,
      // and printing it just invites someone to retype it wrong.
      '<div class="client-portal-share-actions">' +
      '<button type="button" class="btn btn-primary" id="portal-install-copy">Copy link</button>' +
      '<button type="button" class="btn btn-secondary" id="portal-install-share" hidden>Share…</button>' +
      '<a class="btn btn-secondary" href="' +
      esc(url) +
      '" target="_blank" rel="noopener noreferrer">Preview</a>' +
      '</div>' +
      '<p class="client-portal-share-status" id="portal-install-status" role="status" aria-live="polite"></p>' +
      '</div></details>'
    );
  }

  function bindTeamShareSection(root) {
    if (!root) return;
    var section = root.querySelector('.client-portal-share-footer');
    if (!section) return;
    var url = section.getAttribute('data-install-url') || '';
    var copyBtn = root.querySelector('#portal-install-copy');
    var shareBtn = root.querySelector('#portal-install-share');
    var status = root.querySelector('#portal-install-status');
    if (!url) return;

    function say(msg) {
      if (status) status.textContent = msg || '';
    }

    /** Clipboard API needs a secure context; fall back to a throwaway field. */
    function legacyCopy() {
      var tmp = document.createElement('textarea');
      tmp.value = url;
      tmp.setAttribute('readonly', '');
      tmp.style.position = 'fixed';
      tmp.style.opacity = '0';
      document.body.appendChild(tmp);
      tmp.select();
      var ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (e) {
        ok = false;
      }
      document.body.removeChild(tmp);
      return ok;
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(url)
            .then(function () {
              say('Link copied — paste it into a text or email.');
            })
            .catch(function () {
              say(legacyCopy() ? 'Link copied.' : 'Copy failed — use Preview and copy from the address bar.');
            });
          return;
        }
        say(legacyCopy() ? 'Link copied.' : 'Copy failed — use Preview and copy from the address bar.');
      });
    }

    // Native share sheet on phones — the fastest route into a group text.
    if (shareBtn && navigator.share) {
      shareBtn.hidden = false;
      shareBtn.addEventListener('click', function () {
        navigator.share({ title: 'Install our app', url: url }).catch(function () {});
      });
    }
  }

  function renderProjectVisitLinks(project, detailRecord, options) {
    var links = collectProjectVisitLinks(project, detailRecord, options);
    var badges = renderStoreBadges(project);
    if (!links.length && !badges) return '';
    return (
      '<div class="client-portal-visit-links">' +
      links
        .map(function (link) {
          return (
            '<a class="btn ' +
            (link.primary ? 'btn-primary' : 'btn-secondary') +
            '" href="' +
            esc(link.url) +
            '" target="_blank" rel="noopener noreferrer">' +
            esc(link.label) +
            '</a>'
          );
        })
        .join('') +
      badges +
      '</div>'
    );
  }

  function renderStatusSummaryStrip(project) {
    var milestones = project.milestones || [];
    var total = milestones.length;
    if (!total) return '';
    var done = milestones.filter(function (m) { return m.done; }).length;
    var pct = Math.round((done / total) * 100);
    var next = milestones.find(function (m) { return !m.done; });
    var isDone = done === total;
    var phaseLabel = isDone ? 'Complete' : done === 0 ? 'Getting started' : 'In progress';

    return (
      '<div class="client-portal-summary">' +
      '<div class="client-portal-summary-top">' +
      '<span class="client-portal-summary-pill' +
      (isDone ? ' client-portal-summary-pill--done' : '') +
      '">' +
      esc(phaseLabel) +
      '</span>' +
      '<span class="client-portal-summary-count">' +
      done +
      ' of ' +
      total +
      ' milestones</span>' +
      '</div>' +
      '<div class="client-portal-summary-bar"><div class="client-portal-summary-bar-fill" style="width:' +
      pct +
      '%"></div></div>' +
      '<p class="client-portal-summary-next">' +
      (next ? 'Next: ' + esc(next.label) : 'All milestones complete') +
      '</p>' +
      '</div>'
    );
  }

  function renderBrandHeader(project, detailRecord, options, hasShowcase) {
    // Whitelist-validated against the shared preset list — never render an
    // arbitrary path that happens to be sitting on the record.
    var logo =
      window.BusinessDocShared && window.BusinessDocShared.normalizeClientLogo
        ? window.BusinessDocShared.normalizeClientLogo(project.clientLogo)
        : '';
    return (
      '<div class="client-portal-brand">' +
      // Logo and name form one lockup so the mark reads as part of the title
      // rather than floating above it.
      '<div class="client-portal-brand-lockup' + (logo ? ' has-logo' : '') + '">' +
      (logo
        ? '<img class="client-portal-brand-logo" src="' +
          esc(logo) +
          '" alt="' +
          esc((project.clientName || 'Client') + ' logo') +
          '">'
        : '') +
      '<div class="client-portal-brand-text">' +
      '<h1>' +
      esc(project.clientName || project.title || 'Your project') +
      '</h1>' +
      '<p class="client-portal-tagline">CodeWithRuben client portal</p>' +
      '</div></div>' +
      renderStatusSummaryStrip(project) +
      renderProjectVisitLinks(project, detailRecord, options) +
      (hasShowcase
        ? '<p class="client-portal-demo-hint"><button type="button" class="client-portal-demo-hint-link" data-cp-scroll-showcase>See full project details &amp; screenshots below ↓</button></p>'
        : '') +
      '</div>'
    );
  }

  function renderStatusFooter(project) {
    var milestones = project.milestones || [];
    if (!milestones.length) return '';
    var done = milestones.filter(function (m) { return m.done; }).length;
    var total = milestones.length;

    return (
      '<details class="client-portal-status-footer" open>' +
      '<summary>Project status</summary>' +
      '<div class="client-portal-status-footer-body">' +
      '<p class="client-portal-status-meta">' +
      done +
      ' of ' +
      total +
      ' milestones complete</p>' +
      milestones
        .map(function (m) {
          return (
            '<div class="client-portal-milestone' +
            (m.done ? ' done' : '') +
            '">' +
            '<span class="client-portal-milestone-icon" aria-hidden="true"></span>' +
            '<span>' +
            esc(m.label) +
            '</span></div>'
          );
        })
        .join('') +
      '</div></details>'
    );
  }

  function formatMoney(amount) {
    var n = Number(amount);
    if (isNaN(n) || n < 0) return '$0';
    return '$' + Math.round(n).toLocaleString();
  }

  function formatMoneyDetailed(amount) {
    if (window.BusinessDocShared && window.BusinessDocShared.formatCurrency) {
      return window.BusinessDocShared.formatCurrency(amount);
    }
    return formatMoney(amount);
  }

  function formatDocDate(iso) {
    if (window.BusinessDocShared && window.BusinessDocShared.formatDateDisplay) {
      return window.BusinessDocShared.formatDateDisplay(iso);
    }
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function docTypeLabel(type) {
    if (window.BusinessDocShared && window.BusinessDocShared.typeLabelFor) {
      return window.BusinessDocShared.typeLabelFor({ type: type });
    }
    var t = String(type || 'proposal');
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function statusLabel(status) {
    var s = String(status || '').toLowerCase();
    if (s === 'sent') return 'Sent';
    if (s === 'accepted') return 'Accepted';
    if (s === 'paid') return 'Paid';
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
  }

  function isInvoiceDoc(doc) {
    return String((doc && doc.type) || '').toLowerCase() === 'invoice';
  }

  function isInvoicePaid(doc) {
    return String((doc && doc.status) || '').toLowerCase() === 'paid';
  }

  function invoiceDisplayNumber(doc) {
    if (window.BusinessDocShared && window.BusinessDocShared.formatInvoiceNumber) {
      return window.BusinessDocShared.formatInvoiceNumber(doc);
    }
    return String((doc && doc.id) || '').slice(0, 12).toUpperCase() || 'INV';
  }

  function paymentMethodById(id) {
    var key = String(id || '').toLowerCase();
    for (var i = 0; i < PORTAL_PAYMENT_METHODS.length; i++) {
      if (PORTAL_PAYMENT_METHODS[i].id === key) return PORTAL_PAYMENT_METHODS[i];
    }
    return null;
  }

  function renderPayHandleRowHtml(label, handle) {
    return (
      '<div class="client-portal-pay-handle-row">' +
      '<span class="client-portal-pay-handle-label">' +
      esc(label) +
      '</span>' +
      '<code class="client-portal-pay-handle" data-portal-pay-handle>' +
      esc(handle) +
      '</code>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-portal-pay-copy>Copy</button>' +
      '</div>'
    );
  }

  function renderInvoicePayDetailHtml(doc, method) {
    var amount = formatMoneyDetailed(doc.total);
    var invNo = invoiceDisplayNumber(doc);
    var linkHtml = method.link
      ? '<a class="client-portal-pay-link" href="' +
        esc(method.link) +
        '" target="_blank" rel="noopener noreferrer">Open ' +
        esc(method.label) +
        '</a>'
      : '';
    var handlesHtml = renderPayHandleRowHtml(method.handleLabel, method.handle);
    if (method.altHandle) {
      handlesHtml += renderPayHandleRowHtml(
        method.altHandleLabel || 'Or',
        method.altHandle
      );
    }
    return (
      '<p class="client-portal-pay-detail-lead">Pay <strong>' +
      esc(amount) +
      '</strong> via ' +
      esc(method.label) +
      '</p>' +
      handlesHtml +
      '<p class="client-portal-pay-memo">Memo / note: <strong>' +
      esc(invNo) +
      '</strong></p>' +
      '<p class="client-portal-pay-hint">' +
      esc(method.hint) +
      '</p>' +
      linkHtml +
      '<p class="client-portal-pay-confirm">After you send, keep your receipt. We’ll mark this invoice paid once payment clears.</p>'
    );
  }

  function renderInvoicePayPanelHtml(doc) {
    var docId = esc(doc.id);
    var methodsHtml = PORTAL_PAYMENT_METHODS.map(function (m) {
      return (
        '<button type="button" class="client-portal-pay-method-btn" data-portal-pay-method="' +
        esc(m.id) +
        '" data-portal-pay-doc="' +
        docId +
        '">' +
        esc(m.label) +
        '</button>'
      );
    }).join('');
    return (
      '<div class="client-portal-sign-panel client-portal-pay-panel" data-portal-pay-panel="' +
      docId +
      '" hidden>' +
      '<p class="client-portal-pay-ask">How would you like to pay?</p>' +
      '<p class="client-portal-pay-ask-sub">Zelle, PayPal, or Venmo — pick one and we’ll show where to send it.</p>' +
      '<div class="client-portal-pay-methods" role="group" aria-label="Payment methods">' +
      methodsHtml +
      '</div>' +
      '<div class="client-portal-pay-detail" data-portal-pay-detail="' +
      docId +
      '" hidden></div>' +
      '</div>'
    );
  }

  async function loadBusinessDocumentsForHub(hubRow, project) {
    if (!rtdbReady()) return [];
    try {
      var snap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATH_BUSINESS_DOCS));
    } catch (err) {
      console.warn('Could not load business documents for portal:', err);
      return [];
    }
    var val = snap.val();
    if (!val || typeof val !== 'object') return [];
    var bid = String(hubRow.businessDocId || project.businessDocId || '').trim();
    var cn = String(hubRow.clientName || project.clientName || '').toLowerCase().trim();
    var seen = {};
    var docs = [];
    Object.keys(val).forEach(function (key) {
      var d = Object.assign({ id: key }, val[key] || {});
      if (!d.id || seen[d.id]) return;
      if (String(d.status || '').toLowerCase() === 'draft') return;
      var match = false;
      if (bid && d.id === bid) match = true;
      else if (cn && String(d.clientName || '').toLowerCase().trim() === cn) match = true;
      if (!match) return;
      seen[d.id] = true;
      docs.push(d);
    });
    docs.sort(function (a, b) {
      return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
    });
    return docs;
  }

  async function loadContractSignatures() {
    if (!rtdbReady()) return {};
    try {
      var snap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATH_CONTRACT_SIGNATURES));
      var val = snap.val();
      return val && typeof val === 'object' ? val : {};
    } catch (err) {
      console.warn('Could not load contract signatures for portal:', err);
      return {};
    }
  }

  function getPortalContractDoc(docId) {
    if (!docId || !window.portalBusinessDocsById) return null;
    return window.portalBusinessDocsById[docId] || null;
  }

  function getPortalContractSignature(docId) {
    if (!docId || !window.portalContractSignaturesById) return undefined;
    return window.portalContractSignaturesById[docId];
  }

  function buildPortalContractHtml(docId) {
    var doc = getPortalContractDoc(docId);
    if (!doc || !window.BusinessDocShared || !window.BusinessDocShared.buildPrintHtml) return '';
    return window.BusinessDocShared.buildPrintHtml(doc, getPortalContractSignature(docId)) || '';
  }

  function mountPortalContractFrame(host, docId) {
    if (!host || !docId) return false;
    var html = buildPortalContractHtml(docId);
    if (!html) return false;

    var shadow;
    try {
      shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
    } catch (err) {
      console.warn('Contract preview shadow root failed', err);
      return false;
    }

    var parsed = null;
    try {
      parsed = new DOMParser().parseFromString(html, 'text/html');
    } catch (err2) {
      console.warn('Contract preview parse failed', err2);
      return false;
    }
    if (!parsed || !parsed.body) return false;

    var headBits = [];
    parsed.querySelectorAll('link[rel="stylesheet"]').forEach(function (node) {
      headBits.push(node.outerHTML);
    });
    parsed.querySelectorAll('style').forEach(function (node) {
      var css = String(node.textContent || '')
        .replace(/\bhtml\b/g, ':host')
        .replace(/\bbody\b/g, '.portal-contract-embed');
      headBits.push('<style>' + css + '</style>');
    });

    shadow.innerHTML =
      headBits.join('') +
      '<style>' +
      ':host { display: block; width: 100%; overflow: visible; }' +
      '.portal-contract-embed { display: block; width: 100%; overflow: visible; box-sizing: border-box; }' +
      '.portal-contract-embed .doc { max-width: 100%; }' +
      // Long emails, handles and grid items would otherwise push the doc wider
      // than the portal card, which bleeds off-screen on phones.
      '.portal-contract-embed .inv-panel, .portal-contract-embed .inv-bill-text,' +
      '.portal-contract-embed .contract-party { min-width: 0; }' +
      '.portal-contract-embed .inv-panel-detail, .portal-contract-embed .inv-kv dd,' +
      '.portal-contract-embed .inv-pay, .portal-contract-embed .contract-party-detail { overflow-wrap: anywhere; }' +
      '@media (max-width: 700px) {' +
      '.portal-contract-embed { padding: 20px 14px; }' +
      '.portal-contract-embed .inv-meta-grid { grid-template-columns: 1fr; }' +
      '.portal-contract-embed .inv-kv { grid-template-columns: auto minmax(0, 1fr); }' +
      '.portal-contract-embed .inv-table { table-layout: fixed; }' +
      '.portal-contract-embed .inv-table th, .portal-contract-embed .inv-table td { padding: 10px 8px; overflow-wrap: anywhere; }' +
      '.portal-contract-embed .inv-totals { display: block; }' +
      '.portal-contract-embed .inv-total-box { min-width: 0; width: 100%; box-sizing: border-box; }' +
      '.portal-contract-embed .inv-total-amt { font-size: 26px; }' +
      '.portal-contract-embed .inv-pay-method { white-space: normal; display: block; }' +
      '.portal-contract-embed .inv-pay-sep { display: none; }' +
      '.portal-contract-embed .contract-parties { grid-template-columns: 1fr; }' +
      '}' +
      '</style>' +
      '<div class="portal-contract-embed">' +
      parsed.body.innerHTML +
      '</div>';

    host.dataset.portalFrameMounted = '1';
    host.removeAttribute('src');
    host.style.height = 'auto';
    host.style.minHeight = '0';
    host.style.overflow = 'visible';
    return true;
  }

  function ensurePortalContractFrame(panel, docId) {
    if (!panel || !docId) return false;
    var host = panel.querySelector('[data-portal-contract-frame="' + docId + '"]');
    if (!host) return false;
    if (host.dataset.portalFrameMounted === '1' && host.shadowRoot && host.shadowRoot.childNodes.length) {
      return true;
    }
    return mountPortalContractFrame(host, docId);
  }

  function renderContractFrameHtml(docId) {
    return (
      '<div class="client-portal-contract-preview">' +
      '<div class="client-portal-contract-frame" title="Contract agreement" data-portal-contract-frame="' +
      esc(docId) +
      '" role="region" aria-label="Contract agreement"></div>' +
      '</div>'
    );
  }

  function renderContractSignPanelHtml(doc) {
    var docId = esc(doc.id);
    return (
      '<div class="client-portal-sign-panel" data-portal-sign-panel="' + docId + '" hidden>' +
      renderContractFrameHtml(doc.id) +
      '<p class="client-portal-sign-intro">Read the full agreement, then sign below.</p>' +
      '<form class="client-portal-sign-form" data-portal-sign-form="' + docId + '">' +
      '<label class="client-portal-sign-label" for="portal-sign-name-' + docId + '">Type your full legal name</label>' +
      '<input type="text" class="client-portal-sign-name" id="portal-sign-name-' + docId + '" autocomplete="name" required>' +
      '<label class="client-portal-sign-check custom-switch-label">' +
      '<input type="checkbox" class="client-portal-sign-agree custom-switch-input" required>' +
      '<span class="custom-switch" aria-hidden="true"></span>' +
      '<span>I have read and agree to the agreement above, and I’m authorized to sign on behalf of ' +
      esc(doc.clientName || 'the client') +
      '.</span></label>' +
      '<div class="client-portal-sign-actions">' +
      '<span class="client-portal-sign-feedback" data-portal-sign-feedback></span>' +
      '<button type="submit" class="btn btn-primary btn-sm">Sign agreement</button>' +
      '</div></form></div>'
    );
  }

  function renderContractSignedPanelHtml(doc) {
    var docId = esc(doc.id);
    return (
      '<div class="client-portal-sign-panel client-portal-signed-panel" data-portal-signed-panel="' +
      docId +
      '" hidden>' +
      renderContractFrameHtml(doc.id) +
      '<div class="client-portal-signed-actions">' +
      '<button type="button" class="btn btn-secondary btn-sm" data-portal-download-doc="' +
      docId +
      '">Download PDF</button>' +
      '</div></div>'
    );
  }

  function renderSignedContractCardHtml(doc, signature) {
    var docId = esc(doc.id);
    var signedName = (signature && signature.signedByName) || '';
    var rawAt = signature && signature.signedAt;
    var signedAtLabel = '';
    if (rawAt != null && rawAt !== '') {
      var formatted = formatDocDate(rawAt);
      signedAtLabel = formatted && formatted !== '—' ? formatted : 'just now';
    } else {
      signedAtLabel = 'just now';
    }
    return (
      '<div class="client-portal-doc-card-main">' +
      '<span class="client-portal-doc-type client-portal-doc-type--contract">CONTRACT</span>' +
      '<strong class="client-portal-doc-title">' +
      esc(doc.clientName || 'Document') +
      '</strong>' +
      '<p class="client-portal-doc-meta">Signed ' +
      esc(signedAtLabel) +
      (signedName ? ' by ' + esc(signedName) : '') +
      '</p></div>' +
      '<button type="button" class="btn btn-secondary btn-sm client-portal-doc-view-btn" data-portal-signed-view="' +
      docId +
      '">View signed contract</button>' +
      renderContractSignedPanelHtml(doc)
    );
  }

  function renderBusinessDocumentsSection(docs, signaturesById) {
    if (!docs.length) return '';
    signaturesById = signaturesById || {};
    return (
      '<details class="client-portal-docs-footer" open>' +
      '<summary>Proposals, billing &amp; contracts</summary>' +
      '<div class="client-portal-docs-footer-body">' +
      '<ul class="client-portal-docs-list">' +
      docs
        .map(function (d) {
          var due = d.dueDate ? formatDocDate(d.dueDate) : '';
          var isContract = String(d.type || '') === 'contract';
          var isInvoice = isInvoiceDoc(d);
          var invoicePaid = isInvoice && isInvoicePaid(d);
          var signature = isContract ? signaturesById[d.id] : null;
          var actionHtml;
          var metaExtra = '';
          var panelHtml = '';
          var titleText = d.clientName || 'Document';
          var metaHtml;

          if (isInvoice) {
            titleText = formatMoneyDetailed(d.total);
            metaHtml =
              (invoicePaid
                ? 'Paid'
                : due
                  ? 'Due ' + esc(due)
                  : 'Due upon receipt') +
              ' · ' +
              esc(invoiceDisplayNumber(d));
          } else {
            metaHtml =
              esc(statusLabel(d.status)) +
              ' · ' +
              esc(formatMoneyDetailed(d.total)) +
              (due ? ' · Due ' + esc(due) : '');
          }

          if (isContract && signature) {
            actionHtml =
              '<button type="button" class="btn btn-secondary btn-sm client-portal-doc-view-btn" data-portal-signed-view="' +
              esc(d.id) +
              '">View signed contract</button>';
            metaExtra =
              ' · Signed ' + esc(formatDocDate(signature.signedAt)) + ' by ' + esc(signature.signedByName || '');
            panelHtml = renderContractSignedPanelHtml(d);
          } else if (isContract) {
            actionHtml =
              '<button type="button" class="btn btn-primary btn-sm client-portal-doc-sign-btn" data-portal-sign-doc="' +
              esc(d.id) +
              '">Review &amp; sign</button>';
            metaExtra = ' · Awaiting your signature';
            panelHtml = renderContractSignPanelHtml(d);
          } else if (isInvoice && invoicePaid) {
            actionHtml =
              '<span class="client-portal-doc-status client-portal-doc-status--paid">Paid</span>' +
              '<button type="button" class="btn btn-secondary btn-sm client-portal-doc-view-btn" data-portal-signed-view="' +
              esc(d.id) +
              '">View invoice</button>';
            panelHtml = renderContractSignedPanelHtml(d);
          } else if (isInvoice) {
            actionHtml =
              '<button type="button" class="btn btn-secondary btn-sm client-portal-doc-view-btn" data-portal-signed-view="' +
              esc(d.id) +
              '">View invoice</button>' +
              '<button type="button" class="btn btn-primary btn-sm client-portal-doc-pay-btn" data-portal-pay-doc="' +
              esc(d.id) +
              '">Pay now →</button>';
            panelHtml = renderContractSignedPanelHtml(d) + renderInvoicePayPanelHtml(d);
          } else {
            actionHtml =
              '<button type="button" class="btn btn-primary btn-sm client-portal-doc-view-btn" data-portal-signed-view="' +
              esc(d.id) +
              '">View document</button>';
            panelHtml = renderContractSignedPanelHtml(d);
          }
          return (
            '<li class="client-portal-doc-card' +
            (isInvoice && !invoicePaid ? ' client-portal-doc-card--payable' : '') +
            '">' +
            '<div class="client-portal-doc-card-main">' +
            '<span class="client-portal-doc-type client-portal-doc-type--' +
            esc(String(d.type || 'proposal')) +
            '">' +
            esc(docTypeLabel(d.type)) +
            '</span>' +
            '<strong class="client-portal-doc-title">' +
            esc(titleText) +
            '</strong>' +
            '<p class="client-portal-doc-meta">' +
            metaHtml +
            metaExtra +
            '</p></div>' +
            '<div class="client-portal-doc-actions">' +
            actionHtml +
            '</div>' +
            panelHtml +
            '</li>'
          );
        })
        .join('') +
      '</ul></div></details>'
    );
  }

  function openPortalBusinessDoc(docId, options) {
    if (!docId || !window.portalBusinessDocsById) return false;
    var doc = window.portalBusinessDocsById[docId];
    if (!doc) return false;
    var signature =
      doc.type === 'contract' && window.portalContractSignaturesById
        ? window.portalContractSignaturesById[docId]
        : undefined;
    if (!window.BusinessDocShared || !window.BusinessDocShared.openPrintWindow) return false;
    var opts = options && typeof options === 'object' ? options : { autoPrint: false };
    return !!window.BusinessDocShared.openPrintWindow(doc, signature, opts);
  }

  function bindPortalSignedViewButtons(root) {
    if (!root) return;
    root.querySelectorAll('[data-portal-signed-view]').forEach(function (btn) {
      if (btn.dataset.portalSignedBound) return;
      btn.dataset.portalSignedBound = '1';
      btn.addEventListener('click', function () {
        var docId = btn.getAttribute('data-portal-signed-view');
        var panel = root.querySelector('[data-portal-signed-panel="' + docId + '"]');
        if (!panel) return;
        var opening = panel.hidden;
        panel.hidden = !opening;
        if (opening) {
          var payPanel = root.querySelector('[data-portal-pay-panel="' + docId + '"]');
          if (payPanel) payPanel.hidden = true;
          if (!ensurePortalContractFrame(panel, docId)) {
            alert('Unable to load this document right now.');
            panel.hidden = true;
          }
        }
      });
    });
    root.querySelectorAll('[data-portal-download-doc]').forEach(function (btn) {
      if (btn.dataset.portalDownloadBound) return;
      btn.dataset.portalDownloadBound = '1';
      btn.addEventListener('click', function () {
        var docId = btn.getAttribute('data-portal-download-doc');
        if (!openPortalBusinessDoc(docId, { autoPrint: true })) {
          alert('Unable to download. Please allow popups for this site.');
        }
      });
    });
  }

  function bindPortalPayButtons(root) {
    if (!root) return;
    root.querySelectorAll('[data-portal-pay-doc].client-portal-doc-pay-btn').forEach(function (btn) {
      if (btn.dataset.portalPayBound) return;
      btn.dataset.portalPayBound = '1';
      btn.addEventListener('click', function () {
        var docId = btn.getAttribute('data-portal-pay-doc');
        var panel = root.querySelector('[data-portal-pay-panel="' + docId + '"]');
        if (!panel) return;
        var opening = panel.hidden;
        panel.hidden = !opening;
        if (opening) {
          var viewPanel = root.querySelector('[data-portal-signed-panel="' + docId + '"]');
          if (viewPanel) viewPanel.hidden = true;
          btn.setAttribute('aria-expanded', 'true');
        } else {
          btn.setAttribute('aria-expanded', 'false');
        }
      });
    });
    root.querySelectorAll('[data-portal-pay-method]').forEach(function (btn) {
      if (btn.dataset.portalPayMethodBound) return;
      btn.dataset.portalPayMethodBound = '1';
      btn.addEventListener('click', function () {
        var docId = btn.getAttribute('data-portal-pay-doc');
        var methodId = btn.getAttribute('data-portal-pay-method');
        var method = paymentMethodById(methodId);
        var doc = getPortalContractDoc(docId);
        var detail = root.querySelector('[data-portal-pay-detail="' + docId + '"]');
        var panel = root.querySelector('[data-portal-pay-panel="' + docId + '"]');
        if (!method || !doc || !detail) return;
        detail.innerHTML = renderInvoicePayDetailHtml(doc, method);
        detail.hidden = false;
        if (panel) {
          panel.querySelectorAll('[data-portal-pay-method]').forEach(function (b) {
            b.classList.toggle('is-selected', b === btn);
          });
        }
        detail.querySelectorAll('[data-portal-pay-copy]').forEach(function (copyBtn) {
          if (copyBtn.dataset.portalPayCopyBound) return;
          copyBtn.dataset.portalPayCopyBound = '1';
          copyBtn.addEventListener('click', function () {
            var row = copyBtn.closest('.client-portal-pay-handle-row');
            var handleEl = row ? row.querySelector('[data-portal-pay-handle]') : null;
            var text = handleEl ? handleEl.textContent : method.handle;
            var done = function () {
              copyBtn.textContent = 'Copied';
              setTimeout(function () {
                copyBtn.textContent = 'Copy';
              }, 1600);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(text).then(done).catch(function () {
                window.prompt('Copy this payment handle:', text);
              });
            } else {
              window.prompt('Copy this payment handle:', text);
            }
          });
        });
      });
    });
  }

  async function submitContractSignature(form, docId, portalCtx) {
    var feedback = form.querySelector('[data-portal-sign-feedback]');
    var nameInput = form.querySelector('.client-portal-sign-name');
    var agreeInput = form.querySelector('.client-portal-sign-agree');
    var submitBtn = form.querySelector('button[type="submit"]');
    var name = nameInput ? nameInput.value.trim() : '';
    if (!name || !agreeInput || !agreeInput.checked) {
      if (feedback) {
        feedback.textContent = 'Enter your full legal name and check the agreement box.';
        feedback.classList.add('is-error');
      }
      return;
    }
    if (!rtdbWriteReady()) {
      if (feedback) {
        feedback.textContent = 'Unable to sign right now. Please try again shortly.';
        feedback.classList.add('is-error');
      }
      return;
    }
    if (submitBtn) submitBtn.disabled = true;
    if (feedback) {
      feedback.textContent = 'Signing…';
      feedback.classList.remove('is-error');
    }
    var payload = {
      docId: docId,
      signedByName: name,
      agreedToTerms: true,
      signedAt: window.rtdbServerTimestamp(),
      userAgent: (navigator && navigator.userAgent) || '',
      portalToken: (portalCtx && portalCtx.token) || ''
    };
    try {
      await window.rtdbSet(window.rtdbRef(window.rtdb, PATH_CONTRACT_SIGNATURES + '/' + docId), payload);
      if (window.portalContractSignaturesById) window.portalContractSignaturesById[docId] = payload;
      var card = form.closest('.client-portal-doc-card');
      var doc = getPortalContractDoc(docId) || { id: docId, clientName: name, type: 'contract' };
      if (card) {
        card.innerHTML = renderSignedContractCardHtml(doc, payload);
        bindPortalSignedViewButtons(card);
        var signedPanel = card.querySelector('[data-portal-signed-panel="' + docId + '"]');
        if (signedPanel) {
          signedPanel.hidden = false;
          ensurePortalContractFrame(signedPanel, docId);
        }
      }
    } catch (err) {
      console.error(err);
      if (submitBtn) submitBtn.disabled = false;
      var denied = err && (err.code === 'PERMISSION_DENIED' || /permission/i.test((err && err.message) || ''));
      if (feedback) {
        feedback.textContent = denied
          ? 'This contract has already been signed.'
          : (err && err.message) || 'Could not sign right now. Please try again.';
        feedback.classList.add('is-error');
      }
      if (denied) {
        var deniedCard = form.closest('.client-portal-doc-card');
        if (deniedCard) {
          var panel = deniedCard.querySelector('[data-portal-sign-panel]');
          if (panel) panel.hidden = true;
        }
      }
    }
  }

  function bindPortalSignButtons(root, portalCtx) {
    if (!root) return;
    root.querySelectorAll('[data-portal-sign-doc]').forEach(function (btn) {
      if (btn.dataset.portalSignBound) return;
      btn.dataset.portalSignBound = '1';
      btn.addEventListener('click', function () {
        var docId = btn.getAttribute('data-portal-sign-doc');
        var panel = root.querySelector('[data-portal-sign-panel="' + docId + '"]');
        if (!panel) return;
        var opening = panel.hidden;
        panel.hidden = !opening;
        if (opening && !ensurePortalContractFrame(panel, docId)) {
          alert('Unable to load the agreement right now.');
          panel.hidden = true;
        }
      });
    });
    root.querySelectorAll('[data-portal-sign-form]').forEach(function (form) {
      if (form.dataset.portalSignFormBound) return;
      form.dataset.portalSignFormBound = '1';
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var docId = form.getAttribute('data-portal-sign-form');
        submitContractSignature(form, docId, portalCtx);
      });
    });
  }

  function collectPortalGuides(hubRow, project) {
    if (project && Array.isArray(project.portalGuides) && project.portalGuides.length) {
      return project.portalGuides;
    }
    return normalizePortalGuides(hubRow || project || {});
  }

  /**
   * Guides live entirely inside a sheet — never in the portal's main content.
   *
   * They used to render as stacked open <details>, so a client with four guides
   * scrolled past four full documents to reach anything else. Now the portal
   * shows one button; the sheet holds a list pane and a reader pane side by
   * side and slides between them, so switching guides is one tap rather than
   * close-and-reopen. Guide bodies are built on selection, so nothing is
   * rendered for guides nobody opens.
   */
  var portalGuideState = { guides: [], base: null, selectedIndex: -1, rendered: {} };

  // portal.html never loads the ionicons bundle, so icon custom elements render
  // as nothing here. These are inline SVG and inherit currentColor.
  function guideIconSvg(path, size) {
    return (
      '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size +
      '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true" focusable="false">' + path + '</svg>'
    );
  }
  var GUIDE_ICON_BOOK =
    '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>' +
    '<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>';
  var GUIDE_ICON_BACK = '<path d="M15 18l-6-6 6-6"/>';
  var GUIDE_ICON_FORWARD = '<path d="M9 18l6-6-6-6"/>';
  var GUIDE_ICON_DOWNLOAD =
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
    '<polyline points="7 10 12 15 17 10"/>' +
    '<line x1="12" y1="15" x2="12" y2="3"/>';
  var GUIDE_ICON_SHARE =
    '<circle cx="18" cy="5" r="3"/>' +
    '<circle cx="6" cy="12" r="3"/>' +
    '<circle cx="18" cy="19" r="3"/>' +
    '<line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>' +
    '<line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>';

  function guideRecordFor(index) {
    var guide = portalGuideState.guides[index];
    if (!guide) return null;
    return Object.assign({}, portalGuideState.base || {}, {
      canvasDocUrl: guide.url,
      canvasDocTitle: guide.title
    });
  }

  function renderGuideSectionsHtml(guides, baseRecord) {
    if (!guides.length || !window.PortfolioDetailShared) return '';
    portalGuideState = { guides: guides, base: baseRecord || {}, selectedIndex: -1, rendered: {} };
    return (
      '<section class="client-portal-guides" id="portal-guides-section">' +
      '<button type="button" class="btn btn-secondary client-portal-guide-launcher" ' +
      'id="portal-guide-launcher" aria-haspopup="dialog" aria-expanded="false">' +
      '<span class="client-portal-guide-launcher-icon" aria-hidden="true">' +
      guideIconSvg(GUIDE_ICON_BOOK, 17) +
      '</span>' +
      '<span class="client-portal-guide-launcher-label">' +
      (guides.length === 1 ? 'View guide' : 'View guides') +
      '</span>' +
      '<span class="client-portal-guide-launcher-count">' +
      guides.length +
      '</span>' +
      '</button>' +
      renderGuideSheetHtml(guides) +
      '</section>'
    );
  }

  function renderGuideSheetHtml(guides) {
    return (
      '<div class="portal-guide-sheet-root" id="portal-guide-sheet-root" aria-hidden="true">' +
      '<div class="portal-guide-sheet-backdrop" id="portal-guide-sheet-backdrop"></div>' +
      '<div class="portal-guide-sheet" role="dialog" aria-modal="true" ' +
      'aria-labelledby="portal-guide-sheet-title">' +
      '<div class="portal-guide-sheet-head">' +
      '<button type="button" class="portal-guide-sheet-back" id="portal-guide-sheet-back" ' +
      'aria-label="Back to guide list" hidden>' +
      guideIconSvg(GUIDE_ICON_BACK, 20) +
      '</button>' +
      '<h2 class="portal-guide-sheet-title" id="portal-guide-sheet-title">' +
      (guides.length === 1 ? 'Your guide' : 'Choose a guide') +
      '</h2>' +
      '<div class="portal-guide-sheet-actions" id="portal-guide-sheet-actions" hidden>' +
      '<button type="button" class="portal-guide-sheet-action" id="portal-guide-download" ' +
      'aria-label="Download guide">' +
      guideIconSvg(GUIDE_ICON_DOWNLOAD, 18) +
      '</button>' +
      '<button type="button" class="portal-guide-sheet-action" id="portal-guide-share" ' +
      'aria-label="Share guide">' +
      guideIconSvg(GUIDE_ICON_SHARE, 18) +
      '</button>' +
      '</div>' +
      '<button type="button" class="portal-guide-sheet-close" id="portal-guide-sheet-close" ' +
      'aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="portal-guide-sheet-panes" id="portal-guide-sheet-panes">' +
      '<div class="portal-guide-sheet-pane portal-guide-sheet-pane--list has-scrollbar">' +
      '<ul class="portal-guide-picker-list">' +
      guides
        .map(function (guide, i) {
          return (
            '<li><button type="button" class="portal-guide-picker-item" data-guide-index="' +
            i +
            '">' +
            '<span class="portal-guide-picker-item-title">' +
            esc(guide.title || 'Project guide') +
            '</span>' +
            '<span class="portal-guide-picker-item-chevron" aria-hidden="true">' +
            guideIconSvg(GUIDE_ICON_FORWARD, 18) +
            '</span>' +
            '</button></li>'
          );
        })
        .join('') +
      '</ul></div>' +
      '<div class="portal-guide-sheet-pane portal-guide-sheet-pane--reader has-scrollbar" ' +
      'id="portal-guide-reader"></div>' +
      '</div></div></div>'
    );
  }

  function guideSheetRoot() {
    return document.getElementById('portal-guide-sheet-root');
  }

  /**
   * The sheet is compact for the list and large for a guide. Height has to be an
   * explicit px value in both states because CSS cannot transition to `auto`,
   * so it is measured here rather than left to the stylesheet.
   */
  function syncGuideSheetSize() {
    var root = guideSheetRoot();
    if (!root) return;
    var sheet = root.querySelector('.portal-guide-sheet');
    if (!sheet) return;
    var mobile = window.innerWidth <= 640;
    var vh = window.innerHeight;

    if (root.classList.contains('is-reading')) {
      sheet.style.height = Math.round(vh * (mobile ? 0.95 : 0.9)) + 'px';
      return;
    }
    var head = sheet.querySelector('.portal-guide-sheet-head');
    var list = sheet.querySelector('.portal-guide-sheet-pane--list');
    // Borders are outside offsetHeight/scrollHeight here, and sub-pixel layout
    // rounds down — without this slack the list overflows by a pixel and the
    // pane grows a scrollbar for a list that actually fits.
    var borders = sheet.offsetHeight - sheet.clientHeight;
    var wanted =
      (head ? head.offsetHeight : 0) +
      (list ? list.scrollHeight : 0) +
      (borders > 0 ? borders : 2) +
      1;
    var cap = Math.round(vh * (mobile ? 0.8 : 0.7));
    sheet.style.height = Math.max(120, Math.ceil(Math.min(wanted, cap))) + 'px';
  }

  function openGuideSheet() {
    var root = guideSheetRoot();
    var launcher = document.getElementById('portal-guide-launcher');
    if (!root) return;
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('portal-guide-sheet-open');
    if (launcher) launcher.setAttribute('aria-expanded', 'true');

    // Resume where they left off; the back arrow is always there to reach the list.
    if (portalGuideState.selectedIndex >= 0) {
      showGuideReader(portalGuideState.selectedIndex, false);
    } else {
      showGuideList(false);
    }
  }

  function closeGuideSheet(returnFocus) {
    var root = guideSheetRoot();
    var launcher = document.getElementById('portal-guide-launcher');
    if (!root) return;
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('portal-guide-sheet-open');
    if (launcher) {
      launcher.setAttribute('aria-expanded', 'false');
      if (returnFocus && typeof launcher.focus === 'function') launcher.focus();
    }
  }

  function showGuideList(focus) {
    var root = guideSheetRoot();
    if (!root) return;
    root.classList.remove('is-reading');
    var titleEl = document.getElementById('portal-guide-sheet-title');
    var backBtn = document.getElementById('portal-guide-sheet-back');
    if (titleEl) {
      titleEl.textContent = portalGuideState.guides.length === 1 ? 'Your guide' : 'Choose a guide';
    }
    if (backBtn) backBtn.hidden = true;
    setGuideSheetActionsVisible(false);
    syncGuideSheetSize();
    if (focus) {
      var first = root.querySelector('.portal-guide-picker-item');
      if (first && typeof first.focus === 'function') first.focus();
    }
  }

  function showGuideReader(index, focus) {
    var root = guideSheetRoot();
    var reader = document.getElementById('portal-guide-reader');
    var record = guideRecordFor(index);
    if (!root || !reader || !record || !window.PortfolioDetailShared) return;

    portalGuideState.selectedIndex = index;

    // Build each guide once, then keep it — re-rendering would drop scroll
    // position and re-run init on every switch.
    if (!portalGuideState.rendered[index]) {
      reader.innerHTML = window.PortfolioDetailShared.renderPortfolioDetailHtml(record, {
        hideBuyButtons: true,
        hideQuoteButton: true,
        showLiveButton: false,
        guideOnly: true
      });
      // The guide body needs the same init the inline path used to get, or its
      // interactive pieces stay dead.
      window.PortfolioDetailShared.initPortfolioDetailPage(reader, record, { guideOnly: true });
      portalGuideState.rendered = {};
      portalGuideState.rendered[index] = true;
    }

    var titleEl = document.getElementById('portal-guide-sheet-title');
    var backBtn = document.getElementById('portal-guide-sheet-back');
    if (titleEl) titleEl.textContent = portalGuideState.guides[index].title || 'Project guide';
    if (backBtn) backBtn.hidden = false;
    setGuideSheetActionsVisible(true);
    root.classList.add('is-reading');
    syncGuideSheetSize();
    reader.scrollTop = 0;
    if (focus && typeof reader.focus === 'function') reader.focus();
  }

  function setGuideSheetActionsVisible(visible) {
    var actions = document.getElementById('portal-guide-sheet-actions');
    if (actions) actions.hidden = !visible;
  }

  function currentGuideFileHref() {
    var guide = portalGuideState.guides[portalGuideState.selectedIndex];
    if (!guide || !guide.url || !window.PortfolioDetailShared) return '';
    var src = window.PortfolioDetailShared.displayCanvasDocSrc(guide.url);
    if (!src) return '';
    try {
      return new URL(src, window.location.href).href;
    } catch (e) {
      return src;
    }
  }

  function currentGuideFilename() {
    var guide = portalGuideState.guides[portalGuideState.selectedIndex];
    var url = String((guide && guide.url) || '').split('?')[0];
    var name = url.split('/').pop();
    return name || 'guide.md';
  }

  function downloadCurrentGuide() {
    var href = currentGuideFileHref();
    if (!href) return;
    var filename = currentGuideFilename();
    fetch(href)
      .then(function (res) {
        if (!res.ok) throw new Error('download failed');
        return res.blob();
      })
      .then(function (blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () {
          URL.revokeObjectURL(a.href);
        }, 1000);
      })
      .catch(function () {
        window.open(href, '_blank', 'noopener,noreferrer');
      });
  }

  function shareCurrentGuide() {
    var href = currentGuideFileHref();
    var guide = portalGuideState.guides[portalGuideState.selectedIndex];
    if (!href) return;
    var title = (guide && guide.title) || 'Project guide';
    var shareBtn = document.getElementById('portal-guide-share');

    function copied() {
      if (!shareBtn) return;
      var prev = shareBtn.getAttribute('aria-label');
      shareBtn.setAttribute('aria-label', 'Link copied');
      setTimeout(function () {
        shareBtn.setAttribute('aria-label', prev || 'Share guide');
      }, 1600);
    }

    function copyLink() {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(href).then(copied).catch(function () {
          window.prompt('Copy this guide link', href);
        });
      } else {
        window.prompt('Copy this guide link', href);
      }
    }

    if (navigator.share) {
      navigator
        .share({ title: title, text: title, url: href })
        .catch(function (err) {
          if (err && err.name === 'AbortError') return;
          copyLink();
        });
      return;
    }
    copyLink();
  }

  function bindGuideSheet(root) {
    if (!root) return;
    var launcher = root.querySelector('#portal-guide-launcher');
    if (!launcher) return;

    launcher.addEventListener('click', openGuideSheet);

    var closeBtn = root.querySelector('#portal-guide-sheet-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        closeGuideSheet(true);
      });
    }
    var backdrop = root.querySelector('#portal-guide-sheet-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', function () {
        closeGuideSheet(true);
      });
    }
    var backBtn = root.querySelector('#portal-guide-sheet-back');
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        showGuideList(true);
      });
    }
    root.querySelectorAll('.portal-guide-picker-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showGuideReader(Number(btn.getAttribute('data-guide-index')), true);
      });
    });

    var downloadBtn = root.querySelector('#portal-guide-download');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', function () {
        downloadCurrentGuide();
      });
    }
    var shareBtn = root.querySelector('#portal-guide-share');
    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        shareCurrentGuide();
      });
    }

    window.addEventListener('resize', function () {
      var sheetRoot = guideSheetRoot();
      if (sheetRoot && sheetRoot.classList.contains('is-open')) syncGuideSheetSize();
    });

    document.addEventListener('keydown', function portalGuideEsc(e) {
      if (e.key !== 'Escape' && e.keyCode !== 27) return;
      var sheetRoot = guideSheetRoot();
      if (!sheetRoot || !sheetRoot.classList.contains('is-open')) return;
      // Escape steps back to the list first, then closes — matches the back arrow.
      if (sheetRoot.classList.contains('is-reading')) showGuideList(true);
      else closeGuideSheet(true);
    });
  }

  function wrapShowcaseSection(innerHtml) {
    if (!innerHtml) return '';
    return (
      '<details class="client-portal-showcase">' +
      '<summary>Project showcase</summary>' +
      '<div class="client-portal-showcase-body">' +
      innerHtml +
      '</div></details>'
    );
  }

  function bindShowcaseCollapse(root) {
    if (!root) return;
    var details = root.querySelector('details.client-portal-showcase');
    if (!details || details.dataset.showcaseCollapseBound === '1') return;
    details.dataset.showcaseCollapseBound = '1';
    details.addEventListener('toggle', function () {
      if (details.open) return;
      details.querySelectorAll('video').forEach(function (video) {
        try {
          video.pause();
        } catch (err) {}
      });
    });
  }

  function bindDemoHintScroll(root) {
    if (!root) return;
    var hint = root.querySelector('[data-cp-scroll-showcase]');
    var details = root.querySelector('details.client-portal-showcase');
    if (!hint || !details) return;
    hint.addEventListener('click', function () {
      details.open = true;
      details.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function renderProjectPage(inner, project, detailRecord, detailOptions, businessDocs, maint, portalCtx, hasShowcase, contractSignatures, portalGuides) {
    businessDocs = businessDocs || [];
    portalCtx = portalCtx || {};
    contractSignatures = contractSignatures || {};
    detailOptions = detailOptions || {};
    portalGuides = Array.isArray(portalGuides) ? portalGuides : [];
    window.portalBusinessDocsById = {};
    businessDocs.forEach(function (d) {
      if (d && d.id) window.portalBusinessDocsById[d.id] = d;
    });
    window.portalContractSignaturesById = contractSignatures;
    var showcaseWillRender = !!(hasShowcase && detailRecord && window.PortfolioDetailShared);
    var brand = renderBrandHeader(project, detailRecord, detailOptions, showcaseWillRender);

    var guideBase = detailRecord || {
      title: (project && (project.title || project.clientName)) || 'Your project',
      description: ''
    };

    var showcaseOptions = Object.assign({}, detailOptions, {
      omitCanvasDoc: true,
      guideOnly: false
    });
    var showcaseHtml = '';
    if (hasShowcase && detailRecord && window.PortfolioDetailShared) {
      showcaseHtml = window.PortfolioDetailShared.renderPortfolioDetailHtml(detailRecord, showcaseOptions);
      showcaseHtml = wrapShowcaseSection(showcaseHtml);
    }

    var guideHtml = renderGuideSectionsHtml(portalGuides, guideBase);

    var docsSection = renderBusinessDocumentsSection(businessDocs, contractSignatures);
    var supportSection =
      project.showMaintenanceInPortal !== false
        ? renderMaintenanceSupportSection(maint, project)
        : '';
    var footer = renderStatusFooter(project);
    inner.innerHTML =
      brand +
      showcaseHtml +
      guideHtml +
      '<div class="client-portal-grid">' +
      renderTeamShareSection(project) +
      docsSection +
      supportSection +
      footer +
      '</div>';
    if (detailRecord && window.PortfolioDetailShared) {
      window.PortfolioDetailShared.initPortfolioDetailPage(inner, detailRecord, detailOptions);
    }
    // Guides are no longer in the DOM at first paint — selectGuide() runs
    // initPortfolioDetailPage on the chosen guide when it mounts.
    bindTeamShareSection(inner);
    bindGuideSheet(inner);
    bindShowcaseCollapse(inner);
    bindDemoHintScroll(inner);
    bindPortalSignButtons(inner, portalCtx);
    bindPortalSignedViewButtons(inner);
    bindPortalPayButtons(inner);
    bindMaintenanceSupportSection(inner, portalCtx, project, maint);
    mountPortalDmChrome(project, portalCtx);
  }

  function renderError(inner, message) {
    inner.innerHTML = '<p class="client-portal-error">' + esc(message) + '</p>';
  }

  function initFirebase() {
    var cfg = window.FIREBASE_CONFIG;
    if (!cfg || typeof window.initializeApp !== 'function' || typeof window.getDatabase !== 'function') {
      return false;
    }
    try {
      var app = window.initializeApp(cfg);
      window.rtdb = window.getDatabase(app);
      return !!window.rtdb;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async function loadClientPortal(token) {
    var inner = document.getElementById('client-portal-inner');
    if (!inner) return;

    if (!token) {
      renderError(inner, 'This client link is invalid or expired.');
      return;
    }

    if (!window.PortfolioDetailShared) {
      renderError(inner, 'Unable to load project showcase. Please try again later.');
      return;
    }

    if (!initFirebase() || !rtdbReady()) {
      renderError(inner, 'Unable to load project data. Please try again later.');
      return;
    }

    try {
      var linkSnap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATH_PORTALS + '/' + token));
      var link = linkSnap.val();
      if (!link || !link.projectId || (link.expiresAt && link.expiresAt < Date.now())) {
        renderError(inner, 'This client link is invalid or expired.');
        return;
      }

      var projSnap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATH_PROJECTS + '/' + link.projectId));
      var hubRow = projSnap.val() || {};
      var project = normalizeProject(link.projectId, hubRow);
      var showcaseRaw = await resolveShowcaseRaw(hubRow);
      var hasShowcase = !!showcaseRaw;
      var detailRecord = showcaseRaw
        ? window.PortfolioDetailShared.normalizePortfolioDetailRecord(showcaseRaw, showcaseRaw.id)
        : null;
      var portalGuides = collectPortalGuides(hubRow, project);
      var guideOnly = !hasShowcase && portalGuides.length > 0;
      var detailOptions = {
        hideBuyButtons: true,
        hideQuoteButton: true,
        showLiveButton: false,
        guideOnly: !!guideOnly,
        liveUrlFallback: project.expoUrl,
        adminSectionLabel: 'Admin dashboard'
      };

      var businessDocs = [];
      var allMaint = [];
      var contractSignatures = {};
      try {
        businessDocs = await loadBusinessDocumentsForHub(hubRow, project);
      } catch (err) {
        console.warn('Business documents skipped:', err);
      }
      try {
        contractSignatures = await loadContractSignatures();
      } catch (err) {
        console.warn('Contract signatures skipped:', err);
      }
      try {
        allMaint = await loadAllMaintenanceRecords();
      } catch (err) {
        console.warn('Maintenance records skipped:', err);
      }
      var maint = findMaintenanceForHub(hubRow, link.projectId, allMaint);
      var portalCtx = {
        projectId: link.projectId,
        clientName: project.clientName || hubRow.clientName || '',
        maintId: maint ? maint.id : '',
        token: token
      };
      renderProjectPage(
        inner,
        project,
        detailRecord,
        detailOptions,
        businessDocs,
        maint,
        portalCtx,
        hasShowcase,
        contractSignatures,
        portalGuides
      );
      document.title = (project.clientName || project.title || 'Your project') + ' — CodeWithRuben';
    } catch (err) {
      console.error(err);
      renderError(inner, 'Unable to load project data. Please try again later.');
    }
  }

  function boot() {
    loadClientPortal(getPortalToken());
  }

  function waitForSdk() {
    var attempts = 0;
    (function tick() {
      if (
        window.FIREBASE_CONFIG &&
        window.initializeApp &&
        window.getDatabase &&
        window.rtdbRef &&
        window.rtdbGet &&
        window.PortfolioDetailShared
      ) {
        boot();
        return;
      }
      if (++attempts > 120) {
        var inner = document.getElementById('client-portal-inner');
        if (inner) renderError(inner, 'Unable to load project data. Please try again later.');
        return;
      }
      setTimeout(tick, 50);
    })();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForSdk);
  } else {
    waitForSdk();
  }
})();
