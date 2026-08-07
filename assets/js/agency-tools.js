/**
 * CodeWithRuben Agency Tools — Template Matcher, Project Hub, Case Studies,
 * Client Portal, Maintenance, Content Repurposing, Referrals, Studio Costs, Firebase Health.
 */
(function () {
  'use strict';

  var PATHS = {
    projects: 'agencyProjects',
    matcher: 'agencyMatcherSubmissions',
    maintenance: 'agencyMaintenance',
    referrals: 'agencyReferrals',
    studioCosts: 'agencyStudioCosts',
    clientPortals: 'agencyClientPortals',
    firebaseHealth: 'agencyFirebaseHealth',
    timeEntries: 'agencyTimeEntries'
  };

  var MICRO_SAAS_MODULES = [
    {
      id: 'link-tree',
      name: 'Link Tree',
      price: '$99+',
      industries: ['lawn', 'landscaping', 'home-service', 'barber', 'salon', 'beauty', 'ecommerce', 'retail', 'shop'],
      description: 'Branded Instagram/TikTok bio link page with stacked action links and social icons.'
    },
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
  var agencyTimeEntries = [];
  var agencyReferrals = [];
  var agencyStudioCosts = [];
  var studioCostsSeedAttempted = false;
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

  function cpFieldValue(id) {
    var el = document.getElementById(id);
    return el && el.value != null ? String(el.value).trim() : '';
  }

  function normalizeHubExternalUrl(raw) {
    var u = String(raw || '').trim();
    if (!u || u === '#') return '';
    if (/^https?:\/\//i.test(u)) return u.slice(0, 500);
    if (/^\/\//.test(u)) return ('https:' + u).slice(0, 500);
    if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}([/:?#].*)?$/i.test(u)) {
      return ('https://' + u).slice(0, 500);
    }
    return u.slice(0, 500);
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
          ? '<a class="btn btn-secondary btn-sm" href="/hire-me" data-nav-link>Start a project</a>'
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
        if (typeof window.switchToPage === 'function') window.switchToPage('hire-me');
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
    renderTimeCapacityPanel();
    fetchFirebaseHealthOnce().then(function () {
      if (healthSelectedProjectId) {
        return loadHealthForProject(healthSelectedProjectId);
      }
    });
    if (typeof window.renderAdminOverview === 'function') window.renderAdminOverview();
    if (typeof window.refreshPipelineBoard === 'function') window.refreshPipelineBoard();
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
        renderTimeCapacityPanel();
        if (typeof window.renderAdminOverview === 'function') window.renderAdminOverview();
      })
    );

    agencyUnsubs.push(
      window.rtdbOnValue(window.rtdbRef(window.rtdb, PATHS.timeEntries), function (snap) {
        applyTimeEntriesFromVal(snap.val());
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
      window.rtdbOnValue(window.rtdbRef(window.rtdb, PATHS.studioCosts), function (snap) {
        applyStudioCostsFromVal(snap.val());
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
    agencyTimeEntries = [];
    agencyReferrals = [];
    agencyStudioCosts = [];
    studioCostsSeedAttempted = false;
    agencyHealthByProject = {};
    healthSelectedProjectId = '';
    closeCpClientDrawer();
    closeTcAddDrawer();
    renderProjectHubList();
    renderMaintenanceList();
    renderReferralTable();
    renderStudioCostsTable();
    renderTimeCapacityPanel();
    renderFirebaseHealthProjectSelect();
    clearHealthForm(true);
    refreshClientProjectsPicker();
  }

  function deliveryStageOf(row) {
    var s = String((row && row.deliveryStage) || 'demo').toLowerCase();
    if (s === 'converting' || s === 'client') return s;
    return 'demo';
  }

  function deliveryStageLabel(stage) {
    var s = deliveryStageOf({ deliveryStage: stage });
    if (s === 'converting') return 'Converting';
    if (s === 'client') return 'Client';
    return 'Demo';
  }

  function isPortfolioTemplate(p) {
    return !!(p && (p.isTemplate === true || p.isTemplate === 'true' || p.isTemplate === 1));
  }

  function getTemplatePortfolioList() {
    return getPortfolioList().filter(isPortfolioTemplate);
  }

  function findTemplateById(id) {
    if (!id) return null;
    return getPortfolioList().find(function (p) {
      return p.id === id;
    }) || null;
  }

  function copyDeliveryFields(existing) {
    existing = existing || {};
    return {
      demoBranch: String(existing.demoBranch || '').slice(0, 120),
      deliveryStage: deliveryStageOf(existing),
      clientRepoUrl: String(existing.clientRepoUrl || '').slice(0, 500),
      graduatedAt: existing.graduatedAt || null
    };
  }

  function buildHubWritePayload(existing, overrides) {
    existing = existing || {};
    overrides = overrides || {};
    var base = {
      leadId: existing.leadId || '',
      clientName: existing.clientName || '',
      clientEmail: existing.clientEmail || '',
      title: existing.title || '',
      repoUrl: existing.repoUrl || '',
      expoUrl: existing.expoUrl || '',
      firebaseProjectId: existing.firebaseProjectId || '',
      businessDocId: existing.businessDocId || '',
      portfolioProjectId: existing.portfolioProjectId || '',
      notes: existing.notes || '',
      milestones: Array.isArray(existing.milestones) ? existing.milestones : [],
      enabledModules: Array.isArray(existing.enabledModules) ? existing.enabledModules.slice() : [],
      showMaintenanceInPortal: existing.showMaintenanceInPortal !== false,
      buildHoursEstimate: Math.max(0, Number(existing.buildHoursEstimate) || 0),
      buildHoursSpent: Math.max(0, Number(existing.buildHoursSpent) || 0),
      updatedAt: ts()
    };
    Object.assign(base, copyDeliveryFields(existing));
    Object.assign(base, copyPortalGuideFields(existing));
    Object.assign(base, overrides);
    if (overrides.deliveryStage != null) {
      base.deliveryStage = deliveryStageOf({ deliveryStage: overrides.deliveryStage });
    }
    return base;
  }

  function normalizeProject(id, row) {
    row = row || {};
    var milestones = Array.isArray(row.milestones) ? row.milestones : [];
    var guideFields = portalGuideFieldsFromList(normalizePortalGuides(row));
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
      demoBranch: String(row.demoBranch || '').slice(0, 120),
      deliveryStage: deliveryStageOf(row),
      clientRepoUrl: String(row.clientRepoUrl || '').slice(0, 500),
      graduatedAt: row.graduatedAt || null,
      notes: String(row.notes || '').slice(0, 4000),
      enabledModules: Array.isArray(row.enabledModules) ? row.enabledModules.slice(0, 12) : [],
      portalToken: String(row.portalToken || '').replace(/[^a-f0-9]/gi, '').slice(0, 64),
      portalExpiresAt: Number(row.portalExpiresAt) || 0,
      showMaintenanceInPortal: row.showMaintenanceInPortal !== false,
      portalGuides: guideFields.portalGuides,
      portalCanvasDocUrl: guideFields.portalCanvasDocUrl,
      portalCanvasDocTitle: guideFields.portalCanvasDocTitle,
      buildHoursEstimate: Math.max(0, Number(row.buildHoursEstimate) || 0),
      buildHoursSpent: Math.max(0, Number(row.buildHoursSpent) || 0),
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
      { id: 'm1', label: 'Template assigned', done: false },
      { id: 'm2', label: 'Demo branch created', done: false },
      { id: 'm3', label: 'Preview deployed (EAS)', done: false },
      { id: 'm4', label: 'Rebrand / copy pass', done: false },
      { id: 'm5', label: 'Deposit paid', done: false },
      { id: 'm6', label: 'Client codebase created', done: false },
      { id: 'm7', label: 'Client Firebase / launch', done: false }
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
    if (t === 'essential') {
      return { planTier: 'essential', slaHours: 5, hoursIncluded: 2 };
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
        var stage = deliveryStageOf(p);
        var previewOn = !!(p.expoUrl && String(p.expoUrl).trim());
        return (
          '<li class="hub-list-item">' +
          '<button type="button" class="hub-list-item-open" data-hub-id="' + esc(p.id) + '" aria-label="Open project hub for ' + esc(p.clientName || p.title || 'Untitled') + '">' +
          '<span class="hub-list-item-main">' +
          '<strong class="hub-list-item-title">' + esc(p.clientName || p.title || 'Untitled') + '</strong>' +
          '<span class="hub-list-item-meta">' + done + '/' + total + ' milestones</span>' +
          '<span class="hub-list-item-badges">' +
          '<span class="hub-delivery-badge hub-delivery-badge--' + esc(stage) + '">' + esc(deliveryStageLabel(stage)) + '</span>' +
          (previewOn
            ? '<span class="hub-delivery-badge hub-delivery-badge--preview">Preview live</span>'
            : '<span class="hub-delivery-badge hub-delivery-badge--no-preview">No preview</span>') +
          '</span>' +
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
      demoBranch: '',
      deliveryStage: 'demo',
      clientRepoUrl: '',
      graduatedAt: null,
      notes: '',
      milestones: defaultMilestones(),
      enabledModules: [],
      showMaintenanceInPortal: true,
      portalGuides: [],
      portalCanvasDocUrl: '',
      portalCanvasDocTitle: 'Project guide',
      buildHoursEstimate: 0,
      buildHoursSpent: 0,
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

  var graduateModalSource = '';
  var graduateModalBound = false;

  function setGraduateClientFormError(message) {
    var el = document.getElementById('graduate-client-form-error');
    if (!el) return;
    if (message) {
      el.textContent = message;
      el.hidden = false;
    } else {
      el.textContent = '';
      el.hidden = true;
    }
  }

  function openGraduateClientModal(source, defaults) {
    defaults = defaults || {};
    var modal = document.getElementById('graduate-client-confirm-modal');
    var repoEl = document.getElementById('graduate-client-repo');
    var fbEl = document.getElementById('graduate-client-firebase');
    if (!modal || !repoEl || !fbEl) return;
    graduateModalSource = source || 'workspace';
    repoEl.value = defaults.repo || '';
    fbEl.value = defaults.firebase || '';
    setGraduateClientFormError('');
    if (modal.parentElement !== document.body) {
      document.body.appendChild(modal);
    }
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    window.setTimeout(function () {
      try {
        repoEl.focus();
        repoEl.select();
      } catch (fe) {}
    }, 40);
  }

  function closeGraduateClientModal() {
    var modal = document.getElementById('graduate-client-confirm-modal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    graduateModalSource = '';
  }

  async function applyGraduateFromWorkspace(clientRepo, clientFb) {
    var hubId = clientProjectsSelectedId;
    if (!hubId || !rtdbReady()) throw new Error('No client selected.');
    var existing = getHubById(hubId);
    if (!existing) throw new Error('Client hub not found.');
    var stageEl = document.getElementById('cp-hub-delivery-stage');
    var clientRepoEl = document.getElementById('cp-hub-client-repo');
    var fbEl = document.getElementById('cp-hub-firebase');
    if (stageEl) stageEl.value = 'client';
    if (clientRepoEl) clientRepoEl.value = clientRepo;
    if (fbEl && clientFb) fbEl.value = clientFb;
    await saveHubFromClientWorkspace('hub');
    setCpFeedback('hub', 'Graduated to client stage.', false);
  }

  async function applyGraduateFromEditor(clientRepo, clientFb) {
    var stageEl = document.getElementById('hub-delivery-stage');
    var clientRepoEl = document.getElementById('hub-client-repo-url');
    var fbEl = document.getElementById('hub-firebase-id');
    if (stageEl) stageEl.value = 'client';
    updateHubEditorDeliveryLabels('client');
    if (clientRepoEl) clientRepoEl.value = clientRepo;
    if (fbEl && clientFb) fbEl.value = clientFb;
    await saveProjectHub();
  }

  async function confirmGraduateClientFromModal() {
    var repoEl = document.getElementById('graduate-client-repo');
    var fbEl = document.getElementById('graduate-client-firebase');
    var confirmBtn = document.getElementById('graduate-client-confirm');
    if (!repoEl || !fbEl) return;
    var clientRepo = String(repoEl.value || '').trim();
    var clientFb = String(fbEl.value || '').trim();
    setGraduateClientFormError('');
    if (confirmBtn) confirmBtn.disabled = true;
    try {
      if (graduateModalSource === 'editor') {
        await applyGraduateFromEditor(clientRepo, clientFb);
      } else {
        await applyGraduateFromWorkspace(clientRepo, clientFb);
      }
      closeGraduateClientModal();
    } catch (err) {
      console.error(err);
      setGraduateClientFormError((err && err.message) || 'Graduate failed.');
    } finally {
      if (confirmBtn) confirmBtn.disabled = false;
    }
  }

  function initGraduateClientModal() {
    if (graduateModalBound) return;
    var modal = document.getElementById('graduate-client-confirm-modal');
    if (!modal) return;
    graduateModalBound = true;

    var overlay = document.getElementById('graduate-client-confirm-overlay');
    var btnClose = document.getElementById('graduate-client-confirm-close');
    var btnCancel = document.getElementById('graduate-client-confirm-cancel');
    var btnConfirm = document.getElementById('graduate-client-confirm');

    function onClose() {
      closeGraduateClientModal();
    }
    if (overlay) overlay.addEventListener('click', onClose);
    if (btnClose) btnClose.addEventListener('click', onClose);
    if (btnCancel) btnCancel.addEventListener('click', onClose);
    if (btnConfirm) {
      btnConfirm.addEventListener('click', function () {
        confirmGraduateClientFromModal().catch(console.error);
      });
    }

    var repoEl = document.getElementById('graduate-client-repo');
    var fbEl = document.getElementById('graduate-client-firebase');
    function onEnter(e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      confirmGraduateClientFromModal().catch(console.error);
    }
    if (repoEl) repoEl.addEventListener('keydown', onEnter);
    if (fbEl) fbEl.addEventListener('keydown', onEnter);

    document.addEventListener(
      'keydown',
      function graduateEsc(ev) {
        if (ev.key !== 'Escape') return;
        var m = document.getElementById('graduate-client-confirm-modal');
        if (!m || !m.classList.contains('active')) return;
        ev.stopImmediatePropagation();
        closeGraduateClientModal();
      },
      true
    );
  }

  function fillHubTemplateSelect(selectedId) {
    var sel = document.getElementById('hub-template-select');
    if (!sel) return;
    var templates = getTemplatePortfolioList();
    var opts =
      '<option value="">No template assigned…</option>' +
      templates
        .map(function (p) {
          var best =
            Array.isArray(p.bestFor) && p.bestFor.length
              ? ' — ' + p.bestFor.slice(0, 2).join(', ')
              : '';
          var selected = selectedId && selectedId === p.id ? ' selected' : '';
          return (
            '<option value="' +
            esc(p.id) +
            '"' +
            selected +
            '>' +
            esc(p.title || p.id) +
            esc(best) +
            '</option>'
          );
        })
        .join('');
    if (selectedId && !templates.some(function (p) { return p.id === selectedId; })) {
      var linked = findTemplateById(selectedId);
      opts +=
        '<option value="' +
        esc(selectedId) +
        '" selected>' +
        esc((linked && linked.title) || selectedId) +
        ' (not marked template)</option>';
    }
    sel.innerHTML = opts;
  }

  function updateHubEditorDeliveryLabels(stage) {
    stage = deliveryStageOf({ deliveryStage: stage });
    var repoLabel = document.getElementById('hub-repo-label');
    var fbLabel = document.getElementById('hub-firebase-label');
    var expoLabel = document.getElementById('hub-expo-label');
    if (repoLabel) {
      repoLabel.textContent =
        stage === 'client' ? 'Working / template repo URL' : 'Template / working repo URL';
    }
    if (fbLabel) {
      fbLabel.textContent =
        stage === 'client' ? 'Client Firebase project ID' : 'Demo Firebase project ID';
    }
    if (expoLabel) {
      expoLabel.textContent = stage === 'client' ? 'Live / Expo URL' : 'EAS preview URL';
    }
  }

  function applyTemplatePrefillFromSelect(selectEl, opts) {
    opts = opts || {};
    var templateId = selectEl ? selectEl.value.trim() : '';
    var template = findTemplateById(templateId);
    if (!template || !isPortfolioTemplate(template)) return;
    var stageEl = opts.stageEl || document.getElementById('hub-delivery-stage');
    var stage = deliveryStageOf({
      deliveryStage: stageEl ? stageEl.value : opts.stage || 'demo'
    });
    var repoEl = opts.repoEl || document.getElementById('hub-repo-url');
    var fbEl = opts.fbEl || document.getElementById('hub-firebase-id');
    if (stage === 'demo') {
      if (repoEl && template.templateRepoUrl && (!repoEl.value.trim() || opts.force)) {
        repoEl.value = template.templateRepoUrl;
      }
      if (fbEl && template.demoFirebaseProjectId && (!fbEl.value.trim() || opts.force)) {
        fbEl.value = template.demoFirebaseProjectId;
      }
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
        clientEmail: '',
        title: '',
        repoUrl: '',
        expoUrl: '',
        firebaseProjectId: '',
        businessDocId: '',
        portfolioProjectId: '',
        demoBranch: '',
        deliveryStage: 'demo',
        clientRepoUrl: '',
        graduatedAt: null,
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
    var demoBranchEl = document.getElementById('hub-demo-branch');
    if (demoBranchEl) demoBranchEl.value = p.demoBranch || '';
    var clientRepoEl = document.getElementById('hub-client-repo-url');
    if (clientRepoEl) clientRepoEl.value = p.clientRepoUrl || '';
    var stageEl = document.getElementById('hub-delivery-stage');
    if (stageEl) stageEl.value = deliveryStageOf(p);
    fillHubTemplateSelect(p.portfolioProjectId || '');
    updateHubEditorDeliveryLabels(p.deliveryStage);
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
        '<label class="custom-switch-label">' +
        '<input type="checkbox" class="custom-switch-input" data-milestone-idx="' + i + '" ' + (m.done ? 'checked' : '') + '>' +
        '<span class="custom-switch" aria-hidden="true"></span>' +
        '</label>' +
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
    var templateSelect = document.getElementById('hub-template-select');
    var portfolioProjectId = templateSelect
      ? templateSelect.value.trim()
      : existing
        ? existing.portfolioProjectId || ''
        : '';
    var stageEl = document.getElementById('hub-delivery-stage');
    var deliveryStage = stageEl ? stageEl.value : 'demo';
    var payload = buildHubWritePayload(existing || {}, {
      leadId: document.getElementById('hub-lead-id').value.trim(),
      clientName: document.getElementById('hub-client-name').value.trim(),
      clientEmail: (document.getElementById('hub-client-email') || {}).value.trim(),
      title: document.getElementById('hub-title').value.trim(),
      repoUrl: document.getElementById('hub-repo-url').value.trim(),
      expoUrl: document.getElementById('hub-expo-url').value.trim(),
      firebaseProjectId: document.getElementById('hub-firebase-id').value.trim(),
      businessDocId: document.getElementById('hub-business-doc-id').value.trim(),
      portfolioProjectId: portfolioProjectId,
      demoBranch: (document.getElementById('hub-demo-branch') || {}).value.trim(),
      deliveryStage: deliveryStage,
      clientRepoUrl: (document.getElementById('hub-client-repo-url') || {}).value.trim(),
      graduatedAt:
        deliveryStage === 'client'
          ? (existing && existing.graduatedAt) || ts()
          : existing
            ? existing.graduatedAt || null
            : null,
      notes: document.getElementById('hub-notes').value.trim(),
      milestones: collectHubMilestonesFromDom(),
      enabledModules: existing && Array.isArray(existing.enabledModules) ? existing.enabledModules.slice() : [],
      showMaintenanceInPortal: existing ? existing.showMaintenanceInPortal !== false : true
    });
    var savedId = await saveProjectHubRecord(id, payload, true);
    if (savedId) openClientProjectWorkspace(savedId);
  }

  async function graduateHubFromEditor() {
    var clientRepoEl = document.getElementById('hub-client-repo-url');
    var fbEl = document.getElementById('hub-firebase-id');
    openGraduateClientModal('editor', {
      repo: clientRepoEl ? clientRepoEl.value : '',
      firebase: fbEl ? fbEl.value : ''
    });
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
    var graduateBtn = document.getElementById('hub-graduate-btn');
    if (graduateBtn && !graduateBtn.dataset.bound) {
      graduateBtn.dataset.bound = '1';
      graduateBtn.addEventListener('click', function () {
        graduateHubFromEditor().catch(console.error);
      });
    }
    var stageEl = document.getElementById('hub-delivery-stage');
    if (stageEl && !stageEl.dataset.bound) {
      stageEl.dataset.bound = '1';
      stageEl.addEventListener('change', function () {
        updateHubEditorDeliveryLabels(stageEl.value);
      });
    }
    var templateSel = document.getElementById('hub-template-select');
    if (templateSel && !templateSel.dataset.bound) {
      templateSel.dataset.bound = '1';
      templateSel.addEventListener('change', function () {
        applyTemplatePrefillFromSelect(templateSel, { force: true });
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
      if (typeof window.setBusinessDocSelectOptions === 'function') {
        window.setBusinessDocSelectOptions(
          select,
          list.map(function (p) {
            return { value: p.id, label: p.title || p.id };
          }),
          { placeholder: 'Choose a portfolio project…', keepValue: true }
        );
      } else {
        select.innerHTML =
          '<option value="">Choose a portfolio project…</option>' +
          list.map(function (p) {
            return '<option value="' + esc(p.id) + '">' + esc(p.title || p.id) + '</option>';
          }).join('');
      }
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
    if (match) return '/' + match[0].replace(/^\/+/, '');
    if (/^\.?\/?assets\//i.test(s)) return '/' + s.replace(/^\.?\//, '');
    return s;
  }

  var MAX_PORTAL_GUIDES = 8;

  function normalizePortalGuides(row) {
    row = row || {};
    var out = [];
    var seen = {};
    function pushGuide(url, title) {
      var normalized = normalizePortalCanvasDocUrl(url);
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
    return out.slice(0, MAX_PORTAL_GUIDES);
  }

  function portalGuideFieldsFromList(guides) {
    var list = Array.isArray(guides) ? guides.slice(0, MAX_PORTAL_GUIDES) : [];
    return {
      portalGuides: list,
      portalCanvasDocUrl: list[0] ? list[0].url : '',
      portalCanvasDocTitle: list[0] ? list[0].title : 'Project guide'
    };
  }

  function copyPortalGuideFields(existing) {
    return portalGuideFieldsFromList(normalizePortalGuides(existing || {}));
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
      '<button type="button" class="btn btn-secondary btn-sm" id="hub-invite-schedule-btn">Invite to schedule</button>' +
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
    var inviteBtn = document.getElementById('hub-invite-schedule-btn');
    if (inviteBtn) {
      inviteBtn.onclick = function () {
        var hubId = (document.getElementById('hub-edit-id') || {}).value.trim();
        var hub = hubId ? getHubById(hubId) : project;
        if (!hub) return;
        var schedName = String(hub.clientName || '').trim();
        var schedEmail = String(hub.clientEmail || '').trim();
        var openInvite = function (callTypeId) {
          var schedLink =
            typeof window.buildScheduleInviteUrl === 'function'
              ? window.buildScheduleInviteUrl({
                  name: schedName,
                  email: schedEmail,
                  hubId: hub.id || hubId,
                  type: callTypeId || ''
                })
              : String(window.PORTFOLIO_PUBLIC_ORIGIN || location.origin || '').replace(/\/$/, '') + '/schedule';
          if (typeof window.adminActivateTab === 'function') window.adminActivateTab('client-email');
          if (typeof window.prefillAdminClientEmail === 'function') {
            window.prefillAdminClientEmail({
              name: schedName,
              email: schedEmail,
              link: schedLink,
              templateId: 'schedule-call',
              nextStep: 'Book a slot that works for you',
              hubId: hub.id || hubId,
              callTypeId: callTypeId || ''
            });
          }
        };
        if (typeof window.getDefaultScheduleCallType === 'function') {
          window.getDefaultScheduleCallType().then(function (ct) {
            openInvite(ct && ct.id ? ct.id : '');
          }).catch(function () {
            openInvite('');
          });
        } else {
          openInvite('');
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
      if (typeof window.setBusinessDocSelectOptions === 'function') {
        window.setBusinessDocSelectOptions(
          select,
          posts.map(function (p) {
            return { value: p.id, label: p.title };
          }),
          { placeholder: 'Select blog post…', keepValue: true }
        );
      } else {
        select.innerHTML =
          '<option value="">Select blog post…</option>' +
          posts.map(function (p) {
            return '<option value="' + esc(p.id) + '" data-title="' + esc(p.title) + '">' + esc(p.title) + '</option>';
          }).join('');
      }
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

  // ——— Studio Costs (what CWR pays) ———
  var STUDIO_COST_VENDORS = {
    eas: 'Expo EAS',
    porkbun: 'Porkbun',
    app_store: 'App Store Connect',
    play: 'Google Play',
    firebase: 'Firebase',
    apple_dev: 'Apple Developer',
    other: 'Other'
  };

  var STUDIO_COST_SEEDS = [
    {
      id: 'seed-eas',
      name: 'Expo EAS',
      vendor: 'eas',
      status: 'active',
      url: 'https://expo.dev/',
      amount: 0,
      billingCycle: 'monthly',
      renewalDate: '',
      notes: 'Hosting / builds',
      order: 10
    },
    {
      id: 'seed-porkbun',
      name: 'Porkbun',
      vendor: 'porkbun',
      status: 'active',
      url: 'https://porkbun.com/account/login',
      amount: 0,
      billingCycle: 'annual',
      renewalDate: '',
      notes: 'Custom domains',
      order: 20
    },
    {
      id: 'seed-app-store',
      name: 'App Store Connect',
      vendor: 'app_store',
      status: 'active',
      url: 'https://appstoreconnect.apple.com/',
      amount: 0,
      billingCycle: 'annual',
      renewalDate: '',
      notes: 'iOS listings (Apple Developer fee is separate)',
      order: 30
    },
    {
      id: 'seed-play',
      name: 'Google Play Console',
      vendor: 'play',
      status: 'active',
      url: 'https://play.google.com/console',
      amount: 0,
      billingCycle: 'once',
      renewalDate: '',
      notes: 'Android listings',
      order: 40
    }
  ];

  function normalizeStudioCostVendor(raw) {
    var v = String(raw || 'other').toLowerCase();
    if (STUDIO_COST_VENDORS[v]) return v;
    return 'other';
  }

  function normalizeStudioCostStatus(raw) {
    var s = String(raw || 'active').toLowerCase();
    if (s === 'paused' || s === 'cancelled') return s;
    return 'active';
  }

  function normalizeStudioCostCycle(raw) {
    var c = String(raw || 'monthly').toLowerCase();
    if (c === 'annual' || c === 'once') return c;
    return 'monthly';
  }

  function normalizeStudioCost(id, row) {
    row = row || {};
    return {
      id: id,
      name: String(row.name || '').slice(0, 120),
      vendor: normalizeStudioCostVendor(row.vendor),
      status: normalizeStudioCostStatus(row.status),
      url: String(row.url || '').trim().slice(0, 500),
      amount: Math.max(0, Number(row.amount) || 0),
      billingCycle: normalizeStudioCostCycle(row.billingCycle),
      currency: String(row.currency || 'USD').slice(0, 8),
      renewalDate: String(row.renewalDate || '').slice(0, 12),
      notes: String(row.notes || '').slice(0, 2000),
      order: Number(row.order) || 0,
      externalRef: String(row.externalRef || '').slice(0, 120),
      updatedAt: row.updatedAt || null,
      createdAt: row.createdAt || null
    };
  }

  function studioCostMonthlyAmount(row) {
    if (!row || row.status !== 'active') return 0;
    var amount = Number(row.amount) || 0;
    if (row.billingCycle === 'annual') return amount / 12;
    if (row.billingCycle === 'once') return 0;
    return amount;
  }

  function studioCostDaysUntilRenewal(dateStr) {
    if (!dateStr) return null;
    var parts = String(dateStr).split('-');
    if (parts.length !== 3) return null;
    var y = Number(parts[0]);
    var m = Number(parts[1]);
    var d = Number(parts[2]);
    if (!y || !m || !d) return null;
    var target = new Date(y, m - 1, d);
    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((target.getTime() - start.getTime()) / 86400000);
  }

  function formatStudioCostMoney(amount) {
    var n = Number(amount) || 0;
    if (n >= 100) return '$' + Math.round(n).toLocaleString();
    return (
      '$' +
      n.toLocaleString(undefined, {
        minimumFractionDigits: n % 1 ? 2 : 0,
        maximumFractionDigits: 2
      })
    );
  }

  function studioCostCycleLabel(cycle) {
    if (cycle === 'annual') return '/yr';
    if (cycle === 'once') return ' once';
    return '/mo';
  }

  function studioCostVendorLabel(vendor) {
    return STUDIO_COST_VENDORS[vendor] || STUDIO_COST_VENDORS.other;
  }

  function getStudioCostsSummary() {
    var monthly = 0;
    var active = 0;
    var renewals = 0;
    agencyStudioCosts.forEach(function (row) {
      if (row.status === 'active') {
        active += 1;
        monthly += studioCostMonthlyAmount(row);
      }
      var days = studioCostDaysUntilRenewal(row.renewalDate);
      if (days != null && days >= 0 && days <= 30 && row.status === 'active') renewals += 1;
    });
    return { monthly: monthly, active: active, renewals: renewals };
  }

  function renderStudioCostsSummary() {
    var summary = getStudioCostsSummary();
    var monthlyEl = document.getElementById('studio-costs-monthly');
    var activeEl = document.getElementById('studio-costs-active-count');
    var renewalsEl = document.getElementById('studio-costs-renewals-count');
    var kpiEl = document.getElementById('kpi-studio-costs');
    if (monthlyEl) monthlyEl.textContent = formatStudioCostMoney(summary.monthly);
    if (activeEl) activeEl.textContent = String(summary.active);
    if (renewalsEl) renewalsEl.textContent = String(summary.renewals);
    if (kpiEl) kpiEl.textContent = formatStudioCostMoney(summary.monthly);
  }

  function renderStudioCostsTable() {
    var tbody = document.getElementById('studio-costs-tbody');
    renderStudioCostsSummary();
    if (!tbody) return;
    if (!agencyStudioCosts.length) {
      tbody.innerHTML =
        '<tr><td colspan="5">No studio costs yet. Add EAS, Porkbun, App Store, or Play.</td></tr>';
      return;
    }
    var sorted = agencyStudioCosts.slice().sort(function (a, b) {
      if (a.order !== b.order) return a.order - b.order;
      return String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' });
    });
    tbody.innerHTML = sorted
      .map(function (row) {
        var days = studioCostDaysUntilRenewal(row.renewalDate);
        var renewLabel = row.renewalDate || '—';
        var renewClass = '';
        if (days != null && row.status === 'active') {
          if (days < 0) {
            renewLabel = row.renewalDate + ' · overdue';
            renewClass = ' is-overdue';
          } else if (days <= 30) {
            renewLabel = row.renewalDate + ' · ' + (days === 0 ? 'today' : days + 'd');
            renewClass = ' is-soon';
          }
        }
        var openBtn = row.url
          ? '<a class="btn btn-secondary btn-sm" href="' +
            esc(row.url) +
            '" target="_blank" rel="noopener">Open</a>'
          : '';
        return (
          '<tr data-studio-cost-id="' +
          esc(row.id) +
          '">' +
          '<td><strong>' +
          esc(row.name || 'Untitled') +
          '</strong><div class="studio-costs-meta">' +
          esc(studioCostVendorLabel(row.vendor)) +
          '</div></td>' +
          '<td>' +
          formatStudioCostMoney(row.amount) +
          esc(studioCostCycleLabel(row.billingCycle)) +
          '</td>' +
          '<td class="studio-costs-renewal' +
          renewClass +
          '">' +
          esc(renewLabel) +
          '</td>' +
          '<td><span class="studio-cost-status studio-cost-status--' +
          esc(row.status) +
          '">' +
          esc(row.status) +
          '</span></td>' +
          '<td class="referral-table-actions">' +
          openBtn +
          '<button type="button" class="btn btn-secondary btn-sm" data-edit-studio-cost="' +
          esc(row.id) +
          '">Edit</button>' +
          '<button type="button" class="hub-list-btn hub-list-btn-delete" data-studio-cost-delete="' +
          esc(row.id) +
          '" aria-label="Delete studio cost"><ion-icon name="trash-outline"></ion-icon></button>' +
          '</td></tr>'
        );
      })
      .join('');

    tbody.querySelectorAll('[data-edit-studio-cost]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openStudioCostEditor(btn.getAttribute('data-edit-studio-cost'));
      });
    });
    tbody.querySelectorAll('[data-studio-cost-delete]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        deleteStudioCost(btn.getAttribute('data-studio-cost-delete')).catch(console.error);
      });
    });
  }

  async function seedStudioCostsIfEmpty() {
    if (studioCostsSeedAttempted || !rtdbReady()) return;
    studioCostsSeedAttempted = true;
    if (agencyStudioCosts.length) return;
    try {
      var snap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATHS.studioCosts));
      if (snap.val()) return;
      var writes = {};
      STUDIO_COST_SEEDS.forEach(function (seed) {
        writes[seed.id] = {
          name: seed.name,
          vendor: seed.vendor,
          status: seed.status,
          url: seed.url,
          amount: seed.amount,
          billingCycle: seed.billingCycle,
          currency: 'USD',
          renewalDate: seed.renewalDate,
          notes: seed.notes,
          order: seed.order,
          externalRef: '',
          createdAt: ts(),
          updatedAt: ts()
        };
      });
      if (typeof window.rtdbUpdate === 'function') {
        await window.rtdbUpdate(window.rtdbRef(window.rtdb, PATHS.studioCosts), writes);
      } else {
        var keys = Object.keys(writes);
        for (var i = 0; i < keys.length; i++) {
          await window.rtdbSet(
            window.rtdbRef(window.rtdb, PATHS.studioCosts + '/' + keys[i]),
            writes[keys[i]]
          );
        }
      }
    } catch (err) {
      console.warn('Studio costs seed skipped', err);
      studioCostsSeedAttempted = false;
    }
  }

  function applyStudioCostsFromVal(val) {
    agencyStudioCosts = [];
    if (val && typeof val === 'object') {
      Object.keys(val).forEach(function (id) {
        agencyStudioCosts.push(normalizeStudioCost(id, val[id]));
      });
    }
    renderStudioCostsTable();
    if (!agencyStudioCosts.length) {
      seedStudioCostsIfEmpty().catch(console.error);
    }
    if (typeof window.renderAdminOverview === 'function') window.renderAdminOverview();
  }

  function openStudioCostEditor(id) {
    var row = agencyStudioCosts.find(function (x) {
      return x.id === id;
    });
    if (!row && id !== 'new') return;
    if (id === 'new') {
      row = {
        id: '',
        name: '',
        vendor: 'other',
        status: 'active',
        url: '',
        amount: 0,
        billingCycle: 'monthly',
        renewalDate: '',
        notes: ''
      };
    }
    var titleEl = document.getElementById('studio-cost-modal-title');
    if (titleEl) titleEl.textContent = row.id ? 'Edit studio cost' : 'Add studio cost';
    document.getElementById('studio-cost-edit-id').value = row.id || '';
    document.getElementById('studio-cost-name').value = row.name || '';
    document.getElementById('studio-cost-vendor').value = row.vendor || 'other';
    document.getElementById('studio-cost-status').value = row.status || 'active';
    document.getElementById('studio-cost-url').value = row.url || '';
    document.getElementById('studio-cost-amount').value = row.amount ? String(row.amount) : '';
    document.getElementById('studio-cost-cycle').value = row.billingCycle || 'monthly';
    document.getElementById('studio-cost-renewal').value = row.renewalDate || '';
    document.getElementById('studio-cost-notes').value = row.notes || '';
    openModal('studio-cost-editor-modal');
  }

  async function saveStudioCost() {
    if (!rtdbReady()) return;
    var id = document.getElementById('studio-cost-edit-id').value.trim();
    var name = document.getElementById('studio-cost-name').value.trim();
    if (!name) {
      alert('Name is required.');
      return;
    }
    var existing = id
      ? agencyStudioCosts.find(function (x) {
          return x.id === id;
        })
      : null;
    var payload = {
      name: name,
      vendor: normalizeStudioCostVendor(document.getElementById('studio-cost-vendor').value),
      status: normalizeStudioCostStatus(document.getElementById('studio-cost-status').value),
      url: normalizeHubExternalUrl(document.getElementById('studio-cost-url').value),
      amount: Math.max(0, Number(document.getElementById('studio-cost-amount').value) || 0),
      billingCycle: normalizeStudioCostCycle(document.getElementById('studio-cost-cycle').value),
      currency: 'USD',
      renewalDate: document.getElementById('studio-cost-renewal').value || '',
      notes: document.getElementById('studio-cost-notes').value.trim(),
      order: existing ? existing.order || 0 : agencyStudioCosts.length * 10 + 10,
      externalRef: existing ? existing.externalRef || '' : '',
      updatedAt: ts()
    };
    if (id) {
      if (existing && existing.createdAt) payload.createdAt = existing.createdAt;
      await window.rtdbSet(window.rtdbRef(window.rtdb, PATHS.studioCosts + '/' + id), payload);
    } else {
      payload.createdAt = ts();
      var ref = window.rtdbPush(window.rtdbRef(window.rtdb, PATHS.studioCosts));
      await window.rtdbSet(ref, payload);
    }
    closeModal('studio-cost-editor-modal');
  }

  async function deleteStudioCost(id) {
    if (!id || !rtdbReady()) return;
    var row = agencyStudioCosts.find(function (x) {
      return x.id === id;
    });
    var label = row ? row.name || 'this service' : 'this service';
    if (!window.confirm('Delete studio cost “' + label + '”? This cannot be undone.')) return;
    await window.rtdbRemove(window.rtdbRef(window.rtdb, PATHS.studioCosts + '/' + id));
  }

  function initStudioCosts() {
    var add = document.getElementById('studio-cost-add-btn');
    if (add && !add.dataset.bound) {
      add.dataset.bound = '1';
      add.addEventListener('click', function () {
        openStudioCostEditor('new');
      });
    }
    bindModalClose('studio-cost-editor-modal', '.agency-modal-overlay', '.agency-modal-close');
    var save = document.getElementById('studio-cost-save-btn');
    if (save && !save.dataset.bound) {
      save.dataset.bound = '1';
      save.addEventListener('click', function () {
        saveStudioCost().catch(console.error);
      });
    }
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
          setHealthSelectValue(sel, pid);
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
        setHealthSelectValue(sel, autoId);
        healthSelectedProjectId = autoId;
      }
    }
    if (sel.value) {
      setHealthFormEnabled(true);
      applyHealthToForm(agencyHealthByProject[sel.value] || null);
    }
    if (clientProjectsSelectedId) renderClientProjectsWorkspace();
    refreshClientProjectsPicker();
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

  function setHealthSelectValue(sel, value) {
    if (!sel) return;
    if (typeof window.setBusinessDocSelectValue === 'function' && sel.closest('.business-doc-select')) {
      window.setBusinessDocSelectValue(sel, value || '', true);
    } else {
      sel.value = value || '';
    }
  }

  function healthSelectHasOption(sel, projectId) {
    if (!sel || !projectId) return false;
    var wrap = sel.closest('.business-doc-select');
    if (wrap) {
      var found = false;
      wrap.querySelectorAll('.business-doc-select-option').forEach(function (opt) {
        if (opt.getAttribute('data-value') === projectId) found = true;
      });
      return found;
    }
    var i;
    for (i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === projectId) return true;
    }
    return false;
  }

  function ensureHealthSelectOption(projectId) {
    var sel = document.getElementById('health-project-select');
    if (!sel || !projectId || healthSelectHasOption(sel, projectId)) return;
    var wrap = sel.closest('.business-doc-select');
    if (wrap && typeof window.setBusinessDocSelectOptions === 'function') {
      var menu = wrap.querySelector('.business-doc-select-menu');
      var existing = [];
      if (menu) {
        menu.querySelectorAll('.business-doc-select-option').forEach(function (opt) {
          var v = opt.getAttribute('data-value') || '';
          if (!v) return;
          existing.push({ value: v, label: opt.textContent || v });
        });
      }
      existing.push({
        value: projectId,
        label: healthProjectLabel(projectId) + ' (saved in Firebase)'
      });
      window.setBusinessDocSelectOptions(sel, existing, {
        placeholder: 'Select project hub…',
        value: sel.value || '',
        keepValue: true
      });
      return;
    }
    var opt = document.createElement('option');
    opt.value = projectId;
    opt.textContent = healthProjectLabel(projectId) + ' (saved in Firebase)';
    sel.appendChild(opt);
  }

  function renderFirebaseHealthProjectSelect() {
    var sel = document.getElementById('health-project-select');
    if (!sel) return;
    var previous = healthSelectedProjectId || sel.value || '';
    var options = agencyProjects.map(function (p) {
      return { value: p.id, label: p.clientName || p.title || p.id };
    });
    if (typeof window.setBusinessDocSelectOptions === 'function') {
      var next =
        previous && agencyProjects.some(function (p) { return p.id === previous; })
          ? previous
          : '';
      window.setBusinessDocSelectOptions(sel, options, {
        placeholder: 'Select project hub…',
        value: next,
        keepValue: false
      });
      healthSelectedProjectId = next;
      return;
    }
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
  var clientProjectsSortBound = false;
  var clientProjectsDndBound = false;
  var cpDeliveryDragProjectId = null;
  var cpDeliveryDragMoved = false;
  var CP_DELIVERY_STAGES = ['demo', 'converting', 'client'];
  var CP_CLIENT_SORT_KEY = 'cp-client-projects-sort';
  var CP_CLIENT_SORT_OPTIONS = ['name', 'attention', 'milestones', 'maintenance', 'added'];
  var CP_SPARSE_SIDE_MAX = 3;
  var clientProjectsSort = (function () {
    try {
      var saved = localStorage.getItem(CP_CLIENT_SORT_KEY);
      if (CP_CLIENT_SORT_OPTIONS.indexOf(saved) >= 0) return saved;
    } catch (e) { /* ignore */ }
    return 'name';
  })();
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

  function hubHasPortalGuide(hub) {
    return normalizePortalGuides(hub).length > 0;
  }

  function getClientPickerMeta(hub) {
    if (!hub) {
      return {
        milestones: '0/0',
        milestonesPct: 0,
        healthLabel: 'Health —',
        healthClass: '',
        maintPending: false,
        hasGuide: false
      };
    }
    var done = (hub.milestones || []).filter(function (m) {
      return m.done;
    }).length;
    var total = hub.milestones ? hub.milestones.length : 0;
    var health = agencyHealthByProject[hub.id];
    var healthDone = health ? healthCheckedCount(health) : 0;
    var healthClass =
      healthDone >= HEALTH_CHECK_KEYS.length
        ? 'is-good'
        : healthDone > 0
          ? 'is-warn'
          : 'is-bad';
    var healthLabel = health
      ? 'Health ' + healthDone + '/' + HEALTH_CHECK_KEYS.length
      : 'Health —';
    var maint = findMaintenanceForHub(hub);
    var maintPending = !!(maint && maint.effectivePlanStatus === 'pending');
    return {
      milestones: done + '/' + (total || 0),
      milestonesPct: total ? Math.round((done / total) * 100) : 0,
      milestonesDone: done,
      milestonesTotal: total,
      healthLabel: healthLabel,
      healthClass: healthClass,
      healthMissing: !health,
      maintPending: maintPending,
      maintTier: maint && maint.planTier ? maint.planTier : '',
      hasGuide: hubHasPortalGuide(hub)
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
      '<button type="button" class="cp-client-picker-card cp-client-picker-card--deposit cp-client-picker-row cp-onboard-card" ' +
      'data-cp-lead-id="' +
      esc(lead.id) +
      '">' +
      '<span class="cp-client-picker-avatar" aria-hidden="true">' +
      esc(initials) +
      '</span>' +
      '<span class="cp-client-picker-row-main">' +
      '<span class="cp-client-picker-row-head">' +
      '<span class="cp-client-picker-card-title">' +
      esc(title) +
      '</span>' +
      '<span class="cp-client-picker-row-badges">' +
      '<span class="cp-client-picker-badge is-deposit">Deposit paid</span>' +
      '<span class="cp-client-picker-badge">' +
      esc(cpMoney(lead.value)) +
      '</span>' +
      '</span></span>' +
      '<span class="cp-client-picker-card-sub">' +
      esc(sub) +
      ' · Ready to onboard</span>' +
      '</span>' +
      '<ion-icon name="add-circle-outline" class="cp-client-picker-chevron" aria-hidden="true"></ion-icon>' +
      '</button>'
    );
  }

  function renderCpHubDeliveryCard(p) {
    var title = (p.clientName || p.title || 'Untitled').trim();
    var meta = getClientPickerMeta(p);
    var selected = clientProjectsSelectedId === p.id;
    var initials = clientPickerInitials(title);
    var maintBadge = meta.maintPending
      ? '<span class="cp-client-picker-badge is-pending">Plan pending</span>'
      : '';
    var guideCount = normalizePortalGuides(p).length;
    var guideBadge = meta.hasGuide
      ? '<span class="cp-client-picker-badge is-guide">' +
        (guideCount > 1 ? guideCount + ' guides' : 'Guide') +
        '</span>'
      : '';
    var previewBadge = p.expoUrl
      ? '<span class="cp-client-picker-badge is-preview">Preview</span>'
      : '';
    return (
      '<article class="cp-delivery-card' +
      (selected ? ' is-selected' : '') +
      '" draggable="true" tabindex="0" role="button" ' +
      'data-project-id="' +
      esc(p.id) +
      '" data-cp-client-id="' +
      esc(p.id) +
      '" aria-pressed="' +
      (selected ? 'true' : 'false') +
      '">' +
      '<div class="cp-delivery-card-top">' +
      '<span class="cp-client-picker-avatar" aria-hidden="true">' +
      esc(initials) +
      '</span>' +
      '<span class="cp-delivery-card-title" title="' +
      esc(title) +
      '">' +
      esc(title) +
      '</span>' +
      '</div>' +
      '<div class="cp-delivery-card-badges">' +
      previewBadge +
      maintBadge +
      guideBadge +
      '<span class="cp-client-picker-badge ' +
      esc(meta.healthClass) +
      '">' +
      esc(meta.healthLabel) +
      '</span>' +
      '</div>' +
      (meta.milestonesTotal
        ? '<div class="cp-client-picker-progress" aria-label="' +
          esc(meta.milestones + ' milestones complete') +
          '">' +
          '<span class="cp-client-picker-progress-track">' +
          '<span class="cp-client-picker-progress-fill" style="width:' +
          esc(String(meta.milestonesPct)) +
          '%"></span></span>' +
          '<span class="cp-client-picker-progress-label">' +
          esc(meta.milestones) +
          ' milestones</span></div>'
        : '<span class="cp-client-picker-progress-label cp-client-picker-progress-label--empty">No milestones</span>') +
      '</article>'
    );
  }

  /** @deprecated Prefer renderCpHubDeliveryCard — kept for any leftover callers. */
  function renderCpHubPickerCard(p) {
    return renderCpHubDeliveryCard(p);
  }

  function clientHubSortName(hub) {
    return String(hub.clientName || hub.title || '').trim();
  }

  function clientHubCreatedMs(hub) {
    var value = hub && hub.createdAt;
    if (value == null || value === '') return 0;
    if (typeof value === 'number' && isFinite(value)) return value;
    if (typeof value === 'string') {
      var asNum = Number(value);
      if (isFinite(asNum) && asNum > 0) return asNum;
      var parsed = Date.parse(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    if (typeof value === 'object') {
      if (typeof value.toMillis === 'function') return value.toMillis();
      if (typeof value.seconds === 'number') return value.seconds * 1000;
    }
    return 0;
  }

  function clientHubAttentionScore(hub) {
    var meta = getClientPickerMeta(hub);
    var score = 0;
    if (meta.maintPending) score += 100;
    if (meta.healthMissing || meta.healthClass === 'is-bad') score += 40;
    else if (meta.healthClass === 'is-warn') score += 20;
    if (!meta.milestonesTotal) score += 10;
    else score += Math.max(0, 10 - Math.round(meta.milestonesPct / 10));
    return score;
  }

  function sortClientHubs(hubs, sortMode) {
    var mode = CP_CLIENT_SORT_OPTIONS.indexOf(sortMode) >= 0 ? sortMode : 'name';
    return hubs.slice().sort(function (a, b) {
      if (mode === 'attention') {
        var sa = clientHubAttentionScore(a);
        var sb = clientHubAttentionScore(b);
        if (sa !== sb) return sb - sa;
      } else if (mode === 'milestones') {
        var ma = getClientPickerMeta(a);
        var mb = getClientPickerMeta(b);
        var pa = ma.milestonesTotal ? ma.milestonesPct : -1;
        var pb = mb.milestonesTotal ? mb.milestonesPct : -1;
        if (pa !== pb) return pa - pb;
      } else if (mode === 'maintenance') {
        var hasA = findMaintenanceForHub(a) ? 0 : 1;
        var hasB = findMaintenanceForHub(b) ? 0 : 1;
        if (hasA !== hasB) return hasA - hasB;
        var pendingA = getClientPickerMeta(a).maintPending ? 0 : 1;
        var pendingB = getClientPickerMeta(b).maintPending ? 0 : 1;
        if (pendingA !== pendingB) return pendingA - pendingB;
      } else if (mode === 'added') {
        var ca = clientHubCreatedMs(a);
        var cb = clientHubCreatedMs(b);
        if (ca !== cb) return cb - ca;
      }
      return clientHubSortName(a).localeCompare(clientHubSortName(b), undefined, { sensitivity: 'base' });
    });
  }

  function syncClientProjectsSortChips() {
    var root = document.getElementById('client-projects-sort');
    if (!root) return;
    root.querySelectorAll('[data-cp-sort]').forEach(function (btn) {
      var active = btn.getAttribute('data-cp-sort') === clientProjectsSort;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function setClientProjectsSort(sortMode) {
    if (CP_CLIENT_SORT_OPTIONS.indexOf(sortMode) < 0) return;
    clientProjectsSort = sortMode;
    try {
      localStorage.setItem(CP_CLIENT_SORT_KEY, sortMode);
    } catch (e) { /* ignore */ }
    syncClientProjectsSortChips();
    renderClientProjectsPickerList();
  }

  /** Auto stack: Converting+Client stack when sparse; Demo wraps when busy. */
  function applyDeliveryBoardLayoutClasses(bucketCounts) {
    var board = document.getElementById('cp-delivery-board');
    if (!board) return;
    var counts = bucketCounts || {};
    var convertingCount = Number(counts.converting) || 0;
    var clientCount = Number(counts.client) || 0;
    var sideCount = convertingCount + clientCount;
    var demoCount = Number(counts.demo) || 0;

    board.classList.remove(
      'is-layout-asymmetric',
      'is-layout-demo-wrap',
      'is-layout-sparse',
      'is-layout-sparse-stacked',
      'is-demo-cards-wrap'
    );

    board.classList.add('is-layout-sparse');
    if (sideCount <= CP_SPARSE_SIDE_MAX) {
      board.classList.add('is-layout-sparse-stacked');
      board.classList.add('is-demo-cards-wrap');
    } else if (demoCount >= 4) {
      board.classList.add('is-demo-cards-wrap');
    }
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
    var portfolioModal = document.getElementById('portfolio-project-modal');
    if (portfolioModal && portfolioModal.classList.contains('active')) {
      if (typeof window.closePortfolioProjectModal === 'function') {
        window.closePortfolioProjectModal();
      } else if (typeof closePortfolioProjectModal === 'function') {
        closePortfolioProjectModal();
      }
      return;
    }
    var unsavedModal = document.getElementById('portfolio-unsaved-confirm-modal');
    if (unsavedModal && unsavedModal.classList.contains('active')) {
      return;
    }
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
    var card = document.querySelector('.cp-delivery-card.is-selected, .cp-client-picker-card.is-selected');
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

  function renderMilestonesStatusPillHtml(milestones) {
    var total = Array.isArray(milestones) ? milestones.length : 0;
    if (!total) return '<span class="cp-section-status-pill is-empty">No milestones</span>';
    var done = milestones.filter(function (m) { return m && m.done; }).length;
    return '<span class="cp-section-status-pill is-set">' + done + '/' + total + ' done</span>';
  }

  function renderCpMilestoneRowHtml(milestone) {
    milestone = milestone || { label: '', done: false };
    return (
      '<li class="hub-milestone cp-hub-milestone" data-cp-milestone-row>' +
      '<label class="custom-switch-label">' +
      '<input type="checkbox" class="custom-switch-input"' + (milestone.done ? ' checked' : '') + '>' +
      '<span class="custom-switch" aria-hidden="true"></span>' +
      '</label>' +
      '<input type="text" class="form-input hub-milestone-label" value="' + esc(milestone.label || '') + '" placeholder="Milestone label">' +
      '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="remove-milestone">Remove</button>' +
      '</li>'
    );
  }

  function renderCpMilestonesHtml(milestones) {
    return (Array.isArray(milestones) ? milestones : []).map(renderCpMilestoneRowHtml).join('');
  }

  function addCpMilestoneRow() {
    var list = document.getElementById('cp-hub-milestones');
    if (!list) return;
    list.insertAdjacentHTML('beforeend', renderCpMilestoneRowHtml({ label: '', done: false }));
    var rows = list.querySelectorAll('[data-cp-milestone-row]');
    var last = rows[rows.length - 1];
    var lastInput = last ? last.querySelector('.hub-milestone-label') : null;
    if (lastInput) lastInput.focus();
  }

  function removeCpMilestoneRow(btn) {
    var row = btn && btn.closest ? btn.closest('[data-cp-milestone-row]') : null;
    if (row) row.remove();
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
      var hubBits = [];
      if (hub.title || hub.clientName) hubBits.push(hub.title || hub.clientName);
      hubBits.push(deliveryStageLabel(hub));
      if (hub.demoBranch) hubBits.push(hub.demoBranch);
      else if (hub.expoUrl) hubBits.push('Preview set');
      return hubBits.join(' · ');
    }
    if (id === 'milestones') {
      var mDone = (hub.milestones || []).filter(function (m) {
        return m.done;
      }).length;
      var mTotal = hub.milestones ? hub.milestones.length : 0;
      if (!mTotal) return 'No milestones yet';
      return mDone + '/' + mTotal + ' complete';
    }
    if (id === 'portal') {
      var token = hub.portalToken;
      var expires = hub.portalExpiresAt;
      if (!token || (expires && expires < Date.now())) return 'No active link';
      var expiry = formatPortalExpiry(expires);
      return expiry ? 'Active · expires ' + expiry : 'Active';
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
      var guides = normalizePortalGuides(hub);
      if (!guides.length) return 'No guide files';
      if (guides.length === 1) {
        var oneFile = String(guides[0].url || '').split('/').filter(Boolean).pop() || guides[0].url;
        return '1 guide · ' + oneFile;
      }
      return guides.length + ' guides added';
    }
    if (id === 'portfolio') {
      if (!hub.portfolioProjectId && !portfolio) return 'Not linked';
      if (portfolio && hub.portfolioProjectId === portfolio.id) return portfolio.title || 'Linked';
      return 'Save link for portal';
    }
    if (id === 'delivery') {
      var stage = deliveryStageOf(hub);
      var bits = [deliveryStageLabel(stage)];
      if (hub.demoBranch) bits.push(hub.demoBranch);
      else if (hub.expoUrl) bits.push('Preview set');
      else bits.push('No preview');
      return bits.join(' · ');
    }
    return '';
  }

  function renderCpGuideRowHtml(guide, index) {
    guide = guide || { url: '', title: 'Project guide' };
    return (
      '<div class="cp-guide-row" data-cp-guide-row>' +
      '<div class="cp-guide-row-head">' +
      '<strong>Guide ' +
      (index + 1) +
      '</strong>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="remove-guide-row">Remove</button>' +
      '</div>' +
      '<div class="form-group"><label>Guide file (private)</label>' +
      '<input class="form-input" type="text" data-cp-guide-url value="' +
      esc(guide.url || '') +
      '" placeholder="/assets/docs/projects/lawncare/admin-guide.md">' +
      '<p class="form-hint">Path to a <code>.md</code> or <code>.pdf</code> under <code>/assets/docs/projects/</code>.</p></div>' +
      '<div class="form-group"><label>Guide section title</label>' +
      '<input class="form-input" type="text" maxlength="120" data-cp-guide-title value="' +
      esc(guide.title || 'Project guide') +
      '" placeholder="Admin guide"></div></div>'
    );
  }

  function renderCpGuidesListHtml(guides) {
    var list = Array.isArray(guides) && guides.length ? guides : [{ url: '', title: 'Project guide' }];
    return (
      '<div class="cp-guides-list" id="cp-guides-list">' +
      list
        .map(function (g, i) {
          return renderCpGuideRowHtml(g, i);
        })
        .join('') +
      '</div>'
    );
  }

  function collectPortalGuidesFromWorkspace() {
    var root = document.getElementById('client-projects-workspace');
    if (!root) return [];
    var out = [];
    root.querySelectorAll('[data-cp-guide-row]').forEach(function (row) {
      var urlInput = row.querySelector('[data-cp-guide-url]');
      var titleInput = row.querySelector('[data-cp-guide-title]');
      var url = normalizePortalCanvasDocUrl(urlInput ? urlInput.value : '');
      if (!url) return;
      out.push({
        url: url,
        title: String((titleInput && titleInput.value) || 'Project guide').trim().slice(0, 120) || 'Project guide'
      });
    });
    return out.slice(0, MAX_PORTAL_GUIDES);
  }

  function renumberCpGuideRows(listEl) {
    if (!listEl) return;
    listEl.querySelectorAll('[data-cp-guide-row]').forEach(function (row, i) {
      var label = row.querySelector('.cp-guide-row-head strong');
      if (label) label.textContent = 'Guide ' + (i + 1);
    });
  }

  function addCpGuideRow() {
    var list = document.getElementById('cp-guides-list');
    if (!list) return;
    if (list.querySelectorAll('[data-cp-guide-row]').length >= MAX_PORTAL_GUIDES) {
      setCpFeedback('guide', 'Maximum ' + MAX_PORTAL_GUIDES + ' guides per client.', true);
      return;
    }
    list.insertAdjacentHTML(
      'beforeend',
      renderCpGuideRowHtml({ url: '', title: 'Project guide' }, list.children.length)
    );
    renumberCpGuideRows(list);
  }

  function removeCpGuideRow(btn) {
    var row = btn && btn.closest ? btn.closest('[data-cp-guide-row]') : null;
    var list = document.getElementById('cp-guides-list');
    if (!row || !list) return;
    if (list.querySelectorAll('[data-cp-guide-row]').length <= 1) {
      var urlInput = row.querySelector('[data-cp-guide-url]');
      var titleInput = row.querySelector('[data-cp-guide-title]');
      if (urlInput) urlInput.value = '';
      if (titleInput) titleInput.value = 'Project guide';
      return;
    }
    row.remove();
    renumberCpGuideRows(list);
  }

  function renderCpShowMaintPortalHtml(hub) {
    return (
      '<div class="form-group form-group-checkbox-row">' +
      '<label class="custom-switch-label">' +
      '<input type="checkbox" id="cp-hub-show-maint-portal" class="custom-switch-input"' +
      (hub.showMaintenanceInPortal !== false ? ' checked' : '') +
      '>' +
      '<span class="custom-switch" aria-hidden="true"></span>' +
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

  function buildCpCollapsibleSection(sectionId, title, tabId, bodyHtml, summary, expanded, titleBadgeHtml) {
    var isOpen = expanded === true;
    var panelId = 'cp-section-panel-' + sectionId;
    var tabLink = tabId
      ? '<button type="button" class="cp-section-link" data-cp-action="open-tab" data-tab="' + esc(tabId) + '">Open full tab →</button>'
      : '';
    return (
      '<section class="cp-section cp-section--collapsible' + (isOpen ? ' is-expanded' : '') + '" data-cp-section="' + esc(sectionId) + '">' +
      '<div class="cp-section-header">' +
      '<button type="button" class="cp-section-toggle" data-cp-action="toggle-section" aria-expanded="' + (isOpen ? 'true' : 'false') + '" aria-controls="' + panelId + '">' +
      '<span class="cp-section-chevron" aria-hidden="true"></span>' +
      '<span class="cp-section-toggle-text">' +
      '<span class="cp-section-toggle-title">' +
      esc(title) +
      (titleBadgeHtml || '') +
      '</span>' +
      (summary ? '<span class="cp-section-toggle-summary">' + esc(summary) + '</span>' : '') +
      '</span></button>' +
      tabLink +
      '</div>' +
      '<div class="cp-section-collapse-wrap" id="' + panelId + '">' +
      '<div class="cp-section-collapse-inner"><div class="cp-section-body">' + bodyHtml + '</div></div></div></section>'
    );
  }

  function collectCpMilestonesFromWorkspace(root) {
    var rows = root.querySelectorAll('#cp-hub-milestones [data-cp-milestone-row]');
    var out = [];
    rows.forEach(function (row) {
      var label = row.querySelector('.hub-milestone-label');
      var text = label ? label.value.trim() : '';
      if (!text) return;
      var chk = row.querySelector('input[type="checkbox"]');
      out.push({
        id: 'm' + out.length,
        label: text,
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
        '<p>No client showcase linked yet. Private showcases stay off the public Portfolio tab — share them using the Client portal link.</p>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="create-showcase">Create client showcase</button>' +
        '</div>';
    }

    sectionCtx.maint = maint;
    sectionCtx.health = health;
    sectionCtx.lead = lead;
    sectionCtx.docs = docs;
    sectionCtx.portfolio = portfolio;

    var stage = deliveryStageOf(hub);
    var templates = getTemplatePortfolioList();
    var templateOptions =
      '<option value="">No template assigned…</option>' +
      templates
        .map(function (p) {
          var selected = !!(hub.portfolioProjectId && hub.portfolioProjectId === p.id);
          var best =
            Array.isArray(p.bestFor) && p.bestFor.length
              ? ' — ' + p.bestFor.slice(0, 2).join(', ')
              : '';
          return (
            '<option value="' +
            esc(p.id) +
            '" ' +
            (selected ? 'selected' : '') +
            '>' +
            esc(p.title || p.id) +
            esc(best) +
            '</option>'
          );
        })
        .join('');
    if (
      hub.portfolioProjectId &&
      !templates.some(function (p) {
        return p.id === hub.portfolioProjectId;
      })
    ) {
      templateOptions +=
        '<option value="' +
        esc(hub.portfolioProjectId) +
        '" selected>' +
        esc((portfolio && portfolio.title) || hub.portfolioProjectId) +
        ' (not marked template)</option>';
    }

    var repoLabel = stage === 'client' ? 'Working / template repo URL' : 'Template / working repo URL';
    var fbLabel = stage === 'client' ? 'Client Firebase project ID' : 'Demo Firebase project ID';
    var expoLabel = stage === 'client' ? 'Live / Expo URL' : 'EAS preview URL';

    var hubBody =
      '<div class="cp-form-grid cp-form-grid--can-split">' +
      '<div class="form-group"><label for="cp-hub-client">Client name</label><input id="cp-hub-client" class="form-input" type="text" value="' + esc(hub.clientName) + '"></div>' +
      '<div class="form-group"><label for="cp-hub-client-email">Client email</label><input id="cp-hub-client-email" class="form-input" type="email" value="' + esc(hub.clientEmail || '') + '" placeholder="name@company.com" autocomplete="email"></div>' +
      '<div class="form-group"><label for="cp-hub-title">Project title</label><input id="cp-hub-title" class="form-input" type="text" value="' + esc(hub.title) + '"></div>' +
      '<div class="form-group"><label for="cp-hub-lead">Pipeline lead ID</label><input id="cp-hub-lead" class="form-input" type="text" value="' + esc(hub.leadId) + '" placeholder="Link to pipelineLeads id"></div>' +
      '</div>' +
      '<fieldset class="hub-delivery-fieldset cp-delivery-block">' +
      '<legend class="hub-delivery-legend">Delivery (template → demo → client)</legend>' +
      '<div class="cp-form-grid cp-form-grid--can-split">' +
      '<div class="form-group"><label for="cp-hub-delivery-stage">Delivery stage</label>' +
      '<select id="cp-hub-delivery-stage" class="form-input">' +
      ['demo', 'converting', 'client']
        .map(function (st) {
          return (
            '<option value="' +
            st +
            '" ' +
            (stage === st ? 'selected' : '') +
            '>' +
            esc(deliveryStageLabel(st)) +
            '</option>'
          );
        })
        .join('') +
      '</select></div>' +
      '<div class="form-group"><label for="cp-hub-demo-branch">Demo branch</label>' +
      '<input id="cp-hub-demo-branch" class="form-input" type="text" maxlength="120" placeholder="demo/lead-slug" value="' +
      esc(hub.demoBranch || '') +
      '" autocomplete="off"></div>' +
      '<div class="form-group form-group--full"><label for="cp-hub-template">Assign starter template</label>' +
      '<select id="cp-hub-template" class="form-input">' +
      templateOptions +
      '</select>' +
      '<p class="form-hint">Templates only. Assigning prefills template repo + demo Firebase while stage is Demo.</p></div>' +
      '<div class="form-group"><label for="cp-hub-expo" id="cp-hub-expo-label">' +
      esc(expoLabel) +
      '</label><input id="cp-hub-expo" class="form-input" type="text" inputmode="url" autocomplete="off" placeholder="https://your-app.expo.app" value="' +
      esc(hub.expoUrl) +
      '"></div>' +
      '<div class="form-group"><label for="cp-hub-repo" id="cp-hub-repo-label">' +
      esc(repoLabel) +
      '</label><input id="cp-hub-repo" class="form-input" type="text" inputmode="url" autocomplete="off" placeholder="https://…" value="' +
      esc(hub.repoUrl) +
      '"></div>' +
      '<div class="form-group"><label for="cp-hub-client-repo">Client repo URL (after pay)</label>' +
      '<input id="cp-hub-client-repo" class="form-input" type="text" inputmode="url" autocomplete="off" placeholder="New codebase after they continue" value="' +
      esc(hub.clientRepoUrl || '') +
      '"></div>' +
      '<div class="form-group"><label for="cp-hub-firebase" id="cp-hub-firebase-label">' +
      esc(fbLabel) +
      '</label><input id="cp-hub-firebase" class="form-input" type="text" value="' +
      esc(hub.firebaseProjectId) +
      '"></div>' +
      '<div class="form-group"><label for="cp-hub-doc-id">Business doc ID</label><input id="cp-hub-doc-id" class="form-input" type="text" value="' + esc(hub.businessDocId) + '"></div>' +
      '<div class="form-group"><label for="cp-hub-build-estimate">Build hours estimate</label><input id="cp-hub-build-estimate" class="form-input" type="number" min="0" step="0.5" inputmode="decimal" value="' +
      esc(String(hub.buildHoursEstimate || 0)) +
      '"></div>' +
      '<div class="form-group"><label for="cp-hub-build-spent">Build hours spent</label><input id="cp-hub-build-spent" class="form-input" type="number" min="0" step="0.5" inputmode="decimal" value="' +
      esc(String(hub.buildHoursSpent || 0)) +
      '"></div>' +
      '</div></fieldset>' +
      '<div class="cp-form-grid">' +
      '<div class="form-group form-group--full"><label for="cp-hub-notes">Notes</label><textarea id="cp-hub-notes" class="form-input has-scrollbar" rows="3">' + esc(hub.notes) + '</textarea></div>' +
      '</div>' +
      '<div class="cp-section-actions">' +
      '<button type="button" class="btn btn-primary btn-sm" data-cp-action="save-hub">Save hub</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="graduate-client">Graduate to client</button>' +
      '<button type="button" class="btn btn-danger btn-sm" data-cp-action="delete-hub">Delete client</button>' +
      '<p class="cp-section-feedback" data-cp-feedback="hub" role="status"></p></div>';

    var deliveryTitleBadge =
      '<span class="cp-section-status-pill hub-delivery-badge--' +
      esc(stage) +
      '">' +
      esc(deliveryStageLabel(stage)) +
      (hub.expoUrl ? ' · preview' : '') +
      '</span>';

    var milestonesBody =
      '<div class="form-group"><ul class="cp-milestones-list" id="cp-hub-milestones">' + renderCpMilestonesHtml(hub.milestones) + '</ul>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="add-milestone">Add milestone</button></div>' +
      '<div class="cp-section-actions">' +
      '<button type="button" class="btn btn-primary btn-sm" data-cp-action="save-milestones">Save milestones</button>' +
      '<p class="cp-section-feedback" data-cp-feedback="milestones" role="status"></p></div>';
    var milestonesTitleBadge = renderMilestonesStatusPillHtml(hub.milestones);

    var portalBody =
      '<p class="form-hint">Share a private link so this client can view project status, docs, and showcase.</p>' +
      renderCpHubPortalHtml(hub) +
      '<div class="cp-section-actions">' +
      '<p class="cp-section-feedback" data-cp-feedback="portal" role="status"></p></div>';

    var hubGuides = normalizePortalGuides(hub);
    var guideStatus = hubGuides.length
      ? '<div class="cp-guide-status is-set" role="status">' +
        '<ion-icon name="checkmark-circle" aria-hidden="true"></ion-icon>' +
        '<div><strong>' +
        hubGuides.length +
        (hubGuides.length === 1 ? ' guide linked' : ' guides linked') +
        '</strong>' +
        '<ul class="cp-guide-status-list">' +
        hubGuides
          .map(function (g) {
            return (
              '<li><span class="cp-guide-status-title">' +
              esc(g.title || 'Project guide') +
              '</span> · <code>' +
              esc(g.url) +
              '</code></li>'
            );
          })
          .join('') +
        '</ul>' +
        '<p class="form-hint">Each guide appears as its own section in the client portal.</p></div></div>'
      : '<div class="cp-guide-status is-empty" role="status">' +
        '<ion-icon name="document-outline" aria-hidden="true"></ion-icon>' +
        '<div><strong>No guide files yet</strong>' +
        '<p class="form-hint">Add one or more paths below and click Save docs &amp; guides. There is no upload — each <code>.md</code> must already live in the repo.</p></div></div>';
    var guideBody =
      guideStatus +
      '<p class="form-hint">Private client-only docs under <code>/assets/docs/projects/</code>. Not shown on the public site. No portfolio link required.</p>' +
      renderCpGuidesListHtml(hubGuides) +
      '<div class="cp-section-actions">' +
      '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="add-guide-row">Add another guide</button>' +
      '<button type="button" class="btn btn-primary btn-sm" data-cp-action="save-guide">Save docs &amp; guides</button>' +
      '<p class="cp-section-feedback" data-cp-feedback="guide" role="status"></p></div>';
    var guideTitleBadge = hubGuides.length
      ? '<span class="cp-section-status-pill is-set">' + hubGuides.length + ' added</span>'
      : '<span class="cp-section-status-pill is-empty">Missing</span>';

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
        '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="email-maint-setup">Email: set up maintenance →</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="email-maint-invoice">Email: invoice ready →</button>' +
        '<button type="button" class="btn btn-danger btn-sm" data-cp-action="delete-maint">Delete maintenance</button>' +
        '<p class="cp-section-feedback" data-cp-feedback="maint" role="status"></p></div>'
      : renderCpShowMaintPortalHtml(hub) +
        '<div class="cp-section-actions">' +
        '<button type="button" class="btn btn-primary btn-sm" data-cp-action="save-maint-portal">Save portal visibility</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="email-maint-setup">Email: set up maintenance →</button>' +
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
          '<label class="custom-switch-label">' +
          '<input type="checkbox" id="cp-health-' + key + '" name="cp-health-' + key + '" class="custom-switch-input" ' + (health && health[key] ? 'checked' : '') + '>' +
          '<span class="custom-switch" aria-hidden="true"></span>' +
          '<span>' + esc(labels[key] || key) + '</span></label></li>'
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
        ['lead', 'demo', 'proposal', 'deposit'].map(function (st) {
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
        : '<em class="cp-email-prefill-missing">No portal link yet — generate one in Client portal</em>') +
      '</span></div>' +
      '<p class="form-hint">Client name, email, and portal link will be pre-filled. You only need to choose a template and write the subject &amp; message.</p>' +
      '</div>' +
      '<div class="cp-section-actions">' +
      '<button type="button" class="btn btn-primary btn-sm" data-cp-action="open-email">Compose email →</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="invite-schedule">Invite to schedule →</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="email-maint-setup">Email: set up maintenance →</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="email-maint-invoice">Email: invoice ready →</button>' +
      '</div>';

    workspace.innerHTML =
      buildCpCollapsibleSection('hub', 'Project Hub', null, hubBody, cpSectionSummary('hub', sectionCtx), isCpSectionExpanded(hub.id, 'hub'), deliveryTitleBadge) +
      buildCpCollapsibleSection('milestones', 'Milestones', null, milestonesBody, cpSectionSummary('milestones', sectionCtx), isCpSectionExpanded(hub.id, 'milestones'), milestonesTitleBadge) +
      buildCpCollapsibleSection('portal', 'Client portal', null, portalBody, cpSectionSummary('portal', sectionCtx), isCpSectionExpanded(hub.id, 'portal')) +
      buildCpCollapsibleSection('guide', 'Docs & guides', null, guideBody, cpSectionSummary('guide', sectionCtx), isCpSectionExpanded(hub.id, 'guide'), guideTitleBadge) +
      buildCpCollapsibleSection('maintenance', 'Maintenance & SLA', null, maintBody, cpSectionSummary('maintenance', sectionCtx), isCpSectionExpanded(hub.id, 'maintenance')) +
      buildCpCollapsibleSection('health', 'Firebase Health', null, healthBody, cpSectionSummary('health', sectionCtx), isCpSectionExpanded(hub.id, 'health')) +
      buildCpCollapsibleSection('pipeline', 'Pipeline & deal', 'pipeline', pipelineBody, cpSectionSummary('pipeline', sectionCtx), isCpSectionExpanded(hub.id, 'pipeline')) +
      buildCpCollapsibleSection('docs', 'Business documents', 'docs', docsHtml, cpSectionSummary('docs', sectionCtx), isCpSectionExpanded(hub.id, 'docs')) +
      buildCpCollapsibleSection('portfolio', 'Portfolio project', 'portfolio', portfolioBody, cpSectionSummary('portfolio', sectionCtx), isCpSectionExpanded(hub.id, 'portfolio')) +
      buildCpCollapsibleSection('email', 'Send email', null, emailBody, cpSectionSummary('email', sectionCtx), isCpSectionExpanded(hub.id, 'email'));
  }

  function renderClientProjectsPickerList() {
    var onboard = document.getElementById('cp-client-onboard');
    var emptyEl = document.getElementById('cp-client-empty');
    var board = document.getElementById('cp-delivery-board');
    if (!board) return;
    syncClientProjectsSortChips();
    var query = clientProjectsSearchQuery.toLowerCase().trim();
    var depositLeads = getDepositLeadsWithoutHub().filter(function (lead) {
      return leadMatchesClientSearch(lead, query);
    });
    var filtered = sortClientHubs(
      agencyProjects.filter(function (p) {
        return hubMatchesClientSearch(p, query);
      }),
      clientProjectsSort
    );
    var buckets = { demo: [], converting: [], client: [] };
    filtered.forEach(function (p) {
      var stage = deliveryStageOf(p);
      if (!buckets[stage]) buckets[stage] = [];
      buckets[stage].push(p);
    });

    var hasAnySource = agencyProjects.length > 0 || getDepositLeadsWithoutHub().length > 0;
    var hasVisible = filtered.length > 0 || depositLeads.length > 0;

    if (emptyEl) {
      if (!hasVisible) {
        emptyEl.hidden = false;
        if (!hasAnySource) {
          emptyEl.innerHTML =
            '<p class="cp-client-picker-empty">No clients yet. ' +
            '<button type="button" class="btn btn-secondary btn-sm" data-cp-action="new-client">Add your first client</button></p>';
        } else {
          emptyEl.innerHTML = '<p class="cp-client-picker-empty">No clients match your search.</p>';
        }
      } else {
        emptyEl.hidden = true;
        emptyEl.innerHTML = '';
      }
    }

    if (onboard) {
      if (depositLeads.length) {
        onboard.hidden = false;
        onboard.innerHTML =
          '<div class="cp-client-onboard-head">Deposit paid — ready to onboard (' +
          depositLeads.length +
          ')</div>' +
          '<div class="cp-client-onboard-list">' +
          depositLeads.map(renderCpDepositLeadCard).join('') +
          '</div>';
      } else {
        onboard.hidden = true;
        onboard.innerHTML = '';
      }
    }

    board.hidden = !hasVisible;

    CP_DELIVERY_STAGES.forEach(function (stage) {
      var zone = document.getElementById('cp-delivery-cards-' + stage);
      var countEl = document.getElementById('cp-delivery-count-' + stage);
      var rows = buckets[stage] || [];
      if (countEl) countEl.textContent = String(rows.length);
      if (!zone) return;
      if (!rows.length) {
        zone.innerHTML =
          '<p class="cp-delivery-empty">No ' +
          esc(deliveryStageLabel(stage).toLowerCase()) +
          ' projects.</p>';
      } else {
        zone.innerHTML = rows.map(renderCpHubDeliveryCard).join('');
      }
    });

    applyDeliveryBoardLayoutClasses({
      demo: (buckets.demo || []).length,
      converting: (buckets.converting || []).length,
      client: (buckets.client || []).length
    });
  }

  async function moveHubDeliveryStage(projectId, stage) {
    if (!projectId) return;
    stage = deliveryStageOf({ deliveryStage: stage });
    if (CP_DELIVERY_STAGES.indexOf(stage) < 0) return;
    var hub = getHubById(projectId);
    if (!hub) return;
    if (deliveryStageOf(hub) === stage) return;
    if (!rtdbReady()) {
      alert('Unable to update stage right now.');
      return;
    }
    var prev = deliveryStageOf(hub);
    hub.deliveryStage = stage;
    renderClientProjectsPickerList();
    try {
      await window.rtdbUpdate(window.rtdbRef(window.rtdb, PATHS.projects + '/' + projectId), {
        deliveryStage: stage,
        updatedAt: ts()
      });
      if (clientProjectsSelectedId === projectId) {
        renderClientProjectsWorkspace();
      }
    } catch (err) {
      console.error('moveHubDeliveryStage', err);
      hub.deliveryStage = prev;
      renderClientProjectsPickerList();
      alert('Could not update delivery stage.');
    }
  }

  function initClientProjectsDeliveryDnd() {
    var board = document.getElementById('cp-delivery-board');
    if (!board || clientProjectsDndBound) return;
    clientProjectsDndBound = true;

    board.addEventListener('dragstart', function (e) {
      var card = e.target.closest('.cp-delivery-card');
      if (!card) return;
      cpDeliveryDragProjectId = card.getAttribute('data-project-id');
      cpDeliveryDragMoved = true;
      card.classList.add('is-dragging');
      if (e.dataTransfer) {
        e.dataTransfer.setData('text/plain', cpDeliveryDragProjectId || '');
        e.dataTransfer.effectAllowed = 'move';
      }
    });

    board.addEventListener('dragend', function (e) {
      var card = e.target.closest('.cp-delivery-card');
      if (card) card.classList.remove('is-dragging');
      cpDeliveryDragProjectId = null;
      board.querySelectorAll('.cp-delivery-cards.drag-over').forEach(function (el) {
        el.classList.remove('drag-over');
      });
      // Suppress the click that browsers fire after a drag.
      window.setTimeout(function () {
        cpDeliveryDragMoved = false;
      }, 0);
    });

    board.addEventListener('dragover', function (e) {
      var zone = e.target.closest('.cp-delivery-cards');
      if (!zone) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      board.querySelectorAll('.cp-delivery-cards.drag-over').forEach(function (el) {
        el.classList.remove('drag-over');
      });
      zone.classList.add('drag-over');
    });

    board.addEventListener('dragleave', function (e) {
      var zone = e.target.closest('.cp-delivery-cards');
      if (zone && !zone.contains(e.relatedTarget)) zone.classList.remove('drag-over');
    });

    board.addEventListener('drop', function (e) {
      var zone = e.target.closest('.cp-delivery-cards');
      if (!zone) return;
      e.preventDefault();
      zone.classList.remove('drag-over');
      var col = zone.closest('.cp-delivery-col');
      if (!col) return;
      var stage = col.getAttribute('data-delivery-stage') || zone.getAttribute('data-delivery-stage');
      var projectId =
        cpDeliveryDragProjectId || (e.dataTransfer && e.dataTransfer.getData('text/plain'));
      if (!projectId || !stage) return;
      moveHubDeliveryStage(projectId, stage);
    });
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

  async function saveHubFromClientWorkspace(feedbackSection) {
    feedbackSection = feedbackSection || 'hub';
    var hubId = clientProjectsSelectedId;
    if (!hubId || !rtdbReady()) return;
    var existing = getHubById(hubId);
    if (!existing) return;
    var root = document.getElementById('client-projects-workspace');
    var stageVal = (document.getElementById('cp-hub-delivery-stage') || {}).value || existing.deliveryStage || 'demo';
    var templateId = (document.getElementById('cp-hub-template') || {}).value;
    if (templateId == null || templateId === undefined) {
      templateId = existing.portfolioProjectId || '';
    } else {
      templateId = String(templateId).trim();
    }
    var payload = buildHubWritePayload(existing, {
      leadId: cpFieldValue('cp-hub-lead'),
      clientName: cpFieldValue('cp-hub-client'),
      clientEmail: cpFieldValue('cp-hub-client-email'),
      title: cpFieldValue('cp-hub-title'),
      repoUrl: normalizeHubExternalUrl(cpFieldValue('cp-hub-repo')),
      expoUrl: normalizeHubExternalUrl(cpFieldValue('cp-hub-expo')),
      firebaseProjectId: cpFieldValue('cp-hub-firebase'),
      businessDocId: cpFieldValue('cp-hub-doc-id'),
      portfolioProjectId: templateId,
      demoBranch: cpFieldValue('cp-hub-demo-branch'),
      deliveryStage: stageVal,
      clientRepoUrl: normalizeHubExternalUrl(cpFieldValue('cp-hub-client-repo')),
      graduatedAt:
        deliveryStageOf({ deliveryStage: stageVal }) === 'client'
          ? existing.graduatedAt || ts()
          : existing.graduatedAt || null,
      notes: cpFieldValue('cp-hub-notes'),
      milestones: root ? collectCpMilestonesFromWorkspace(root) : existing.milestones,
      enabledModules: Array.isArray(existing.enabledModules) ? existing.enabledModules.slice() : [],
      showMaintenanceInPortal: readCpShowMaintPortalChecked(existing),
      buildHoursEstimate: Math.max(0, Number((document.getElementById('cp-hub-build-estimate') || {}).value) || 0),
      buildHoursSpent: Math.max(0, Number((document.getElementById('cp-hub-build-spent') || {}).value) || 0)
    });
    try {
      await saveProjectHubRecord(hubId, payload, false);
      setCpFeedback(feedbackSection, feedbackSection === 'milestones' ? 'Milestones saved.' : 'Hub saved.', false);
      renderClientProjectsWorkspace();
      renderTimeCapacityPanel();
      if (typeof window.renderAdminOverview === 'function') window.renderAdminOverview();
    } catch (err) {
      console.error(err);
      setCpFeedback(feedbackSection, (err && err.message) || 'Save failed.', true);
    }
  }

  async function graduateHubFromClientWorkspace() {
    var hubId = clientProjectsSelectedId;
    if (!hubId || !rtdbReady()) return;
    var existing = getHubById(hubId);
    if (!existing) return;
    var clientRepoEl = document.getElementById('cp-hub-client-repo');
    var fbEl = document.getElementById('cp-hub-firebase');
    openGraduateClientModal('workspace', {
      repo: clientRepoEl ? clientRepoEl.value : existing.clientRepoUrl || '',
      firebase: fbEl ? fbEl.value : existing.firebaseProjectId || ''
    });
  }

  async function saveGuideFromClientWorkspace() {
    var hubId = clientProjectsSelectedId;
    if (!hubId || !rtdbReady()) return;
    var existing = getHubById(hubId);
    if (!existing) return;
    var guideFields = portalGuideFieldsFromList(collectPortalGuidesFromWorkspace());
    var payload = buildHubWritePayload(existing, {
      portalGuides: guideFields.portalGuides,
      portalCanvasDocUrl: guideFields.portalCanvasDocUrl,
      portalCanvasDocTitle: guideFields.portalCanvasDocTitle
    });
    try {
      await saveProjectHubRecord(hubId, payload, false);
      var n = guideFields.portalGuides.length;
      setCpFeedback(
        'guide',
        (n === 0
          ? 'Docs & guides cleared'
          : n === 1
            ? '1 guide saved'
            : n + ' guides saved') + ' — refresh the client portal to see changes.',
        false
      );
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
    var payload = buildHubWritePayload(existing, {
      showMaintenanceInPortal: readCpShowMaintPortalChecked(existing)
    });
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
      renderTimeCapacityPanel();
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
    var payload = buildHubWritePayload(existing, { portfolioProjectId: portfolioId });
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
    var payload = buildHubWritePayload(existing, { portfolioProjectId: portfolioId });
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
    var payload = buildHubWritePayload(existing, { portfolioProjectId: '' });
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
    if (action === 'email-maint-setup' || action === 'email-maint-invoice') {
      if (!hub) return;
      var maintEmailName = String(
        (document.getElementById('cp-hub-client') || {}).value || hub.clientName || ''
      ).trim();
      var maintEmailAddr = String(
        (document.getElementById('cp-hub-client-email') || {}).value || hub.clientEmail || ''
      ).trim();
      var maintEmailLink = hub.portalToken ? clientPortalUrl(hub.portalToken) : '';
      var maintTemplateId =
        action === 'email-maint-invoice' ? 'maintenance-invoice' : 'maintenance-setup';
      var maintNext =
        action === 'email-maint-invoice'
          ? 'Open the portal and review your invoice'
          : 'Pick a plan in your portal';
      closeCpClientDrawer();
      window.requestAnimationFrame(function () {
        if (typeof window.adminActivateTab === 'function') window.adminActivateTab('client-email');
        if (typeof window.prefillAdminClientEmail === 'function') {
          window.prefillAdminClientEmail({
            name: maintEmailName,
            email: maintEmailAddr,
            link: maintEmailLink,
            templateId: maintTemplateId,
            nextStep: maintNext
          });
        }
      });
      return;
    }
    if (action === 'invite-schedule') {
      if (!hub) return;
      var schedName = String((document.getElementById('cp-hub-client') || {}).value || hub.clientName || '').trim();
      var schedEmail = String((document.getElementById('cp-hub-client-email') || {}).value || hub.clientEmail || '').trim();
      var schedHubId = String(hub.id || clientProjectsSelectedId || '').trim();
      var openInvite = function (callTypeId) {
        var schedLink =
          typeof window.buildScheduleInviteUrl === 'function'
            ? window.buildScheduleInviteUrl({
                name: schedName,
                email: schedEmail,
                hubId: schedHubId,
                type: callTypeId || ''
              })
            : String(window.PORTFOLIO_PUBLIC_ORIGIN || location.origin || '').replace(/\/$/, '') + '/schedule';
        closeCpClientDrawer();
        window.requestAnimationFrame(function () {
          if (typeof window.adminActivateTab === 'function') window.adminActivateTab('client-email');
          if (typeof window.prefillAdminClientEmail === 'function') {
            window.prefillAdminClientEmail({
              name: schedName,
              email: schedEmail,
              link: schedLink,
              templateId: 'schedule-call',
              nextStep: 'Book a slot that works for you',
              hubId: schedHubId,
              callTypeId: callTypeId || ''
            });
          }
        });
      };
      if (typeof window.getDefaultScheduleCallType === 'function') {
        window.getDefaultScheduleCallType().then(function (ct) {
          openInvite(ct && ct.id ? ct.id : '');
        }).catch(function () {
          openInvite('');
        });
      } else {
        openInvite('');
      }
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
      setCpFeedback('portal', 'Portal link copied.', false);
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
          setCpFeedback('portal', 'Portal link emailed to ' + emailHub.clientEmail + '.', false);
        })
        .catch(function (err) {
          setCpFeedback('portal', (err && err.message) || 'Could not send portal email.', true);
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
      saveHubFromClientWorkspace('hub').catch(console.error);
      return;
    }
    if (action === 'graduate-client') {
      graduateHubFromClientWorkspace().catch(console.error);
      return;
    }
    if (action === 'save-milestones') {
      saveHubFromClientWorkspace('milestones').catch(console.error);
      return;
    }
    if (action === 'save-guide') {
      saveGuideFromClientWorkspace().catch(console.error);
      return;
    }
    if (action === 'add-guide-row') {
      addCpGuideRow();
      return;
    }
    if (action === 'remove-guide-row') {
      removeCpGuideRow(el);
      return;
    }
    if (action === 'add-milestone') {
      addCpMilestoneRow();
      return;
    }
    if (action === 'remove-milestone') {
      removeCpMilestoneRow(el);
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
    initGraduateClientModal();
    setupCpClientDrawer();

    var search = document.getElementById('client-projects-search');
    if (search && !search.dataset.cpBound) {
      search.dataset.cpBound = '1';
      search.addEventListener('input', function () {
        clientProjectsSearchQuery = search.value || '';
        renderClientProjectsPickerList();
      });
    }

    var sortRoot = document.getElementById('client-projects-sort');
    if (sortRoot && !clientProjectsSortBound) {
      clientProjectsSortBound = true;
      sortRoot.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-cp-sort]');
        if (!btn || !sortRoot.contains(btn)) return;
        e.preventDefault();
        setClientProjectsSort(btn.getAttribute('data-cp-sort'));
      });
    }
    syncClientProjectsSortChips();

    var addBtn = document.getElementById('client-projects-add-btn');
    if (addBtn && !addBtn.dataset.cpBound) {
      addBtn.dataset.cpBound = '1';
      addBtn.addEventListener('click', function () {
        openNewClientModal();
      });
    }

    var picker = document.getElementById('cp-client-picker');
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
        if (cpDeliveryDragMoved) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        selectClientProject(card.getAttribute('data-cp-client-id'));
      });
      picker.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var card = e.target.closest('.cp-delivery-card[data-cp-client-id]');
        if (!card || !picker.contains(card)) return;
        e.preventDefault();
        selectClientProject(card.getAttribute('data-cp-client-id'));
      });
    }

    initClientProjectsDeliveryDnd();

    var workspace = document.getElementById('client-projects-workspace');
    if (workspace && !clientProjectsBound) {
      clientProjectsBound = true;
      workspace.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-cp-action]');
        if (!btn) return;
        e.preventDefault();
        handleClientProjectsAction(btn.getAttribute('data-cp-action'), btn);
      });
      workspace.addEventListener('change', function (e) {
        var t = e.target;
        if (!t || !t.id) return;
        if (t.id === 'cp-hub-template') {
          applyTemplatePrefillFromSelect(t, {
            force: true,
            stageEl: document.getElementById('cp-hub-delivery-stage'),
            repoEl: document.getElementById('cp-hub-repo'),
            fbEl: document.getElementById('cp-hub-firebase')
          });
          return;
        }
        if (t.id === 'cp-hub-delivery-stage') {
          var stage = deliveryStageOf({ deliveryStage: t.value });
          var repoLabel = document.getElementById('cp-hub-repo-label');
          var fbLabel = document.getElementById('cp-hub-firebase-label');
          var expoLabel = document.getElementById('cp-hub-expo-label');
          if (repoLabel) {
            repoLabel.textContent =
              stage === 'client' ? 'Working / template repo URL' : 'Template / working repo URL';
          }
          if (fbLabel) {
            fbLabel.textContent =
              stage === 'client' ? 'Client Firebase project ID' : 'Demo Firebase project ID';
          }
          if (expoLabel) {
            expoLabel.textContent = stage === 'client' ? 'Live / Expo URL' : 'EAS preview URL';
          }
        }
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
    if (typeof window.adminActivateTab === 'function') {
      window.adminActivateTab('client-projects');
    }
    var clientName = (lead.name || lead.company || '').trim();
    var titleBase = (lead.company || lead.name || '').trim();
    openNewClientModal({
      leadId: lead.id || '',
      clientName: clientName,
      title: titleBase ? titleBase + ' project' : ''
    });
  }

  /* ── Time Capacity tab ─────────────────────────────────────────── */

  var BUILD_WEEKLY_HORIZON = 4;
  var TC_TIMER_STORAGE_KEY = 'agencyTcFocusTimer';
  var timeCapacityBound = false;
  var tcCalMonth = null;
  var tcSelectedDay = null;
  var tcSyncingTotals = false;
  var tcTimerState = {
    status: 'idle',
    target: '',
    clientName: '',
    accumulatedMs: 0,
    segmentStartedAt: null
  };
  var tcTimerTickId = null;
  var tcTimerStopping = false;

  function weeksUntilDate(dateStr) {
    if (!dateStr) return BUILD_WEEKLY_HORIZON;
    var end = new Date(String(dateStr) + 'T12:00:00');
    if (isNaN(end.getTime())) return BUILD_WEEKLY_HORIZON;
    var now = new Date();
    var ms = end.getTime() - now.getTime();
    if (ms <= 0) return 1;
    return Math.max(1, ms / (7 * 86400000));
  }

  function roundHours(n) {
    return Math.round(Math.max(0, Number(n) || 0) * 10) / 10;
  }

  function formatHours(n) {
    var v = roundHours(n);
    return (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1)) + 'h';
  }

  function planTierLabel(tier) {
    var t = String(tier || 'standard').toLowerCase();
    if (t === 'priority') return 'Priority';
    if (t === 'essential') return 'Essential';
    return 'Standard';
  }

  function normalizeTimeEntry(id, row) {
    row = row || {};
    var kind = String(row.kind || 'build').toLowerCase() === 'maint' ? 'maint' : 'build';
    return {
      id: id,
      date: String(row.date || '').slice(0, 10),
      projectId: String(row.projectId || ''),
      maintenanceId: String(row.maintenanceId || ''),
      clientName: String(row.clientName || '').slice(0, 120),
      kind: kind,
      plannedHours: Math.max(0, Number(row.plannedHours) || 0),
      loggedHours: Math.max(0, Number(row.loggedHours) || 0),
      notes: String(row.notes || '').slice(0, 500),
      updatedAt: row.updatedAt || null,
      createdAt: row.createdAt || null
    };
  }

  function applyTimeEntriesFromVal(val) {
    agencyTimeEntries = [];
    if (val && typeof val === 'object') {
      Object.keys(val).forEach(function (id) {
        agencyTimeEntries.push(normalizeTimeEntry(id, val[id]));
      });
    }
    agencyTimeEntries.sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return String(a.clientName).localeCompare(String(b.clientName), undefined, { sensitivity: 'base' });
    });
    renderTimeCapacityPanel();
  }

  function todayTcDayKey() {
    var d = new Date();
    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')
    );
  }

  function ensureTcCalState() {
    if (!tcCalMonth || isNaN(tcCalMonth.getTime())) {
      var now = new Date();
      tcCalMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    if (!tcSelectedDay) tcSelectedDay = todayTcDayKey();
  }

  function tcWeekBoundsForDate(dateObj) {
    var start = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    start.setDate(start.getDate() - start.getDay());
    var end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    function key(d) {
      return (
        d.getFullYear() +
        '-' +
        String(d.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(d.getDate()).padStart(2, '0')
      );
    }
    return { startKey: key(start), endKey: key(end) };
  }

  function computeMaintCapacityRow(m) {
    var included = Math.max(0, Number(m.hoursIncluded) || 0);
    var used = Math.max(0, Number(m.hoursUsed) || 0);
    var remaining = Math.max(0, included - used);
    var overBy = Math.max(0, used - included);
    var weeks = weeksUntilDate(m.renewalDate);
    var weekly = remaining / weeks;
    var status = overBy > 0 ? 'over' : remaining <= 1 && included > 0 ? 'low' : 'ok';
    return {
      kind: 'maint',
      id: m.id,
      projectId: m.projectId || '',
      clientName: m.clientName || 'Client',
      planTier: m.planTier || 'standard',
      included: included,
      used: used,
      remaining: remaining,
      overBy: overBy,
      weekly: weekly,
      weeks: weeks,
      renewalDate: m.renewalDate || '',
      status: status
    };
  }

  function computeBuildCapacityRow(p) {
    var estimate = Math.max(0, Number(p.buildHoursEstimate) || 0);
    var spent = Math.max(0, Number(p.buildHoursSpent) || 0);
    var remaining = Math.max(0, estimate - spent);
    var overBy = Math.max(0, spent - estimate);
    var stage = deliveryStageOf(p);
    var weekly = remaining / BUILD_WEEKLY_HORIZON;
    var status =
      !estimate ? 'unset' : overBy > 0 ? 'over' : remaining <= 1 && estimate > 0 ? 'low' : 'ok';
    return {
      kind: 'build',
      id: p.id,
      projectId: p.id,
      clientName: p.clientName || p.title || 'Untitled',
      stage: stage,
      estimate: estimate,
      spent: spent,
      remaining: remaining,
      overBy: overBy,
      weekly: weekly,
      status: status
    };
  }

  function shouldShowBuildCapacity(p) {
    return deliveryStageOf(p) === 'client';
  }

  function getActiveMaintForCapacity() {
    return agencyMaintenance.filter(function (m) {
      return m.effectivePlanStatus === 'active' || m.effectivePlanStatus === 'pending';
    });
  }

  function getTimeCapacitySnapshot() {
    var maintRows = getActiveMaintForCapacity()
      .map(computeMaintCapacityRow)
      .sort(function (a, b) {
        if (a.status === 'over' && b.status !== 'over') return -1;
        if (b.status === 'over' && a.status !== 'over') return 1;
        if (a.status === 'low' && b.status !== 'low') return -1;
        if (b.status === 'low' && a.status !== 'low') return 1;
        return String(a.clientName).localeCompare(String(b.clientName), undefined, { sensitivity: 'base' });
      });

    var buildRows = agencyProjects
      .filter(shouldShowBuildCapacity)
      .map(computeBuildCapacityRow)
      .sort(function (a, b) {
        if (a.status === 'over' && b.status !== 'over') return -1;
        if (b.status === 'over' && a.status !== 'over') return 1;
        if (a.status === 'unset' && b.status !== 'unset') return 1;
        if (b.status === 'unset' && a.status !== 'unset') return -1;
        return String(a.clientName).localeCompare(String(b.clientName), undefined, { sensitivity: 'base' });
      });

    var suggestedWeek = 0;
    var maintRemaining = 0;
    var buildRemaining = 0;
    maintRows.forEach(function (r) {
      suggestedWeek += r.weekly;
      maintRemaining += r.remaining;
    });
    buildRows.forEach(function (r) {
      suggestedWeek += r.weekly;
      buildRemaining += r.remaining;
    });

    var week = tcWeekBoundsForDate(new Date());
    var weekPlanned = 0;
    var weekLogged = 0;
    agencyTimeEntries.forEach(function (e) {
      if (!e.date || e.date < week.startKey || e.date > week.endKey) return;
      weekPlanned += e.plannedHours;
      weekLogged += e.loggedHours;
    });

    return {
      maintRows: maintRows,
      buildRows: buildRows,
      suggestedWeek: suggestedWeek,
      maintRemaining: maintRemaining,
      buildRemaining: buildRemaining,
      weekPlanned: weekPlanned,
      weekLogged: weekLogged
    };
  }

  function getTcEntriesForDay(dayKey) {
    return agencyTimeEntries.filter(function (e) {
      return e.date === dayKey;
    });
  }

  function sumLoggedForProject(projectId, excludeId) {
    var total = 0;
    agencyTimeEntries.forEach(function (e) {
      if (excludeId && e.id === excludeId) return;
      if (e.kind === 'build' && e.projectId === projectId) total += e.loggedHours;
    });
    return roundHours(total);
  }

  function sumLoggedForMaint(maintenanceId, excludeId) {
    var total = 0;
    agencyTimeEntries.forEach(function (e) {
      if (excludeId && e.id === excludeId) return;
      if (e.kind === 'maint' && e.maintenanceId === maintenanceId) total += e.loggedHours;
    });
    return roundHours(total);
  }

  async function syncLoggedTotalsFromEntries(opts) {
    if (!rtdbReady() || tcSyncingTotals) return;
    opts = opts || {};
    tcSyncingTotals = true;
    try {
      if (opts.projectId) {
        var hub = getHubById(opts.projectId);
        if (hub) {
          var spent = sumLoggedForProject(opts.projectId);
          if (roundHours(hub.buildHoursSpent) !== spent) {
            await saveProjectHubRecord(
              opts.projectId,
              buildHubWritePayload(hub, { buildHoursSpent: spent }),
              false
            );
          }
        }
      }
      if (opts.maintenanceId) {
        var existing = agencyMaintenance.find(function (x) {
          return x.id === opts.maintenanceId;
        });
        if (existing) {
          var used = sumLoggedForMaint(opts.maintenanceId);
          if (roundHours(existing.hoursUsed) !== used) {
            var snap = await window.rtdbGet(
              window.rtdbRef(window.rtdb, PATHS.maintenance + '/' + opts.maintenanceId)
            );
            var row = snap.val() || {};
            await window.rtdbSet(
              window.rtdbRef(window.rtdb, PATHS.maintenance + '/' + opts.maintenanceId),
              Object.assign({}, row, { hoursUsed: used, updatedAt: ts() })
            );
          }
        }
      }
    } finally {
      tcSyncingTotals = false;
    }
  }

  function getTcAddTargetOptions() {
    var list = [];
    agencyProjects.filter(shouldShowBuildCapacity).forEach(function (p) {
      list.push({
        value: 'build:' + p.id,
        label: (p.clientName || p.title || 'Untitled') + ' · Build'
      });
    });
    getActiveMaintForCapacity().forEach(function (m) {
      list.push({
        value: 'maint:' + m.id,
        label: (m.clientName || 'Client') + ' · Maintenance'
      });
    });
    return list;
  }

  function syncTcAddTargetSelect(keepValue) {
    var hidden = document.getElementById('tc-add-target');
    if (!hidden) return;
    if (typeof window.setBusinessDocSelectOptions === 'function') {
      window.setBusinessDocSelectOptions(hidden, getTcAddTargetOptions(), {
        placeholder: 'Choose client…',
        keepValue: keepValue !== false
      });
      return;
    }
    if (typeof window.initBusinessDocCustomSelects === 'function') {
      window.initBusinessDocCustomSelects();
    }
  }

  function syncTcTimerTargetSelect(keepValue) {
    var hidden = document.getElementById('tc-timer-target');
    if (!hidden) return;
    var preferred = keepValue === false ? '' : String(hidden.value || '');
    if (typeof window.setBusinessDocSelectOptions === 'function') {
      window.setBusinessDocSelectOptions(hidden, getTcAddTargetOptions(), {
        placeholder: 'No client — just focus',
        keepValue: keepValue !== false,
        value: keepValue === false ? '' : undefined
      });
      if (keepValue !== false && preferred && typeof window.setBusinessDocSelectValue === 'function') {
        window.setBusinessDocSelectValue('tc-timer-target', preferred, true);
      }
      return;
    }
    if (typeof window.initBusinessDocCustomSelects === 'function') {
      window.initBusinessDocCustomSelects();
    }
  }

  function formatTcTimer(ms) {
    var total = Math.floor(Math.max(0, Number(ms) || 0) / 1000);
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = Math.floor(total % 60);
    return (
      String(h).padStart(2, '0') +
      ':' +
      String(m).padStart(2, '0') +
      ':' +
      String(s).padStart(2, '0')
    );
  }

  function getTcTimerElapsedMs() {
    var elapsed = Math.max(0, Number(tcTimerState.accumulatedMs) || 0);
    if (tcTimerState.status === 'running' && tcTimerState.segmentStartedAt) {
      elapsed += Math.max(0, Date.now() - tcTimerState.segmentStartedAt);
    }
    return elapsed;
  }

  function msToLoggedHours(ms) {
    if (ms < 60000) return 0;
    return Math.max(0.1, roundHours(ms / 3600000));
  }

  function persistTcTimerState() {
    try {
      sessionStorage.setItem(
        TC_TIMER_STORAGE_KEY,
        JSON.stringify({
          status: tcTimerState.status,
          target: tcTimerState.target,
          clientName: tcTimerState.clientName,
          accumulatedMs: tcTimerState.accumulatedMs,
          segmentStartedAt: tcTimerState.segmentStartedAt
        })
      );
    } catch (err) {
      /* ignore */
    }
  }

  function clearPersistedTcTimer() {
    try {
      sessionStorage.removeItem(TC_TIMER_STORAGE_KEY);
    } catch (err) {
      /* ignore */
    }
  }

  function loadPersistedTcTimer() {
    try {
      var raw = sessionStorage.getItem(TC_TIMER_STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      var status = parsed.status === 'running' || parsed.status === 'paused' ? parsed.status : 'idle';
      if (status === 'idle') return;
      tcTimerState = {
        status: status,
        target: String(parsed.target || ''),
        clientName: String(parsed.clientName || ''),
        accumulatedMs: Math.max(0, Number(parsed.accumulatedMs) || 0),
        segmentStartedAt:
          status === 'running' && parsed.segmentStartedAt
            ? Number(parsed.segmentStartedAt)
            : null
      };
    } catch (err) {
      /* ignore */
    }
  }

  function ensureTcTimerBarMounted() {
    var bar = document.getElementById('tc-timer-bar');
    if (!bar || !document.body) return;
    if (bar.parentElement !== document.body) {
      document.body.appendChild(bar);
    }
  }

  function setTcTimerFeedback(msg, isError) {
    var el = document.getElementById('tc-timer-feedback');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('is-error', !!isError && !!msg);
  }

  function isTcTimerActive() {
    return tcTimerState.status === 'running' || tcTimerState.status === 'paused';
  }

  function updateTcTimerUi() {
    ensureTcTimerBarMounted();
    var bar = document.getElementById('tc-timer-bar');
    var display = document.getElementById('tc-timer-display');
    var clientEl = document.getElementById('tc-timer-bar-client');
    var pauseBtn = document.getElementById('tc-timer-pause');
    var resumeBtn = document.getElementById('tc-timer-resume');
    var stopBtn = document.getElementById('tc-timer-stop');
    var openBtn = document.getElementById('tc-open-timer-drawer');
    var status = tcTimerState.status;
    var active = isTcTimerActive();
    var elapsed = getTcTimerElapsedMs();

    if (display) display.textContent = formatTcTimer(elapsed);
    if (clientEl) {
      clientEl.textContent = tcTimerState.clientName
        ? tcTimerState.clientName
        : 'Focus session';
    }
    if (bar) {
      bar.hidden = !active;
      bar.classList.toggle('is-running', status === 'running');
      bar.classList.toggle('is-paused', status === 'paused');
      bar.setAttribute('aria-hidden', active ? 'false' : 'true');
    }
    document.body.classList.toggle('tc-timer-bar-active', active);
    if (pauseBtn) pauseBtn.hidden = status !== 'running';
    if (resumeBtn) resumeBtn.hidden = status !== 'paused';
    if (stopBtn) stopBtn.hidden = !active;
    if (openBtn) {
      openBtn.disabled = active;
      openBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
      openBtn.title = active ? 'Focus session running' : 'Start a focus session';
    }
  }

  function stopTcTimerTick() {
    if (tcTimerTickId) {
      clearInterval(tcTimerTickId);
      tcTimerTickId = null;
    }
  }

  function startTcTimerTick() {
    stopTcTimerTick();
    tcTimerTickId = setInterval(function () {
      updateTcTimerUi();
    }, 250);
  }

  function resolveTcTimerTarget(target) {
    var parts = String(target || '').split(':');
    var kind = parts[0] === 'maint' ? 'maint' : 'build';
    var refId = parts.slice(1).join(':');
    if (!refId) return null;
    if (kind === 'build') {
      var hub = getHubById(refId);
      if (!hub || !shouldShowBuildCapacity(hub)) return null;
      return {
        kind: 'build',
        projectId: hub.id,
        maintenanceId: '',
        clientName: hub.clientName || hub.title || 'Untitled'
      };
    }
    var m = agencyMaintenance.find(function (x) {
      return x.id === refId;
    });
    if (!m) return null;
    return {
      kind: 'maint',
      projectId: m.projectId || '',
      maintenanceId: m.id,
      clientName: m.clientName || 'Client'
    };
  }

  async function addLoggedHoursForToday(opts) {
    if (!rtdbReady()) throw new Error('Not connected.');
    var hours = roundHours(opts.hours);
    if (hours <= 0) throw new Error('Nothing to log.');
    var date = todayTcDayKey();
    var kind = opts.kind === 'maint' ? 'maint' : 'build';
    var projectId = opts.projectId || '';
    var maintenanceId = opts.maintenanceId || '';
    var clientName = opts.clientName || 'Client';

    var dup = agencyTimeEntries.find(function (e) {
      return (
        e.date === date &&
        e.kind === kind &&
        ((kind === 'build' && e.projectId === projectId) ||
          (kind === 'maint' && e.maintenanceId === maintenanceId))
      );
    });

    if (dup) {
      var snap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATHS.timeEntries + '/' + dup.id));
      var row = snap.val() || {};
      var nextLogged = roundHours((Number(row.loggedHours) || 0) + hours);
      await window.rtdbSet(
        window.rtdbRef(window.rtdb, PATHS.timeEntries + '/' + dup.id),
        Object.assign({}, row, {
          loggedHours: nextLogged,
          clientName: clientName,
          updatedAt: ts()
        })
      );
      dup.loggedHours = nextLogged;
      dup.clientName = clientName;
    } else {
      var payload = {
        date: date,
        projectId: projectId,
        maintenanceId: maintenanceId,
        clientName: clientName,
        kind: kind,
        plannedHours: 0,
        loggedHours: hours,
        notes: '',
        createdAt: ts(),
        updatedAt: ts()
      };
      var ref = window.rtdbPush(window.rtdbRef(window.rtdb, PATHS.timeEntries));
      await window.rtdbSet(ref, payload);
      agencyTimeEntries.push(normalizeTimeEntry(ref.key, payload));
    }

    await syncLoggedTotalsFromEntries({
      projectId: projectId,
      maintenanceId: maintenanceId
    });
    return hours;
  }

  function resetTcTimerState() {
    stopTcTimerTick();
    tcTimerState = {
      status: 'idle',
      target: '',
      clientName: '',
      accumulatedMs: 0,
      segmentStartedAt: null
    };
    clearPersistedTcTimer();
    updateTcTimerUi();
  }

  function startTcFocusSession() {
    if (tcTimerState.status !== 'idle') return;
    var targetEl = document.getElementById('tc-timer-target');
    var target = targetEl ? String(targetEl.value || '') : '';
    var resolved = target ? resolveTcTimerTarget(target) : null;
    if (target && !resolved) {
      setTcTimerFeedback('That client is no longer available.', true);
      return;
    }
    setTcTimerFeedback('');
    tcTimerState = {
      status: 'running',
      target: resolved ? target : '',
      clientName: resolved ? resolved.clientName : '',
      accumulatedMs: 0,
      segmentStartedAt: Date.now()
    };
    persistTcTimerState();
    closeTcTimerDrawer();
    startTcTimerTick();
    updateTcTimerUi();
  }

  function pauseTcFocusSession() {
    if (tcTimerState.status !== 'running') return;
    tcTimerState.accumulatedMs = getTcTimerElapsedMs();
    tcTimerState.segmentStartedAt = null;
    tcTimerState.status = 'paused';
    persistTcTimerState();
    stopTcTimerTick();
    updateTcTimerUi();
  }

  function resumeTcFocusSession() {
    if (tcTimerState.status !== 'paused') return;
    tcTimerState.status = 'running';
    tcTimerState.segmentStartedAt = Date.now();
    persistTcTimerState();
    startTcTimerTick();
    updateTcTimerUi();
  }

  async function stopTcFocusSession() {
    if (tcTimerStopping) return;
    if (!isTcTimerActive()) return;
    var elapsed = getTcTimerElapsedMs();
    var target = tcTimerState.target;
    var resolved = target ? resolveTcTimerTarget(target) : null;
    var hours = msToLoggedHours(elapsed);
    var stopBtn = document.getElementById('tc-timer-stop');

    if (hours <= 0 || !resolved) {
      resetTcTimerState();
      return;
    }

    tcTimerStopping = true;
    if (stopBtn) stopBtn.disabled = true;
    try {
      await addLoggedHoursForToday({
        kind: resolved.kind,
        projectId: resolved.projectId,
        maintenanceId: resolved.maintenanceId,
        clientName: resolved.clientName,
        hours: hours
      });
      resetTcTimerState();
      tcSelectedDay = todayTcDayKey();
      renderTimeCapacityPanel();
    } catch (err) {
      console.error(err);
      updateTcTimerUi();
    } finally {
      tcTimerStopping = false;
      if (stopBtn) stopBtn.disabled = false;
    }
  }

  function formatTcDayTitle(dayKey) {
    if (!dayKey) return 'Select a day';
    var parts = dayKey.split('-');
    if (parts.length !== 3) return dayKey;
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(d.getTime())) return dayKey;
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function renderTimeCapacityPanel() {
    var summaryWeek = document.getElementById('tc-summary-week');
    if (!summaryWeek) return;
    ensureTcCalState();
    var snap = getTimeCapacitySnapshot();

    summaryWeek.textContent = formatHours(snap.suggestedWeek);
    var elMaint = document.getElementById('tc-summary-maint');
    var elBuild = document.getElementById('tc-summary-build');
    var elPlanned = document.getElementById('tc-summary-planned');
    var elLogged = document.getElementById('tc-summary-logged');
    if (elMaint) elMaint.textContent = formatHours(snap.maintRemaining);
    if (elBuild) elBuild.textContent = formatHours(snap.buildRemaining);
    if (elPlanned) elPlanned.textContent = formatHours(snap.weekPlanned);
    if (elLogged) elLogged.textContent = formatHours(snap.weekLogged);

    var monthLabel = document.getElementById('tc-cal-month-label');
    var grid = document.getElementById('tc-cal-grid');
    if (!grid) return;

    var year = tcCalMonth.getFullYear();
    var month = tcCalMonth.getMonth();
    if (monthLabel) {
      monthLabel.textContent = tcCalMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    }

    var dayTotals = {};
    agencyTimeEntries.forEach(function (e) {
      if (!e.date) return;
      if (!dayTotals[e.date]) dayTotals[e.date] = { planned: 0, logged: 0 };
      dayTotals[e.date].planned += e.plannedHours;
      dayTotals[e.date].logged += e.loggedHours;
    });

    var firstWeekday = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var todayKey = todayTcDayKey();
    var html = '';
    var i;
    for (i = 0; i < firstWeekday; i++) {
      html += '<div class="admin-bookings-cal-cell is-empty" aria-hidden="true"></div>';
    }
    for (i = 1; i <= daysInMonth; i++) {
      var key =
        year + '-' + String(month + 1).padStart(2, '0') + '-' + String(i).padStart(2, '0');
      var tot = dayTotals[key] || { planned: 0, logged: 0 };
      var has = tot.planned > 0 || tot.logged > 0;
      var classes = 'admin-bookings-cal-cell';
      if (key === todayKey) classes += ' is-today';
      if (key === tcSelectedDay) classes += ' is-selected';
      if (has) classes += ' has-bookings tc-has-hours';
      var tipParts = [];
      if (tot.planned > 0) tipParts.push('P ' + formatHours(tot.planned));
      if (tot.logged > 0) tipParts.push('L ' + formatHours(tot.logged));
      var tip = tipParts.join(' · ');
      var badge =
        tot.planned > 0 || tot.logged > 0
          ? '<span class="admin-bookings-cal-day-count">' +
            esc(formatHours(tot.planned + tot.logged)) +
            '</span>'
          : '';
      html +=
        '<button type="button" class="' +
        classes +
        '" data-tc-day="' +
        key +
        '"' +
        (key === tcSelectedDay ? ' aria-current="date"' : '') +
        ' aria-pressed="' +
        (key === tcSelectedDay ? 'true' : 'false') +
        '"' +
        ' aria-label="' +
        esc(key) +
        (tip ? ', ' + tip : '') +
        '">' +
        '<span class="admin-bookings-cal-day-top">' +
        '<span class="admin-bookings-cal-day-num">' +
        i +
        '</span>' +
        badge +
        '</span>' +
        (tip
          ? '<span class="admin-bookings-cal-day-tip">' + esc(tip) + '</span>'
          : '') +
        '</button>';
    }
    grid.innerHTML = html;

    var dayTitle = document.getElementById('tc-day-title');
    var dayCount = document.getElementById('tc-day-count');
    var dayList = document.getElementById('tc-day-list');
    var dayEntries = getTcEntriesForDay(tcSelectedDay);
    var dayPlanned = 0;
    var dayLogged = 0;
    dayEntries.forEach(function (e) {
      dayPlanned += e.plannedHours;
      dayLogged += e.loggedHours;
    });
    if (dayTitle) dayTitle.textContent = formatTcDayTitle(tcSelectedDay);
    if (dayCount) {
      dayCount.textContent =
        formatHours(dayPlanned) + ' planned · ' + formatHours(dayLogged) + ' logged';
    }

    if (dayList) {
      if (!dayEntries.length) {
        dayList.innerHTML =
          '<p class="form-hint tc-day-empty">No planned or logged hours this day. Add a block below.</p>';
      } else {
        dayList.innerHTML = dayEntries
          .map(function (e) {
            return (
              '<article class="tc-entry-card" data-tc-entry-id="' +
              esc(e.id) +
              '">' +
              '<div class="tc-entry-head">' +
              '<button type="button" class="tc-entry-open" data-tc-action="open-client" data-tc-kind="' +
              esc(e.kind) +
              '" data-tc-project="' +
              esc(e.projectId || '') +
              '" data-tc-maint="' +
              esc(e.maintenanceId || '') +
              '">' +
              '<span class="tc-entry-name">' +
              esc(e.clientName || 'Client') +
              '</span>' +
              '<span class="tc-entry-meta">' +
              esc(e.kind === 'maint' ? 'Maintenance' : 'Build') +
              '</span></button>' +
              '<button type="button" class="btn btn-danger btn-sm" data-tc-action="delete-entry">Delete</button>' +
              '</div>' +
              '<div class="tc-entry-edit">' +
              '<label class="tc-field"><span>Planned</span>' +
              '<input type="number" class="form-input tc-input" data-tc-field="plannedHours" min="0" step="0.5" inputmode="decimal" value="' +
              esc(String(e.plannedHours)) +
              '"></label>' +
              '<label class="tc-field"><span>Logged</span>' +
              '<input type="number" class="form-input tc-input" data-tc-field="loggedHours" min="0" step="0.5" inputmode="decimal" value="' +
              esc(String(e.loggedHours)) +
              '"></label>' +
              '<button type="button" class="btn btn-secondary btn-sm" data-tc-action="save-entry">Save</button>' +
              '</div></article>'
            );
          })
          .join('');
      }
    }

    syncTcAddTargetSelect(true);
    updateTcTimerUi();
  }

  async function saveTimeEntryFromCard(card) {
    if (!card || !rtdbReady()) return;
    var id = card.getAttribute('data-tc-entry-id');
    if (!id) return;
    var existing = agencyTimeEntries.find(function (x) {
      return x.id === id;
    });
    if (!existing) return;
    var planned = Math.max(
      0,
      Number((card.querySelector('[data-tc-field="plannedHours"]') || {}).value) || 0
    );
    var logged = Math.max(
      0,
      Number((card.querySelector('[data-tc-field="loggedHours"]') || {}).value) || 0
    );
    var snap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATHS.timeEntries + '/' + id));
    var row = snap.val() || {};
    await window.rtdbSet(
      window.rtdbRef(window.rtdb, PATHS.timeEntries + '/' + id),
      Object.assign({}, row, {
        plannedHours: planned,
        loggedHours: logged,
        updatedAt: ts()
      })
    );
    var local = agencyTimeEntries.find(function (x) {
      return x.id === id;
    });
    if (local) {
      local.plannedHours = planned;
      local.loggedHours = logged;
    }
    await syncLoggedTotalsFromEntries({
      projectId: existing.projectId,
      maintenanceId: existing.maintenanceId
    });
  }

  async function deleteTimeEntry(id) {
    if (!id || !rtdbReady() || typeof window.rtdbRemove !== 'function') return;
    var existing = agencyTimeEntries.find(function (x) {
      return x.id === id;
    });
    await window.rtdbRemove(window.rtdbRef(window.rtdb, PATHS.timeEntries + '/' + id));
    agencyTimeEntries = agencyTimeEntries.filter(function (x) {
      return x.id !== id;
    });
    if (existing) {
      await syncLoggedTotalsFromEntries({
        projectId: existing.projectId,
        maintenanceId: existing.maintenanceId
      });
    }
  }

  async function addTimeEntryFromForm() {
    if (!rtdbReady()) return;
    ensureTcCalState();
    var targetEl = document.getElementById('tc-add-target');
    var plannedEl = document.getElementById('tc-add-planned');
    var loggedEl = document.getElementById('tc-add-logged');
    var target = targetEl ? String(targetEl.value || '') : '';
    if (!target) throw new Error('Choose a client.');
    var parts = target.split(':');
    var kind = parts[0] === 'maint' ? 'maint' : 'build';
    var refId = parts.slice(1).join(':');
    var planned = Math.max(0, Number(plannedEl && plannedEl.value) || 0);
    var logged = Math.max(0, Number(loggedEl && loggedEl.value) || 0);
    if (planned <= 0 && logged <= 0) throw new Error('Enter planned or logged hours.');

    var clientName = '';
    var projectId = '';
    var maintenanceId = '';
    if (kind === 'build') {
      var hub = getHubById(refId);
      if (!hub || !shouldShowBuildCapacity(hub)) throw new Error('Client project not found.');
      clientName = hub.clientName || hub.title || 'Untitled';
      projectId = hub.id;
    } else {
      var m = agencyMaintenance.find(function (x) {
        return x.id === refId;
      });
      if (!m) throw new Error('Maintenance client not found.');
      clientName = m.clientName || 'Client';
      maintenanceId = m.id;
      projectId = m.projectId || '';
    }

    var dup = agencyTimeEntries.find(function (e) {
      return (
        e.date === tcSelectedDay &&
        e.kind === kind &&
        ((kind === 'build' && e.projectId === projectId) ||
          (kind === 'maint' && e.maintenanceId === maintenanceId))
      );
    });
    if (dup) {
      var snap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATHS.timeEntries + '/' + dup.id));
      var row = snap.val() || {};
      await window.rtdbSet(
        window.rtdbRef(window.rtdb, PATHS.timeEntries + '/' + dup.id),
        Object.assign({}, row, {
          plannedHours: planned,
          loggedHours: logged,
          clientName: clientName,
          updatedAt: ts()
        })
      );
      dup.plannedHours = planned;
      dup.loggedHours = logged;
      dup.clientName = clientName;
      await syncLoggedTotalsFromEntries({ projectId: projectId, maintenanceId: maintenanceId });
    } else {
      var payload = {
        date: tcSelectedDay,
        projectId: projectId,
        maintenanceId: maintenanceId,
        clientName: clientName,
        kind: kind,
        plannedHours: planned,
        loggedHours: logged,
        notes: '',
        createdAt: ts(),
        updatedAt: ts()
      };
      var ref = window.rtdbPush(window.rtdbRef(window.rtdb, PATHS.timeEntries));
      await window.rtdbSet(ref, payload);
      agencyTimeEntries.push(normalizeTimeEntry(ref.key, payload));
      await syncLoggedTotalsFromEntries({ projectId: projectId, maintenanceId: maintenanceId });
    }

    if (plannedEl) plannedEl.value = '';
    if (loggedEl) loggedEl.value = '0';
    if (typeof window.setBusinessDocSelectValue === 'function') {
      window.setBusinessDocSelectValue('tc-add-target', '', true);
    } else if (targetEl) {
      targetEl.value = '';
    }
  }

  function isTcAddDrawerOpen() {
    var drawer = document.getElementById('tc-add-drawer');
    return !!(drawer && drawer.classList.contains('is-open'));
  }

  function openTcAddDrawer() {
    ensureTcCalState();
    closeTcTimerDrawer();
    var drawer = document.getElementById('tc-add-drawer');
    var overlay = document.getElementById('tc-add-drawer-overlay');
    if (!drawer || !overlay) return;
    var subtitle = document.getElementById('tc-add-drawer-subtitle');
    if (subtitle) subtitle.textContent = formatTcDayTitle(tcSelectedDay);
    var feedback = document.getElementById('tc-add-feedback');
    if (feedback) {
      feedback.textContent = '';
      feedback.classList.remove('is-error');
    }
    syncTcAddTargetSelect(false);
    drawer.hidden = false;
    overlay.hidden = false;
    drawer.setAttribute('aria-hidden', 'false');
    overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(function () {
      drawer.classList.add('is-open');
      overlay.classList.add('is-open');
    });
    document.body.classList.add('tc-add-drawer-open');
    window.setTimeout(function () {
      var trigger = drawer.querySelector('.business-doc-select-trigger');
      if (trigger) {
        try {
          trigger.focus();
        } catch (fe) {}
      }
    }, 40);
  }

  function closeTcAddDrawer() {
    var drawer = document.getElementById('tc-add-drawer');
    var overlay = document.getElementById('tc-add-drawer-overlay');
    if (!drawer || !overlay) return;
    drawer.classList.remove('is-open');
    overlay.classList.remove('is-open');
    if (!isTcTimerDrawerOpen()) {
      document.body.classList.remove('tc-add-drawer-open');
    }
    window.setTimeout(function () {
      if (drawer.classList.contains('is-open')) return;
      drawer.hidden = true;
      overlay.hidden = true;
      drawer.setAttribute('aria-hidden', 'true');
      overlay.setAttribute('aria-hidden', 'true');
    }, 360);
  }

  function isTcTimerDrawerOpen() {
    var drawer = document.getElementById('tc-timer-drawer');
    return !!(drawer && drawer.classList.contains('is-open'));
  }

  function openTcTimerDrawer() {
    if (isTcTimerActive()) return;
    closeTcAddDrawer();
    var drawer = document.getElementById('tc-timer-drawer');
    var overlay = document.getElementById('tc-timer-drawer-overlay');
    if (!drawer || !overlay) return;
    setTcTimerFeedback('');
    syncTcTimerTargetSelect(false);
    drawer.hidden = false;
    overlay.hidden = false;
    drawer.setAttribute('aria-hidden', 'false');
    overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(function () {
      drawer.classList.add('is-open');
      overlay.classList.add('is-open');
    });
    document.body.classList.add('tc-add-drawer-open');
    window.setTimeout(function () {
      var startBtn = document.getElementById('tc-timer-start');
      if (startBtn) {
        try {
          startBtn.focus();
        } catch (fe) {}
      }
    }, 40);
  }

  function closeTcTimerDrawer() {
    var drawer = document.getElementById('tc-timer-drawer');
    var overlay = document.getElementById('tc-timer-drawer-overlay');
    if (!drawer || !overlay) return;
    drawer.classList.remove('is-open');
    overlay.classList.remove('is-open');
    if (!isTcAddDrawerOpen()) {
      document.body.classList.remove('tc-add-drawer-open');
    }
    window.setTimeout(function () {
      if (drawer.classList.contains('is-open')) return;
      drawer.hidden = true;
      overlay.hidden = true;
      drawer.setAttribute('aria-hidden', 'true');
      overlay.setAttribute('aria-hidden', 'true');
    }, 360);
  }

  function initTimeCapacity() {
    if (timeCapacityBound) return;
    var panel = document.getElementById('admin-panel-time-capacity');
    if (!panel) return;
    timeCapacityBound = true;
    ensureTcCalState();
    loadPersistedTcTimer();
    syncTcAddTargetSelect(false);
    updateTcTimerUi();
    if (tcTimerState.status === 'running') startTcTimerTick();
    else if (tcTimerState.status === 'paused') updateTcTimerUi();

    var openTimerBtn = document.getElementById('tc-open-timer-drawer');
    var timerStart = document.getElementById('tc-timer-start');
    var timerPause = document.getElementById('tc-timer-pause');
    var timerResume = document.getElementById('tc-timer-resume');
    var timerStop = document.getElementById('tc-timer-stop');
    var timerOverlay = document.getElementById('tc-timer-drawer-overlay');
    var timerClose = document.getElementById('tc-timer-drawer-close');
    var timerCancel = document.getElementById('tc-timer-drawer-cancel');
    if (openTimerBtn) openTimerBtn.addEventListener('click', openTcTimerDrawer);
    if (timerStart) timerStart.addEventListener('click', startTcFocusSession);
    if (timerPause) timerPause.addEventListener('click', pauseTcFocusSession);
    if (timerResume) timerResume.addEventListener('click', resumeTcFocusSession);
    if (timerStop) timerStop.addEventListener('click', function () {
      stopTcFocusSession();
    });
    if (timerOverlay) timerOverlay.addEventListener('click', closeTcTimerDrawer);
    if (timerClose) timerClose.addEventListener('click', closeTcTimerDrawer);
    if (timerCancel) timerCancel.addEventListener('click', closeTcTimerDrawer);

    var prevBtn = document.getElementById('tc-cal-prev');
    var nextBtn = document.getElementById('tc-cal-next');
    var todayBtn = document.getElementById('tc-cal-today');
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        ensureTcCalState();
        tcCalMonth = new Date(tcCalMonth.getFullYear(), tcCalMonth.getMonth() - 1, 1);
        renderTimeCapacityPanel();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        ensureTcCalState();
        tcCalMonth = new Date(tcCalMonth.getFullYear(), tcCalMonth.getMonth() + 1, 1);
        renderTimeCapacityPanel();
      });
    }
    if (todayBtn) {
      todayBtn.addEventListener('click', function () {
        var now = new Date();
        tcCalMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        tcSelectedDay = todayTcDayKey();
        renderTimeCapacityPanel();
        var dayPanel = panel.querySelector('.admin-bookings-day-panel');
        if (dayPanel && window.matchMedia('(max-width: 979px)').matches) {
          dayPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }

    var addOverlay = document.getElementById('tc-add-drawer-overlay');
    var addClose = document.getElementById('tc-add-drawer-close');
    var addCancel = document.getElementById('tc-add-drawer-cancel');
    if (addOverlay) addOverlay.addEventListener('click', closeTcAddDrawer);
    if (addClose) addClose.addEventListener('click', closeTcAddDrawer);
    if (addCancel) addCancel.addEventListener('click', closeTcAddDrawer);

    var addDrawer = document.getElementById('tc-add-drawer');
    if (addDrawer) {
      addDrawer.addEventListener('click', function (e) {
        var actionBtn = e.target.closest('[data-tc-action="add-entry"]');
        if (!actionBtn || !addDrawer.contains(actionBtn)) return;
        e.preventDefault();
        var feedback = document.getElementById('tc-add-feedback');
        actionBtn.disabled = true;
        if (feedback) {
          feedback.textContent = '';
          feedback.classList.remove('is-error');
        }
        addTimeEntryFromForm()
          .then(function () {
            renderTimeCapacityPanel();
            if (feedback) feedback.textContent = 'Saved.';
            closeTcAddDrawer();
          })
          .catch(function (err) {
            console.error(err);
            if (feedback) {
              feedback.textContent = (err && err.message) || 'Could not save.';
              feedback.classList.add('is-error');
            }
          })
          .then(function () {
            actionBtn.disabled = false;
          });
      });
    }

    document.addEventListener(
      'keydown',
      function tcAddEsc(ev) {
        if (ev.key !== 'Escape') return;
        if (isTcTimerDrawerOpen()) {
          ev.stopImmediatePropagation();
          closeTcTimerDrawer();
          return;
        }
        if (!isTcAddDrawerOpen()) return;
        ev.stopImmediatePropagation();
        closeTcAddDrawer();
      },
      true
    );

    panel.addEventListener('click', function (e) {
      var dayBtn = e.target.closest('[data-tc-day]');
      if (dayBtn && panel.contains(dayBtn)) {
        var nextDay = dayBtn.getAttribute('data-tc-day');
        if (nextDay === tcSelectedDay) {
          if (window.matchMedia('(max-width: 979px)').matches) {
            var p = panel.querySelector('.admin-bookings-day-panel');
            if (p) p.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          return;
        }
        tcSelectedDay = nextDay;
        renderTimeCapacityPanel();
        if (window.matchMedia('(max-width: 979px)').matches) {
          var panelEl = panel.querySelector('.admin-bookings-day-panel');
          if (panelEl) panelEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return;
      }

      var actionBtn = e.target.closest('[data-tc-action]');
      if (!actionBtn || !panel.contains(actionBtn)) return;
      var action = actionBtn.getAttribute('data-tc-action');

      if (action === 'open-timer') {
        openTcTimerDrawer();
        return;
      }

      if (action === 'open-add') {
        openTcAddDrawer();
        return;
      }

      if (action === 'open-client') {
        var projectId = actionBtn.getAttribute('data-tc-project');
        var maintId = actionBtn.getAttribute('data-tc-maint');
        if (projectId) openClientProjectWorkspace(projectId);
        else if (maintId) {
          var m = agencyMaintenance.find(function (x) {
            return x.id === maintId;
          });
          if (m && m.projectId) openClientProjectWorkspace(m.projectId);
        }
        return;
      }

      if (action === 'save-entry') {
        var card = actionBtn.closest('[data-tc-entry-id]');
        actionBtn.disabled = true;
        saveTimeEntryFromCard(card)
          .then(function () {
            renderTimeCapacityPanel();
          })
          .catch(function (err) {
            console.error(err);
          })
          .then(function () {
            actionBtn.disabled = false;
          });
        return;
      }

      if (action === 'delete-entry') {
        var delCard = actionBtn.closest('[data-tc-entry-id]');
        var delId = delCard && delCard.getAttribute('data-tc-entry-id');
        if (!delId || !window.confirm('Delete this time entry?')) return;
        actionBtn.disabled = true;
        deleteTimeEntry(delId)
          .then(function () {
            renderTimeCapacityPanel();
          })
          .catch(function (err) {
            console.error(err);
          })
          .then(function () {
            actionBtn.disabled = false;
          });
      }
    });
  }

  function getOverviewSnapshot() {
    var now = Date.now();
    var PORTAL_WARN_MS = 7 * 86400000;

    var attention = [];
    agencyProjects.forEach(function (p) {
      var meta = getClientPickerMeta(p);
      var reasons = [];
      var priority = 9;
      if (meta.maintPending) {
        reasons.push('Plan pending');
        priority = Math.min(priority, 0);
      }
      if (meta.healthClass !== 'is-good') {
        var health = agencyHealthByProject[p.id];
        var healthDone = health ? healthCheckedCount(health) : 0;
        reasons.push('Health ' + healthDone + '/' + HEALTH_CHECK_KEYS.length);
        priority = Math.min(priority, meta.healthClass === '' ? 1 : 2);
      }
      if (meta.milestonesTotal && meta.milestonesPct < 40) {
        reasons.push('At risk · ' + meta.milestones + ' milestones');
        priority = Math.min(priority, 3);
      }
      if (!reasons.length) return;
      attention.push({
        id: p.id,
        clientName: p.clientName || p.title || 'Untitled',
        meta: reasons.join(' · '),
        priority: priority
      });
    });
    attention.sort(function (a, b) {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return String(a.clientName).localeCompare(String(b.clientName), undefined, { sensitivity: 'base' });
    });

    var depositLeads = getDepositLeadsWithoutHub().map(function (lead) {
      var parts = [];
      if (typeof window.formatPipelineMoney === 'function') {
        parts.push(window.formatPipelineMoney(lead.value));
      }
      if (lead.company && lead.name && lead.company !== lead.name) parts.push(lead.company);
      return {
        id: lead.id,
        label: lead.name || lead.company || 'Untitled lead',
        meta: parts.length ? parts.join(' · ') : 'Ready to onboard',
        value: lead.value || 0
      };
    });

    var portals = [];
    agencyProjects.forEach(function (p) {
      var hasToken = !!(p.portalToken);
      var expires = Number(p.portalExpiresAt) || 0;
      var expired = hasToken && expires > 0 && expires < now;
      var expiring = hasToken && expires > 0 && !expired && expires - now <= PORTAL_WARN_MS;
      var status = !hasToken ? 'missing' : expired ? 'expired' : expiring ? 'expiring' : 'active';
      if (status === 'active') return;
      var meta =
        status === 'missing'
          ? 'No portal link'
          : status === 'expired'
            ? 'Link expired'
            : 'Expires soon';
      portals.push({
        id: p.id,
        clientName: p.clientName || p.title || 'Untitled',
        status: status,
        meta: meta,
        priority: status === 'expired' ? 0 : status === 'missing' ? 1 : 2
      });
    });
    portals.sort(function (a, b) {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return String(a.clientName).localeCompare(String(b.clientName), undefined, { sensitivity: 'base' });
    });

    return {
      projects: agencyProjects.map(function (p) {
        return {
          id: p.id,
          clientName: p.clientName,
          clientEmail: p.clientEmail || '',
          title: p.title,
          portalToken: p.portalToken || '',
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
      }),
      attention: attention,
      depositLeads: depositLeads,
      portals: portals,
      studioCosts: {
        monthly: getStudioCostsSummary().monthly,
        renewals: agencyStudioCosts
          .filter(function (row) {
            if (row.status !== 'active') return false;
            var days = studioCostDaysUntilRenewal(row.renewalDate);
            return days != null && days <= 30;
          })
          .map(function (row) {
            return {
              name: row.name,
              renewalDate: row.renewalDate,
              days: studioCostDaysUntilRenewal(row.renewalDate),
              amount: row.amount,
              billingCycle: row.billingCycle
            };
          })
      }
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
    refreshStudioCosts: renderStudioCostsTable,
    refreshTimeCapacity: renderTimeCapacityPanel,
    getHubByLeadId: function (leadId) {
      if (!leadId) return null;
      return agencyProjects.find(function (p) { return p.leadId === leadId; }) || null;
    },
    deliveryStageLabel: deliveryStageLabel,
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
    initStudioCosts();
    initFirebaseHealth();
    initClientProjects();
    initTimeCapacity();

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
