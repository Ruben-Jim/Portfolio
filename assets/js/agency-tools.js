/**
 * CodeWithRuben Agency Tools — Template Matcher, Project Hub, Case Studies,
 * Client Portal, Maintenance, Content Repurposing, Referrals, Firebase Health.
 */
(function () {
  'use strict';

  var PATHS = {
    projects: 'agencyProjects',
    matcher: 'agencyMatcherSubmissions',
    maintenance: 'agencyMaintenance',
    referrals: 'agencyReferrals',
    clientPortals: 'agencyClientPortals',
    firebaseHealth: 'agencyFirebaseHealth'
  };

  var MICRO_SAAS_MODULES = [
    {
      id: 'route-planner',
      name: 'Route Planner',
      price: '$400+',
      industries: ['lawn', 'landscaping', 'home-service'],
      description: 'Weekly route view and crew assignment for recurring lawn routes.'
    },
    {
      id: 'appointment-deposits',
      name: 'Appointment Deposits',
      price: '$350+',
      industries: ['barber', 'salon', 'beauty'],
      description: 'Collect deposits at booking to reduce no-shows.'
    },
    {
      id: 'hoa-dues',
      name: 'HOA Dues & Announcements',
      price: '$500+',
      industries: ['hoa', 'community'],
      description: 'Dues reminders, community posts, and document hub.'
    },
    {
      id: 'stripe-flip',
      name: 'COD to Stripe Checkout',
      price: '$450+',
      industries: ['ecommerce', 'retail', 'shop'],
      description: 'Upgrade cash-on-delivery MVP to card payments when ready.'
    }
  ];

  var MATCHER_RULES = {
    lawn: ['lawn', 'landscap', 'mow', 'ruiz', 'cleaning', 'pro cleaning'],
    barber: ['barber', 'salon', 'rosa', 'beauty'],
    food: ['pizza', 'rizo', 'restaurant', 'food'],
    hoa: ['hoa', 'shelton', 'community', 'home owner'],
    shop: ['grippy', 'sock', 'shop', 'ecommerce', 'store'],
    repair: ['gadget', 'garage', 'repair', 'tech']
  };

  var agencyProjects = [];
  /** @type {Record<string, object>} */
  var agencyHealthByProject = {};
  var healthSelectedProjectId = '';
  var agencyMaintenance = [];
  var agencyReferrals = [];
  var agencyUnsubs = [];
  var pendingDeleteHubId = null;
  var pendingDeleteRefId = null;
  var pendingDeleteMaintId = null;

  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isAdmin() {
    if (typeof window.isAdminSession === 'function') return window.isAdminSession();
    return !!(window.currentUser && window.currentUser.role === 'admin');
  }

  function rtdbReady() {
    return !!(
      window.rtdb &&
      window.rtdbRef &&
      window.rtdbGet &&
      window.rtdbSet &&
      window.rtdbPush &&
      window.rtdbOnValue
    );
  }

  var agencySubscribeRetryTimer = null;
  var agencySubscribeRetryCount = 0;
  var AGENCY_SUBSCRIBE_MAX_RETRIES = 40;

  function ts() {
    return window.rtdbServerTimestamp ? window.rtdbServerTimestamp() : Date.now();
  }

  function getPortfolioList() {
    if (typeof window.getPortfolioProjectsSnapshot === 'function') {
      var snap = window.getPortfolioProjectsSnapshot();
      if (Array.isArray(snap) && snap.length) return snap;
    }
    if (Array.isArray(window.portfolioProjects) && window.portfolioProjects.length) {
      return window.portfolioProjects;
    }
    var built = window.DEFAULT_PORTFOLIO_PROJECTS;
    if (!Array.isArray(built)) return [];
    return built.map(function (p, i) {
      return Object.assign({}, p, { id: 'builtin-' + i });
    });
  }

  function isPortfolioEntryPublic(p) {
    if (typeof window.isPortfolioPublic === 'function') return window.isPortfolioPublic(p);
    return !p || String(p.visibility || 'public').toLowerCase() !== 'private';
  }

  function scoreProject(p, industry, need) {
    var title = String(p.title || '').toLowerCase();
    var desc = String(p.description || '').toLowerCase();
    var combined = title + ' ' + desc;
    var score = 0;
    var keys = MATCHER_RULES[industry] || [];
    keys.forEach(function (k) {
      if (combined.indexOf(k) >= 0) score += 3;
    });
    if (need === 'booking' && /book|appoint|schedule|quote/i.test(combined)) score += 2;
    if (need === 'shop' && /shop|cart|order|ecommerce/i.test(combined)) score += 2;
    if (need === 'admin' && /admin|dashboard|manage/i.test(combined)) score += 2;
    if (need === 'community' && /hoa|community|resident/i.test(combined)) score += 2;
    if (Array.isArray(p.bestFor)) {
      p.bestFor.forEach(function (b) {
        if (keys.some(function (k) { return String(b).toLowerCase().indexOf(k) >= 0; })) score += 1;
      });
    }
    return score;
  }

  function priceBandForBudget(budget, project) {
    if (project && project.buyNowLabel) return project.buyNowLabel;
    if (project && project.buyPremiumLabel) return project.buyPremiumLabel;
    var bands = {
      low: 'Typical range: $500 – $1,500 (base template)',
      mid: 'Typical range: $1,500 – $2,750 (customized build)',
      high: 'Typical range: $2,500 – $4,000+ (premium + integrations)'
    };
    return bands[budget] || bands.mid;
  }

  // ——— Template Fit Matcher (public) ———
  var matcherState = { industry: '', need: '', budget: '', email: '' };

  function openModal(id) {
    var m = document.getElementById(id);
    if (!m) return;
    m.classList.add('active');
    m.setAttribute('aria-hidden', 'false');
  }

  function closeModal(id) {
    var m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('active');
    m.setAttribute('aria-hidden', 'true');
  }

  function bindModalClose(modalId, overlaySel, closeSel) {
    var modal = document.getElementById(modalId);
    if (!modal) return;
    var overlay = modal.querySelector(overlaySel);
    var closeBtn = modal.querySelector(closeSel);
    if (overlay) overlay.addEventListener('click', function () { closeModal(modalId); });
    if (closeBtn) closeBtn.addEventListener('click', function () { closeModal(modalId); });
  }

  function showMatcherStep(n) {
    var steps = document.querySelectorAll('#template-matcher-modal .matcher-step');
    steps.forEach(function (el, i) {
      el.classList.toggle('active', i === n);
    });
  }

  function renderMatcherResults() {
    var container = document.getElementById('matcher-results');
    if (!container) return;
    var list = getPortfolioList()
      .map(function (p) {
        return { p: p, score: scoreProject(p, matcherState.industry, matcherState.need) };
      })
      .filter(function (x) { return x.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 3);

    if (!list.length) {
      list = getPortfolioList().slice(0, 2).map(function (p) {
        return { p: p, score: 1 };
      });
    }

    var html = '';
    list.forEach(function (item, idx) {
      var p = item.p;
      var url = p.projectUrl && p.projectUrl !== '#' ? p.projectUrl : '#contact';
      var band = priceBandForBudget(matcherState.budget, p);
      html +=
        '<div class="matcher-result-card">' +
        '<h4>' + esc(p.title || 'Project') + (idx === 0 ? ' <span class="matcher-price-band">Best match</span>' : '') + '</h4>' +
        '<p>' + esc(String(p.description || '').slice(0, 220)) + (String(p.description || '').length > 220 ? '…' : '') + '</p>' +
        '<p class="matcher-price-band">' + esc(band) + '</p>' +
        (url.indexOf('contact') >= 0
          ? '<a class="btn btn-secondary btn-sm" href="#contact" data-nav-link>Get a quote</a>'
          : '<a class="btn btn-secondary btn-sm" href="' + esc(url) + '" target="_blank" rel="noopener">View demo</a>') +
        '</div>';
    });
    container.innerHTML = html;
    showMatcherStep(3);
  }

  function saveMatcherSubmission() {
    if (!rtdbReady()) return;
    var ref = window.rtdbPush(window.rtdbRef(window.rtdb, PATHS.matcher));
    window.rtdbSet(ref, {
      industry: matcherState.industry,
      need: matcherState.need,
      budget: matcherState.budget,
      email: String(matcherState.email || '').slice(0, 160),
      createdAt: ts()
    }).catch(function (e) { console.warn('matcher save', e); });
  }

  function initTemplateMatcher() {
    var openBtn = document.getElementById('open-template-matcher-btn');
    if (openBtn) {
      openBtn.addEventListener('click', function () {
        matcherState = { industry: '', need: '', budget: '', email: '' };
        showMatcherStep(0);
        openModal('template-matcher-modal');
      });
    }
    bindModalClose('template-matcher-modal', '.agency-modal-overlay', '.agency-modal-close');

    var next1 = document.getElementById('matcher-next-1');
    var next2 = document.getElementById('matcher-next-2');
    var next3 = document.getElementById('matcher-next-3');
    var back2 = document.getElementById('matcher-back-2');
    var back3 = document.getElementById('matcher-back-3');

    if (next1) {
      next1.addEventListener('click', function () {
        var sel = document.querySelector('input[name="matcher-industry"]:checked');
        if (!sel) return;
        matcherState.industry = sel.value;
        showMatcherStep(1);
      });
    }
    if (next2) {
      next2.addEventListener('click', function () {
        var sel = document.querySelector('input[name="matcher-need"]:checked');
        if (!sel) return;
        matcherState.need = sel.value;
        showMatcherStep(2);
      });
    }
    if (back2) back2.addEventListener('click', function () { showMatcherStep(0); });
    if (next3) {
      next3.addEventListener('click', function () {
        var sel = document.querySelector('input[name="matcher-budget"]:checked');
        if (!sel) return;
        matcherState.budget = sel.value;
        renderMatcherResults();
      });
    }
    if (back3) back3.addEventListener('click', function () { showMatcherStep(1); });

    var finish = document.getElementById('matcher-finish');
    if (finish) {
      finish.addEventListener('click', function () {
        var emailIn = document.getElementById('matcher-email');
        matcherState.email = emailIn ? emailIn.value.trim() : '';
        saveMatcherSubmission();
        closeModal('template-matcher-modal');
        if (typeof window.switchToPage === 'function') window.switchToPage('contact');
      });
    }
  }

  function applyAgencyProjectsFromVal(val) {
    agencyProjects = [];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      Object.keys(val).forEach(function (id) {
        agencyProjects.push(normalizeProject(id, val[id]));
      });
    }
    agencyProjects.sort(function (a, b) {
      var aT = typeof a.updatedAt === 'number' ? a.updatedAt : 0;
      var bT = typeof b.updatedAt === 'number' ? b.updatedAt : 0;
      return bT - aT;
    });
    renderProjectHubList();
    renderFirebaseHealthProjectSelect();
    refreshClientProjectsPicker();
    refreshClientProjectsWorkspace();
    fetchFirebaseHealthOnce().then(function () {
      if (healthSelectedProjectId) {
        return loadHealthForProject(healthSelectedProjectId);
      }
    });
    if (typeof window.renderAdminOverview === 'function') window.renderAdminOverview();
  }

  function fetchAgencyProjectsOnce() {
    if (!rtdbReady()) return Promise.resolve();
    return window
      .rtdbGet(window.rtdbRef(window.rtdb, PATHS.projects))
      .then(function (snap) {
        applyAgencyProjectsFromVal(snap.val());
      })
      .catch(function (err) {
        console.warn('Project Hub: could not load agencyProjects', err);
      });
  }

  // ——— RTDB subscriptions (admin) ———
  function subscribeAgencyData() {
    if (!isAdmin()) return;

    if (!rtdbReady()) {
      if (agencySubscribeRetryCount < AGENCY_SUBSCRIBE_MAX_RETRIES) {
        agencySubscribeRetryCount += 1;
        if (agencySubscribeRetryTimer) clearTimeout(agencySubscribeRetryTimer);
        agencySubscribeRetryTimer = setTimeout(subscribeAgencyData, 150);
      }
      return;
    }

    agencySubscribeRetryCount = 0;
    if (agencySubscribeRetryTimer) {
      clearTimeout(agencySubscribeRetryTimer);
      agencySubscribeRetryTimer = null;
    }

    agencyUnsubs.forEach(function (u) { if (typeof u === 'function') u(); });
    agencyUnsubs = [];

    fetchAgencyProjectsOnce();

    agencyUnsubs.push(
      window.rtdbOnValue(window.rtdbRef(window.rtdb, PATHS.projects), function (snap) {
        applyAgencyProjectsFromVal(snap.val());
      })
    );

    agencyUnsubs.push(
      window.rtdbOnValue(window.rtdbRef(window.rtdb, PATHS.maintenance), function (snap) {
        var val = snap.val();
        agencyMaintenance = [];
        if (val && typeof val === 'object') {
          Object.keys(val).forEach(function (id) {
            agencyMaintenance.push(normalizeMaintenance(id, val[id]));
          });
        }
        renderMaintenanceList();
        refreshClientProjectsWorkspace();
        if (typeof window.renderAdminOverview === 'function') window.renderAdminOverview();
      })
    );

    agencyUnsubs.push(
      window.rtdbOnValue(window.rtdbRef(window.rtdb, PATHS.referrals), function (snap) {
        var val = snap.val();
        agencyReferrals = [];
        if (val && typeof val === 'object') {
          Object.keys(val).forEach(function (id) {
            agencyReferrals.push(normalizeReferral(id, val[id]));
          });
        }
        renderReferralTable();
      })
    );

    agencyUnsubs.push(
      window.rtdbOnValue(window.rtdbRef(window.rtdb, PATHS.firebaseHealth), function (snap) {
        mergeHealthSnapshot(snap.val());
        refreshHealthUiAfterData(false);
      })
    );

    fetchFirebaseHealthOnce();
  }

  function unsubscribeAgencyData() {
    if (agencySubscribeRetryTimer) {
      clearTimeout(agencySubscribeRetryTimer);
      agencySubscribeRetryTimer = null;
    }
    agencySubscribeRetryCount = 0;
    agencyUnsubs.forEach(function (u) { if (typeof u === 'function') u(); });
    agencyUnsubs = [];
    agencyProjects = [];
    agencyMaintenance = [];
    agencyReferrals = [];
    agencyHealthByProject = {};
    healthSelectedProjectId = '';
    closeCpClientDrawer();
    renderProjectHubList();
    renderMaintenanceList();
    renderReferralTable();
    renderFirebaseHealthProjectSelect();
    clearHealthForm(true);
    refreshClientProjectsPicker();
  }

  function normalizeProject(id, row) {
    row = row || {};
    var milestones = Array.isArray(row.milestones) ? row.milestones : [];
    return {
      id: id,
      leadId: String(row.leadId || ''),
      clientName: String(row.clientName || '').slice(0, 120),
      clientEmail: String(row.clientEmail || '').slice(0, 180),
      title: String(row.title || '').slice(0, 200),
      repoUrl: String(row.repoUrl || '').slice(0, 500),
      expoUrl: String(row.expoUrl || '').slice(0, 500),
      firebaseProjectId: String(row.firebaseProjectId || '').slice(0, 120),
      businessDocId: String(row.businessDocId || '').slice(0, 80),
      portfolioProjectId: String(row.portfolioProjectId || '').slice(0, 80),
      notes: String(row.notes || '').slice(0, 4000),
      enabledModules: Array.isArray(row.enabledModules) ? row.enabledModules.slice(0, 12) : [],
      portalToken: String(row.portalToken || '').replace(/[^a-f0-9]/gi, '').slice(0, 64),
      portalExpiresAt: Number(row.portalExpiresAt) || 0,
      showMaintenanceInPortal: row.showMaintenanceInPortal !== false,
      portalCanvasDocUrl: String(row.portalCanvasDocUrl || '').slice(0, 500),
      portalCanvasDocTitle: String(row.portalCanvasDocTitle || 'Project guide').slice(0, 120),
      milestones: milestones.map(function (m, i) {
        return {
          id: m.id || 'm' + i,
          label: String(m.label || '').slice(0, 120),
          done: !!m.done
        };
      }),
      updatedAt: row.updatedAt || null,
      createdAt: row.createdAt || null
    };
  }

  function defaultMilestones() {
    return [
      { id: 'm1', label: 'Discovery & scope approved', done: false },
      { id: 'm2', label: 'Design / demo approved', done: false },
      { id: 'm3', label: 'Build in progress', done: false },
      { id: 'm4', label: 'Staging review', done: false },
      { id: 'm5', label: 'Production launch', done: false }
    ];
  }

  function inferMaintenancePlanStatus(row) {
    var ps = String((row && row.planStatus) || '').toLowerCase();
    if (ps === 'pending' || ps === 'active' || ps === 'none') return ps;
    if (row && (row.renewalDate || Number(row.hoursIncluded) > 0)) return 'active';
    return 'none';
  }

  function maintenanceTierDefaults(tier) {
    var t = String(tier || 'standard').toLowerCase();
    if (t === 'priority') {
      return { planTier: 'priority', slaHours: 24, hoursIncluded: 8 };
    }
    return { planTier: 'standard', slaHours: 72, hoursIncluded: 4 };
  }

  function normalizeMaintenance(id, row) {
    row = row || {};
    var normalized = {
      id: id,
      clientName: String(row.clientName || '').slice(0, 120),
      leadId: String(row.leadId || ''),
      projectId: String(row.projectId || ''),
      planTier: String(row.planTier || 'standard').slice(0, 40),
      planStatus: String(row.planStatus || '').toLowerCase().slice(0, 20),
      billingPreference: String(row.billingPreference || 'monthly').slice(0, 20),
      planRequestedAt: row.planRequestedAt || null,
      hoursIncluded: Number(row.hoursIncluded) || 4,
      hoursUsed: Number(row.hoursUsed) || 0,
      renewalDate: String(row.renewalDate || ''),
      slaHours: Number(row.slaHours) || 48,
      notes: String(row.notes || '').slice(0, 2000),
      tickets: Array.isArray(row.tickets) ? row.tickets : [],
      updatedAt: row.updatedAt || null
    };
    normalized.effectivePlanStatus = inferMaintenancePlanStatus(normalized);
    return normalized;
  }

  function normalizeReferral(id, row) {
    row = row || {};
    return {
      id: id,
      name: String(row.name || '').slice(0, 120),
      email: String(row.email || '').slice(0, 160),
      commissionPct: Math.min(100, Math.max(0, Number(row.commissionPct) || 10)),
      leadsReferred: Number(row.leadsReferred) || 0,
      notes: String(row.notes || '').slice(0, 1000),
      active: row.active !== false
    };
  }

  // ——— Project Hub ———
  function renderProjectHubList() {
    var list =
      document.querySelector('#admin-dashboard-content #project-hub-list') ||
      document.getElementById('project-hub-list');
    if (!list) return;
    if (!agencyProjects.length) {
      list.innerHTML = '<p class="form-hint">No project hubs yet. Create one from a pipeline lead or here.</p>';
      return;
    }
    list.innerHTML = agencyProjects
      .map(function (p) {
        var done = p.milestones.filter(function (m) { return m.done; }).length;
        var total = p.milestones.length || 1;
        return (
          '<li class="hub-list-item">' +
          '<button type="button" class="hub-list-item-open" data-hub-id="' + esc(p.id) + '" aria-label="Open project hub for ' + esc(p.clientName || p.title || 'Untitled') + '">' +
          '<span class="hub-list-item-main">' +
          '<strong class="hub-list-item-title">' + esc(p.clientName || p.title || 'Untitled') + '</strong>' +
          '<span class="hub-list-item-meta">' + done + '/' + total + ' milestones</span>' +
          '</span>' +
          '<span class="hub-list-chevron" aria-hidden="true"><ion-icon name="chevron-forward-outline"></ion-icon></span>' +
          '</button>' +
          '<button type="button" class="hub-list-btn hub-list-btn-delete" data-hub-delete="' + esc(p.id) + '" aria-label="Delete project hub">' +
          '<ion-icon name="trash-outline"></ion-icon></button>' +
          '</li>'
        );
      })
      .join('');
    list.querySelectorAll('.hub-list-item-open[data-hub-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openProjectHubEditor(btn.getAttribute('data-hub-id'));
      });
    });
    list.querySelectorAll('[data-hub-delete]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openDeleteHubConfirmModal(btn.getAttribute('data-hub-delete'));
      });
    });
  }

  function openDeleteHubConfirmModal(id) {
    if (!id) return;
    pendingDeleteHubId = id;
    var p = agencyProjects.find(function (x) { return x.id === id; });
    var label = p ? (p.clientName || p.title || 'Untitled') : 'this project hub';
    var desc = document.getElementById('delete-hub-confirm-desc');
    if (desc) {
      desc.textContent =
        'Permanently delete the project hub for “' + label + '”? Any client portal link for this hub will stop working. This cannot be undone.';
    }
    var modal = document.getElementById('delete-hub-confirm-modal');
    if (!modal) return;
    if (modal.parentElement !== document.body) {
      document.body.appendChild(modal);
    }
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    var cancelBtn = document.getElementById('delete-hub-confirm-cancel');
    if (cancelBtn) {
      setTimeout(function () {
        cancelBtn.focus();
      }, 40);
    }
  }

  function closeDeleteHubConfirmModal() {
    var modal = document.getElementById('delete-hub-confirm-modal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    pendingDeleteHubId = null;
  }

  async function performDeleteProjectHub(id) {
    if (!id || !rtdbReady()) return;
    var p = agencyProjects.find(function (x) { return x.id === id; });

    if (p && p.portalToken && typeof window.rtdbRemove === 'function') {
      await window.rtdbRemove(window.rtdbRef(window.rtdb, PATHS.clientPortals + '/' + p.portalToken));
    }
    await window.rtdbRemove(window.rtdbRef(window.rtdb, PATHS.projects + '/' + id));

    if (clientProjectsSelectedId === id) {
      clientProjectsSelectedId = '';
      closeCpClientDrawer();
    }

    var editorModal = document.getElementById('project-hub-editor-modal');
    var editId = document.getElementById('hub-edit-id');
    if (editorModal && editorModal.classList.contains('active') && editId && editId.value === id) {
      closeModal('project-hub-editor-modal');
    }

    refreshClientProjectsPicker();
  }

  function setupDeleteHubConfirmModal() {
    var modal = document.getElementById('delete-hub-confirm-modal');
    if (!modal || modal.dataset.hubDelBound) return;
    modal.dataset.hubDelBound = '1';

    var overlay = document.getElementById('delete-hub-confirm-overlay');
    var btnClose = document.getElementById('delete-hub-confirm-close');
    var btnCancel = document.getElementById('delete-hub-confirm-cancel');
    var btnDelete = document.getElementById('delete-hub-confirm-delete');

    function close() {
      closeDeleteHubConfirmModal();
    }

    [overlay, btnClose, btnCancel].forEach(function (el) {
      if (el) el.addEventListener('click', close);
    });

    if (btnDelete) {
      btnDelete.addEventListener('click', function () {
        var id = pendingDeleteHubId;
        if (!id || !rtdbReady()) {
          close();
          return;
        }
        btnDelete.disabled = true;
        performDeleteProjectHub(id)
          .then(function () {
            close();
            if (typeof showSuccessMessage === 'function') {
              showSuccessMessage('Project hub deleted.');
            }
          })
          .catch(function (err) {
            console.error(err);
            if (typeof showErrorMessage === 'function') {
              showErrorMessage(err.message || 'Could not delete project hub.');
            } else {
              alert('Could not delete project hub. Try again.');
            }
          })
          .finally(function () {
            btnDelete.disabled = false;
          });
      });
    }

    document.addEventListener(
      'keydown',
      function hubDelEsc(ev) {
        if (ev.key !== 'Escape') return;
        var m = document.getElementById('delete-hub-confirm-modal');
        if (!m || !m.classList.contains('active')) return;
        ev.stopImmediatePropagation();
        close();
      },
      true
    );
  }

  function expandAllCpSectionsForHub(hubId) {
    cpSectionCollapseByHub[hubId] = {
      hub: true,
      guide: true,
      maintenance: true,
      health: true,
      pipeline: true,
      docs: true,
      portfolio: true
    };
  }

  function buildNewClientHubPayload(clientName, title, leadId) {
    return {
      leadId: leadId || '',
      clientName: String(clientName || '').trim(),
      clientEmail: '',
      title: String(title || '').trim(),
      repoUrl: '',
      expoUrl: '',
      firebaseProjectId: '',
      businessDocId: '',
      portfolioProjectId: '',
      notes: '',
      milestones: defaultMilestones(),
      enabledModules: [],
      showMaintenanceInPortal: true,
      portalCanvasDocUrl: '',
      portalCanvasDocTitle: 'Project guide',
      updatedAt: ts()
    };
  }

  function setNewClientFormError(message) {
    var el = document.getElementById('new-client-form-error');
    if (!el) return;
    if (message) {
      el.textContent = message;
      el.hidden = false;
    } else {
      el.textContent = '';
      el.hidden = true;
    }
  }

  function openNewClientModal(options) {
    options = options || {};
    var leadEl = document.getElementById('new-client-lead-id');
    var nameEl = document.getElementById('new-client-name');
    var titleEl = document.getElementById('new-client-title');
    if (!nameEl || !titleEl) return;
    if (leadEl) leadEl.value = options.leadId || '';
    nameEl.value = options.clientName || '';
    titleEl.value = options.title || '';
    setNewClientFormError('');
    openModal('new-client-modal');
    window.setTimeout(function () {
      try {
        if (options.clientName && !options.title) titleEl.focus();
        else nameEl.focus();
      } catch (fe) {}
    }, 40);
  }

  async function createNewClientFromModal() {
    if (!rtdbReady()) {
      setNewClientFormError('Realtime Database is not ready. Try again in a moment.');
      return;
    }
    var nameEl = document.getElementById('new-client-name');
    var titleEl = document.getElementById('new-client-title');
    var leadEl = document.getElementById('new-client-lead-id');
    var createBtn = document.getElementById('new-client-create');
    if (!nameEl || !titleEl) return;
    var clientName = nameEl.value.trim();
    var title = titleEl.value.trim();
    var leadId = leadEl ? leadEl.value.trim() : '';
    if (!clientName) {
      setNewClientFormError('Enter a client name.');
      nameEl.focus();
      return;
    }
    if (!title) {
      setNewClientFormError('Enter a project title.');
      titleEl.focus();
      return;
    }
    setNewClientFormError('');
    if (createBtn) createBtn.disabled = true;
    try {
      var savedId = await saveProjectHubRecord('', buildNewClientHubPayload(clientName, title, leadId), false);
      closeModal('new-client-modal');
      if (savedId) {
        expandAllCpSectionsForHub(savedId);
        if (typeof window.adminActivateTab === 'function') window.adminActivateTab('client-projects');
        openClientProjectWorkspace(savedId);
        if (typeof window.renderAdminOverview === 'function') window.renderAdminOverview();
      }
    } catch (err) {
      console.error(err);
      setNewClientFormError((err && err.message) || 'Could not create client.');
    } finally {
      if (createBtn) createBtn.disabled = false;
    }
  }

  function initNewClientModal() {
    bindModalClose('new-client-modal', '.agency-modal-overlay', '.agency-modal-close');
    var cancelBtn = document.getElementById('new-client-cancel');
    if (cancelBtn && !cancelBtn.dataset.cpBound) {
      cancelBtn.dataset.cpBound = '1';
      cancelBtn.addEventListener('click', function () {
        closeModal('new-client-modal');
      });
    }
    var form = document.getElementById('new-client-form');
    if (form && !form.dataset.cpBound) {
      form.dataset.cpBound = '1';
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        createNewClientFromModal().catch(console.error);
      });
    }
  }

  function openProjectHubEditor(id) {
    var p = agencyProjects.find(function (x) { return x.id === id; });
    if (!p && id !== 'new') return;
    if (id === 'new') {
      p = {
        id: '',
        leadId: '',
        clientName: '',
        title: '',
        repoUrl: '',
        expoUrl: '',
        firebaseProjectId: '',
        businessDocId: '',
        portfolioProjectId: '',
        notes: '',
        enabledModules: [],
        milestones: defaultMilestones()
      };
    }
    document.getElementById('hub-edit-id').value = p.id || '';
    document.getElementById('hub-lead-id').value = p.leadId || '';
    document.getElementById('hub-client-name').value = p.clientName || '';
    var hubClientEmail = document.getElementById('hub-client-email');
    if (hubClientEmail) hubClientEmail.value = p.clientEmail || '';
    document.getElementById('hub-title').value = p.title || '';
    document.getElementById('hub-repo-url').value = p.repoUrl || '';
    document.getElementById('hub-expo-url').value = p.expoUrl || '';
    document.getElementById('hub-firebase-id').value = p.firebaseProjectId || '';
    document.getElementById('hub-business-doc-id').value = p.businessDocId || '';
    document.getElementById('hub-notes').value = p.notes || '';
    renderHubMilestones(p.milestones);
    renderHubPortalLink(p);
    if (p.id && !p.portalToken) {
      backfillHubPortalLink(p);
    }
    openModal('project-hub-editor-modal');
  }

  function renderHubMilestones(milestones) {
    var wrap = document.getElementById('hub-milestones-list');
    if (!wrap) return;
    wrap.innerHTML = (milestones || []).map(function (m, i) {
      return (
        '<li class="hub-milestone">' +
        '<input type="checkbox" data-milestone-idx="' + i + '" ' + (m.done ? 'checked' : '') + '>' +
        '<input type="text" class="form-input hub-milestone-label" data-milestone-label-idx="' + i + '" value="' + esc(m.label) + '">' +
        '</li>'
      );
    }).join('');
  }

  function collectHubMilestonesFromDom() {
    var labels = document.querySelectorAll('#hub-milestones-list .hub-milestone-label');
    var checks = document.querySelectorAll('#hub-milestones-list input[type="checkbox"]');
    var out = [];
    labels.forEach(function (inp, i) {
      out.push({
        id: 'm' + i,
        label: inp.value.trim(),
        done: checks[i] ? checks[i].checked : false
      });
    });
    return out;
  }

  async function saveProjectHubRecord(id, payload, closeModalAfter) {
    if (!rtdbReady()) return null;
    var existing = id ? agencyProjects.find(function (x) { return x.id === id; }) : null;
    if (existing && existing.portalToken) {
      payload.portalToken = existing.portalToken;
      payload.portalExpiresAt = existing.portalExpiresAt || 0;
    }
    var savedId = id;
    if (id) {
      await window.rtdbSet(window.rtdbRef(window.rtdb, PATHS.projects + '/' + id), payload);
    } else {
      payload.createdAt = ts();
      var ref = window.rtdbPush(window.rtdbRef(window.rtdb, PATHS.projects));
      savedId = ref.key;
      await window.rtdbSet(ref, payload);
    }
    await fetchAgencyProjectsOnce();
    if (closeModalAfter) closeModal('project-hub-editor-modal');
    return savedId;
  }

  async function saveProjectHub() {
    if (!rtdbReady()) return;
    var id = document.getElementById('hub-edit-id').value.trim();
    var existing = id ? agencyProjects.find(function (x) { return x.id === id; }) : null;
    var payload = {
      leadId: document.getElementById('hub-lead-id').value.trim(),
      clientName: document.getElementById('hub-client-name').value.trim(),
      clientEmail: (document.getElementById('hub-client-email') || {}).value.trim(),
      title: document.getElementById('hub-title').value.trim(),
      repoUrl: document.getElementById('hub-repo-url').value.trim(),
      expoUrl: document.getElementById('hub-expo-url').value.trim(),
      firebaseProjectId: document.getElementById('hub-firebase-id').value.trim(),
      businessDocId: document.getElementById('hub-business-doc-id').value.trim(),
      portfolioProjectId: existing ? (existing.portfolioProjectId || '') : '',
      notes: document.getElementById('hub-notes').value.trim(),
      milestones: collectHubMilestonesFromDom(),
      enabledModules: existing && Array.isArray(existing.enabledModules) ? existing.enabledModules.slice() : [],
      showMaintenanceInPortal: existing ? existing.showMaintenanceInPortal !== false : true,
      portalCanvasDocUrl: existing ? existing.portalCanvasDocUrl || '' : '',
      portalCanvasDocTitle: existing ? existing.portalCanvasDocTitle || 'Project guide' : 'Project guide',
      updatedAt: ts()
    };
    var savedId = await saveProjectHubRecord(id, payload, true);
    if (savedId) openClientProjectWorkspace(savedId);
  }

  function initProjectHub() {
    setupDeleteHubConfirmModal();
    var addBtn = document.getElementById('project-hub-add-btn');
    if (addBtn) addBtn.addEventListener('click', function () { openProjectHubEditor('new'); });
    bindModalClose('project-hub-editor-modal', '.agency-modal-overlay', '.agency-modal-close');
    var saveBtn = document.getElementById('hub-save-btn');
    if (saveBtn) saveBtn.addEventListener('click', function () { saveProjectHub().catch(console.error); });
    var portalBtn = document.getElementById('hub-generate-portal-btn');
    if (portalBtn) {
      portalBtn.addEventListener('click', function () {
        generateClientPortalLink(document.getElementById('hub-edit-id').value.trim());
      });
    }
  }

  // ——— Case Study Generator ———
  function generateCaseStudy(projectId) {
    var list = getPortfolioList();
    var p = list.find(function (x) { return x.id === projectId; });
    if (!p) return { md: '', social: '' };
    var urls = [];
    if (Array.isArray(p.imageUrls) && p.imageUrls.length) urls = p.imageUrls;
    else if (p.imageUrl) urls = [p.imageUrl];
    var tech = Array.isArray(p.techTags) ? p.techTags.join(', ') : String(p.techTags || '');
    var best = Array.isArray(p.bestFor) ? p.bestFor.map(function (b) { return '- ' + b; }).join('\n') : '';
    var md =
      '# Case Study: ' + (p.title || 'Project') + '\n\n' +
      '## Overview\n' + (p.description || '') + '\n\n' +
      '## Tech stack\n' + tech + '\n\n' +
      '## Outcome\n' + (p.outcome || 'Delivered on time with a production-ready client experience.') + '\n\n' +
      (best ? '## Best for\n' + best + '\n\n' : '') +
      (p.projectUrl && p.projectUrl !== '#' ? '**Live demo:** ' + p.projectUrl + '\n' : '');
    var social =
      '🚀 ' + (p.title || 'New project') + ' — built with ' + (tech || 'React Native & Firebase') + '.\n\n' +
      (p.outcome ? p.outcome + '\n\n' : '') +
      'Need something similar? → rubenjimenez.dev #CodeWithRuben #Expo #Firebase';
    return { md: md, social: social };
  }

  function initCaseStudyGenerator() {
    var btn = document.getElementById('case-study-generate-btn');
    var select = document.getElementById('case-study-project-select');
    if (!btn || !select) return;

    function fillSelect() {
      var list = getPortfolioList();
      select.innerHTML =
        '<option value="">Choose a portfolio project…</option>' +
        list.map(function (p) {
          return '<option value="' + esc(p.id) + '">' + esc(p.title || p.id) + '</option>';
        }).join('');
    }
    fillSelect();
    window.addEventListener('portfolioProjectsLoaded', fillSelect);
    setTimeout(fillSelect, 2000);

    btn.addEventListener('click', function () {
      var id = select.value;
      if (!id) return;
      var out = generateCaseStudy(id);
      document.getElementById('case-study-output-md').value = out.md;
      document.getElementById('case-study-output-social').value = out.social;
      openModal('case-study-modal');
    });

    document.querySelectorAll('.agency-output-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.agency-output-tab').forEach(function (t) {
          t.classList.toggle('active', t === tab);
        });
        var which = tab.getAttribute('data-output');
        document.getElementById('case-study-output-md').hidden = which !== 'md';
        document.getElementById('case-study-output-social').hidden = which !== 'social';
      });
    });

    var copyMd = document.getElementById('case-study-copy-md');
    var copySocial = document.getElementById('case-study-copy-social');
    if (copyMd) {
      copyMd.addEventListener('click', function () {
        navigator.clipboard.writeText(document.getElementById('case-study-output-md').value);
      });
    }
    if (copySocial) {
      copySocial.addEventListener('click', function () {
        navigator.clipboard.writeText(document.getElementById('case-study-output-social').value);
      });
    }
    bindModalClose('case-study-modal', '.agency-modal-overlay', '.agency-modal-close');
  }

  // ——— Client Portal ———
  function randomToken() {
    var a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return Array.from(a, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function normalizePortalCanvasDocUrl(url) {
    var s = String(url || '').trim();
    if (!s) return '';
    var match = s.match(/assets\/(?:docs\/)?[A-Za-z0-9._/-]+\.(?:md|pdf|canvas\.tsx)/i);
    if (match) return '/' + match[0].toLowerCase();
    if (/^\.?\/?assets\//i.test(s)) return '/' + s.replace(/^\.?\//, '');
    return s;
  }

  function clientPortalUrl(token) {
    var base = String(window.PORTFOLIO_PUBLIC_ORIGIN || location.origin || '').replace(/\/$/, '');
    return base + '/portal.html?token=' + encodeURIComponent(token);
  }

  function formatPortalExpiry(expiresAt) {
    if (!expiresAt) return '';
    try {
      return new Date(expiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  }

  async function backfillHubPortalLink(project) {
    if (!project || !project.id || !rtdbReady()) return;
    try {
      var snap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATHS.clientPortals));
      var val = snap.val();
      if (!val || typeof val !== 'object') return;
      var now = Date.now();
      var bestToken = '';
      var bestExpires = 0;
      Object.keys(val).forEach(function (tok) {
        var row = val[tok];
        if (!row || row.projectId !== project.id) return;
        if (row.expiresAt && row.expiresAt < now) return;
        if (!bestToken || (row.expiresAt || 0) > bestExpires) {
          bestToken = tok;
          bestExpires = row.expiresAt || 0;
        }
      });
      if (!bestToken) return;
      project.portalToken = bestToken;
      project.portalExpiresAt = bestExpires;
      await window.rtdbUpdate(window.rtdbRef(window.rtdb, PATHS.projects + '/' + project.id), {
        portalToken: bestToken,
        portalExpiresAt: bestExpires,
        updatedAt: ts()
      });
      renderHubPortalLink(project);
    } catch (e) {
      console.warn('Portal link backfill failed', e);
    }
  }

  function renderHubPortalLink(project) {
    var out = document.getElementById('hub-portal-link-out');
    if (!out) return;

    var token = project && project.portalToken;
    var expires = project && project.portalExpiresAt;
    if (!token || (expires && expires < Date.now())) {
      out.hidden = true;
      out.innerHTML = '';
      return;
    }

    var url = clientPortalUrl(token);
    var expiryLabel = formatPortalExpiry(expires);
    out.hidden = false;
    out.className = 'hub-portal-link-box';
    out.innerHTML =
      '<span class="hub-portal-link-label">Client link' + (expiryLabel ? ' · expires ' + esc(expiryLabel) : ' (90 days)') + '</span>' +
      '<a class="hub-portal-link-url" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(url) + '</a>' +
      '<div class="cp-hub-portal-actions">' +
      '<button type="button" class="btn btn-secondary btn-sm" id="hub-portal-copy-btn">Copy link</button>' +
      '<button type="button" class="btn btn-primary btn-sm" id="hub-portal-email-btn">Email portal link</button>' +
      '</div>';
    var copyBtn = document.getElementById('hub-portal-copy-btn');
    if (copyBtn) {
      copyBtn.onclick = function () {
        navigator.clipboard.writeText(url).catch(function () {});
      };
    }
    var emailBtn = document.getElementById('hub-portal-email-btn');
    if (emailBtn) {
      emailBtn.onclick = function () {
        var hubId = (document.getElementById('hub-edit-id') || {}).value.trim();
        var hub = hubId ? getHubById(hubId) : project;
        if (hub) {
          emailPortalLinkToClient(hub)
            .then(function () {
              alert('Portal link emailed to ' + (hub.clientEmail || 'client') + '.');
            })
            .catch(function (err) {
              alert((err && err.message) || 'Could not send portal email.');
            });
        }
      };
    }
  }

  function isClientEmailValid(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
  }

  async function emailPortalLinkToClient(hub) {
    if (!hub || !hub.portalToken) {
      throw new Error('Generate a client portal link first.');
    }
    if (hub.portalExpiresAt && hub.portalExpiresAt < Date.now()) {
      throw new Error('Portal link expired — regenerate the link first.');
    }
    var email = String(hub.clientEmail || '').trim();
    if (!isClientEmailValid(email)) {
      throw new Error('Add a valid client email on the hub, then save.');
    }
    if (typeof sendPortfolioEmailRequest !== 'function') {
      throw new Error('Email API is not configured.');
    }
    var url = clientPortalUrl(hub.portalToken);
    await sendPortfolioEmailRequest(
      {
        type: 'portal_invite',
        payload: {
          to_email: email,
          to_name: String(hub.clientName || 'there').trim(),
          portal_url: url,
          project_title: String(hub.title || hub.clientName || 'your project').trim(),
          from_name: 'Ruben Jimenez'
        }
      },
      { requireAdmin: true }
    );
  }

  async function generateClientPortalLink(projectId) {
    if (!projectId || !rtdbReady()) {
      alert('Save the project hub first.');
      return;
    }
    var existing = agencyProjects.find(function (x) { return x.id === projectId; });
    var token = randomToken();
    var expires = Date.now() + 90 * 24 * 60 * 60 * 1000;

    if (existing && existing.portalToken && typeof window.rtdbRemove === 'function') {
      try {
        await window.rtdbRemove(window.rtdbRef(window.rtdb, PATHS.clientPortals + '/' + existing.portalToken));
      } catch (e) {
        console.warn('Could not remove previous portal token', e);
      }
    }

    await window.rtdbSet(window.rtdbRef(window.rtdb, PATHS.clientPortals + '/' + token), {
      projectId: projectId,
      expiresAt: expires,
      createdAt: ts()
    });

    var portalFields = { portalToken: token, portalExpiresAt: expires, updatedAt: ts() };
    await window.rtdbUpdate(window.rtdbRef(window.rtdb, PATHS.projects + '/' + projectId), portalFields);

    if (existing) {
      existing.portalToken = token;
      existing.portalExpiresAt = expires;
    }

    renderHubPortalLink({ portalToken: token, portalExpiresAt: expires });
    navigator.clipboard.writeText(clientPortalUrl(token)).catch(function () {});
  }

  // ——— Maintenance ———
  function renderMaintenanceList() {
    var list = document.getElementById('maintenance-list');
    if (!list) return;
    if (!agencyMaintenance.length) {
      list.innerHTML = '<p class="form-hint">No maintenance clients yet.</p>';
      return;
    }
    list.innerHTML = agencyMaintenance
      .map(function (m) {
        return (
          '<li class="hub-list-item">' +
          '<button type="button" class="hub-list-item-open" data-maint-id="' + esc(m.id) + '" aria-label="Open maintenance for ' + esc(m.clientName) + '">' +
          '<span class="hub-list-item-main">' +
          '<strong class="hub-list-item-title">' + esc(m.clientName) + '</strong>' +
          '<span class="hub-list-item-meta">' +
          (m.effectivePlanStatus === 'pending'
            ? '<span class="cp-maint-pending-badge">Pending</span> · ' + esc(m.planTier || 'standard') + ' · ' + esc(m.billingPreference || 'monthly')
            : m.hoursUsed + '/' + m.hoursIncluded + ' hrs · SLA ' + m.slaHours + 'h') +
          '</span>' +
          '</span>' +
          '<span class="hub-list-chevron" aria-hidden="true"><ion-icon name="chevron-forward-outline"></ion-icon></span>' +
          '</button>' +
          '<button type="button" class="hub-list-btn hub-list-btn-delete" data-maint-delete="' + esc(m.id) + '" aria-label="Delete maintenance client">' +
          '<ion-icon name="trash-outline"></ion-icon></button>' +
          '</li>'
        );
      })
      .join('');
    list.querySelectorAll('.hub-list-item-open[data-maint-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openMaintenanceEditor(btn.getAttribute('data-maint-id'));
      });
    });
    list.querySelectorAll('[data-maint-delete]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openDeleteMaintConfirmModal(btn.getAttribute('data-maint-delete'));
      });
    });
  }

  function openDeleteMaintConfirmModal(id) {
    if (!id) return;
    pendingDeleteMaintId = id;
    var m = agencyMaintenance.find(function (x) { return x.id === id; });
    var label = m ? (m.clientName || 'this client') : 'this client';
    var desc = document.getElementById('delete-maint-confirm-desc');
    if (desc) {
      desc.textContent =
        'Permanently delete maintenance record for “' + label + '”? This cannot be undone.';
    }
    var modal = document.getElementById('delete-maint-confirm-modal');
    if (!modal) return;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    var cancelBtn = document.getElementById('delete-maint-confirm-cancel');
    if (cancelBtn) {
      setTimeout(function () {
        cancelBtn.focus();
      }, 40);
    }
  }

  function closeDeleteMaintConfirmModal() {
    var modal = document.getElementById('delete-maint-confirm-modal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    pendingDeleteMaintId = null;
  }

  async function performDeleteMaintenance(id) {
    if (!id || !rtdbReady()) return;
    await window.rtdbRemove(window.rtdbRef(window.rtdb, PATHS.maintenance + '/' + id));

    var editorModal = document.getElementById('maintenance-editor-modal');
    var editId = document.getElementById('maint-edit-id');
    if (editorModal && editorModal.classList.contains('active') && editId && editId.value === id) {
      closeModal('maintenance-editor-modal');
    }

    if (clientProjectsSelectedId) renderClientProjectsWorkspace();
  }

  function setupDeleteMaintConfirmModal() {
    var modal = document.getElementById('delete-maint-confirm-modal');
    if (!modal || modal.dataset.maintDelBound) return;
    modal.dataset.maintDelBound = '1';

    var overlay = document.getElementById('delete-maint-confirm-overlay');
    var btnClose = document.getElementById('delete-maint-confirm-close');
    var btnCancel = document.getElementById('delete-maint-confirm-cancel');
    var btnDelete = document.getElementById('delete-maint-confirm-delete');

    function close() {
      closeDeleteMaintConfirmModal();
    }

    [overlay, btnClose, btnCancel].forEach(function (el) {
      if (el) el.addEventListener('click', close);
    });

    if (btnDelete) {
      btnDelete.addEventListener('click', function () {
        var id = pendingDeleteMaintId;
        if (!id || !rtdbReady()) {
          close();
          return;
        }
        btnDelete.disabled = true;
        performDeleteMaintenance(id)
          .then(function () {
            close();
            if (typeof showSuccessMessage === 'function') {
              showSuccessMessage('Maintenance client deleted.');
            }
          })
          .catch(function (err) {
            console.error(err);
            if (typeof showErrorMessage === 'function') {
              showErrorMessage(err.message || 'Could not delete maintenance client.');
            } else {
              alert('Could not delete maintenance client. Try again.');
            }
          })
          .finally(function () {
            btnDelete.disabled = false;
          });
      });
    }

    document.addEventListener(
      'keydown',
      function maintDelEsc(ev) {
        if (ev.key !== 'Escape') return;
        var m = document.getElementById('delete-maint-confirm-modal');
        if (!m || !m.classList.contains('active')) return;
        ev.stopImmediatePropagation();
        close();
      },
      true
    );
  }

  function openMaintenanceEditor(id) {
    var m = agencyMaintenance.find(function (x) { return x.id === id; });
    if (!m && id !== 'new') return;
    if (id === 'new') {
      m = {
        id: '',
        clientName: '',
        leadId: '',
        projectId: '',
        planTier: 'standard',
        planStatus: 'active',
        billingPreference: 'monthly',
        hoursIncluded: 4,
        hoursUsed: 0,
        renewalDate: '',
        slaHours: 48,
        notes: ''
      };
    }
    document.getElementById('maint-edit-id').value = m.id || '';
    document.getElementById('maint-client-name').value = m.clientName || '';
    document.getElementById('maint-hours-included').value = m.hoursIncluded;
    document.getElementById('maint-hours-used').value = m.hoursUsed;
    document.getElementById('maint-renewal').value = m.renewalDate || '';
    document.getElementById('maint-sla').value = m.slaHours;
    document.getElementById('maint-notes').value = m.notes || '';
    openModal('maintenance-editor-modal');
  }

  async function saveMaintenance() {
    if (!rtdbReady()) return;
    var id = document.getElementById('maint-edit-id').value.trim();
    var existing = id ? agencyMaintenance.find(function (x) { return x.id === id; }) : null;
    var payload = {
      clientName: document.getElementById('maint-client-name').value.trim(),
      hoursIncluded: Number(document.getElementById('maint-hours-included').value) || 4,
      hoursUsed: Number(document.getElementById('maint-hours-used').value) || 0,
      renewalDate: document.getElementById('maint-renewal').value,
      slaHours: Number(document.getElementById('maint-sla').value) || 48,
      notes: document.getElementById('maint-notes').value.trim(),
      updatedAt: ts()
    };
    if (existing) {
      payload.planTier = existing.planTier;
      payload.planStatus = existing.planStatus || existing.effectivePlanStatus || 'active';
      payload.billingPreference = existing.billingPreference || 'monthly';
      payload.planRequestedAt = existing.planRequestedAt || null;
      payload.projectId = existing.projectId || '';
      payload.leadId = existing.leadId || '';
    } else {
      payload.planTier = 'standard';
      payload.planStatus = 'active';
      payload.billingPreference = 'monthly';
    }
    if (id) {
      await window.rtdbSet(window.rtdbRef(window.rtdb, PATHS.maintenance + '/' + id), payload);
    } else {
      payload.createdAt = ts();
      payload.tickets = [];
      var ref = window.rtdbPush(window.rtdbRef(window.rtdb, PATHS.maintenance));
      await window.rtdbSet(ref, payload);
    }
    closeModal('maintenance-editor-modal');
  }

  function initMaintenance() {
    setupDeleteMaintConfirmModal();
    var add = document.getElementById('maintenance-add-btn');
    if (add) add.addEventListener('click', function () { openMaintenanceEditor('new'); });
    bindModalClose('maintenance-editor-modal', '.agency-modal-overlay', '.agency-modal-close');
    var save = document.getElementById('maint-save-btn');
    if (save) save.addEventListener('click', function () { saveMaintenance().catch(console.error); });
  }

  // ——— Content Repurposing ———
  async function fetchBlogPostsForRepurpose() {
    if (!window.db || !window.getDocs || !window.collection) return [];
    try {
      var snap = await window.getDocs(window.collection(window.db, 'blogPosts'));
      var rows = [];
      snap.forEach(function (doc) {
        var d = doc.data();
        rows.push({ id: doc.id, title: d.title || 'Untitled', excerpt: d.excerpt || '', content: d.content || '' });
      });
      return rows;
    } catch (e) {
      return [];
    }
  }

  function repurposeContent(post) {
    var text = (post.content || post.excerpt || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    var sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 6);
    var linkedin = sentences.map(function (s, i) {
      return (i + 1) + '. ' + s;
    }).join('\n\n');
    linkedin = '📝 ' + (post.title || 'New post') + '\n\n' + linkedin + '\n\n→ Full article: rubenjimenez.dev #CodeWithRuben';
    var script =
      'HOOK: ' + (sentences[0] || post.title) + '\n\n' +
      'BODY: ' + sentences.slice(1, 4).join(' ') + '\n\n' +
      'CTA: Visit rubenjimenez.dev for the full breakdown.';
    return { linkedin: linkedin, script: script };
  }

  function initContentRepurposing() {
    var btn = document.getElementById('content-repurpose-btn');
    var select = document.getElementById('content-repurpose-select');
    if (!btn || !select) return;

    async function fill() {
      var posts = await fetchBlogPostsForRepurpose();
      select.innerHTML =
        '<option value="">Select blog post…</option>' +
        posts.map(function (p) {
          return '<option value="' + esc(p.id) + '" data-title="' + esc(p.title) + '">' + esc(p.title) + '</option>';
        }).join('');
      select._posts = posts;
    }
    fill();

    btn.addEventListener('click', async function () {
      await fill();
      var id = select.value;
      if (!id) return;
      var post = (select._posts || []).find(function (p) { return p.id === id; });
      if (!post) return;
      var out = repurposeContent(post);
      document.getElementById('content-output-linkedin').value = out.linkedin;
      document.getElementById('content-output-script').value = out.script;
      openModal('content-repurpose-modal');
    });

    document.querySelectorAll('[data-content-tab]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var which = tab.getAttribute('data-content-tab');
        document.querySelectorAll('[data-content-tab]').forEach(function (t) {
          t.classList.toggle('active', t === tab);
        });
        document.getElementById('content-output-linkedin').hidden = which !== 'linkedin';
        document.getElementById('content-output-script').hidden = which !== 'script';
      });
    });

    bindModalClose('content-repurpose-modal', '.agency-modal-overlay', '.agency-modal-close');
  }

  // ——— Referrals ———
  function renderReferralTable() {
    var tbody = document.getElementById('referral-tbody');
    if (!tbody) return;
    if (!agencyReferrals.length) {
      tbody.innerHTML = '<tr><td colspan="5">No referral partners yet.</td></tr>';
      return;
    }
    tbody.innerHTML = agencyReferrals
      .map(function (r) {
        return (
          '<tr data-ref-id="' + esc(r.id) + '">' +
          '<td>' + esc(r.name) + '</td>' +
          '<td>' + esc(r.email) + '</td>' +
          '<td>' + r.commissionPct + '%</td>' +
          '<td>' + r.leadsReferred + '</td>' +
          '<td class="referral-table-actions">' +
          '<button type="button" class="btn btn-secondary btn-sm" data-edit-ref="' + esc(r.id) + '">Edit</button>' +
          '<button type="button" class="hub-list-btn hub-list-btn-delete" data-ref-delete="' + esc(r.id) + '" aria-label="Delete referral partner">' +
          '<ion-icon name="trash-outline"></ion-icon></button>' +
          '</td></tr>'
        );
      })
      .join('');
    tbody.querySelectorAll('[data-edit-ref]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openReferralEditor(btn.getAttribute('data-edit-ref'));
      });
    });
    tbody.querySelectorAll('[data-ref-delete]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openDeleteReferralConfirmModal(btn.getAttribute('data-ref-delete'));
      });
    });
  }

  function openDeleteReferralConfirmModal(id) {
    if (!id) return;
    pendingDeleteRefId = id;
    var r = agencyReferrals.find(function (x) { return x.id === id; });
    var label = r ? (r.name || r.email || 'this partner') : 'this partner';
    var desc = document.getElementById('delete-referral-confirm-desc');
    if (desc) {
      desc.textContent =
        'Permanently delete referral partner “' + label + '”? This cannot be undone.';
    }
    var modal = document.getElementById('delete-referral-confirm-modal');
    if (!modal) return;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    var cancelBtn = document.getElementById('delete-referral-confirm-cancel');
    if (cancelBtn) {
      setTimeout(function () {
        cancelBtn.focus();
      }, 40);
    }
  }

  function closeDeleteReferralConfirmModal() {
    var modal = document.getElementById('delete-referral-confirm-modal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    pendingDeleteRefId = null;
  }

  async function performDeleteReferral(id) {
    if (!id || !rtdbReady()) return;
    await window.rtdbRemove(window.rtdbRef(window.rtdb, PATHS.referrals + '/' + id));

    var editorModal = document.getElementById('referral-editor-modal');
    var editId = document.getElementById('ref-edit-id');
    if (editorModal && editorModal.classList.contains('active') && editId && editId.value === id) {
      closeModal('referral-editor-modal');
    }
  }

  function setupDeleteReferralConfirmModal() {
    var modal = document.getElementById('delete-referral-confirm-modal');
    if (!modal || modal.dataset.refDelBound) return;
    modal.dataset.refDelBound = '1';

    var overlay = document.getElementById('delete-referral-confirm-overlay');
    var btnClose = document.getElementById('delete-referral-confirm-close');
    var btnCancel = document.getElementById('delete-referral-confirm-cancel');
    var btnDelete = document.getElementById('delete-referral-confirm-delete');

    function close() {
      closeDeleteReferralConfirmModal();
    }

    [overlay, btnClose, btnCancel].forEach(function (el) {
      if (el) el.addEventListener('click', close);
    });

    if (btnDelete) {
      btnDelete.addEventListener('click', function () {
        var id = pendingDeleteRefId;
        if (!id || !rtdbReady()) {
          close();
          return;
        }
        btnDelete.disabled = true;
        performDeleteReferral(id)
          .then(function () {
            close();
            if (typeof showSuccessMessage === 'function') {
              showSuccessMessage('Referral partner deleted.');
            }
          })
          .catch(function (err) {
            console.error(err);
            if (typeof showErrorMessage === 'function') {
              showErrorMessage(err.message || 'Could not delete referral partner.');
            } else {
              alert('Could not delete referral partner. Try again.');
            }
          })
          .finally(function () {
            btnDelete.disabled = false;
          });
      });
    }

    document.addEventListener(
      'keydown',
      function refDelEsc(ev) {
        if (ev.key !== 'Escape') return;
        var m = document.getElementById('delete-referral-confirm-modal');
        if (!m || !m.classList.contains('active')) return;
        ev.stopImmediatePropagation();
        close();
      },
      true
    );
  }

  function openReferralEditor(id) {
    var r = agencyReferrals.find(function (x) { return x.id === id; });
    if (!r && id !== 'new') return;
    if (id === 'new') r = { id: '', name: '', email: '', commissionPct: 10, leadsReferred: 0, notes: '' };
    document.getElementById('ref-edit-id').value = r.id || '';
    document.getElementById('ref-name').value = r.name || '';
    document.getElementById('ref-email').value = r.email || '';
    document.getElementById('ref-commission').value = r.commissionPct;
    document.getElementById('ref-notes').value = r.notes || '';
    openModal('referral-editor-modal');
  }

  async function saveReferral() {
    if (!rtdbReady()) return;
    var id = document.getElementById('ref-edit-id').value.trim();
    var payload = {
      name: document.getElementById('ref-name').value.trim(),
      email: document.getElementById('ref-email').value.trim(),
      commissionPct: Number(document.getElementById('ref-commission').value) || 10,
      notes: document.getElementById('ref-notes').value.trim(),
      active: true,
      updatedAt: ts()
    };
    if (id) {
      var existing = agencyReferrals.find(function (r) { return r.id === id; });
      if (existing) payload.leadsReferred = existing.leadsReferred;
      await window.rtdbSet(window.rtdbRef(window.rtdb, PATHS.referrals + '/' + id), payload);
    } else {
      payload.leadsReferred = 0;
      payload.createdAt = ts();
      var ref = window.rtdbPush(window.rtdbRef(window.rtdb, PATHS.referrals));
      await window.rtdbSet(ref, payload);
    }
    closeModal('referral-editor-modal');
  }

  function initReferrals() {
    setupDeleteReferralConfirmModal();
    var add = document.getElementById('referral-add-btn');
    if (add) add.addEventListener('click', function () { openReferralEditor('new'); });
    bindModalClose('referral-editor-modal', '.agency-modal-overlay', '.agency-modal-close');
    var save = document.getElementById('ref-save-btn');
    if (save) save.addEventListener('click', function () { saveReferral().catch(console.error); });
  }

  // ——— Firebase Health ———
  var HEALTH_CHECK_KEYS = ['rulesOk', 'authOk', 'functionsOk', 'rtdbOk', 'hostingOk'];

  function normalizeHealthRecord(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    var checks = raw.checks && typeof raw.checks === 'object' ? raw.checks : raw;
    function flag(obj, keys) {
      for (var i = 0; i < keys.length; i++) {
        var v = obj[keys[i]];
        if (v === true || v === 1 || v === 'true' || v === '1' || v === 'yes') return true;
      }
      return false;
    }
    return {
      rulesOk: flag(checks, ['rulesOk', 'rulesDeployed', 'rules_deployed', 'rules']),
      authOk: flag(checks, ['authOk', 'authConfigured', 'auth_configured', 'auth']),
      functionsOk: flag(checks, ['functionsOk', 'functionsHealthy', 'functions_healthy', 'functions']),
      rtdbOk: flag(checks, ['rtdbOk', 'rtdbWithinLimits', 'rtdb_within_limits', 'rtdb']),
      hostingOk: flag(checks, ['hostingOk', 'hostingLive', 'hosting_live', 'hosting']),
      notes: String(raw.notes || raw.note || checks.notes || '').trim(),
      updatedAt: raw.updatedAt != null ? raw.updatedAt : raw.updated_at || checks.updatedAt
    };
  }

  function mergeHealthSnapshot(val) {
    agencyHealthByProject = {};
    if (!val || typeof val !== 'object' || Array.isArray(val)) return;
    Object.keys(val).forEach(function (id) {
      var normalized = normalizeHealthRecord(val[id]);
      if (normalized) agencyHealthByProject[id] = normalized;
    });
  }

  function healthProjectLabel(projectId) {
    var p = agencyProjects.find(function (x) { return x.id === projectId; });
    if (p) return p.clientName || p.title || projectId;
    return 'Project ' + projectId;
  }

  function pickAutoHealthProjectId() {
    var savedIds = Object.keys(agencyHealthByProject);
    if (!savedIds.length) return '';
    if (healthSelectedProjectId && agencyHealthByProject[healthSelectedProjectId]) {
      return healthSelectedProjectId;
    }
    var i;
    for (i = 0; i < savedIds.length; i++) {
      if (agencyProjects.some(function (p) { return p.id === savedIds[i]; })) {
        return savedIds[i];
      }
    }
    return savedIds[0];
  }

  function updateHealthLoadBanner() {
    var meta = document.getElementById('health-status-meta');
    if (!meta) return;
    var count = Object.keys(agencyHealthByProject).length;
    if (!count) {
      if (!isAdmin() || !rtdbReady()) {
        meta.hidden = false;
        meta.textContent = 'Sign in and wait for Realtime Database to load saved checks.';
        meta.classList.add('is-empty');
      }
      return;
    }
    if (!document.getElementById('health-project-select') || !document.getElementById('health-project-select').value) {
      meta.hidden = false;
      meta.classList.remove('is-empty');
      meta.textContent =
        count +
        ' saved health record' +
        (count === 1 ? '' : 's') +
        ' in Firebase — select a project hub or use a saved record below.';
    }
  }

  function renderHealthSavedRecordsList() {
    var wrap = document.getElementById('health-saved-records');
    var list = document.getElementById('health-saved-records-list');
    if (!wrap || !list) return;
    var ids = Object.keys(agencyHealthByProject);
    if (!ids.length) {
      wrap.hidden = true;
      list.innerHTML = '';
      return;
    }
    wrap.hidden = false;
    list.innerHTML = ids
      .map(function (id) {
        var h = agencyHealthByProject[id];
        var done = healthCheckedCount(h);
        var when = healthTimestampLabel(h && h.updatedAt);
        var inHub = agencyProjects.some(function (p) { return p.id === id; });
        return (
          '<li><button type="button" class="health-saved-record-btn" data-health-project-id="' +
          esc(id) +
          '">' +
          '<span class="health-saved-record-label">' +
          esc(healthProjectLabel(id)) +
          (inHub ? '' : ' <span class="health-saved-record-tag">legacy id</span>') +
          '</span>' +
          '<span class="health-saved-record-meta">' +
          esc(done + '/' + HEALTH_CHECK_KEYS.length + ' checks' + (when ? ' · ' + when : '')) +
          '</span></button></li>'
        );
      })
      .join('');
    if (!list.dataset.bound) {
      list.dataset.bound = '1';
      list.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-health-project-id]');
        if (!btn) return;
        var pid = btn.getAttribute('data-health-project-id');
        var sel = document.getElementById('health-project-select');
        if (sel) {
          ensureHealthSelectOption(pid);
          sel.value = pid;
        }
        loadHealthForProject(pid);
      });
    }
  }

  function refreshHealthUiAfterData(autoSelect) {
    renderHealthSavedRecordsList();
    updateHealthLoadBanner();
    var sel = document.getElementById('health-project-select');
    if (!sel) return;
    if (autoSelect !== false) {
      var autoId = pickAutoHealthProjectId();
      if (autoId) {
        ensureHealthSelectOption(autoId);
        sel.value = autoId;
        healthSelectedProjectId = autoId;
      }
    }
    if (sel.value) {
      setHealthFormEnabled(true);
      applyHealthToForm(agencyHealthByProject[sel.value] || null);
    }
    if (clientProjectsSelectedId) renderClientProjectsWorkspace();
  }

  function fetchFirebaseHealthOnce() {
    if (!rtdbReady()) return Promise.resolve();
    return window
      .rtdbGet(window.rtdbRef(window.rtdb, PATHS.firebaseHealth))
      .then(function (snap) {
        mergeHealthSnapshot(snap.val());
        refreshHealthUiAfterData(true);
      })
      .catch(function (err) {
        console.error('Firebase Health: could not load agencyFirebaseHealth', err);
        setHealthSaveFeedback(
          (err && err.message) ? err.message : 'Could not load health records from Firebase.',
          true
        );
      });
  }

  function healthTimestampLabel(value) {
    if (value == null || value === '') return '';
    var ms;
    if (typeof value === 'number') ms = value;
    else if (value && typeof value.toDate === 'function') ms = value.toDate().getTime();
    else if (value && typeof value === 'object' && value.seconds != null) {
      ms = value.seconds * 1000;
    } else {
      ms = new Date(value).getTime();
    }
    if (!ms || isNaN(ms)) return '';
    try {
      return new Date(ms).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  }

  function healthCheckedCount(h) {
    if (!h) return 0;
    return HEALTH_CHECK_KEYS.filter(function (key) { return h[key]; }).length;
  }

  function setHealthFormEnabled(enabled) {
    var card = document.getElementById('health-checklist-card');
    var notes = document.getElementById('health-notes');
    var save = document.getElementById('health-save-btn');
    if (card) card.disabled = !enabled;
    if (notes) notes.disabled = !enabled;
    if (save) save.disabled = !enabled;
  }

  function clearHealthForm(disableForm) {
    HEALTH_CHECK_KEYS.forEach(function (key) {
      var el = document.getElementById('health-' + key);
      if (el) el.checked = false;
    });
    var notes = document.getElementById('health-notes');
    if (notes) notes.value = '';
    var meta = document.getElementById('health-status-meta');
    if (meta) {
      meta.hidden = true;
      meta.textContent = '';
      meta.classList.remove('is-empty');
    }
    var feedback = document.getElementById('health-save-feedback');
    if (feedback) {
      feedback.textContent = '';
      feedback.classList.remove('is-success', 'is-error');
    }
    if (disableForm) setHealthFormEnabled(false);
  }

  function applyHealthToForm(h) {
    var normalized = h ? normalizeHealthRecord(h) : null;
    HEALTH_CHECK_KEYS.forEach(function (key) {
      var el = document.getElementById('health-' + key);
      if (el) el.checked = normalized ? !!normalized[key] : false;
    });
    var notes = document.getElementById('health-notes');
    if (notes) notes.value = normalized ? normalized.notes : '';

    var meta = document.getElementById('health-status-meta');
    if (meta) {
      if (!normalized) {
        meta.hidden = false;
        meta.textContent = 'No saved health check for this project yet.';
        meta.classList.add('is-empty');
      } else {
        var when = healthTimestampLabel(normalized.updatedAt);
        var done = healthCheckedCount(normalized);
        meta.hidden = false;
        meta.classList.remove('is-empty');
        meta.textContent =
          (when ? 'Last saved ' + when + '. ' : 'Saved. ') +
          done +
          ' of ' +
          HEALTH_CHECK_KEYS.length +
          ' checks complete.';
      }
    }
  }

  function healthSelectHasOption(sel, projectId) {
    var i;
    for (i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === projectId) return true;
    }
    return false;
  }

  function ensureHealthSelectOption(projectId) {
    var sel = document.getElementById('health-project-select');
    if (!sel || !projectId || healthSelectHasOption(sel, projectId)) return;
    var opt = document.createElement('option');
    opt.value = projectId;
    opt.textContent = healthProjectLabel(projectId) + ' (saved in Firebase)';
    sel.appendChild(opt);
  }

  function renderFirebaseHealthProjectSelect() {
    var sel = document.getElementById('health-project-select');
    if (!sel) return;
    var previous = healthSelectedProjectId || sel.value || '';
    sel.innerHTML =
      '<option value="">Select project hub…</option>' +
      agencyProjects
        .map(function (p) {
          return (
            '<option value="' +
            esc(p.id) +
            '">' +
            esc(p.clientName || p.title || p.id) +
            '</option>'
          );
        })
        .join('');
    if (previous && agencyProjects.some(function (p) { return p.id === previous; })) {
      sel.value = previous;
      healthSelectedProjectId = previous;
    } else {
      sel.value = '';
      healthSelectedProjectId = '';
    }
  }

  async function loadHealthForProject(projectId) {
    healthSelectedProjectId = projectId || '';
    if (!projectId) {
      clearHealthForm(true);
      updateHealthLoadBanner();
      return;
    }
    setHealthFormEnabled(true);
    ensureHealthSelectOption(projectId);

    if (agencyHealthByProject[projectId]) {
      applyHealthToForm(agencyHealthByProject[projectId]);
      setHealthSaveFeedback('', false);
      return;
    }

    if (!rtdbReady()) {
      applyHealthToForm(null);
      setHealthSaveFeedback('Realtime Database is not ready.', true);
      return;
    }

    try {
      var snap = await window.rtdbGet(
        window.rtdbRef(window.rtdb, PATHS.firebaseHealth + '/' + projectId)
      );
      var raw = snap.val();
      if (raw && typeof raw === 'object') {
        var normalized = normalizeHealthRecord(raw);
        if (normalized) agencyHealthByProject[projectId] = normalized;
      }
      applyHealthToForm(agencyHealthByProject[projectId] || null);
      renderHealthSavedRecordsList();
      setHealthSaveFeedback('', false);
    } catch (err) {
      console.error('Firebase Health: could not load', err);
      applyHealthToForm(null);
      setHealthSaveFeedback(
        (err && err.message) ? err.message : 'Could not load health check.',
        true
      );
    }
  }

  function setHealthSaveFeedback(message, isError) {
    var el = document.getElementById('health-save-feedback');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('is-success', !!message && !isError);
    el.classList.toggle('is-error', !!message && !!isError);
  }

  async function saveHealth() {
    var sel = document.getElementById('health-project-select');
    var projectId = sel ? sel.value : '';
    if (!projectId || !rtdbReady()) {
      setHealthSaveFeedback('Select a project hub first.', true);
      return;
    }
    var payload = {
      rulesOk: !!document.getElementById('health-rulesOk').checked,
      authOk: !!document.getElementById('health-authOk').checked,
      functionsOk: !!document.getElementById('health-functionsOk').checked,
      rtdbOk: !!document.getElementById('health-rtdbOk').checked,
      hostingOk: !!document.getElementById('health-hostingOk').checked,
      notes: document.getElementById('health-notes').value.trim(),
      updatedAt: ts()
    };
    try {
      await window.rtdbSet(
        window.rtdbRef(window.rtdb, PATHS.firebaseHealth + '/' + projectId),
        payload
      );
      agencyHealthByProject[projectId] = normalizeHealthRecord(payload);
      applyHealthToForm(agencyHealthByProject[projectId]);
      renderHealthSavedRecordsList();
      updateHealthLoadBanner();
      setHealthSaveFeedback('Health check saved.', false);
      if (typeof window.renderAdminOverview === 'function') window.renderAdminOverview();
    } catch (err) {
      console.error('Firebase Health: save failed', err);
      setHealthSaveFeedback((err && err.message) ? err.message : 'Save failed.', true);
    }
  }

  function refreshFirebaseHealthPanel() {
    renderFirebaseHealthProjectSelect();
    fetchFirebaseHealthOnce().then(function () {
      var sel = document.getElementById('health-project-select');
      if (sel && sel.value) {
        return loadHealthForProject(sel.value);
      }
      if (!Object.keys(agencyHealthByProject).length) {
        clearHealthForm(true);
      }
    });
  }

  function initFirebaseHealth() {
    var sel = document.getElementById('health-project-select');
    if (sel && !sel.dataset.healthBound) {
      sel.dataset.healthBound = '1';
      sel.addEventListener('change', function () {
        loadHealthForProject(sel.value);
      });
    }
    var save = document.getElementById('health-save-btn');
    if (save && !save.dataset.healthBound) {
      save.dataset.healthBound = '1';
      save.addEventListener('click', function () {
        saveHealth().catch(console.error);
      });
    }
    updateHealthLoadBanner();
  }

  // ——— Clients Projects (unified workspace) ———
  var clientProjectsSelectedId = '';
  var clientProjectsSearchQuery = '';
  var clientProjectsBound = false;
  var clientProjectsPickerBound = false;
  var cpSectionCollapseByHub = {};

  function cpMoney(amount) {
    if (typeof window.formatPipelineMoney === 'function') return window.formatPipelineMoney(amount);
    var n = Number(amount);
    if (isNaN(n) || n < 0) return '$0';
    return '$' + Math.round(n).toLocaleString();
  }

  function cpStageLabel(stage) {
    if (typeof window.pipelineStageLabel === 'function') return window.pipelineStageLabel(stage);
    return stage || '';
  }

  function findMaintenanceForHub(hub) {
    if (!hub) return null;
    var byProject = agencyMaintenance.find(function (m) {
      return m.projectId === hub.id;
    });
    if (byProject) return byProject;
    var cn = (hub.clientName || '').toLowerCase().trim();
    if (!cn) return null;
    return (
      agencyMaintenance.find(function (m) {
        return (m.clientName || '').toLowerCase().trim() === cn;
      }) || null
    );
  }

  function findBusinessDocsForHub(hub) {
    if (!hub || typeof window.getBusinessDocsSnapshot !== 'function') return [];
    var docs = window.getBusinessDocsSnapshot();
    var bid = hub.businessDocId || '';
    var cn = (hub.clientName || '').toLowerCase().trim();
    return docs.filter(function (d) {
      if (bid && d.id === bid) return true;
      if (cn && (d.clientName || '').toLowerCase().trim() === cn) return true;
      return false;
    });
  }

  function findPortfolioForHub(hub) {
    if (!hub) return null;
    var list = getPortfolioList();
    if (hub.portfolioProjectId) {
      var linked = list.find(function (p) {
        return p.id === hub.portfolioProjectId;
      });
      if (linked) return linked;
    }
    var title = (hub.title || hub.clientName || '').toLowerCase().trim();
    if (!title) return null;
    return (
      list.find(function (p) {
        var pt = (p.title || '').toLowerCase();
        return pt.indexOf(title) >= 0 || title.indexOf(pt) >= 0;
      }) || null
    );
  }

  function getHubById(id) {
    return agencyProjects.find(function (p) {
      return p.id === id;
    });
  }

  function clientPickerInitials(name) {
    var parts = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  function getClientPickerMeta(hub) {
    if (!hub) return { milestones: '0/0', milestonesPct: 0, healthLabel: 'Health —', healthClass: '', maintPending: false };
    var done = (hub.milestones || []).filter(function (m) {
      return m.done;
    }).length;
    var total = hub.milestones ? hub.milestones.length : 0;
    var health = agencyHealthByProject[hub.id];
    var healthDone = health ? healthCheckedCount(health) : 0;
    var healthClass = healthDone >= HEALTH_CHECK_KEYS.length ? 'is-good' : healthDone > 0 ? 'is-warn' : '';
    var maint = findMaintenanceForHub(hub);
    var maintPending = !!(maint && maint.effectivePlanStatus === 'pending');
    return {
      milestones: done + '/' + (total || 0),
      milestonesPct: total ? Math.round((done / total) * 100) : 0,
      milestonesDone: done,
      milestonesTotal: total,
      healthLabel: 'Health ' + healthDone + '/' + HEALTH_CHECK_KEYS.length,
      healthClass: healthClass,
      maintPending: maintPending,
      maintTier: maint && maint.planTier ? maint.planTier : ''
    };
  }

  function hubMatchesClientSearch(hub, query) {
    if (!query) return true;
    var hay = ((hub.clientName || '') + ' ' + (hub.title || '')).toLowerCase();
    return hay.indexOf(query) >= 0;
  }

  function leadMatchesClientSearch(lead, query) {
    if (!query) return true;
    var hay = ((lead.name || '') + ' ' + (lead.company || '')).toLowerCase();
    return hay.indexOf(query) >= 0;
  }

  function getDepositLeadsWithoutHub() {
    if (typeof window.getPipelineLeadsSnapshot !== 'function') return [];
    return window.getPipelineLeadsSnapshot().filter(function (lead) {
      if (lead.stage !== 'deposit') return false;
      return !agencyProjects.some(function (p) {
        return p.leadId === lead.id;
      });
    });
  }

  function renderCpDepositLeadCard(lead) {
    var title = (lead.name || lead.company || 'Untitled lead').trim();
    var sub = lead.company && lead.name && lead.company !== lead.name ? lead.company : cpStageLabel('deposit');
    var initials = clientPickerInitials(title);
    return (
      '<li role="presentation">' +
      '<button type="button" class="cp-client-picker-card cp-client-picker-card--deposit cp-client-picker-row" ' +
      'role="option" aria-selected="false" data-cp-lead-id="' + esc(lead.id) + '">' +
      '<span class="cp-client-picker-avatar" aria-hidden="true">' + esc(initials) + '</span>' +
      '<span class="cp-client-picker-row-main">' +
      '<span class="cp-client-picker-row-head">' +
      '<span class="cp-client-picker-card-title">' + esc(title) + '</span>' +
      '<span class="cp-client-picker-row-badges">' +
      '<span class="cp-client-picker-badge is-deposit">Deposit paid</span>' +
      '<span class="cp-client-picker-badge">' + esc(cpMoney(lead.value)) + '</span>' +
      '</span></span>' +
      '<span class="cp-client-picker-card-sub">' + esc(sub) + ' · Ready to onboard</span>' +
      '</span>' +
      '<ion-icon name="add-circle-outline" class="cp-client-picker-chevron" aria-hidden="true"></ion-icon>' +
      '</button></li>'
    );
  }

  function renderCpHubPickerCard(p) {
    var title = (p.clientName || p.title || 'Untitled').trim();
    var sub =
      p.title && p.clientName && p.title !== p.clientName ? p.title : p.firebaseProjectId || 'Client project';
    var meta = getClientPickerMeta(p);
    var selected = clientProjectsSelectedId === p.id;
    var initials = clientPickerInitials(title);
    var maintBadge = meta.maintPending
      ? '<span class="cp-client-picker-badge is-pending">Plan pending</span>'
      : '';
    return (
      '<li role="presentation">' +
      '<button type="button" class="cp-client-picker-card cp-client-picker-row' + (selected ? ' is-selected' : '') + '" ' +
      'role="option" aria-selected="' + (selected ? 'true' : 'false') + '" ' +
      'data-cp-client-id="' + esc(p.id) + '">' +
      '<span class="cp-client-picker-avatar" aria-hidden="true">' + esc(initials) + '</span>' +
      '<span class="cp-client-picker-row-main">' +
      '<span class="cp-client-picker-row-head">' +
      '<span class="cp-client-picker-card-title">' + esc(title) + '</span>' +
      '<span class="cp-client-picker-row-badges">' +
      maintBadge +
      '<span class="cp-client-picker-badge ' + esc(meta.healthClass) + '">' + esc(meta.healthLabel) + '</span>' +
      '</span></span>' +
      '<span class="cp-client-picker-card-sub">' + esc(sub) + '</span>' +
      (meta.milestonesTotal
        ? '<span class="cp-client-picker-progress" aria-label="' +
          esc(meta.milestones + ' milestones complete') +
          '">' +
          '<span class="cp-client-picker-progress-track">' +
          '<span class="cp-client-picker-progress-fill" style="width:' +
          esc(String(meta.milestonesPct)) +
          '%"></span></span>' +
          '<span class="cp-client-picker-progress-label">' +
          esc(meta.milestones) +
          ' milestones</span></span>'
        : '<span class="cp-client-picker-progress-label cp-client-picker-progress-label--empty">No milestones</span>') +
      '</span>' +
      '<ion-icon name="chevron-forward-outline" class="cp-client-picker-chevron" aria-hidden="true"></ion-icon>' +
      '</button></li>'
    );
  }

  var CP_DRAWER_TRANSITION_MS = 380;

  function mountCpClientDrawerToBody() {
    var drawer = document.getElementById('cp-client-drawer');
    var overlay = document.getElementById('cp-client-drawer-overlay');
    if (overlay && overlay.parentElement !== document.body) {
      document.body.appendChild(overlay);
    }
    if (drawer && drawer.parentElement !== document.body) {
      document.body.appendChild(drawer);
    }
  }

  function isCpClientDrawerOpen() {
    var drawer = document.getElementById('cp-client-drawer');
    return !!(drawer && !drawer.hidden);
  }

  function openCpClientDrawer() {
    mountCpClientDrawerToBody();
    var drawer = document.getElementById('cp-client-drawer');
    var overlay = document.getElementById('cp-client-drawer-overlay');
    if (!drawer || !overlay) return;

    drawer.hidden = false;
    drawer.setAttribute('aria-hidden', 'false');
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cp-client-drawer-open');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        drawer.classList.add('is-open');
        overlay.classList.add('is-open');
      });
    });
  }

  function closeCpClientDrawer() {
    var drawer = document.getElementById('cp-client-drawer');
    var overlay = document.getElementById('cp-client-drawer-overlay');
    if (drawer) drawer.classList.remove('is-open');
    if (overlay) overlay.classList.remove('is-open');
    document.body.classList.remove('cp-client-drawer-open');

    function finishClose() {
      if (drawer) {
        drawer.hidden = true;
        drawer.setAttribute('aria-hidden', 'true');
      }
      if (overlay) {
        overlay.hidden = true;
        overlay.setAttribute('aria-hidden', 'true');
      }
      clientProjectsSelectedId = '';
      var workspace = document.getElementById('client-projects-workspace');
      if (workspace) workspace.innerHTML = '';
      var shell = document.querySelector('.client-projects-shell');
      if (shell) shell.classList.remove('has-client-selected');
      renderClientProjectsPickerList();
    }

    if (!drawer || drawer.hidden) {
      finishClose();
      return;
    }
    window.setTimeout(finishClose, CP_DRAWER_TRANSITION_MS);
  }

  function selectClientProject(hubId) {
    if (!hubId) {
      closeCpClientDrawer();
      return;
    }
    if (clientProjectsSelectedId === hubId && isCpClientDrawerOpen()) {
      closeCpClientDrawer();
      return;
    }
    clientProjectsSelectedId = hubId;
    delete cpSectionCollapseByHub[hubId];
    var shell = document.querySelector('.client-projects-shell');
    if (shell) shell.classList.add('has-client-selected');
    renderClientProjectsPickerList();
    renderClientProjectsWorkspace();
    openCpClientDrawer();
    var card = document.querySelector('.cp-client-picker-card.is-selected');
    if (card && typeof card.scrollIntoView === 'function') {
      card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function setCpFeedback(section, message, isError) {
    var root = document.getElementById('client-projects-workspace');
    if (!root) return;
    var el = root.querySelector('[data-cp-feedback="' + section + '"]');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('is-success', !!message && !isError);
    el.classList.toggle('is-error', !!message && !!isError);
  }

  function renderCpMilestonesHtml(milestones) {
    return (milestones || []).map(function (m, i) {
      return (
        '<li class="hub-milestone cp-hub-milestone">' +
        '<input type="checkbox" data-cp-milestone-done="' + i + '" ' + (m.done ? 'checked' : '') + '>' +
        '<input type="text" class="form-input hub-milestone-label" data-cp-milestone-label="' + i + '" value="' + esc(m.label) + '">' +
        '</li>'
      );
    }).join('');
  }

  function snapshotCpSectionCollapse(hubId) {
    var workspace = document.getElementById('client-projects-workspace');
    if (!workspace || clientProjectsSelectedId !== hubId) return;
    var state = {};
    workspace.querySelectorAll('.cp-section--collapsible[data-cp-section]').forEach(function (sec) {
      state[sec.getAttribute('data-cp-section')] = sec.classList.contains('is-expanded');
    });
    if (Object.keys(state).length) cpSectionCollapseByHub[hubId] = state;
  }

  function isCpSectionExpanded(hubId, sectionId) {
    var hubState = cpSectionCollapseByHub[hubId];
    if (!hubState || hubState[sectionId] === undefined) {
      return sectionId === 'hub';
    }
    return !!hubState[sectionId];
  }

  function saveCpSectionCollapse(hubId, sectionId, expanded) {
    if (!cpSectionCollapseByHub[hubId]) cpSectionCollapseByHub[hubId] = {};
    cpSectionCollapseByHub[hubId][sectionId] = expanded;
  }

  function toggleCpSection(sectionEl) {
    if (!sectionEl) return;
    var sectionId = sectionEl.getAttribute('data-cp-section');
    var next = !sectionEl.classList.contains('is-expanded');
    sectionEl.classList.toggle('is-expanded', next);
    var btn = sectionEl.querySelector('.cp-section-toggle');
    if (btn) btn.setAttribute('aria-expanded', next ? 'true' : 'false');
    if (clientProjectsSelectedId) saveCpSectionCollapse(clientProjectsSelectedId, sectionId, next);
    if (next && typeof sectionEl.scrollIntoView === 'function') {
      window.requestAnimationFrame(function () {
        sectionEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    }
  }

  function cpSectionSummary(id, ctx) {
    var hub = ctx.hub;
    var maint = ctx.maint;
    var health = ctx.health;
    var lead = ctx.lead;
    var docs = ctx.docs;
    var portfolio = ctx.portfolio;
    if (id === 'hub') {
      var done = (hub.milestones || []).filter(function (m) {
        return m.done;
      }).length;
      var total = hub.milestones ? hub.milestones.length : 0;
      return done + '/' + total + ' milestones';
    }
    if (id === 'maintenance') {
      if (hub.showMaintenanceInPortal === false) return 'Hidden from portal';
      if (!maint) return 'No record';
      if (maint.effectivePlanStatus === 'pending') {
        return 'Pending · ' + (maint.planTier || 'standard');
      }
      return maint.hoursUsed + '/' + maint.hoursIncluded + ' hrs';
    }
    if (id === 'health') {
      var hDone = health ? healthCheckedCount(health) : 0;
      return 'Health ' + hDone + '/' + HEALTH_CHECK_KEYS.length;
    }
    if (id === 'pipeline') {
      if (!lead) return 'No lead linked';
      return cpStageLabel(lead.stage) + ' · ' + cpMoney(lead.value);
    }
    if (id === 'docs') {
      if (!docs.length) return 'No documents';
      return docs.length + (docs.length === 1 ? ' document' : ' documents');
    }
    if (id === 'guide') {
      if (!hub.portalCanvasDocUrl) return 'No guide';
      return hub.portalCanvasDocTitle || 'Guide set';
    }
    if (id === 'portfolio') {
      if (!hub.portfolioProjectId && !portfolio) return 'Not linked';
      if (portfolio && hub.portfolioProjectId === portfolio.id) return portfolio.title || 'Linked';
      return 'Save link for portal';
    }
    return '';
  }

  function renderCpShowMaintPortalHtml(hub) {
    return (
      '<div class="form-group form-group-checkbox-row">' +
      '<label class="portfolio-project-checkbox">' +
      '<input type="checkbox" id="cp-hub-show-maint-portal"' +
      (hub.showMaintenanceInPortal !== false ? ' checked' : '') +
      '>' +
      '<span>Show maintenance &amp; support in client portal</span></label>' +
      '<p class="form-hint">Uncheck when this client is not on maintenance billing — hides the plan upsell from their portal.</p></div>'
    );
  }

  function readCpShowMaintPortalChecked(existing) {
    var el = document.getElementById('cp-hub-show-maint-portal');
    if (el) return !!el.checked;
    return existing ? existing.showMaintenanceInPortal !== false : true;
  }

  function renderCpHubPortalHtml(hub) {
    var token = hub && hub.portalToken;
    var expires = hub && hub.portalExpiresAt;
    if (!token || (expires && expires < Date.now())) {
      return (
        '<div class="cp-hub-portal-empty">' +
        '<p class="form-hint">No active client portal link.</p>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="generate-portal">Generate client link</button></div>'
      );
    }
    var url = clientPortalUrl(token);
    var expiryLabel = formatPortalExpiry(expires);
    return (
      '<div class="hub-portal-link-box cp-hub-portal">' +
      '<span class="hub-portal-link-label">Client link' + (expiryLabel ? ' · expires ' + esc(expiryLabel) : ' (90 days)') + '</span>' +
      '<a class="hub-portal-link-url" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(url) + '</a>' +
      '<div class="cp-hub-portal-actions">' +
      '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="copy-portal">Copy link</button>' +
      '<button type="button" class="btn btn-primary btn-sm" data-cp-action="email-portal">Email portal link</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="generate-portal">Regenerate link</button>' +
      '</div></div>'
    );
  }

  function buildCpCollapsibleSection(sectionId, title, tabId, bodyHtml, summary, expanded) {
    var isOpen = expanded === true;
    var panelId = 'cp-section-panel-' + sectionId;
    var tabLink = tabId
      ? '<button type="button" class="cp-section-link" data-cp-action="open-tab" data-tab="' + esc(tabId) + '">Open full tab →</button>'
      : '';
    return (
      '<section class="cp-section cp-section--collapsible' + (isOpen ? ' is-expanded' : '') + '" data-cp-section="' + esc(sectionId) + '">' +
      '<div class="cp-section-header">' +
      '<button type="button" class="cp-section-toggle" data-cp-action="toggle-section" aria-expanded="' + (isOpen ? 'true' : 'false') + '" aria-controls="' + panelId + '">' +
      '<ion-icon name="chevron-down-outline" class="cp-section-chevron" aria-hidden="true"></ion-icon>' +
      '<span class="cp-section-toggle-text">' +
      '<span class="cp-section-toggle-title">' + esc(title) + '</span>' +
      (summary ? '<span class="cp-section-toggle-summary">' + esc(summary) + '</span>' : '') +
      '</span></button>' +
      tabLink +
      '</div>' +
      '<div class="cp-section-collapse-wrap" id="' + panelId + '">' +
      '<div class="cp-section-collapse-inner"><div class="cp-section-body">' + bodyHtml + '</div></div></div></section>'
    );
  }

  function collectCpMilestonesFromWorkspace(root) {
    var labels = root.querySelectorAll('[data-cp-milestone-label]');
    var out = [];
    labels.forEach(function (inp, i) {
      var chk = root.querySelector('[data-cp-milestone-done="' + i + '"]');
      out.push({
        id: 'm' + i,
        label: inp.value.trim(),
        done: chk ? chk.checked : false
      });
    });
    return out;
  }

  function renderClientProjectsWorkspace() {
    var workspace = document.getElementById('client-projects-workspace');
    var titleEl = document.getElementById('cp-client-drawer-title');
    if (!workspace) return;

    if (!clientProjectsSelectedId) {
      if (titleEl) titleEl.textContent = 'Client workspace';
      workspace.innerHTML = '';
      return;
    }

    var hub = getHubById(clientProjectsSelectedId);
    if (!hub) {
      closeCpClientDrawer();
      return;
    }

    if (titleEl) {
      titleEl.textContent = hub.clientName || hub.title || 'Client workspace';
    }

    snapshotCpSectionCollapse(hub.id);
    var sectionCtx = { hub: hub };

    var maint = findMaintenanceForHub(hub);
    var health = agencyHealthByProject[hub.id] || null;
    var lead = hub.leadId && typeof window.findPipelineLead === 'function' ? window.findPipelineLead(hub.leadId) : null;
    var docs = findBusinessDocsForHub(hub);
    var portfolio = findPortfolioForHub(hub);
    var portfolioList = getPortfolioList();
    var healthDone = health ? healthCheckedCount(health) : 0;

    var portfolioOptions =
      '<option value="">Link a portfolio project…</option>' +
      portfolioList
        .map(function (p) {
          var selected = !!(hub.portfolioProjectId && hub.portfolioProjectId === p.id);
          var privateLabel = isPortfolioEntryPublic(p) ? '' : ' (Private)';
          return '<option value="' + esc(p.id) + '" ' + (selected ? 'selected' : '') + '>' + esc(p.title || p.id) + esc(privateLabel) + '</option>';
        })
        .join('');

    var docsHtml = '';
    if (docs.length) {
      docsHtml =
        '<ul class="cp-docs-list">' +
        docs
          .map(function (d) {
            return (
              '<li>' +
              '<div><strong>' + esc(d.type || 'doc') + '</strong> · ' + esc(d.clientName || '') +
              '<div class="cp-docs-meta">' + esc(d.status || '') + ' · ' + cpMoney(d.total) + '</div></div>' +
              '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="edit-doc" data-doc-id="' + esc(d.id) + '">Edit</button>' +
              '</li>'
            );
          })
          .join('') +
        '</ul>';
    } else {
      docsHtml =
        '<div class="cp-section-empty">' +
        '<p>No business documents linked yet.</p>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="add-doc">Add business document →</button>' +
        '</div>';
    }

    var portfolioHtml = '';
    var portfolioLinked = !!(hub.portfolioProjectId && portfolio && portfolio.id === hub.portfolioProjectId);
    var portfolioSuggested = !!(portfolio && !portfolioLinked);
    if (portfolio) {
      var imgUrl = '';
      if (Array.isArray(portfolio.imageUrls) && portfolio.imageUrls.length) imgUrl = portfolio.imageUrls[0];
      else if (portfolio.imageUrl) imgUrl = portfolio.imageUrl;
      portfolioHtml =
        '<div class="cp-portfolio-summary">' +
        (imgUrl ? '<img src="' + esc(imgUrl) + '" alt="" loading="lazy">' : '') +
        '<div><strong class="cp-portfolio-showcase-title">' +
        esc(portfolio.title || 'Portfolio project') +
        '</strong>' +
        (portfolio.category ? '<div class="cp-docs-meta">' + esc(portfolio.category) + '</div>' : '') +
        (!isPortfolioEntryPublic(portfolio) ? '<div class="cp-docs-meta">Private — shared via client portal only</div>' : '') +
        (portfolioLinked
          ? '<div class="cp-docs-meta">Linked to client portal</div>'
          : '<div class="cp-docs-meta cp-portfolio-link-warning">Not linked to portal yet — click Save link below</div>') +
        '</div>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="edit-portfolio" data-portfolio-id="' + esc(portfolio.id) + '">Edit showcase</button>' +
        '</div>';
    } else {
      portfolioHtml =
        '<div class="cp-section-empty">' +
        '<p>No client showcase linked yet. Private showcases stay off the public Portfolio tab — share them using the client portal link in Project Hub.</p>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="create-showcase">Create client showcase</button>' +
        '</div>';
    }

    sectionCtx.maint = maint;
    sectionCtx.health = health;
    sectionCtx.lead = lead;
    sectionCtx.docs = docs;
    sectionCtx.portfolio = portfolio;

    var hubBody =
      '<div class="cp-form-grid cp-form-grid--can-split">' +
      '<div class="form-group"><label for="cp-hub-client">Client name</label><input id="cp-hub-client" class="form-input" type="text" value="' + esc(hub.clientName) + '"></div>' +
      '<div class="form-group"><label for="cp-hub-client-email">Client email</label><input id="cp-hub-client-email" class="form-input" type="email" value="' + esc(hub.clientEmail || '') + '" placeholder="name@company.com" autocomplete="email"></div>' +
      '<div class="form-group"><label for="cp-hub-title">Project title</label><input id="cp-hub-title" class="form-input" type="text" value="' + esc(hub.title) + '"></div>' +
      '<div class="form-group"><label for="cp-hub-lead">Pipeline lead ID</label><input id="cp-hub-lead" class="form-input" type="text" value="' + esc(hub.leadId) + '" placeholder="Link to pipelineLeads id"></div>' +
      '<div class="form-group"><label for="cp-hub-firebase">Firebase project ID</label><input id="cp-hub-firebase" class="form-input" type="text" value="' + esc(hub.firebaseProjectId) + '"></div>' +
      '<div class="form-group"><label for="cp-hub-repo">Repo URL</label><input id="cp-hub-repo" class="form-input" type="url" value="' + esc(hub.repoUrl) + '"></div>' +
      '<div class="form-group"><label for="cp-hub-expo">Expo / demo URL</label><input id="cp-hub-expo" class="form-input" type="url" value="' + esc(hub.expoUrl) + '"></div>' +
      '<div class="form-group"><label for="cp-hub-doc-id">Business doc ID</label><input id="cp-hub-doc-id" class="form-input" type="text" value="' + esc(hub.businessDocId) + '"></div>' +
      '<div class="form-group form-group--full"><label for="cp-hub-notes">Notes</label><textarea id="cp-hub-notes" class="form-input has-scrollbar" rows="3">' + esc(hub.notes) + '</textarea></div>' +
      '</div>' +
      '<div class="form-group"><label>Milestones</label><ul class="cp-milestones-list" id="cp-hub-milestones">' + renderCpMilestonesHtml(hub.milestones) + '</ul></div>' +
      '<div class="form-group form-group--full"><label>Client portal</label>' + renderCpHubPortalHtml(hub) + '</div>' +
      '<div class="cp-section-actions">' +
      '<button type="button" class="btn btn-primary btn-sm" data-cp-action="save-hub">Save hub</button>' +
      '<button type="button" class="btn btn-danger btn-sm" data-cp-action="delete-hub">Delete client</button>' +
      '<p class="cp-section-feedback" data-cp-feedback="hub" role="status"></p></div>';

    var guideBody =
      '<div class="form-group"><label for="cp-portal-canvas-doc">Guide file (private)</label>' +
      '<input id="cp-portal-canvas-doc" class="form-input" type="text" value="' +
      esc(hub.portalCanvasDocUrl || '') +
      '" placeholder="/assets/docs/projects/rizo-features-guide.md">' +
      '<p class="form-hint">Path to a <code>.md</code> or <code>.pdf</code> in <code>/assets/docs/projects/</code>. Shown only in this client&apos;s portal — not on the public site. No portfolio link required.</p></div>' +
      '<div class="form-group"><label for="cp-portal-canvas-title">Guide section title</label>' +
      '<input id="cp-portal-canvas-title" class="form-input" type="text" maxlength="120" value="' +
      esc(hub.portalCanvasDocTitle || 'Project guide') +
      '" placeholder="New features guide">' +
      '<p class="form-hint">Heading above the guide in the client portal (e.g. &ldquo;New features guide&rdquo;).</p></div>' +
      '<div class="cp-section-actions">' +
      '<button type="button" class="btn btn-primary btn-sm" data-cp-action="save-guide">Save docs &amp; guide</button>' +
      '<p class="cp-section-feedback" data-cp-feedback="guide" role="status"></p></div>';

    var maintPendingBlock =
      maint && maint.effectivePlanStatus === 'pending'
        ? '<div class="cp-maint-pending-alert" role="status">' +
          '<p><strong>Plan request pending</strong> — ' +
          esc((maint.planTier || 'standard').charAt(0).toUpperCase() + (maint.planTier || 'standard').slice(1)) +
          ' · ' +
          esc(maint.billingPreference === 'annual' ? 'Annual billing' : 'Monthly billing') +
          '</p>' +
          '<div class="cp-section-actions">' +
          '<button type="button" class="btn btn-primary btn-sm" data-cp-action="approve-maint-plan">Approve plan</button>' +
          '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="decline-maint-plan">Decline</button>' +
          '</div></div>'
        : '';

    var maintBody = maint
      ? '<input type="hidden" id="cp-maint-id" value="' + esc(maint.id) + '">' +
        maintPendingBlock +
        renderCpShowMaintPortalHtml(hub) +
        '<div class="cp-form-grid cp-form-grid--can-split">' +
        '<div class="form-group"><label for="cp-maint-hours-included">Hours included</label><input id="cp-maint-hours-included" class="form-input" type="number" min="0" value="' + esc(String(maint.hoursIncluded)) + '"></div>' +
        '<div class="form-group"><label for="cp-maint-hours-used">Hours used</label><input id="cp-maint-hours-used" class="form-input" type="number" min="0" value="' + esc(String(maint.hoursUsed)) + '"></div>' +
        '<div class="form-group"><label for="cp-maint-renewal">Renewal date</label><input id="cp-maint-renewal" class="form-input" type="date" value="' + esc(maint.renewalDate) + '"></div>' +
        '<div class="form-group"><label for="cp-maint-sla">SLA (hours)</label><input id="cp-maint-sla" class="form-input" type="number" min="1" value="' + esc(String(maint.slaHours)) + '"></div>' +
        '<div class="form-group form-group--full"><label for="cp-maint-notes">Notes</label><textarea id="cp-maint-notes" class="form-input has-scrollbar" rows="2">' + esc(maint.notes) + '</textarea></div>' +
        '</div>' +
        '<div class="cp-section-actions">' +
        '<button type="button" class="btn btn-primary btn-sm" data-cp-action="save-maint">Save maintenance</button>' +
        '<button type="button" class="btn btn-danger btn-sm" data-cp-action="delete-maint">Delete maintenance</button>' +
        '<p class="cp-section-feedback" data-cp-feedback="maint" role="status"></p></div>'
      : renderCpShowMaintPortalHtml(hub) +
        '<div class="cp-section-actions">' +
        '<button type="button" class="btn btn-primary btn-sm" data-cp-action="save-maint-portal">Save portal visibility</button>' +
        '<p class="cp-section-feedback" data-cp-feedback="maint" role="status"></p></div>' +
        '<div class="cp-section-empty"><p>No maintenance record for this client yet.</p>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="add-maint">Add maintenance →</button></div>';

    var healthWhen = health ? healthTimestampLabel(health.updatedAt) : '';
    var healthBody =
      '<fieldset class="health-checklist-card cp-health-block">' +
      '<legend class="health-checklist-legend">Pre-renewal checklist</legend>' +
      '<p class="cp-health-meta health-status-meta">' + (healthWhen ? 'Last saved ' + esc(healthWhen) : 'Not saved yet') + '</p>' +
      '<p class="cp-health-status">' + healthDone + ' of ' + HEALTH_CHECK_KEYS.length + ' checks complete</p>' +
      '<ul class="health-checklist">' +
      HEALTH_CHECK_KEYS.map(function (key) {
        var labels = {
          rulesOk: 'Rules deployed',
          authOk: 'Auth configured',
          functionsOk: 'Functions healthy',
          rtdbOk: 'RTDB within limits',
          hostingOk: 'Hosting live'
        };
        return (
          '<li class="health-check-row">' +
          '<input type="checkbox" id="cp-health-' + key + '" name="cp-health-' + key + '" ' + (health && health[key] ? 'checked' : '') + '>' +
          '<label for="cp-health-' + key + '">' + esc(labels[key] || key) + '</label></li>'
        );
      }).join('') +
      '</ul></fieldset>' +
      '<div class="form-group"><label for="cp-health-notes">Notes</label><textarea id="cp-health-notes" class="form-input has-scrollbar" rows="3">' + esc(health ? health.notes : '') + '</textarea></div>' +
      '<div class="cp-section-actions">' +
      '<button type="button" class="btn btn-primary btn-sm" data-cp-action="save-health">Save health check</button>' +
      '<p class="cp-section-feedback" data-cp-feedback="health" role="status"></p></div>';

    var pipelineBody = lead
      ? '<p class="form-hint">' + esc(lead.name || lead.company || 'Lead') + ' · ' + cpStageLabel(lead.stage) + ' · ' + cpMoney(lead.value) + '</p>' +
        '<div class="cp-form-grid cp-form-grid--can-split">' +
        '<div class="form-group"><label for="cp-pipeline-stage">Stage</label><select id="cp-pipeline-stage" class="form-input">' +
        ['lead', 'proposal', 'deposit'].map(function (st) {
          return '<option value="' + st + '" ' + (lead.stage === st ? 'selected' : '') + '>' + esc(cpStageLabel(st)) + '</option>';
        }).join('') +
        '</select></div>' +
        '<div class="form-group"><label for="cp-pipeline-value">Deal value</label><input id="cp-pipeline-value" class="form-input" type="number" min="0" value="' + esc(String(lead.value || 0)) + '"></div>' +
        '<div class="form-group form-group--full"><label for="cp-pipeline-notes">Notes</label><textarea id="cp-pipeline-notes" class="form-input has-scrollbar" rows="2">' + esc(lead.notes) + '</textarea></div>' +
        '</div>' +
        '<div class="cp-section-actions">' +
        '<button type="button" class="btn btn-primary btn-sm" data-cp-action="save-pipeline">Save pipeline</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="edit-lead">Edit full lead →</button>' +
        '<p class="cp-section-feedback" data-cp-feedback="pipeline" role="status"></p></div>'
      : '<div class="cp-section-empty"><p>No pipeline lead linked. Add a Pipeline lead ID in Project Hub above, then save.</p>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="open-tab" data-tab="pipeline">Open Client Pipeline →</button></div>';

    var portfolioBody =
      portfolioHtml +
      '<div class="form-group"><label for="cp-portfolio-select">Link portfolio showcase (optional)</label>' +
      '<select id="cp-portfolio-select" class="form-input">' + portfolioOptions + '</select>' +
      (portfolioSuggested
        ? '<p class="form-hint cp-portfolio-link-warning">A showcase is selected but not saved on this client. Click <strong>Save showcase link</strong> so it appears on the client portal.</p>'
        : '<p class="form-hint">Optional slideshow + project detail page. For a guide only, use <strong>Docs &amp; guide</strong> above — no showcase link needed.</p>') +
      '</div>' +
      '<div class="cp-section-actions cp-section-actions--split">' +
      (portfolioLinked || hub.portfolioProjectId
        ? '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="unlink-portfolio">Unlink showcase</button>'
        : '') +
      '<button type="button" class="btn btn-primary btn-sm" data-cp-action="link-portfolio">Save showcase link</button>' +
      '<p class="cp-section-feedback" data-cp-feedback="portfolio" role="status"></p></div>';

    var emailClientName = hub.clientName || '';
    var emailClientEmail = hub.clientEmail || '';
    var emailPortalLink = hub.portalToken ? clientPortalUrl(hub.portalToken) : '';
    var emailBody =
      '<div class="cp-email-prefill">' +
      '<div class="cp-email-prefill-row"><span class="cp-email-prefill-label">To</span>' +
      '<span class="cp-email-prefill-value">' +
      (emailClientName ? esc(emailClientName) + (emailClientEmail ? ' &lt;' + esc(emailClientEmail) + '&gt;' : '') : '<em class="cp-email-prefill-missing">No client name or email saved in Project Hub</em>') +
      '</span></div>' +
      '<div class="cp-email-prefill-row"><span class="cp-email-prefill-label">Portal link</span>' +
      '<span class="cp-email-prefill-value">' +
      (emailPortalLink
        ? '<a href="' + esc(emailPortalLink) + '" target="_blank" rel="noopener" class="cp-email-prefill-link">' + esc(emailPortalLink) + '</a>'
        : '<em class="cp-email-prefill-missing">No portal link yet — generate one in Project Hub</em>') +
      '</span></div>' +
      '<p class="form-hint">Client name, email, and portal link will be pre-filled. You only need to choose a template and write the subject &amp; message.</p>' +
      '</div>' +
      '<div class="cp-section-actions">' +
      '<button type="button" class="btn btn-primary btn-sm" data-cp-action="open-email">Compose email →</button>' +
      '</div>';

    workspace.innerHTML =
      buildCpCollapsibleSection('hub', 'Project Hub', null, hubBody, cpSectionSummary('hub', sectionCtx), isCpSectionExpanded(hub.id, 'hub')) +
      buildCpCollapsibleSection('guide', 'Docs & guide', null, guideBody, cpSectionSummary('guide', sectionCtx), isCpSectionExpanded(hub.id, 'guide')) +
      buildCpCollapsibleSection('maintenance', 'Maintenance & SLA', null, maintBody, cpSectionSummary('maintenance', sectionCtx), isCpSectionExpanded(hub.id, 'maintenance')) +
      buildCpCollapsibleSection('health', 'Firebase Health', null, healthBody, cpSectionSummary('health', sectionCtx), isCpSectionExpanded(hub.id, 'health')) +
      buildCpCollapsibleSection('pipeline', 'Pipeline & deal', 'pipeline', pipelineBody, cpSectionSummary('pipeline', sectionCtx), isCpSectionExpanded(hub.id, 'pipeline')) +
      buildCpCollapsibleSection('docs', 'Business documents', 'docs', docsHtml, cpSectionSummary('docs', sectionCtx), isCpSectionExpanded(hub.id, 'docs')) +
      buildCpCollapsibleSection('portfolio', 'Portfolio project', 'portfolio', portfolioBody, cpSectionSummary('portfolio', sectionCtx), isCpSectionExpanded(hub.id, 'portfolio')) +
      buildCpCollapsibleSection('email', 'Send email', null, emailBody, cpSectionSummary('email', sectionCtx), isCpSectionExpanded(hub.id, 'email'));
  }

  function renderClientProjectsPickerList() {
    var list = document.getElementById('client-projects-picker-list');
    if (!list) return;
    var query = clientProjectsSearchQuery.toLowerCase().trim();
    var depositLeads = getDepositLeadsWithoutHub().filter(function (lead) {
      return leadMatchesClientSearch(lead, query);
    });
    var filtered = agencyProjects.filter(function (p) {
      return hubMatchesClientSearch(p, query);
    });
    filtered.sort(function (a, b) {
      var ma = findMaintenanceForHub(a);
      var mb = findMaintenanceForHub(b);
      var pa = ma && ma.effectivePlanStatus === 'pending' ? 0 : 1;
      var pb = mb && mb.effectivePlanStatus === 'pending' ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return String(a.clientName || a.title || '').localeCompare(String(b.clientName || b.title || ''), undefined, {
        sensitivity: 'base'
      });
    });
    var html = '';
    var clientCount = filtered.length + depositLeads.length;

    if (depositLeads.length) {
      html +=
        '<li class="cp-client-picker-section-label" role="presentation">Deposit paid — ready to onboard</li>' +
        depositLeads.map(renderCpDepositLeadCard).join('');
    }

    if (filtered.length) {
      if (depositLeads.length) {
        html += '<li class="cp-client-picker-section-label" role="presentation">Active clients (' + filtered.length + ')</li>';
      } else if (clientCount > 0) {
        html += '<li class="cp-client-picker-section-label" role="presentation">' + clientCount + (clientCount === 1 ? ' client' : ' clients') + '</li>';
      }
      html += filtered.map(renderCpHubPickerCard).join('');
    }

    if (!html) {
      if (!agencyProjects.length && !getDepositLeadsWithoutHub().length) {
        list.innerHTML =
          '<li class="cp-client-picker-empty">No clients yet. ' +
          '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="new-client">Add your first client</button></li>';
      } else {
        list.innerHTML = '<li class="cp-client-picker-empty">No clients match your search.</li>';
      }
      return;
    }

    list.innerHTML = html;
  }

  function refreshClientProjectsPicker() {
    var prev = clientProjectsSelectedId;
    if (prev && !agencyProjects.some(function (p) { return p.id === prev; })) {
      clientProjectsSelectedId = '';
    }
    renderClientProjectsPickerList();
  }

  function refreshClientProjectsWorkspace() {
    refreshClientProjectsPicker();
    renderClientProjectsWorkspace();
    renderClientProjectsPickerList();
  }

  async function saveHubFromClientWorkspace() {
    var hubId = clientProjectsSelectedId;
    if (!hubId || !rtdbReady()) return;
    var existing = getHubById(hubId);
    if (!existing) return;
    var root = document.getElementById('client-projects-workspace');
    var payload = {
      leadId: (document.getElementById('cp-hub-lead') || {}).value.trim(),
      clientName: (document.getElementById('cp-hub-client') || {}).value.trim(),
      clientEmail: (document.getElementById('cp-hub-client-email') || {}).value.trim(),
      title: (document.getElementById('cp-hub-title') || {}).value.trim(),
      repoUrl: (document.getElementById('cp-hub-repo') || {}).value.trim(),
      expoUrl: (document.getElementById('cp-hub-expo') || {}).value.trim(),
      firebaseProjectId: (document.getElementById('cp-hub-firebase') || {}).value.trim(),
      businessDocId: (document.getElementById('cp-hub-doc-id') || {}).value.trim(),
      portfolioProjectId: existing.portfolioProjectId || '',
      notes: (document.getElementById('cp-hub-notes') || {}).value.trim(),
      milestones: root ? collectCpMilestonesFromWorkspace(root) : existing.milestones,
      enabledModules: Array.isArray(existing.enabledModules) ? existing.enabledModules.slice() : [],
      showMaintenanceInPortal: readCpShowMaintPortalChecked(existing),
      portalCanvasDocUrl: existing.portalCanvasDocUrl || '',
      portalCanvasDocTitle: existing.portalCanvasDocTitle || 'Project guide',
      updatedAt: ts()
    };
    try {
      await saveProjectHubRecord(hubId, payload, false);
      setCpFeedback('hub', 'Hub saved.', false);
      renderClientProjectsWorkspace();
      if (typeof window.renderAdminOverview === 'function') window.renderAdminOverview();
    } catch (err) {
      console.error(err);
      setCpFeedback('hub', (err && err.message) || 'Save failed.', true);
    }
  }

  async function saveGuideFromClientWorkspace() {
    var hubId = clientProjectsSelectedId;
    if (!hubId || !rtdbReady()) return;
    var existing = getHubById(hubId);
    if (!existing) return;
    var payload = {
      leadId: existing.leadId,
      clientName: existing.clientName,
      clientEmail: existing.clientEmail || '',
      title: existing.title,
      repoUrl: existing.repoUrl,
      expoUrl: existing.expoUrl,
      firebaseProjectId: existing.firebaseProjectId,
      businessDocId: existing.businessDocId,
      portfolioProjectId: existing.portfolioProjectId || '',
      notes: existing.notes,
      milestones: existing.milestones,
      enabledModules: Array.isArray(existing.enabledModules) ? existing.enabledModules.slice() : [],
      showMaintenanceInPortal: existing.showMaintenanceInPortal !== false,
      portalCanvasDocUrl: normalizePortalCanvasDocUrl(
        (document.getElementById('cp-portal-canvas-doc') || {}).value
      ),
      portalCanvasDocTitle: String(
        (document.getElementById('cp-portal-canvas-title') || {}).value || 'Project guide'
      ).trim().slice(0, 120),
      updatedAt: ts()
    };
    try {
      await saveProjectHubRecord(hubId, payload, false);
      setCpFeedback('guide', 'Docs & guide saved — refresh the client portal to see changes.', false);
      renderClientProjectsWorkspace();
    } catch (err) {
      console.error(err);
      setCpFeedback('guide', (err && err.message) || 'Save failed.', true);
    }
  }

  async function updateHubShowMaintenanceInPortal() {
    var hubId = clientProjectsSelectedId;
    if (!hubId || !rtdbReady()) return;
    var existing = getHubById(hubId);
    if (!existing || !document.getElementById('cp-hub-show-maint-portal')) return;
    var payload = {
      leadId: existing.leadId,
      clientName: existing.clientName,
      clientEmail: existing.clientEmail || '',
      title: existing.title,
      repoUrl: existing.repoUrl,
      expoUrl: existing.expoUrl,
      firebaseProjectId: existing.firebaseProjectId,
      businessDocId: existing.businessDocId,
      portfolioProjectId: existing.portfolioProjectId || '',
      notes: existing.notes,
      milestones: existing.milestones,
      enabledModules: Array.isArray(existing.enabledModules) ? existing.enabledModules.slice() : [],
      showMaintenanceInPortal: readCpShowMaintPortalChecked(existing),
      portalCanvasDocUrl: existing.portalCanvasDocUrl || '',
      portalCanvasDocTitle: existing.portalCanvasDocTitle || 'Project guide',
      updatedAt: ts()
    };
    await saveProjectHubRecord(hubId, payload, false);
  }

  async function saveMaintPortalVisibilityFromClientWorkspace() {
    try {
      await updateHubShowMaintenanceInPortal();
      setCpFeedback('maint', 'Portal visibility saved.', false);
      renderClientProjectsWorkspace();
      if (typeof window.renderAdminOverview === 'function') window.renderAdminOverview();
    } catch (err) {
      console.error(err);
      setCpFeedback('maint', (err && err.message) || 'Save failed.', true);
    }
  }

  async function saveMaintFromClientWorkspace() {
    if (!rtdbReady()) return;
    var maintId = (document.getElementById('cp-maint-id') || {}).value.trim();
    if (!maintId) return;
    var hub = getHubById(clientProjectsSelectedId);
    var existing = agencyMaintenance.find(function (x) { return x.id === maintId; });
    var payload = {
      clientName: hub ? hub.clientName : '',
      leadId: hub ? hub.leadId : '',
      projectId: clientProjectsSelectedId,
      hoursIncluded: Number((document.getElementById('cp-maint-hours-included') || {}).value) || 4,
      hoursUsed: Number((document.getElementById('cp-maint-hours-used') || {}).value) || 0,
      renewalDate: (document.getElementById('cp-maint-renewal') || {}).value || '',
      slaHours: Number((document.getElementById('cp-maint-sla') || {}).value) || 48,
      notes: (document.getElementById('cp-maint-notes') || {}).value.trim(),
      updatedAt: ts()
    };
    if (existing) {
      payload.planTier = existing.planTier;
      payload.planStatus = existing.planStatus || existing.effectivePlanStatus || 'active';
      payload.billingPreference = existing.billingPreference || 'monthly';
      payload.planRequestedAt = existing.planRequestedAt || null;
      payload.tickets = existing.tickets || [];
    }
    try {
      await window.rtdbSet(window.rtdbRef(window.rtdb, PATHS.maintenance + '/' + maintId), payload);
      await updateHubShowMaintenanceInPortal();
      setCpFeedback('maint', 'Maintenance saved.', false);
      renderClientProjectsWorkspace();
      if (typeof window.renderAdminOverview === 'function') window.renderAdminOverview();
    } catch (err) {
      console.error(err);
      setCpFeedback('maint', (err && err.message) || 'Save failed.', true);
    }
  }

  async function approveMaintenancePlan(maintId) {
    if (!maintId || !rtdbReady()) return;
    var m = agencyMaintenance.find(function (x) { return x.id === maintId; });
    if (!m) return;
    var defs = maintenanceTierDefaults(m.planTier);
    var snap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATHS.maintenance + '/' + maintId));
    var row = snap.val() || {};
    var payload = Object.assign({}, row, defs, {
      planStatus: 'active',
      planTier: defs.planTier,
      updatedAt: ts()
    });
    await window.rtdbSet(window.rtdbRef(window.rtdb, PATHS.maintenance + '/' + maintId), payload);
  }

  async function declineMaintenancePlan(maintId) {
    if (!maintId || !rtdbReady()) return;
    var snap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATHS.maintenance + '/' + maintId));
    var row = snap.val() || {};
    var note = String(row.notes || '').trim();
    var declineNote = 'Plan request declined ' + new Date().toLocaleDateString() + '.';
    var payload = Object.assign({}, row, {
      planStatus: 'none',
      planRequestedAt: null,
      notes: note ? note + '\n' + declineNote : declineNote,
      updatedAt: ts()
    });
    await window.rtdbSet(window.rtdbRef(window.rtdb, PATHS.maintenance + '/' + maintId), payload);
  }

  async function createMaintenanceForHub(hub) {
    if (!hub || !rtdbReady()) return;
    var payload = {
      clientName: hub.clientName || hub.title || '',
      leadId: hub.leadId || '',
      projectId: hub.id,
      planTier: 'standard',
      planStatus: 'active',
      billingPreference: 'monthly',
      hoursIncluded: 4,
      hoursUsed: 0,
      renewalDate: '',
      slaHours: 48,
      notes: '',
      tickets: [],
      createdAt: ts(),
      updatedAt: ts()
    };
    try {
      var ref = window.rtdbPush(window.rtdbRef(window.rtdb, PATHS.maintenance));
      await window.rtdbSet(ref, payload);
    } catch (err) {
      console.error(err);
      alert('Could not create maintenance record.');
    }
  }

  async function saveHealthFromClientWorkspace() {
    var hubId = clientProjectsSelectedId;
    if (!hubId || !rtdbReady()) return;
    var payload = {
      rulesOk: !!(document.getElementById('cp-health-rulesOk') && document.getElementById('cp-health-rulesOk').checked),
      authOk: !!(document.getElementById('cp-health-authOk') && document.getElementById('cp-health-authOk').checked),
      functionsOk: !!(document.getElementById('cp-health-functionsOk') && document.getElementById('cp-health-functionsOk').checked),
      rtdbOk: !!(document.getElementById('cp-health-rtdbOk') && document.getElementById('cp-health-rtdbOk').checked),
      hostingOk: !!(document.getElementById('cp-health-hostingOk') && document.getElementById('cp-health-hostingOk').checked),
      notes: (document.getElementById('cp-health-notes') || {}).value.trim(),
      updatedAt: ts()
    };
    try {
      await window.rtdbSet(window.rtdbRef(window.rtdb, PATHS.firebaseHealth + '/' + hubId), payload);
      agencyHealthByProject[hubId] = normalizeHealthRecord(payload);
      setCpFeedback('health', 'Health check saved.', false);
      renderClientProjectsWorkspace();
      if (typeof window.renderAdminOverview === 'function') window.renderAdminOverview();
    } catch (err) {
      console.error(err);
      setCpFeedback('health', (err && err.message) || 'Save failed.', true);
    }
  }

  async function savePipelineFromClientWorkspace() {
    var hub = getHubById(clientProjectsSelectedId);
    if (!hub || !hub.leadId || typeof window.savePipelineLeadPartial !== 'function') return;
    try {
      await window.savePipelineLeadPartial(hub.leadId, {
        stage: (document.getElementById('cp-pipeline-stage') || {}).value,
        value: (document.getElementById('cp-pipeline-value') || {}).value,
        notes: (document.getElementById('cp-pipeline-notes') || {}).value
      });
      setCpFeedback('pipeline', 'Pipeline saved.', false);
      renderClientProjectsWorkspace();
      if (typeof window.renderAdminOverview === 'function') window.renderAdminOverview();
    } catch (err) {
      console.error(err);
      setCpFeedback('pipeline', (err && err.message) || 'Save failed.', true);
    }
  }

  async function linkHubToPortfolio(hubId, portfolioId) {
    if (!hubId || !portfolioId || !rtdbReady()) return;
    var existing = getHubById(hubId);
    if (!existing) return;
    var payload = {
      leadId: existing.leadId,
      clientName: existing.clientName,
      clientEmail: existing.clientEmail || '',
      title: existing.title,
      repoUrl: existing.repoUrl,
      expoUrl: existing.expoUrl,
      firebaseProjectId: existing.firebaseProjectId,
      businessDocId: existing.businessDocId,
      portfolioProjectId: portfolioId,
      notes: existing.notes,
      milestones: existing.milestones,
      enabledModules: existing.enabledModules,
      showMaintenanceInPortal: existing.showMaintenanceInPortal !== false,
      portalCanvasDocUrl: existing.portalCanvasDocUrl || '',
      portalCanvasDocTitle: existing.portalCanvasDocTitle || 'Project guide',
      updatedAt: ts()
    };
    await saveProjectHubRecord(hubId, payload, false);
    if (clientProjectsSelectedId === hubId) {
      setCpFeedback('portfolio', 'Client showcase created and linked.', false);
      renderClientProjectsWorkspace();
    }
  }

  async function linkPortfolioFromClientWorkspace() {
    var hubId = clientProjectsSelectedId;
    if (!hubId || !rtdbReady()) return;
    var existing = getHubById(hubId);
    if (!existing) return;
    var portfolioId = (document.getElementById('cp-portfolio-select') || {}).value.trim();
    if (!portfolioId) {
      setCpFeedback('portfolio', 'Select a portfolio project first, or use Unlink showcase.', true);
      return;
    }
    var payload = {
      leadId: existing.leadId,
      clientName: existing.clientName,
      clientEmail: existing.clientEmail || '',
      title: existing.title,
      repoUrl: existing.repoUrl,
      expoUrl: existing.expoUrl,
      firebaseProjectId: existing.firebaseProjectId,
      businessDocId: existing.businessDocId,
      portfolioProjectId: portfolioId,
      notes: existing.notes,
      milestones: existing.milestones,
      enabledModules: existing.enabledModules,
      showMaintenanceInPortal: existing.showMaintenanceInPortal !== false,
      portalCanvasDocUrl: existing.portalCanvasDocUrl || '',
      portalCanvasDocTitle: existing.portalCanvasDocTitle || 'Project guide',
      updatedAt: ts()
    };
    try {
      await saveProjectHubRecord(hubId, payload, false);
      setCpFeedback('portfolio', 'Showcase link saved — refresh the client portal to see changes.', false);
      renderClientProjectsWorkspace();
    } catch (err) {
      console.error(err);
      setCpFeedback('portfolio', (err && err.message) || 'Save failed.', true);
    }
  }

  async function unlinkPortfolioFromClientWorkspace() {
    var hubId = clientProjectsSelectedId;
    if (!hubId || !rtdbReady()) return;
    var existing = getHubById(hubId);
    if (!existing || !existing.portfolioProjectId) {
      setCpFeedback('portfolio', 'No showcase is linked to this client.', true);
      return;
    }
    var portfolio = findPortfolioForHub(existing);
    var label = (portfolio && portfolio.title) || existing.portfolioProjectId;
    if (
      !window.confirm(
        'Unlink “' + label + '” from this client portal?\n\nThe portfolio project is not deleted — only the client link is removed.'
      )
    ) {
      return;
    }
    var payload = {
      leadId: existing.leadId,
      clientName: existing.clientName,
      clientEmail: existing.clientEmail || '',
      title: existing.title,
      repoUrl: existing.repoUrl,
      expoUrl: existing.expoUrl,
      firebaseProjectId: existing.firebaseProjectId,
      businessDocId: existing.businessDocId,
      portfolioProjectId: '',
      notes: existing.notes,
      milestones: existing.milestones,
      enabledModules: existing.enabledModules,
      showMaintenanceInPortal: existing.showMaintenanceInPortal !== false,
      portalCanvasDocUrl: existing.portalCanvasDocUrl || '',
      portalCanvasDocTitle: existing.portalCanvasDocTitle || 'Project guide',
      updatedAt: ts()
    };
    try {
      await saveProjectHubRecord(hubId, payload, false);
      setCpFeedback('portfolio', 'Showcase unlinked — refresh the client portal to see changes.', false);
      renderClientProjectsWorkspace();
    } catch (err) {
      console.error(err);
      setCpFeedback('portfolio', (err && err.message) || 'Unlink failed.', true);
    }
  }

  function handleClientProjectsAction(action, el) {
    var hub = getHubById(clientProjectsSelectedId);
    if (action === 'new-client') {
      openNewClientModal();
      return;
    }
    if (action === 'toggle-section') {
      toggleCpSection(el.closest('.cp-section--collapsible'));
      return;
    }
    if (action === 'open-tab') {
      var tab = el.getAttribute('data-tab');
      closeCpClientDrawer();
      if (tab && typeof window.adminActivateTab === 'function') window.adminActivateTab(tab);
      return;
    }
    if (action === 'open-email') {
      if (!hub) return;
      var emailName = String((document.getElementById('cp-hub-client') || {}).value || hub.clientName || '').trim();
      var emailAddr = String((document.getElementById('cp-hub-client-email') || {}).value || hub.clientEmail || '').trim();
      var emailLink = hub.portalToken ? clientPortalUrl(hub.portalToken) : '';
      closeCpClientDrawer();
      window.requestAnimationFrame(function () {
        if (typeof window.adminActivateTab === 'function') window.adminActivateTab('client-email');
        if (typeof window.prefillAdminClientEmail === 'function') {
          window.prefillAdminClientEmail({ name: emailName, email: emailAddr, link: emailLink });
        }
      });
      return;
    }
    if (action === 'generate-portal') {
      if (!clientProjectsSelectedId) return;
      generateClientPortalLink(clientProjectsSelectedId)
        .then(function () {
          renderClientProjectsWorkspace();
        })
        .catch(console.error);
      return;
    }
    if (action === 'copy-portal') {
      if (!hub || !hub.portalToken) return;
      navigator.clipboard.writeText(clientPortalUrl(hub.portalToken)).catch(function () {});
      setCpFeedback('hub', 'Portal link copied.', false);
      return;
    }
    if (action === 'email-portal') {
      if (!hub) return;
      var emailHub = {
        portalToken: hub.portalToken,
        portalExpiresAt: hub.portalExpiresAt,
        clientEmail: String((document.getElementById('cp-hub-client-email') || {}).value || hub.clientEmail || '').trim(),
        clientName: String((document.getElementById('cp-hub-client') || {}).value || hub.clientName || '').trim(),
        title: String((document.getElementById('cp-hub-title') || {}).value || hub.title || '').trim()
      };
      emailPortalLinkToClient(emailHub)
        .then(function () {
          setCpFeedback('hub', 'Portal link emailed to ' + emailHub.clientEmail + '.', false);
        })
        .catch(function (err) {
          setCpFeedback('hub', (err && err.message) || 'Could not send portal email.', true);
        });
      return;
    }
    if (action === 'delete-hub') {
      if (clientProjectsSelectedId) openDeleteHubConfirmModal(clientProjectsSelectedId);
      return;
    }
    if (action === 'delete-maint') {
      var maintId = (document.getElementById('cp-maint-id') || {}).value.trim();
      if (maintId) openDeleteMaintConfirmModal(maintId);
      return;
    }
    if (action === 'save-hub') {
      saveHubFromClientWorkspace().catch(console.error);
      return;
    }
    if (action === 'save-guide') {
      saveGuideFromClientWorkspace().catch(console.error);
      return;
    }
    if (action === 'save-maint') {
      saveMaintFromClientWorkspace().catch(console.error);
      return;
    }
    if (action === 'save-maint-portal') {
      saveMaintPortalVisibilityFromClientWorkspace().catch(console.error);
      return;
    }
    if (action === 'add-maint') {
      if (hub) createMaintenanceForHub(hub).catch(console.error);
      return;
    }
    if (action === 'approve-maint-plan') {
      var approveId = (document.getElementById('cp-maint-id') || {}).value.trim();
      if (!approveId) return;
      approveMaintenancePlan(approveId)
        .then(function () {
          setCpFeedback('maint', 'Plan approved and activated.', false);
          renderClientProjectsWorkspace();
          if (typeof window.renderAdminOverview === 'function') window.renderAdminOverview();
        })
        .catch(function (err) {
          console.error(err);
          setCpFeedback('maint', (err && err.message) || 'Approve failed.', true);
        });
      return;
    }
    if (action === 'decline-maint-plan') {
      var declineId = (document.getElementById('cp-maint-id') || {}).value.trim();
      if (!declineId) return;
      declineMaintenancePlan(declineId)
        .then(function () {
          setCpFeedback('maint', 'Plan request declined.', false);
          renderClientProjectsWorkspace();
        })
        .catch(function (err) {
          console.error(err);
          setCpFeedback('maint', (err && err.message) || 'Decline failed.', true);
        });
      return;
    }
    if (action === 'save-health') {
      saveHealthFromClientWorkspace().catch(console.error);
      return;
    }
    if (action === 'save-pipeline') {
      savePipelineFromClientWorkspace().catch(console.error);
      return;
    }
    if (action === 'edit-lead' && hub && hub.leadId && typeof window.openLeadEditor === 'function') {
      window.openLeadEditor(hub.leadId);
      return;
    }
    if (action === 'edit-doc') {
      var docId = el.getAttribute('data-doc-id');
      if (docId && typeof window.openBusinessDocEditor === 'function') window.openBusinessDocEditor(docId);
      return;
    }
    if (action === 'add-doc') {
      if (typeof window.openNewBusinessDocForClient === 'function') {
        window.openNewBusinessDocForClient(hub ? hub.clientName : '');
      }
      return;
    }
    if (action === 'edit-portfolio') {
      var pid = el.getAttribute('data-portfolio-id');
      if (pid && typeof window.openPortfolioProjectEditor === 'function') window.openPortfolioProjectEditor(pid);
      return;
    }
    if (action === 'create-showcase') {
      if (!hub) return;
      if (typeof window.openPortfolioProjectModalForClientShowcase === 'function') {
        window.openPortfolioProjectModalForClientShowcase(hub.id, {
          title: hub.title || hub.clientName || '',
          projectUrl: hub.expoUrl || '',
          description: hub.notes || ''
        });
      }
      return;
    }
    if (action === 'link-portfolio') {
      linkPortfolioFromClientWorkspace().catch(console.error);
      return;
    }
    if (action === 'unlink-portfolio') {
      unlinkPortfolioFromClientWorkspace().catch(console.error);
    }
  }

  function setupCpClientDrawer() {
    mountCpClientDrawerToBody();
    var closeBtn = document.getElementById('cp-client-drawer-close');
    var deleteBtn = document.getElementById('cp-client-drawer-delete');
    var overlay = document.getElementById('cp-client-drawer-overlay');
    if (closeBtn && !closeBtn.dataset.cpBound) {
      closeBtn.dataset.cpBound = '1';
      closeBtn.addEventListener('click', closeCpClientDrawer);
    }
    if (deleteBtn && !deleteBtn.dataset.cpBound) {
      deleteBtn.dataset.cpBound = '1';
      deleteBtn.addEventListener('click', function () {
        if (clientProjectsSelectedId) openDeleteHubConfirmModal(clientProjectsSelectedId);
      });
    }
    if (overlay && !overlay.dataset.cpBound) {
      overlay.dataset.cpBound = '1';
      overlay.addEventListener('click', closeCpClientDrawer);
    }
  }

  function initClientProjects() {
    initNewClientModal();
    setupCpClientDrawer();

    var search = document.getElementById('client-projects-search');
    if (search && !search.dataset.cpBound) {
      search.dataset.cpBound = '1';
      search.addEventListener('input', function () {
        clientProjectsSearchQuery = search.value || '';
        renderClientProjectsPickerList();
      });
    }

    var addBtn = document.getElementById('client-projects-add-btn');
    if (addBtn && !addBtn.dataset.cpBound) {
      addBtn.dataset.cpBound = '1';
      addBtn.addEventListener('click', function () {
        openNewClientModal();
      });
    }

    var picker = document.getElementById('client-projects-picker-list');
    if (picker && !clientProjectsPickerBound) {
      clientProjectsPickerBound = true;
      picker.addEventListener('click', function (e) {
        var actionBtn = e.target.closest('[data-cp-action]');
        if (actionBtn) {
          e.preventDefault();
          handleClientProjectsAction(actionBtn.getAttribute('data-cp-action'), actionBtn);
          return;
        }
        var leadCard = e.target.closest('[data-cp-lead-id]');
        if (leadCard) {
          e.preventDefault();
          var leadId = leadCard.getAttribute('data-cp-lead-id');
          if (leadId && typeof window.AgencyTools !== 'undefined' && typeof window.AgencyTools.openProjectHub === 'function') {
            window.AgencyTools.openProjectHub(leadId);
          }
          return;
        }
        var card = e.target.closest('[data-cp-client-id]');
        if (!card) return;
        e.preventDefault();
        selectClientProject(card.getAttribute('data-cp-client-id'));
      });
    }

    var workspace = document.getElementById('client-projects-workspace');
    if (workspace && !clientProjectsBound) {
      clientProjectsBound = true;
      workspace.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-cp-action]');
        if (!btn) return;
        e.preventDefault();
        handleClientProjectsAction(btn.getAttribute('data-cp-action'), btn);
      });
    }

    refreshClientProjectsPicker();
  }

  function openClientProjectWorkspace(hubId) {
    if (!hubId) return;
    if (typeof window.adminActivateTab === 'function') window.adminActivateTab('client-projects');
    selectClientProject(hubId);
  }

  // ——— Pipeline hook: open hub from lead ———
  function createHubFromLead(lead) {
    if (!lead) return;
    var clientName = (lead.name || lead.company || '').trim();
    var titleBase = (lead.company || lead.name || '').trim();
    openNewClientModal({
      leadId: lead.id || '',
      clientName: clientName,
      title: titleBase ? titleBase + ' project' : ''
    });
  }

  function getOverviewSnapshot() {
    return {
      projects: agencyProjects.map(function (p) {
        return {
          clientName: p.clientName,
          title: p.title,
          milestones: p.milestones || []
        };
      }),
      maintenance: agencyMaintenance.map(function (m) {
        return {
          clientName: m.clientName,
          renewalDate: m.renewalDate,
          hoursIncluded: m.hoursIncluded,
          hoursUsed: m.hoursUsed
        };
      })
    };
  }

  window.AgencyTools = {
    subscribe: subscribeAgencyData,
    unsubscribe: unsubscribeAgencyData,
    refresh: fetchAgencyProjectsOnce,
    refreshFirebaseHealth: refreshFirebaseHealthPanel,
    refreshClientProjects: refreshClientProjectsWorkspace,
    refreshClientProjectsPicker: renderClientProjectsPickerList,
    openClientProject: openClientProjectWorkspace,
    closeClientDrawer: closeCpClientDrawer,
    isClientDrawerOpen: isCpClientDrawerOpen,
    getOverviewSnapshot: getOverviewSnapshot,
    openProjectHub: function (leadId) {
      var existing = agencyProjects.find(function (p) { return p.leadId === leadId; });
      if (existing) openClientProjectWorkspace(existing.id);
      else if (typeof window.findPipelineLead === 'function') {
        var lead = window.findPipelineLead(leadId);
        if (lead) createHubFromLead(lead);
      }
    },
    openNewClient: openNewClientModal,
    createHubFromLead: createHubFromLead,
    linkHubToPortfolio: linkHubToPortfolio
  };

  function init() {
    initTemplateMatcher();
    initProjectHub();
    initCaseStudyGenerator();
    initMaintenance();
    initContentRepurposing();
    initReferrals();
    initFirebaseHealth();
    initClientProjects();

    document.addEventListener('adminSessionReady', function (e) {
      if (e.detail && e.detail.isAdmin) subscribeAgencyData();
      else unsubscribeAgencyData();
    });

    // Auth may finish before this init runs; subscribe again if already signed in.
    if (isAdmin()) subscribeAgencyData();
    else if (window.currentUser && window.currentUser.role === 'admin') subscribeAgencyData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
