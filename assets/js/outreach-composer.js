/**
 * Template Outreach Scripts — composer.
 *
 * Scripts load from RTDB `agencyOutreachScripts` (admin-gated), seeded from
 * outreach-scripts-seed.js on first open / merged when new seed ids appear.
 *
 * Flow: pick a script → edit the message here → Copy → paste → send.
 * Name / Company / City / demo are optional helpers that fill tokens when set;
 * they never block Copy. The message box is the source of truth for send.
 */
(function (global) {
  'use strict';

  var RTDB_PATH = 'agencyOutreachScripts';
  var SEED_SRC = '/assets/js/outreach-scripts-seed.js?v=restaurant-ads-20261005';
  var STORE_KEY = 'cwrOutreachVars';

  /** Optional fill helpers. "[later today / tomorrow]" is prose — left alone. */
  var TOKENS = [
    { token: '[Name]', field: 'name' },
    { token: '[Company]', field: 'company' },
    { token: '[City]', field: 'city' },
    { token: '[demo link]', field: 'demo' }
  ];

  /** Fields a script stores in RTDB — also what "Reset to template" copies from the seed. */
  var FIELDS = ['label', 'tag', 'vertical', 'demoLink', 'order', 'text', 'subject', 'email', 'call'];

  var STEPS = [
    { id: 'text', label: 'Text' },
    { id: 'subject', label: 'Subject' },
    { id: 'email', label: 'Email' },
    { id: 'call', label: 'Call' }
  ];

  /** Script → its "running ads" version. Ads versions are reached with the
   *  "They're running ads" checkbox instead of being listed in the picker. */
  var ADS_VERSION = {
    lawn: 'lawn-ads',
    trades: 'trades-ads',
    salon: 'salon-ads',
    carpet: 'cleaning-ads',
    restaurant: 'restaurant-ads'
  };

  function baseOf(id) {
    for (var base in ADS_VERSION) if (ADS_VERSION[base] === id) return base;
    return id;
  }

  function hasScript(id) {
    return scripts.some(function (s) { return s.id === id; });
  }

  var scripts = [];
  var activeId = '';
  var activeStep = 'text';
  var loaded = false;
  var dirty = false;
  var els = {};
  var seedById = {};

  // ——— data ———

  function seedsLoaded() {
    return Array.isArray(global.OUTREACH_SCRIPT_SEEDS) && global.OUTREACH_SCRIPT_SEEDS.length;
  }

  function loadSeedFile() {
    if (seedsLoaded()) return Promise.resolve(global.OUTREACH_SCRIPT_SEEDS);
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = SEED_SRC;
      s.onload = function () {
        seedsLoaded() ? resolve(global.OUTREACH_SCRIPT_SEEDS) : reject(new Error('seed file loaded but empty'));
      };
      s.onerror = function () { reject(new Error('could not load ' + SEED_SRC)); };
      document.head.appendChild(s);
    });
  }

  function rememberSeeds(seeds) {
    seedById = {};
    (seeds || []).forEach(function (s) { seedById[s.id] = s; });
  }

  function seedFields(s) {
    var out = {};
    FIELDS.forEach(function (f) { out[f] = s[f]; });
    return out;
  }

  /** True when the saved copy of a script no longer matches its seed template. */
  function differsFromSeed(s) {
    var seed = s && seedById[s.id];
    if (!seed) return false;
    return FIELDS.some(function (f) {
      var a = seed[f] == null ? '' : seed[f];
      var b = s[f] == null ? '' : s[f];
      return f === 'order' ? Number(a) !== Number(b) : String(a) !== String(b);
    });
  }

  function normalize(val) {
    return Object.keys(val || {})
      .map(function (id) {
        var r = val[id] || {};
        return {
          id: id,
          label: r.label || id,
          tag: r.tag || '',
          vertical: r.vertical || '',
          demoLink: r.demoLink || '',
          order: typeof r.order === 'number' ? r.order : 999,
          text: r.text || '',
          subject: r.subject || '',
          email: r.email || '',
          call: r.call || '',
          group: r.group || ''
        };
      })
      .sort(function (a, b) { return a.order - b.order; });
  }

  /**
   * On a direct page load the tab can open before Firebase connects and the
   * admin sign-in resolves (scripts are admin-only), so wait for both rather
   * than failing once and leaving the picker empty.
   */
  function rtdbReadyForScripts() {
    if (!global.rtdb || !global.rtdbRef || !global.rtdbGet) return false;
    return typeof global.isAdminSession === 'function' ? !!global.isAdminSession() : true;
  }

  function waitForRtdb(timeoutMs) {
    return new Promise(function (resolve) {
      var waited = 0;
      (function tick() {
        if (rtdbReadyForScripts()) return resolve(true);
        if (waited >= timeoutMs) return resolve(false);
        waited += 250;
        setTimeout(tick, 250);
      })();
    });
  }

  /** RTDB first; seed when empty. Merge NEW seed ids without overwriting edits. */
  async function ensureScripts() {
    if (loaded && scripts.length) return scripts;
    if (!(await waitForRtdb(30000))) {
      throw new Error('Could not reach your scripts — make sure you’re signed in, then reopen this tab.');
    }
    var snap = await global.rtdbGet(global.rtdbRef(global.rtdb, RTDB_PATH));
    var val = snap && typeof snap.val === 'function' ? snap.val() : null;

    if (val && Object.keys(val).length) {
      var merged = Object.assign({}, val);
      try {
        var existingSeeds = await loadSeedFile();
        rememberSeeds(existingSeeds);
        var patch = {};
        existingSeeds.forEach(function (s) {
          if (!merged[s.id]) {
            patch[s.id] = seedFields(s);
            merged[s.id] = patch[s.id];
          }
        });
        if (Object.keys(patch).length && global.rtdbUpdate) {
          await global.rtdbUpdate(global.rtdbRef(global.rtdb, RTDB_PATH), patch);
        }
      } catch (err) {
        console.warn('Outreach scripts: merge new seeds skipped', err);
      }
      scripts = normalize(merged);
      loaded = true;
      return scripts;
    }

    var seeds = await loadSeedFile();
    rememberSeeds(seeds);
    var writes = {};
    seeds.forEach(function (s) {
      writes[s.id] = seedFields(s);
    });
    if (global.rtdbSet) {
      try {
        await global.rtdbSet(global.rtdbRef(global.rtdb, RTDB_PATH), writes);
      } catch (err) {
        console.warn('Outreach scripts: seed write failed, using local copy', err);
      }
    }
    scripts = normalize(writes);
    loaded = true;
    return scripts;
  }

  // ——— variables ———

  function readVars() {
    return {
      name: (els.name && els.name.value || '').trim(),
      company: (els.company && els.company.value || '').trim(),
      city: (els.city && els.city.value || '').trim(),
      demo: (els.demo && els.demo.value || '').trim(),
      phone: (els.phone && els.phone.value || '').trim(),
      email: (els.emailAddr && els.emailAddr.value || '').trim()
    };
  }

  function saveVars() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(readVars())); } catch (e) { /* private mode */ }
  }

  function restoreVars() {
    var v;
    try { v = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) { v = {}; }
    ['name', 'company', 'city', 'phone'].forEach(function (k) {
      var el = k === 'phone' ? els.phone : els[k];
      if (el && v[k]) el.value = v[k];
    });
  }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function fill(body, vars) {
    var out = body || '';
    TOKENS.forEach(function (t) {
      var v = vars[t.field];
      if (v) out = out.replace(new RegExp(escapeRe(t.token), 'g'), v);
    });
    return out;
  }

  function remainingTokens(body) {
    return TOKENS.filter(function (t) {
      return (body || '').indexOf(t.token) !== -1;
    }).map(function (t) { return t.token; });
  }

  function current() {
    for (var i = 0; i < scripts.length; i++) if (scripts[i].id === activeId) return scripts[i];
    return scripts[0] || null;
  }

  function getBody() {
    if (!els.preview) return '';
    return typeof els.preview.value === 'string' ? els.preview.value : (els.preview.textContent || '');
  }

  function setBody(text) {
    if (!els.preview) return;
    if ('value' in els.preview) els.preview.value = text;
    else els.preview.textContent = text;
  }

  // ——— render ———

  function applyScriptSelection(id, fromUi) {
    if (!id) return;
    // The picker hands over the niche; the checkbox decides which version.
    var base = baseOf(id);
    var adsId = ADS_VERSION[base];
    if (els.adsToggle && els.adsToggle.checked && adsId && hasScript(adsId)) id = adsId;
    else if (id !== base && !(els.adsToggle && els.adsToggle.checked)) id = base;
    var found = null;
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].id === id) {
        found = scripts[i];
        break;
      }
    }
    if (!found) return;
    activeId = id;
    dirty = false;
    if (els.demo) els.demo.value = found.demoLink || '';
    if (!fromUi && els.scriptSelect && typeof global.setBusinessDocSelectValue === 'function') {
      global.setBusinessDocSelectValue(els.scriptSelect, baseOf(id), true);
    }
    syncAdsToggle();
    renderScriptMeta();
    renderPreview(true);
  }

  /** Checkbox shows only for scripts that have an ads version. */
  function syncAdsToggle() {
    if (!els.adsWrap || !els.adsToggle) return;
    var adsId = ADS_VERSION[baseOf(activeId)];
    var available = !!adsId && hasScript(adsId);
    els.adsWrap.hidden = !available;
    els.adsToggle.checked = available && activeId === adsId;
  }

  /** Dropdown category, worked out from the script id so scripts saved in
   *  RTDB before categories existed still land in the right group. */
  function scriptGroup(s) {
    if (s.group) return s.group;
    var id = String(s.id || '');
    if (/-ads$/.test(id)) return 'Running ads';
    if (/^no-site/.test(id) || id === 'site-down') return 'No website / site down';
    if (id === 'landline') return 'Special cases';
    return 'By niche';
  }

  function renderScriptSelect() {
    if (!els.scriptSelect) return;
    var options = scripts.filter(function (s) {
      return baseOf(s.id) === s.id || !hasScript(baseOf(s.id));
    }).map(function (s) {
      return { value: s.id, label: s.label, group: scriptGroup(s) };
    });
    if (!activeId && scripts.length) activeId = scripts[0].id;
    if (typeof global.setBusinessDocSelectOptions === 'function') {
      global.setBusinessDocSelectOptions(els.scriptSelect, options, {
        value: baseOf(activeId) || (scripts[0] && scripts[0].id) || '',
        keepValue: false
      });
      syncAdsToggle();
    } else {
      // Fallback if admin helpers aren't loaded yet — plain options markup
      var menu = document.getElementById('outreach-script-menu');
      if (menu) {
        menu.innerHTML = options
          .map(function (opt) {
            var active = opt.value === activeId;
            return (
              '<button type="button" class="business-doc-select-option' +
              (active ? ' is-active' : '') +
              '" role="option" aria-selected="' +
              (active ? 'true' : 'false') +
              '" data-value="' +
              String(opt.value).replace(/"/g, '&quot;') +
              '">' +
              String(opt.label).replace(/</g, '&lt;') +
              '</button>'
            );
          })
          .join('');
      }
      els.scriptSelect.value = activeId || '';
      var wrap = els.scriptSelect.closest
        ? els.scriptSelect.closest('.business-doc-select')
        : null;
      var label = wrap && wrap.querySelector
        ? wrap.querySelector('.business-doc-select-trigger-label')
        : null;
      var cur = current();
      if (label && cur) label.textContent = cur.label;
    }
    if (typeof global.initBusinessDocCustomSelects === 'function') {
      global.initBusinessDocCustomSelects();
    }
    if (els.demo && current()) els.demo.value = current().demoLink || '';
    renderScriptMeta();
  }

  function renderScriptMeta() {
    if (!els.meta) return;
    var s = current();
    if (els.btnReset) els.btnReset.hidden = !differsFromSeed(s);
    if (!s) {
      els.meta.hidden = true;
      els.meta.textContent = '';
      return;
    }
    var bits = [];
    if (s.tag) bits.push(s.tag);
    else if (s.vertical) bits.push(s.vertical);
    if (s.demoLink) bits.push('Demo ready');
    els.meta.textContent = bits.join(' · ');
    els.meta.hidden = !bits.length;
  }

  function renderSteps() {
    if (!els.steps) return;
    els.steps.innerHTML = '';
    STEPS.forEach(function (st) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'outreach-step' + (st.id === activeStep ? ' is-active' : '');
      b.textContent = st.label;
      b.setAttribute('aria-pressed', st.id === activeStep ? 'true' : 'false');
      b.addEventListener('click', function () {
        if (st.id === activeStep) return;
        function go() {
          activeStep = st.id;
          dirty = false;
          renderSteps();
          renderPreview(true);
        }
        if (!needsEditPrompt()) return go();
        offerToSaveEdits(activeId).then(function (ok) { if (ok) go(); });
      });
      els.steps.appendChild(b);
    });
  }

  /** @param {boolean} [force] reload from template even if edited */
  function renderPreview(force) {
    var s = current();
    if (!s || !els.preview) return;
    var vars = readVars();

    if (force || !dirty) {
      var raw = s[activeStep] || '';
      setBody(fill(raw, vars));
      dirty = false;
    }

    var body = getBody();
    var left = remainingTokens(body);
    if (els.warn) {
      if (left.length) {
        els.warn.textContent = 'Still has ' + left.join(' ') + ' — edit above before sending, or fill the helpers.';
        els.warn.hidden = false;
      } else {
        els.warn.hidden = true;
      }
    }

    // Never block copy / send on placeholders
    [els.btnCopy, els.btnText, els.btnEmail].forEach(function (b) {
      if (b) b.disabled = false;
    });
    if (els.btnCall) els.btnCall.disabled = !vars.phone;

    if (els.btnText) els.btnText.hidden = activeStep !== 'text';
    if (els.btnEmail) els.btnEmail.hidden = activeStep !== 'email' && activeStep !== 'subject';
    if (els.btnCall) els.btnCall.hidden = activeStep !== 'call';

    if (els.count) els.count.textContent = body.length + ' chars';
  }

  // ——— actions ———

  function flash(btn, msg) {
    if (!btn) return;
    var prev = btn.textContent;
    btn.textContent = msg;
    setTimeout(function () { btn.textContent = prev; }, 1400);
  }

  function doCopy() {
    var body = getBody();
    if (!body) return;
    if (global.navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(body).then(function () { flash(els.btnCopy, 'Copied'); })
        .catch(function () { flash(els.btnCopy, 'Copy failed'); });
    } else {
      flash(els.btnCopy, 'Copy failed');
    }
  }

  function doText() {
    var vars = readVars();
    var body = getBody();
    var href = 'sms:' + (vars.phone || '') + '?&body=' + encodeURIComponent(body);
    global.location.href = href;
  }

  function doEmail() {
    var s = current();
    var vars = readVars();
    if (!s) return;
    var subject = activeStep === 'subject'
      ? getBody().replace(/^Subject:\s*/i, '')
      : fill(s.subject || '', vars).replace(/^Subject:\s*/i, '');
    var body = activeStep === 'email' ? getBody() : fill(s.email || '', vars);
    var href = 'mailto:' + encodeURIComponent(vars.email || '') +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
    global.location.href = href;
  }

  /** Overwrite the saved copy of the current script with its latest seed template. */
  async function doReset() {
    var s = current();
    var seed = s && seedById[s.id];
    if (!seed || !global.rtdbUpdate) return;
    if (!global.confirm('Replace the saved "' + s.label + '" script with the latest template?')) return;
    var fields = seedFields(seed);
    els.btnReset.disabled = true;
    try {
      await global.rtdbUpdate(global.rtdbRef(global.rtdb, RTDB_PATH + '/' + s.id), fields);
      var saved = {};
      saved[s.id] = fields;
      for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].id === s.id) scripts[i] = normalize(saved)[0];
      }
      dirty = false;
      renderScriptSelect();
      renderPreview(true);
    } catch (err) {
      console.warn('Outreach composer: reset failed', err);
      global.alert('Could not reset this script — check your connection and try again.');
    } finally {
      els.btnReset.disabled = false;
    }
  }

  function doCall() {
    var vars = readVars();
    if (!vars.phone) return;
    global.location.href = 'tel:' + vars.phone.replace(/[^\d+]/g, '');
  }

  // ——— ask (inline prompt with several choices) ———

  var askResolve = null;

  /** Shows a short question with buttons; resolves with the chosen value. */
  function ask(message, choices) {
    if (!els.ask) return Promise.resolve(null);
    if (askResolve) askResolve(null);
    els.askText.textContent = message;
    els.askActions.innerHTML = '';
    return new Promise(function (resolve) {
      askResolve = resolve;
      choices.forEach(function (c) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'outreach-btn' + (c.primary ? ' outreach-btn--primary' : '');
        b.textContent = c.label;
        b.addEventListener('click', function () {
          els.ask.hidden = true;
          askResolve = null;
          resolve(c.value);
        });
        els.askActions.appendChild(b);
      });
      els.ask.hidden = false;
      var first = els.askActions.querySelector('button');
      if (first) first.focus();
    });
  }

  function showLeadStatus(msg, isError) {
    if (!els.leadStatus) return;
    els.leadStatus.textContent = msg;
    els.leadStatus.classList.toggle('is-error', !!isError);
    els.leadStatus.hidden = !msg;
  }

  // ——— saving edits back to a script ———

  /** Puts the [Name]/[Company]/… tokens back where the filled-in values sit,
   *  so a saved edit works for the next lead too. Longest values first. */
  function toTemplate(body, vars) {
    var out = body || '';
    TOKENS.slice()
      .filter(function (t) { return vars[t.field] && vars[t.field].length > 1; })
      .sort(function (a, b) { return vars[b.field].length - vars[a.field].length; })
      .forEach(function (t) {
        out = out.split(vars[t.field]).join(t.token);
      });
    return out;
  }

  function slugify(text) {
    return String(text || 'script').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'script';
  }

  /**
   * If the message was hand-edited, ask what to do with the edit before it is
   * thrown away. Resolves false only when the admin backs out entirely.
   */
  /** Only a hand-edited message, on a page that has the prompt, waits. */
  function needsEditPrompt() {
    return dirty && !!(els.ask && els.askText && els.askActions);
  }

  async function offerToSaveEdits(scriptId) {
    if (!needsEditPrompt()) { dirty = false; return true; }
    var s = null;
    for (var i = 0; i < scripts.length; i++) if (scripts[i].id === scriptId) s = scripts[i];
    if (!s) { dirty = false; return true; }
    var stepLabel = (STEPS.filter(function (st) { return st.id === activeStep; })[0] || {}).label || activeStep;
    var choice = await ask('You edited the ' + stepLabel.toLowerCase() + ' message for “' + s.label + '”. Keep this edit?', [
      { value: 'update', label: 'Update this script', primary: true },
      { value: 'new', label: 'Save as new script' },
      { value: 'discard', label: 'Don’t save' },
      { value: 'cancel', label: 'Keep editing' }
    ]);
    if (choice === 'cancel' || choice === null) return false;
    if (choice === 'discard') { dirty = false; return true; }
    var template = toTemplate(getBody(), readVars());
    if (choice === 'update') {
      var patch = {};
      patch[activeStep] = template;
      await global.rtdbUpdate(global.rtdbRef(global.rtdb, RTDB_PATH + '/' + s.id), patch);
      s[activeStep] = template;
      dirty = false;
      showLeadStatus('Updated “' + s.label + '”.', false);
      return true;
    }
    var name = global.prompt('Name for the new script', s.label + ' (my version)');
    if (!name) return false;
    var id = slugify(name) + '-' + Date.now().toString(36);
    var fields = {
      label: name.slice(0, 120),
      tag: s.tag || '',
      vertical: s.vertical || '',
      demoLink: s.demoLink || '',
      order: (Number(s.order) || 0) + 1,
      text: s.text || '',
      subject: s.subject || '',
      email: s.email || '',
      call: s.call || '',
      group: scriptGroup(s)
    };
    fields[activeStep] = template;
    var write = {};
    write[id] = fields;
    await global.rtdbUpdate(global.rtdbRef(global.rtdb, RTDB_PATH), write);
    scripts = normalize(Object.assign(scripts.reduce(function (acc, sc) {
      acc[sc.id] = sc;
      return acc;
    }, {}), write));
    dirty = false;
    renderScriptSelect();
    showLeadStatus('Saved “' + fields.label + '” as a new script.', false);
    return true;
  }

  // ——— push the filled-in lead to Client Pipeline ———

  var PIPELINE_PATH = 'pipelineLeads';
  var FOLLOW_UP_DAYS = 3;

  function digits(v) { return String(v || '').replace(/\D/g, '').slice(-10); }

  function dateKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  async function loadPipelineLeads() {
    var snap = await global.rtdbGet(global.rtdbRef(global.rtdb, PIPELINE_PATH));
    var val = snap && typeof snap.val === 'function' ? snap.val() : null;
    return Object.keys(val || {}).map(function (id) {
      return Object.assign({ id: id }, val[id]);
    });
  }

  /** Same phone (last 10 digits), same email, or same company name. */
  function findDuplicate(leads, vars) {
    var phone = digits(vars.phone);
    var email = vars.email.toLowerCase();
    var company = vars.company.toLowerCase();
    return leads.find(function (l) {
      return (
        (phone.length === 10 && digits(l.phone) === phone) ||
        (email && String(l.email || '').trim().toLowerCase() === email) ||
        (company && String(l.company || '').trim().toLowerCase() === company)
      );
    }) || null;
  }

  function buildLeadNote(s, vars) {
    var stepLabel = (STEPS.filter(function (st) { return st.id === activeStep; })[0] || {}).label || activeStep;
    var bits = ['Outreach · ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })];
    if (s) bits.push('Script: ' + s.label);
    if (vars.city) bits.push(vars.city);
    if (vars.demo) bits.push('demo: ' + vars.demo);
    return bits.join(' · ') + '\n\n' + stepLabel + ' message:\n' + getBody();
  }

  function clearLeadForm() {
    ['name', 'company', 'city', 'demo', 'phone', 'emailAddr'].forEach(function (k) {
      if (els[k]) els[k].value = '';
    });
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* private mode */ }
    dirty = false;
    renderPreview(true);
  }

  async function addToPipeline() {
    if (!global.rtdb || !global.rtdbRef || !global.rtdbGet || !global.rtdbSet || !global.rtdbPush) {
      showLeadStatus('Realtime Database is not ready — sign in to admin first.', true);
      return;
    }
    var vars = readVars();
    if (!vars.name && !vars.company) {
      showLeadStatus('Add at least a name or a company first.', true);
      return;
    }
    // A hand-edited message gets the save prompt first; the lead keeps the
    // message exactly as written either way.
    var note = buildLeadNote(current(), vars);
    if (!(await offerToSaveEdits(activeId))) return;

    var s = current();
    var follow = new Date();
    follow.setDate(follow.getDate() + FOLLOW_UP_DAYS);
    var now = global.rtdbServerTimestamp ? global.rtdbServerTimestamp() : Date.now();
    var leads = await loadPipelineLeads();
    var dup = findDuplicate(leads, vars);
    var who = vars.company || vars.name;

    if (dup) {
      var choice = await ask('“' + (dup.company || dup.name) + '” is already in your pipeline (' + (dup.stage || 'lead') + '). What should I do?', [
        { value: 'update', label: 'Update it', primary: true },
        { value: 'new', label: 'Add as new lead' },
        { value: 'cancel', label: 'Cancel' }
      ]);
      if (choice !== 'update' && choice !== 'new') return;
      if (choice === 'update') {
        var patch = {
          notes: (dup.notes ? String(dup.notes) + '\n\n' : '') + note,
          followUpAt: dateKey(follow),
          outreachScriptId: s ? s.id : null,
          outreachScriptLabel: s ? s.label : null,
          updatedAt: now
        };
        // Only fill blanks — never overwrite what the lead already has.
        if (!dup.name && (vars.name || vars.company)) patch.name = vars.name || vars.company;
        if (!dup.company && vars.company) patch.company = vars.company;
        if (!dup.phone && vars.phone) patch.phone = vars.phone;
        if (!dup.email && vars.email) patch.email = vars.email;
        await global.rtdbUpdate(global.rtdbRef(global.rtdb, PIPELINE_PATH + '/' + dup.id), patch);
        clearLeadForm();
        showLeadStatus('Updated “' + (dup.company || dup.name) + '” in Client Pipeline · follow up ' + dateKey(follow) + '.', false);
        refreshScriptStats();
        return;
      }
    }

    var lead = {
      name: vars.name || vars.company,
      email: vars.email,
      phone: vars.phone,
      company: vars.company,
      projectType: 'web',
      value: 0,
      stage: 'lead',
      source: 'cold',
      notes: note,
      followUpAt: dateKey(follow),
      outreachScriptId: s ? s.id : null,
      outreachScriptLabel: s ? s.label : null,
      createdAt: now,
      updatedAt: now
    };
    var ref = global.rtdbPush(global.rtdbRef(global.rtdb, PIPELINE_PATH));
    await global.rtdbSet(ref, lead);
    clearLeadForm();
    showLeadStatus('Added “' + who + '” to Client Pipeline · follow up ' + dateKey(follow) + '.', false);
    refreshScriptStats();
  }

  // ——— script results (which scripts move leads forward) ———

  var STAGE_RANK = { lead: 0, 'discovery-call': 1, proposal: 2, deposit: 3 };

  function escapeHtml(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  async function refreshScriptStats() {
    if (!els.statsBody || !global.rtdbGet) return;
    var leads;
    try { leads = await loadPipelineLeads(); } catch (e) { return; }
    var rows = {};
    leads.forEach(function (l) {
      if (!l.outreachScriptId) return;
      var key = l.outreachScriptId;
      var row = rows[key] || (rows[key] = { label: l.outreachScriptLabel || key, leads: 0, call: 0, won: 0 });
      var rank = STAGE_RANK[String(l.stage || 'lead')] || 0;
      row.leads += 1;
      if (rank >= 1) row.call += 1;
      if (rank >= 3) row.won += 1;
    });
    var list = Object.keys(rows).map(function (k) { return rows[k]; })
      .sort(function (a, b) { return b.leads - a.leads; });
    if (!list.length) {
      els.statsBody.innerHTML = '<p class="outreach-stats-empty">No leads added from Outreach Scripts yet.</p>';
      return;
    }
    function pct(n, d) { return d ? Math.round((n / d) * 100) + '%' : '—'; }
    els.statsBody.innerHTML =
      '<table class="outreach-stats-table"><thead><tr>' +
      '<th scope="col">Script</th><th scope="col">Leads</th><th scope="col">Reached a call</th><th scope="col">Won</th>' +
      '</tr></thead><tbody>' +
      list.map(function (r) {
        return '<tr><th scope="row">' + escapeHtml(r.label) + '</th>' +
          '<td>' + r.leads + '</td>' +
          '<td>' + r.call + ' <span class="outreach-stats-pct">' + pct(r.call, r.leads) + '</span></td>' +
          '<td>' + r.won + ' <span class="outreach-stats-pct">' + pct(r.won, r.leads) + '</span></td></tr>';
      }).join('') +
      '</tbody></table>';
  }

  // ——— boot ———

  function cache() {
    els = {
      root: document.getElementById('outreach-composer'),
      scriptSelect: document.getElementById('outreach-script-select'),
      steps: document.getElementById('outreach-steps'),
      preview: document.getElementById('outreach-preview'),
      warn: document.getElementById('outreach-warn'),
      count: document.getElementById('outreach-count'),
      meta: document.getElementById('outreach-script-meta'),
      btnReset: document.getElementById('outreach-reset'),
      status: document.getElementById('outreach-status'),
      name: document.getElementById('outreach-var-name'),
      company: document.getElementById('outreach-var-company'),
      city: document.getElementById('outreach-var-city'),
      demo: document.getElementById('outreach-var-demo'),
      phone: document.getElementById('outreach-var-phone'),
      emailAddr: document.getElementById('outreach-var-email'),
      btnCopy: document.getElementById('outreach-copy'),
      btnText: document.getElementById('outreach-text'),
      btnEmail: document.getElementById('outreach-email'),
      btnCall: document.getElementById('outreach-call'),
      btnAddLead: document.getElementById('outreach-add-lead'),
      adsToggle: document.getElementById('outreach-ads'),
      adsWrap: document.getElementById('outreach-ads-wrap'),
      ask: document.getElementById('outreach-ask'),
      askText: document.getElementById('outreach-ask-text'),
      askActions: document.getElementById('outreach-ask-actions'),
      leadStatus: document.getElementById('outreach-lead-status'),
      statsBody: document.getElementById('outreach-stats-body')
    };
  }

  function bind() {
    ['name', 'company', 'city', 'demo', 'phone', 'emailAddr'].forEach(function (k) {
      if (!els[k]) return;
      els[k].addEventListener('input', function () {
        dirty = false;
        renderPreview(true);
        saveVars();
      });
    });
    if (els.scriptSelect) {
      els.scriptSelect.addEventListener('change', function () {
        var next = els.scriptSelect.value;
        if (next === baseOf(activeId)) return;
        if (!needsEditPrompt()) return applyScriptSelection(next, true);
        var prev = baseOf(activeId);
        // Ask about unsaved edits against the script they were made on.
        offerToSaveEdits(prev).then(function (ok) {
          if (ok) return applyScriptSelection(next, true);
          if (typeof global.setBusinessDocSelectValue === 'function') {
            global.setBusinessDocSelectValue(els.scriptSelect, prev, true);
          }
        });
      });
    }
    if (els.preview) {
      els.preview.addEventListener('input', function () {
        dirty = true;
        if (els.count) els.count.textContent = getBody().length + ' chars';
        var left = remainingTokens(getBody());
        if (els.warn) {
          if (left.length) {
            els.warn.textContent = 'Still has ' + left.join(' ') + ' — edit above before sending, or fill the helpers.';
            els.warn.hidden = false;
          } else {
            els.warn.hidden = true;
          }
        }
      });
    }
    if (els.btnCopy) els.btnCopy.addEventListener('click', doCopy);
    if (els.btnText) els.btnText.addEventListener('click', doText);
    if (els.btnEmail) els.btnEmail.addEventListener('click', doEmail);
    if (els.btnCall) els.btnCall.addEventListener('click', doCall);
    if (els.btnReset) els.btnReset.addEventListener('click', doReset);
    if (els.adsToggle) els.adsToggle.addEventListener('change', function () {
      var wanted = els.adsToggle.checked;
      function go() { applyScriptSelection(baseOf(activeId), true); }
      if (!needsEditPrompt()) return go();
      offerToSaveEdits(activeId).then(function (ok) {
        if (ok) return go();
        els.adsToggle.checked = !wanted;
      });
    });
    if (els.btnAddLead) els.btnAddLead.addEventListener('click', function () {
      addToPipeline().catch(function (err) {
        console.warn('Outreach composer: add to pipeline failed', err);
        showLeadStatus('Could not save the lead — check your connection and try again.', true);
      });
    });
  }

  var booted = false;
  var rendered = false;

  var opening = null;

  function open() {
    if (rendered) return Promise.resolve();
    if (!opening) {
      opening = openOnce().then(function () { opening = null; }, function () { opening = null; });
    }
    return opening;
  }

  async function openOnce() {
    cache();
    if (!els.root) return;
    // It's a tab now, not a popup: coming back to it keeps whatever you were
    // editing instead of re-rendering the script from scratch.
    if (rendered) return;
    if (!booted) { bind(); restoreVars(); booted = true; }
    if (els.status) { els.status.textContent = 'Loading scripts…'; els.status.hidden = false; }
    try {
      await ensureScripts();
      if (!activeId && scripts.length) {
        activeId = scripts[0].id;
      }
      if (els.status) els.status.hidden = true;
      dirty = false;
      renderScriptSelect();
      renderSteps();
      renderPreview(true);
      rendered = true;
      refreshScriptStats();
    } catch (err) {
      console.warn('Outreach composer:', err);
      if (els.status) {
        els.status.textContent = err && err.message ? err.message : 'Could not load scripts.';
        els.status.hidden = false;
      }
      // Say why inside the picker too, so it never opens as an empty box.
      var menu = document.getElementById('outreach-script-menu');
      if (menu && !menu.querySelector('.business-doc-select-option')) {
        menu.innerHTML = '<p class="outreach-script-empty">' +
          escapeHtml(err && err.message ? err.message : 'Could not load scripts.') + '</p>';
      }
    }
  }

  global.CWR_OUTREACH = { open: open };

  // The admin can reopen straight onto this tab (saved active tab) before this
  // file loads, so the tab's own open() call would have found nothing.
  var panel = document.getElementById('admin-panel-outreach');
  if (panel && !panel.hidden) open();
})(window);
