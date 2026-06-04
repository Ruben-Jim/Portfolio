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
      annualNote: 'Save 45% vs monthly',
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
      annualNote: 'Save 45% vs monthly',
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
    var snap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATH_MAINTENANCE));
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
          '<p class="client-portal-plan-price">' +
          esc(plan.monthly) +
          ' · ' +
          esc(plan.annual) +
          '</p>' +
          '<p class="client-portal-plan-note">' +
          esc(plan.annualNote) +
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

  function renderPortalDmBlock(project) {
    if (!window.CustomerDmShared || !window.CustomerDmShared.isCustomerDmPortalEnabled()) {
      return '';
    }
    if (!rtdbWriteReady() || !window.rtdbOnValue) {
      return (
        '<div class="client-portal-dm-block">' +
        '<h3 class="client-portal-support-subhead">Messages</h3>' +
        '<p class="client-portal-dm-unavailable">Messaging is temporarily unavailable. Please use the contact form on our website.</p></div>'
      );
    }
    var prefillName = esc(project.clientName || project.title || '');
    return (
      '<div class="client-portal-dm-block" id="portal-dm-root">' +
      '<h3 class="client-portal-support-subhead">Messages</h3>' +
      '<p class="client-portal-dm-lead">Report an issue or ask about maintenance. Uses the same thread as our Messages page when you sign in with the same email.</p>' +
      '<div id="portal-dm-auth">' +
      '<form id="portal-dm-open-form" class="client-portal-dm-form">' +
      '<input type="text" id="portal-dm-name" class="client-portal-input" placeholder="Your name" required value="' +
      prefillName +
      '">' +
      '<input type="email" id="portal-dm-email" class="client-portal-input" placeholder="Your email" required>' +
      '<p id="portal-dm-status" class="client-portal-dm-status" role="status"></p>' +
      '<button type="submit" class="btn btn-primary">Open conversation</button></form></div>' +
      '<div id="portal-dm-thread" class="client-portal-dm-thread" hidden>' +
      '<div id="portal-dm-status-badges" class="client-portal-dm-badges" role="status"></div>' +
      '<div id="portal-dm-message-list" class="client-portal-dm-messages has-scrollbar" aria-live="polite"></div>' +
      '<form id="portal-dm-composer" class="client-portal-dm-composer">' +
      '<textarea id="portal-dm-message" class="client-portal-input" rows="2" placeholder="Describe the issue or question…" required></textarea>' +
      '<button type="submit" class="btn btn-primary">Send</button></form>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="portal-dm-switch-email">Use different email</button></div></div>'
    );
  }

  function renderMaintenanceSupportSection(maint, project) {
    return (
      '<details class="client-portal-support-footer" open>' +
      '<summary>Maintenance &amp; support</summary>' +
      '<div class="client-portal-support-body">' +
      renderMaintenanceBlock(maint, project) +
      renderPortalDmBlock(project) +
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

  function showPortalDmThread(show) {
    var auth = document.getElementById('portal-dm-auth');
    var thread = document.getElementById('portal-dm-thread');
    if (auth) auth.hidden = !!show;
    if (thread) thread.hidden = !show;
  }

  function bindPortalDm(ctx) {
    if (!window.CustomerDmShared || !window.CustomerDmShared.isCustomerDmPortalEnabled()) return;

    var openForm = document.getElementById('portal-dm-open-form');
    var statusEl = document.getElementById('portal-dm-status');
    var composer = document.getElementById('portal-dm-composer');
    var msgInput = document.getElementById('portal-dm-message');
    var switchBtn = document.getElementById('portal-dm-switch-email');
    var listEl = document.getElementById('portal-dm-message-list');
    var badgesEl = document.getElementById('portal-dm-status-badges');
    var DM = window.CustomerDmShared;

    function setDmStatus(msg, isError) {
      if (!statusEl) return;
      statusEl.textContent = msg || '';
      statusEl.classList.toggle('is-error', !!isError);
    }

    function openDmSession(session) {
      DM.writeCustomerSession(session);
      window.portalDmSession = session;
      showPortalDmThread(true);
      stopPortalDmSubscription();
      portalDmSubscription = DM.subscribeCustomerThread(session, {
        onMessages: function (messages) {
          DM.renderMessagesToElement(listEl, messages, { showReadState: true });
        },
        onMeta: function (meta) {
          if (badgesEl) badgesEl.innerHTML = DM.renderStatusBadgesHtml(meta);
        }
      });
    }

    var saved = DM.readCustomerSession();
    if (saved) {
      openDmSession(saved);
    }

    if (openForm) {
      openForm.addEventListener('submit', function (e) {
        e.preventDefault();
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
          agencyProjectId: ctx.projectId || ''
        })
          .then(function (conv) {
            openDmSession({
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
          return;
        }
        var text = msgInput.value.trim();
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
        clearTimeout(bindPortalDm._typingTimer);
        bindPortalDm._typingTimer = setTimeout(function () {
          DM.setCustomerTyping(session.conversationId, false).catch(function () {});
        }, 1200);
      });
    }

    if (switchBtn) {
      switchBtn.addEventListener('click', function () {
        stopPortalDmSubscription();
        DM.clearCustomerSession();
        window.portalDmSession = null;
        showPortalDmThread(false);
        setDmStatus('', false);
      });
    }
  }

  function bindMaintenanceSupportSection(root, ctx, project, maint) {
    if (!root) return;
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
    bindPortalDm(ctx);
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
    var snap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATH_BUSINESS_DOCS));
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
    var supportSection = renderMaintenanceSupportSection(maint, project);
    var footer = renderStatusFooter(project, detailRecord, detailOptions);
    inner.innerHTML = brand + detailHtml + docsSection + supportSection + footer;
    if (detailRecord && window.PortfolioDetailShared) {
      window.PortfolioDetailShared.initPortfolioDetailPage(inner, detailRecord, detailOptions);
    }
    bindPortalDocViewButtons(inner);
    bindMaintenanceSupportSection(inner, portalCtx, project, maint);
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
      var detailRecord = showcaseRaw
        ? window.PortfolioDetailShared.normalizePortfolioDetailRecord(showcaseRaw, showcaseRaw.id)
        : null;
      var detailOptions = {
        hideBuyButtons: true,
        hideQuoteButton: true,
        showLiveButton: true,
        liveUrlFallback: project.expoUrl,
        adminSectionLabel: 'Admin dashboard'
      };

      var businessDocs = await loadBusinessDocumentsForHub(hubRow, project);
      var allMaint = await loadAllMaintenanceRecords();
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
