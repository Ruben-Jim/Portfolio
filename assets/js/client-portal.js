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
  var PATH_MAINTENANCE = 'agencyMaintenance';

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

  var portalDmSubscription = null;

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

  function normalizeMaintenanceRecord(id, row) {
    row = row || {};
    var m = {
      id: id,
      clientName: String(row.clientName || '').slice(0, 120),
      projectId: String(row.projectId || ''),
      planTier: String(row.planTier || 'standard').slice(0, 40),
      planStatus: String(row.planStatus || '').toLowerCase().slice(0, 20),
      billingPreference: String(row.billingPreference || 'monthly').slice(0, 20),
      planRequestedAt: row.planRequestedAt || null,
      hoursIncluded: Number(row.hoursIncluded) || 4,
      hoursUsed: Number(row.hoursUsed) || 0,
      renewalDate: String(row.renewalDate || ''),
      slaHours: Number(row.slaHours) || 48
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
        return (
          '<label class="client-portal-plan-card">' +
          '<input type="radio" name="portal-plan-tier" value="' +
          esc(plan.id) +
          '"' +
          checked +
          '>' +
          '<span class="client-portal-plan-badge">' +
          esc(plan.badge) +
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
        '<p class="client-portal-maint-meta">Response target: within ' +
        esc(String(maint.slaHours)) +
        ' business hours. Major features and scope changes are quoted separately.</p></div>'
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
      '<p class="client-portal-maint-lead">After your first included year, ongoing support keeps hosting, updates, and minor fixes on track.</p>' +
      renderMaintenancePlanCards('standard') +
      '<fieldset class="client-portal-billing-pref">' +
      '<legend>Billing preference</legend>' +
      '<label><input type="radio" name="portal-billing-pref" value="monthly" checked> Monthly</label>' +
      '<label><input type="radio" name="portal-billing-pref" value="annual"> Annual (save 45%)</label>' +
      '</fieldset>' +
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
    var payload = {
      clientName: ctx.clientName || '',
      projectId: ctx.projectId || '',
      planTier: tier,
      billingPreference: billingPref,
      planStatus: 'pending',
      planRequestedAt: window.rtdbServerTimestamp(),
      hoursIncluded: 4,
      hoursUsed: 0,
      renewalDate: '',
      slaHours: tier === 'priority' ? 24 : 72,
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

  function mountPortalDmChrome(project, ctx) {
    if (!isPortalDmAvailable()) return;
    var existingFab = document.getElementById('portal-dm-fab');
    if (existingFab) existingFab.remove();
    var existingRoot = document.getElementById('portal-dm-sheet-root');
    if (existingRoot) existingRoot.remove();
    stopPortalDmSubscription();

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
          tags: ['portal', 'client-portal'],
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

  function normalizeProject(id, row) {
    row = row || {};
    var milestones = Array.isArray(row.milestones) ? row.milestones : [];
    return {
      id: id,
      clientName: String(row.clientName || '').slice(0, 120),
      title: String(row.title || '').slice(0, 200),
      expoUrl: String(row.expoUrl || '').slice(0, 500),
      portfolioProjectId: String(row.portfolioProjectId || '').slice(0, 80),
      businessDocId: String(row.businessDocId || '').slice(0, 80),
      portalCanvasDocUrl: String(row.portalCanvasDocUrl || '').slice(0, 500),
      portalCanvasDocTitle: String(row.portalCanvasDocTitle || 'Project guide').slice(0, 120),
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

  function findPortfolioMatchId(hubRow, allPortfolioVal) {
    if (!allPortfolioVal || typeof allPortfolioVal !== 'object') return '';
    var title = String(hubRow.title || hubRow.clientName || '').toLowerCase().trim();
    if (!title) return '';
    var keys = Object.keys(allPortfolioVal);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var pt = String(allPortfolioVal[key].title || '').toLowerCase();
      if (pt.indexOf(title) >= 0 || title.indexOf(pt) >= 0) return key;
    }
    return '';
  }

  async function resolveShowcaseRaw(hubRow) {
    if (hubRow.portfolioProjectId) {
      var linked = await loadPortfolioRecord(hubRow.portfolioProjectId);
      if (linked) return linked;
    }
    var allSnap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATH_PORTFOLIO));
    var allVal = allSnap.val();
    if (!allVal) return null;
    var matchedId = findPortfolioMatchId(hubRow, allVal);
    if (!matchedId) return null;
    return loadPortfolioRecord(matchedId);
  }

  function renderBrandHeader(project) {
    return (
      '<div class="client-portal-brand">' +
      '<h1>' +
      esc(project.clientName || project.title || 'Your project') +
      '</h1>' +
      '<p class="client-portal-tagline">CodeWithRuben client portal</p></div>'
    );
  }

  function renderStatusFooter(project, detailRecord, options) {
    options = options || {};
    var done = project.milestones.filter(function (m) { return m.done; }).length;
    var total = project.milestones.length || 0;
    var liveUrl =
      window.PortfolioDetailShared && detailRecord
        ? window.PortfolioDetailShared.resolveLiveUrl(detailRecord, options)
        : '';
    var expoUrl = String(project.expoUrl || '').trim();
    var showPreview =
      expoUrl &&
      expoUrl !== '#' &&
      (!liveUrl || expoUrl.replace(/\/+$/, '') !== liveUrl.replace(/\/+$/, ''));

    return (
      '<details class="client-portal-status-footer">' +
      '<summary>Project status</summary>' +
      '<div class="client-portal-status-footer-body">' +
      '<p class="client-portal-status-meta">' +
      done +
      ' of ' +
      total +
      ' milestones complete</p>' +
      project.milestones
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
      (showPreview
        ? '<p class="client-portal-status-preview"><a class="btn btn-primary" href="' +
          esc(expoUrl) +
          '" target="_blank" rel="noopener">Open preview</a></p>'
        : '') +
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

  function renderBusinessDocumentsSection(docs) {
    if (!docs.length) return '';
    return (
      '<details class="client-portal-docs-footer">' +
      '<summary>Proposals &amp; billing (' +
      docs.length +
      ')</summary>' +
      '<div class="client-portal-docs-footer-body has-scrollbar">' +
      '<ul class="client-portal-docs-list">' +
      docs
        .map(function (d) {
          var due = d.dueDate ? formatDocDate(d.dueDate) : '';
          return (
            '<li class="client-portal-doc-card">' +
            '<div class="client-portal-doc-card-main">' +
            '<span class="client-portal-doc-type client-portal-doc-type--' +
            esc(String(d.type || 'proposal')) +
            '">' +
            esc(docTypeLabel(d.type)) +
            '</span>' +
            '<strong class="client-portal-doc-title">' +
            esc(d.clientName || 'Document') +
            '</strong>' +
            '<p class="client-portal-doc-meta">' +
            esc(statusLabel(d.status)) +
            ' · ' +
            esc(formatMoneyDetailed(d.total)) +
            (due ? ' · Due ' + esc(due) : '') +
            '</p></div>' +
            '<button type="button" class="btn btn-primary btn-sm client-portal-doc-view-btn" data-portal-view-doc="' +
            esc(d.id) +
            '">View document</button></li>'
          );
        })
        .join('') +
      '</ul></div></details>'
    );
  }

  function bindPortalDocViewButtons(root) {
    if (!root) return;
    root.querySelectorAll('[data-portal-view-doc]').forEach(function (btn) {
      if (btn.dataset.portalDocBound) return;
      btn.dataset.portalDocBound = '1';
      btn.addEventListener('click', function () {
        var docId = btn.getAttribute('data-portal-view-doc');
        if (!docId || !window.portalBusinessDocsById) return;
        var doc = window.portalBusinessDocsById[docId];
        if (!doc) return;
        if (window.BusinessDocShared && window.BusinessDocShared.openPrintWindow) {
          if (!window.BusinessDocShared.openPrintWindow(doc)) {
            alert('Unable to open document. Please allow popups for this site.');
          }
        }
      });
    });
  }

  function applyHubPortalCanvas(detailRecord, hubRow, project) {
    if (!hubRow || !hubRow.portalCanvasDocUrl || !window.PortfolioDetailShared) {
      return detailRecord;
    }
    var url = window.PortfolioDetailShared.normalizeCanvasDocUrl(hubRow.portalCanvasDocUrl);
    if (!url) return detailRecord;
    var base = detailRecord || {
      title: (project && (project.title || project.clientName)) || 'Your project',
      description: ''
    };
    return Object.assign({}, base, {
      canvasDocUrl: url,
      canvasDocTitle: String(hubRow.portalCanvasDocTitle || base.canvasDocTitle || 'Project guide').slice(
        0,
        120
      )
    });
  }

  function renderNoShowcaseMessage() {
    return (
      '<section class="client-portal-section client-portal-empty-showcase">' +
      '<h2>Project showcase</h2>' +
      '<p>No client showcase is linked to this project yet. Your project contact will share the full detail page once it is ready.</p>' +
      '</section>'
    );
  }

  function renderProjectPage(inner, project, detailRecord, detailOptions, businessDocs, maint, portalCtx) {
    businessDocs = businessDocs || [];
    portalCtx = portalCtx || {};
    window.portalBusinessDocsById = {};
    businessDocs.forEach(function (d) {
      if (d && d.id) window.portalBusinessDocsById[d.id] = d;
    });
    var brand = renderBrandHeader(project);
    var detailHtml = '';
    if (detailRecord && window.PortfolioDetailShared) {
      detailHtml = window.PortfolioDetailShared.renderPortfolioDetailHtml(detailRecord, detailOptions);
    } else {
      detailHtml = renderNoShowcaseMessage();
    }
    var docsSection = renderBusinessDocumentsSection(businessDocs);
    var supportSection =
      project.showMaintenanceInPortal !== false
        ? renderMaintenanceSupportSection(maint, project)
        : '';
    var footer = renderStatusFooter(project, detailRecord, detailOptions);
    inner.innerHTML = brand + detailHtml + docsSection + supportSection + footer;
    if (detailRecord && window.PortfolioDetailShared) {
      window.PortfolioDetailShared.initPortfolioDetailPage(inner, detailRecord, detailOptions);
    }
    bindPortalDocViewButtons(inner);
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
      detailRecord = applyHubPortalCanvas(detailRecord, hubRow, project);
      var guideOnly =
        !hasShowcase &&
        detailRecord &&
        window.PortfolioDetailShared.normalizeCanvasDocUrl(detailRecord.canvasDocUrl);
      var detailOptions = {
        hideBuyButtons: true,
        hideQuoteButton: true,
        showLiveButton: !guideOnly,
        guideOnly: !!guideOnly,
        liveUrlFallback: project.expoUrl,
        adminSectionLabel: 'Admin dashboard'
      };

      var businessDocs = [];
      var allMaint = [];
      try {
        businessDocs = await loadBusinessDocumentsForHub(hubRow, project);
      } catch (err) {
        console.warn('Business documents skipped:', err);
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
        maintId: maint ? maint.id : ''
      };
      renderProjectPage(inner, project, detailRecord, detailOptions, businessDocs, maint, portalCtx);
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
