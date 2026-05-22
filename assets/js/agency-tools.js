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
  var agencyMaintenance = [];
  var agencyReferrals = [];
  var agencyUnsubs = [];

  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isAdmin() {
    return typeof window.isAdminSession === 'function' && window.isAdminSession();
  }

  function rtdbReady() {
    return !!(window.rtdb && window.rtdbRef && window.rtdbGet && window.rtdbSet && window.rtdbPush);
  }

  function ts() {
    return window.rtdbServerTimestamp ? window.rtdbServerTimestamp() : Date.now();
  }

  function getPortfolioList() {
    if (Array.isArray(window.portfolioProjects) && window.portfolioProjects.length) {
      return window.portfolioProjects;
    }
    var built = window.DEFAULT_PORTFOLIO_PROJECTS;
    if (!Array.isArray(built)) return [];
    return built.map(function (p, i) {
      return Object.assign({}, p, { id: 'builtin-' + i });
    });
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

  // ——— RTDB subscriptions (admin) ———
  function subscribeAgencyData() {
    if (!isAdmin() || !rtdbReady()) return;
    agencyUnsubs.forEach(function (u) { if (typeof u === 'function') u(); });
    agencyUnsubs = [];

    agencyUnsubs.push(
      window.rtdbOnValue(window.rtdbRef(window.rtdb, PATHS.projects), function (snap) {
        var val = snap.val();
        agencyProjects = [];
        if (val && typeof val === 'object') {
          Object.keys(val).forEach(function (id) {
            agencyProjects.push(normalizeProject(id, val[id]));
          });
        }
        agencyProjects.sort(function (a, b) {
          return (b.updatedAt || 0) - (a.updatedAt || 0);
        });
        renderProjectHubList();
        renderFirebaseHealthProjectSelect();
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
  }

  function unsubscribeAgencyData() {
    agencyUnsubs.forEach(function (u) { if (typeof u === 'function') u(); });
    agencyUnsubs = [];
    agencyProjects = [];
    agencyMaintenance = [];
    agencyReferrals = [];
  }

  function normalizeProject(id, row) {
    row = row || {};
    var milestones = Array.isArray(row.milestones) ? row.milestones : [];
    return {
      id: id,
      leadId: String(row.leadId || ''),
      clientName: String(row.clientName || '').slice(0, 120),
      title: String(row.title || '').slice(0, 200),
      repoUrl: String(row.repoUrl || '').slice(0, 500),
      expoUrl: String(row.expoUrl || '').slice(0, 500),
      firebaseProjectId: String(row.firebaseProjectId || '').slice(0, 120),
      businessDocId: String(row.businessDocId || '').slice(0, 80),
      portfolioProjectId: String(row.portfolioProjectId || '').slice(0, 80),
      notes: String(row.notes || '').slice(0, 4000),
      enabledModules: Array.isArray(row.enabledModules) ? row.enabledModules.slice(0, 12) : [],
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

  function normalizeMaintenance(id, row) {
    row = row || {};
    return {
      id: id,
      clientName: String(row.clientName || '').slice(0, 120),
      leadId: String(row.leadId || ''),
      projectId: String(row.projectId || ''),
      planTier: String(row.planTier || 'standard').slice(0, 40),
      hoursIncluded: Number(row.hoursIncluded) || 4,
      hoursUsed: Number(row.hoursUsed) || 0,
      renewalDate: String(row.renewalDate || ''),
      slaHours: Number(row.slaHours) || 48,
      notes: String(row.notes || '').slice(0, 2000),
      tickets: Array.isArray(row.tickets) ? row.tickets : [],
      updatedAt: row.updatedAt || null
    };
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
    var list = document.getElementById('project-hub-list');
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
          '<li class="hub-list-item" data-hub-id="' + esc(p.id) + '">' +
          '<div><strong>' + esc(p.clientName || p.title || 'Untitled') + '</strong>' +
          '<br><span class="form-hint">' + done + '/' + total + ' milestones</span></div>' +
          '<ion-icon name="chevron-forward-outline"></ion-icon></li>'
        );
      })
      .join('');
    list.querySelectorAll('[data-hub-id]').forEach(function (el) {
      el.addEventListener('click', function () {
        openProjectHubEditor(el.getAttribute('data-hub-id'));
      });
    });
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
    document.getElementById('hub-title').value = p.title || '';
    document.getElementById('hub-repo-url').value = p.repoUrl || '';
    document.getElementById('hub-expo-url').value = p.expoUrl || '';
    document.getElementById('hub-firebase-id').value = p.firebaseProjectId || '';
    document.getElementById('hub-business-doc-id').value = p.businessDocId || '';
    document.getElementById('hub-notes').value = p.notes || '';
    renderHubMilestones(p.milestones);
    renderHubModuleChecks(p.enabledModules);
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

  function renderHubModuleChecks(enabled) {
    var wrap = document.getElementById('hub-modules-checks');
    if (!wrap) return;
    wrap.innerHTML = MICRO_SAAS_MODULES.map(function (mod) {
      var on = enabled && enabled.indexOf(mod.id) >= 0;
      return (
        '<label class="matcher-option">' +
        '<input type="checkbox" value="' + esc(mod.id) + '" ' + (on ? 'checked' : '') + '> ' +
        '<span><strong>' + esc(mod.name) + '</strong> — ' + esc(mod.price) + '</span></label>'
      );
    }).join('');
  }

  async function saveProjectHub() {
    if (!rtdbReady()) return;
    var id = document.getElementById('hub-edit-id').value.trim();
    var payload = {
      leadId: document.getElementById('hub-lead-id').value.trim(),
      clientName: document.getElementById('hub-client-name').value.trim(),
      title: document.getElementById('hub-title').value.trim(),
      repoUrl: document.getElementById('hub-repo-url').value.trim(),
      expoUrl: document.getElementById('hub-expo-url').value.trim(),
      firebaseProjectId: document.getElementById('hub-firebase-id').value.trim(),
      businessDocId: document.getElementById('hub-business-doc-id').value.trim(),
      notes: document.getElementById('hub-notes').value.trim(),
      milestones: collectHubMilestonesFromDom(),
      enabledModules: Array.from(document.querySelectorAll('#hub-modules-checks input:checked')).map(function (c) {
        return c.value;
      }),
      updatedAt: ts()
    };
    if (id) {
      await window.rtdbSet(window.rtdbRef(window.rtdb, PATHS.projects + '/' + id), payload);
    } else {
      payload.createdAt = ts();
      var ref = window.rtdbPush(window.rtdbRef(window.rtdb, PATHS.projects));
      await window.rtdbSet(ref, payload);
    }
    closeModal('project-hub-editor-modal');
  }

  function initProjectHub() {
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

  async function generateClientPortalLink(projectId) {
    if (!projectId || !rtdbReady()) {
      alert('Save the project hub first.');
      return;
    }
    var token = randomToken();
    var expires = Date.now() + 90 * 24 * 60 * 60 * 1000;
    await window.rtdbSet(window.rtdbRef(window.rtdb, PATHS.clientPortals + '/' + token), {
      projectId: projectId,
      expiresAt: expires,
      createdAt: ts()
    });
    var url = location.origin + location.pathname + '?portal=' + token;
    var out = document.getElementById('hub-portal-link-out');
    if (out) {
      out.hidden = false;
      out.innerHTML = 'Client link (90 days): <a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(url) + '</a>';
    }
    navigator.clipboard.writeText(url).catch(function () {});
  }

  async function loadClientPortal(token) {
    var view = document.getElementById('client-portal-view');
    var inner = document.getElementById('client-portal-inner');
    if (!view || !inner || !token || !rtdbReady()) return;

    var linkSnap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATHS.clientPortals + '/' + token));
    var link = linkSnap.val();
    if (!link || !link.projectId || (link.expiresAt && link.expiresAt < Date.now())) {
      inner.innerHTML = '<p class="client-portal-error">This client link is invalid or expired.</p>';
      view.classList.add('active');
      document.body.style.overflow = 'hidden';
      return;
    }

    var projSnap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATHS.projects + '/' + link.projectId));
    var p = normalizeProject(link.projectId, projSnap.val());
    var done = p.milestones.filter(function (m) { return m.done; }).length;
    var total = p.milestones.length;

    inner.innerHTML =
      '<div class="client-portal-brand"><h1>' + esc(p.clientName || p.title || 'Your project') + '</h1>' +
      '<p class="form-hint">CodeWithRuben client portal</p></div>' +
      '<section class="client-portal-section"><h2>Progress</h2>' +
      '<p>' + done + ' of ' + total + ' milestones complete</p>' +
      p.milestones.map(function (m) {
        return '<div class="client-portal-milestone' + (m.done ? ' done' : '') + '">' +
          '<ion-icon name="' + (m.done ? 'checkmark-circle' : 'ellipse-outline') + '"></ion-icon> ' +
          esc(m.label) + '</div>';
      }).join('') +
      '</section>' +
      (p.expoUrl ? '<section class="client-portal-section"><h2>Preview</h2><a class="btn btn-primary" href="' + esc(p.expoUrl) + '" target="_blank" rel="noopener">Open preview</a></section>' : '') +
      '<section class="client-portal-section"><h2>Share files</h2>' +
      '<p class="form-hint">Email assets to your project contact, or use the message below.</p>' +
      '<textarea class="form-input has-scrollbar" rows="3" readonly>Project: ' + esc(p.title) + ' — assets shared via client portal.</textarea></section>';

    view.classList.add('active');
    document.body.style.overflow = 'hidden';
    var closeCp = document.getElementById('client-portal-close');
    if (closeCp) {
      closeCp.onclick = function () {
        view.classList.remove('active');
        document.body.style.overflow = '';
        history.replaceState(null, '', location.pathname + location.hash);
      };
    }
  }

  function initClientPortal() {
    var params = new URLSearchParams(location.search);
    var token = params.get('portal');
    if (token) loadClientPortal(token);
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
          '<li class="hub-list-item" data-maint-id="' + esc(m.id) + '">' +
          '<div><strong>' + esc(m.clientName) + '</strong><br>' +
          '<span class="form-hint">' + m.hoursUsed + '/' + m.hoursIncluded + ' hrs · SLA ' + m.slaHours + 'h</span></div>' +
          '<ion-icon name="chevron-forward-outline"></ion-icon></li>'
        );
      })
      .join('');
    list.querySelectorAll('[data-maint-id]').forEach(function (el) {
      el.addEventListener('click', function () {
        openMaintenanceEditor(el.getAttribute('data-maint-id'));
      });
    });
  }

  function openMaintenanceEditor(id) {
    var m = agencyMaintenance.find(function (x) { return x.id === id; });
    if (!m && id !== 'new') return;
    if (id === 'new') {
      m = { id: '', clientName: '', leadId: '', projectId: '', planTier: 'standard', hoursIncluded: 4, hoursUsed: 0, renewalDate: '', slaHours: 48, notes: '' };
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
    var payload = {
      clientName: document.getElementById('maint-client-name').value.trim(),
      hoursIncluded: Number(document.getElementById('maint-hours-included').value) || 4,
      hoursUsed: Number(document.getElementById('maint-hours-used').value) || 0,
      renewalDate: document.getElementById('maint-renewal').value,
      slaHours: Number(document.getElementById('maint-sla').value) || 48,
      notes: document.getElementById('maint-notes').value.trim(),
      updatedAt: ts()
    };
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
          '<td><button type="button" class="btn btn-secondary btn-sm" data-edit-ref="' + esc(r.id) + '">Edit</button></td></tr>'
        );
      })
      .join('');
    tbody.querySelectorAll('[data-edit-ref]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openReferralEditor(btn.getAttribute('data-edit-ref'));
      });
    });
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
    var add = document.getElementById('referral-add-btn');
    if (add) add.addEventListener('click', function () { openReferralEditor('new'); });
    bindModalClose('referral-editor-modal', '.agency-modal-overlay', '.agency-modal-close');
    var save = document.getElementById('ref-save-btn');
    if (save) save.addEventListener('click', function () { saveReferral().catch(console.error); });
  }

  // ——— Firebase Health ———
  function renderFirebaseHealthProjectSelect() {
    var sel = document.getElementById('health-project-select');
    if (!sel) return;
    sel.innerHTML =
      '<option value="">Select project hub…</option>' +
      agencyProjects.map(function (p) {
        return '<option value="' + esc(p.id) + '">' + esc(p.clientName || p.title || p.id) + '</option>';
      }).join('');
  }

  async function loadHealthForProject(projectId) {
    if (!projectId || !rtdbReady()) return;
    var snap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATHS.firebaseHealth + '/' + projectId));
    var h = snap.val() || {};
    ['rulesOk', 'authOk', 'functionsOk', 'rtdbOk', 'hostingOk'].forEach(function (key) {
      var el = document.getElementById('health-' + key);
      if (el) el.checked = !!h[key];
    });
    var notes = document.getElementById('health-notes');
    if (notes) notes.value = h.notes || '';
  }

  async function saveHealth() {
    var projectId = document.getElementById('health-project-select').value;
    if (!projectId || !rtdbReady()) return;
    await window.rtdbSet(window.rtdbRef(window.rtdb, PATHS.firebaseHealth + '/' + projectId), {
      rulesOk: !!document.getElementById('health-rulesOk').checked,
      authOk: !!document.getElementById('health-authOk').checked,
      functionsOk: !!document.getElementById('health-functionsOk').checked,
      rtdbOk: !!document.getElementById('health-rtdbOk').checked,
      hostingOk: !!document.getElementById('health-hostingOk').checked,
      notes: document.getElementById('health-notes').value.trim(),
      updatedAt: ts()
    });
  }

  function initFirebaseHealth() {
    var sel = document.getElementById('health-project-select');
    if (sel) sel.addEventListener('change', function () { loadHealthForProject(sel.value); });
    var save = document.getElementById('health-save-btn');
    if (save) save.addEventListener('click', function () { saveHealth().catch(console.error); });
  }

  // ——— Pipeline hook: open hub from lead ———
  function createHubFromLead(lead) {
    if (!lead) return;
    openProjectHubEditor('new');
    setTimeout(function () {
      document.getElementById('hub-lead-id').value = lead.id || '';
      document.getElementById('hub-client-name').value = lead.name || lead.company || '';
      document.getElementById('hub-title').value = (lead.company || lead.name || '') + ' project';
    }, 50);
  }

  window.AgencyTools = {
    subscribe: subscribeAgencyData,
    unsubscribe: unsubscribeAgencyData,
    openProjectHub: function (leadId) {
      var existing = agencyProjects.find(function (p) { return p.leadId === leadId; });
      if (existing) openProjectHubEditor(existing.id);
      else if (typeof window.findPipelineLead === 'function') {
        var lead = window.findPipelineLead(leadId);
        if (lead) createHubFromLead(lead);
      }
    },
    createHubFromLead: createHubFromLead
  };

  function init() {
    initTemplateMatcher();
    initProjectHub();
    initCaseStudyGenerator();
    initClientPortal();
    initMaintenance();
    initContentRepurposing();
    initReferrals();
    initFirebaseHealth();

    document.addEventListener('adminSessionReady', function (e) {
      if (e.detail && e.detail.isAdmin) subscribeAgencyData();
      else unsubscribeAgencyData();
    });
    if (isAdmin()) subscribeAgencyData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
