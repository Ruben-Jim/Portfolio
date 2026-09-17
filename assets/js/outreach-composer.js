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
  var SEED_SRC = '/assets/js/outreach-scripts-seed.js';
  var STORE_KEY = 'cwrOutreachVars';

  /** Optional fill helpers. "[later today / tomorrow]" is prose — left alone. */
  var TOKENS = [
    { token: '[Name]', field: 'name' },
    { token: '[Company]', field: 'company' },
    { token: '[City]', field: 'city' },
    { token: '[demo link]', field: 'demo' }
  ];

  var STEPS = [
    { id: 'text', label: 'Text' },
    { id: 'subject', label: 'Subject' },
    { id: 'email', label: 'Email' },
    { id: 'call', label: 'Call' }
  ];

  var scripts = [];
  var activeId = '';
  var activeStep = 'text';
  var loaded = false;
  var dirty = false;
  var els = {};

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
          call: r.call || ''
        };
      })
      .sort(function (a, b) { return a.order - b.order; });
  }

  /** RTDB first; seed when empty. Merge NEW seed ids without overwriting edits. */
  async function ensureScripts() {
    if (loaded && scripts.length) return scripts;
    if (!global.rtdb || !global.rtdbRef || !global.rtdbGet) {
      throw new Error('Realtime Database is not ready — sign in to admin first.');
    }
    var snap = await global.rtdbGet(global.rtdbRef(global.rtdb, RTDB_PATH));
    var val = snap && typeof snap.val === 'function' ? snap.val() : null;

    if (val && Object.keys(val).length) {
      var merged = Object.assign({}, val);
      try {
        var existingSeeds = await loadSeedFile();
        var patch = {};
        existingSeeds.forEach(function (s) {
          if (!merged[s.id]) {
            patch[s.id] = {
              label: s.label, tag: s.tag, vertical: s.vertical, demoLink: s.demoLink,
              order: s.order, text: s.text, subject: s.subject, email: s.email, call: s.call
            };
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
    var writes = {};
    seeds.forEach(function (s) {
      writes[s.id] = {
        label: s.label, tag: s.tag, vertical: s.vertical, demoLink: s.demoLink,
        order: s.order, text: s.text, subject: s.subject, email: s.email, call: s.call
      };
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
      global.setBusinessDocSelectValue(els.scriptSelect, id, true);
    }
    renderScriptMeta();
    renderPreview(true);
  }

  function renderScriptSelect() {
    if (!els.scriptSelect) return;
    var options = scripts.map(function (s) {
      return { value: s.id, label: s.label };
    });
    if (!activeId && scripts.length) activeId = scripts[0].id;
    if (typeof global.setBusinessDocSelectOptions === 'function') {
      global.setBusinessDocSelectOptions(els.scriptSelect, options, {
        value: activeId || (scripts[0] && scripts[0].id) || '',
        keepValue: false
      });
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
        activeStep = st.id;
        dirty = false;
        renderSteps();
        renderPreview(true);
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

  function doCall() {
    var vars = readVars();
    if (!vars.phone) return;
    global.location.href = 'tel:' + vars.phone.replace(/[^\d+]/g, '');
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
      btnCall: document.getElementById('outreach-call')
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
        applyScriptSelection(els.scriptSelect.value, true);
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
  }

  var booted = false;

  async function open() {
    cache();
    if (!els.root) return;
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
    } catch (err) {
      console.warn('Outreach composer:', err);
      if (els.status) {
        els.status.textContent = err && err.message ? err.message : 'Could not load scripts.';
        els.status.hidden = false;
      }
    }
  }

  global.CWR_OUTREACH = { open: open };
})(window);
